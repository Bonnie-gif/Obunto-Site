let currentUser = null;
let socket = null;
const ADMIN_ID = '118107921024376';
let currentRadioChannel = '99.4';
let monitoringInterval = null;
let monitoringLogs = [];
let authToken = null;

const sprites = ['normal', 'happy', 'sad', 'annoyed', 'bug', 'dizzy', 'hollow', 'panic', 'sleeping', 'smug', 'stare', 'suspicious', 'werror'];

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
    if (!status) return;
    status.textContent = message;
    status.className = 'login-status show';
    if (isError) status.classList.add('error');
    setTimeout(() => status.classList.remove('show'), 3000);
}

function showGlobalError(message) {
    const errorDiv = document.getElementById('error-notification');
    const errorContent = document.getElementById('error-content');
    if (!errorDiv || !errorContent) return;
    errorContent.textContent = message;
    errorDiv.classList.remove('hidden');
    playSound('sfx-error');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

function startLoading() {
    playSound('sfx-loading');
    let progress = 0;
    const bar = document.getElementById('loading-progress');
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
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

function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform
    };
}

async function handleLogin() {
    const userId = document.getElementById('operator-id').value.trim();
    const password = document.getElementById('operator-password').value;
    
    if (!userId) {
        playSound('sfx-error');
        showStatus('PLEASE ENTER AN OPERATOR ID', true);
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId, 
                password,
                deviceInfo: getDeviceInfo()
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 404) {
                const createResponse = await fetch('/api/create-account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                });
                
                const createData = await createResponse.json();
                
                if (createResponse.ok) {
                    playSound('sfx-sent');
                    showStatus('REQUEST SENT - AWAITING APPROVAL');
                    document.getElementById('operator-id').value = '';
                    document.getElementById('operator-password').value = '';
                } else {
                    playSound('sfx-denied');
                    showStatus(createData.message, true);
                }
                return;
            }
            
            playSound('sfx-denied');
            showStatus(data.message, true);
            return;
        }
        
        currentUser = data.userData;
        authToken = data.token;
        playSound('sfx-poweron');
        showScreen('main-screen');
        
        initSocket();
        initSpriteSelector();
        
        if (currentUser.isAdmin) {
            setupAdminTabs();
            loadPending();
            loadActiveUsers();
            loadBannedUsers();
            loadTickets();
            loadAlarms();
            initializeMonitoring();
            startAutoMonitoring();
        } else {
            setupUserTabs();
            loadMyTickets();
        }
        
        updateUserDisplay();
        goToHome();
        loadBroadcastHistory();
        joinRadioChannel();
        
    } catch (e) {
        console.error('Login error:', e);
        playSound('sfx-error');
        showStatus('SYSTEM ERROR - TRY AGAIN', true);
    }
}

function setupAdminTabs() {
    const adminTabs = document.getElementById('admin-tabs');
    if (!adminTabs) return;
    
    adminTabs.innerHTML = '';
    adminTabs.classList.remove('hidden');
    document.getElementById('personnel-tabs').classList.add('hidden');
    
    const tabs = [
        { id: 'adm-broadcast', label: 'BROADCAST' },
        { id: 'adm-monitoring', label: 'MONITORING' },
        { id: 'adm-alarms', label: 'ALARMS' },
        { id: 'adm-tickets', label: 'TICKETS' },
        { id: 'adm-radio', label: 'RADIO' },
        { id: 'adm-credentials', label: 'CREDENTIALS' },
        { id: 'adm-users', label: 'USERS' },
        { id: 'adm-analytics', label: 'ANALYTICS' }
    ];
    
    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = 'tab';
        tabEl.setAttribute('data-target', tab.id);
        tabEl.textContent = tab.label;
        tabEl.onclick = function() {
            switchTab(tab.id);
        };
        adminTabs.appendChild(tabEl);
    });
}

function setupUserTabs() {
    const userTabs = document.getElementById('personnel-tabs');
    if (!userTabs) return;
    
    userTabs.innerHTML = '';
    userTabs.classList.remove('hidden');
    document.getElementById('admin-tabs').classList.add('hidden');
    
    const tabs = [
        { id: 'usr-profile', label: 'PROFILE' },
        { id: 'usr-workstation', label: 'WORKSTATION' },
        { id: 'usr-radio', label: 'RADIO' },
        { id: 'usr-help', label: 'HELP REQUEST' }
    ];
    
    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = 'tab';
        tabEl.setAttribute('data-target', tab.id);
        tabEl.textContent = tab.label;
        tabEl.onclick = function() {
            switchTab(tab.id);
        };
        userTabs.appendChild(tabEl);
    });
}

function initSpriteSelector() {
    const selector = document.getElementById('sprite-selector');
    if (!selector) return;
    
    selector.innerHTML = '';
    sprites.forEach(sprite => {
        const option = document.createElement('div');
        option.className = 'sprite-option';
        if (sprite === 'normal') option.classList.add('active');
        option.setAttribute('data-sprite', sprite);
        option.innerHTML = `
            <img src="assets/sprites/${sprite}.png" alt="${sprite}">
            <span>${sprite}</span>
        `;
        option.onclick = function() {
            document.querySelectorAll('.sprite-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            document.getElementById('sprite-select').value = sprite;
        };
        selector.appendChild(option);
    });
}

function updateUserDisplay() {
    const userName = document.getElementById('current-user-name');
    if (userName && currentUser) {
        userName.textContent = currentUser.name.toUpperCase();
    }
}

async function handleLogout() {
    if (!currentUser) return;
    
    try {
        await fetch('/api/logout', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        if (socket) socket.disconnect();
        if (monitoringInterval) clearInterval(monitoringInterval);
        
        currentUser = null;
        authToken = null;
        showScreen('loading-screen');
        document.getElementById('operator-id').value = '';
        document.getElementById('operator-password').value = '';
        
        setTimeout(() => {
            document.getElementById('login-panel').classList.remove('hidden');
        }, 500);
        
    } catch (e) {
        console.error('Logout error:', e);
    }
}

function initSocket() {
    if (typeof io === 'undefined') {
        console.error('Socket.io not loaded');
        return;
    }
    
    socket = io();
    
    socket.on('connect', () => {
        console.log('Socket connected');
        if (currentUser) {
            socket.emit('register', currentUser.id);
        }
    });
    
    socket.on('broadcast', (data) => {
        showBroadcast(data);
    });
    
    socket.on('chat_message', (message) => {
        if (message.receiverId === currentUser.id || message.senderId === currentUser.id) {
            renderChatMessage(message);
        }
    });
    
    socket.on('user_online', (data) => {
        logMonitoring(`USER ONLINE: ${data.name}`);
        if (currentUser && currentUser.isAdmin) {
            loadActiveUsers();
        }
    });
    
    socket.on('user_offline', (userId) => {
        logMonitoring(`USER OFFLINE: ${userId}`);
        if (currentUser && currentUser.isAdmin) {
            loadActiveUsers();
        }
    });
    
    socket.on('ticket_created', (ticket) => {
        logMonitoring(`NEW TICKET: ${ticket.subject}`);
        if (currentUser && currentUser.isAdmin) {
            loadTickets();
        }
    });
    
    socket.on('ticket_updated', (ticket) => {
        logMonitoring(`TICKET UPDATED: ${ticket.id}`);
        loadTickets();
        loadMyTickets();
    });
    
    socket.on('alarm_triggered', (alarm) => {
        playSound('sfx-error');
        showGlobalError(`ALARM: ${alarm.details}`);
        logMonitoring(`ALARM TRIGGERED: ${alarm.type}`);
        loadAlarms();
    });
    
    socket.on('alarm_dismissed', (alarmId) => {
        logMonitoring(`ALARM DISMISSED: ${alarmId}`);
        loadAlarms();
    });
    
    socket.on('radio_message', (message) => {
        renderRadioMessage(message);
    });
    
    socket.on('radio_cleared', (frequency) => {
        if (!frequency || frequency === currentRadioChannel) {
            document.getElementById('radio-messages').innerHTML = '';
            logMonitoring(`RADIO CLEARED: ${frequency || 'ALL'}`);
        }
    });
    
    socket.on('pending_update', (pending) => {
        if (currentUser && currentUser.isAdmin) {
            loadPending();
        }
    });
    
    socket.on('user_banned', (data) => {
        logMonitoring(`USER BANNED: ${data.userId}`);
        if (currentUser.id === data.userId) {
            showGlobalError('YOU HAVE BEEN BANNED: ' + data.reason);
            setTimeout(() => handleLogout(), 3000);
        }
        if (currentUser && currentUser.isAdmin) {
            loadBannedUsers();
            loadActiveUsers();
        }
    });
    
    socket.on('user_unbanned', (userId) => {
        logMonitoring(`USER UNBANNED: ${userId}`);
        if (currentUser && currentUser.isAdmin) {
            loadBannedUsers();
        }
    });
    
    socket.on('profile_updated', (data) => {
        logMonitoring(`PROFILE UPDATED: ${data.userId}`);
        if (currentUser.id === data.userId) {
            Object.assign(currentUser, data.updates);
            updateUserDisplay();
        }
    });
    
    socket.on('error', (error) => {
        showGlobalError(error.message);
    });
}

function goToHome() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-home').classList.add('active');
}

function switchTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    const targetTab = document.querySelector(`[data-target="${targetId}"]`);
    if (targetTab) targetTab.classList.add('active');
    
    const content = document.getElementById(targetId);
    if (content) content.classList.add('active');
    
    if (targetId === 'adm-monitoring') updateMonitoring();
    else if (targetId === 'adm-tickets') loadTickets();
    else if (targetId === 'adm-alarms') loadAlarms();
    else if (targetId === 'adm-users') {
        loadActiveUsers();
        loadPending();
        loadBannedUsers();
    }
    else if (targetId === 'adm-analytics') loadAnalytics();
    else if (targetId === 'usr-workstation') loadMyTickets();
    else if (targetId === 'usr-profile') loadProfile();
    
    logMonitoring(`TAB ACCESSED: ${targetId}`);
}

function initializeMonitoring() {
    monitoringLogs = [
        '> SYSTEM MONITORING INITIALIZED',
        '> DATA SWALLOW STATUS: OK',
        '> ARCS CONNECTION: STABLE',
        '> STATUS: GREEN',
        '> ALL SYSTEMS OPERATIONAL'
    ];
    updateMonitoringDisplay();
    updateSystemStats();
}

function logMonitoring(message) {
    const timestamp = new Date().toLocaleTimeString();
    monitoringLogs.push(`[${timestamp}] ${message}`);
    if (monitoringLogs.length > 100) {
        monitoringLogs.shift();
    }
    updateMonitoringDisplay();
}

async function updateMonitoring() {
    const target = document.getElementById('mon-target')?.value || 'all';
    logMonitoring(`MONITORING REFRESH: ${target.toUpperCase()}`);
    updateMonitoringDisplay();
    await updateSystemStats();
}

function updateMonitoringDisplay() {
    const logsElement = document.getElementById('monitoring-logs');
    if (logsElement) {
        logsElement.textContent = monitoringLogs.join('\n');
        logsElement.scrollTop = logsElement.scrollHeight;
    }
}

async function updateSystemStats() {
    try {
        const response = await fetch('/api/system-status', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (data.success) {
            const statsDiv = document.getElementById('system-stats');
            if (statsDiv) {
                statsDiv.innerHTML = `
                    USERS: ${data.stats.onlineUsers}/${data.stats.totalUsers} | 
                    PENDING: ${data.stats.pendingApprovals} | 
                    TICKETS: ${data.stats.activeTickets} | 
                    ALARMS: ${data.stats.activeAlarms}
                `;
            }
        }
    } catch (e) {
        console.error('Stats error:', e);
    }
}

function startAutoMonitoring() {
    monitoringInterval = setInterval(() => {
        if (currentUser && currentUser.isAdmin) {
            updateSystemStats();
        }
    }, 30000);
}

async function loadPending() {
    try {
        const response = await fetch('/api/pending', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const list = document.getElementById('pending-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (data.pending.length === 0) {
            list.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO PENDING REQUESTS</div>';
            return;
        }
        
        data.pending.forEach(id => {
            const item = document.createElement('div');
            item.className = 'pending-item';
            item.innerHTML = `
                <span>${id}</span>
                <div class="actions">
                    <button onclick="approve('${id}')">APPROVE</button>
                    <button onclick="deny('${id}')">DENY</button>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (e) {
        console.error('Load pending error:', e);
    }
}

async function approve(id) {
    try {
        const response = await fetch('/api/approve', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId: id, adminId: ADMIN_ID })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            playSound('sfx-blue');
            showStatus(`USER APPROVED: ${id}`);
            logMonitoring(`USER APPROVED: ${id} | TEMP PASSWORD: ${data.tempPassword}`);
            loadPending();
            loadActiveUsers();
        } else {
            showGlobalError(data.message);
        }
    } catch (e) {
        console.error('Approve error:', e);
        showGlobalError('Failed to approve user');
    }
}

async function deny(id) {
    try {
        const response = await fetch('/api/deny', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId: id, adminId: ADMIN_ID })
        });
        
        if (response.ok) {
            playSound('sfx-denied');
            logMonitoring(`USER DENIED: ${id}`);
            loadPending();
        }
    } catch (e) {
        console.error('Deny error:', e);
    }
}

async function sendBroadcast() {
    const text = document.getElementById('broadcast-text').value.trim();
    const sprite = document.getElementById('sprite-select').value;
    
    if (!text) {
        playSound('sfx-error');
        showGlobalError('Please enter a message');
        return;
    }
    
    try {
        const response = await fetch('/api/broadcast', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                message: text, 
                sprite, 
                adminId: currentUser.id 
            })
        });
        
        if (response.ok) {
            playSound('sfx-sent');
            document.getElementById('broadcast-text').value = '';
            logMonitoring(`BROADCAST SENT: ${text.substring(0, 30)}...`);
            loadBroadcastHistory();
        } else {
            const data = await response.json();
            showGlobalError(data.message);
        }
    } catch (e) {
        console.error('Broadcast error:', e);
        showGlobalError('Failed to send broadcast');
    }
}

function showBroadcast(data) {
    const spriteImg = document.getElementById('notif-sprite');
    spriteImg.src = `assets/sprites/${data.sprite}.png`;
    spriteImg.onerror = () => {
        spriteImg.src = 'assets/sprites/normal.png';
    };
    
    document.getElementById('notif-text').textContent = data.message;
    document.getElementById('broadcast-notification').classList.remove('hidden');
    
    playSound('sfx-newmessage');
    
    setTimeout(() => {
        document.getElementById('broadcast-notification').classList.add('hidden');
    }, 8000);
}

async function loadBroadcastHistory() {
    try {
        const response = await fetch('/api/broadcasts', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const historyDiv = document.getElementById('broadcast-history');
        if (!historyDiv) return;
        
        historyDiv.innerHTML = '';
        
        if (data.broadcasts.length === 0) {
            historyDiv.innerHTML = '<div style="padding:10px;color:#666;">NO BROADCASTS</div>';
            return;
        }
        
        data.broadcasts.reverse().forEach(b => {
            const time = new Date(b.timestamp).toLocaleTimeString();
            const div = document.createElement('div');
            div.style.padding = '5px';
            div.style.borderBottom = '1px solid #ccc';
            div.style.fontSize = '10px';
            div.innerHTML = `<strong>${time}:</strong> ${b.message}`;
            historyDiv.appendChild(div);
        });
    } catch (e) {
        console.error('Load history error:', e);
    }
}

function joinRadioChannel() {
    const channel = document.getElementById('radio-channel').value;
    currentRadioChannel = channel;
    
    if (socket) {
        socket.emit('join_radio', channel);
        logMonitoring(`JOINED RADIO CHANNEL: ${channel}`);
    }
    
    const freqDisplay = document.getElementById('radio-freq-display');
    const currentChannel = document.getElementById('current-channel');
    if (freqDisplay) freqDisplay.textContent = `CHANNEL ${channel}`;
    if (currentChannel) currentChannel.textContent = channel;
    
    loadRadioMessages();
}

async function loadRadioMessages() {
    try {
        const response = await fetch(`/api/radio/messages?frequency=${currentRadioChannel}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const messagesDiv = document.getElementById('radio-messages');
        if (!messagesDiv) return;
        
        messagesDiv.innerHTML = '';
        
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => renderRadioMessage(msg));
        }
    } catch (e) {
        console.error('Load radio messages error:', e);
    }
}

function sendRadioMessage() {
    const input = document.getElementById('radio-input');
    const message = input?.value.trim();
    
    if (!message || !socket) return;
    
    socket.emit('radio_message', {
        frequency: currentRadioChannel,
        message,
        userId: currentUser.id
    });
    
    input.value = '';
    logMonitoring(`RADIO MESSAGE SENT ON ${currentRadioChannel}`);
}

function renderRadioMessage(message) {
    const messagesDiv = document.getElementById('radio-messages');
    if (!messagesDiv) return;
    
    const div = document.createElement('div');
    div.className = 'radio-message';
    
    const time = new Date(message.timestamp).toLocaleTimeString();
    div.innerHTML = `
        <span class="radio-message-time">[${time}]</span>
        <span class="radio-message-user">${message.userName}:</span>
        <span class="radio-message-text">${message.message}</span>
    `;
    
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function clearRadioChannel() {
    if (!currentUser || !currentUser.isAdmin) return;
    
    try {
        const response = await fetch('/api/radio/clear', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                frequency: currentRadioChannel,
                adminId: ADMIN_ID 
            })
        });
        
        if (response.ok) {
            playSound('sfx-blue');
            logMonitoring(`RADIO CHANNEL ${currentRadioChannel} CLEARED`);
        }
    } catch (e) {
        console.error('Clear radio error:', e);
    }
}

async function loadActiveUsers() {
    try {
        const response = await fetch(`/api/users?adminId=${ADMIN_ID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const list = document.getElementById('active-users-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        data.users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `
                <div class="user-info">
                    <span class="user-name">${user.name}</span>
                    <span class="user-status ${user.isOnline ? 'online' : 'offline'}">
                        ${user.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                </div>
                <div class="user-id">${user.id}</div>
                ${user.id !== ADMIN_ID && !user.isBanned ? `<button onclick="openBanModal('${user.id}')">BAN</button>` : ''}
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Load users error:', e);
    }
}

async function loadBannedUsers() {
    try {
        const response = await fetch(`/api/banned-users?adminId=${ADMIN_ID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const list = document.getElementById('banned-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (!data.banned || data.banned.length === 0) {
            list.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO BANNED USERS</div>';
            return;
        }
        
        data.banned.forEach(ban => {
            const div = document.createElement('div');
            div.className = 'banned-item';
            div.innerHTML = `
                <span>${ban.userId}</span>
                <span>${ban.reason}</span>
                <button onclick="unbanUser('${ban.userId}')">UNBAN</button>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Load banned error:', e);
    }
}

function openBanModal(userId) {
    document.getElementById('ban-user-id').value = userId;
    document.getElementById('ban-modal').classList.remove('hidden');
}

function closeBanModal() {
    document.getElementById('ban-modal').classList.add('hidden');
    document.getElementById('ban-reason').value = '';
    document.getElementById('ban-duration').value = '0';
}

async function confirmBan() {
    const userId = document.getElementById('ban-user-id').value;
    const reason = document.getElementById('ban-reason').value.trim();
    const duration = parseInt(document.getElementById('ban-duration').value) * 3600000;
    
    if (!reason) {
        showGlobalError('Please enter a reason');
        return;
    }
    
    try {
        const response = await fetch('/api/ban-user', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                userId, 
                reason,
                duration: duration || null,
                adminId: ADMIN_ID 
            })
        });
        
        if (response.ok) {
            playSound('sfx-denied');
            closeBanModal();
            loadBannedUsers();
            loadActiveUsers();
        } else {
            const data = await response.json();
            showGlobalError(data.message);
        }
    } catch (e) {
        console.error('Ban error:', e);
    }
}

async function unbanUser(userId) {
    try {
        const response = await fetch('/api/unban-user', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId, adminId: ADMIN_ID })
        });
        
        if (response.ok) {
            playSound('sfx-blue');
            loadBannedUsers();
            loadActiveUsers();
        }
    } catch (e) {
        console.error('Unban error:', e);
    }
}

async function loadTickets() {
    try {
        const response = await fetch('/api/tickets', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const list = document.getElementById('tickets-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (data.tickets.length === 0) {
            list.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO TICKETS</div>';
            return;
        }
        
        data.tickets.forEach(ticket => {
            const div = document.createElement('div');
            div.className = 'ticket-item';
            div.innerHTML = `
                <div class="ticket-header">
                    <span>${ticket.id}</span>
                    <span class="ticket-status ${ticket.status}">${ticket.status}</span>
                </div>
                <div class="ticket-subject">${ticket.subject}</div>
                <div class="ticket-desc">${ticket.description}</div>
                ${currentUser.isAdmin ? `
                    <div class="ticket-actions">
                        <button onclick="closeTicket('${ticket.id}')">CLOSE</button>
                    </div>
                ` : ''}
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Load tickets error:', e);
    }
}

async function loadMyTickets() {
    try {
        const response = await fetch(`/api/tickets?userId=${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const list = document.getElementById('my-tickets');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (data.tickets.length === 0) {
            list.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO TICKETS</div>';
            return;
        }
        
        data.tickets.forEach(ticket => {
            const div = document.createElement('div');
            div.className = 'ticket-item';
            div.innerHTML = `
                <div class="ticket-header">
                    <span>${ticket.id}</span>
                    <span class="ticket-status ${ticket.status}">${ticket.status}</span>
                </div>
                <div class="ticket-subject">${ticket.subject}</div>
                <div class="ticket-desc">${ticket.description}</div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Load my tickets error:', e);
    }
}

function openTicketForm() {
    document.getElementById('ticket-form-modal').classList.remove('hidden');
}

function closeTicketForm() {
    document.getElementById('ticket-form-modal').classList.add('hidden');
    document.getElementById('ticket-subject').value = '';
    document.getElementById('ticket-description').value = '';
}

async function submitTicket() {
    const subject = document.getElementById('ticket-subject').value.trim();
    const description = document.getElementById('ticket-description').value.trim();
    
    if (!subject || !description) {
        showGlobalError('Please fill all fields');
        return;
    }
    
    try {
        const response = await fetch('/api/ticket', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                userId: currentUser.id,
                subject,
                description
            })
        });
        
        if (response.ok) {
            playSound('sfx-sent');
            closeTicketForm();
            logMonitoring(`TICKET CREATED: ${subject}`);
            loadMyTickets();
        } else {
            const data = await response.json();
            showGlobalError(data.message);
        }
    } catch (e) {
        console.error('Ticket error:', e);
        showGlobalError('Failed to create ticket');
    }
}

async function closeTicket(ticketId) {
    try {
        const response = await fetch('/api/ticket/close', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                ticketId,
                adminId: currentUser.id
            })
        });
        
        if (response.ok) {
            playSound('sfx-blue');
            logMonitoring(`TICKET CLOSED: ${ticketId}`);
            loadTickets();
        }
    } catch (e) {
        console.error('Close ticket error:', e);
    }
}

async function loadAlarms() {
    try {
        const response = await fetch('/api/alarms', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('alarms-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (data.alarms.length === 0) {
            container.innerHTML = '<div class="featured-box"><div class="featured-title">NO ACTIVE ALARMS</div></div>';
            return;
        }
        
        data.alarms.forEach(alarm => {
            const div = document.createElement('div');
            div.className = 'alarm-item';
            div.innerHTML = `
                <div class="alarm-type">${alarm.type}</div>
                <div class="alarm-details">${alarm.details}</div>
                ${currentUser.isAdmin ? `
                    <button onclick="dismissAlarm('${alarm.id}')">DISMISS</button>
                ` : ''}
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error('Load alarms error:', e);
    }
}

async function dismissAlarm(alarmId) {
    try {
        const response = await fetch('/api/alarm/dismiss', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                alarmId,
                adminId: currentUser.id
            })
        });
        
        if (response.ok) {
            loadAlarms();
        }
    } catch (e) {
        console.error('Dismiss alarm error:', e);
    }
}

async function loadAnalytics() {
    try {
        const response = await fetch(`/api/all-analytics?adminId=${ADMIN_ID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('analytics-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!data.analytics || data.analytics.length === 0) {
            container.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO ANALYTICS DATA</div>';
            return;
        }
        
        data.analytics.forEach(user => {
            const div = document.createElement('div');
            div.className = 'analytics-item';
            div.innerHTML = `
                <div class="analytics-user">${user.userName} (${user.userId})</div>
                <div class="analytics-stats">
                    <span>Logins: ${user.logins}</span>
                    <span>Messages: ${user.messagesSent}</span>
                    <span>Broadcasts: ${user.broadcastsSent}</span>
                    <span>Tickets: ${user.ticketsCreated}</span>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error('Load analytics error:', e);
    }
}

function loadProfile() {
    const profileDiv = document.getElementById('profile-content');
    if (!profileDiv || !currentUser) return;
    
    profileDiv.innerHTML = `
        <div class="profile-field">
            <label>NAME:</label>
            <span>${currentUser.name}</span>
        </div>
        <div class="profile-field">
            <label>ID:</label>
            <span>${currentUser.id}</span>
        </div>
        <div class="profile-field">
            <label>ROLE:</label>
            <span>${currentUser.isAdmin ? 'ADMINISTRATOR' : 'OPERATOR'}</span>
        </div>
    `;
}

function switchCredTab(tab) {
    document.querySelectorAll('.cred-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.cred-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`cred-${tab}`).classList.add('active');
    
    if (tab === 'users') {
        loadUserCredentials();
    }
}

async function loadUserCredentials() {
    try {
        const response = await fetch(`/api/users?adminId=${ADMIN_ID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const list = document.getElementById('users-credentials-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        data.users.filter(u => u.id !== ADMIN_ID).forEach(user => {
            const div = document.createElement('div');
            div.className = 'cred-user-item';
            div.innerHTML = `
                <div class="cred-user-name">${user.name}</div>
                <div class="cred-user-id">${user.id}</div>
                <div class="cred-user-avatar">
                    <img src="${user.avatar}" style="width:40px;height:40px;image-rendering:pixelated;">
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        console.error('Load credentials error:', e);
    }
}

function openChat() {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.classList.remove('hidden');
        loadChatHistory();
    }
}

function closeChat() {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.classList.add('hidden');
    }
}

function minimizeChat() {
    closeChat();
}

function loadChatHistory() {
    if (!socket || !currentUser) return;
    
    socket.emit('request_chat_history', {
        userId: currentUser.id,
        otherId: ADMIN_ID
    });
    
    socket.once('chat_history', (history) => {
        const messagesDiv = document.getElementById('chat-messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = '';
            history.forEach(msg => renderChatMessage(msg));
        }
    });
}

function renderChatMessage(message) {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;
    
    const isSent = message.senderId === currentUser.id;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${isSent ? 'sent' : 'received'}`;
    
    let content = `<div class="chat-msg-content">${message.message}</div>`;
    
    if (message.attachment) {
        content += `<img src="${message.attachment}" class="chat-msg-image" onclick="openImageModal('${message.attachment}')">`;
    }
    
    const time = new Date(message.timestamp).toLocaleTimeString();
    content += `
        <div class="chat-msg-meta">
            <span>${isSent ? 'YOU' : 'OBUNTO'}</span>
            <span>${time}</span>
        </div>
    `;
    
    msgDiv.innerHTML = content;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    
    if (!text || !socket || !currentUser) return;
    
    socket.emit('chat_message', {
        senderId: currentUser.id,
        receiverId: ADMIN_ID,
        message: text
    });
    
    input.value = '';
    logMonitoring(`CHAT MESSAGE SENT TO OBUNTO`);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && socket) {
            socket.emit('chat_message', {
                senderId: currentUser.id,
                receiverId: ADMIN_ID,
                message: '[Image]',
                attachment: data.url
            });
            logMonitoring('IMAGE SENT IN CHAT');
        } else {
            showGlobalError('Failed to upload image');
        }
    } catch (e) {
        console.error('Upload error:', e);
        showGlobalError('Upload failed');
    }
    
    event.target.value = '';
}

function openImageModal(src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('modal-image');
    if (modal && img) {
        img.src = src;
        modal.classList.remove('hidden');
    }
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

document.getElementById('operator-id')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('operator-password').focus();
    }
});

document.getElementById('operator-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

document.getElementById('radio-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendRadioMessage();
});

window.addEventListener('load', async () => {
    setTimeout(startLoading, 1000);
});