import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StickyNote, Users, Heart, Lock, Unlock, User, UserX, Send, Copy, Check, LogOut, Hash } from 'lucide-react';

const API_URL = 'http://localhost:3001';

// Paleta de cores neutras e aconchegantes
const COZY_COLORS = {
  notes: [
    '#FAFAF8', // Off white
    '#FFE8E8', // Soft pink
    '#E8F4FD', // Baby blue
    '#F0F4EC', // Sage green
    '#FFF0F5', // Lavender blush
    '#F5F5F0', // Warm grey
    '#F5E6FF', // Soft purple
  ],
  borders: [
    '#8B7E74', // Warm grey-brown
    '#A8B5A0', // Sage
    '#B5A7C6', // Soft purple
    '#D4B5B0', // Dusty rose
    '#9FB4C7', // Soft blue
    '#B5B5B5', // Neutral grey
  ],
  backgrounds: {
    gradient: 'bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50',
    panel: 'bg-gradient-to-br from-gray-50 to-slate-50'
  }
};

// Componente de Post-it
const PostIt = ({ post, onDelete, onMove, canDelete, isAnonymousAllowed }) => {
  const [position, setPosition] = useState({ x: post.position_x || 50, y: post.position_y || 50 });
  const [isDragging, setIsDragging] = useState(false);
  const noteRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.preventDefault();
    const rect = noteRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !noteRef.current) return;
      
      const parent = noteRef.current.parentElement;
      const parentRect = parent.getBoundingClientRect();
      
      let newX = e.clientX - parentRect.left - dragStart.current.x;
      let newY = e.clientY - parentRect.top - dragStart.current.y;
      
      newX = Math.max(0, Math.min(newX, parentRect.width - 250));
      newY = Math.max(0, Math.min(newY, parentRect.height - 200));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (onMove) {
          onMove(post.id, position.x, position.y);
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position, post.id, onMove]);

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const postStyle = {
    backgroundColor: post.color || COZY_COLORS.notes[0],
    left: position.x,
    top: position.y,
    background: `linear-gradient(135deg, ${post.color || COZY_COLORS.notes[0]} 0%, ${post.color || COZY_COLORS.notes[0]}dd 100%)`
  };

  return (
    <div
      ref={noteRef}
      className={`absolute w-64 min-h-[180px] p-4 rounded-sm shadow-md transform transition-all duration-200 ${
        isDragging ? 'cursor-grabbing scale-105 rotate-1 shadow-xl z-50' : 'cursor-grab hover:shadow-lg hover:-rotate-1'
      }`}
      style={postStyle}
    >
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-yellow-200 opacity-60 rotate-3"></div>
      
      <div 
        className="flex justify-between items-start mb-3 -m-2 p-2 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-700">
            {post.author_name || (isAnonymousAllowed ? 'Anônimo' : 'Desconhecido')}
          </p>
          <p className="text-xs text-gray-500">
            {formatDate(post.created_at)}
          </p>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
          >
            <span className="text-gray-600 text-lg">×</span>
          </button>
        )}
      </div>
      
      <div className="text-gray-800 text-sm whitespace-pre-wrap break-words">
        {post.content}
      </div>
    </div>
  );
};

// Componente Principal
export default function StickyNotesApp() {
  const [currentPanel, setCurrentPanel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [panelType, setPanelType] = useState('');
  const [panelCode, setPanelCode] = useState('');
  const [panelName, setPanelName] = useState('');
  const [panelPassword, setPanelPassword] = useState('');
  const [requirePassword, setRequirePassword] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', color: COZY_COLORS.notes[0], anonymous: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [borderColor, setBorderColor] = useState(COZY_COLORS.borders[0]);
  const [joinPassword, setJoinPassword] = useState('');

  const pollingInterval = useRef(null);

  const fetchPosts = useCallback(async () => {
    if (!currentPanel) return;
    
    try {
      const response = await fetch(`${API_URL}/api/murals/${currentPanel.id}/posts`);
      if (response.ok) {
        const postsData = await response.json();
        setPosts(postsData);
      }
    } catch (err) {
      console.error('Erro ao buscar posts:', err);
    }
  }, [currentPanel]);

  const fetchActiveUsers = useCallback(async () => {
    // Por enquanto, simular usuários ativos já que o backend atual não tem esse endpoint
    if (!currentPanel) return;
    setActiveUsers([{ name: userName }]);
  }, [currentPanel, userName]);

  useEffect(() => {
    if (currentPanel && userName) {
      fetchPosts();
      fetchActiveUsers();
      
      pollingInterval.current = setInterval(() => {
        fetchPosts();
        fetchActiveUsers();
      }, 3000);
      
      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
      };
    }
  }, [currentPanel, userName, fetchPosts, fetchActiveUsers]);

  const createPanel = async () => {
    if (!panelName.trim()) {
      setError('Digite um nome para o painel');
      return;
    }

    if (!userName.trim()) {
      setError('Digite seu nome');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/murals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: panelName,
          type: panelType,
          password: requirePassword ? panelPassword : null,
          creator: userName,
          borderColor
        })
      });

      if (!response.ok) throw new Error('Erro ao criar painel');

      const panel = await response.json();
      setCurrentPanel(panel);
      
    } catch (err) {
      setError('Erro ao criar painel. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const accessPanel = async () => {
    if (!panelCode.trim()) {
      setError('Digite o código do painel');
      return;
    }

    if (!userName.trim()) {
      setError('Digite seu nome');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/murals/${panelCode.toUpperCase()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Painel não encontrado');
        }
        throw new Error('Erro ao acessar painel');
      }

      const panel = await response.json();
      setCurrentPanel(panel);
      
      const postsResponse = await fetch(`${API_URL}/api/murals/${panelCode.toUpperCase()}/posts`);
      const postsData = await postsResponse.json();
      setPosts(postsData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.content.trim()) {
      setError('Digite uma mensagem');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const randomX = Math.floor(Math.random() * 600) + 50;
      const randomY = Math.floor(Math.random() * 300) + 50;

      const response = await fetch(`${API_URL}/api/murals/${currentPanel.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: newPost.anonymous ? null : userName,
          content: newPost.content,
          color: newPost.color,
          position_x: randomX,
          position_y: randomY
        })
      });

      if (!response.ok) throw new Error('Erro ao criar post');

      const createdPost = await response.json();
      setPosts(prev => [createdPost, ...prev]);
      
      setNewPost({ content: '', color: COZY_COLORS.notes[0], anonymous: false });
      setShowNewPostForm(false);
    } catch (err) {
      setError('Erro ao criar post. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId) => {
    try {
      await fetch(`${API_URL}/api/posts/${postId}?mural_id=${currentPanel.id}`, {
        method: 'DELETE'
      });
      
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      setError('Erro ao deletar post');
    }
  };

  const movePost = async (postId, x, y) => {
    try {
      await fetch(`${API_URL}/api/posts/${postId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_x: x,
          position_y: y,
          mural_id: currentPanel.id
        })
      });

      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, position_x: x, position_y: y } : p
      ));
    } catch (err) {
      console.error('Erro ao mover post:', err);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentPanel.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exitPanel = async () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    setCurrentPanel(null);
    setPosts([]);
    setUserName('');
    setPanelType('');
    setActiveUsers([]);
  };

  // Tela inicial
  if (!panelType) {
    return (
      <div className={`min-h-screen ${COZY_COLORS.backgrounds.gradient} flex items-center justify-center p-4`}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl w-full border border-gray-100">
          <div className="flex items-center justify-center mb-8">
            <StickyNote className="w-12 h-12 text-slate-600 mr-3" />
            <h1 className="text-5xl font-bold text-gray-800">
              Sticky Notes
            </h1>
          </div>
          <p className="text-center text-gray-600 mb-10 text-lg">
            Compartilhe ideias em um painel colaborativo aconchegante
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setPanelType('friends')}
              className="w-full p-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl hover:from-slate-100 hover:to-gray-100 transition-all duration-300 border border-gray-200 hover:border-gray-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <Users className="w-8 h-8 text-slate-600 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-800">Painel para Amigos</h3>
                  <p className="text-sm text-gray-500 mt-1">Até 15 pessoas • Mensagens anônimas permitidas</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPanelType('couple')}
              className="w-full p-6 bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl hover:from-rose-100 hover:to-pink-100 transition-all duration-300 border border-rose-200 hover:border-rose-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <Heart className="w-8 h-8 text-rose-500 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-800">Painel para Casal</h3>
                  <p className="text-sm text-gray-500 mt-1">2 pessoas • Sem mensagens anônimas</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPanelType('join')}
              className="w-full p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border border-blue-200 hover:border-blue-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <Hash className="w-8 h-8 text-blue-600 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-800">Entrar com Código</h3>
                  <p className="text-sm text-gray-500 mt-1">Acesse um painel existente</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de criação/acesso
  if (!currentPanel) {
    return (
      <div className={`min-h-screen ${COZY_COLORS.backgrounds.gradient} flex items-center justify-center p-4`}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border border-gray-100">
          <button
            onClick={() => setPanelType('')}
            className="mb-6 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm"
          >
            ← Voltar
          </button>

          <div className="flex items-center justify-center mb-8">
            <StickyNote className="w-10 h-10 text-slate-600 mr-3" />
            <h2 className="text-4xl font-bold text-gray-800">
              Sticky Notes
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu Nome
              </label>
              <input
                type="text"
                placeholder="Como você quer ser chamado?"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
              />
            </div>

            {panelType === 'join' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código do Painel
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ABC123"
                    value={panelCode}
                    onChange={(e) => setPanelCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent uppercase font-mono text-lg tracking-wider transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha (se necessário)
                  </label>
                  <input
                    type="password"
                    placeholder="Deixe em branco se não tiver senha"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                  />
                </div>

                <button
                  onClick={accessPanel}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-slate-600 to-gray-700 text-white py-3 rounded-xl font-semibold hover:from-slate-700 hover:to-gray-800 transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02]"
                >
                  {loading ? 'Entrando...' : 'Entrar no Painel'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Painel
                  </label>
                  <input
                    type="text"
                    placeholder={panelType === 'couple' ? 'Nosso cantinho' : 'Ideias da turma'}
                    value={panelName}
                    onChange={(e) => setPanelName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor da Borda do Mural
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {COZY_COLORS.borders.map(color => (
                      <button
                        key={color}
                        onClick={() => setBorderColor(color)}
                        className={`w-12 h-12 rounded-xl border-4 transition-all ${
                          borderColor === color ? 'scale-110 shadow-lg' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color, borderColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    {requirePassword ? <Lock className="w-5 h-5 text-slate-600 mr-2" /> : <Unlock className="w-5 h-5 text-gray-400 mr-2" />}
                    <span className="text-sm font-medium text-gray-700">Proteger com senha</span>
                  </div>
                  <button
                    onClick={() => setRequirePassword(!requirePassword)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      requirePassword ? 'bg-slate-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                      requirePassword ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {requirePassword && (
                  <input
                    type="password"
                    placeholder="Digite a senha do painel"
                    value={panelPassword}
                    onChange={(e) => setPanelPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                  />
                )}

                <button
                  onClick={createPanel}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-slate-600 to-gray-700 text-white py-3 rounded-xl font-semibold hover:from-slate-700 hover:to-gray-800 transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02]"
                >
                  {loading ? 'Criando...' : `Criar Painel ${panelType === 'couple' ? 'para Casal' : 'para Amigos'}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tela do painel
  return (
    <div className={`min-h-screen ${COZY_COLORS.backgrounds.panel}`}>
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={exitPanel}
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-slate-600" />
                  {currentPanel.name}
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Código:</span>
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono font-bold">
                      {currentPanel.id}
                    </code>
                    <button
                      onClick={copyCode}
                      className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-600" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                <Users className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-gray-700">
                  {activeUsers.length || 1} {currentPanel.type === 'couple' ? '/2' : '/15'}
                </span>
              </div>

              <button
                onClick={() => setShowNewPostForm(true)}
                className="bg-gradient-to-r from-slate-600 to-gray-700 text-white px-4 py-2 rounded-xl font-semibold hover:from-slate-700 hover:to-gray-800 transition-all duration-200 flex items-center gap-2 shadow-md text-sm"
              >
                <StickyNote className="w-4 h-4" />
                Nova Nota
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 h-[calc(100vh-80px)]">
        <div 
          className="relative w-full h-full rounded-lg shadow-inner overflow-hidden"
          style={{
            backgroundColor: '#FAFAF8',
            border: `8px solid ${currentPanel.borderColor || borderColor}`,
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 40px,
                #00000005 40px,
                #00000005 41px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 40px,
                #00000005 40px,
                #00000005 41px
              )
            `
          }}
        >
          {posts.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <StickyNote className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-400 mb-2">Nenhuma nota ainda</p>
                <p className="text-gray-500 text-sm">Clique em "Nova Nota" para adicionar a primeira!</p>
              </div>
            </div>
          )}

          {posts.map((post) => (
            <PostIt
              key={post.id}
              post={post}
              onDelete={deletePost}
              onMove={movePost}
              canDelete={post.author_name === userName || (!post.author_name && currentPanel.type === 'friends')}
              isAnonymousAllowed={currentPanel.type === 'friends'}
            />
          ))}
        </div>
      </div>

      {showNewPostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <StickyNote className="w-6 h-6 text-slate-600" />
              Nova Nota Adesiva
            </h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {currentPanel.type === 'friends' && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    {newPost.anonymous ? <UserX className="w-5 h-5 text-gray-400 mr-2" /> : <User className="w-5 h-5 text-slate-600 mr-2" />}
                    <span className="text-sm font-medium text-gray-700">
                      {newPost.anonymous ? 'Enviar como anônimo' : `Enviar como ${userName}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setNewPost({...newPost, anonymous: !newPost.anonymous})}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      newPost.anonymous ? 'bg-gray-400' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                      newPost.anonymous ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem
                </label>
                <textarea
                  placeholder="Escreva sua nota..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor da Nota
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COZY_COLORS.notes.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewPost({...newPost, color})}
                      className={`w-12 h-12 rounded-xl border-2 transition-all relative ${
                        newPost.color === color ? 'border-gray-700 scale-110 shadow-lg' : 'border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {newPost.color === color && (
                        <Check className="w-4 h-4 text-gray-700 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowNewPostForm(false);
                  setError('');
                  setNewPost({ content: '', color: COZY_COLORS.notes[0], anonymous: false });
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={createPost}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-slate-600 to-gray-700 text-white py-3 rounded-xl font-semibold hover:from-slate-700 hover:to-gray-800 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 transform hover:scale-[1.02]"
              >
                {loading ? 'Colando...' : (
                  <>
                    <Send className="w-4 h-4" />
                    Colar Nota
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}