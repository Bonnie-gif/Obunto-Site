let currentUser = null;
const ADMIN_ID = '118107921024376';

const storage = {
    async get(key, shared = false) {
        if (window.storage && typeof window.storage.get === 'function') {
            return await window.storage.get(key, shared);
        }
        const value = localStorage.getItem(key);
        return value ? { key, value, shared } : null;
    },
    async set(key, value, shared = false) {
        if (window.storage && typeof window.storage.set === 'function') {
            return await window.storage.set(key, value, shared);
        }
        localStorage.setItem(key, value);
        return { key, value, shared };
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
    setTimeout(() => status.classList.remove('show'), 3000);
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

async function handleLogin() {
    const userId = document.getElementById('operator-id').value.trim();
    
    if (!userId) {
        playSound('sfx-error');
        showStatus('PLEASE ENTER AN OPERATOR ID', true);
        return;
    }
    
    try {
        await init();
        
        const usersData = await storage.get('arcs_users');
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        if (users[userId] && users[userId].approved) {
            currentUser = users[userId];
            playSound('sfx-poweron');
            showScreen('main-screen');
            
            if (userId === ADMIN_ID) {
                document.getElementById('admin-toggle').classList.remove('hidden');
                document.getElementById('admin-tabs').classList.remove('hidden');
                document.getElementById('personnel-tabs').classList.add('hidden');
                loadPending('pending-list');
                initializeMonitoring();
            } else {
                document.getElementById('admin-tabs').classList.add('hidden');
                document.getElementById('personnel-tabs').classList.remove('hidden');
            }
            
            goToHome();
            
        } else if (!users[userId]) {
            const pendingData = await storage.get('arcs_pending');
            const pending = pendingData ? JSON.parse(pendingData.value) : [];
            
            if (!pending.includes(userId)) {
                pending.push(userId);
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
        console.error('Login error:', e);
        playSound('sfx-error');
        showStatus('SYSTEM ERROR - TRY AGAIN', true);
    }
}

document.getElementById('operator-id')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

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

async function loadPending(elementId) {
    try {
        const data = await storage.get('arcs_pending');
        const pending = data ? JSON.parse(data.value) : [];
        const list = document.getElementById(elementId);
        if (!list) return;

        list.innerHTML = '';
        
        if (pending.length === 0) {
            list.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">NO PENDING REQUESTS</div>';
            return;
        }
        
        pending.forEach(id => {
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
    const users = await storage.get('arcs_users');
    const data = users ? JSON.parse(users.value) : {};
    data[id] = { id, approved: true };
    await storage.set('arcs_users', JSON.stringify(data));
    
    const pending = await storage.get('arcs_pending');
    const pend = pending ? JSON.parse(pending.value) : [];
    await storage.set('arcs_pending', JSON.stringify(pend.filter(p => p !== id)));
    
    playSound('sfx-blue');
    loadPending('pending-list');
    loadPending('pending-list-modal');
    logMonitoring(`USER APPROVED: ${id}`);
}

async function deny(id) {
    const pending = await storage.get('arcs_pending');
    const pend = pending ? JSON.parse(pending.value) : [];
    await storage.set('arcs_pending', JSON.stringify(pend.filter(p => p !== id)));
    
    playSound('sfx-denied');
    loadPending('pending-list');
    loadPending('pending-list-modal');
    logMonitoring(`USER DENIED: ${id}`);
}

document.querySelectorAll('.sprite-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.sprite-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        document.getElementById('sprite-select').value = option.dataset.sprite;
    });
});

async function sendBroadcast() {
    const text = document.getElementById('broadcast-text').value.trim();
    const sprite = document.getElementById('sprite-select').value;
    
    if (!text) {
        playSound('sfx-error');
        return;
    }
    
    playSound('sfx-sent');
    document.getElementById('broadcast-text').value = '';
    
    showBroadcast({ text, sprite });
    logMonitoring(`BROADCAST SENT: ${text.substring(0, 30)}...`);
}

function showBroadcast(data) {
    const spriteImg = document.getElementById('notif-sprite');
    spriteImg.src = `assets/sprites/${data.sprite}.png`;
    spriteImg.onerror = () => {
        spriteImg.src = 'assets/sprites/normal.png';
    };
    
    document.getElementById('notif-text').textContent = data.text;
    document.getElementById('broadcast-notification').classList.remove('hidden');
    
    playSound('sfx-newmessage');
    
    setTimeout(() => {
        document.getElementById('broadcast-notification').classList.add('hidden');
    }, 8000);
}

function switchTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    
    if (targetId === 'adm-monitoring') {
        updateMonitoring();
    }
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const parentId = tab.parentElement.id;
        document.querySelectorAll(`#${parentId} .tab`).forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = tab.getAttribute('data-target');
        switchTab(target);
        logMonitoring(`TAB ACCESSED: ${target}`);
    });
});

let monitoringLogs = [];

function initializeMonitoring() {
    monitoringLogs = [
        '> SYSTEM MONITORING INITIALIZED',
        '> DATA SWALLOW STATUS: OK',
        '> ARCS CONNECTION: STABLE',
        '> STATUS: GREEN',
        '> ALL SYSTEMS OPERATIONAL'
    ];
    updateMonitoringDisplay();
}

function logMonitoring(message) {
    const timestamp = new Date().toLocaleTimeString();
    monitoringLogs.push(`[${timestamp}] ${message}`);
    if (monitoringLogs.length > 50) {
        monitoringLogs.shift();
    }
    updateMonitoringDisplay();
}

function updateMonitoring() {
    const target = document.getElementById('mon-target')?.value || 'all';
    logMonitoring(`MONITORING REFRESH: ${target.toUpperCase()}`);
    updateMonitoringDisplay();
}

function updateMonitoringDisplay() {
    const logsElement = document.getElementById('monitoring-logs');
    if (logsElement) {
        logsElement.textContent = monitoringLogs.join('\n');
        logsElement.scrollTop = logsElement.scrollHeight;
    }
}

function openChat() {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.classList.remove('hidden');
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

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    
    if (!text) return;
    
    const messagesDiv = document.getElementById('chat-messages');
    if (messagesDiv) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg sent';
        msgDiv.innerHTML = `
            <div class="chat-msg-content">${text}</div>
            <div class="chat-msg-meta">
                <span>YOU</span>
                <span>${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    input.value = '';
    logMonitoring(`CHAT MESSAGE SENT TO OBUNTO`);
    
    setTimeout(() => {
        const responseDiv = document.createElement('div');
        responseDiv.className = 'chat-msg received';
        responseDiv.innerHTML = `
            <div class="chat-msg-content">Message received. How can I help you?</div>
            <div class="chat-msg-meta">
                <span>OBUNTO</span>
                <span>${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        messagesDiv.appendChild(responseDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        playSound('sfx-newmessage');
    }, 1000);
}

document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

async function init() {
    try {
        const users = await storage.get('arcs_users');
        if (!users) {
            await storage.set('arcs_users', JSON.stringify({ [ADMIN_ID]: { id: ADMIN_ID, approved: true } }));
        }
        
        const pending = await storage.get('arcs_pending');
        if (!pending) {
            await storage.set('arcs_pending', JSON.stringify([]));
        }
    } catch (e) {
        console.error('Init error:', e);
    }
}

window.addEventListener('load', async () => {
    await init();
    setTimeout(startLoading, 1000);
});