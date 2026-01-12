/**
 * ARCS - Advanced Research & Containment System
 * Newton OS Ver. 3.2.2
 * NieR:Automata Inspired Admin Dashboard
 */

// ==================== CONFIGURATION ====================
const ADMIN_ID = '118107921024376';
const ADMIN_PASSWORD = '2041';
const STORAGE_PREFIX = 'arcs_';

// ==================== STORAGE WRAPPER ====================
const storage = {
    async get(key, shared = false) {
        // Check for Anthropic persistent storage first
        if (window.storage && typeof window.storage.get === 'function') {
            try {
                return await window.storage.get(STORAGE_PREFIX + key, shared);
            } catch (e) {
                console.log('Using localStorage fallback');
            }
        }
        // Fallback to localStorage
        const value = localStorage.getItem(STORAGE_PREFIX + key);
        return value ? { key: STORAGE_PREFIX + key, value, shared } : null;
    },
    
    async set(key, value, shared = false) {
        // Check for Anthropic persistent storage first
        if (window.storage && typeof window.storage.set === 'function') {
            try {
                return await window.storage.set(STORAGE_PREFIX + key, value, shared);
            } catch (e) {
                console.log('Using localStorage fallback');
            }
        }
        // Fallback to localStorage
        localStorage.setItem(STORAGE_PREFIX + key, value);
        return { key: STORAGE_PREFIX + key, value, shared };
    },
    
    async delete(key, shared = false) {
        if (window.storage && typeof window.storage.delete === 'function') {
            try {
                return await window.storage.delete(STORAGE_PREFIX + key, shared);
            } catch (e) {
                console.log('Using localStorage fallback');
            }
        }
        localStorage.removeItem(STORAGE_PREFIX + key);
        return { key: STORAGE_PREFIX + key, deleted: true, shared };
    }
};

// ==================== STATE ====================
let currentUser = null;
let customTabs = [];
let isAdmin = false;

// ==================== UTILITIES ====================
function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play prevented:', e));
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

function generateUserId() {
    return 'OP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// ==================== INITIALIZATION ====================
async function initializeStorage() {
    try {
        // Initialize users
        const usersData = await storage.get('users', true);
        if (!usersData) {
            const defaultUsers = {
                [ADMIN_ID]: {
                    id: ADMIN_ID,
                    name: 'OBUNTO',
                    password: ADMIN_PASSWORD,
                    approved: true,
                    status: 'active',
                    isAdmin: true,
                    createdAt: Date.now()
                }
            };
            await storage.set('users', JSON.stringify(defaultUsers), true);
        }
        
        // Initialize pending queue
        const pendingData = await storage.get('pending', true);
        if (!pendingData) {
            await storage.set('pending', JSON.stringify([]), true);
        }
        
        // Initialize broadcasts
        const broadcastData = await storage.get('broadcasts', true);
        if (!broadcastData) {
            await storage.set('broadcasts', JSON.stringify([]), true);
        }
        
        // Initialize radio messages
        const radioData = await storage.get('radio_messages', true);
        if (!radioData) {
            await storage.set('radio_messages', JSON.stringify([]), true);
        }
        
        // Initialize custom tabs
        const tabsData = await storage.get('custom_tabs', true);
        if (!tabsData) {
            await storage.set('custom_tabs', JSON.stringify([]), true);
        }
        
        // Initialize welcome content
        const welcomeData = await storage.get('welcome', true);
        if (!welcomeData) {
            await storage.set('welcome', JSON.stringify({
                title: 'WELCOME',
                text: 'WELCOME TO ARCS V3.2.2. SELECT A MODULE FROM THE MENU BAR TO BEGIN OPERATIONS.'
            }), true);
        }
        
        console.log('Storage initialized successfully');
    } catch (e) {
        console.error('Storage initialization error:', e);
    }
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
            }, 400);
        } else {
            bar.style.width = progress + '%';
        }
    }, 180);
}

// ==================== AUTHENTICATION ====================
async function handleLogin() {
    const userIdInput = document.getElementById('operator-id');
    const passwordInput = document.getElementById('operator-password');
    const userId = userIdInput.value.trim().toUpperCase();
    const password = passwordInput ? passwordInput.value : '';
    
    if (!userId) {
        playSound('sfx-error');
        showStatus('PLEASE ENTER AN OPERATOR ID', 'error');
        return;
    }
    
    try {
        const usersData = await storage.get('users', true);
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        const user = users[userId];
        
        if (user) {
            // User exists
            if (user.status === 'banned') {
                playSound('sfx-denied');
                showStatus('ACCESS DENIED - ACCOUNT BANNED', 'error');
                return;
            }
            
            if (!user.approved) {
                playSound('sfx-denied');
                showStatus('ACCESS PENDING - AWAITING APPROVAL', 'error');
                return;
            }
            
            // Check password for admin
            if (user.isAdmin && password !== user.password) {
                playSound('sfx-error');
                showStatus('INVALID PASSWORD', 'error');
                return;
            }
            
            // Login successful
            currentUser = user;
            isAdmin = user.isAdmin;
            playSound('sfx-poweron');
            
            enterMainScreen();
        } else {
            // User doesn't exist - check pending
            const pendingData = await storage.get('pending', true);
            const pending = pendingData ? JSON.parse(pendingData.value) : [];
            
            const isPending = pending.some(p => p.userId === userId);
            
            if (isPending) {
                playSound('sfx-denied');
                showStatus('REQUEST PENDING - AWAITING APPROVAL', 'error');
            } else {
                playSound('sfx-error');
                showStatus('USER NOT FOUND - USE NEW OPERATOR', 'error');
            }
        }
    } catch (e) {
        console.error('Login error:', e);
        playSound('sfx-error');
        showStatus('SYSTEM ERROR - TRY AGAIN', 'error');
    }
}

async function handleNewOperator() {
    const userIdInput = document.getElementById('operator-id');
    let userId = userIdInput.value.trim().toUpperCase();
    
    // Generate ID if empty
    if (!userId) {
        userId = generateUserId();
        userIdInput.value = userId;
    }
    
    try {
        // Check if user already exists
        const usersData = await storage.get('users', true);
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        if (users[userId]) {
            playSound('sfx-error');
            showStatus('ID ALREADY EXISTS - USE LOGIN', 'error');
            return;
        }
        
        // Check if already pending
        const pendingData = await storage.get('pending', true);
        const pending = pendingData ? JSON.parse(pendingData.value) : [];
        
        if (pending.some(p => p.userId === userId)) {
            playSound('sfx-denied');
            showStatus('ALREADY IN QUEUE - AWAITING APPROVAL', 'error');
            return;
        }
        
        // Add to pending queue
        pending.push({
            userId: userId,
            requestedAt: Date.now()
        });
        
        await storage.set('pending', JSON.stringify(pending), true);
        
        playSound('sfx-sent');
        showStatus(`REQUEST SENT - ID: ${userId}`, 'success');
        
        // Show popup with ID to save
        showIdPopup(userId);
        
    } catch (e) {
        console.error('New operator error:', e);
        playSound('sfx-error');
        showStatus('SYSTEM ERROR - TRY AGAIN', 'error');
    }
}

function showIdPopup(userId) {
    // Create or update popup
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
                        background: var(--nier-paper-light);
                        border: 3px solid var(--nier-accent);
                        padding: 18px;
                        text-align: center;
                        font-size: 20px;
                        font-weight: 700;
                        letter-spacing: 4px;
                        margin-bottom: 16px;
                        font-family: var(--font-mono);
                    ">${userId}</div>
                    <button class="form-submit-btn" onclick="copyUserId()">COPY ID</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
    } else {
        document.getElementById('popup-user-id').textContent = userId;
        popup.classList.remove('hidden');
    }
}

function closeIdPopup() {
    const popup = document.getElementById('id-popup');
    if (popup) popup.classList.add('hidden');
}

function copyUserId() {
    const userId = document.getElementById('popup-user-id').textContent;
    navigator.clipboard.writeText(userId).then(() => {
        playSound('sfx-sent');
        const btn = document.querySelector('#id-popup .form-submit-btn');
        btn.textContent = 'COPIED!';
        setTimeout(() => btn.textContent = 'COPY ID', 2000);
    }).catch(() => {
        playSound('sfx-error');
    });
}

function logout() {
    currentUser = null;
    isAdmin = false;
    showScreen('loading-screen');
    document.getElementById('operator-id').value = '';
    if (document.getElementById('operator-password')) {
        document.getElementById('operator-password').value = '';
    }
}

// ==================== MAIN SCREEN ====================
async function enterMainScreen() {
    showScreen('main-screen');
    
    // Update user info in menu
    updateMenuUserInfo();
    
    // Show/hide admin elements
    if (isAdmin) {
        document.getElementById('admin-toggle')?.classList.remove('hidden');
        document.getElementById('admin-tabs')?.classList.remove('hidden');
        
        // Load admin data
        await loadPendingList('pending-list');
        await loadActiveUsers();
        await loadBannedUsers();
        await loadAnalytics();
        await loadRadioMessages();
        loadPublishedTabs();
    } else {
        document.getElementById('admin-toggle')?.classList.add('hidden');
        document.getElementById('admin-tabs')?.classList.add('hidden');
    }
    
    // Load welcome content
    await loadWelcomeContent();
    
    // Go to home
    goToHome();
}

function updateMenuUserInfo() {
    const userInfo = document.querySelector('.menu-user-info');
    if (userInfo && currentUser) {
        userInfo.innerHTML = `
            <span class="menu-user-name">${currentUser.name || currentUser.id}</span>
            <button class="menu-logout-btn" onclick="logout()">LOGOUT</button>
        `;
    }
}

function goToHome() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-home')?.classList.add('active');
}

// ==================== PENDING APPROVALS ====================
async function loadPendingList(elementId) {
    try {
        const data = await storage.get('pending', true);
        const pending = data ? JSON.parse(data.value) : [];
        const list = document.getElementById(elementId);
        if (!list) return;
        
        list.innerHTML = '';
        
        if (pending.length === 0) {
            list.innerHTML = '<div class="pending-empty">NO PENDING REQUESTS</div>';
            return;
        }
        
        pending.forEach(p => {
            const item = document.createElement('div');
            item.className = 'pending-item';
            const time = new Date(p.requestedAt).toLocaleString();
            item.innerHTML = `
                <div class="pending-info">
                    <span class="user-id">${p.userId}</span>
                    <span class="request-time">Requested: ${time}</span>
                </div>
                <div class="actions">
                    <button class="approve-btn" onclick="approveUser('${p.userId}')">APPROVE</button>
                    <button class="deny-btn" onclick="denyUser('${p.userId}')">DENY</button>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (e) {
        console.error('Load pending error:', e);
    }
}

async function approveUser(userId) {
    try {
        // Get pending list
        const pendingData = await storage.get('pending', true);
        const pending = pendingData ? JSON.parse(pendingData.value) : [];
        
        // Remove from pending
        const newPending = pending.filter(p => p.userId !== userId);
        await storage.set('pending', JSON.stringify(newPending), true);
        
        // Add to users
        const usersData = await storage.get('users', true);
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        users[userId] = {
            id: userId,
            name: `Operator_${userId.slice(-4)}`,
            approved: true,
            status: 'active',
            isAdmin: false,
            createdAt: Date.now()
        };
        
        await storage.set('users', JSON.stringify(users), true);
        
        playSound('sfx-blue');
        
        // Refresh lists
        await loadPendingList('pending-list');
        await loadPendingList('pending-list-modal');
        await loadActiveUsers();
        await loadAnalytics();
        
    } catch (e) {
        console.error('Approve error:', e);
        playSound('sfx-error');
    }
}

async function denyUser(userId) {
    try {
        const pendingData = await storage.get('pending', true);
        const pending = pendingData ? JSON.parse(pendingData.value) : [];
        
        const newPending = pending.filter(p => p.userId !== userId);
        await storage.set('pending', JSON.stringify(newPending), true);
        
        playSound('sfx-denied');
        
        await loadPendingList('pending-list');
        await loadPendingList('pending-list-modal');
        
    } catch (e) {
        console.error('Deny error:', e);
        playSound('sfx-error');
    }
}

// ==================== USERS MANAGEMENT ====================
async function loadActiveUsers() {
    try {
        const usersData = await storage.get('users', true);
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        const container = document.getElementById('active-users-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        const activeUsers = Object.values(users).filter(u => u.status !== 'banned' && u.approved);
        
        if (activeUsers.length === 0) {
            container.innerHTML = '<div class="users-empty">NO ACTIVE USERS</div>';
            return;
        }
        
        activeUsers.forEach(user => {
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
    } catch (e) {
        console.error('Load active users error:', e);
    }
}

async function loadBannedUsers() {
    try {
        const usersData = await storage.get('users', true);
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        const container = document.getElementById('banned-users-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        const bannedUsers = Object.values(users).filter(u => u.status === 'banned');
        
        if (bannedUsers.length === 0) {
            container.innerHTML = '<div class="users-empty">NO BANNED USERS</div>';
            return;
        }
        
        bannedUsers.forEach(user => {
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
    } catch (e) {
        console.error('Load banned users error:', e);
    }
}

function showUsersSection(section) {
    document.querySelectorAll('.users-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.users-section').forEach(s => s.classList.add('hidden'));
    
    if (section === 'active') {
        document.querySelector('.users-tab:first-child')?.classList.add('active');
        document.getElementById('users-active-section')?.classList.remove('hidden');
    } else {
        document.querySelector('.users-tab:last-child')?.classList.add('active');
        document.getElementById('users-banned-section')?.classList.remove('hidden');
    }
}

let editingUserId = null;

function editUser(userId) {
    const modal = document.getElementById('edit-user-modal');
    if (!modal) return;
    
    storage.get('users', true).then(data => {
        const users = data ? JSON.parse(data.value) : {};
        const user = users[userId];
        
        if (!user) return;
        
        editingUserId = userId;
        document.getElementById('edit-user-id').value = userId;
        document.getElementById('edit-user-name').value = user.name || userId;
        document.getElementById('edit-user-status').value = user.status || 'active';
        
        modal.classList.remove('hidden');
    });
}

function closeEditUserModal() {
    document.getElementById('edit-user-modal')?.classList.add('hidden');
    editingUserId = null;
}

async function saveUserChanges() {
    if (!editingUserId) return;
    
    try {
        const usersData = await storage.get('users', true);
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        if (users[editingUserId]) {
            users[editingUserId].name = document.getElementById('edit-user-name').value;
            users[editingUserId].status = document.getElementById('edit-user-status').value;
            
            await storage.set('users', JSON.stringify(users), true);
            
            playSound('sfx-sent');
            closeEditUserModal();
            await loadActiveUsers();
            await loadBannedUsers();
        }
    } catch (e) {
        console.error('Save user error:', e);
        playSound('sfx-error');
    }
}

async function banUser(userId) {
    if (!confirm('Ban this user?')) return;
    
    try {
        const usersData = await storage.get('users', true);
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        if (users[userId]) {
            users[userId].status = 'banned';
            await storage.set('users', JSON.stringify(users), true);
            
            playSound('sfx-denied');
            await loadActiveUsers();
            await loadBannedUsers();
        }
    } catch (e) {
        console.error('Ban user error:', e);
        playSound('sfx-error');
    }
}

async function unbanUser(userId) {
    if (!confirm('Unban this user?')) return;
    
    try {
        const usersData = await storage.get('users', true);
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        if (users[userId]) {
            users[userId].status = 'active';
            await storage.set('users', JSON.stringify(users), true);
            
            playSound('sfx-blue');
            await loadActiveUsers();
            await loadBannedUsers();
        }
    } catch (e) {
        console.error('Unban user error:', e);
        playSound('sfx-error');
    }
}

// ==================== BROADCAST ====================
function initializeSpriteSelector() {
    document.querySelectorAll('.sprite-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.sprite-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            const select = document.getElementById('sprite-select');
            if (select) select.value = option.dataset.sprite;
        });
    });
}

async function sendBroadcast() {
    const textEl = document.getElementById('broadcast-text');
    const text = textEl?.value.trim();
    const sprite = document.getElementById('sprite-select')?.value || 'normal';
    
    if (!text) {
        playSound('sfx-error');
        return;
    }
    
    try {
        const broadcastData = await storage.get('broadcasts', true);
        const broadcasts = broadcastData ? JSON.parse(broadcastData.value) : [];
        
        broadcasts.push({
            text,
            sprite,
            timestamp: Date.now()
        });
        
        // Keep only last 50 broadcasts
        if (broadcasts.length > 50) broadcasts.shift();
        
        await storage.set('broadcasts', JSON.stringify(broadcasts), true);
        
        playSound('sfx-sent');
        textEl.value = '';
        
        showBroadcast({ text, sprite });
        await loadAnalytics();
        
    } catch (e) {
        console.error('Broadcast error:', e);
        playSound('sfx-error');
    }
}

function showBroadcast(data) {
    const notification = document.getElementById('broadcast-notification');
    if (!notification) return;
    
    // Map sprite names to emojis
    const spriteEmojis = {
        'normal': '😐',
        'happy': '😊',
        'sad': '😢',
        'angry': '😠',
        'confused': '😕',
        'annoyed': '😤',
        'bug': '🐛',
        'dizzy': '😵',
        'hollow': '😶',
        'panic': '😰',
        'sleeping': '😴',
        'smug': '😏',
        'stare': '👀',
        'suspicious': '🤨',
        'werror': '⚠️'
    };
    
    const spriteContainer = document.getElementById('notif-sprite');
    if (spriteContainer) {
        const spriteFace = spriteContainer.querySelector('.sprite-face');
        if (spriteFace) {
            spriteFace.textContent = spriteEmojis[data.sprite] || spriteEmojis['normal'];
        }
    }
    
    // Update notification emotion class
    notification.className = 'notification';
    if (data.sprite) {
        notification.classList.add(`emotion-${data.sprite}`);
    }
    
    const textEl = document.getElementById('notif-text');
    if (textEl) {
        textEl.textContent = '';
        typewriterEffect(textEl, data.text);
    }
    
    notification.classList.remove('hidden');
    playSound('sfx-newmessage');
    
    setTimeout(() => {
        notification.classList.add('hiding');
        setTimeout(() => {
            notification.classList.remove('hiding');
            notification.classList.add('hidden');
        }, 400);
    }, 8000);
}

function typewriterEffect(element, text, speed = 30) {
    let i = 0;
    element.classList.add('typing');
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            element.classList.remove('typing');
        }
    }
    
    type();
}

function closeBroadcast() {
    const notification = document.getElementById('broadcast-notification');
    if (notification) {
        notification.classList.add('hiding');
        setTimeout(() => {
            notification.classList.remove('hiding');
            notification.classList.add('hidden');
        }, 400);
    }
}

// ==================== RADIO ====================
async function sendRadioMessage() {
    const input = document.getElementById('radio-input');
    const message = input?.value.trim();
    
    if (!message) {
        playSound('sfx-error');
        return;
    }
    
    try {
        const radioData = await storage.get('radio_messages', true);
        const messages = radioData ? JSON.parse(radioData.value) : [];
        
        messages.push({
            user: currentUser ? currentUser.name : 'Unknown',
            userId: currentUser ? currentUser.id : 'Unknown',
            text: message,
            timestamp: Date.now()
        });
        
        // Keep only last 100 messages
        if (messages.length > 100) messages.shift();
        
        await storage.set('radio_messages', JSON.stringify(messages), true);
        
        input.value = '';
        await loadRadioMessages();
        playSound('sfx-sent');
        await loadAnalytics();
        
    } catch (e) {
        console.error('Radio message error:', e);
        playSound('sfx-error');
    }
}

async function loadRadioMessages() {
    try {
        const radioData = await storage.get('radio_messages', true);
        const messages = radioData ? JSON.parse(radioData.value) : [];
        
        const container = document.getElementById('radio-messages');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="radio-empty">NO MESSAGES</div>';
            return;
        }
        
        messages.forEach((msg, index) => {
            const div = document.createElement('div');
            div.className = 'radio-message';
            const time = new Date(msg.timestamp).toLocaleTimeString();
            div.innerHTML = `
                <span class="radio-message-time">[${time}]</span>
                <span class="radio-message-user">${msg.user}</span>
                <span class="radio-message-text">${escapeHtml(msg.text)}</span>
                ${isAdmin ? `<button class="radio-delete-btn" onclick="deleteRadioMessage(${index})">X</button>` : ''}
            `;
            container.appendChild(div);
        });
        
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        console.error('Load radio error:', e);
    }
}

async function deleteRadioMessage(index) {
    try {
        const radioData = await storage.get('radio_messages', true);
        const messages = radioData ? JSON.parse(radioData.value) : [];
        
        messages.splice(index, 1);
        await storage.set('radio_messages', JSON.stringify(messages), true);
        
        await loadRadioMessages();
        playSound('sfx-denied');
    } catch (e) {
        console.error('Delete radio message error:', e);
    }
}

async function clearRadioMessages() {
    if (!confirm('Clear all radio messages?')) return;
    
    try {
        await storage.set('radio_messages', JSON.stringify([]), true);
        await loadRadioMessages();
        playSound('sfx-denied');
    } catch (e) {
        console.error('Clear radio error:', e);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== ANALYTICS ====================
async function loadAnalytics() {
    try {
        const usersData = await storage.get('users', true);
        const users = usersData ? JSON.parse(usersData.value) : {};
        
        const broadcastData = await storage.get('broadcasts', true);
        const broadcasts = broadcastData ? JSON.parse(broadcastData.value) : [];
        
        const radioData = await storage.get('radio_messages', true);
        const radioMsgs = radioData ? JSON.parse(radioData.value) : [];
        
        const pendingData = await storage.get('pending', true);
        const pending = pendingData ? JSON.parse(pendingData.value) : [];
        
        const totalUsers = Object.keys(users).length;
        const activeUsers = Object.values(users).filter(u => u.status === 'active').length;
        
        const el1 = document.getElementById('analytics-total-users');
        const el2 = document.getElementById('analytics-active-sessions');
        const el3 = document.getElementById('analytics-broadcasts');
        const el4 = document.getElementById('analytics-radio-msgs');
        
        if (el1) el1.textContent = totalUsers;
        if (el2) el2.textContent = activeUsers;
        if (el3) el3.textContent = broadcasts.length;
        if (el4) el4.textContent = radioMsgs.length;
        
    } catch (e) {
        console.error('Load analytics error:', e);
    }
}

// ==================== ALARMS ====================
function setAlarmTheme(theme) {
    document.body.className = '';
    if (theme !== 'green') {
        document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('arcs_alarm_theme', theme);
    playSound('sfx-blue');
}

// ==================== EDITING ====================
async function loadWelcomeContent() {
    try {
        const data = await storage.get('welcome', true);
        if (data) {
            const welcome = JSON.parse(data.value);
            const titleEl = document.getElementById('home-welcome-title');
            const textEl = document.getElementById('home-welcome-text');
            if (titleEl) titleEl.textContent = welcome.title;
            if (textEl) textEl.textContent = welcome.text;
        }
    } catch (e) {
        console.error('Load welcome error:', e);
    }
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
    try {
        const title = document.getElementById('welcome-title-input').value;
        const text = document.getElementById('welcome-text-input').value;
        
        document.getElementById('home-welcome-title').textContent = title;
        document.getElementById('home-welcome-text').textContent = text;
        
        await storage.set('welcome', JSON.stringify({ title, text }), true);
        
        closeWelcomeModal();
        playSound('sfx-sent');
    } catch (e) {
        console.error('Save welcome error:', e);
        playSound('sfx-error');
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
    const name = document.getElementById('new-tab-name')?.value.trim();
    const content = document.getElementById('new-tab-content')?.value.trim();
    
    if (!name || !content) {
        playSound('sfx-error');
        return;
    }
    
    try {
        const tabsData = await storage.get('custom_tabs', true);
        customTabs = tabsData ? JSON.parse(tabsData.value) : [];
        
        customTabs.push({
            id: Date.now().toString(),
            name,
            content,
            created: Date.now()
        });
        
        await storage.set('custom_tabs', JSON.stringify(customTabs), true);
        
        closeNewTabModal();
        playSound('sfx-sent');
        renderCustomTabsInEditor();
    } catch (e) {
        console.error('Save tab error:', e);
        playSound('sfx-error');
    }
}

async function renderCustomTabsInEditor() {
    try {
        const tabsData = await storage.get('custom_tabs', true);
        customTabs = tabsData ? JSON.parse(tabsData.value) : [];
        
        const canvas = document.getElementById('editing-canvas');
        if (!canvas) return;
        
        if (customTabs.length === 0) {
            canvas.innerHTML = '<div class="canvas-hint">CREATE NEW TABS OR EDIT THE WELCOME SCREEN</div>';
            return;
        }
        
        canvas.innerHTML = '';
        
        customTabs.forEach(tab => {
            const item = document.createElement('div');
            item.className = 'tab-preview-item';
            item.innerHTML = `
                <div class="tab-preview-name">${escapeHtml(tab.name)}</div>
                <div class="tab-preview-content">${escapeHtml(tab.content)}</div>
                <div class="tab-preview-actions">
                    <button onclick="deleteCustomTab('${tab.id}')">DELETE</button>
                </div>
            `;
            canvas.appendChild(item);
        });
    } catch (e) {
        console.error('Render tabs error:', e);
    }
}

async function deleteCustomTab(id) {
    if (!confirm('Delete this tab?')) return;
    
    try {
        customTabs = customTabs.filter(t => t.id !== id);
        await storage.set('custom_tabs', JSON.stringify(customTabs), true);
        
        renderCustomTabsInEditor();
        loadPublishedTabs();
        playSound('sfx-denied');
    } catch (e) {
        console.error('Delete tab error:', e);
    }
}

async function publishTabs() {
    if (customTabs.length === 0) {
        playSound('sfx-error');
        return;
    }
    
    try {
        await storage.set('published_tabs', JSON.stringify(customTabs), true);
        loadPublishedTabs();
        playSound('sfx-blue');
        alert(`${customTabs.length} TAB(S) PUBLISHED TO MENU`);
    } catch (e) {
        console.error('Publish tabs error:', e);
        playSound('sfx-error');
    }
}

async function loadPublishedTabs() {
    try {
        const data = await storage.get('published_tabs', true);
        if (!data) return;
        
        const tabs = JSON.parse(data.value);
        const menuContainer = document.getElementById('custom-menu-tabs');
        if (!menuContainer) return;
        
        menuContainer.innerHTML = '';
        
        tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = 'tab';
            tabEl.textContent = tab.name;
            tabEl.onclick = () => showCustomTab(tab);
            menuContainer.appendChild(tabEl);
        });
    } catch (e) {
        console.error('Load published tabs error:', e);
    }
}

function showCustomTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    let customContent = document.getElementById('custom-tab-view');
    if (!customContent) {
        customContent = document.createElement('div');
        customContent.id = 'custom-tab-view';
        customContent.className = 'tab-content';
        document.querySelector('.main-window')?.appendChild(customContent);
    }
    
    customContent.innerHTML = `
        <div class="custom-tab-content">
            <div class="custom-tab-title">${escapeHtml(tab.name)}</div>
            <div class="custom-tab-body">${escapeHtml(tab.content)}</div>
        </div>
    `;
    
    customContent.classList.add('active');
}

// ==================== ADMIN PANEL ====================
function openAdmin() {
    document.getElementById('admin-panel')?.classList.remove('hidden');
    loadPendingList('pending-list-modal');
}

function closeAdmin() {
    document.getElementById('admin-panel')?.classList.add('hidden');
}

// ==================== TAB NAVIGATION ====================
function switchTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.add('active');
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize storage
    await initializeStorage();
    
    // Load saved theme
    const savedTheme = localStorage.getItem('arcs_alarm_theme') || 'green';
    if (savedTheme !== 'green') {
        setAlarmTheme(savedTheme);
    }
    
    // Start loading after 1 second
    setTimeout(startLoading, 1000);
    
    // Tab click handlers
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const target = this.getAttribute('data-target');
            if (target) {
                switchTab(target);
                
                // Load specific data for tabs
                if (target === 'adm-editing') {
                    renderCustomTabsInEditor();
                }
            }
        });
    });
    
    // Enter key handlers
    document.getElementById('operator-id')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('operator-password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('radio-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendRadioMessage();
    });
});

// Make functions globally available
window.handleLogin = handleLogin;
window.handleNewOperator = handleNewOperator;
window.logout = logout;
window.goToHome = goToHome;
window.approveUser = approveUser;
window.denyUser = denyUser;
window.editUser = editUser;
window.closeEditUserModal = closeEditUserModal;
window.saveUserChanges = saveUserChanges;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.showUsersSection = showUsersSection;
window.sendBroadcast = sendBroadcast;
window.closeBroadcast = closeBroadcast;
window.sendRadioMessage = sendRadioMessage;
window.deleteRadioMessage = deleteRadioMessage;
window.clearRadioMessages = clearRadioMessages;
window.setAlarmTheme = setAlarmTheme;
window.editWelcomeHome = editWelcomeHome;
window.closeWelcomeModal = closeWelcomeModal;
window.saveWelcomeChanges = saveWelcomeChanges;
window.addNewTab = addNewTab;
window.closeNewTabModal = closeNewTabModal;
window.saveNewTab = saveNewTab;
window.deleteCustomTab = deleteCustomTab;
window.publishTabs = publishTabs;
window.showCustomTab = showCustomTab;
window.openAdmin = openAdmin;
window.closeAdmin = closeAdmin;
window.closeIdPopup = closeIdPopup;
window.copyUserId = copyUserId;