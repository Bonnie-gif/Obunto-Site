let currentUser = null;
const ADMIN_ID = '118107921024376';
let lastBroadcastTime = 0;

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
                
                document.querySelectorAll('#admin-tabs .tab').forEach(t => t.classList.remove('active'));
                document.querySelector('#admin-tabs .tab[data-target="adm-broadcast"]').classList.add('active');
                switchTab('adm-broadcast');
                
                loadPending('pending-list');
            } else {
                document.getElementById('admin-tabs').classList.add('hidden');
                document.getElementById('personnel-tabs').classList.remove('hidden');
                
                document.querySelectorAll('#personnel-tabs .tab').forEach(t => t.classList.remove('active'));
                document.querySelector('#personnel-tabs .tab[data-target="usr-profile"]').classList.add('active');
                switchTab('usr-profile');
            }
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

async function loadPending(elementId) {
    try {
        const data = await storage.get('arcs_pending');
        const pending = data ? JSON.parse(data.value) : [];
        
        // Populate specific list if ID provided, or fallback
        const list = document.getElementById(elementId) || document.getElementById('pending-list-modal');
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
}

async function deny(id) {
    const pending = await storage.get('arcs_pending');
    const pend = pending ? JSON.parse(pending.value) : [];
    await storage.set('arcs_pending', JSON.stringify(pend.filter(p => p !== id)));
    
    playSound('sfx-denied');
    loadPending('pending-list');
    loadPending('pending-list-modal');
}

async function sendBroadcast() {
    const text = document.getElementById('broadcast-text').value.trim();
    const sprite = document.getElementById('sprite-select').value;
    
    if (!text) return;
    
    const broadcast = { text, sprite, timestamp: Date.now() };
    await storage.set('arcs_broadcast', JSON.stringify(broadcast), true);
    
    playSound('sfx-sent');
    document.getElementById('broadcast-text').value = '';
}

function showBroadcast(data) {
    const spriteImg = document.getElementById('notif-sprite');
    spriteImg.src = `sprites/${data.sprite}.png`;
    
    document.getElementById('notif-text').textContent = data.text;
    document.getElementById('broadcast-notification').classList.remove('hidden');
    
    playSound('sfx-newmessage');
    setTimeout(() => {
        document.getElementById('broadcast-notification').classList.add('hidden');
    }, 6000);
}

async function checkBroadcasts() {
    try {
        const data = await storage.get('arcs_broadcast', true);
        if (data) {
            const broadcast = JSON.parse(data.value);
            
            if (broadcast.timestamp > lastBroadcastTime) {
                lastBroadcastTime = broadcast.timestamp;
                showBroadcast(broadcast);
            }
        }
    } catch (e) {
        console.error('Check broadcasts error:', e);
    }
}

function switchTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
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
    setInterval(checkBroadcasts, 1000);
});