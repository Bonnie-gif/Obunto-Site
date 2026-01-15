const API_URL = '/api';
let currentUser = null;
let authToken = localStorage.getItem('arcs_token');
let socket = null;
let notificationTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    try {
        socket = io();
        setupSocketListeners();
        console.log('Socket initialized');
    } catch (e) {
        console.error('Socket.io failed to load', e);
    }

    const savedTheme = localStorage.getItem('arcs_theme') || 'green';
    setAlarmTheme(savedTheme);

    setTimeout(startLoading, 1000);

    setupInputHandlers();
    setupTabHandlers();
    setupSpriteSelector();
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

    socket.on('radio:deleted', (data) => {
        const msgElement = document.querySelector(`[data-msg-id="${data.id}"]`);
        if(msgElement) msgElement.remove();
    });

    socket.on('user:approved', () => {
        playSound('sfx-poweron');
        if(currentUser?.isAdmin) {
            loadPendingList();
            loadActiveUsers();
        }
    });

    socket.on('user:banned', () => { if(currentUser?.isAdmin) loadActiveUsers(); });
    socket.on('user:unbanned', () => { if(currentUser?.isAdmin) loadActiveUsers(); });
    socket.on('user:updated', () => { if(currentUser?.isAdmin) loadActiveUsers(); });

    socket.on('welcome:updated', (data) => updateWelcomeScreen(data));
    socket.on('tabs:published', (tabs) => renderMenuTabs(tabs));
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, config);
        const data = await res.json();
        
        if (res.status === 401 || res.status === 403) {
            if (endpoint !== '/login' && endpoint !== '/register') {
                console.warn('Session expired');
            }
        }
        
        if (!res.ok) throw new Error(data.message || 'Server Error');
        return data;
    } catch (e) {
        console.error(`API Error (${endpoint}):`, e);
        throw e;
    }
}

function startLoading() {
    playSound('sfx-poweron');
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
        playSound('sfx-poweron');
        showStatus('REQUEST SENT', 'success');
        
        showIdPopup(userId);
        userIdInput.value = userId;
        
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

async function enterMainScreen() {
    showScreen('main-screen');
    
    const userDisplay = document.querySelector('.menu-user-name');
    if(userDisplay) userDisplay.textContent = currentUser.name;

    const adminTabs = document.getElementById('admin-tabs');
    
    if (currentUser.isAdmin) {
        adminTabs.classList.remove('hidden');
        
        loadPendingList();
        loadActiveUsers();
        loadAnalytics();
    } else {
        adminTabs.classList.add('hidden');
    }

    loadRadioMessages();
    loadWelcomeContent();
    loadPublishedTabs();
    updateCredentials();
    
    goToHome();
}

function updateCredentials() {
    document.getElementById('cred-user-name').textContent = currentUser.name;
    document.getElementById('cred-user-id').textContent = currentUser.id;
    document.getElementById('cred-clearance').textContent = `LEVEL ${currentUser.clearance || 1}`;
    document.getElementById('cred-role').textContent = currentUser.role || 'OPERATOR';
    document.getElementById('cred-department').textContent = currentUser.department || 'FIELD OPERATIONS';
}

async function loadPendingList() {
    if (!currentUser.isAdmin) return;
    try {
        const data = await apiCall('/pending');
        const list = document.getElementById('pending-list');
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
                    <span class="request-time">${new Date(p.requestedAt).toLocaleString()}</span>
                </div>
                <div class="actions">
                    <button class="approve-btn" onclick="approveUser('${p.userId}')">✓ APPROVE</button>
                    <button class="deny-btn" onclick="denyUser('${p.userId}')">✗ DENY</button>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (e) { console.error(e); }
}

async function approveUser(userId) {
    try {
        await apiCall('/users/approve', 'POST', { userId });
        playSound('sfx-poweron');
        loadPendingList();
    } catch (e) { playSound('sfx-error'); }
}

async function denyUser(userId) {
    try {
        await apiCall('/users/deny', 'POST', { userId });
        playSound('sfx-error');
        loadPendingList();
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
                    <div class="user-id">${u.id} ${u.isAdmin ? '(ADMIN)' : ''} - Level ${u.clearance || 1}</div>
                </div>
                <div class="user-actions">
                    <button onclick="editUser('${u.id}', '${escapeHtml(u.name)}', '${u.status}', ${u.clearance || 1}, '${escapeHtml(u.role || 'OPERATOR')}', '${escapeHtml(u.department || 'FIELD OPERATIONS')}')">EDIT</button>
                    ${btnAction}
                </div>
            `;

            if (u.status === 'banned') bannedContainer?.appendChild(div);
            else activeContainer?.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

async function banUser(id) {
    if(!confirm('Ban user?')) return;
    try { 
        await apiCall(`/users/${id}/ban`, 'POST'); 
        playSound('sfx-error'); 
        loadActiveUsers();
    } catch(e) { playSound('sfx-error'); }
}

async function unbanUser(id) {
    try { 
        await apiCall(`/users/${id}/unban`, 'POST'); 
        playSound('sfx-poweron'); 
        loadActiveUsers();
    } catch(e) { playSound('sfx-error'); }
}

function editUser(id, name, status, clearance, role, department) {
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-user-name').value = name;
    document.getElementById('edit-user-status').value = status;
    document.getElementById('edit-user-clearance').value = clearance;
    document.getElementById('edit-user-role').value = role;
    document.getElementById('edit-user-department').value = department;
    document.getElementById('edit-user-modal').classList.remove('hidden');
}

async function saveUserChanges() {
    const id = document.getElementById('edit-user-id').value;
    const name = document.getElementById('edit-user-name').value;
    const status = document.getElementById('edit-user-status').value;
    const clearance = parseInt(document.getElementById('edit-user-clearance').value);
    const role = document.getElementById('edit-user-role').value;
    const department = document.getElementById('edit-user-department').value;
    
    try {
        await apiCall(`/users/${id}`, 'PUT', { name, status, clearance, role, department });
        document.getElementById('edit-user-modal').classList.add('hidden');
        playSound('sfx-poweron');
        loadActiveUsers();
        if(id === currentUser.id) {
            currentUser.name = name;
            currentUser.clearance = clearance;
            currentUser.role = role;
            currentUser.department = department;
            updateCredentials();
        }
    } catch(e) { playSound('sfx-error'); }
}

async function sendBroadcast() {
    const text = document.getElementById('broadcast-text').value;
    const sprite = document.getElementById('sprite-select').value;
    if(!text) return playSound('sfx-error');

    try {
        await apiCall('/broadcast', 'POST', { text, sprite });
        document.getElementById('broadcast-text').value = '';
        playSound('sfx-poweron');
    } catch(e) { playSound('sfx-error'); }
}

function showBroadcast(data) {
    const notif = document.getElementById('broadcast-notification');
    const spriteImg = document.getElementById('notif-sprite');
    const textEl = document.getElementById('notif-text');
    const timeEl = document.getElementById('notif-time');
    
    if (spriteImg.tagName === 'IMG') {
        spriteImg.src = `/assets/sprites/${data.sprite || 'normal'}.png`;
    }
    
    notif.setAttribute('data-emotion', data.sprite || 'normal');
    
    textEl.textContent = data.text;
    timeEl.textContent = new Date(data.timestamp).toLocaleTimeString();
    
    notif.classList.remove('hidden', 'hiding');
    playSound('sfx-newmessage');

    if(notificationTimeout) clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        hideNotification();
    }, 10000);
}

function hideNotification() {
    const notif = document.getElementById('broadcast-notification');
    notif.classList.add('hiding');
    setTimeout(() => {
        notif.classList.add('hidden');
        notif.classList.remove('hiding');
    }, 400);
}

async function sendRadioMessage() {
    const input = document.getElementById('radio-input');
    const text = input.value.trim();
    if(!text) return playSound('sfx-error');

    try {
        await apiCall('/radio', 'POST', { text });
        input.value = '';
        playSound('sfx-poweron');
    } catch(e) { playSound('sfx-error'); }
}

async function loadRadioMessages() {
    try {
        const data = await apiCall('/radio');
        const container = document.getElementById('radio-messages');
        if(!container) return;
        container.innerHTML = '';
        if(data.messages.length === 0) {
            container.innerHTML = '<div class="radio-empty">NO MESSAGES</div>';
        } else {
            data.messages.forEach(appendRadioMessage);
        }
    } catch(e) { console.error(e); }
}

function appendRadioMessage(msg) {
    const container = document.getElementById('radio-messages');
    if(!container) return;
    
    if(container.querySelector('.radio-empty')) container.innerHTML = '';

    const div = document.createElement('div');
    div.className = 'radio-message';
    div.setAttribute('data-msg-id', msg.id);
    
    const deleteBtn = currentUser?.isAdmin 
        ? `<button class="radio-delete-btn" onclick="deleteRadio('${msg.id}')">×</button>` 
        : '';

    div.innerHTML = `
        <span class="radio-message-time">[${new Date(msg.timestamp).toLocaleTimeString()}]</span>
        <span class="radio-message-user">${escapeHtml(msg.user)}</span>
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
        btn.onclick = () => showCustomTab(tab);
        container.appendChild(btn);
    });
}

function showCustomTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    let view = document.getElementById(`custom-view-${tab.id}`);
    
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
    }
    
    view.classList.add('active');
}

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

async function loadAnalytics() {
    try {
        const data = await apiCall('/analytics');
        document.getElementById('analytics-total-users').textContent = data.analytics.totalUsers;
        document.getElementById('analytics-active-sessions').textContent = data.analytics.onlineUsers;
        document.getElementById('analytics-broadcasts').textContent = data.analytics.totalBroadcasts;
        document.getElementById('analytics-radio-msgs').textContent = data.analytics.totalRadioMessages;
    } catch(e) { console.error(e); }
}

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

function closeEditUserModal() { document.getElementById('edit-user-modal').classList.add('hidden'); }

function setupInputHandlers() {
    document.getElementById('operator-id')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    document.getElementById('radio-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendRadioMessage(); });
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
            }
        });
    });
}

function setupSpriteSelector() {
    document.querySelectorAll('.sprite-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.sprite-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            document.getElementById('sprite-select').value = opt.dataset.sprite;
        }
    });
}

function showUsersSection(type) {
    document.getElementById('users-active-section').classList.toggle('hidden', type !== 'active');
    document.getElementById('users-banned-section').classList.toggle('hidden', type !== 'banned');
    document.querySelectorAll('.users-tab').forEach(t => t.classList.remove('active'));
    const tabs = document.querySelectorAll('.users-tab');
    if (type === 'active') tabs[0].classList.add('active');
    else tabs[1].classList.add('active');
}

window.handleLogin = handleLogin;
window.handleNewOperator = handleNewOperator;
window.logout = logout;
window.goToHome = goToHome;
window.setAlarmTheme = setAlarmTheme;
window.sendBroadcast = sendBroadcast;
window.hideNotification = hideNotification;
window.sendRadioMessage = sendRadioMessage;
window.clearRadioMessages = clearRadioMessages;
window.deleteRadio = deleteRadio;
window.approveUser = approveUser;
window.denyUser = denyUser;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.editUser = editUser;
window.saveUserChanges = saveUserChanges;
window.showCustomTab = showCustomTab;
window.showUsersSection = showUsersSection;
window.closeIdPopup = closeIdPopup;
window.copyUserId = copyUserId;
window.closeEditUserModal = closeEditUserModal;