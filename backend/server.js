// server.js - Backend do Sticky Notes
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Configurações
const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/stickynotes_db';

// Conexões
const redis = new Redis(REDIS_URL);
const redisSub = new Redis(REDIS_URL);
const pg = new Pool({ connectionString: DATABASE_URL });

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar banco de dados
async function initDB() {
  try {
    // Tabela de painéis
    await pg.query(`
      CREATE TABLE IF NOT EXISTS panels (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('friends', 'couple')),
        password_hash VARCHAR(255),
        creator VARCHAR(100) NOT NULL,
        border_color VARCHAR(7) DEFAULT '#D4A574',
        max_users INTEGER DEFAULT 15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabela de posts
    await pg.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        panel_id VARCHAR(10) REFERENCES panels(id) ON DELETE CASCADE,
        author_name VARCHAR(100),
        content TEXT NOT NULL,
        color VARCHAR(7) DEFAULT '#FFF5E6',
        position_x INTEGER DEFAULT 50,
        position_y INTEGER DEFAULT 50,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabela de usuários ativos
    await pg.query(`
      CREATE TABLE IF NOT EXISTS active_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        panel_id VARCHAR(10) REFERENCES panels(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(panel_id, name)
      )
    `);
    
    // Índices para melhor performance
    await pg.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_panel_id ON posts(panel_id);
      CREATE INDEX IF NOT EXISTS idx_active_users_panel_id ON active_users(panel_id);
      CREATE INDEX IF NOT EXISTS idx_active_users_last_seen ON active_users(last_seen);
    `);
    
    console.log('📊 Database initialized with Sticky Notes schema');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Limpar usuários inativos (mais de 5 minutos sem atividade)
async function cleanupInactiveUsers() {
  try {
    await pg.query(`
      DELETE FROM active_users 
      WHERE last_seen < NOW() - INTERVAL '5 minutes'
    `);
  } catch (error) {
    console.error('Error cleaning up inactive users:', error);
  }
}

// Executar limpeza a cada minuto
setInterval(cleanupInactiveUsers, 60000);

// Funções auxiliares
function generatePanelCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Cache functions
async function getCachedPanel(panelId) {
  const cached = await redis.get(`panel:${panelId}`);
  if (cached) return JSON.parse(cached);
  
  const result = await pg.query(
    'SELECT * FROM panels WHERE id = $1',
    [panelId]
  );
  
  if (result.rows.length > 0) {
    const panel = result.rows[0];
    // Não cachear a senha
    delete panel.password_hash;
    await redis.setex(`panel:${panelId}`, 3600, JSON.stringify(panel));
    return panel;
  }
  return null;
}

async function getCachedPosts(panelId) {
  const cached = await redis.get(`posts:${panelId}`);
  if (cached) return JSON.parse(cached);
  
  const result = await pg.query(
    'SELECT * FROM posts WHERE panel_id = $1 ORDER BY created_at DESC',
    [panelId]
  );
  
  await redis.setex(`posts:${panelId}`, 300, JSON.stringify(result.rows));
  return result.rows;
}

// Rotas da API

// Criar novo painel
app.post('/api/panels', async (req, res) => {
  try {
    const { name, type, password, creator, borderColor } = req.body;
    
    if (!name || !type || !creator) {
      return res.status(400).json({ error: 'Nome, tipo e criador são obrigatórios' });
    }
    
    if (!['friends', 'couple'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }
    
    let code;
    let exists = true;
    
    // Garantir código único
    while (exists) {
      code = generatePanelCode();
      const check = await pg.query('SELECT id FROM panels WHERE id = $1', [code]);
      exists = check.rows.length > 0;
    }
    
    // Hash da senha se fornecida
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    
    // Definir máximo de usuários baseado no tipo
    const maxUsers = type === 'couple' ? 2 : 15;
    
    const result = await pg.query(
      `INSERT INTO panels (id, name, type, password_hash, creator, border_color, max_users) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [code, name, type, passwordHash, creator, borderColor || '#D4A574', maxUsers]
    );
    
    const panel = result.rows[0];
    delete panel.password_hash; // Não retornar a senha
    
    await redis.setex(`panel:${code}`, 3600, JSON.stringify(panel));
    
    res.status(201).json(panel);
  } catch (error) {
    console.error('Error creating panel:', error);
    res.status(500).json({ error: 'Erro ao criar painel' });
  }
});

// Acessar painel existente
app.post('/api/panels/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { password, userName } = req.body;
    
    const result = await pg.query(
      'SELECT * FROM panels WHERE id = $1',
      [code.toUpperCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Painel não encontrado' });
    }
    
    const panel = result.rows[0];
    
    // Verificar senha se necessário
    if (panel.password_hash) {
      if (!password) {
        return res.status(401).json({ error: 'Senha necessária' });
      }
      
      const passwordMatch = await bcrypt.compare(password, panel.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }
    }
    
    // Verificar limite de usuários
    const activeUsersResult = await pg.query(
      'SELECT COUNT(*) FROM active_users WHERE panel_id = $1',
      [code.toUpperCase()]
    );
    
    const activeCount = parseInt(activeUsersResult.rows[0].count);
    if (activeCount >= panel.max_users) {
      // Verificar se o usuário já está na sala
      const userExists = await pg.query(
        'SELECT id FROM active_users WHERE panel_id = $1 AND name = $2',
        [code.toUpperCase(), userName]
      );
      
      if (userExists.rows.length === 0) {
        return res.status(403).json({ error: `Painel lotado (máximo ${panel.max_users} usuários)` });
      }
    }
    
    // Atualizar última atividade
    pg.query(
      'UPDATE panels SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
      [code.toUpperCase()]
    ).catch(console.error);
    
    delete panel.password_hash; // Não retornar a senha
    res.json(panel);
  } catch (error) {
    console.error('Error accessing panel:', error);
    res.status(500).json({ error: 'Erro ao acessar painel' });
  }
});

// Buscar posts do painel
app.get('/api/panels/:code/posts', async (req, res) => {
  try {
    const { code } = req.params;
    const posts = await getCachedPosts(code.toUpperCase());
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Erro ao buscar posts' });
  }
});

// Criar novo post
app.post('/api/panels/:code/posts', async (req, res) => {
  try {
    const { code } = req.params;
    const { author_name, content, color, position_x, position_y } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }
    
    const panelCode = code.toUpperCase();
    const panel = await getCachedPanel(panelCode);
    
    if (!panel) {
      return res.status(404).json({ error: 'Painel não encontrado' });
    }
    
    // Verificar se mensagens anônimas são permitidas
    if (!author_name && panel.type === 'couple') {
      return res.status(400).json({ error: 'Mensagens anônimas não são permitidas em painéis de casal' });
    }
    
    const result = await pg.query(
      `INSERT INTO posts (panel_id, author_name, content, color, position_x, position_y) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [panelCode, author_name || null, content, color || '#FFF5E6', position_x || 50, position_y || 50]
    );
    
    const post = result.rows[0];
    
    // Invalidar cache
    await redis.del(`posts:${panelCode}`);
    
    // Publicar para subscribers via Redis
    await redis.publish(`panel:${panelCode}`, JSON.stringify({
      type: 'NEW_POST',
      post
    }));
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Erro ao criar post' });
  }
});

// Atualizar posição do post
app.patch('/api/posts/:postId/position', async (req, res) => {
  try {
    const { postId } = req.params;
    const { position_x, position_y, panel_id } = req.body;
    
    const result = await pg.query(
      'UPDATE posts SET position_x = $1, position_y = $2 WHERE id = $3 RETURNING *',
      [position_x, position_y, postId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    
    const post = result.rows[0];
    
    // Invalidar cache
    await redis.del(`posts:${panel_id}`);
    
    // Notificar via WebSocket
    await redis.publish(`panel:${panel_id}`, JSON.stringify({
      type: 'POST_MOVED',
      post
    }));
    
    res.json(post);
  } catch (error) {
    console.error('Error updating post position:', error);
    res.status(500).json({ error: 'Erro ao atualizar posição' });
  }
});

// Deletar post
app.delete('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { panel_id } = req.query;
    
    const result = await pg.query(
      'DELETE FROM posts WHERE id = $1 RETURNING *',
      [postId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    
    // Invalidar cache
    await redis.del(`posts:${panel_id}`);
    
    // Notificar via WebSocket
    await redis.publish(`panel:${panel_id}`, JSON.stringify({
      type: 'POST_DELETED',
      postId
    }));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Erro ao deletar post' });
  }
});

// Gerenciar usuários ativos
app.post('/api/panels/:code/users', async (req, res) => {
  try {
    const { code } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    // Inserir ou atualizar usuário ativo
    await pg.query(
      `INSERT INTO active_users (panel_id, name) 
       VALUES ($1, $2) 
       ON CONFLICT (panel_id, name) 
       DO UPDATE SET last_seen = CURRENT_TIMESTAMP`,
      [code.toUpperCase(), name]
    );
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Erro ao adicionar usuário' });
  }
});

app.get('/api/panels/:code/users', async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await pg.query(
      `SELECT name, joined_at FROM active_users 
       WHERE panel_id = $1 
       AND last_seen > NOW() - INTERVAL '5 minutes'
       ORDER BY joined_at`,
      [code.toUpperCase()]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.delete('/api/panels/:code/users/:name', async (req, res) => {
  try {
    const { code, name } = req.params;
    
    await pg.query(
      'DELETE FROM active_users WHERE panel_id = $1 AND name = $2',
      [code.toUpperCase(), name]
    );
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  socket.on('join-panel', async (panelId, userName) => {
    socket.join(`panel:${panelId}`);
    console.log(`User ${userName} (${socket.id}) joined panel ${panelId}`);
    
    // Atualizar último visto
    if (userName) {
      pg.query(
        `UPDATE active_users SET last_seen = CURRENT_TIMESTAMP 
         WHERE panel_id = $1 AND name = $2`,
        [panelId, userName]
      ).catch(console.error);
    }
    
    // Enviar posts existentes
    const posts = await getCachedPosts(panelId);
    socket.emit('initial-posts', posts);
  });
  
  socket.on('leave-panel', (panelId, userName) => {
    socket.leave(`panel:${panelId}`);
    console.log(`User ${userName} (${socket.id}) left panel ${panelId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Redis Pub/Sub para sincronização entre instâncias
redisSub.on('message', (channel, message) => {
  if (channel.startsWith('panel:')) {
    const data = JSON.parse(message);
    io.to(channel).emit('panel-update', data);
  }
});

// Subscribe to all panel channels
redisSub.psubscribe('panel:*');

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Sticky Notes Backend',
    timestamp: new Date().toISOString() 
  });
});

// Inicializar servidor
async function start() {
  await initDB();
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Sticky Notes Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`💾 Redis connected`);
    console.log(`🗄️  PostgreSQL connected`);
  });
}

start().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    redis.disconnect();
    redisSub.disconnect();
    pg.end();
    process.exit(0);
  });
});