// ==================== ARCS NEWTON OS - MAIN SCRIPT ====================
let currentUser = null;
let currentChat = null;
let onlineUsers = new Set();
const ADMIN_ID = '118107921024376';

// ==================== STORAGE SYSTEM ====================
const storage = {
    async get(key, shared = false) {
        try {
            if (window.storage && typeof window.storage.get === 'function') {
                return await window.storage.get(key, shared);
            }
            const value = localStorage.getItem(key);
            return value ? { key, value, shared } : null;
        } catch (e) {
            const value = localStorage.getItem(key);
            return value ? { key, value, shared } : null;
        }
    },
    async set(key, value, shared = false) {
        try {
            if (window.storage && typeof window.storage.set === 'function') {
                return await window.storage.set(key, value, shared);
            }
            localStorage.setItem(key, value);
            return { key, value, shared };
        } catch (e) {
            localStorage.setItem(key, value);
            return { key, value, shared };
        }
    },
    async delete(key, shared = false) {
        try {
            if (window.storage && typeof window.storage.delete === 'function') {
                return await window.storage.delete(key, shared);
            }
            localStorage.removeItem(key);
            return { key, deleted: true, shared };
        } catch (e) {
            localStorage.removeItem(key);
            return { key, deleted: true, shared };
        }
    }
};

// ==================== SOUND SYSTEM ====================
function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => {});
    }
}

// ==================== SCREEN MANAGEMENT ====================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ==================== STATUS MESSAGES ====================
function showStatus(message, isError = false) {
    const status = document.getElementById('login-status');
    status.textContent = message;
    status.className = 'login-status show';
    if (isError) status.classList.add('error');
    setTimeout(() => status.classList.remove('show'), 4000);
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-text">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== LOADING SCREEN ====================
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
                playSound('sfx-poweron');
            }, 600);
        } else {
            bar.style.width = progress + '%';
        }
    }, 180);
}

// ==================== SYSTEM TIME ====================
function updateSystemTime() {
    const timeEl = document.getElementById('system-time');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
}
setInterval(updateSystemTime, 1000);

// ==================== LOGIN SYSTEM ====================
async function handleLogin() {
    const userId = document.getElementById('operator-id').value.trim().toUpperCase();
    
    if (!userId) {
        playSound('sfx-error');
        showStatus('PLEASE ENTER AN OPERATOR ID', true);
        return;
    }
    
    if (userId.length < 5) {
        playSound('sfx-error');
        showStatus('ID MUST BE AT LEAST 5 CHARACTERS', true);
        return;
    }
    
    try {
        await init();
        
        const usersData = await storage.get('arcs_users');
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        if (users[userId] && users[userId].approved) {
            // User exists and is approved - login
            currentUser = users[userId];
            currentUser.id = userId;
            
            // Add to online users
            await addOnlineUser(userId, currentUser.name || `Operator_${userId.slice(-4)}`);
            
            playSound('sfx-poweron');
            showScreen('main-screen');
            
            // Update UI
            document.getElementById('current-user-name').textContent = currentUser.name || `OP_${userId.slice(-4)}`;
            
            if (userId === ADMIN_ID) {
                currentUser.isAdmin = true;
                currentUser.name = 'OBUNTO';
                document.getElementById('admin-toggle').classList.remove('hidden');
                document.getElementById('admin-tabs').classList.remove('hidden');
                document.getElementById('personnel-tabs').classList.add('hidden');
                document.getElementById('current-user-name').textContent = 'OBUNTO ⭐';
                loadPending('pending-list');
                loadActiveChats();
            } else {
                document.getElementById('admin-tabs').classList.add('hidden');
                document.getElementById('personnel-tabs').classList.remove('hidden');
                updateProfile();
                checkPendingHelpRequest();
            }
            
            goToHome();
            loadRadioMessages();
            loadOnlineUsers();
            showToast(`Welcome, ${currentUser.name || 'Operator'}!`, 'success');
            
        } else if (!users[userId]) {
            // New user - create request
            const pendingData = await storage.get('arcs_pending');
            const pending = pendingData ? JSON.parse(pendingData.value) : [];
            
            if (!pending.find(p => p.id === userId)) {
                pending.push({
                    id: userId,
                    timestamp: Date.now(),
                    type: 'account'
                });
                await storage.set('arcs_pending', JSON.stringify(pending));
            }
            
            playSound('sfx-sent');
            showStatus('REQUEST SENT - AWAITING APPROVAL');
            document.getElementById('operator-id').value = '';
        } else {
            // User exists but not approved
            playSound('sfx-denied');
            showStatus('ACCESS DENIED - AWAITING APPROVAL', true);
        }
    } catch (e) {
        console.error('Login error:', e);
        playSound('sfx-error');
        showStatus('SYSTEM ERROR - TRY AGAIN', true);
    }
}

// Enter key for login
document.getElementById('operator-id')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

// ==================== PROFILE ====================
function updateProfile() {
    if (!currentUser) return;
    
    const nameEl = document.getElementById('profile-name');
    const idEl = document.getElementById('profile-id');
    
    if (nameEl) nameEl.textContent = currentUser.name || `Operator_${currentUser.id.slice(-4)}`;
    if (idEl) idEl.textContent = `ID: ${currentUser.id}`;
}

// ==================== ADMIN PANEL ====================
function openAdmin() {
    document.getElementById('admin-panel').classList.remove('hidden');
    loadPending('pending-list-modal');
}

function closeAdmin() {
    document.getElementById('admin-panel').classList.add('hidden');
}

function goToHome() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-home').classList.add('active');
}

// ==================== PENDING APPROVALS ====================
async function loadPending(elementId) {
    try {
        const data = await storage.get('arcs_pending');
        const pending = data ? JSON.parse(data.value) : [];
        const list = document.getElementById(elementId);
        if (!list) return;

        list.innerHTML = '';
        
        const accountRequests = pending.filter(p => p.type === 'account' || !p.type);
        
        if (accountRequests.length === 0) {
            list.innerHTML = `
                <div class="no-pending">
                    <div class="no-pending-icon">📋</div>
                    <div class="no-pending-text">NO PENDING REQUESTS</div>
                </div>
            `;
            return;
        }
        
        accountRequests.forEach(item => {
            const id = item.id || item;
            const div = document.createElement('div');
            div.className = 'pending-item';
            div.innerHTML = `
                <span>${id}</span>
                <div class="actions">
                    <button onclick="approve('${id}')">APPROVE</button>
                    <button onclick="deny('${id}')">DENY</button>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Load pending error:', e);
    }
}

async function approve(id) {
    try {
        const users = await storage.get('arcs_users');
        const data = users ? JSON.parse(users.value) : {};
        
        data[id] = { 
            id, 
            name: `Operator_${id.slice(-4)}`,
            approved: true,
            isAdmin: false,
            createdAt: Date.now()
        };
        await storage.set('arcs_users', JSON.stringify(data));
        
        const pending = await storage.get('arcs_pending');
        const pend = pending ? JSON.parse(pending.value) : [];
        const filtered = pend.filter(p => (p.id || p) !== id);
        await storage.set('arcs_pending', JSON.stringify(filtered));
        
        playSound('sfx-blue');
        showToast(`User ${id} approved!`, 'success');
        loadPending('pending-list');
        loadPending('pending-list-modal');
        loadAllUsers();
    } catch (e) {
        console.error('Approve error:', e);
        showToast('Error approving user', 'error');
    }
}

async function deny(id) {
    try {
        const pending = await storage.get('arcs_pending');
        const pend = pending ? JSON.parse(pending.value) : [];
        const filtered = pend.filter(p => (p.id || p) !== id);
        await storage.set('arcs_pending', JSON.stringify(filtered));
        
        playSound('sfx-denied');
        showToast(`User ${id} denied`, 'warning');
        loadPending('pending-list');
        loadPending('pending-list-modal');
    } catch (e) {
        console.error('Deny error:', e);
    }
}

// ==================== ALL USERS ====================
async function loadAllUsers() {
    try {
        const usersData = await storage.get('arcs_users');
        const users = usersData ? JSON.parse(usersData.value) : {};
        const list = document.getElementById('all-users-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        Object.entries(users).forEach(([id, user]) => {
            if (!user.approved) return;
            
            const isAdmin = id === ADMIN_ID;
            const div = document.createElement('div');
            div.className = `user-item ${isAdmin ? 'admin' : ''}`;
            div.innerHTML = `
                <div class="user-avatar">${isAdmin ? '⭐' : '◉'}</div>
                <div class="user-details">
                    <div class="user-name">${user.name || `Operator_${id.slice(-4)}`}</div>
                    <div class="user-id">ID: ${id}</div>
                </div>
                <span class="user-badge ${isAdmin ? 'admin' : 'operator'}">${isAdmin ? 'ADMIN' : 'OPERATOR'}</span>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Load users error:', e);
    }
}

// ==================== SPRITE SELECTOR ====================
document.querySelectorAll('.sprite-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.sprite-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        document.getElementById('sprite-select').value = option.dataset.sprite;
    });
});

// ==================== BROADCAST SYSTEM ====================
async function sendBroadcast() {
    const text = document.getElementById('broadcast-text').value.trim();
    const sprite = document.getElementById('sprite-select').value;
    
    if (!text) {
        playSound('sfx-error');
        showToast('Please enter a message', 'error');
        return;
    }
    
    const broadcast = {
        text,
        sprite,
        timestamp: Date.now(),
        sender: currentUser?.name || 'OBUNTO'
    };
    
    // Save to history
    try {
        const historyData = await storage.get('arcs_broadcasts');
        const history = historyData ? JSON.parse(historyData.value) : [];
        history.push(broadcast);
        if (history.length > 50) history.shift();
        await storage.set('arcs_broadcasts', JSON.stringify(history));
    } catch (e) {
        console.error('Save broadcast error:', e);
    }
    
    playSound('sfx-sent');
    document.getElementById('broadcast-text').value = '';
    
    showBroadcast(broadcast);
    loadBroadcastHistory();
    showToast('Broadcast sent!', 'success');
}

function showBroadcast(data) {
    const spriteImg = document.getElementById('notif-sprite');
    spriteImg.src = `assets/sprites/${data.sprite}.png`;
    spriteImg.onerror = () => {
        spriteImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><rect fill="%23333" width="50" height="50"/><text x="25" y="30" text-anchor="middle" fill="%23fff" font-size="20">😐</text></svg>';
    };
    
    document.getElementById('notif-text').textContent = data.text;
    document.getElementById('broadcast-notification').classList.remove('hidden');
    
    playSound('sfx-newmessage');
    
    setTimeout(() => {
        document.getElementById('broadcast-notification').classList.add('hidden');
    }, 8000);
}

async function loadBroadcastHistory() {
    try {
        const historyData = await storage.get('arcs_broadcasts');
        const history = historyData ? JSON.parse(historyData.value) : [];
        const list = document.getElementById('broadcast-history-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        history.slice(-5).reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                ${item.text}
                <span class="time">${new Date(item.timestamp).toLocaleTimeString()}</span>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Load history error:', e);
    }
}

// ==================== GLOBAL RADIO ====================
async function sendRadioMessage(isUser = false) {
    const inputId = isUser ? 'usr-radio-input' : 'radio-input';
    const input = document.getElementById(inputId);
    const text = input.value.trim();
    
    if (!text) return;
    
    const message = {
        text,
        userId: currentUser?.id || 'UNKNOWN',
        userName: currentUser?.name || 'Unknown',
        isAdmin: currentUser?.id === ADMIN_ID,
        timestamp: Date.now()
    };
    
    try {
        const messagesData = await storage.get('arcs_radio');
        const messages = messagesData ? JSON.parse(messagesData.value) : [];
        messages.push(message);
        if (messages.length > 100) messages.shift();
        await storage.set('arcs_radio', JSON.stringify(messages));
        
        input.value = '';
        playSound('sfx-sent');
        loadRadioMessages();
    } catch (e) {
        console.error('Send radio error:', e);
        showToast('Failed to send message', 'error');
    }
}

async function loadRadioMessages() {
    try {
        const messagesData = await storage.get('arcs_radio');
        const messages = messagesData ? JSON.parse(messagesData.value) : [];
        
        const containers = ['radio-messages', 'usr-radio-messages'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = '';
            
            messages.slice(-50).forEach(msg => {
                const isOwn = msg.userId === currentUser?.id;
                const div = document.createElement('div');
                div.className = `radio-message ${isOwn ? 'own' : ''}`;
                div.innerHTML = `
                    <div class="radio-message-header">
                        <span class="radio-message-user">${msg.isAdmin ? '⭐ ' : ''}${msg.userName}</span>
                        <span class="radio-message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="radio-message-text">${escapeHtml(msg.text)}</div>
                `;
                container.appendChild(div);
            });
            
            container.scrollTop = container.scrollHeight;
        });
    } catch (e) {
        console.error('Load radio error:', e);
    }
}

// Radio input enter key
document.getElementById('radio-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendRadioMessage(false);
});
document.getElementById('usr-radio-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendRadioMessage(true);
});

// ==================== ONLINE USERS ====================
async function addOnlineUser(userId, userName) {
    try {
        const onlineData = await storage.get('arcs_online');
        const online = onlineData ? JSON.parse(onlineData.value) : {};
        
        online[userId] = {
            name: userName,
            isAdmin: userId === ADMIN_ID,
            lastSeen: Date.now()
        };
        
        await storage.set('arcs_online', JSON.stringify(online));
    } catch (e) {
        console.error('Add online user error:', e);
    }
}

async function loadOnlineUsers() {
    try {
        const onlineData = await storage.get('arcs_online');
        const online = onlineData ? JSON.parse(onlineData.value) : {};
        
        // Filter users seen in last 5 minutes
        const activeUsers = Object.entries(online).filter(([id, user]) => {
            return Date.now() - user.lastSeen < 5 * 60 * 1000;
        });
        
        const containers = ['online-users-list', 'usr-online-users-list'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = '';
            
            if (activeUsers.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">No users online</div>';
                return;
            }
            
            activeUsers.forEach(([id, user]) => {
                const div = document.createElement('div');
                div.className = `online-user ${user.isAdmin ? 'admin' : ''}`;
                div.innerHTML = `
                    <span class="online-user-dot"></span>
                    <span class="online-user-name">${user.name}</span>
                `;
                container.appendChild(div);
            });
        });
    } catch (e) {
        console.error('Load online users error:', e);
    }
}

// Update online status periodically
setInterval(async () => {
    if (currentUser) {
        await addOnlineUser(currentUser.id, currentUser.name || `Operator_${currentUser.id.slice(-4)}`);
        loadOnlineUsers();
        loadRadioMessages();
    }
}, 30000);

// ==================== HELP REQUEST / SUPPORT CHAT ====================
async function requestHelp() {
    const reason = document.getElementById('help-reason')?.value.trim() || 'General assistance needed';
    
    if (!currentUser) {
        showToast('You must be logged in', 'error');
        return;
    }
    
    try {
        const requestsData = await storage.get('arcs_help_requests');
        const requests = requestsData ? JSON.parse(requestsData.value) : [];
        
        // Check if already has pending request
        if (requests.find(r => r.userId === currentUser.id && r.status !== 'closed')) {
            showToast('You already have a pending request', 'warning');
            return;
        }
        
        requests.push({
            id: Date.now().toString(),
            userId: currentUser.id,
            userName: currentUser.name || `Operator_${currentUser.id.slice(-4)}`,
            reason,
            status: 'pending',
            timestamp: Date.now(),
            messages: []
        });
        
        await storage.set('arcs_help_requests', JSON.stringify(requests));
        
        playSound('sfx-sent');
        showToast('Help request sent!', 'success');
        
        document.getElementById('help-request-btn').classList.add('hidden');
        document.getElementById('help-pending').classList.remove('hidden');
        document.getElementById('help-reason').value = '';
        
    } catch (e) {
        console.error('Help request error:', e);
        showToast('Failed to send request', 'error');
    }
}

async function checkPendingHelpRequest() {
    if (!currentUser || currentUser.id === ADMIN_ID) return;
    
    try {
        const requestsData = await storage.get('arcs_help_requests');
        const requests = requestsData ? JSON.parse(requestsData.value) : [];
        
        const myRequest = requests.find(r => r.userId === currentUser.id && r.status !== 'closed');
        
        if (myRequest) {
            if (myRequest.status === 'pending') {
                document.getElementById('help-request-btn')?.classList.add('hidden');
                document.getElementById('help-pending')?.classList.remove('hidden');
            } else if (myRequest.status === 'active') {
                openChatWindow(myRequest);
            }
        }
    } catch (e) {
        console.error('Check help request error:', e);
    }
}

async function loadActiveChats() {
    if (!currentUser || currentUser.id !== ADMIN_ID) return;
    
    try {
        const requestsData = await storage.get('arcs_help_requests');
        const requests = requestsData ? JSON.parse(requestsData.value) : [];
        
        const list = document.getElementById('active-chats-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        const activeRequests = requests.filter(r => r.status !== 'closed');
        
        if (activeRequests.length === 0) {
            list.innerHTML = `
                <div class="no-pending">
                    <div class="no-pending-icon">💬</div>
                    <div class="no-pending-text">NO ACTIVE CHATS</div>
                </div>
            `;
            return;
        }
        
        activeRequests.forEach(req => {
            const div = document.createElement('div');
            div.className = `active-chat-item ${req.status}`;
            div.onclick = () => {
                if (req.status === 'pending') {
                    approveHelpRequest(req.id);
                } else {
                    openChatWindow(req);
                }
            };
            div.innerHTML = `
                <div class="chat-item-header">
                    <span class="chat-item-user">${req.userName}</span>
                    <span class="chat-item-status ${req.status}">${req.status.toUpperCase()}</span>
                </div>
                <div class="chat-item-preview">${req.reason}</div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Load active chats error:', e);
    }
}

async function approveHelpRequest(requestId) {
    try {
        const requestsData = await storage.get('arcs_help_requests');
        const requests = requestsData ? JSON.parse(requestsData.value) : [];
        
        const request = requests.find(r => r.id === requestId);
        if (request) {
            request.status = 'active';
            await storage.set('arcs_help_requests', JSON.stringify(requests));
            
            playSound('sfx-blue');
            showToast('Chat approved!', 'success');
            loadActiveChats();
            openChatWindow(request);
        }
    } catch (e) {
        console.error('Approve help error:', e);
    }
}

// ==================== CHAT WINDOW ====================
function openChatWindow(request) {
    currentChat = request;
    
    const chatWindow = document.getElementById('chat-window');
    chatWindow.classList.remove('hidden');
    
    const isAdmin = currentUser?.id === ADMIN_ID;
    const title = isAdmin ? `💬 CHAT WITH ${request.userName}` : '💬 SUPPORT CHAT WITH OBUNTO';
    document.querySelector('.chat-title').textContent = title;
    
    // Show/hide admin controls
    const waitBtn = document.querySelector('.wait-btn');
    const leaveBtn = document.querySelector('.leave-btn');
    
    if (isAdmin) {
        waitBtn.style.display = 'block';
        leaveBtn.textContent = '✕ CLOSE';
    } else {
        waitBtn.style.display = 'none';
        leaveBtn.textContent = '✕ LEAVE';
    }
    
    loadChatMessages();
}

async function loadChatMessages() {
    if (!currentChat) return;
    
    try {
        const requestsData = await storage.get('arcs_help_requests');
        const requests = requestsData ? JSON.parse(requestsData.value) : [];
        
        const request = requests.find(r => r.id === currentChat.id);
        if (!request) return;
        
        currentChat = request;
        
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';
        
        // Show status if waiting
        if (request.status === 'waiting') {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'chat-status-message waiting';
            statusDiv.innerHTML = '<span>⏸ Administrator has set status to WAIT</span>';
            container.appendChild(statusDiv);
        }
        
        (request.messages || []).forEach(msg => {
            const isSent = msg.senderId === currentUser?.id;
            const div = document.createElement('div');
            div.className = `chat-message ${isSent ? 'sent' : 'received'}`;
            
            let content = '';
            if (msg.image) {
                content = `<img src="${msg.image}" class="chat-message-image" onclick="previewImage('${msg.image}')">`;
            }
            content += `<div class="chat-message-content">${escapeHtml(msg.text || '')}</div>`;
            
            div.innerHTML = `
                ${content}
                <div class="chat-message-meta">
                    <span class="chat-message-sender">${msg.senderName}</span>
                    <span class="chat-message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
            `;
            container.appendChild(div);
        });
        
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        console.error('Load chat messages error:', e);
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    
    if (!text || !currentChat) return;
    
    try {
        const requestsData = await storage.get('arcs_help_requests');
        const requests = requestsData ? JSON.parse(requestsData.value) : [];
        
        const request = requests.find(r => r.id === currentChat.id);
        if (!request) return;
        
        if (!request.messages) request.messages = [];
        
        request.messages.push({
            text,
            senderId: currentUser?.id,
            senderName: currentUser?.name || 'Unknown',
            timestamp: Date.now()
        });
        
        // If admin is responding, set status to active
        if (currentUser?.id === ADMIN_ID && request.status === 'waiting') {
            request.status = 'active';
        }
        
        await storage.set('arcs_help_requests', JSON.stringify(requests));
        
        input.value = '';
        playSound('sfx-sent');
        loadChatMessages();
    } catch (e) {
        console.error('Send chat message error:', e);
    }
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file || !currentChat) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const requestsData = await storage.get('arcs_help_requests');
            const requests = requestsData ? JSON.parse(requestsData.value) : [];
            
            const request = requests.find(r => r.id === currentChat.id);
            if (!request) return;
            
            if (!request.messages) request.messages = [];
            
            request.messages.push({
                image: e.target.result,
                senderId: currentUser?.id,
                senderName: currentUser?.name || 'Unknown',
                timestamp: Date.now()
            });
            
            await storage.set('arcs_help_requests', JSON.stringify(requests));
            
            playSound('sfx-sent');
            loadChatMessages();
        } catch (err) {
            console.error('Upload image error:', err);
            showToast('Failed to upload image', 'error');
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function previewImage(src) {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.onclick = () => modal.remove();
    modal.innerHTML = `<img src="${src}" alt="Preview">`;
    document.body.appendChild(modal);
}

async function setChatStatus(status) {
    if (!currentChat) return;
    
    try {
        const requestsData = await storage.get('arcs_help_requests');
        const requests = requestsData ? JSON.parse(requestsData.value) : [];
        
        const request = requests.find(r => r.id === currentChat.id);
        if (request) {
            request.status = status;
            await storage.set('arcs_help_requests', JSON.stringify(requests));
            
            showToast(`Status set to ${status.toUpperCase()}`, 'info');
            loadChatMessages();
            loadActiveChats();
        }
    } catch (e) {
        console.error('Set chat status error:', e);
    }
}

async function endChat() {
    if (!currentChat) return;
    
    try {
        const requestsData = await storage.get('arcs_help_requests');
        const requests = requestsData ? JSON.parse(requestsData.value) : [];
        
        const request = requests.find(r => r.id === currentChat.id);
        if (request) {
            request.status = 'closed';
            await storage.set('arcs_help_requests', JSON.stringify(requests));
        }
        
        document.getElementById('chat-window').classList.add('hidden');
        currentChat = null;
        
        playSound('sfx-denied');
        showToast('Chat ended', 'info');
        
        if (currentUser?.id === ADMIN_ID) {
            loadActiveChats();
        } else {
            document.getElementById('help-request-btn')?.classList.remove('hidden');
            document.getElementById('help-pending')?.classList.add('hidden');
        }
    } catch (e) {
        console.error('End chat error:', e);
    }
}

// Chat input enter key
document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// ==================== SUGGESTIONS ====================
async function sendSuggestion() {
    const text = document.getElementById('suggestion-text')?.value.trim();
    
    if (!text) {
        showToast('Please enter a suggestion', 'warning');
        return;
    }
    
    try {
        const suggestionsData = await storage.get('arcs_suggestions');
        const suggestions = suggestionsData ? JSON.parse(suggestionsData.value) : [];
        
        suggestions.push({
            text,
            userId: currentUser?.id,
            userName: currentUser?.name,
            timestamp: Date.now()
        });
        
        await storage.set('arcs_suggestions', JSON.stringify(suggestions));
        
        document.getElementById('suggestion-text').value = '';
        playSound('sfx-sent');
        showToast('Suggestion submitted!', 'success');
    } catch (e) {
        console.error('Send suggestion error:', e);
        showToast('Failed to submit suggestion', 'error');
    }
}

// ==================== TAB SWITCHING ====================
function switchTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(targetId)?.classList.add('active');
    
    // Load specific content
    if (targetId === 'adm-tickets') {
        loadPending('pending-list');
        loadActiveChats();
    } else if (targetId === 'adm-credentials') {
        loadAllUsers();
    } else if (targetId === 'adm-radio' || targetId === 'usr-radio') {
        loadRadioMessages();
        loadOnlineUsers();
    } else if (targetId === 'adm-broadcast') {
        loadBroadcastHistory();
    }
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const parentId = tab.parentElement.id;
        document.querySelectorAll(`#${parentId} .tab`).forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = tab.getAttribute('data-target');
        switchTab(target);
    });
});

// ==================== UTILITY FUNCTIONS ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== INITIALIZATION ====================
async function init() {
    try {
        // Initialize users
        const users = await storage.get('arcs_users');
        if (!users) {
            await storage.set('arcs_users', JSON.stringify({ 
                [ADMIN_ID]: { 
                    id: ADMIN_ID, 
                    name: 'OBUNTO',
                    approved: true,
                    isAdmin: true 
                } 
            }));
        }
        
        // Initialize pending
        const pending = await storage.get('arcs_pending');
        if (!pending) {
            await storage.set('arcs_pending', JSON.stringify([]));
        }
        
        // Initialize radio
        const radio = await storage.get('arcs_radio');
        if (!radio) {
            await storage.set('arcs_radio', JSON.stringify([]));
        }
        
        // Initialize help requests
        const help = await storage.get('arcs_help_requests');
        if (!help) {
            await storage.set('arcs_help_requests', JSON.stringify([]));
        }
        
        // Initialize broadcasts
        const broadcasts = await storage.get('arcs_broadcasts');
        if (!broadcasts) {
            await storage.set('arcs_broadcasts', JSON.stringify([]));
        }
        
    } catch (e) {
        console.error('Init error:', e);
    }
}

// ==================== WINDOW LOAD ====================
window.addEventListener('load', async () => {
    await init();
    updateSystemTime();
    setTimeout(startLoading, 800);
});

// Periodic updates
setInterval(() => {
    if (currentUser) {
        if (currentChat) {
            loadChatMessages();
        }
        if (currentUser.id === ADMIN_ID) {
            loadActiveChats();
        }
    }
}, 5000);