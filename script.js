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
    
    showBroadcast({ text, sprite });
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

function setAlarmTheme(theme) {
    document.body.className = '';
    if (theme !== 'green') {
        document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('alarm-theme', theme);
    playSound('sfx-blue');
}

let customTabs = [];
let activeTabId = null;

function loadCustomTabs() {
    const saved = localStorage.getItem('arcs-custom-tabs');
    if (saved) {
        customTabs = JSON.parse(saved);
        renderCustomTabsList();
    }
}

function renderCustomTabsList() {
    const list = document.getElementById('custom-tabs-list');
    if (!list) return;
    
    list.innerHTML = '';
    customTabs.forEach(tab => {
        const item = document.createElement('div');
        item.className = `tab-item ${activeTabId === tab.id ? 'active' : ''}`;
        item.innerHTML = `
            <span>${tab.name}</span>
            <div class="tab-item-actions">
                <div class="tab-action-btn" onclick="editCustomTab('${tab.id}')">✎</div>
                <div class="tab-action-btn" onclick="deleteCustomTab('${tab.id}')">×</div>
            </div>
        `;
        item.onclick = (e) => {
            if (!e.target.classList.contains('tab-action-btn')) {
                editCustomTab(tab.id);
            }
        };
        list.appendChild(item);
    });
}

function createNewCustomTab() {
    const newTab = {
        id: Date.now().toString(),
        name: 'New Tab',
        material: 'paper',
        content: '',
        image: null
    };
    customTabs.push(newTab);
    renderCustomTabsList();
    editCustomTab(newTab.id);
}

function editCustomTab(tabId) {
    activeTabId = tabId;
    const tab = customTabs.find(t => t.id === tabId);
    if (!tab) return;
    
    const editor = document.getElementById('tab-editor');
    editor.innerHTML = `
        <div class="editor-section">
            <div class="editor-section-title">Tab Settings</div>
            <div class="editor-field">
                <label class="editor-label">Tab Name</label>
                <input type="text" class="editor-input" value="${tab.name}" onchange="updateTabField('${tabId}', 'name', this.value)">
            </div>
        </div>
        
        <div class="editor-section">
            <div class="editor-section-title">Background Material</div>
            <div class="material-selector">
                <div class="material-option ${tab.material === 'paper' ? 'active' : ''}" onclick="updateTabField('${tabId}', 'material', 'paper')">PAPER</div>
                <div class="material-option ${tab.material === 'metal' ? 'active' : ''}" onclick="updateTabField('${tabId}', 'material', 'metal')">METAL</div>
                <div class="material-option ${tab.material === 'wood' ? 'active' : ''}" onclick="updateTabField('${tabId}', 'material', 'wood')">WOOD</div>
                <div class="material-option ${tab.material === 'screen' ? 'active' : ''}" onclick="updateTabField('${tabId}', 'material', 'screen')">SCREEN</div>
            </div>
        </div>
        
        <div class="editor-section">
            <div class="editor-section-title">Content</div>
            <div class="editor-field">
                <label class="editor-label">Text Content</label>
                <textarea class="editor-textarea" onchange="updateTabField('${tabId}', 'content', this.value)">${tab.content}</textarea>
            </div>
        </div>
        
        <div class="editor-section">
            <div class="editor-section-title">Image</div>
            <div class="image-upload-zone ${tab.image ? 'has-image' : ''}" onclick="uploadTabImage('${tabId}')">
                ${tab.image ? `<img src="${tab.image}" class="uploaded-image-preview"><div class="image-remove-btn" onclick="event.stopPropagation(); removeTabImage('${tabId}')">×</div>` : 'CLICK TO UPLOAD IMAGE'}
            </div>
        </div>
        
        <div class="editor-preview">
            <div class="preview-label">Preview</div>
            <div class="preview-content" style="background: ${getMaterialStyle(tab.material)}">
                ${tab.image ? `<img src="${tab.image}" style="max-width:100%; margin-bottom:16px;">` : ''}
                ${tab.content}
            </div>
        </div>
    `;
    
    renderCustomTabsList();
}

function updateTabField(tabId, field, value) {
    const tab = customTabs.find(t => t.id === tabId);
    if (tab) {
        tab[field] = value;
        if (field === 'name') {
            renderCustomTabsList();
        } else {
            editCustomTab(tabId);
        }
    }
}

function deleteCustomTab(tabId) {
    if (confirm('Delete this tab?')) {
        customTabs = customTabs.filter(t => t.id !== tabId);
        renderCustomTabsList();
        document.getElementById('tab-editor').innerHTML = `
            <div class="empty-editor-state">
                <div class="empty-editor-icon">📝</div>
                <div class="empty-editor-text">SELECT A TAB OR CREATE A NEW ONE</div>
            </div>
        `;
    }
}

function getMaterialStyle(material) {
    const styles = {
        paper: '#F5F0E8',
        metal: '#C0C8D0',
        wood: '#D4B896',
        screen: '#E8F0E8'
    };
    return styles[material] || '#E0D8C0';
}

function saveCustomTabs() {
    localStorage.setItem('arcs-custom-tabs', JSON.stringify(customTabs));
    playSound('sfx-sent');
    alert('TABS SAVED');
}

function publishCustomTabs() {
    saveCustomTabs();
    playSound('sfx-blue');
    alert('TABS PUBLISHED TO MENU');
}

function uploadTabImage(tabId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                updateTabField(tabId, 'image', event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function removeTabImage(tabId) {
    updateTabField(tabId, 'image', null);
}

window.addEventListener('load', async () => {
    await init();
    loadCustomTabs();
    
    const savedTheme = localStorage.getItem('alarm-theme') || 'green';
    if (savedTheme !== 'green') {
        setAlarmTheme(savedTheme);
    }
    
    setTimeout(startLoading, 1000);
});