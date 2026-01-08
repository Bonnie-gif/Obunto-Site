let currentUser = null;
let currentChat = null;
let editingPersonnel = null;
const ADMIN_ID = '118107921024376';

const storage = {
    async get(key) {
        try {
            if (window.storage && typeof window.storage.get === 'function') {
                return await window.storage.get(key, false);
            }
            const value = localStorage.getItem(key);
            return value ? { key, value } : null;
        } catch (e) {
            const value = localStorage.getItem(key);
            return value ? { key, value } : null;
        }
    },
    async set(key, value) {
        try {
            if (window.storage && typeof window.storage.set === 'function') {
                return await window.storage.set(key, value, false);
            }
            localStorage.setItem(key, value);
            return { key, value };
        } catch (e) {
            localStorage.setItem(key, value);
            return { key, value };
        }
    }
};

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => {});
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

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
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

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

function updateSystemTime() {
    const timeEl = document.getElementById('system-time');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
}
setInterval(updateSystemTime, 1000);

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
            currentUser = users[userId];
            currentUser.id = userId;
            await addOnlineUser(userId, currentUser.name || 'Operator_' + userId.slice(-4));
            playSound('sfx-poweron');
            showScreen('main-screen');
            document.getElementById('current-user-name').textContent = currentUser.name || 'OP_' + userId.slice(-4);
            if (userId === ADMIN_ID) {
                currentUser.isAdmin = true;
                currentUser.name = 'OBUNTO';
                document.getElementById('admin-toggle').classList.remove('hidden');
                document.getElementById('admin-tabs').classList.remove('hidden');
                document.getElementById('personnel-tabs').classList.add('hidden');
                document.getElementById('current-user-name').textContent = 'OBUNTO';
                loadPending('pending-list');
                loadActiveChats();
                loadPersonnelList();
            } else {
                document.getElementById('admin-tabs').classList.add('hidden');
                document.getElementById('personnel-tabs').classList.remove('hidden');
                updateProfile();
                checkPendingHelpRequest();
            }
            goToHome();
            loadRadioMessages();
            loadOnlineUsers();
            loadAlarmLog();
            showToast('Welcome, ' + (currentUser.name || 'Operator'), 'success');
        } else if (!users[userId]) {
            const pendingData = await storage.get('arcs_pending');
            const pending = pendingData ? JSON.parse(pendingData.value) : [];
            if (!pending.find(p => p.id === userId)) {
                pending.push({ id: userId, timestamp: Date.now(), type: 'account' });
                await storage.set('arcs_pending', JSON.stringify(pending));
            }
            playSound('sfx-sent');
            showStatus('REQUEST SENT - AWAITING APPROVAL');
            document.getElementById('operator-id').value = '';
        } else {
            playSound('sfx-denied');
            showStatus('ACCESS DENIED - AWAITING APPROVAL', true);
        }
    } catch (e) {
        playSound('sfx-error');
        showStatus('SYSTEM ERROR - TRY AGAIN', true);
    }
}

document.getElementById('operator-id')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

function updateProfile() {
    if (!currentUser) return;
    const nameEl = document.getElementById('profile-name');
    const idEl = document.getElementById('profile-id');
    const deptEl = document.getElementById('profile-dept');
    const levelEl = document.getElementById('profile-level');
    const photoEl = document.getElementById('profile-photo');
    if (nameEl) nameEl.textContent = currentUser.name || 'Operator_' + currentUser.id.slice(-4);
    if (idEl) idEl.textContent = 'ID: ' + currentUser.id;
    if (deptEl) deptEl.textContent = 'Department: ' + (currentUser.department || '---');
    if (levelEl) levelEl.textContent = 'Level: ' + (currentUser.level || '---');
    if (photoEl && currentUser.photo) photoEl.src = currentUser.photo;
}

function openAdmin() {
    switchTab('adm-tickets');
}

function goToHome() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-home').classList.add('active');
}

async function loadPending(elementId) {
    try {
        const data = await storage.get('arcs_pending');
        const pending = data ? JSON.parse(data.value) : [];
        const list = document.getElementById(elementId);
        if (!list) return;
        list.innerHTML = '';
        const accountRequests = pending.filter(p => p.type === 'account' || !p.type);
        if (accountRequests.length === 0) {
            list.innerHTML = '<div class="no-tickets">No pending requests</div>';
            return;
        }
        accountRequests.forEach(item => {
            const id = item.id || item;
            const div = document.createElement('div');
            div.className = 'ticket-item';
            div.innerHTML = '<div class="ticket-info"><div class="ticket-id">' + id + '</div></div><div class="ticket-actions"><button class="newton-button-small" onclick="approve(\'' + id + '\')">Approve</button><button class="newton-button-small" onclick="deny(\'' + id + '\')">Deny</button></div>';
            list.appendChild(div);
        });
    } catch (e) {}
}

async function approve(id) {
    try {
        const users = await storage.get('arcs_users');
        const data = users ? JSON.parse(users.value) : {};
        data[id] = { id, name: 'Operator_' + id.slice(-4), approved: true, isAdmin: false, level: 1, department: 'operations', createdAt: Date.now() };
        await storage.set('arcs_users', JSON.stringify(data));
        const pending = await storage.get('arcs_pending');
        const pend = pending ? JSON.parse(pending.value) : [];
        const filtered = pend.filter(p => (p.id || p) !== id);
        await storage.set('arcs_pending', JSON.stringify(filtered));
        playSound('sfx-blue');
        showToast('User ' + id + ' approved', 'success');
        loadPending('pending-list');
        loadPersonnelList();
        loadAllUsers();
    } catch (e) {
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
        showToast('User ' + id + ' denied', 'warning');
        loadPending('pending-list');
    } catch (e) {}
}

async function loadPersonnelList() {
    try {
        const usersData = await storage.get('arcs_users');
        const users = usersData ? JSON.parse(usersData.value) : {};
        const list = document.getElementById('personnel-list');
        if (!list) return;
        list.innerHTML = '';
        Object.entries(users).forEach(([id, user]) => {
            if (!user.approved) return;
            const div = document.createElement('div');
            div.className = 'personnel-item';
            div.onclick = () => openPersonnelEditor(id, user);
            div.innerHTML = '<img class="personnel-photo" src="' + (user.photo || 'assets/icon-small-person-16x15.png') + '" alt=""><div class="personnel-info"><div class="personnel-name">' + (user.name || 'Operator_' + id.slice(-4)) + '</div><div class="personnel-meta">' + (user.department || 'operations') + '</div></div><span class="personnel-level">Lv.' + (user.level || 1) + '</span>';
            list.appendChild(div);
        });
    } catch (e) {}
}

function openPersonnelEditor(id, user) {
    editingPersonnel = id;
    document.getElementById('editor-id').value = id;
    document.getElementById('editor-name').value = user.name || '';
    document.getElementById('editor-level').value = user.level || 1;
    document.getElementById('editor-dept').value = user.department || 'operations';
    document.getElementById('editor-photo').src = user.photo || 'assets/icon-small-person-16x15.png';
    document.getElementById('personnel-editor').classList.remove('hidden');
}

function closeEditor() {
    editingPersonnel = null;
    document.getElementById('personnel-editor').classList.add('hidden');
}

async function savePersonnel() {
    if (!editingPersonnel) return;
    try {
        const usersData = await storage.get('arcs_users');
        const users = usersData ? JSON.parse(usersData.value) : {};
        if (users[editingPersonnel]) {
            users[editingPersonnel].name = document.getElementById('editor-name').value;
            users[editingPersonnel].level = parseInt(document.getElementById('editor-level').value);
            users[editingPersonnel].department = document.getElementById('editor-dept').value;
            const photoEl = document.getElementById('editor-photo');
            if (photoEl.src && !photoEl.src.includes('icon-small-person')) {
                users[editingPersonnel].photo = photoEl.src;
            }
            await storage.set('arcs_users', JSON.stringify(users));
            showToast('Personnel updated', 'success');
            loadPersonnelList();
            closeEditor();
        }
    } catch (e) {
        showToast('Error saving', 'error');
    }
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('editor-photo').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

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
            div.className = 'user-item';
            div.innerHTML = '<img class="user-photo" src="' + (user.photo || 'assets/icon-small-person-16x15.png') + '" alt=""><div class="user-details"><div class="user-name">' + (user.name || 'Operator_' + id.slice(-4)) + '</div><div class="user-id">' + id + '</div></div><span class="user-badge ' + (isAdmin ? 'admin' : '') + '">' + (isAdmin ? 'ADMIN' : 'Lv.' + (user.level || 1)) + '</span>';
            list.appendChild(div);
        });
    } catch (e) {}
}

document.querySelectorAll('.sprite-item').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.sprite-item').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        document.getElementById('sprite-select').value = option.dataset.sprite;
    });
});

async function sendBroadcast() {
    const text = document.getElementById('broadcast-text').value.trim();
    const sprite = document.getElementById('sprite-select').value;
    if (!text) {
        playSound('sfx-error');
        showToast('Please enter a message', 'error');
        return;
    }
    const broadcast = { text, sprite, timestamp: Date.now(), sender: currentUser?.name || 'OBUNTO' };
    try {
        const historyData = await storage.get('arcs_broadcasts');
        const history = historyData ? JSON.parse(historyData.value) : [];
        history.push(broadcast);
        if (history.length > 50) history.shift();
        await storage.set('arcs_broadcasts', JSON.stringify(history));
    } catch (e) {}
    playSound('sfx-sent');
    document.getElementById('broadcast-text').value = '';
    showBroadcast(broadcast);
    showToast('Broadcast sent', 'success');
}

function showBroadcast(data) {
    const spriteImg = document.getElementById('notif-sprite');
    spriteImg.src = 'assets/sprites/' + data.sprite + '.png';
    spriteImg.onerror = () => { spriteImg.src = 'assets/sprites/normal.png'; };
    document.getElementById('notif-text').textContent = data.text;
    document.getElementById('broadcast-notification').classList.remove('hidden');
    playSound('sfx-newmessage');
    setTimeout(() => {
        document.getElementById('broadcast-notification').classList.add('hidden');
    }, 8000);
}

async function setAlarm(level) {
    document.body.className = 'alarm-' + level;
    document.getElementById('current-alarm-status').textContent = level.toUpperCase();
    if (level !== 'green') {
        playSound('sfx-alarm');
    }
    try {
        const logData = await storage.get('arcs_alarm_log');
        const log = logData ? JSON.parse(logData.value) : [];
        log.push({ level, timestamp: Date.now(), user: currentUser?.name || 'SYSTEM' });
        if (log.length > 50) log.shift();
        await storage.set('arcs_alarm_log', JSON.stringify(log));
        await storage.set('arcs_current_alarm', level);
        loadAlarmLog();
    } catch (e) {}
    showToast('Alarm set to ' + level.toUpperCase(), level === 'green' ? 'success' : 'warning');
}

async function loadAlarmLog() {
    try {
        const logData = await storage.get('arcs_alarm_log');
        const log = logData ? JSON.parse(logData.value) : [];
        const container = document.getElementById('alarm-log');
        if (!container) return;
        container.innerHTML = '';
        log.slice(-20).reverse().forEach(entry => {
            const div = document.createElement('div');
            div.className = 'log-entry ' + entry.level;
            const time = new Date(entry.timestamp).toLocaleTimeString();
            div.innerHTML = '<span class="log-time">' + time + '</span><span class="log-status">[' + entry.level.toUpperCase() + ']</span> by ' + entry.user;
            container.appendChild(div);
        });
        const currentData = await storage.get('arcs_current_alarm');
        if (currentData) {
            document.body.className = 'alarm-' + currentData.value;
            const statusEl = document.getElementById('current-alarm-status');
            if (statusEl) statusEl.textContent = currentData.value.toUpperCase();
        }
    } catch (e) {}
}

async function sendRadioMessage(isUser = false) {
    const inputId = isUser ? 'usr-radio-input' : 'radio-input';
    const input = document.getElementById(inputId);
    const text = input.value.trim();
    if (!text) return;
    const message = { text, userId: currentUser?.id || 'UNKNOWN', userName: currentUser?.name || 'Unknown', isAdmin: currentUser?.id === ADMIN_ID, timestamp: Date.now() };
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
                div.className = 'radio-message' + (isOwn ? ' own' : '');
                div.innerHTML = '<div class="radio-msg-header"><span class="radio-msg-user' + (msg.isAdmin ? ' admin' : '') + '">' + msg.userName + '</span><span class="radio-msg-time">' + new Date(msg.timestamp).toLocaleTimeString() + '</span></div><div class="radio-msg-text">' + escapeHtml(msg.text) + '</div>';
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        });
    } catch (e) {}
}

document.getElementById('radio-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendRadioMessage(false);
});
document.getElementById('usr-radio-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendRadioMessage(true);
});

async function addOnlineUser(userId, userName) {
    try {
        const onlineData = await storage.get('arcs_online');
        const online = onlineData ? JSON.parse(onlineData.value) : {};
        online[userId] = { name: userName, isAdmin: userId === ADMIN_ID, lastSeen: Date.now() };
        await storage.set('arcs_online', JSON.stringify(online));
    } catch (e) {}
}

async function loadOnlineUsers() {
    try {
        const onlineData = await storage.get('arcs_online');
        const online = onlineData ? JSON.parse(onlineData.value) : {};
        const activeUsers = Object.entries(online).filter(([id, user]) => {
            return Date.now() - user.lastSeen < 5 * 60 * 1000;
        });
        const count = activeUsers.length;
        const countEls = ['online-count', 'usr-online-count'];
        countEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = count + ' online';
        });
    } catch (e) {}
}

setInterval(async () => {
    if (currentUser) {
        await addOnlineUser(currentUser.id, currentUser.name || 'Operator_' + currentUser.id.slice(-4));
        loadOnlineUsers();
        loadRadioMessages();
    }
}, 30000);

async function requestHelp() {
    const reason = document.getElementById('help-reason')?.value.trim() || 'General assistance needed';
    if (!currentUser) {
        showToast('You must be logged in', 'error');
        return;
    }
    try {
        const requestsData = await storage.get('arcs_help_requests');
        const requests = requestsData ? JSON.parse(requestsData.value) : [];
        if (requests.find(r => r.userId === currentUser.id && r.status !== 'closed')) {
            showToast('You already have a pending request', 'warning');
            return;
        }
        requests.push({ id: Date.now().toString(), userId: currentUser.id, userName: currentUser.name || 'Operator_' + currentUser.id.slice(-4), reason, status: 'pending', timestamp: Date.now(), messages: [] });
        await storage.set('arcs_help_requests', JSON.stringify(requests));
        playSound('sfx-sent');
        showToast('Help request sent', 'success');
        document.getElementById('help-form').classList.add('hidden');
        document.getElementById('help-pending').classList.remove('hidden');
        document.getElementById('help-reason').value = '';
    } catch (e) {
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
                document.getElementById('help-form')?.classList.add('hidden');
                document.getElementById('help-pending')?.classList.remove('hidden');
            } else if (myRequest.status === 'active' || myRequest.status === 'wait') {
                openChatWindow(myRequest);
            }
        }
    } catch (e) {}
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
            list.innerHTML = '<div class="no-tickets">No support requests</div>';
            return;
        }
        activeRequests.forEach(req => {
            const div = document.createElement('div');
            div.className = 'ticket-item';
            div.onclick = () => {
                if (req.status === 'pending') {
                    approveHelpRequest(req.id);
                } else {
                    openChatWindow(req);
                }
            };
            div.innerHTML = '<div class="ticket-info"><div class="ticket-id">' + req.userName + '</div><div class="ticket-reason">' + req.reason + '</div></div><span class="ticket-status ' + req.status + '">' + req.status.toUpperCase() + '</span>';
            list.appendChild(div);
        });
    } catch (e) {}
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
            showToast('Chat approved', 'success');
            loadActiveChats();
            openChatWindow(request);
        }
    } catch (e) {}
}

function openChatWindow(request) {
    currentChat = request;
    const chatWindow = document.getElementById('chat-window');
    chatWindow.classList.remove('hidden');
    const isAdmin = currentUser?.id === ADMIN_ID;
    const title = isAdmin ? 'Chat: ' + request.userName : 'Support Chat';
    document.querySelector('.chat-title').textContent = title;
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
        if (request.status === 'wait') {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'chat-status-msg waiting';
            statusDiv.textContent = 'Status: WAIT';
            container.appendChild(statusDiv);
        }
        (request.messages || []).forEach(msg => {
            const isSent = msg.senderId === currentUser?.id;
            const div = document.createElement('div');
            div.className = 'chat-message ' + (isSent ? 'sent' : 'received');
            let content = '';
            if (msg.image) {
                content = '<img src="' + msg.image + '" class="chat-msg-image" onclick="previewImage(this.src)">';
            }
            if (msg.text) {
                content += '<div class="chat-msg-content">' + escapeHtml(msg.text) + '</div>';
            }
            div.innerHTML = content + '<div class="chat-msg-meta"><span>' + msg.senderName + '</span><span>' + new Date(msg.timestamp).toLocaleTimeString() + '</span></div>';
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    } catch (e) {}
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
        request.messages.push({ text, senderId: currentUser?.id, senderName: currentUser?.name || 'Unknown', timestamp: Date.now() });
        if (currentUser?.id === ADMIN_ID && request.status === 'wait') {
            request.status = 'active';
        }
        await storage.set('arcs_help_requests', JSON.stringify(requests));
        input.value = '';
        playSound('sfx-sent');
        loadChatMessages();
    } catch (e) {}
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
            request.messages.push({ image: e.target.result, senderId: currentUser?.id, senderName: currentUser?.name || 'Unknown', timestamp: Date.now() });
            await storage.set('arcs_help_requests', JSON.stringify(requests));
            playSound('sfx-sent');
            loadChatMessages();
        } catch (err) {
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
    modal.innerHTML = '<img src="' + src + '" alt="Preview">';
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
            showToast('Status set to ' + status.toUpperCase(), 'info');
            loadChatMessages();
            loadActiveChats();
        }
    } catch (e) {}
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
            document.getElementById('help-form')?.classList.remove('hidden');
            document.getElementById('help-pending')?.classList.add('hidden');
        }
    } catch (e) {}
}

document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

function switchTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(targetId)?.classList.add('active');
    document.querySelector('[data-target="' + targetId + '"]')?.classList.add('active');
    if (targetId === 'adm-tickets') {
        loadPending('pending-list');
        loadActiveChats();
    } else if (targetId === 'adm-credentials') {
        loadAllUsers();
    } else if (targetId === 'adm-radio' || targetId === 'usr-radio') {
        loadRadioMessages();
        loadOnlineUsers();
    } else if (targetId === 'adm-monitoring') {
        loadPersonnelList();
    } else if (targetId === 'adm-alarms') {
        loadAlarmLog();
    }
}

document.querySelectorAll('.menu-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-target');
        switchTab(target);
    });
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function init() {
    try {
        const users = await storage.get('arcs_users');
        if (!users) {
            await storage.set('arcs_users', JSON.stringify({ [ADMIN_ID]: { id: ADMIN_ID, name: 'OBUNTO', approved: true, isAdmin: true, level: 5, department: 'administration' } }));
        }
        const pending = await storage.get('arcs_pending');
        if (!pending) {
            await storage.set('arcs_pending', JSON.stringify([]));
        }
        const radio = await storage.get('arcs_radio');
        if (!radio) {
            await storage.set('arcs_radio', JSON.stringify([]));
        }
        const help = await storage.get('arcs_help_requests');
        if (!help) {
            await storage.set('arcs_help_requests', JSON.stringify([]));
        }
        const broadcasts = await storage.get('arcs_broadcasts');
        if (!broadcasts) {
            await storage.set('arcs_broadcasts', JSON.stringify([]));
        }
        const alarmLog = await storage.get('arcs_alarm_log');
        if (!alarmLog) {
            await storage.set('arcs_alarm_log', JSON.stringify([]));
        }
    } catch (e) {}
}

window.addEventListener('load', async () => {
    await init();
    updateSystemTime();
    setTimeout(startLoading, 800);
});

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