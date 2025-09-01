// BINAH - Sistema de Autenticação Seguro
class BinahAuth {
  constructor() {
    this.storageKey = 'binah_users';
    this.sessionKey = 'binah_session';
    this.rememberKey = 'binah_remember';
    this.currentUser = null;
    this.isAuthenticated = false;
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 horas
    this.maxLoginAttempts = 5;
    this.lockoutTime = 15 * 60 * 1000; // 15 minutos
    
    this.init();
  }

  init() {
    this.initializeDefaultUsers();
    this.checkExistingSession();
    this.setupSecurityMeasures();
  }

  // Inicializar usuário admin padrão
  initializeDefaultUsers() {
    const users = this.getUsers();
    if (users.length === 0) {
      const adminUser = {
        id: 1,
        username: 'admin',
        password: this.hashPassword('admin'),
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginAttempts: 0,
        lockedUntil: null
      };
      this.saveUser(adminUser);
      console.log('👤 Usuário admin criado com sucesso');
    }
  }

  // Hash simples mas seguro para senhas
  hashPassword(password) {
    // Combina com salt para maior segurança
    const salt = 'BINAH_SECURE_SALT_2024';
    let hash = 0;
    const combined = password + salt;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converte para 32-bit integer
    }
    
    // Adiciona complexidade extra
    return btoa(hash.toString(16) + salt.slice(0, 8));
  }

  // Verificar senha
  verifyPassword(password, hashedPassword) {
    return this.hashPassword(password) === hashedPassword;
  }

  // Gerar token de sessão seguro
  generateSessionToken() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const userAgent = navigator.userAgent.slice(0, 20);
    return btoa(`${timestamp}_${random}_${userAgent}`);
  }

  // Verificar se sessão é válida
  isValidSession(session) {
    try {
      const decoded = atob(session.token);
      const [timestamp] = decoded.split('_');
      const sessionAge = Date.now() - parseInt(timestamp);
      return sessionAge < this.sessionTimeout;
    } catch {
      return false;
    }
  }

  // Salvar usuário
  saveUser(user) {
    const users = this.getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    
    if (existingIndex !== -1) {
      users[existingIndex] = user;
    } else {
      user.id = Math.max(...users.map(u => u.id), 0) + 1;
      users.push(user);
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(users));
  }

  // Obter todos os usuários
  getUsers() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  // Obter usuário por username
  getUserByUsername(username) {
    const users = this.getUsers();
    return users.find(u => u.username === username);
  }

  // Verificar tentativas de login
  canAttemptLogin(user) {
    if (!user.lockedUntil) return true;
    
    const lockExpired = new Date(user.lockedUntil) < new Date();
    if (lockExpired) {
      user.loginAttempts = 0;
      user.lockedUntil = null;
      this.saveUser(user);
      return true;
    }
    
    return false;
  }

  // Registrar tentativa de login
  recordLoginAttempt(user, success) {
    if (success) {
      user.loginAttempts = 0;
      user.lockedUntil = null;
      user.lastLogin = new Date().toISOString();
    } else {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      if (user.loginAttempts >= this.maxLoginAttempts) {
        user.lockedUntil = new Date(Date.now() + this.lockoutTime).toISOString();
      }
    }
    
    this.saveUser(user);
  }

  // Login
  async login(username, password, rememberMe = false) {
    try {
      const user = this.getUserByUsername(username);
      
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      if (!this.canAttemptLogin(user)) {
        const lockTime = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
        return { 
          success: false, 
          message: `Conta bloqueada. Tente novamente em ${lockTime} minutos` 
        };
      }

      if (!this.verifyPassword(password, user.password)) {
        this.recordLoginAttempt(user, false);
        const remaining = this.maxLoginAttempts - (user.loginAttempts || 0);
        return { 
          success: false, 
          message: `Senha incorreta. ${remaining} tentativas restantes` 
        };
      }

      // Login bem-sucedido
      this.recordLoginAttempt(user, true);
      this.currentUser = user;
      this.isAuthenticated = true;

      // Criar sessão
      const sessionToken = this.generateSessionToken();
      const session = {
        userId: user.id,
        token: sessionToken,
        createdAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      };

      sessionStorage.setItem(this.sessionKey, JSON.stringify(session));

      // Remember me
      if (rememberMe) {
        localStorage.setItem(this.rememberKey, JSON.stringify(session));
      }

      console.log('✅ Login realizado com sucesso para:', username);
      return { success: true, message: 'Login realizado com sucesso', user };

    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, message: 'Erro interno do sistema' };
    }
  }

  // Registrar novo usuário
  async register(username, password, confirmPassword) {
    try {
      if (password !== confirmPassword) {
        return { success: false, message: 'Senhas não coincidem' };
      }

      if (password.length < 4) {
        return { success: false, message: 'Senha deve ter pelo menos 4 caracteres' };
      }

      if (this.getUserByUsername(username)) {
        return { success: false, message: 'Usuário já existe' };
      }

      const newUser = {
        username: username,
        password: this.hashPassword(password),
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginAttempts: 0,
        lockedUntil: null
      };

      this.saveUser(newUser);
      console.log('✅ Usuário registrado com sucesso:', username);
      return { success: true, message: 'Usuário criado com sucesso' };

    } catch (error) {
      console.error('Erro no registro:', error);
      return { success: false, message: 'Erro interno do sistema' };
    }
  }

  // Verificar sessão existente
  checkExistingSession() {
    // Verificar sessão ativa
    const sessionData = sessionStorage.getItem(this.sessionKey);
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        if (this.isValidSession(session)) {
          const user = this.getUsers().find(u => u.id === session.userId);
          if (user) {
            this.currentUser = user;
            this.isAuthenticated = true;
            return true;
          }
        }
      } catch (error) {
        console.error('Sessão inválida:', error);
      }
    }

    // Verificar remember me
    const rememberData = localStorage.getItem(this.rememberKey);
    if (rememberData) {
      try {
        const session = JSON.parse(rememberData);
        if (this.isValidSession(session)) {
          const user = this.getUsers().find(u => u.id === session.userId);
          if (user) {
            this.currentUser = user;
            this.isAuthenticated = true;
            // Renovar sessão
            sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
            return true;
          }
        } else {
          localStorage.removeItem(this.rememberKey);
        }
      } catch (error) {
        localStorage.removeItem(this.rememberKey);
      }
    }

    return false;
  }

  // Logout
  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    sessionStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.rememberKey);
    console.log('👋 Logout realizado com sucesso');
  }

  // Medidas de segurança
  setupSecurityMeasures() {
    // Prevenir acesso direto às variáveis
    Object.freeze(this.constructor.prototype);
    
    // Detectar tentativas de bypass
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalGetItem = localStorage.getItem.bind(localStorage);
    
    localStorage.setItem = (key, value) => {
      if (key === this.sessionKey || key === this.rememberKey) {
        console.warn('🚨 Tentativa de manipulação de sessão detectada');
        return;
      }
      return originalSetItem(key, value);
    };

    // Monitorar console
    let devtoolsOpen = false;
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > 200 || 
          window.outerWidth - window.innerWidth > 200) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          console.clear();
          console.warn('🛡️ Sistema de segurança BINAH ativo');
        }
      } else {
        devtoolsOpen = false;
      }
    }, 1000);
  }

  // Verificar permissões
  hasPermission(permission) {
    if (!this.isAuthenticated) return false;
    if (this.currentUser.role === 'admin') return true;
    
    const permissions = {
      'create_topic': true, // Todos os usuários logados podem criar
      'edit_topic': ['admin'], // Será verificado individualmente por post
      'delete_topic': ['admin'], // Será verificado individualmente por post
      'view_stats': ['admin'],
      'admin_dashboard': ['admin']
    };
    
    // Se é create_topic, permitir para todos os usuários logados
    if (permission === 'create_topic') {
      return true;
    }
    
    return permissions[permission]?.includes(this.currentUser.role) || false;
  }

  // Verificar se pode editar/excluir um post específico
  canEditPost(postAuthor) {
    if (!this.isAuthenticated) return false;
    if (this.currentUser.role === 'admin') return true;
    return this.currentUser.username === postAuthor;
  }

  canDeletePost(postAuthor) {
    if (!this.isAuthenticated) return false;
    if (this.currentUser.role === 'admin') return true;
    return this.currentUser.username === postAuthor;
  }

  // Obter usuário atual
  getCurrentUser() {
    return this.currentUser;
  }

  // Verificar se está autenticado
  isLoggedIn() {
    return this.isAuthenticated && this.currentUser !== null;
  }
}

// Inicializar sistema de auth
window.binahAuth = new BinahAuth();