import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StickyNote, Users, Heart, Lock, Unlock, User, UserX, Send, Copy, Check, LogOut, Hash, Palette, Share2, X, AlertCircle, Home, Plus } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost';

// Paleta de cores para painéis de amigos (neutras e aconchegantes)
const FRIENDS_COLORS = {
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
    '#7D8471', // Olive green
    '#A67C7C', // Muted rose
  ],
  backgrounds: [
    '#FFFFFF', // Pure white
    '#FAFAF8', // Off white
    '#F8F8F6', // Warm white
    '#F5F5F0', // Cream
    '#F0F4EC', // Light sage
    '#F8F6F9', // Light lavender
    '#F6F8FB', // Light blue
    '#F9F7F4', // Warm beige
  ]
};

// Paleta de cores românticas para painéis de casal
const COUPLE_COLORS = {
  notes: [
    '#FFFFFF', // Pure white
    '#FFE4E6', // Soft rose
    '#FFEEF0', // Blush pink
    '#FFF0F5', // Lavender blush
    '#FFE8F1', // Soft magenta
    '#F0E8FF', // Light purple
    '#FFE8E8', // Warm pink
    '#FFF5F5', // Soft cream pink
  ],
  borders: [
    '#D4567A', // Romantic rose
    '#B8527D', // Deep rose
    '#9B4F7A', // Plum
    '#C75B7A', // Soft burgundy
    '#D67C8F', // Dusty rose
    '#A87CA8', // Lavender purple
    '#CD8B9C', // Mauve
    '#E6A8B8', // Soft pink
  ],
  backgrounds: [
    '#FFFFFF', // Pure white
    '#FFF8F9', // Soft rose white
    '#FFF5F7', // Blush white
    '#FFFAFC', // Pink cream
    '#FFF0F5', // Lavender blush
    '#F8F0FF', // Light purple
    '#FFE8F1', // Soft magenta
    '#FFEEF0', // Rose cream
  ]
};

const GRADIENTS = {
  friends: 'bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50',
  couple: 'bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50',
  panel_friends: 'bg-gradient-to-br from-gray-50 to-slate-50',
  panel_couple: 'bg-gradient-to-br from-rose-50 to-pink-50'
};

// Função para obter cores baseadas no tipo do painel
const getColors = (type) => {
  return type === 'couple' ? COUPLE_COLORS : FRIENDS_COLORS;
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
    backgroundColor: post.color || '#FFFFFF',
    left: position.x,
    top: position.y,
    background: `linear-gradient(135deg, ${post.color || '#FFFFFF'} 0%, ${post.color || '#FFFFFF'}dd 100%)`
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
  const [newPost, setNewPost] = useState({ content: '', color: '#FFFFFF', anonymous: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [borderColor, setBorderColor] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [myPanels, setMyPanels] = useState([]);
  const [showMyPanels, setShowMyPanels] = useState(false);
  const [showPanelSwitch, setShowPanelSwitch] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [requiresPasswordCheck, setRequiresPasswordCheck] = useState(false);
  
  // Novo estado para controlar a escolha inicial
  const [initialChoice, setInitialChoice] = useState('');

  const pollingInterval = useRef(null);

  // Inicializar cores baseadas no tipo do painel
  useEffect(() => {
    if (panelType && panelType !== 'join' && panelType !== 'create') {
      const colors = getColors(panelType);
      setBorderColor(colors.borders[0]);
      setBackgroundColor(colors.backgrounds[0]);
      setNewPost(prev => ({ ...prev, color: colors.notes[0] }));
    }
  }, [panelType]);

  // Atualizar cores das notas quando entrar em um painel existente
  useEffect(() => {
    if (currentPanel) {
      const colors = getColors(currentPanel.type);
      setNewPost(prev => ({ ...prev, color: colors.notes[0] }));
      loadMyPanels();
    }
  }, [currentPanel]);

  const loadMyPanels = useCallback(async () => {
    if (!userName) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${userName}/panels`);
      if (response.ok) {
        const panels = await response.json();
        setMyPanels(panels.slice(0, 5)); // Limitar a 5 painéis
      }
    } catch (err) {
      console.error('Erro ao carregar painéis:', err);
    }
  }, [userName]);

  const fetchPosts = useCallback(async () => {
    if (!currentPanel) return;
    
    try {
      const response = await fetch(`${API_URL}/api/panels/${currentPanel.id}/posts`);
      if (response.ok) {
        const postsData = await response.json();
        setPosts(postsData);
      }
    } catch (err) {
      console.error('Erro ao buscar posts:', err);
    }
  }, [currentPanel]);

  const fetchActiveUsers = useCallback(async () => {
    if (!currentPanel) return;
    
    try {
      const response = await fetch(`${API_URL}/api/panels/${currentPanel.id}/users`);
      if (response.ok) {
        const usersData = await response.json();
        setActiveUsers(usersData);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setActiveUsers([{ name: userName }]);
    }
  }, [currentPanel, userName]);

  useEffect(() => {
    if (currentPanel && userName) {
      fetchPosts();
      fetchActiveUsers();
      
      // Registrar usuário como ativo
      fetch(`${API_URL}/api/panels/${currentPanel.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName })
      }).catch(console.error);
      
      pollingInterval.current = setInterval(() => {
        fetchPosts();
        fetchActiveUsers();
      }, 3000);
      
      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
        // Remover usuário quando sair
        fetch(`${API_URL}/api/panels/${currentPanel.id}/users/${userName}`, {
          method: 'DELETE'
        }).catch(console.error);
      };
    }
  }, [currentPanel, userName, fetchPosts, fetchActiveUsers]);

  // Verificar se painel requer senha
  useEffect(() => {
    const checkPassword = async () => {
      if (initialChoice === 'join' && panelCode.length === 6) {
        try {
          const response = await fetch(`${API_URL}/api/panels/${panelCode.toUpperCase()}/check`);
          if (response.ok) {
            const data = await response.json();
            setRequiresPasswordCheck(data.requiresPassword);
          }
        } catch (err) {
          console.error('Erro ao verificar senha:', err);
        }
      }
    };
    
    checkPassword();
  }, [panelCode, initialChoice]);

  const createPanel = async () => {
    if (!panelName.trim()) {
      setError('Digite um nome para o painel');
      return;
    }

    if (!userName.trim()) {
      setError('Digite seu nome');
      return;
    }

    // Verificar limite de painéis
    if (myPanels.length >= 5) {
      setError('Limite de 5 painéis por usuário atingido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/panels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: panelName,
          type: panelType,
          password: requirePassword ? panelPassword : null,
          creator: userName,
          borderColor,
          backgroundColor
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Erro ao criar painel:', errorData);
        throw new Error('Erro ao criar painel');
      }

      const panel = await response.json();
      setCurrentPanel(panel);
      
    } catch (err) {
      console.error('Erro completo:', err);
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
      // Primeiro, verificar se o painel requer senha
      const checkResponse = await fetch(`${API_URL}/api/panels/${panelCode.toUpperCase()}/check`);
      const requiresPassword = checkResponse.ok && (await checkResponse.json()).requiresPassword;

      if (requiresPassword && !joinPassword) {
        setLoading(false);
        return; // Usuário precisa inserir senha
      }

      const response = await fetch(`${API_URL}/api/panels/${panelCode.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: joinPassword || undefined,
          userName: userName
        })
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Painel não encontrado');
        }
        if (response.status === 401) {
          throw new Error('Senha incorreta');
        }
        if (response.status === 403) {
          throw new Error('Painel lotado');
        }
        const errorData = await response.text();
        console.error('Erro ao acessar painel:', errorData);
        throw new Error('Erro ao acessar painel');
      }

      const panel = await response.json();
      setCurrentPanel(panel);
      
      // Buscar posts existentes
      const postsResponse = await fetch(`${API_URL}/api/panels/${panelCode.toUpperCase()}/posts`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPosts(postsData);
      }
      
    } catch (err) {
      console.error('Erro completo:', err);
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

      const response = await fetch(`${API_URL}/api/panels/${currentPanel.id}/posts`, {
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

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Erro ao criar post:', errorData);
        throw new Error('Erro ao criar post');
      }

      const createdPost = await response.json();
      setPosts(prev => [createdPost, ...prev]);
      
      const colors = getColors(currentPanel.type);
      setNewPost({ content: '', color: colors.notes[0], anonymous: false });
      setShowNewPostForm(false);
      setError('');
    } catch (err) {
      console.error('Erro completo:', err);
      setError('Erro ao criar post. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId) => {
    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}?panel_id=${currentPanel.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok || response.status === 404) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error('Erro ao deletar post:', err);
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
          panel_id: currentPanel.id
        })
      });

      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, position_x: x, position_y: y } : p
      ));
    } catch (err) {
      console.error('Erro ao mover post:', err);
    }
  };

  const switchPanel = async (panelId) => {
    try {
      const response = await fetch(`${API_URL}/api/panels/${panelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: userName
        })
      });
      
      if (response.ok) {
        const panel = await response.json();
        setCurrentPanel(panel);
        setShowPanelSwitch(false);
      }
    } catch (err) {
      console.error('Erro ao trocar painel:', err);
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
    
    // Remover usuário ao sair
    if (currentPanel && userName) {
      try {
        await fetch(`${API_URL}/api/panels/${currentPanel.id}/users/${userName}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Erro ao remover usuário:', err);
      }
    }
    
    setCurrentPanel(null);
    setPosts([]);
    setUserName('');
    setPanelType('');
    setActiveUsers([]);
    setBorderColor('');
    setBackgroundColor('');
    setShowExitConfirm(false);
    setInitialChoice(''); // Reset initial choice
  };

  const goToHome = () => {
    // Função para voltar ao painel principal
    exitPanel();
  };

  // Tela inicial - Nova estrutura
  if (!initialChoice) {
    return (
      <div className={`min-h-screen ${GRADIENTS.friends} flex items-center justify-center p-4`}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl w-full border border-gray-100">
          <div className="flex items-center justify-center mb-8">
            <StickyNote className="w-12 h-12 text-slate-600 mr-3" />
            <h1 className="text-5xl font-bold text-gray-800">
              Sticky Notes
            </h1>
          </div>
          <p className="text-center text-gray-600 mb-10 text-lg">
            Escolha uma opção para começar.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setInitialChoice('create')}
              className="w-full p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border border-blue-200 hover:border-blue-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <StickyNote className="w-8 h-8 text-blue-600 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-800">Crie seu mural</h3>
                  <p className="text-gray-600 text-sm mt-1">Comece um novo mural para compartilhar com amigos ou seu par</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setInitialChoice('join')}
              className="w-full p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl hover:from-green-100 hover:to-emerald-100 transition-all duration-300 border border-green-200 hover:border-green-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <Hash className="w-8 h-8 text-green-600 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-800">Acesse um mural</h3>
                  <p className="text-gray-600 text-sm mt-1">Entre em um mural existente usando um código</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de escolha do tipo de painel (após escolher "Crie seu mural")
  if (initialChoice === 'create' && !panelType) {
    return (
      <div className={`min-h-screen ${GRADIENTS.friends} flex items-center justify-center p-4`}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl w-full border border-gray-100">
          <button
            onClick={() => setInitialChoice('')}
            className="mb-6 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm"
          >
            ← Voltar
          </button>

          <div className="flex items-center justify-center mb-8">
            <StickyNote className="w-12 h-12 text-slate-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">
              Tipo de Mural
            </h1>
          </div>
          <p className="text-center text-gray-600 mb-10 text-lg">
            Escolha o tipo de grupo para seu mural.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => setPanelType('friends')}
              className="w-full p-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl hover:from-slate-100 hover:to-gray-100 transition-all duration-300 border border-gray-200 hover:border-gray-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <Users className="w-8 h-8 text-slate-600 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-800">Para amigos</h3>
                  <p className="text-gray-600 text-sm mt-1">Mural aconchegante para compartilhar com amigos</p>
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
                  <h3 className="text-xl font-semibold text-gray-800">Para casais</h3>
                  <p className="text-gray-600 text-sm mt-1">Mural romântico para compartilhar com seu par</p>
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
    const colors = getColors(panelType === 'join' ? 'friends' : panelType);
    const gradient = panelType === 'couple' ? GRADIENTS.couple : GRADIENTS.friends;

    return (
      <div className={`min-h-screen ${gradient} flex items-center justify-center p-4`}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border border-gray-100">
          <button
            onClick={() => {
              if (initialChoice === 'join') {
                setInitialChoice('');
              } else {
                setPanelType('');
              }
            }}
            className="mb-6 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm"
          >
            ← Voltar
          </button>

          <div className="flex items-center justify-center mb-8">
            {panelType === 'couple' ? (
              <Heart className="w-10 h-10 text-rose-500 mr-3" />
            ) : initialChoice === 'join' ? (
              <Hash className="w-10 h-10 text-green-600 mr-3" />
            ) : (
              <StickyNote className="w-10 h-10 text-slate-600 mr-3" />
            )}
            <h2 className="text-4xl font-bold text-gray-800">
              {panelType === 'couple' ? 'Painel Romântico' : 
               initialChoice === 'join' ? 'Acessar Mural' : 
               'Novo Mural'}
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

            {initialChoice === 'join' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código do Mural
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

                {requiresPasswordCheck && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha do Mural
                    </label>
                    <input
                      type="password"
                      placeholder="Digite a senha do mural"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                <button
                  onClick={accessPanel}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                >
                  {loading ? 'Entrando...' : 'Entrar no Mural'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Mural
                  </label>
                  <input
                    type="text"
                    placeholder={panelType === 'couple' ? 'Nosso cantinho romântico ❤️' : 'Ideias da turma'}
                    value={panelName}
                    onChange={(e) => setPanelName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Palette className="w-4 h-4 inline mr-1" />
                    Cor da Borda do Mural
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.borders.map(color => (
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Palette className="w-4 h-4 inline mr-1" />
                    Cor de Fundo do Mural
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.backgrounds.map(color => (
                      <button
                        key={color}
                        onClick={() => setBackgroundColor(color)}
                        className={`w-12 h-12 rounded-xl border-2 transition-all relative ${
                          backgroundColor === color ? 'border-gray-700 scale-110 shadow-lg' : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {backgroundColor === color && (
                          <Check className="w-4 h-4 text-gray-700 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </button>
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
                    placeholder="Digite a senha do mural"
                    value={panelPassword}
                    onChange={(e) => setPanelPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                  />
                )}

                <button
                  onClick={createPanel}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] ${
                    panelType === 'couple' 
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700'
                      : 'bg-gradient-to-r from-slate-600 to-gray-700 text-white hover:from-slate-700 hover:to-gray-800'
                  }`}
                >
                  {loading ? 'Criando...' : `Criar ${panelType === 'couple' ? 'Mural Romântico ❤️' : 'Mural para Amigos'}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tela do painel
  const panelGradient = currentPanel.type === 'couple' ? GRADIENTS.panel_couple : GRADIENTS.panel_friends;
  const currentColors = getColors(currentPanel.type);

  return (
    <div className={`min-h-screen ${panelGradient}`}>
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={goToHome}
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <Home className="w-4 h-4" />
                Início
              </button>
              <button
                onClick={() => setShowMyPanels(true)}
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <Users className="w-4 h-4" />
                Meus murais ({myPanels.length}/5)
              </button>
              <div>
                <button
                  onClick={() => setShowPanelSwitch(true)}
                  className="text-xl font-bold text-gray-800 flex items-center gap-2 hover:text-gray-600 transition-colors"
                >
                  {currentPanel.type === 'couple' ? (
                    <Heart className="w-5 h-5 text-rose-500" />
                  ) : (
                    <StickyNote className="w-5 h-5 text-slate-600" />
                  )}
                  {currentPanel.name}
                  {currentPanel.type === 'couple' && (
                    <span className="text-rose-500">❤️</span>
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                currentPanel.type === 'couple' ? 'bg-rose-50' : 'bg-gray-50'
              }`}>
                <Users className={`w-4 h-4 ${
                  currentPanel.type === 'couple' ? 'text-rose-500' : 'text-slate-600'
                }`} />
                <span className="text-sm font-medium text-gray-700">
                  {activeUsers.length || 1}{currentPanel.type === 'couple' ? '/2' : '/15'}
                </span>
              </div>

              <button
                onClick={() => setShowShareModal(true)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-md text-sm ${
                  currentPanel.type === 'couple'
                    ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white hover:from-rose-500 hover:to-pink-600'
                    : 'bg-gradient-to-r from-slate-500 to-gray-600 text-white hover:from-slate-600 hover:to-gray-700'
                }`}
              >
                <Share2 className="w-4 h-4" />
                Compartilhar
              </button>

              <button
                onClick={() => setShowNewPostForm(true)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-md text-sm ${
                  currentPanel.type === 'couple'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700'
                    : 'bg-gradient-to-r from-slate-600 to-gray-700 text-white hover:from-slate-700 hover:to-gray-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                Novo + {currentPanel.type === 'couple' ? '💕' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 h-[calc(100vh-80px)]">
        <div 
          className="relative w-full h-full rounded-lg shadow-inner overflow-hidden"
          style={{
            backgroundColor: currentPanel.background_color || backgroundColor || '#FFFFFF',
            border: `8px solid ${currentPanel.border_color || borderColor}`,
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
                {currentPanel.type === 'couple' ? (
                  <Heart className="w-16 h-16 text-rose-300 mx-auto mb-4" />
                ) : (
                  <StickyNote className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                )}
                <p className="text-xl text-gray-400 mb-2">
                  {currentPanel.type === 'couple' ? 'Nenhuma mensagem de amor ainda 💕' : 'Nenhuma nota ainda'}
                </p>
                <p className="text-gray-500 text-sm">
                  {currentPanel.type === 'couple' 
                    ? 'Clique em "Novo +" para deixar uma mensagem romântica!'
                    : 'Clique em "Novo +" para adicionar a primeira!'
                  }
                </p>
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

      {/* Modal de Compartilhamento */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Share2 className={`w-6 h-6 ${
                  currentPanel.type === 'couple' ? 'text-rose-500' : 'text-blue-600'
                }`} />
                Compartilhar Mural
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código do Mural
                </label>
                <div className="flex items-center gap-3">
                  <code className={`flex-1 px-4 py-3 rounded-xl text-lg font-mono font-bold text-center ${
                    currentPanel.type === 'couple' 
                      ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                      : 'bg-gray-50 text-gray-800 border border-gray-200'
                  }`}>
                    {currentPanel.id}
                  </code>
                  <button
                    onClick={copyCode}
                    className={`p-3 rounded-xl transition-colors text-white ${
                      currentPanel.type === 'couple'
                        ? 'bg-rose-500 hover:bg-rose-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className={`p-4 rounded-xl ${
                currentPanel.type === 'couple' ? 'bg-rose-50' : 'bg-blue-50'
              }`}>
                <p className={`text-sm ${
                  currentPanel.type === 'couple' ? 'text-rose-800' : 'text-blue-800'
                }`}>
                  Compartilhe este código com outras pessoas para que elas possam se juntar ao seu mural.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Meus Murais */}
      {showMyPanels && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-slate-600" />
                Meus murais ({myPanels.length}/5)
              </h2>
              <button
                onClick={() => setShowMyPanels(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              {myPanels.map(panel => (
                <div
                  key={panel.id}
                  className={`p-4 rounded-xl border-2 ${
                    panel.id === currentPanel.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  } transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {panel.type === 'couple' ? (
                        <Heart className="w-5 h-5 text-rose-500" />
                      ) : (
                        <Users className="w-5 h-5 text-slate-600" />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">{panel.name}</h3>
                        {panel.id === currentPanel.id && (
                          <span className="text-xs text-blue-600 font-medium">Mural atual</span>
                        )}
                      </div>
                    </div>
                    {panel.id !== currentPanel.id && (
                      <button
                        onClick={() => switchPanel(panel.id)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Entrar
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Mural
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Saída */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <div className="flex items-center justify-center mb-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
              Confirmar Saída
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              Tem certeza que deseja sair do mural "{currentPanel.name}"?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={exitPanel}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Nota */}
      {showNewPostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              {currentPanel.type === 'couple' ? (
                <Heart className="w-6 h-6 text-rose-500" />
              ) : (
                <StickyNote className="w-6 h-6 text-slate-600" />
              )}
              {currentPanel.type === 'couple' ? 'Nova Mensagem de Amor 💕' : 'Nova Nota Adesiva'}
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
                  {currentPanel.type === 'couple' ? 'Sua mensagem romântica ❤️' : 'Mensagem'}
                </label>
                <textarea
                  placeholder={currentPanel.type === 'couple' 
                    ? 'Escreva algo especial para quem você ama...' 
                    : 'Escreva sua nota...'
                  }
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  {currentPanel.type === 'couple' ? 'Cor da Nota Romântica 💕' : 'Cor da Nota'}
                </label>
                <div className="mb-2">
                  <p className="text-xs text-gray-600">
                    {currentPanel.type === 'couple' 
                      ? 'Escolha uma cor apaixonante para sua mensagem de amor'
                      : 'Escolha uma cor aconchegante para sua nota'
                    }
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {currentColors.notes.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewPost({...newPost, color})}
                      className={`w-12 h-12 rounded-xl border-2 transition-all relative group ${
                        newPost.color === color 
                          ? currentPanel.type === 'couple'
                            ? 'border-rose-500 scale-110 shadow-lg ring-2 ring-rose-200'
                            : 'border-gray-700 scale-110 shadow-lg ring-2 ring-gray-200'
                          : 'border-gray-300 hover:scale-105 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color === '#FFFFFF' ? 'Branco puro' : color}
                    >
                      {newPost.color === color && (
                        <Check className={`w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
                          color === '#FFFFFF' || color === '#FAFAF8' || color === '#F8F8F6' 
                            ? 'text-gray-700' 
                            : 'text-white drop-shadow-sm'
                        }`} />
                      )}
                      {currentPanel.type === 'couple' && newPost.color === color && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">💕</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-lg border-2 border-dashed border-gray-300">
                  <div 
                    className="w-full h-16 rounded-lg flex items-center justify-center text-sm text-gray-600 shadow-sm"
                    style={{ backgroundColor: newPost.color }}
                  >
                    {currentPanel.type === 'couple' 
                      ? 'Prévia da sua nota romântica 💕'
                      : 'Prévia da sua nota'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowNewPostForm(false);
                  setError('');
                  const colors = getColors(currentPanel.type);
                  setNewPost({ content: '', color: colors.notes[0], anonymous: false });
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={createPost}
                disabled={loading}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 transform hover:scale-[1.02] ${
                  currentPanel.type === 'couple'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700'
                    : 'bg-gradient-to-r from-slate-600 to-gray-700 text-white hover:from-slate-700 hover:to-gray-800'
                }`}
              >
                {loading ? 'Colando...' : (
                  <>
                    <Send className="w-4 h-4" />
                    {currentPanel.type === 'couple' ? 'Enviar com Amor 💕' : 'Colar Nota'}
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
