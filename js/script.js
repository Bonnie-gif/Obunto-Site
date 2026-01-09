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
        
        if (users[userId] && users[userId].approved && users[userId].status !== 'banned') {
            currentUser = users[userId];
            playSound('sfx-poweron');
            showScreen('main-screen');
            
            if (userId === ADMIN_ID) {
                document.getElementById('admin-toggle').classList.remove('hidden');
                document.getElementById('admin-tabs').classList.remove('hidden');
                loadPending('pending-list');
                loadActiveUsers();
                loadBannedUsers();
                loadAnalytics();
                loadRadioMessages();
                loadPublishedTabs();
            }
            
            goToHome();
            
        } else if (users[userId] && users[userId].status === 'banned') {
            playSound('sfx-denied');
            showStatus('ACCESS DENIED - ACCOUNT BANNED', true);
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
    data[id] = { 
        id, 
        approved: true,
        status: 'active',
        name: `Operator_${id.slice(-4)}`,
        createdAt: Date.now()
    };
    await storage.set('arcs_users', JSON.stringify(data));
    
    const pending = await storage.get('arcs_pending');
    const pend = pending ? JSON.parse(pending.value) : [];
    await storage.set('arcs_pending', JSON.stringify(pend.filter(p => p !== id)));
    
    playSound('sfx-blue');
    loadPending('pending-list');
    loadPending('pending-list-modal');
    loadActiveUsers();
    loadAnalytics();
}

async function deny(id) {
    const pending = await storage.get('arcs_pending');
    const pend = pending ? JSON.parse(pending.value) : [];
    await storage.set('arcs_pending', JSON.stringify(pend.filter(p => p !== id)));
    
    playSound('sfx-denied');
    loadPending('pending-list');
    loadPending('pending-list-modal');
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
    
    const broadcastData = await storage.get('arcs_broadcasts');
    const broadcasts = broadcastData ? JSON.parse(broadcastData.value) : [];
    broadcasts.push({ text, sprite, timestamp: Date.now() });
    await storage.set('arcs_broadcasts', JSON.stringify(broadcasts));
    
    showBroadcast({ text, sprite });
    loadAnalytics();
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
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.add('active');
    }
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = tab.getAttribute('data-target');
        switchTab(target);
    });
});

async function init() {
    try {
        const users = await storage.get('arcs_users');
        if (!users) {
            await storage.set('arcs_users', JSON.stringify({ 
                [ADMIN_ID]: { 
                    id: ADMIN_ID, 
                    approved: true,
                    status: 'active',
                    name: 'OBUNTO',
                    createdAt: Date.now()
                } 
            }));
        }
        
        const pending = await storage.get('arcs_pending');
        if (!pending) {
            await storage.set('arcs_pending', JSON.stringify([]));
        }
    } catch (e) {
        console.error('Init error:', e);
    }
}

function setAlarmTheme(theme) {
    document.body.className = '';
    if (theme !== 'green') {
        document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('alarm-theme', theme);
    playSound('sfx-blue');
}

function editWelcomeHome() {
    const title = document.getElementById('home-welcome-title').textContent;
    const text = document.getElementById('home-welcome-text').textContent;
    
    document.getElementById('welcome-title-input').value = title;
    document.getElementById('welcome-text-input').value = text;
    
    document.getElementById('edit-welcome-modal').classList.remove('hidden');
}

function closeWelcomeModal() {
    document.getElementById('edit-welcome-modal').classList.add('hidden');
}

async function saveWelcomeChanges() {
    const title = document.getElementById('welcome-title-input').value;
    const text = document.getElementById('welcome-text-input').value;
    
    document.getElementById('home-welcome-title').textContent = title;
    document.getElementById('home-welcome-text').textContent = text;
    
    await storage.set('arcs_welcome', JSON.stringify({ title, text }));
    
    closeWelcomeModal();
    playSound('sfx-sent');
}

function addNewTab() {
    document.getElementById('new-tab-modal').classList.remove('hidden');
}

function closeNewTabModal() {
    document.getElementById('new-tab-modal').classList.add('hidden');
    document.getElementById('new-tab-name').value = '';
    document.getElementById('new-tab-content').value = '';
}

let customTabs = [];

async function saveNewTab() {
    const name = document.getElementById('new-tab-name').value.trim();
    const content = document.getElementById('new-tab-content').value.trim();
    
    if (!name || !content) {
        playSound('sfx-error');
        return;
    }
    
    const tab = {
        id: Date.now().toString(),
        name,
        content,
        created: Date.now()
    };
    
    customTabs.push(tab);
    await storage.set('arcs_custom_tabs', JSON.stringify(customTabs));
    
    closeNewTabModal();
    playSound('sfx-sent');
    
    renderCustomTabsInEditor();
}

function renderCustomTabsInEditor() {
    const canvas = document.getElementById('editing-canvas');
    canvas.innerHTML = '<div class="canvas-hint">TABS CREATED. CLICK PUBLISH TO ADD TO MENU.</div>';
    
    customTabs.forEach((tab, index) => {
        const item = document.createElement('div');
        item.className = 'tab-preview-item';
        item.innerHTML = `
            <div class="tab-preview-name">${tab.name}</div>
            <div class="tab-preview-actions">
                <button onclick="deleteCustomTab('${tab.id}')">DELETE</button>
            </div>
        `;
        canvas.appendChild(item);
    });
}

async function deleteCustomTab(id) {
    if (!confirm('Delete this tab?')) return;
    
    customTabs = customTabs.filter(t => t.id !== id);
    await storage.set('arcs_custom_tabs', JSON.stringify(customTabs));
    
    renderCustomTabsInEditor();
    playSound('sfx-denied');
}

async function publishTabs() {
    if (customTabs.length === 0) {
        playSound('sfx-error');
        return;
    }
    
    await storage.set('arcs_published_tabs', JSON.stringify(customTabs));
    loadPublishedTabs();
    
    playSound('sfx-blue');
    alert(`${customTabs.length} TAB(S) PUBLISHED TO MENU`);
}

function loadPublishedTabs() {
    const saved = localStorage.getItem('arcs_published_tabs');
    if (!saved) return;
    
    const tabs = JSON.parse(saved);
    const menuContainer = document.getElementById('custom-menu-tabs');
    menuContainer.innerHTML = '';
    
    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = 'tab';
        tabEl.textContent = tab.name;
        tabEl.onclick = () => showCustomTab(tab);
        menuContainer.appendChild(tabEl);
    });
}

function showCustomTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    let customContent = document.getElementById('custom-tab-view');
    if (!customContent) {
        customContent = document.createElement('div');
        customContent.id = 'custom-tab-view';
        customContent.className = 'tab-content';
        document.querySelector('.main-window').appendChild(customContent);
    }
    
    customContent.innerHTML = `
        <div class="custom-tab-content">
            <div class="custom-tab-title">${tab.name}</div>
            <div class="custom-tab-body">${tab.content}</div>
        </div>
    `;
    
    customContent.classList.add('active');
}

async function sendRadioMessage() {
    const input = document.getElementById('radio-input');
    const message = input.value.trim();
    
    if (!message) {
        playSound('sfx-error');
        return;
    }
    
    const radioData = await storage.get('arcs_radio_messages');
    const messages = radioData ? JSON.parse(radioData.value) : [];
    
    messages.push({
        user: currentUser ? currentUser.name : 'Unknown',
        text: message,
        timestamp: Date.now()
    });
    
    await storage.set('arcs_radio_messages', JSON.stringify(messages));
    
    input.value = '';
    loadRadioMessages();
    playSound('sfx-sent');
    loadAnalytics();
}

function loadRadioMessages() {
    const saved = localStorage.getItem('arcs_radio_messages');
    if (!saved) return;
    
    const messages = JSON.parse(saved);
    const container = document.getElementById('radio-messages');
    container.innerHTML = '';
    
    messages.forEach((msg, index) => {
        const div = document.createElement('div');
        div.className = 'radio-message';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        div.innerHTML = `
            <span class="radio-message-time">[${time}]</span>
            <span class="radio-message-user">${msg.user}:</span>
            <span class="radio-message-text">${msg.text}</span>
            <button class="radio-delete-btn" onclick="deleteRadioMessage(${index})">X</button>
        `;
        container.appendChild(div);
    });
    
    container.scrollTop = container.scrollHeight;
}

async function deleteRadioMessage(index) {
    const radioData = await storage.get('arcs_radio_messages');
    const messages = radioData ? JSON.parse(radioData.value) : [];
    
    messages.splice(index, 1);
    await storage.set('arcs_radio_messages', JSON.stringify(messages));
    
    loadRadioMessages();
    playSound('sfx-denied');
}

async function clearRadioMessages() {
    if (!confirm('Clear all radio messages?')) return;
    
    await storage.set('arcs_radio_messages', JSON.stringify([]));
    loadRadioMessages();
    playSound('sfx-denied');
}

function showUsersSection(section) {
    document.querySelectorAll('.users-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.users-section').forEach(s => s.classList.add('hidden'));
    
    if (section === 'active') {
        document.querySelector('.users-tab:first-child').classList.add('active');
        document.getElementById('users-active-section').classList.remove('hidden');
    } else {
        document.querySelector('.users-tab:last-child').classList.add('active');
        document.getElementById('users-banned-section').classList.remove('hidden');
    }
}

async function loadActiveUsers() {
    const usersData = await storage.get('arcs_users');
    const users = usersData ? JSON.parse(usersData.value) : {};
    
    const container = document.getElementById('active-users-list');
    container.innerHTML = '';
    
    Object.values(users).filter(u => u.status !== 'banned').forEach(user => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <div class="user-info">
                <div class="user-name">${user.name || user.id}</div>
                <div class="user-id">ID: ${user.id}</div>
            </div>
            <div class="user-actions">
                <button onclick="editUser('${user.id}')">EDIT</button>
                ${user.id !== ADMIN_ID ? `<button onclick="banUser('${user.id}')">BAN</button>` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

async function loadBannedUsers() {
    const usersData = await storage.get('arcs_users');
    const users = usersData ? JSON.parse(usersData.value) : {};
    
    const container = document.getElementById('banned-users-list');
    container.innerHTML = '';
    
    const banned = Object.values(users).filter(u => u.status === 'banned');
    
    if (banned.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">NO BANNED USERS</div>';
        return;
    }
    
    banned.forEach(user => {
        const div = document.createElement('div');
        div.className = 'banned-item';
        div.innerHTML = `
            <div class="user-info">
                <div class="user-name">${user.name || user.id}</div>
                <div class="user-id">ID: ${user.id}</div>
            </div>
            <div class="user-actions">
                <button onclick="unbanUser('${user.id}')">UNBAN</button>
            </div>
        `;
        container.appendChild(div);
    });
}

let editingUserId = null;

function editUser(userId) {
    const usersData = localStorage.getItem('arcs_users');
    const users = usersData ? JSON.parse(usersData) : {};
    const user = users[userId];
    
    if (!user) return;
    
    editingUserId = userId;
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-user-name').value = user.name || userId;
    document.getElementById('edit-user-status').value = user.status || 'active';
    
    document.getElementById('edit-user-modal').classList.remove('hidden');
}

function closeEditUserModal() {
    document.getElementById('edit-user-modal').classList.add('hidden');
    editingUserId = null;
}

async function saveUserChanges() {
    if (!editingUserId) return;
    
    const usersData = await storage.get('arcs_users');
    const users = usersData ? JSON.parse(usersData.value) : {};
    
    if (users[editingUserId]) {
        users[editingUserId].name = document.getElementById('edit-user-name').value;
        users[editingUserId].status = document.getElementById('edit-user-status').value;
        
        await storage.set('arcs_users', JSON.stringify(users));
        
        loadActiveUsers();
        loadBannedUsers();
        closeEditUserModal();
        playSound('sfx-sent');
    }
}

async function banUser(userId) {
    if (!confirm('Ban this user?')) return;
    
    const usersData = await storage.get('arcs_users');
    const users = usersData ? JSON.parse(usersData.value) : {};
    
    if (users[userId]) {
        users[userId].status = 'banned';
        await storage.set('arcs_users', JSON.stringify(users));
        
        loadActiveUsers();
        loadBannedUsers();
        playSound('sfx-denied');
    }
}

async function unbanUser(userId) {
    if (!confirm('Unban this user?')) return;
    
    const usersData = await storage.get('arcs_users');
    const users = usersData ? JSON.parse(usersData.value) : {};
    
    if (users[userId]) {
        users[userId].status = 'active';
        await storage.set('arcs_users', JSON.stringify(users));
        
        loadActiveUsers();
        loadBannedUsers();
        playSound('sfx-blue');
    }
}

async function loadAnalytics() {
    const usersData = await storage.get('arcs_users');
    const users = usersData ? JSON.parse(usersData.value) : {};
    
    const broadcastData = await storage.get('arcs_broadcasts');
    const broadcasts = broadcastData ? JSON.parse(broadcastData.value) : [];
    
    const radioData = await storage.get('arcs_radio_messages');
    const radioMsgs = radioData ? JSON.parse(radioData.value) : [];
    
    document.getElementById('analytics-total-users').textContent = Object.keys(users).length;
    document.getElementById('analytics-active-sessions').textContent = Object.values(users).filter(u => u.status === 'active').length;
    document.getElementById('analytics-broadcasts').textContent = broadcasts.length;
    document.getElementById('analytics-radio-msgs').textContent = radioMsgs.length;
}

async function loadEditor() {
    const saved = localStorage.getItem('arcs_custom_tabs');
    if (saved) {
        customTabs = JSON.parse(saved);
        renderCustomTabsInEditor();
    }
    
    const savedWelcome = localStorage.getItem('arcs_welcome');
    if (savedWelcome) {
        const welcome = JSON.parse(savedWelcome);
        document.getElementById('home-welcome-title').textContent = welcome.title;
        document.getElementById('home-welcome-text').textContent = welcome.text;
    }
}

document.getElementById('radio-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendRadioMessage();
});

window.addEventListener('load', async () => {
    await init();
    loadEditor();
    
    const savedTheme = localStorage.getItem('alarm-theme') || 'green';
    if (savedTheme !== 'green') {
        setAlarmTheme(savedTheme);
    }
    
    setTimeout(startLoading, 1000);
});