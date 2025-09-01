// API Configuration and Integration for BINAH
class BinahAPI {
  constructor(baseUrl = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
    this.connected = false;
    this.localStorageKey = 'binah_topics';
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      this.connected = data.ok;
      return this.connected;
    } catch (error) {
      console.warn('API não disponível, usando modo local:', error.message);
      this.connected = false;
      return false;
    }
  }

  async initDatabase() {
    try {
      const response = await fetch(`${this.baseUrl}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao inicializar banco:', error);
      return { success: false, error: error.message };
    }
  }

  async getTopics(options = {}) {
    try {
      if (this.connected) {
        const params = new URLSearchParams();
        if (options.search) params.append('search', options.search);
        if (options.category) params.append('category', options.category);
        if (options.limit) params.append('limit', options.limit);

        const response = await fetch(`${this.baseUrl}/topics?${params}`, {
          timeout: 5000
        });
        if (!response.ok) {
          console.warn(`API retornou ${response.status}, usando localStorage`);
          throw new Error(`API Error: ${response.status}`);
        }
        const data = await response.json();
        console.log('🌐 Dados da API:', data.length, 'tópicos');
        return data;
      } else {
        return this.getTopicsFromLocalStorage(options);
      }
    } catch (error) {
      console.warn('API falhou, usando modo offline:', error.message);
      this.connected = false; // Desabilita tentativas futuras
      return this.getTopicsFromLocalStorage(options);
    }
  }

  async getTopic(id) {
    try {
      if (this.connected) {
        const response = await fetch(`${this.baseUrl}/topics/${id}`, {
          timeout: 5000
        });
        if (!response.ok) {
          console.warn(`API getTopic falhou (${response.status}), usando localStorage`);
          throw new Error(`API Error: ${response.status}`);
        }
        return await response.json();
      } else {
        const topics = this.getTopicsFromLocalStorage();
        return topics.find(t => t.id == id);
      }
    } catch (error) {
      console.warn('getTopic API falhou, usando modo offline:', error.message);
      this.connected = false; // Desabilita tentativas futuras
      const topics = this.getTopicsFromLocalStorage();
      return topics.find(t => t.id == id);
    }
  }

  async createTopic(topic) {
    try {
      if (this.connected) {
        const response = await fetch(`${this.baseUrl}/topics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(topic)
        });
        
        if (!response.ok) throw new Error('Falha ao criar tópico');
        const result = await response.json();
        
        // Sync with local storage
        const topics = this.getTopicsFromLocalStorage();
        const newTopic = { ...topic, id: result.id, date: new Date().toISOString().split('T')[0] };
        topics.unshift(newTopic);
        this.saveToLocalStorage(topics);
        
        return result;
      } else {
        return this.createTopicInLocalStorage(topic);
      }
    } catch (error) {
      console.error('Erro ao criar tópico:', error);
      return this.createTopicInLocalStorage(topic);
    }
  }

  async updateTopic(id, updates) {
    try {
      if (this.connected) {
        const response = await fetch(`${this.baseUrl}/topics/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
        
        if (!response.ok) throw new Error('Falha ao atualizar tópico');
        const result = await response.json();
        
        // Sync with local storage
        const topics = this.getTopicsFromLocalStorage();
        const index = topics.findIndex(t => t.id == id);
        if (index !== -1) {
          if (updates.incrementView) {
            topics[index].views = (topics[index].views || 0) + 1;
          } else if (updates.incrementHelpful) {
            topics[index].helpful = (topics[index].helpful || 0) + 1;
          } else {
            topics[index] = { ...topics[index], ...updates };
          }
          this.saveToLocalStorage(topics);
        }
        
        return result;
      } else {
        return this.updateTopicInLocalStorage(id, updates);
      }
    } catch (error) {
      console.error('Erro ao atualizar tópico:', error);
      return this.updateTopicInLocalStorage(id, updates);
    }
  }

  async deleteTopic(id) {
    try {
      if (this.connected) {
        const response = await fetch(`${this.baseUrl}/topics/${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Falha ao deletar tópico');
        const result = await response.json();
        
        // Sync with local storage
        const topics = this.getTopicsFromLocalStorage();
        const filtered = topics.filter(t => t.id != id);
        this.saveToLocalStorage(filtered);
        
        return result;
      } else {
        return this.deleteTopicFromLocalStorage(id);
      }
    } catch (error) {
      console.error('Erro ao deletar tópico:', error);
      return this.deleteTopicFromLocalStorage(id);
    }
  }

  async getCategoryStats() {
    try {
      if (this.connected) {
        const response = await fetch(`${this.baseUrl}/stats/categories`);
        if (!response.ok) throw new Error('Falha ao buscar estatísticas');
        return await response.json();
      } else {
        return this.getCategoryStatsFromLocalStorage();
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return this.getCategoryStatsFromLocalStorage();
    }
  }

  // Local Storage Methods
  getTopicsFromLocalStorage(options = {}) {
    // Verificar se existem dados salvos
    const stored = localStorage.getItem(this.localStorageKey);
    let topics = [];
    
    if (stored) {
      try {
        topics = JSON.parse(stored);
        console.log('📂 Carregando tópicos salvos do localStorage:', topics.length);
      } catch (error) {
        console.error('❌ Erro ao parsear localStorage:', error);
        topics = this.getDefaultTopics();
      }
    } else {
      // Se não há dados salvos, usar tópicos padrão e salvar
      topics = this.getDefaultTopics();
      this.saveToLocalStorage(topics);
      console.log('🔄 Primeira execução - salvando tópicos padrão');
    }
    
    console.log('📂 Total de tópicos carregados:', topics.length);
    console.log('📋 Categorias disponíveis:', [...new Set(topics.map(t => t.category))]);
    
    // Apply filters without modifying original array
    let filteredTopics = [...topics];
    
    if (options.search) {
      const search = options.search.toLowerCase().trim();
      console.log('🔍 Buscando por:', search);
      filteredTopics = filteredTopics.filter(topic => {
        const titleMatch = topic.title.toLowerCase().includes(search);
        const contentMatch = topic.content.toLowerCase().includes(search);
        const categoryMatch = topic.category.toLowerCase().includes(search);
        const keywordMatch = topic.keywords && topic.keywords.some(k => 
          k.toLowerCase().includes(search)
        );
        return titleMatch || contentMatch || categoryMatch || keywordMatch;
      });
      console.log('🎯 Resultados da busca por texto:', filteredTopics.length);
    }
    
    if (options.category && options.category !== 'all') {
      console.log('🔍 Filtrando por categoria:', options.category);
      console.log('📂 Tópicos antes do filtro:', filteredTopics.length);
      const beforeFilter = filteredTopics.length;
      filteredTopics = filteredTopics.filter(topic => {
        console.log(`Comparando: "${topic.category}" === "${options.category}"`, topic.category === options.category);
        return topic.category === options.category;
      });
      console.log('✅ Tópicos após filtro por categoria:', filteredTopics.length);
      if (beforeFilter > 0 && filteredTopics.length === 0) {
        console.warn('⚠️ Nenhum tópico encontrado para categoria:', options.category);
      }
    }
    
    if (options.limit) {
      filteredTopics = filteredTopics.slice(0, parseInt(options.limit));
    }
    
    return filteredTopics;
  }

  createTopicInLocalStorage(topic) {
    // Carregar TODOS os tópicos existentes (salvos + padrão)
    const allTopics = this.getTopicsFromLocalStorage();
    const newId = Math.max(...allTopics.map(t => t.id), 0) + 1;
    
    const newTopic = {
      ...topic,
      id: newId,
      date: new Date().toISOString().split('T')[0],
      views: 0,
      helpful: 0,
      preview: topic.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...'
    };
    
    // Adicionar o novo tópico no início da lista
    allTopics.unshift(newTopic);
    
    // Salvar TODA a lista atualizada
    this.saveToLocalStorage(allTopics);
    
    console.log('✅ Novo tópico criado com ID:', newId);
    console.log('📊 Total de tópicos após criação:', allTopics.length);
    
    return { success: true, id: newId };
  }

  updateTopicInLocalStorage(id, updates) {
    const topics = this.getTopicsFromLocalStorage();
    const index = topics.findIndex(t => t.id == id);
    
    if (index === -1) {
      return { success: false, error: 'Tópico não encontrado' };
    }
    
    if (updates.incrementView) {
      topics[index].views = (topics[index].views || 0) + 1;
    } else if (updates.incrementHelpful) {
      topics[index].helpful = (topics[index].helpful || 0) + 1;
    } else {
      topics[index] = { ...topics[index], ...updates };
      if (updates.content) {
        topics[index].preview = updates.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';
      }
    }
    
    this.saveToLocalStorage(topics);
    return { success: true };
  }

  deleteTopicFromLocalStorage(id) {
    const topics = this.getTopicsFromLocalStorage();
    const filtered = topics.filter(t => t.id != id);
    this.saveToLocalStorage(filtered);
    return { success: true };
  }

  getCategoryStatsFromLocalStorage() {
    const topics = this.getTopicsFromLocalStorage();
    const stats = {};
    
    topics.forEach(topic => {
      stats[topic.category] = (stats[topic.category] || 0) + 1;
    });
    
    return Object.entries(stats).map(([category, count]) => ({ category, count }));
  }

  saveToLocalStorage(topics) {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(topics));
      console.log('✅ Tópicos salvos no localStorage:', topics.length, 'items');
      console.log('📋 Categorias salvas:', [...new Set(topics.map(t => t.category))]);
    } catch (error) {
      console.error('❌ Erro ao salvar no localStorage:', error);
    }
  }

  getDefaultTopics() {
    return [
      {
        id: 1,
        title: "Como Configurar uma Nova Dosadora Automática",
        category: "Dosadoras",
        keywords: ["dosadora", "configuração", "automática", "calibração", "sensores", "parâmetros", "dosagem", "volume"],
        preview: "Guia completo para configuração inicial de dosadoras automáticas, incluindo calibração de sensores e configuração de parâmetros...",
        content: `
          <h3>Configuração Inicial</h3>
          <p>Para configurar uma nova dosadora automática, siga estes passos:</p>
          <ul>
            <li><strong>Verificação de Componentes:</strong> Confira se todos os sensores estão conectados</li>
            <li><strong>Calibração de Sensores:</strong> Execute o procedimento de calibração automática</li>
            <li><strong>Configuração de Parâmetros:</strong> Defina os valores de dosagem conforme especificação</li>
            <li><strong>Teste de Funcionamento:</strong> Execute um ciclo de teste completo</li>
          </ul>
          
          <h3>Parâmetros Importantes</h3>
          <ul>
            <li>Volume de dosagem: 50ml a 500ml</li>
            <li>Precisão: ±2%</li>
            <li>Tempo de ciclo: 30-180 segundos</li>
          </ul>
          
          <h3>Solução de Problemas</h3>
          <p>Se a dosadora não responder, verifique:</p>
          <ul>
            <li>Conexões elétricas</li>
            <li>Pressão de ar comprimido (mín. 6 bar)</li>
            <li>Calibração dos sensores</li>
          </ul>
        `,
        author: "João Silva",
        date: "2024-01-15",
        views: 45,
        helpful: 12
      },
      {
        id: 2,
        title: "Erro E001: Falha na Comunicação com Sensor",
        category: "Erros",
        keywords: ["erro", "E001", "sensor", "comunicação", "troubleshooting", "falha", "conexão", "cabo", "reset"],
        preview: "Solução para o erro E001 que indica falha na comunicação com sensores do sistema...",
        content: `
          <h3>Descrição do Erro</h3>
          <p>O erro E001 indica que o sistema não consegue se comunicar com um ou mais sensores.</p>
          
          <h3>Possíveis Causas</h3>
          <ul>
            <li>Cabo de comunicação desconectado</li>
            <li>Sensor com defeito</li>
            <li>Interferência eletromagnética</li>
            <li>Configuração incorreta de endereço</li>
          </ul>
          
          <h3>Solução Passo a Passo</h3>
          <ol>
            <li><strong>Verificar Conexões:</strong> Confira todos os cabos de comunicação</li>
            <li><strong>Reiniciar Sistema:</strong> Execute um reset completo do sistema</li>
            <li><strong>Verificar Endereços:</strong> Confirme se os endereços dos sensores estão corretos</li>
            <li><strong>Testar Sensores:</strong> Execute teste individual de cada sensor</li>
            <li><strong>Substituir se Necessário:</strong> Troque sensores defeituosos</li>
          </ol>
          
          <h3>Prevenção</h3>
          <p>Para evitar este erro:</p>
          <ul>
            <li>Mantenha cabos protegidos de interferências</li>
            <li>Execute manutenção preventiva mensalmente</li>
            <li>Monitore a integridade das conexões</li>
          </ul>
        `,
        author: "Maria Santos",
        date: "2024-01-10",
        views: 78,
        helpful: 25
      },
      {
        id: 3,
        title: "Manutenção Preventiva Semanal - Checklist Completo",
        category: "Manutenção",
        keywords: ["manutenção", "preventiva", "checklist", "semanal", "inspeção"],
        preview: "Lista completa de verificações para manutenção preventiva semanal do sistema de dosagem...",
        content: `
          <h3>Checklist de Manutenção Semanal</h3>
          
          <h3>Inspeção Visual</h3>
          <ul>
            <li>☐ Verificar vazamentos em conexões</li>
            <li>☐ Inspecionar estado dos cabos elétricos</li>
            <li>☐ Verificar fixação de componentes</li>
            <li>☐ Limpar painéis e displays</li>
          </ul>
          
          <h3>Testes Funcionais</h3>
          <ul>
            <li>☐ Testar todas as válvulas</li>
            <li>☐ Verificar precisão das dosagens</li>
            <li>☐ Testar sistemas de emergência</li>
            <li>☐ Validar alarmes e indicadores</li>
          </ul>
          
          <h3>Limpeza e Lubrificação</h3>
          <ul>
            <li>☐ Limpar filtros de ar</li>
            <li>☐ Lubrificar pontos de articulação</li>
            <li>☐ Limpar sensores</li>
            <li>☐ Drenar condensado do sistema pneumático</li>
          </ul>
          
          <h3>Registros</h3>
          <p>Documentar todos os itens verificados e anotar observações relevantes no livro de manutenção.</p>
          
          <h3>Frequência de Itens Específicos</h3>
          <ul>
            <li><strong>Diário:</strong> Verificação visual geral</li>
            <li><strong>Semanal:</strong> Checklist completo acima</li>
            <li><strong>Mensal:</strong> Calibração de precisão</li>
            <li><strong>Trimestral:</strong> Manutenção preventiva completa</li>
          </ul>
        `,
        author: "Carlos Oliveira",
        date: "2024-01-08",
        views: 92,
        helpful: 31
      },
      {
        id: 4,
        title: "Calibração da Máquina de Corte CNC",
        category: "Máquinas",
        keywords: ["máquina", "CNC", "corte", "calibração", "precisão"],
        preview: "Procedimento completo para calibração de máquinas CNC de corte para garantir máxima precisão...",
        content: `
          <h3>Preparação</h3>
          <p>Antes de iniciar a calibração:</p>
          <ul>
            <li>Desligue a máquina completamente</li>
            <li>Verifique se a área está limpa</li>
            <li>Tenha as ferramentas necessárias em mãos</li>
          </ul>
          
          <h3>Processo de Calibração</h3>
          <ol>
            <li>Ligue a máquina e acesse o menu de calibração</li>
            <li>Execute o auto-nivelamento</li>
            <li>Calibre os eixos X, Y e Z</li>
            <li>Teste com um corte de exemplo</li>
          </ol>
        `,
        author: "Ana Costa",
        date: "2024-01-12",
        views: 67,
        helpful: 18
      },
      {
        id: 5,
        title: "Procedimento de Segurança na Operação",
        category: "Procedimentos",
        keywords: ["segurança", "operação", "EPI", "procedimento", "normas"],
        preview: "Normas e procedimentos essenciais de segurança para operação de equipamentos industriais...",
        content: `
          <h3>EPIs Obrigatórios</h3>
          <ul>
            <li>Capacete de segurança</li>
            <li>Óculos de proteção</li>
            <li>Luvas adequadas ao tipo de trabalho</li>
            <li>Calçado de segurança</li>
          </ul>
          
          <h3>Antes de Operar</h3>
          <ol>
            <li>Verifique se todos os EPIs estão em bom estado</li>
            <li>Inspecione o equipamento</li>
            <li>Confirme que a área está liberada</li>
            <li>Teste os sistemas de emergência</li>
          </ol>
        `,
        author: "Roberto Santos",
        date: "2024-01-05",
        views: 134,
        helpful: 42
      },
      {
        id: 6,
        title: "Dosadora Modelo X-100 - Manual Completo",
        category: "Dosadoras",
        keywords: ["dosadora", "X-100", "manual", "operação", "especificações", "instalação"],
        preview: "Manual completo de operação da dosadora modelo X-100, incluindo instalação, configuração e solução de problemas...",
        content: `
          <h3>Especificações Técnicas</h3>
          <ul>
            <li>Capacidade: 10-1000ml por dose</li>
            <li>Precisão: ±1%</li>
            <li>Velocidade: até 60 doses/min</li>
            <li>Pressão de trabalho: 6-8 bar</li>
          </ul>
          <h3>Instalação</h3>
          <p>Conecte a linha de ar comprimido e verifique a pressão antes da primeira operação.</p>
        `,
        author: "Tech Team",
        date: "2024-01-20",
        views: 89,
        helpful: 24
      },
      {
        id: 7,
        title: "Erro E002: Sobrecarga do Motor",
        category: "Erros", 
        keywords: ["erro", "E002", "motor", "sobrecarga", "corrente", "proteção", "reset"],
        preview: "Como resolver o erro E002 de sobrecarga do motor principal do sistema...",
        content: `
          <h3>Causa do Problema</h3>
          <p>O erro E002 indica que o motor está consumindo mais corrente que o permitido.</p>
          <h3>Soluções</h3>
          <ol>
            <li>Desligue o equipamento imediatamente</li>
            <li>Verifique se há obstruções mecânicas</li>
            <li>Aguarde 5 minutos para resfriamento</li>
            <li>Reinicie o sistema</li>
          </ol>
        `,
        author: "Suporte Técnico",
        date: "2024-01-18",
        views: 156,
        helpful: 67
      },
      {
        id: 8,
        title: "Manutenção da Linha de Produção",
        category: "Manutenção",
        keywords: ["manutenção", "linha", "produção", "preventiva", "lubrificação", "limpeza"],
        preview: "Rotina completa de manutenção para linhas de produção automatizadas...",
        content: `
          <h3>Manutenção Diária</h3>
          <ul>
            <li>Inspeção visual geral</li>
            <li>Verificação de alarmes</li>
            <li>Limpeza superficial</li>
          </ul>
          <h3>Manutenção Semanal</h3>
          <ul>
            <li>Lubrificação de pontos específicos</li>
            <li>Teste de emergência</li>
            <li>Calibração básica</li>
          </ul>
        `,
        author: "Equipe Manutenção",
        date: "2024-01-14",
        views: 203,
        helpful: 85
      },
      {
        id: 9,
        title: "Operação da Fresadora CNC Modelo F-200",
        category: "Máquinas",
        keywords: ["fresadora", "CNC", "F-200", "operação", "programação", "ferramentas"],
        preview: "Guia de operação para fresadora CNC F-200, incluindo programação básica e troca de ferramentas...",
        content: `
          <h3>Preparação da Máquina</h3>
          <ol>
            <li>Ligue o sistema de refrigeração</li>
            <li>Verifique o nível de óleo</li>
            <li>Instale a ferramenta adequada</li>
            <li>Configure as coordenadas de trabalho</li>
          </ol>
          <h3>Programação Básica</h3>
          <p>Use códigos G padrão para movimentação e usinagem.</p>
        `,
        author: "Operador Sênior",
        date: "2024-01-16",
        views: 78,
        helpful: 34
      },
      {
        id: 10,
        title: "Procedimento de Parada de Emergência",
        category: "Procedimentos",
        keywords: ["emergência", "parada", "segurança", "procedimento", "evacuação", "protocolo"],
        preview: "Protocolo completo para situações de emergência e parada de sistemas industriais...",
        content: `
          <h3>Ações Imediatas</h3>
          <ol>
            <li>Acionar botão de emergência</li>
            <li>Desligar alimentação elétrica</li>
            <li>Evacuar área se necessário</li>
            <li>Comunicar responsáveis</li>
          </ol>
          <h3>Após a Emergência</h3>
          <p>Não reiniciar equipamentos sem autorização do responsável técnico.</p>
        `,
        author: "Segurança do Trabalho",
        date: "2024-01-03",
        views: 298,
        helpful: 156
      }
    ];
  }
}

// Initialize API instance
window.binahAPI = new BinahAPI();

// Auto-check connection on load
document.addEventListener('DOMContentLoaded', async () => {
  // Only reset if no data exists
  const existingData = localStorage.getItem('binah_topics');
  if (!existingData) {
    console.log('🔄 Primeira execução - carregando tópicos padrão...');
  } else {
    console.log('📂 Carregando dados salvos existentes...');
  }
  
  const connected = await window.binahAPI.checkConnection();
  if (connected) {
    await window.binahAPI.initDatabase();
    console.log('✅ BINAH API conectada com sucesso');
  } else {
    console.log('⚠️ BINAH rodando em modo local (offline)');
  }
  
  // Test categories
  console.log('🧪 Testando categorias...');
  const categories = ['Máquinas', 'Dosadoras', 'Manutenção', 'Erros', 'Procedimentos'];
  for (const cat of categories) {
    const results = await window.binahAPI.getTopics({ category: cat });
    console.log(`📊 ${cat}: ${results.length} tópicos`);
  }
});