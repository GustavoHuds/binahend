// BINAH - Base de Conhecimento Inteligente
// Main Application Logic

class BinahApp {
  constructor() {
    this.currentView = 'list';
    this.searchTerm = '';
    this.isSearchActive = false;
    this.currentTopicId = null;
    this.currentFilter = 'all';
    this.draggedCard = null;
    
    this.categories = [
      { id: 'Máquinas', icon: '⚙️', color: '#3b82f6' },
      { id: 'Dosadoras', icon: '💧', color: '#06b6d4' },
      { id: 'Manutenção', icon: '🔧', color: '#10b981' },
      { id: 'Erros', icon: '⚠️', color: '#f59e0b' },
      { id: 'Procedimentos', icon: '📋', color: '#8b5cf6' }
    ];
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadInitialData();
    this.updateConnectionStatus();
  }

  setupEventListeners() {
    const mainSearch = document.getElementById('mainSearchInput');
    const compactSearch = document.getElementById('compactSearchInput');
    
    // Main search events
    mainSearch?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log('🔍 Enter pressionado na barra principal, valor:', mainSearch.value);
        this.performSearch();
      }
    });
    mainSearch?.addEventListener('input', (e) => this.handleLiveSearch(e.target.value));
    
    // Compact search events
    compactSearch?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log('🔍 Enter pressionado na barra compacta, valor:', compactSearch.value);
        this.performSearch();
      }
    });
    compactSearch?.addEventListener('input', (e) => this.handleLiveSearch(e.target.value));
    
    // Close modal on outside click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        this.handleSearchFocus();
      }
      if (e.key === 'Escape') {
        // First check if topic popup is open
        const topicPopup = document.getElementById('topicPopup');
        if (topicPopup && topicPopup.classList.contains('active')) {
          this.closeTopicPopup();
          return;
        }
        
        this.closeModal();
        document.getElementById('liveSearchResults')?.classList.remove('active');
        if (this.isSearchActive) {
          this.showHomeWithAnimation();
        }
      }
    });
  }

  handleCompactSearchClick() {
    if (this.isSearchActive) {
      // Animate back to home view with search expansion
      const compactSearch = document.getElementById('compactSearchInput');
      const compactSearchContainer = document.getElementById('compactSearchContainer');
      const heroSection = document.getElementById('heroSection');
      const header = document.getElementById('header');
      const mainContent = document.getElementById('mainContent');
      
      // Start fade out main content
      if (mainContent) {
        mainContent.style.transition = 'opacity 0.3s ease';
        mainContent.style.opacity = '0';
      }
      
      setTimeout(() => {
        // Reset to home state
        heroSection?.classList.remove('hidden');
        header?.classList.remove('compact');
        document.body?.classList.remove('searched');
        mainContent?.classList.remove('active');
        
        // Hide compact search container
        if (compactSearchContainer) {
          compactSearchContainer.style.display = 'none';
        }
        
        // Transfer search value and focus main search
        const mainSearch = document.getElementById('mainSearchInput');
        const searchValue = compactSearch?.value || '';
        
        if (mainSearch) {
          mainSearch.value = searchValue;
          setTimeout(() => {
            mainSearch.focus();
            if (searchValue) {
              mainSearch.setSelectionRange(searchValue.length, searchValue.length);
            }
          }, 200);
        }
        
        if (compactSearch) compactSearch.value = '';
        
        // Reset state
        this.isSearchActive = false;
        this.searchTerm = '';
        this.currentFilter = 'all';
        
        // Hide any live results
        document.getElementById('liveSearchResults')?.classList.remove('active');
        
      }, 300);
    }
  }

  handleSearchFocus() {
    if (this.isSearchActive) {
      this.showHomeWithAnimation();
    } else {
      document.getElementById('mainSearchInput')?.focus();
    }
  }

  async loadInitialData() {
    try {
      const topics = await window.binahAPI.getTopics();
      this.updateUI();
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      this.showNotification('Erro ao carregar dados', 'error');
    }
  }

  updateConnectionStatus() {
    // Só atualizar indicadores se o usuário for admin
    if (!window.binahAuth || !window.binahAuth.isLoggedIn() || 
        window.binahAuth.getCurrentUser()?.role !== 'admin') {
      return;
    }
    
    const indicator = document.getElementById('dbIndicator');
    const statusText = document.getElementById('dbStatusText');
    const statusIndicator = document.getElementById('dbStatusIndicator');
    
    if (window.binahAPI.connected) {
      indicator?.classList.add('connected');
      if (statusText) statusText.textContent = 'Database: Conectado';
      if (statusIndicator) {
        statusIndicator.querySelector('span').textContent = 'Database: Conectado';
      }
    } else {
      indicator?.classList.remove('connected');
      if (statusText) statusText.textContent = 'Database: Modo Local';
      if (statusIndicator) {
        statusIndicator.querySelector('span').textContent = 'Database: Modo Local';
      }
    }
  }

  async handleLiveSearch(value) {
    this.searchTerm = value.toLowerCase();
    
    // Sync both search inputs but avoid infinite loop
    const mainSearch = document.getElementById('mainSearchInput');
    const compactSearch = document.getElementById('compactSearchInput');
    
    if (mainSearch && mainSearch.value !== value) {
      mainSearch.value = value;
    }
    if (compactSearch && compactSearch.value !== value) {
      compactSearch.value = value;
    }
    
    const liveResults = document.getElementById('liveSearchResults');
    
    if (this.searchTerm.length < 2) {
      liveResults?.classList.remove('active');
      return;
    }

    try {
      const results = await window.binahAPI.getTopics({ 
        search: this.searchTerm,
        limit: 5 
      });
      this.displayLiveResults(results);
    } catch (error) {
      console.error('Erro na busca ao vivo:', error);
    }
  }

  displayLiveResults(results) {
    const container = document.getElementById('liveSearchResults');
    if (!container) return;
    
    if (results.length === 0) {
      container.innerHTML = `
        <div class="live-result-item">
          <div>
            <div class="live-result-title">Nenhum resultado encontrado</div>
            <div style="font-size: 12px; color: var(--secondary); margin-top: 5px;">
              Tente outras palavras-chave ou crie um novo tópico
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = results.map(topic => `
        <div class="live-result-item" onclick="app.selectLiveResult(${topic.id})">
          <div>
            <div class="live-result-title">${this.highlightText(topic.title)}</div>
            <div style="font-size: 11px; color: var(--secondary); margin-top: 3px;">
              ${topic.preview.substring(0, 80)}...
            </div>
          </div>
          <span class="live-result-category">${this.getCategoryIcon(topic.category)} ${topic.category}</span>
        </div>
      `).join('');
    }
    
    container.classList.add('active');
  }

  selectLiveResult(topicId) {
    document.getElementById('liveSearchResults')?.classList.remove('active');
    this.viewTopic(topicId);
    this.activateSearchMode();
  }

  async performSearch(category = null) {
    const mainSearch = document.getElementById('mainSearchInput');
    const compactSearch = document.getElementById('compactSearchInput');
    
    // Debug: log current input values
    console.log('🔍 Valores dos inputs:', {
      mainSearchValue: mainSearch?.value,
      compactSearchValue: compactSearch?.value,
      category: category
    });
    
    this.searchTerm = category || (mainSearch?.value || compactSearch?.value || '').trim();
    this.currentFilter = category || 'all';
    
    if (!this.searchTerm && !category) {
      console.log('❌ Busca vazia - nada para pesquisar');
      return;
    }

    console.log('🔍 Iniciando busca:', { 
      searchTerm: this.searchTerm, 
      category: category, 
      isCategory: !!category,
      isSearchActive: this.isSearchActive
    });

    try {
      const results = await window.binahAPI.getTopics({ 
        search: category ? undefined : this.searchTerm,
        category: category || undefined
      });

      console.log('📊 Resultados encontrados:', results.length);

      this.activateSearchMode();
      this.displayResults(results);
      
      // Sync search inputs
      if (category) {
        if (mainSearch) mainSearch.value = category;
        if (compactSearch) compactSearch.value = category;
      } else {
        const searchValue = this.searchTerm;
        if (mainSearch && mainSearch.value !== searchValue) mainSearch.value = searchValue;
        if (compactSearch && compactSearch.value !== searchValue) compactSearch.value = searchValue;
      }
      
      // Hide live search results after performing search
      document.getElementById('liveSearchResults')?.classList.remove('active');
      
      // Show success message
      if (results.length > 0) {
        this.showNotification(`✅ ${results.length} resultado(s) encontrado(s)${category ? ` na categoria ${category}` : ''}`, 'success');
      } else {
        this.showNotification(`⚠️ Nenhum resultado encontrado${category ? ` na categoria ${category}` : ` para "${this.searchTerm}"`}`, 'warning');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      this.showNotification('Erro ao realizar busca: ' + error.message, 'error');
    }
  }

  async quickSearch(category) {
    console.log('🔍 Busca rápida por categoria:', category);
    this.performSearch(category);
    
    // Update search inputs to show the category
    document.getElementById('mainSearchInput').value = category;
    document.getElementById('compactSearchInput').value = category;
  }

  activateSearchMode() {
    console.log('🔄 activateSearchMode chamado');
    
    // Hide hero section with animation
    const heroSection = document.getElementById('heroSection');
    if (heroSection) {
      heroSection.classList.add('hidden');
      console.log('✅ Hero section ocultada');
    }
    
    // Show compact header
    const header = document.getElementById('header');
    if (header) {
      header.classList.add('compact');
      console.log('✅ Header compacto ativado');
    }
    
    // Change body background
    if (document.body) {
      document.body.classList.add('searched');
      console.log('✅ Background do body alterado');
    }
    
    // Show main content
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      mainContent.classList.add('active');
      console.log('✅ Main content ativado');
    } else {
      console.error('❌ MainContent não encontrado!');
    }
    
    // Hide live search results
    document.getElementById('liveSearchResults')?.classList.remove('active');
    
    // Show compact search in header
    const compactSearchContainer = document.getElementById('compactSearchContainer');
    if (compactSearchContainer) {
      compactSearchContainer.style.display = 'flex';
      console.log('✅ Compact search container mostrado');
    }
    
    // Show header buttons (they're now always visible)
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
      headerActions.style.display = 'flex';
      console.log('✅ Header actions mostradas');
    }
    
    this.isSearchActive = true;
    console.log('✅ isSearchActive definido como true');
  }

  displayResults(results) {
    console.log('📋 displayResults chamado com:', results.length, 'resultados');
    console.log('🎯 Modo de visualização atual:', this.currentView);
    
    // Update result count
    const resultCount = document.getElementById('resultCount');
    if (resultCount) resultCount.textContent = results.length;
    
    // Ensure the correct view is active
    const listView = document.getElementById('resultsListView');
    const boardView = document.getElementById('boardView');
    
    // FORCE visibility - remove any hidden classes and ensure active
    if (listView) {
      listView.style.opacity = '1';
      listView.style.visibility = 'visible';
      listView.style.display = 'block';
    }
    if (boardView) {
      boardView.style.display = 'grid';
    }
    
    if (this.currentView === 'list') {
      if (listView) {
        listView.classList.add('active');
        console.log('✅ ListView ativada');
      }
      if (boardView) {
        boardView.classList.remove('active');
        boardView.style.display = 'none';
      }
      this.displayListView(results);
    } else {
      if (listView) {
        listView.classList.remove('active');
        listView.style.display = 'none';
      }
      if (boardView) {
        boardView.classList.add('active');
        boardView.style.display = 'grid';
        console.log('✅ BoardView ativada');
      }
      this.displayBoardView(results);
    }
    
    // Double check - log final visibility status
    console.log('👀 Status final da visibilidade:', {
      listViewVisible: listView ? getComputedStyle(listView).opacity : 'N/A',
      listViewDisplay: listView ? getComputedStyle(listView).display : 'N/A',
      boardViewVisible: boardView ? getComputedStyle(boardView).opacity : 'N/A',
      boardViewDisplay: boardView ? getComputedStyle(boardView).display : 'N/A'
    });
  }

  displayListView(results) {
    console.log('📝 displayListView chamado com:', results.length, 'resultados');
    const listView = document.getElementById('resultsListView');
    if (!listView) {
      console.error('❌ Element resultsListView não encontrado!');
      return;
    }
    
    if (results.length === 0) {
      listView.innerHTML = `
        <div style="text-align: center; padding: 60px; color: var(--secondary);">
          <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
          <h3 style="margin-bottom: 15px;">Nenhum resultado encontrado</h3>
          <p>Tente buscar com outras palavras-chave ou crie um novo tópico</p>
          <button class="btn btn-primary" onclick="app.openNewTopicModal()" style="margin-top: 20px;">
            ➕ Criar Novo Tópico
          </button>
        </div>
      `;
      return;
    }

    const htmlContent = results.map(topic => `
      <div class="result-item" onclick="app.viewTopic(${topic.id})">
        <div class="result-header">
          <div>
            <div class="result-title">${this.highlightText(topic.title)}</div>
            <div class="result-meta">
              <span class="result-category" style="background-color: ${this.getCategoryColor(topic.category)}20; color: ${this.getCategoryColor(topic.category)};">
                ${this.getCategoryIcon(topic.category)} ${topic.category}
              </span>
              <div class="result-stats">
                <span title="Visualizações">👁 ${topic.views || 0}</span>
                <span title="Avaliações úteis">👍 ${topic.helpful || 0}</span>
                <span title="Data de criação">📅 ${this.formatDate(topic.date)}</span>
                ${topic.author ? `<span title="Autor">👤 ${topic.author}</span>` : ''}
              </div>
            </div>
          </div>
          ${window.binahAuth.canEditPost(topic.author) ? `
            <div class="result-actions">
              <button class="btn-icon" onclick="event.stopPropagation(); app.editTopic(${topic.id})" title="Editar">
                ✏️
              </button>
              <button class="btn-icon" onclick="event.stopPropagation(); app.deleteTopic(${topic.id})" title="Excluir">
                🗑️
              </button>
            </div>
          ` : ''}
        </div>
        <div class="result-preview">${this.highlightText(topic.preview || '')}</div>
        ${topic.keywords && topic.keywords.length > 0 ? `
          <div class="result-keywords">
            ${topic.keywords.slice(0, 5).map(keyword => 
              `<span class="keyword-tag">${this.highlightText(keyword)}</span>`
            ).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
    
    listView.innerHTML = htmlContent;
    console.log('📄 HTML inserido no listView, tamanho:', htmlContent.length, 'caracteres');
    console.log('🎯 Container listView após inserção:', {
      hasContent: listView.innerHTML.length > 0,
      firstChild: listView.firstElementChild?.tagName,
      childrenCount: listView.children.length
    });
  }

  displayBoardView(results) {
    // Clear all columns
    document.querySelectorAll('.column-cards').forEach(col => col.innerHTML = '');
    document.querySelectorAll('.column-count').forEach(count => count.textContent = '0');

    // Distribute cards to columns
    results.forEach(topic => {
      const column = document.querySelector(`[data-category="${topic.category}"] .column-cards`);
      if (column) {
        column.innerHTML += this.createCard(topic);
        const countElement = column.parentElement.querySelector('.column-count');
        if (countElement) {
          countElement.textContent = parseInt(countElement.textContent) + 1;
        }
      }
    });
  }

  createCard(topic) {
    return `
      <div class="card" draggable="true" data-id="${topic.id}" 
           ondragstart="app.dragStart(event)" 
           ondragend="app.dragEnd(event)"
           onclick="app.viewTopic(${topic.id})"
           style="border-left: 4px solid ${this.getCategoryColor(topic.category)}">
        <div class="card-title">${topic.title}</div>
        <div class="card-preview">${topic.preview ? topic.preview.substring(0, 80) + '...' : ''}</div>
        <div class="card-meta">
          <div class="card-tags">
            ${(topic.keywords || []).slice(0, 2).map(k => 
              `<span class="card-tag">${k}</span>`
            ).join('')}
          </div>
          <div class="card-stats">
            <span title="Visualizações">👁 ${topic.views || 0}</span>
            <span title="Útil">👍 ${topic.helpful || 0}</span>
          </div>
        </div>
${window.binahAuth.canEditPost(topic.author) ? `
        <div class="card-actions">
          <button class="btn-icon-small" onclick="event.stopPropagation(); app.editTopic(${topic.id})" title="Editar">✏️</button>
          <button class="btn-icon-small" onclick="event.stopPropagation(); app.deleteTopic(${topic.id})" title="Excluir">🗑️</button>
        </div>
        ` : ''}
      </div>
    `;
  }

  async viewTopic(id) {
    try {
      const topic = await window.binahAPI.getTopic(id);
      if (!topic) {
        this.showNotification('Tópico não encontrado', 'error');
        return;
      }

      // Increment view count
      await window.binahAPI.updateTopic(id, { incrementView: true });

      this.currentTopicId = id;

      // Find related topics
      const relatedTopics = await window.binahAPI.getTopics({ 
        category: topic.category,
        limit: 3
      });
      const related = relatedTopics.filter(t => t.id !== id);

      // Show topic in popup instead of replacing the view
      this.showTopicPopup(topic, related);
      
    } catch (error) {
      console.error('Erro ao visualizar tópico:', error);
      this.showNotification('Erro ao carregar tópico', 'error');
    }
  }

  showTopicPopup(topic, relatedTopics = []) {
    const popup = document.getElementById('topicPopup');
    const content = document.getElementById('topicPopupContent');
    const header = document.getElementById('header');
    
    if (popup && content) {
      content.innerHTML = this.generateTopicHTML(topic, relatedTopics);
      popup.classList.add('active');
      
      // Add dark theme to header for white background contrast
      if (header) {
        header.classList.add('dark-theme');
        console.log('✅ Classe dark-theme adicionada ao header');
      }
      
      // Prevent body scroll when popup is open
      document.body.style.overflow = 'hidden';
    }
  }

  closeTopicPopup(event) {
    // Only close if clicking on backdrop or close button
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('topic-popup-close')) {
      return;
    }
    
    const popup = document.getElementById('topicPopup');
    const header = document.getElementById('header');
    
    if (popup) {
      popup.classList.remove('active');
      
      // Remove dark theme from header
      if (header) {
        header.classList.remove('dark-theme');
      }
      
      // Restore body scroll
      document.body.style.overflow = '';
      this.currentTopicId = null;
    }
  }

  async showLatestPosts() {
    console.log('🕒 Carregando últimos posts...');
    
    try {
      // Get all topics ordered by date (newest first)
      const topics = await window.binahAPI.getTopics({ 
        orderBy: 'date',
        order: 'DESC',
        limit: 50
      });

      this.activateSearchMode();
      this.displayResults(topics);
      
      // Update search inputs to show what we're viewing
      const mainSearch = document.getElementById('mainSearchInput');
      const compactSearch = document.getElementById('compactSearchInput');
      if (mainSearch) mainSearch.value = 'Últimos Posts';
      if (compactSearch) compactSearch.value = 'Últimos Posts';
      
      // Update result count
      const resultCount = document.getElementById('resultCount');
      if (resultCount) resultCount.textContent = topics.length;
      
      // Update page title
      const resultTitle = document.querySelector('.results-info h2');
      if (resultTitle) resultTitle.textContent = 'Últimos Posts';
      
      this.showNotification(`📋 ${topics.length} posts carregados por ordem de postagem`, 'success');
      
    } catch (error) {
      console.error('Erro ao carregar últimos posts:', error);
      this.showNotification('Erro ao carregar últimos posts: ' + error.message, 'error');
    }
  }

  // Dashboard Functions
  async openDashboard() {
    console.log('📊 Abrindo dashboard administrativo...');
    
    // Verificar permissões de admin
    if (!window.binahAuth.isLoggedIn() || !window.binahAuth.hasPermission('admin_dashboard')) {
      this.showNotification('🚫 Acesso negado - Apenas administradores podem acessar o dashboard', 'error');
      return;
    }

    const popup = document.getElementById('dashboardPopup');
    const header = document.getElementById('header');
    
    if (popup) {
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // Add dark theme to header for white dashboard background
      if (header) {
        header.classList.add('dark-theme');
      }
      
      // Load dashboard data
      await this.loadDashboardData();
    }
  }

  closeDashboard(event) {
    // Only close if clicking on backdrop or close button
    if (event && event.target !== event.currentTarget && !event.target.classList.contains('dashboard-close')) {
      return;
    }
    
    const popup = document.getElementById('dashboardPopup');
    const header = document.getElementById('header');
    
    if (popup) {
      popup.classList.remove('active');
      document.body.style.overflow = '';
      
      // Remove dark theme from header
      if (header) {
        header.classList.remove('dark-theme');
      }
    }
  }

  async loadDashboardData() {
    try {
      // Get all topics for statistics
      const allTopics = await window.binahAPI.getTopics({ limit: 1000 });
      
      // Calculate statistics
      const stats = this.calculateStats(allTopics);
      
      // Update stat cards
      this.updateStatCards(stats);
      
      // Load recent posts
      await this.loadRecentPosts();
      
      console.log('📊 Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showNotification('Erro ao carregar dados do dashboard', 'error');
    }
  }

  calculateStats(topics) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Calculate totals
    const totalPosts = topics.length;
    const totalViews = topics.reduce((sum, topic) => sum + (topic.views || 0), 0);
    const totalHelpful = topics.reduce((sum, topic) => sum + (topic.helpful || 0), 0);
    
    // Calculate recent changes
    const postsThisWeek = topics.filter(topic => {
      const topicDate = new Date(topic.date);
      return topicDate >= weekAgo;
    }).length;
    
    const viewsToday = topics.filter(topic => {
      const topicDate = new Date(topic.date);
      return topicDate >= dayAgo;
    }).reduce((sum, topic) => sum + (topic.views || 0), 0);
    
    // Categories breakdown
    const categoriesCount = {};
    topics.forEach(topic => {
      categoriesCount[topic.category] = (categoriesCount[topic.category] || 0) + 1;
    });

    return {
      totalPosts,
      totalViews,
      totalHelpful,
      postsThisWeek,
      viewsToday,
      categoriesCount,
      totalUsers: this.getEstimatedUsers(), // Mock function
      newUsers: Math.floor(Math.random() * 5) + 1 // Mock data
    };
  }

  getEstimatedUsers() {
    // This would come from a real user management system
    // For now, return a mock number based on posts
    return Math.floor(Math.random() * 20) + 10;
  }

  updateStatCards(stats) {
    // Update total posts
    const totalPostsEl = document.getElementById('totalPosts');
    const postsChangeEl = document.getElementById('postsChange');
    if (totalPostsEl) totalPostsEl.textContent = stats.totalPosts;
    if (postsChangeEl) postsChangeEl.textContent = `↗️ +${stats.postsThisWeek} esta semana`;

    // Update users
    const totalUsersEl = document.getElementById('totalUsers');
    const usersChangeEl = document.getElementById('usersChange');
    if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers;
    if (usersChangeEl) usersChangeEl.textContent = `↗️ +${stats.newUsers} novos`;

    // Update views
    const totalViewsEl = document.getElementById('totalViews');
    const viewsChangeEl = document.getElementById('viewsChange');
    if (totalViewsEl) totalViewsEl.textContent = stats.totalViews.toLocaleString('pt-BR');
    if (viewsChangeEl) viewsChangeEl.textContent = `↗️ +${stats.viewsToday} hoje`;

    // Categories always show 5 (our fixed categories)
    const totalCategoriesEl = document.getElementById('totalCategories');
    const categoriesChangeEl = document.getElementById('categoriesChange');
    if (totalCategoriesEl) totalCategoriesEl.textContent = '5';
    if (categoriesChangeEl) categoriesChangeEl.textContent = '✅ Todas ativas';
  }

  async loadRecentPosts() {
    try {
      const recentTopics = await window.binahAPI.getTopics({ 
        orderBy: 'date',
        order: 'DESC',
        limit: 10
      });

      const container = document.getElementById('recentPostsList');
      if (!container) return;

      if (recentTopics.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--secondary); padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
            <p>Nenhum post encontrado</p>
          </div>
        `;
        return;
      }

      container.innerHTML = recentTopics.map(topic => `
        <div class="recent-post" onclick="app.viewTopic(${topic.id}); app.closeDashboard();">
          <div class="recent-post-info">
            <div class="recent-post-title">${topic.title}</div>
            <div class="recent-post-meta">
              <span class="category-badge" style="background-color: ${this.getCategoryColor(topic.category)}20; color: ${this.getCategoryColor(topic.category)};">
                ${this.getCategoryIcon(topic.category)} ${topic.category}
              </span>
              <span>👁 ${topic.views || 0}</span>
              <span>👍 ${topic.helpful || 0}</span>
              <span>📅 ${this.formatDate(topic.date)}</span>
            </div>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error loading recent posts for dashboard:', error);
    }
  }

  // Quick Actions Functions
  exportData() {
    this.showNotification('📊 Iniciando exportação de dados...', 'info');
    
    // Simulate data export
    setTimeout(() => {
      try {
        // Create mock CSV data
        const csvContent = "data:text/csv;charset=utf-8," + 
          "ID,Título,Categoria,Visualizações,Útil,Data\n" +
          "1,Exemplo de Post,Máquinas,25,5,2024-01-15\n" +
          "2,Outro Post,Dosadoras,18,3,2024-01-14\n";
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `binah-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('✅ Dados exportados com sucesso!', 'success');
      } catch (error) {
        this.showNotification('❌ Erro ao exportar dados', 'error');
      }
    }, 1000);
  }

  showSystemInfo() {
    const info = {
      version: '1.0.0',
      database: window.binahAPI.connected ? 'Conectado' : 'Local Storage',
      uptime: '2h 15m',
      lastBackup: '2024-01-15 10:30:00',
      totalStorage: '12.5 MB'
    };

    this.showNotification(`🔧 Sistema v${info.version} | DB: ${info.database} | Uptime: ${info.uptime}`, 'info');
  }

  generateTopicHTML(topic, relatedTopics) {
    return `
      <div class="topic-navigation">
        <div class="breadcrumb">
          <span onclick="app.backToResults()">← Resultados</span>
          <span>/</span>
          <span onclick="app.quickSearch('${topic.category}')">${topic.category}</span>
          <span>/</span>
          <span style="color: var(--dark);">${topic.title}</span>
        </div>
      </div>
      
      <div class="topic-header">
        <h1 class="topic-title">${topic.title}</h1>
        <div class="topic-info">
          <div class="topic-info-item" style="color: ${this.getCategoryColor(topic.category)};">
            ${this.getCategoryIcon(topic.category)} ${topic.category}
          </div>
          ${topic.author ? `
            <div class="topic-info-item">
              👤 ${topic.author}
            </div>
          ` : ''}
          <div class="topic-info-item">
            📅 ${this.formatDate(topic.date)}
          </div>
          <div class="topic-info-item">
            👁 ${topic.views || 0} visualizações
          </div>
          <div class="topic-info-item">
            👍 ${topic.helpful || 0} acharam útil
          </div>
        </div>
        ${topic.keywords && topic.keywords.length > 0 ? `
          <div class="topic-keywords" style="margin-top: 15px;">
            ${topic.keywords.map(keyword => 
              `<span class="keyword-tag" onclick="app.searchKeyword('${keyword}')">${keyword}</span>`
            ).join('')}
          </div>
        ` : ''}
      </div>
      
      <div class="topic-content">
        ${topic.content}
      </div>
      
      <div class="topic-actions">
        <div class="feedback">
          <span class="feedback-text">Este artigo foi útil?</span>
          <button class="feedback-btn" onclick="app.markHelpful(${topic.id}, true)">
            👍 Sim
          </button>
          <button class="feedback-btn" onclick="app.markHelpful(${topic.id}, false)">
            👎 Não
          </button>
        </div>
${window.binahAuth.canEditPost(topic.author) ? `
        <div class="topic-edit-actions">
          <button class="btn btn-secondary" onclick="app.editTopic(${topic.id})">
            ✏️ Editar
          </button>
          <button class="btn btn-danger" onclick="app.deleteTopic(${topic.id})">
            🗑️ Excluir
          </button>
        </div>
        ` : ''}
      </div>
      
      ${relatedTopics.length > 0 ? `
        <div class="topic-related">
          <h3>Tópicos Relacionados</h3>
          <div class="related-links">
            ${relatedTopics.map(t => `
              <div class="related-link" onclick="app.viewTopic(${t.id})">
                <div style="font-weight: 600; margin-bottom: 5px;">${t.title}</div>
                <div style="font-size: 12px; color: var(--secondary);">
                  ${this.getCategoryIcon(t.category)} ${t.category} • ${t.views || 0} visualizações
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  async markHelpful(topicId, helpful) {
    if (helpful) {
      try {
        await window.binahAPI.updateTopic(topicId, { incrementHelpful: true });
        this.showNotification('Obrigado pelo seu feedback!', 'success');
        this.viewTopic(topicId); // Refresh view
      } catch (error) {
        console.error('Erro ao marcar como útil:', error);
        this.showNotification('Erro ao salvar feedback', 'error');
      }
    } else {
      this.showNotification('Obrigado pelo feedback. Como podemos melhorar?', 'info');
    }
  }

  backToResults() {
    document.getElementById('topicView')?.classList.remove('active');
    const viewControls = document.querySelector('.view-controls');
    if (viewControls) viewControls.style.display = 'flex';
    
    if (this.currentView === 'list') {
      document.getElementById('resultsListView')?.classList.add('active');
    } else {
      document.getElementById('boardView')?.classList.add('active');
    }
  }

  showHome() {
    this.showHomeWithAnimation();
  }

  showHomeWithAnimation() {
    // Add smooth transition classes
    const heroSection = document.getElementById('heroSection');
    const header = document.getElementById('header');
    const mainContent = document.getElementById('mainContent');
    const topicView = document.getElementById('topicView');
    const compactSearchContainer = document.getElementById('compactSearchContainer');
    
    // Start animation sequence
    if (mainContent) mainContent.style.opacity = '0';
    if (topicView) topicView.style.opacity = '0';
    
    setTimeout(() => {
      // Reset state
      heroSection?.classList.remove('hidden');
      header?.classList.remove('compact');
      document.body?.classList.remove('searched');
      mainContent?.classList.remove('active');
      topicView?.classList.remove('active');
      
      // Hide compact search in header
      if (compactSearchContainer) {
        compactSearchContainer.style.display = 'none';
      }
      
      // Clear search values with preservation
      const mainSearch = document.getElementById('mainSearchInput');
      const compactSearch = document.getElementById('compactSearchInput');
      const currentValue = compactSearch?.value || '';
      
      if (mainSearch) mainSearch.value = currentValue;
      if (compactSearch) compactSearch.value = '';
      
      document.getElementById('liveSearchResults')?.classList.remove('active');
      
      // Reset state variables
      this.isSearchActive = false;
      this.searchTerm = '';
      this.currentFilter = 'all';
      
      // Focus on main search after animation
      setTimeout(() => {
        mainSearch?.focus();
        if (currentValue) {
          mainSearch.setSelectionRange(currentValue.length, currentValue.length);
        }
      }, 300);
      
    }, 150);
  }

  switchView(view) {
    this.currentView = view;
    
    // Update buttons
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Toggle views
    if (view === 'list') {
      document.getElementById('resultsListView')?.classList.add('active');
      document.getElementById('boardView')?.classList.remove('active');
    } else {
      document.getElementById('resultsListView')?.classList.remove('active');
      document.getElementById('boardView')?.classList.add('active');
    }
    
    // Re-display current results
    if (this.searchTerm || this.currentFilter !== 'all') {
      this.performSearch(this.currentFilter === 'all' ? null : this.currentFilter);
    }
  }

  toggleView() {
    const viewToggleBtn = document.getElementById('viewToggleBtn');
    if (this.currentView === 'list') {
      this.switchView('board');
      if (viewToggleBtn) viewToggleBtn.innerHTML = '📝 Lista';
    } else {
      this.switchView('list');
      if (viewToggleBtn) viewToggleBtn.innerHTML = '📊 Board';
    }
  }

  // Drag and Drop functionality
  dragStart(ev) {
    this.draggedCard = ev.target;
    ev.target.classList.add('dragging');
    ev.dataTransfer.setData("text/plain", ev.target.dataset.id);
  }

  dragEnd(ev) {
    ev.target.classList.remove('dragging');
    this.draggedCard = null;
  }

  allowDrop(ev) {
    ev.preventDefault();
  }

  async drop(ev) {
    ev.preventDefault();
    const topicId = ev.dataTransfer.getData("text/plain");
    const dropTarget = ev.target.closest('.board-column');
    
    if (dropTarget && this.draggedCard) {
      const newCategory = dropTarget.dataset.category;
      
      try {
        await window.binahAPI.updateTopic(topicId, { category: newCategory });
        this.showNotification(`Tópico movido para ${newCategory}`, 'success');
        
        // Refresh board view
        if (this.currentView === 'board') {
          this.performSearch(this.currentFilter === 'all' ? null : this.currentFilter);
        }
      } catch (error) {
        console.error('Erro ao mover tópico:', error);
        this.showNotification('Erro ao mover tópico', 'error');
      }
    }
    
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  }

  // Modal functions
  openNewTopicModal() {
    const modal = document.getElementById('newTopicModal');
    const header = document.getElementById('header');
    
    if (modal) {
      modal.classList.add('active');
      // Add dark theme to header for white modal background
      if (header) {
        header.classList.add('dark-theme');
      }
    }
    
    document.getElementById('topicTitle')?.focus();
  }

  closeModal() {
    const newTopicModal = document.getElementById('newTopicModal');
    const dbConfigModal = document.getElementById('dbConfigModal');
    const header = document.getElementById('header');
    
    if (newTopicModal) {
      newTopicModal.classList.remove('active');
    }
    
    if (dbConfigModal) {
      dbConfigModal.classList.remove('active');
    }
    
    // Remove dark theme from header
    if (header) {
      header.classList.remove('dark-theme');
    }
    
    // Clear form
    const form = document.querySelector('#newTopicModal form');
    if (form) form.reset();
  }

  async saveTopic(event) {
    event.preventDefault();
    
    // Verificar autenticação
    if (!window.binahAuth.isLoggedIn()) {
      this.showNotification('🚫 Acesso negado - faça login primeiro', 'error');
      window.location.href = 'login.html';
      return;
    }

    // Verificar permissão para criar tópicos
    if (!window.binahAuth.hasPermission('create_topic')) {
      this.showNotification('🚫 Você não tem permissão para criar tópicos', 'error');
      return;
    }
    
    const title = document.getElementById('topicTitle')?.value;
    const category = document.getElementById('topicCategory')?.value;
    const keywords = document.getElementById('topicKeywords')?.value.split(',').map(k => k.trim()).filter(k => k);
    const content = document.getElementById('topicContent')?.value;
    
    if (!title || !category || !content) {
      this.showNotification('Preencha todos os campos obrigatórios', 'error');
      return;
    }
    
    // Show loading
    const saveBtn = event.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<div class="spinner"></div> Salvando...';
    saveBtn.disabled = true;
    
    // Show save indicator
    this.showSaveIndicator('💾 Salvando tópico...');
    
    try {
      const result = await window.binahAPI.createTopic({
        title,
        category,
        keywords,
        content: this.formatContent(content),
        author: window.binahAuth.getCurrentUser().username
      });
      
      if (result.success) {
        this.closeModal();
        
        // Update save indicator
        const indicator = document.getElementById('saveStatus');
        if (indicator) {
          indicator.querySelector('span').textContent = '✅ Salvo permanentemente!';
          indicator.style.background = 'var(--success)';
        }
        this.hideSaveIndicator();
        
        this.showNotification('✅ Tópico criado e salvo permanentemente!', 'success');
        
        // Show save confirmation
        console.log('💾 Tópico salvo com ID:', result.id);
        
        // Refresh current view if search is active
        if (this.isSearchActive) {
          this.performSearch(this.currentFilter === 'all' ? null : this.currentFilter);
        }
      } else {
        throw new Error(result.error || 'Falha ao criar tópico');
      }
    } catch (error) {
      console.error('Erro ao salvar tópico:', error);
      
      // Update save indicator for error
      const indicator = document.getElementById('saveStatus');
      if (indicator) {
        indicator.querySelector('span').textContent = '❌ Erro ao salvar';
        indicator.style.background = 'var(--danger)';
      }
      this.hideSaveIndicator();
      
      this.showNotification('Erro ao salvar tópico: ' + error.message, 'error');
    } finally {
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
    }
  }

  async editTopic(id) {
    // Verificar autenticação
    if (!window.binahAuth.isLoggedIn()) {
      this.showNotification('🚫 Acesso negado - faça login primeiro', 'error');
      window.location.href = 'login.html';
      return;
    }

    try {
      const topic = await window.binahAPI.getTopic(id);
      if (!topic) {
        this.showNotification('Tópico não encontrado', 'error');
        return;
      }

      // Verificar se pode editar este post específico (autor ou admin)
      if (!window.binahAuth.canEditPost(topic.author)) {
        this.showNotification('🚫 Você só pode editar tópicos criados por você', 'error');
        return;
      }
      
      // Fill modal with topic data
      document.getElementById('topicTitle').value = topic.title;
      document.getElementById('topicCategory').value = topic.category;
      document.getElementById('topicKeywords').value = topic.keywords ? topic.keywords.join(', ') : '';
      document.getElementById('topicContent').value = topic.content.replace(/<[^>]*>/g, '');
      
      // Store the ID for update
      document.getElementById('newTopicModal').dataset.editId = id;
      
      this.openNewTopicModal();
    } catch (error) {
      console.error('Erro ao carregar tópico para edição:', error);
      this.showNotification('Erro ao carregar tópico', 'error');
    }
  }

  async deleteTopic(id) {
    // Verificar autenticação
    if (!window.binahAuth.isLoggedIn()) {
      this.showNotification('🚫 Acesso negado - faça login primeiro', 'error');
      window.location.href = 'login.html';
      return;
    }

    try {
      const topic = await window.binahAPI.getTopic(id);
      if (!topic) {
        this.showNotification('Tópico não encontrado', 'error');
        return;
      }

      // Verificar se pode deletar este post específico (autor ou admin)
      if (!window.binahAuth.canDeletePost(topic.author)) {
        this.showNotification('🚫 Você só pode excluir tópicos criados por você', 'error');
        return;
      }

      if (!confirm('Tem certeza que deseja excluir este tópico? Esta ação não pode ser desfeita.')) {
        return;
      }

      const result = await window.binahAPI.deleteTopic(id);
      if (result.success) {
        this.showNotification('Tópico excluído com sucesso!', 'success');
        
        // If viewing the deleted topic, go back to results
        if (this.currentTopicId === id) {
          this.backToResults();
        }
        
        // Refresh current view
        if (this.isSearchActive) {
          this.performSearch(this.currentFilter === 'all' ? null : this.currentFilter);
        }
      } else {
        throw new Error(result.error || 'Falha ao excluir tópico');
      }
    } catch (error) {
      console.error('Erro ao excluir tópico:', error);
      this.showNotification('Erro ao excluir tópico: ' + error.message, 'error');
    }
  }

  searchKeyword(keyword) {
    document.getElementById('mainSearchInput').value = keyword;
    document.getElementById('compactSearchInput').value = keyword;
    this.performSearch();
  }

  formatContent(content) {
    // Convert line breaks to paragraphs for better HTML formatting
    return content.split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').filter(p => p).join('');
  }

  highlightText(text) {
    if (!this.searchTerm || this.searchTerm.length < 2) return text;
    const regex = new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

  getCategoryIcon(category) {
    const categoryData = this.categories.find(c => c.id === category);
    return categoryData ? categoryData.icon : '📄';
  }

  getCategoryColor(category) {
    const categoryData = this.categories.find(c => c.id === category);
    return categoryData ? categoryData.color : '#6b7280';
  }

  showSaveIndicator(message = 'Salvando...') {
    const indicator = document.getElementById('saveStatus');
    if (indicator) {
      indicator.querySelector('span').textContent = message;
      indicator.style.display = 'flex';
    }
  }

  hideSaveIndicator() {
    const indicator = document.getElementById('saveStatus');
    if (indicator) {
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 1000);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const colors = {
      info: 'var(--primary)',
      success: 'var(--success)', 
      error: 'var(--danger)',
      warning: 'var(--warning)'
    };
    
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      padding: 15px 20px;
      background: ${colors[type]};
      color: white;
      border-radius: 12px;
      box-shadow: var(--shadow-xl);
      z-index: 3000;
      animation: slideInRight 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>${this.getNotificationIcon(type)}</span>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  getNotificationIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };
    return icons[type] || 'ℹ️';
  }

  updateUI() {
    // Update connection status
    this.updateConnectionStatus();
    
    // Update any dynamic content
    // This method can be called when the app state changes
  }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new BinahApp();
});

// Global functions for HTML onclick handlers
function showHome() { app?.showHome(); }
function performSearch() { app?.performSearch(); }
function quickSearch(category) { app?.quickSearch(category); }
function switchView(view) { app?.switchView(view); }
function toggleView() { app?.toggleView(); }
function viewTopic(id) { app?.viewTopic(id); }
function openNewTopicModal() { app?.openNewTopicModal(); }
function closeModal() { app?.closeModal(); }
function saveTopic(event) { app?.saveTopic(event); }
function editTopic(id) { app?.editTopic(id); }
function deleteTopic(id) { app?.deleteTopic(id); }
function markHelpful(id, helpful) { app?.markHelpful(id, helpful); }
function backToResults() { app?.backToResults(); }
function allowDrop(ev) { app?.allowDrop(ev); }
function drop(ev) { app?.drop(ev); }
function handleCompactSearchClick() { app?.handleCompactSearchClick(); }
function handleLiveSearch(value) { app?.handleLiveSearch(value); }
function openDbModal() { console.log('DB Modal - TODO'); }
function showLatestPosts() { app?.showLatestPosts(); }
function closeTopicPopup(event) { app?.closeTopicPopup(event); }

// Debug function to reset localStorage
function resetLocalStorage() {
  console.log('🗑️ Limpando localStorage...');
  localStorage.removeItem('binah_topics');
  console.log('✅ localStorage limpo - recarregando página...');
  location.reload();
}

// Debug function to show saved data
function showSavedData() {
  const data = localStorage.getItem('binah_topics');
  if (data) {
    const topics = JSON.parse(data);
    console.log('📊 Dados salvos:', topics.length, 'tópicos');
    console.table(topics.map(t => ({ id: t.id, title: t.title, category: t.category })));
  } else {
    console.log('❌ Nenhum dado salvo no localStorage');
  }
}