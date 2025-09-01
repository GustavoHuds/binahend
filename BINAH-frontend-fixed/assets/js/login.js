// Login page functionality for BINAH
document.addEventListener('DOMContentLoaded', () => {
    initializeLoginPage();
});

function initializeLoginPage() {
    // Check if user is already logged in
    if (window.binahAuth && window.binahAuth.isLoggedIn()) {
        showAlert('Você já está logado! Redirecionando...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }

    // Auto-focus first input
    const loginUsername = document.getElementById('loginUsername');
    if (loginUsername) {
        loginUsername.focus();
    }

    // Security monitoring
    console.clear();
    console.log('%c🛡️ Sistema de Segurança BINAH', 'color: #6366f1; font-size: 16px; font-weight: bold;');
    console.log('%cTentativas de manipulação serão registradas e bloqueadas.', 'color: #ef4444;');
    
    // Initialize security measures
    initializeSecurityMeasures();
    
    // Initialize modal system
    initializeLoginModalSystem();
}

// Switch between login and register tabs
function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    // Update forms
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    const targetForm = document.getElementById(tab + 'Form');
    if (targetForm) {
        targetForm.classList.add('active');
    }

    // Clear alerts
    hideAlert();
}

// Show alert message
function showAlert(message, type = 'error') {
    const alert = document.getElementById('alertMessage');
    if (alert) {
        alert.textContent = message;
        alert.className = `alert ${type} show`;

        // Auto hide after 5 seconds
        setTimeout(() => hideAlert(), 5000);
    }
}

// Hide alert message
function hideAlert() {
    const alert = document.getElementById('alertMessage');
    if (alert) {
        alert.classList.remove('show');
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const button = document.getElementById('loginButton');
    const username = document.getElementById('loginUsername')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    if (!username || !password) {
        showAlert('Por favor, preencha todos os campos', 'error');
        return;
    }

    // Show loading state
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
    }
    hideAlert();

    try {
        const result = await window.binahAuth.login(username, password, rememberMe);
        
        if (result.success) {
            showAlert('Login realizado com sucesso! Redirecionando...', 'success');
            
            // Redirect after success
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showAlert(result.message || 'Erro ao fazer login', 'error');
        }
    } catch (error) {
        showAlert('Erro interno do sistema. Tente novamente.', 'error');
        console.error('Login error:', error);
    } finally {
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

// Handle register form submission
async function handleRegister(event) {
    event.preventDefault();
    
    const button = document.getElementById('registerButton');
    const username = document.getElementById('registerUsername')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;

    if (!username || !password || !confirmPassword) {
        showAlert('Por favor, preencha todos os campos', 'error');
        return;
    }

    // Show loading state
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
    }
    hideAlert();

    try {
        const result = await window.binahAuth.register(username, password, confirmPassword);
        
        if (result.success) {
            showAlert('Conta criada com sucesso! Faça login para continuar.', 'success');
            
            // Switch to login tab after success
            setTimeout(() => {
                switchToLoginTab(username);
            }, 2000);
        } else {
            showAlert(result.message || 'Erro ao criar conta', 'error');
        }
    } catch (error) {
        showAlert('Erro interno do sistema. Tente novamente.', 'error');
        console.error('Register error:', error);
    } finally {
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

function switchToLoginTab(username = '') {
    // Switch to login tab
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    const loginTab = document.querySelector('.auth-tab[onclick*="login"]');
    const loginForm = document.getElementById('loginForm');
    
    if (loginTab) loginTab.classList.add('active');
    if (loginForm) loginForm.classList.add('active');
    
    // Pre-fill username if provided
    const loginUsername = document.getElementById('loginUsername');
    if (loginUsername && username) {
        loginUsername.value = username;
    }
    
    // Reset register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.reset();
    }
}

function initializeSecurityMeasures() {
    // Disable right-click context menu
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    // Disable common developer shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C') ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
            console.clear();
            console.warn('🚨 Acesso negado - Sistema protegido');
            return false;
        }
    });

    // Monitor for bypass attempts
    const originalLog = console.log;
    console.log = function(...args) {
        if (args.some(arg => typeof arg === 'string' && 
            (arg.includes('bypass') || arg.includes('hack') || arg.includes('inject')))) {
            console.warn('🚨 Tentativa de bypass detectada');
            return;
        }
        originalLog.apply(console, arguments);
    };
}

function initializeLoginModalSystem() {
    // Initialize modal system for login page
    const modal = document.getElementById('topicModal');
    if (modal) {
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }
        
        // Initialize topic links
        document.querySelectorAll(".topic-link").forEach(el => {
            el.addEventListener("click", function(e) {
                e.preventDefault();
                let content = document.querySelector(this.getAttribute("href"));
                if(content){
                    const modalContent = document.getElementById("modalContent");
                    if (modalContent) {
                        modalContent.innerHTML = content.innerHTML;
                        modal.style.display = "flex";
                    }
                }
            });
        });
    }
}

// Make functions globally available
window.switchTab = switchTab;
window.showAlert = showAlert;
window.hideAlert = hideAlert;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;