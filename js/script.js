/**
 * ARCS - Advanced Research & Containment System
 * Client v3.2.2 - Full Integration
 */

// ==================== CONFIGURATION ====================
const API_URL = '/api';
let currentUser = null;
let authToken = localStorage.getItem('arcs_token');
let socket = null;
let customTabsCache = []; // Cache local para o editor

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Socket.io
    socket = io();
    setupSocketListeners();

    // Check for saved theme
    const savedTheme = localStorage.getItem('arcs_theme') || 'green';
    setAlarmTheme(savedTheme);

    // Start Loading Animation
    setTimeout(startLoading, 1000);

    // Enter key handlers
    setupKeyHandlers();
    
    // Tab handlers
    setupTabHandlers();
});

function setupSocketListeners() {
    socket.on('connect', () => console.log('Connected to server'));
    
    socket.on('broadcast:new', (data) => {
        showBroadcast(data);
        if(currentUser?.isAdmin) loadAnalytics();
    });

    socket.on('radio:message', (data) => {
        appendRadioMessage(data);
        playSound('sfx-newmessage');
        if(currentUser?.isAdmin) loadAnalytics();
    });

    socket.on('radio:cleared', () => {
        const container = document.getElementById('radio-messages');
        if(container) container.innerHTML = '<div class="radio-empty">NO MESSAGES</div>';
    });

    socket.on('user:approved', () => {
        playSound('sfx-blue');
        if(currentUser?.isAdmin) {
            loadPendingList();
            loadActiveUsers();
        }
    });

    socket.on('welcome:updated', (data) => {
        updateWelcomeScreen(data);
    });
    
    socket.on('tabs:published', (tabs) => {
        renderMenuTabs(tabs);
    });
}

// ==================== UTILITIES ====================
function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play prevented'));
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
}

function showStatus(message, type = 'info') {
    const status = document.getElementById('login-status');
    if (!status) return;
    
    status.textContent = message;
    status.className = 'login-status show';
    if (type === 'error') status.classList.add('error');
    if (type === 'success') status.classList.add('success');
    
    setTimeout(() => status.classList.remove('show'), 4000);
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Server Error');
        return data;
    } catch (e) {
        console.error(`API Error (${endpoint}):`, e);
        throw e;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== LOADING & LOGIN ====================
function startLoading() {
    playSound('sfx-loading');
    let progress = 0;
    const bar = document.getElementById('loading-progress');
    
    const interval = setInterval(() => {
        progress += Math.random() * 12 + 3;
        if (progress >= 100) {
            progress = 100;
            bar.style.width = '100%';
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('login-panel').classList.remove('hidden');
            }, 400);
        } else {
            bar.style.width = progress + '%';
        }
    }, 180);
}

async function handleLogin() {
    const userId = document.getElementById('operator-id').value.trim();
    const password = document.getElementById('operator-password') ? document.getElementById('operator-password').value : '';

    if (!userId) {
        playSound('sfx-error');
        showStatus('ENTER OPERATOR ID', 'error');
        return;
    }

    try {
        const data = await apiCall('/login', 'POST', { userId, password });
        
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('arcs_token', authToken);

        // Register socket
        socket.emit('register', { userId: currentUser.id, isAdmin: currentUser.isAdmin });

        playSound('sfx-poweron');
        enterMainScreen();

    } catch (e) {
        playSound('sfx-error');
        showStatus(e.message.toUpperCase(), 'error');
    }
}

async function handleNewOperator() {
    const userId = document.getElementById('operator-id').value.trim().toUpperCase() || generateUserId();
    
    try {
        await apiCall('/register', 'POST', { userId });
        playSound('sfx-sent');
        showStatus('REQUEST SENT', 'success');
        
        // Show ID popup visualmente rico (restaurado do original)
        showIdPopup(userId);
        
    } catch (e) {
        playSound('sfx-error');
        showStatus(e.message.toUpperCase(), 'error');
    }
}

function generateUserId() {
    return 'OP' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('arcs_token');
    location.reload();
}

// ==================== REGISTRATION POPUP ====================
function showIdPopup(userId) {
    let popup = document.getElementById('id-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'id-popup';
        popup.className = 'modal';
        popup.innerHTML = `
            <div class="modal-content" style="min-width: 360px;">
                <div class="modal-header">
                    <span>SAVE YOUR OPERATOR ID</span>
                    <div class="modal-close" onclick="closeIdPopup()">X</div>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 16px; font-size: 12px; line-height: 1.6;">
                        YOUR REQUEST HAS BEEN SENT. SAVE THIS ID TO LOGIN AFTER APPROVAL:
                    </p>
                    <div id="popup-user-id" style="
                        background: rgba(255, 255, 255, 0.1);
                        border: 2px solid var(--text-color);
                        padding: 18px;
                        text-align: center;
                        font-size: 20px;
                        font-weight: 700;
                        letter-spacing: 4px;
                        margin-bottom: 16px;
                        font-family: monospace;
                    ">${userId}</div>
                    <button class="form-submit-btn" onclick="copyUserId()">COPY ID</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
    } else {
        document.getElementById('popup-user-id').textContent = userId;
    }
    popup.classList.remove('hidden');
}

function closeIdPopup() {
    document.getElementById('id-popup')?.classList.add('hidden');
}

function copyUserId() {
    const userId = document.getElementById('popup-user-id').textContent;
    navigator.clipboard.writeText(userId).then(() => {
        playSound('sfx-sent');
        const btn = document.querySelector('#id-popup .form-submit-btn');
        const originalText = btn.textContent;
        btn.textContent = 'COPIED!';
        setTimeout(() => btn.textContent = originalText, 2000);
    });
}

// ==================== MAIN SCREEN ====================
async function enterMainScreen() {
    showScreen('main-screen');
    
    // Update User Info
    const userDisplay = document.querySelector('.menu-user-name');
    if(userDisplay) userDisplay.textContent = currentUser.name;

    // Admin UI
    if (currentUser.isAdmin) {
        document.getElementById('admin-toggle')?.classList.remove('hidden');
        document.getElementById('admin-tabs')?.classList.remove('hidden');
        // Initial Admin Load
        loadPendingList();
        loadActiveUsers();
        loadAnalytics();
        renderCustomTabsInEditor(); // Load tabs for editor
    } else {
        document.getElementById('admin-toggle')?.classList.add('hidden');
        document.getElementById('admin-tabs')?.classList.add('hidden');
    }

    // Common Data
    loadRadioMessages();
    loadWelcomeContent();
    loadPublishedTabs(); // Load tabs for menu
    goToHome();
}

// ==================== ADMIN: USERS & APPROVALS ====================
async function loadPendingList(modal = false) {
    if (!currentUser.isAdmin) return;
    try {
        const data = await apiCall('/pending');
        const listId = modal ? 'pending-list-modal' : 'pending-list';
        const list = document.getElementById(listId);
        if (!list) return;

        list.innerHTML = '';
        if (data.pending.length === 0) {
            list.innerHTML = '<div class="pending-empty">NO REQUESTS</div>';
            return;
        }

        data.pending.forEach(p => {
            const item = document.createElement('div');
            item.className = 'pending-item';
            item.innerHTML = `
                <div class="pending-info">
                    <span class="user-id">${p.userId}</span>
                </div>
                <div class="actions">
                    <button class="approve-btn" onclick="approveUser('${p.userId}')">✓</button>
                    <button class="deny-btn" onclick="denyUser('${p.userId}')">✗</button>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (e) { console.error(e); }
}

async function approveUser(userId) {
    try {
        await apiCall('/users/approve', 'POST', { userId });
        playSound('sfx-blue');
        loadPendingList(); // Reload lists
        if(document.getElementById('admin-panel').classList.contains('hidden') === false) {
             loadPendingList(true); // Reload modal list if open
        }
    } catch (e) { playSound('sfx-error'); }
}

async function denyUser(userId) {
    try {
        await apiCall('/users/deny', 'POST', { userId });
        playSound('sfx-denied');
        loadPendingList();
    } catch (e) { playSound('sfx-error'); }
}

// --- Users Management ---
async function loadActiveUsers() {
    if (!currentUser.isAdmin) return;
    try {
        const data = await apiCall('/users');
        const activeContainer = document.getElementById('active-users-list');
        const bannedContainer = document.getElementById('banned-users-list');
        
        if(activeContainer) activeContainer.innerHTML = '';
        if(bannedContainer) bannedContainer.innerHTML = '';

        data.users.forEach(u => {
            const div = document.createElement('div');
            div.className = u.status === 'banned' ? 'banned-item' : 'user-item';
            
            let actions = '';
            if (u.id !== currentUser.id && u.id !== '118107921024376') { // Admin hardcoded ID check
                if (u.status === 'active') {
                    actions = `<button onclick="banUser('${u.id}')">BAN</button>`;
                } else {
                    actions = `<button onclick="unbanUser('${u.id}')">UNBAN</button>`;
                }
            }
            
            div.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${u.name}</div>
                    <div class="user-id">${u.id}</div>
                </div>
                <div class="user-actions">
                    <button onclick="editUser('${u.id}', '${u.name}', '${u.status}')">EDIT</button>
                    ${actions}
                </div>
            `;

            if (u.status === 'banned') bannedContainer?.appendChild(div);
            else activeContainer?.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

async function banUser(userId) {
    if(!confirm('Ban user?')) return;
    try { await apiCall(`/users/${userId}/ban`, 'POST'); } catch(e) { playSound('sfx-error'); }
}

async function unbanUser(userId) {
    try { await apiCall(`/users/${userId}/unban`, 'POST'); } catch(e) { playSound('sfx-error'); }
}

function editUser(id, name, status) {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-user-name').value = name;
    document.getElementById('edit-user-status').value = status;
    document.getElementById('edit-user-modal').classList.remove('hidden');
}

async function saveUserChanges() {
    const id = document.getElementById('edit-user-id').value;
    const name = document.getElementById('edit-user-name').value;
    const status = document.getElementById('edit-user-status').value;
    
    try {
        await apiCall(`/users/${id}`, 'PUT', { name, status });
        document.getElementById('edit-user-modal').classList.add('hidden');
        playSound('sfx-sent');
        loadActiveUsers();
    } catch(e) { playSound('sfx-error'); }
}

async function loadAnalytics() {
    try {
        const data = await apiCall('/analytics');
        const el1 = document.getElementById('analytics-total-users');
        const el2 = document.getElementById('analytics-active-sessions');
        const el3 = document.getElementById('analytics-broadcasts');
        const el4 = document.getElementById('analytics-radio-msgs');

        if(el1) el1.textContent = data.analytics.totalUsers;
        if(el2) el2.textContent = data.analytics.onlineUsers;
        if(el3) el3.textContent = data.analytics.totalBroadcasts;
        if(el4) el4.textContent = data.analytics.totalRadioMessages;
    } catch(e) { console.error(e); }
}

// ==================== BROADCAST ====================
async function sendBroadcast() {
    const text = document.getElementById('broadcast-text').value;
    const sprite = document.getElementById('sprite-select').value;
    
    if(!text) return playSound('sfx-error');

    try {
        await apiCall('/broadcast', 'POST', { text, sprite });
        document.getElementById('broadcast-text').value = '';
        playSound('sfx-sent');
    } catch(e) { playSound('sfx-error'); }
}

function showBroadcast(data) {
    const notif = document.getElementById('broadcast-notification');
    const spriteImg = document.getElementById('notif-sprite');
    const textEl = document.getElementById('notif-text');
    
    // Set sprite image path (garante que usa o caminho absoluto)
    spriteImg.src = `/assets/sprites/${data.sprite || 'normal'}.png`;
    
    textEl.textContent = '';
    notif.classList.remove('hidden');
    playSound('sfx-newmessage');
    
    // Typewriter
    let i = 0;
    const type = () => {
        if (i < data.text.length) {
            textEl.textContent += data.text.charAt(i);
            i++;
            setTimeout(type, 30);
        }
    };
    type();

    setTimeout(() => notif.classList.add('hidden'), 8000);
}

// ==================== RADIO ====================
async function sendRadioMessage() {
    const input = document.getElementById('radio-input');
    const text = input.value.trim();
    if(!text) return playSound('sfx-error');

    try {
        await apiCall('/radio', 'POST', { text });
        input.value = '';
        playSound('sfx-sent');
    } catch(e) { playSound('sfx-error'); }
}

async function loadRadioMessages() {
    try {
        const data = await apiCall('/radio');
        const container = document.getElementById('radio-messages');
        if(!container) return;
        
        container.innerHTML = '';
        data.messages.forEach(appendRadioMessage);
    } catch(e) { console.error(e); }
}

function appendRadioMessage(msg) {
    const container = document.getElementById('radio-messages');
    if(!container) return;

    if(container.querySelector('.radio-empty')) container.innerHTML = '';
    
    const div = document.createElement('div');
    div.className = 'radio-message';
    
    // Delete button for admin
    const deleteBtn = currentUser?.isAdmin 
        ? `<button class="radio-delete-btn" onclick="deleteRadio('${msg.id}')">X</button>` 
        : '';

    div.innerHTML = `
        <span class="radio-message-time">[${new Date(msg.timestamp).toLocaleTimeString()}]</span>
        <span class="radio-message-user">${msg.user}:</span>
        <span class="radio-message-text">${escapeHtml(msg.text)}</span>
        ${deleteBtn}
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function deleteRadio(id) {
    try { await apiCall(`/radio/${id}`, 'DELETE'); } catch(e) { console.error(e); }
}

async function clearRadioMessages() {
    if(!confirm('Clear all?')) return;
    try { await apiCall('/radio', 'DELETE'); } catch(e) { console.error(e); }
}

// ==================== CONTENT EDITOR (TABS & WELCOME) ====================

// --- Welcome Screen ---
async function loadWelcomeContent() {
    try {
        const data = await apiCall('/welcome');
        updateWelcomeScreen(data.welcome);
    } catch(e) { console.error(e); }
}

function updateWelcomeScreen(welcome) {
    const title = document.getElementById('home-welcome-title');
    const text = document.getElementById('home-welcome-text');
    if(title) title.textContent = welcome.title;
    if(text) text.textContent = welcome.text;
}

function editWelcomeHome() {
    const title = document.getElementById('home-welcome-title')?.textContent || '';
    const text = document.getElementById('home-welcome-text')?.textContent || '';
    
    document.getElementById('welcome-title-input').value = title;
    document.getElementById('welcome-text-input').value = text;
    
    document.getElementById('edit-welcome-modal')?.classList.remove('hidden');
}

function closeWelcomeModal() {
    document.getElementById('edit-welcome-modal')?.classList.add('hidden');
}

async function saveWelcomeChanges() {
    const title = document.getElementById('welcome-title-input').value;
    const text = document.getElementById('welcome-text-input').value;
    
    try {
        await apiCall('/welcome', 'PUT', { title, text });
        document.getElementById('edit-welcome-modal').classList.add('hidden');
        playSound('sfx-sent');
    } catch(e) { playSound('sfx-error'); }
}

// --- Custom Tabs Editor ---

// Carrega as abas no canvas de edição (somente Admin)
async function renderCustomTabsInEditor() {
    try {
        const data = await apiCall('/tabs');
        const tabs = data.tabs || [];
        customTabsCache = tabs; // Atualiza cache
        
        const canvas = document.getElementById('editing-canvas');
        if (!canvas) return;
        
        if (tabs.length === 0) {
            canvas.innerHTML = '<div class="canvas-hint">CREATE NEW TABS OR EDIT THE WELCOME SCREEN</div>';
            return;
        }
        
        canvas.innerHTML = '';
        
        tabs.forEach(tab => {
            const item = document.createElement('div');
            item.className = 'tab-preview-item';
            // Estilização inline para garantir o visual no editor
            item.style.border = '1px solid var(--text-color)';
            item.style.padding = '10px';
            item.style.marginBottom = '10px';
            item.style.background = 'rgba(0,0,0,0.2)';
            
            item.innerHTML = `
                <div style="font-weight:bold; margin-bottom:5px;">${escapeHtml(tab.name)}</div>
                <div style="font-size: 0.9em; opacity: 0.8; margin-bottom:10px; max-height:50px; overflow:hidden;">${escapeHtml(tab.content)}</div>
                <button onclick="deleteCustomTab('${tab.id}')" style="background:transparent; border:1px solid red; color:red; cursor:pointer; padding:5px;">DELETE</button>
            `;
            canvas.appendChild(item);
        });
    } catch (e) {
        console.error('Editor render error', e);
    }
}

function addNewTab() {
    document.getElementById('new-tab-modal')?.classList.remove('hidden');
}

function closeNewTabModal() {
    document.getElementById('new-tab-modal')?.classList.add('hidden');
    document.getElementById('new-tab-name').value = '';
    document.getElementById('new-tab-content').value = '';
}

async function saveNewTab() {
    const name = document.getElementById('new-tab-name').value;
    const content = document.getElementById('new-tab-content').value;
    
    if(!name || !content) return playSound('sfx-error');

    try {
        await apiCall('/tabs', 'POST', { name, content });
        closeNewTabModal();
        playSound('sfx-sent');
        renderCustomTabsInEditor(); // Recarrega editor
    } catch(e) { playSound('sfx-error'); }
}

async function deleteCustomTab(tabId) {
    if(!confirm('Delete this tab permanently?')) return;
    
    try {
        await apiCall(`/tabs/${tabId}`, 'DELETE');
        playSound('sfx-denied');
        renderCustomTabsInEditor();
    } catch(e) { playSound('sfx-error'); }
}

async function publishTabs() {
    try {
        await apiCall('/tabs/publish', 'POST');
        playSound('sfx-blue');
        alert('TABS PUBLISHED TO MENU!');
    } catch(e) { playSound('sfx-error'); }
}

// ==================== TABS RENDERING (MENU) ====================
async function loadPublishedTabs() {
    try {
        const data = await apiCall('/tabs'); // Retorna { tabs: [], published: [] }
        renderMenuTabs(data.published || []);
    } catch(e) { console.error(e); }
}

function renderMenuTabs(tabs) {
    const container = document.getElementById('custom-menu-tabs');
    if(!container) return;
    container.innerHTML = '';
    
    tabs.forEach(tab => {
        const btn = document.createElement('div');
        btn.className = 'tab';
        btn.textContent = tab.name;
        // Importante: usamos uma função dedicada para mostrar o conteúdo
        btn.onclick = () => showCustomTab(tab);
        container.appendChild(btn);
    });
}

function showCustomTab(tab) {
    // Esconde tudo
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Procura se já criamos o elemento DOM para essa aba
    let view = document.getElementById(`custom-view-${tab.id}`);
    
    // Se não existir, cria agora
    if(!view) {
        view = document.createElement('div');
        view.id = `custom-view-${tab.id}`;
        view.className = 'tab-content';
        view.innerHTML = `
            <div class="custom-tab-wrapper" style="padding: 20px;">
                <div class="cell-header">${escapeHtml(tab.name)}</div>
                <div class="custom-body" style="white-space: pre-wrap; margin-top: 15px;">${escapeHtml(tab.content)}</div>
            </div>
        `;
        document.querySelector('.main-window').appendChild(view);
    } else {
        // Se existir, atualiza conteúdo caso tenha mudado
        view.querySelector('.custom-body').textContent = tab.content;
    }
    
    // Ativa a aba
    view.classList.add('active');
    
    // Marca visualmente o botão no menu como ativo (opcional, requer lógica extra de seleção de irmãos)
    // Simplesmente removemos 'active' de todos acima e o usuário vê o conteúdo.
}


// ==================== UI HELPERS ====================
function goToHome() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-home').classList.add('active');
}

function setAlarmTheme(theme) {
    document.body.className = '';
    if (theme !== 'green') document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('arcs_theme', theme);
}

// UI Setup Helpers
function setupKeyHandlers() {
    document.getElementById('operator-id')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('radio-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendRadioMessage();
    });
}

function setupTabHandlers() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Standard tabs (aqueles que tem data-target no HTML)
            const target = this.dataset.target;
            if (target) {
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                document.getElementById(target)?.classList.add('active');
                
                // Se clicou no editor, carrega as abas
                if(target === 'adm-editing') {
                    renderCustomTabsInEditor();
                }
            }
        });
    });
    
    // Sprite selector
    document.querySelectorAll('.sprite-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.sprite-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            document.getElementById('sprite-select').value = opt.dataset.sprite;
        }
    });
}

// ==================== GLOBAL EXPORTS (Crucial for HTML onclicks) ====================
window.handleLogin = handleLogin;
window.handleNewOperator = handleNewOperator;
window.logout = logout;
window.goToHome = goToHome;
window.setAlarmTheme = setAlarmTheme;

window.sendBroadcast = sendBroadcast;
window.closeBroadcast = () => document.getElementById('broadcast-notification').classList.add('hidden');

window.sendRadioMessage = sendRadioMessage;
window.clearRadioMessages = clearRadioMessages;
window.deleteRadio = deleteRadio;

window.approveUser = approveUser;
window.denyUser = denyUser;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.editUser = editUser;
window.closeEditUserModal = () => document.getElementById('edit-user-modal').classList.add('hidden');
window.saveUserChanges = saveUserChanges;
window.showUsersSection = (type) => {
    document.getElementById('users-active-section').classList.toggle('hidden', type !== 'active');
    document.getElementById('users-banned-section').classList.toggle('hidden', type !== 'banned');
    document.querySelectorAll('.users-tab').forEach(t => t.classList.remove('active'));
    // O event.target funciona porque é chamado via onclick no HTML
    if(event && event.target) event.target.classList.add('active');
};

// Editor & Welcome Exports
window.editWelcomeHome = editWelcomeHome;
window.closeWelcomeModal = closeWelcomeModal;
window.saveWelcomeChanges = saveWelcomeChanges;

window.addNewTab = addNewTab;
window.closeNewTabModal = closeNewTabModal;
window.saveNewTab = saveNewTab;
window.deleteCustomTab = deleteCustomTab;
window.publishTabs = publishTabs;
window.showCustomTab = showCustomTab;

// Admin Panel
window.openAdmin = () => {
    document.getElementById('admin-panel').classList.remove('hidden');
    loadPendingList(true);
};
window.closeAdmin = () => document.getElementById('admin-panel').classList.add('hidden');

// Registration Popup
window.closeIdPopup = closeIdPopup;
window.copyUserId = copyUserId;