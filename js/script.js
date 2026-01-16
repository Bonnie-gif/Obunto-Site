/**
 * ARCS - Advanced Research & Containment System
 * Client v3.2.2 - Full Integration (Login, Admin, Radio, Tabs, Chat)
 */

// ==================== CONFIGURATION ====================
const API_URL = '/api';
let currentUser = null;
let authToken = localStorage.getItem('arcs_token');
let socket = null;

// Chat Variables
let currentChatRecipient = null;
let chatTypingTimeout = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Socket.io (Requer <script src="/socket.io/socket.io.js"> no HTML)
    try {
        socket = io();
        setupSocketListeners();
        console.log('Socket initialized');
    } catch (e) {
        console.error('Socket.io failed to load. Ensure script tag is in HTML.', e);
    }

    // 2. Load Theme
    const savedTheme = localStorage.getItem('arcs_theme') || 'green';
    setAlarmTheme(savedTheme);

    // 3. Start Loading Animation
    setTimeout(startLoading, 1000);

    // 4. Input Handlers (Enter key)
    setupInputHandlers();
    
    // 5. Tab System
    setupTabHandlers();
});

function setupSocketListeners() {
    socket.on('connect', () => console.log('Connected to server'));
    
    // Broadcasts
    socket.on('broadcast:new', (data) => {
        showBroadcast(data);
        if(currentUser?.isAdmin) loadAnalytics();
    });

    // Radio
    socket.on('radio:message', (data) => {
        appendRadioMessage(data);
        playSound('sfx-newmessage');
        if(currentUser?.isAdmin) loadAnalytics();
    });

    socket.on('radio:cleared', () => {
        const container = document.getElementById('radio-messages');
        if(container) container.innerHTML = '<div class="radio-empty">NO MESSAGES</div>';
    });

    // Users
    socket.on('user:approved', (data) => {
        playSound('sfx-blue');
        // Se eu sou admin, recarrego as listas
        if(currentUser?.isAdmin) {
            loadPendingList();
            loadActiveUsers();
        }
    });

    socket.on('user:banned', () => { if(currentUser?.isAdmin) loadActiveUsers(); });
    socket.on('user:online', () => { if(currentUser) loadChatUsers(); });
    socket.on('user:offline', () => { if(currentUser) loadChatUsers(); });

    // Welcome Screen
    socket.on('welcome:updated', (data) => updateWelcomeScreen(data));
    
    // Tabs
    socket.on('tabs:published', (tabs) => renderMenuTabs(tabs));

    // Chat
    socket.on('chat:message', (msg) => handleIncomingChatMessage(msg));
}

// ==================== API HELPER ====================
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        const data = await res.json();
        
        // Se der erro 401/403 (Token invÃ¡lido), desloga
        if (res.status === 401 || res.status === 403) {
            if (endpoint !== '/login' && endpoint !== '/register') {
                console.warn('Session expired');
                // logout(); // Opcional: auto-logout
            }
        }
        
        if (!res.ok) throw new Error(data.message || 'Server Error');
        return data;
    } catch (e) {
        console.error(`API Error (${endpoint}):`, e);
        throw e;
    }
}

// ==================== AUTHENTICATION ====================
function startLoading() {
    playSound('sfx-loading');
    let progress = 0;
    const bar = document.getElementById('loading-progress');
    
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
            progress = 100;
            bar.style.width = '100%';
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('login-panel').classList.remove('hidden');
            }, 500);
        } else {
            bar.style.width = progress + '%';
        }
    }, 200);
}

async function handleLogin() {
    const userId = document.getElementById('operator-id').value.trim();
    const passwordEl = document.getElementById('operator-password');
    const password = passwordEl ? passwordEl.value : '';

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

        // Register socket identity
        socket.emit('register', { userId: currentUser.id, isAdmin: currentUser.isAdmin });

        playSound('sfx-poweron');
        enterMainScreen();

    } catch (e) {
        playSound('sfx-error');
        showStatus(e.message.toUpperCase(), 'error');
    }
}

async function handleNewOperator() {
    const userIdInput = document.getElementById('operator-id');
    const userId = userIdInput.value.trim().toUpperCase() || generateUserId();
    
    try {
        await apiCall('/register', 'POST', { userId });
        playSound('sfx-sent');
        showStatus('REQUEST SENT', 'success');
        
        // Show Popup
        showIdPopup(userId);
        userIdInput.value = userId; // Fill input for convenience
        
    } catch (e) {
        playSound('sfx-error');
        showStatus(e.message.toUpperCase(), 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('arcs_token');
    location.reload();
}

function generateUserId() {
    return 'OP' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ==================== MAIN SCREEN LOGIC ====================
async function enterMainScreen() {
    showScreen('main-screen');
    
    // Update Header
    const userDisplay = document.querySelector('.menu-user-name');
    if(userDisplay) userDisplay.textContent = currentUser.name;

    // Show Admin Tabs if Admin
    const adminTabs = document.getElementById('admin-tabs');
    const adminToggle = document.getElementById('admin-toggle');
    
    if (currentUser.isAdmin) {
        adminTabs.classList.remove('hidden');
        adminToggle.classList.remove('hidden');
        
        // Load Admin Data
        loadPendingList();
        loadActiveUsers();
        loadAnalytics();
        loadObuntuStats();
        renderCustomTabsInEditor();
    } else {
        adminTabs.classList.add('hidden');
        adminToggle.classList.add('hidden');
    }

    // Load Common Data
    loadRadioMessages();
    loadWelcomeContent();
    loadPublishedTabs();
    loadChatUsers(); // Populate chat list
    
    goToHome();
}

// ==================== ADMIN: USERS & TICKETS ====================
async function loadPendingList(isModal = false) {
    if (!currentUser.isAdmin) return;
    try {
        const data = await apiCall('/pending');
        const listId = isModal ? 'pending-list-modal' : 'pending-list';
        const list = document.getElementById(listId);
        if (!list) return;

        list.innerHTML = '';
        if (data.pending.length === 0) {
            list.innerHTML = '<div class="pending-empty">NO PENDING REQUESTS</div>';
            return;
        }

        data.pending.forEach(p => {
            const item = document.createElement('div');
            item.className = 'pending-item';
            item.innerHTML = `
                <div class="pending-info">
                    <span class="user-id">${p.userId}</span>
                    <span class="pending-time">${new Date(p.requestedAt).toLocaleTimeString()}</span>
                </div>
                <div class="actions">
                    <button class="approve-btn" onclick="approveUser('${p.userId}')">âœ“</button>
                    <button class="deny-btn" onclick="denyUser('${p.userId}')">âœ—</button>
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
        // Listas atualizam via socket, mas forÃ§amos refresh do modal se aberto
        loadPendingList(true);
    } catch (e) { playSound('sfx-error'); }
}

async function denyUser(userId) {
    try {
        await apiCall('/users/deny', 'POST', { userId });
        playSound('sfx-denied');
        loadPendingList(true);
    } catch (e) { playSound('sfx-error'); }
}

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
            
            let btnAction = '';
            // NÃ£o banir a si mesmo nem o Admin Supremo
            if (u.id !== currentUser.id && u.id !== '118107921024376') {
                if (u.status === 'active') {
                    btnAction = `<button onclick="banUser('${u.id}')">BAN</button>`;
                } else {
                    btnAction = `<button onclick="unbanUser('${u.id}')">UNBAN</button>`;
                }
            }
            
            div.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${escapeHtml(u.name)}</div>
                    <div class="user-id">${u.id} ${u.isAdmin ? '(ADMIN)' : ''}</div>
                </div>
                <div class="user-actions">
                    <button onclick="editUser('${u.id}', '${escapeHtml(u.name)}', '${u.status}')">EDIT</button>
                    ${btnAction}
                </div>
            `;

            if (u.status === 'banned') bannedContainer?.appendChild(div);
            else activeContainer?.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

// User Actions
async function banUser(id) {
    if(!confirm('Ban user?')) return;
    try { await apiCall(`/users/${id}/ban`, 'POST'); playSound('sfx-denied'); } catch(e) { playSound('sfx-error'); }
}
async function unbanUser(id) {
    try { await apiCall(`/users/${id}/unban`, 'POST'); playSound('sfx-blue'); } catch(e) { playSound('sfx-error'); }
}

// Edit User Modal
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

// ==================== BROADCAST SYSTEM ====================
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
    
    // Procura imagem do sprite (se for img tag) ou emoji (se for div)
    // Ajustando para sua estrutura HTML (que usa img)
    if (spriteImg.tagName === 'IMG') {
        spriteImg.src = `/assets/sprites/${data.sprite || 'normal'}.png`;
    } else {
        // Fallback para emoji se o HTML mudou
        spriteImg.innerHTML = `<span class="sprite-face">âš ï¸</span>`; 
    }
    
    textEl.textContent = '';
    notif.classList.remove('hidden');
    playSound('sfx-newmessage');
    
    // Typewriter effect
    let i = 0;
    const type = () => {
        if (i < data.text.length) {
            textEl.textContent += data.text.charAt(i);
            i++;
            setTimeout(type, 30);
        }
    };
    type();

    // Auto hide
    setTimeout(() => notif.classList.add('hidden'), 8000);
}

// ==================== RADIO SYSTEM ====================
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
    
    // Remove "Empty" msg
    if(container.querySelector('.radio-empty')) container.innerHTML = '';

    const div = document.createElement('div');
    div.className = 'radio-message';
    
    const deleteBtn = currentUser?.isAdmin 
        ? `<button class="radio-delete-btn" onclick="deleteRadio('${msg.id}')">X</button>` 
        : '';

    div.innerHTML = `
        <span class="radio-message-time">[${new Date(msg.timestamp).toLocaleTimeString()}]</span>
        <span class="radio-message-user">${escapeHtml(msg.user)}:</span>
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
    if(!confirm('Clear all radio messages?')) return;
    try { await apiCall('/radio', 'DELETE'); } catch(e) { console.error(e); }
}

// ==================== CHAT SYSTEM ====================
async function loadChatUsers() {
    try {
        // Reusamos a lista de usuÃ¡rios
        const data = await apiCall('/users'); // Retorna todos os usuÃ¡rios
        const list = document.getElementById('chat-user-list');
        if(!list) return;

        list.innerHTML = '';
        const onlineUsers = data.users.filter(u => u.id !== currentUser.id); // Filtra o prÃ³prio usuÃ¡rio

        if (onlineUsers.length === 0) {
            list.innerHTML = '<div class="chat-user-empty">NO USERS FOUND</div>';
            return;
        }

        onlineUsers.forEach(u => {
            const item = document.createElement('div');
            item.className = 'chat-user-item';
            if (currentChatRecipient === u.id) item.classList.add('active');
            
            // Status Indicator (usando a propriedade isOnline se o backend mandar, ou assumindo offline)
            // No seu server atual, /api/users nÃ£o retorna isOnline diretamente no array principal,
            // mas podemos implementar se o server mudar. Por hora, listamos todos.
            
            item.onclick = () => selectChatUser(u.id, u.name);
            item.innerHTML = `
                <div class="chat-user-name">${escapeHtml(u.name)}</div>
                <div class="chat-user-id">${u.id}</div>
            `;
            list.appendChild(item);
        });
    } catch (e) { console.error(e); }
}

async function selectChatUser(userId, userName) {
    currentChatRecipient = userId;
    
    // Update UI
    document.querySelectorAll('.chat-user-item').forEach(el => el.classList.remove('active'));
    // (Adicionar classe active visualmente seria melhor com referÃªncia direta ao elemento, mas ok)
    
    const header = document.getElementById('chat-header');
    if(header) {
        header.innerHTML = `
            <span class="chat-recipient">CHAT WITH: ${escapeHtml(userName)}</span>
            <span class="chat-status">CONNECTED</span>
        `;
    }

    // Enable inputs
    document.getElementById('chat-input').disabled = false;
    document.getElementById('chat-send-btn').disabled = false;

    // Load history
    await loadChatHistory(userId);
}

async function loadChatHistory(recipientId) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '<div class="chat-loading">Loading...</div>';
    
    try {
        const data = await apiCall(`/chat/${recipientId}`);
        container.innerHTML = '';
        
        if (data.messages.length === 0) {
            container.innerHTML = '<div class="chat-empty">NO MESSAGES YET</div>';
        } else {
            data.messages.forEach(msg => appendChatMessage(msg));
        }
    } catch(e) {
        container.innerHTML = '<div class="chat-error">Failed to load history</div>';
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if(!text || !currentChatRecipient) return;

    // Send via socket directly for instant update
    socket.emit('chat:send', {
        recipientId: currentChatRecipient,
        text: text
    });

    input.value = '';
}

function handleIncomingChatMessage(msg) {
    // Se a mensagem for para mim OU fui eu que mandei
    const isForMe = msg.recipientId === currentUser.id;
    const isFromMe = msg.senderId === currentUser.id;

    if (isForMe || isFromMe) {
        // Se estivermos vendo o chat dessa pessoa, adiciona na tela
        if (currentChatRecipient === (isForMe ? msg.senderId : msg.recipientId)) {
            appendChatMessage(msg);
            playSound('sfx-newmessage');
        } else if (isForMe) {
            // NotificaÃ§Ã£o visual de mensagem nÃ£o lida (opcional)
            playSound('sfx-newmessage');
            showStatus(`New message from ${msg.senderName}`, 'info');
        }
    }
}

function appendChatMessage(msg) {
    const container = document.getElementById('chat-messages');
    if(container.querySelector('.chat-empty')) container.innerHTML = '';
    
    const isMine = msg.senderId === currentUser.id;
    
    const div = document.createElement('div');
    div.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;
    div.innerHTML = `
        <div class="chat-text">${escapeHtml(msg.text)}</div>
        <div class="chat-meta">${new Date(msg.timestamp).toLocaleTimeString()}</div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ==================== TABS & EDITOR ====================
async function loadPublishedTabs() {
    try {
        const data = await apiCall('/tabs'); 
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
        // Importante: usamos uma funÃ§Ã£o dedicada para mostrar o conteÃºdo
        btn.onclick = () => showCustomTab(tab);
        container.appendChild(btn);
    });
}

function showCustomTab(tab) {
    // Esconde tudo
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Procura se jÃ¡ criamos o elemento DOM para essa aba
    let view = document.getElementById(`custom-view-${tab.id}`);
    
    // Se nÃ£o existir, cria agora
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
        view.querySelector('.custom-body').textContent = tab.content;
    }
    
    view.classList.add('active');
}

// --- Editor Logic ---
async function renderCustomTabsInEditor() {
    try {
        const data = await apiCall('/tabs');
        const tabs = data.tabs || [];
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
            item.style.border = '1px solid var(--text-color)';
            item.style.padding = '10px';
            item.style.marginBottom = '10px';
            item.style.background = 'rgba(0,0,0,0.2)';
            
            item.innerHTML = `
                <div style="font-weight:bold;">${escapeHtml(tab.name)}</div>
                <div style="font-size: 0.8em; opacity: 0.7;">${escapeHtml(tab.content.substring(0, 50))}...</div>
                <button onclick="deleteCustomTab('${tab.id}')" style="color: red; margin-top:5px; cursor:pointer;">DELETE</button>
            `;
            canvas.appendChild(item);
        });
    } catch (e) { console.error(e); }
}

async function saveNewTab() {
    const name = document.getElementById('new-tab-name').value;
    const content = document.getElementById('new-tab-content').value;
    if(!name || !content) return playSound('sfx-error');

    try {
        await apiCall('/tabs', 'POST', { name, content });
        closeNewTabModal();
        playSound('sfx-sent');
        renderCustomTabsInEditor();
    } catch(e) { playSound('sfx-error'); }
}

async function deleteCustomTab(id) {
    if(!confirm('Delete tab permanently?')) return;
    try { await apiCall(`/tabs/${id}`, 'DELETE'); playSound('sfx-denied'); renderCustomTabsInEditor(); } catch(e) { playSound('sfx-error'); }
}

async function publishTabs() {
    try { await apiCall('/tabs/publish', 'POST'); playSound('sfx-blue'); alert('Tabs published!'); } catch(e) { playSound('sfx-error'); }
}

// Welcome Screen Editor
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

async function saveWelcomeChanges() {
    const title = document.getElementById('welcome-title-input').value;
    const text = document.getElementById('welcome-text-input').value;
    try {
        await apiCall('/welcome', 'PUT', { title, text });
        document.getElementById('edit-welcome-modal').classList.add('hidden');
        playSound('sfx-sent');
    } catch(e) { playSound('sfx-error'); }
}

// ==================== ANALYTICS ====================
async function loadAnalytics() {
    try {
        const data = await apiCall('/analytics');
        document.getElementById('analytics-total-users').textContent = data.analytics.totalUsers;
        document.getElementById('analytics-active-sessions').textContent = data.analytics.onlineUsers;
        document.getElementById('analytics-broadcasts').textContent = data.analytics.totalBroadcasts;
        document.getElementById('analytics-radio-msgs').textContent = data.analytics.totalRadioMessages;
    } catch(e) { console.error(e); }
}

// ==================== UI & UTILS ====================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goToHome() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-home').classList.add('active');
}

function showStatus(msg, type) {
    const status = document.getElementById('login-status');
    if(!status) return;
    status.textContent = msg;
    status.className = 'login-status show ' + type;
    setTimeout(() => status.classList.remove('show'), 4000);
}

function playSound(id) {
    const audio = document.getElementById(id);
    if(audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setAlarmTheme(theme) {
    document.body.className = '';
    if (theme !== 'green') document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('arcs_theme', theme);
}

// Registration Popup
function showIdPopup(userId) {
    let popup = document.getElementById('id-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'id-popup';
        popup.className = 'modal';
        popup.innerHTML = `
            <div class="modal-content" style="min-width: 350px;">
                <h3>SAVE YOUR ID</h3>
                <p>Request sent. Save this ID to login:</p>
                <div id="popup-user-id" style="font-family:monospace; font-size:1.5em; margin:15px 0; border:1px solid #ccc; padding:10px;">${userId}</div>
                <button onclick="copyUserId()">COPY ID</button>
                <button onclick="closeIdPopup()" style="margin-top:10px;">CLOSE</button>
            </div>
        `;
        document.body.appendChild(popup);
    } else {
        document.getElementById('popup-user-id').textContent = userId;
    }
    popup.classList.remove('hidden');
}

function closeIdPopup() { document.getElementById('id-popup')?.classList.add('hidden'); }
function copyUserId() {
    const txt = document.getElementById('popup-user-id').textContent;
    navigator.clipboard.writeText(txt).then(() => { alert('ID COPIED!'); });
}

// Modals
window.addNewTab = () => document.getElementById('new-tab-modal').classList.remove('hidden');
window.closeNewTabModal = () => document.getElementById('new-tab-modal').classList.add('hidden');
window.editWelcomeHome = () => {
    document.getElementById('welcome-title-input').value = document.getElementById('home-welcome-title').textContent;
    document.getElementById('welcome-text-input').value = document.getElementById('home-welcome-text').textContent;
    document.getElementById('edit-welcome-modal').classList.remove('hidden');
};
window.closeWelcomeModal = () => document.getElementById('edit-welcome-modal').classList.add('hidden');
window.closeEditUserModal = () => document.getElementById('edit-user-modal').classList.add('hidden');

window.openAdmin = () => {
    document.getElementById('admin-panel').classList.remove('hidden');
    loadPendingList(true);
};
window.closeAdmin = () => document.getElementById('admin-panel').classList.add('hidden');

// Handlers Setup
function setupInputHandlers() {
    document.getElementById('operator-id')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    document.getElementById('radio-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendRadioMessage(); });
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
}

function setupTabHandlers() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.dataset.target;
            if (target) {
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                document.getElementById(target)?.classList.add('active');
                
                // Specific Reloads
                if(target === 'adm-chat') loadChatUsers();
                if(target === 'adm-editing') renderCustomTabsInEditor();
            }
        });
    });
    
    // Sprites
    document.querySelectorAll('.sprite-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.sprite-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            document.getElementById('sprite-select').value = opt.dataset.sprite;
        }
    });
}

// ==================== EXPORTS ====================
// Make functions globally available for HTML onclick attributes
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
window.saveUserChanges = saveUserChanges;
window.saveWelcomeChanges = saveWelcomeChanges;
window.saveNewTab = saveNewTab;
window.deleteCustomTab = deleteCustomTab;
window.publishTabs = publishTabs;
window.showCustomTab = showCustomTab;
window.showUsersSection = (type) => {
    document.getElementById('users-active-section').classList.toggle('hidden', type !== 'active');
    document.getElementById('users-banned-section').classList.toggle('hidden', type !== 'banned');
    document.querySelectorAll('.users-tab').forEach(t => t.classList.remove('active'));
    // Encontrar a aba clicada e ativar
    const tabs = document.querySelectorAll('.users-tab');
    if (type === 'active') tabs[0].classList.add('active');
    else tabs[1].classList.add('active');
};
window.closeIdPopup = closeIdPopup;
window.copyUserId = copyUserId;
window.sendChatMessage = sendChatMessage;
async function loadObuntuStats() {
    if (!currentUser?.isAdmin) return;
    try {
        const data = await apiCall('/analytics');
        const operatorsEl = document.getElementById('obuntu-operators');
        const activeEl = document.getElementById('obuntu-active');
        const ticketsEl = document.getElementById('obuntu-tickets');
        if(operatorsEl) operatorsEl.textContent = data.analytics.totalUsers || 0;
        if(activeEl) activeEl.textContent = data.analytics.onlineUsers || 0;
        if(ticketsEl) ticketsEl.textContent = data.analytics.totalTickets || 0;
    } catch (e) {}
}