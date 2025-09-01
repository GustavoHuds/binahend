// Main initialization and authentication logic for BINAH
document.addEventListener('DOMContentLoaded', () => {
    // Only run auth check on main page, not login page
    if (!window.location.pathname.includes('login.html')) {
        initializeAuthenticatedApp();
    }
    
    // Initialize modal functionality
    initializeModalSystem();
});

function initializeAuthenticatedApp() {
    // Check authentication before loading the application
    if (!window.binahAuth.isLoggedIn()) {
        console.log('🚫 User not authenticated - redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    console.log('✅ User authenticated:', window.binahAuth.getCurrentUser().username);
    
    // Show admin buttons if necessary
    const currentUser = window.binahAuth.getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
        const newTopicBtn = document.getElementById('newTopicBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');
        if (newTopicBtn) newTopicBtn.style.display = 'block';
        if (dashboardBtn) dashboardBtn.style.display = 'block';
        console.log('🔑 Admin permissions activated');
    } else {
        console.log('👤 Regular user - read-only access');
        
        // Add read-only notice for non-admin users  
        setTimeout(() => {
            showReadOnlyNotice();
        }, 1000);
    }
    
    // Add user information to header
    addUserInfoToHeader(currentUser);

    // Start session monitoring
    startSessionMonitoring();
}

function addUserInfoToHeader(currentUser) {
    if (!currentUser) return;
    
    const userInfo = document.createElement('div');
    userInfo.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: rgba(255,255,255,0.8);
    `;
    
    userInfo.innerHTML = `
        <span>👤 ${currentUser.username} ${currentUser.role === 'admin' ? '(Admin)' : '(Usuário)'}</span>
        <button onclick="logout()" style="
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s;
        " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
            🚪 Sair
        </button>
    `;
    
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
        statusBar.appendChild(userInfo);
    }
}

function showReadOnlyNotice() {
    const readOnlyNotice = document.createElement('div');
    readOnlyNotice.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: rgba(245, 158, 11, 0.9);
        color: white;
        padding: 12px 16px;
        border-radius: 10px;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideInRight 0.5s ease;
    `;
    readOnlyNotice.innerHTML = '📖 Modo somente leitura - Apenas admins podem criar/editar tópicos';
    document.body.appendChild(readOnlyNotice);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        readOnlyNotice.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => readOnlyNotice.remove(), 300);
    }, 5000);
}

function startSessionMonitoring() {
    // Continuous security monitoring
    setInterval(() => {
        if (!window.binahAuth.isLoggedIn()) {
            console.warn('🚨 Session expired - redirecting to login');
            window.location.href = 'login.html';
        }
    }, 30000); // Check every 30 seconds

    // Protection against session manipulation
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        if (!window.binahAuth.isLoggedIn()) {
            console.error('🚫 Access denied - user not authenticated');
            window.location.href = 'login.html';
            return Promise.reject('Unauthorized');
        }
        
        // Add auth token to requests if available
        const token = window.binahAuth.getAuthToken?.();
        if (token && args[1]) {
            args[1].headers = {
                ...args[1].headers,
                'Authorization': `Bearer ${token}`
            };
        }
        
        return originalFetch.apply(this, arguments);
    };
}

// Global logout function
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        window.binahAuth.logout();
        window.location.href = 'login.html';
    }
}

// Modal system functionality
function initializeModalSystem() {
    // Check if we need to create a topic modal for the legacy system
    if (!document.getElementById('topicModalLegacy')) {
        createLegacyTopicModal();
    }
    
    // Initialize topic link handlers
    document.querySelectorAll(".topic-link").forEach(el => {
        el.addEventListener("click", function(e) {
            e.preventDefault();
            let content = document.querySelector(this.getAttribute("href"));
            if(content){
                const modal = document.getElementById("topicModalLegacy");
                const modalContent = document.getElementById("modalContentLegacy");
                if (modal && modalContent) {
                    modalContent.innerHTML = content.innerHTML;
                    modal.style.display = "flex";
                }
            }
        });
    });
}

function createLegacyTopicModal() {
    // Create modal for legacy topic display
    const modal = document.createElement('div');
    modal.id = 'topicModalLegacy';
    modal.className = 'modal';
    modal.style.cssText = `
        display: none; 
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        background: rgba(0,0,0,0.6); 
        z-index: 9999; 
        justify-content: center; 
        align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background:#fff; padding:20px; max-width:800px; width:90%; max-height:90%; overflow:auto; border-radius:10px; position:relative;">
            <span id="closeModalLegacy" style="position:absolute; top:10px; right:15px; cursor:pointer; font-size:22px;">&times;</span>
            <div id="modalContentLegacy"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add close functionality
    document.getElementById("closeModalLegacy").addEventListener("click", function(){
        document.getElementById("topicModalLegacy").style.display = "none";
    });
    
    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}

// Additional CSS animations for notifications
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes slideInRight {
        from { 
            opacity: 0; 
            transform: translateX(100px); 
        }
        to { 
            opacity: 1; 
            transform: translateX(0); 
        }
    }
    
    @keyframes fadeOut {
        from { 
            opacity: 1; 
            transform: translateY(0); 
        }
        to { 
            opacity: 0; 
            transform: translateY(-20px); 
        }
    }
`;
document.head.appendChild(additionalStyles);