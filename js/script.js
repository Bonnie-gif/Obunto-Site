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
                loadPending('pending-list');
                loadPublishedTabs();
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

let editorElements = [];
let currentElement = null;
let dragElement = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let welcomeData = {
    title: 'WELCOME',
    text: 'WELCOME TO ARCS V3.2.2. SELECT A MODULE FROM THE MENU BAR TO BEGIN OPERATIONS.'
};

function editWelcome() {
    const modal = document.getElementById('element-editor-modal');
    const typeSelect = document.getElementById('element-type');
    const textOptions = document.getElementById('text-options');
    const imageOptions = document.getElementById('image-options');
    const tabOptions = document.getElementById('tab-options');
    
    typeSelect.value = 'text';
    textOptions.classList.remove('hidden');
    imageOptions.classList.add('hidden');
    tabOptions.classList.add('hidden');
    
    document.getElementById('element-text').value = `${welcomeData.title}\n\n${welcomeData.text}`;
    
    currentElement = { type: 'welcome' };
    modal.classList.remove('hidden');
}

function addNewElement() {
    currentElement = { 
        id: Date.now().toString(),
        type: 'text',
        x: 50,
        y: 50,
        content: '',
        image: null,
        tabName: '',
        tabContent: ''
    };
    
    const modal = document.getElementById('element-editor-modal');
    modal.classList.remove('hidden');
    
    updateElementType();
}

function updateElementType() {
    const type = document.getElementById('element-type').value;
    const textOptions = document.getElementById('text-options');
    const imageOptions = document.getElementById('image-options');
    const tabOptions = document.getElementById('tab-options');
    
    textOptions.classList.add('hidden');
    imageOptions.classList.add('hidden');
    tabOptions.classList.add('hidden');
    
    if (type === 'text') {
        textOptions.classList.remove('hidden');
    } else if (type === 'image') {
        imageOptions.classList.remove('hidden');
    } else if (type === 'tab') {
        tabOptions.classList.remove('hidden');
    }
}

function uploadElementImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('image-preview');
                preview.innerHTML = `<img src="${event.target.result}" style="max-width: 100%; max-height: 200px;">`;
                if (currentElement) {
                    currentElement.image = event.target.result;
                }
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function saveElement() {
    if (!currentElement) return;
    
    if (currentElement.type === 'welcome') {
        const text = document.getElementById('element-text').value;
        const lines = text.split('\n').filter(l => l.trim());
        welcomeData.title = lines[0] || 'WELCOME';
        welcomeData.text = lines.slice(1).join(' ') || 'No message';
        
        document.querySelector('.welcome-title').textContent = welcomeData.title;
        document.querySelector('.welcome-text').textContent = welcomeData.text;
        
        localStorage.setItem('arcs-welcome', JSON.stringify(welcomeData));
        
    } else {
        const type = document.getElementById('element-type').value;
        currentElement.type = type;
        
        if (type === 'text') {
            currentElement.content = document.getElementById('element-text').value;
        } else if (type === 'tab') {
            currentElement.tabName = document.getElementById('tab-name').value;
            currentElement.tabContent = document.getElementById('tab-content').value;
        }
        
        const existing = editorElements.find(e => e.id === currentElement.id);
        if (existing) {
            Object.assign(existing, currentElement);
        } else {
            editorElements.push(currentElement);
        }
        
        renderCanvas();
        localStorage.setItem('arcs-editor-elements', JSON.stringify(editorElements));
    }
    
    closeElementEditor();
    playSound('sfx-sent');
}

function closeElementEditor() {
    document.getElementById('element-editor-modal').classList.add('hidden');
    currentElement = null;
}

function renderCanvas() {
    const canvas = document.getElementById('editing-canvas');
    const hint = canvas.querySelector('.canvas-hint');
    if (hint && editorElements.length > 0) {
        hint.remove();
    }
    
    editorElements.forEach(elem => {
        let existing = canvas.querySelector(`[data-elem-id="${elem.id}"]`);
        if (!existing) {
            existing = document.createElement('div');
            existing.className = 'canvas-element';
            existing.setAttribute('data-elem-id', elem.id);
            existing.style.left = elem.x + 'px';
            existing.style.top = elem.y + 'px';
            
            existing.addEventListener('mousedown', startDrag);
            existing.addEventListener('dblclick', () => editElement(elem.id));
            
            canvas.appendChild(existing);
        }
        
        if (elem.type === 'text') {
            existing.innerHTML = `
                <div class="element-content">${elem.content}</div>
                <div class="element-controls">
                    <button onclick="deleteElement('${elem.id}')">X</button>
                </div>
            `;
        } else if (elem.type === 'image') {
            existing.innerHTML = `
                <img src="${elem.image}" class="element-image">
                <div class="element-controls">
                    <button onclick="deleteElement('${elem.id}')">X</button>
                </div>
            `;
        } else if (elem.type === 'tab') {
            existing.innerHTML = `
                <div class="element-tab-preview">
                    <div class="tab-preview-name">TAB: ${elem.tabName}</div>
                </div>
                <div class="element-controls">
                    <button onclick="deleteElement('${elem.id}')">X</button>
                </div>
            `;
        }
    });
}

function startDrag(e) {
    if (e.target.tagName === 'BUTTON') return;
    
    dragElement = e.currentTarget;
    const rect = dragElement.getBoundingClientRect();
    const canvasRect = document.getElementById('editing-canvas').getBoundingClientRect();
    
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    
    dragElement.style.opacity = '0.7';
}

function doDrag(e) {
    if (!dragElement) return;
    
    const canvas = document.getElementById('editing-canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    let x = e.clientX - canvasRect.left - dragOffsetX;
    let y = e.clientY - canvasRect.top - dragOffsetY;
    
    x = Math.max(0, Math.min(x, canvasRect.width - dragElement.offsetWidth));
    y = Math.max(0, Math.min(y, canvasRect.height - dragElement.offsetHeight));
    
    dragElement.style.left = x + 'px';
    dragElement.style.top = y + 'px';
    
    const elemId = dragElement.getAttribute('data-elem-id');
    const elem = editorElements.find(e => e.id === elemId);
    if (elem) {
        elem.x = x;
        elem.y = y;
    }
}

function stopDrag() {
    if (dragElement) {
        dragElement.style.opacity = '1';
        localStorage.setItem('arcs-editor-elements', JSON.stringify(editorElements));
    }
    dragElement = null;
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
}

function editElement(id) {
    currentElement = editorElements.find(e => e.id === id);
    if (!currentElement) return;
    
    const modal = document.getElementById('element-editor-modal');
    document.getElementById('element-type').value = currentElement.type;
    
    updateElementType();
    
    if (currentElement.type === 'text') {
        document.getElementById('element-text').value = currentElement.content;
    } else if (currentElement.type === 'image') {
        const preview = document.getElementById('image-preview');
        preview.innerHTML = `<img src="${currentElement.image}" style="max-width: 100%; max-height: 200px;">`;
    } else if (currentElement.type === 'tab') {
        document.getElementById('tab-name').value = currentElement.tabName;
        document.getElementById('tab-content').value = currentElement.tabContent;
    }
    
    modal.classList.remove('hidden');
}

function deleteElement(id) {
    if (confirm('Delete this element?')) {
        editorElements = editorElements.filter(e => e.id !== id);
        const elem = document.querySelector(`[data-elem-id="${id}"]`);
        if (elem) elem.remove();
        
        localStorage.setItem('arcs-editor-elements', JSON.stringify(editorElements));
        playSound('sfx-denied');
    }
}

function publishChanges() {
    const tabs = editorElements.filter(e => e.type === 'tab');
    
    if (tabs.length === 0) {
        alert('NO TABS TO PUBLISH');
        return;
    }
    
    localStorage.setItem('arcs-published-tabs', JSON.stringify(tabs));
    loadPublishedTabs();
    
    playSound('sfx-blue');
    alert(`${tabs.length} TAB(S) PUBLISHED TO MENU`);
}

function loadPublishedTabs() {
    const saved = localStorage.getItem('arcs-published-tabs');
    if (!saved) return;
    
    const tabs = JSON.parse(saved);
    const menuContainer = document.getElementById('custom-menu-tabs');
    menuContainer.innerHTML = '';
    
    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = 'tab';
        tabEl.textContent = tab.tabName;
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
            <div class="custom-tab-title">${tab.tabName}</div>
            <div class="custom-tab-body">${tab.tabContent}</div>
        </div>
    `;
    
    customContent.classList.add('active');
}

function loadEditor() {
    const saved = localStorage.getItem('arcs-editor-elements');
    if (saved) {
        editorElements = JSON.parse(saved);
        renderCanvas();
    }
    
    const savedWelcome = localStorage.getItem('arcs-welcome');
    if (savedWelcome) {
        welcomeData = JSON.parse(savedWelcome);
        const titleEl = document.querySelector('.welcome-title');
        const textEl = document.querySelector('.welcome-text');
        if (titleEl) titleEl.textContent = welcomeData.title;
        if (textEl) textEl.textContent = welcomeData.text;
    }
}

window.addEventListener('load', async () => {
    await init();
    loadEditor();
    
    const savedTheme = localStorage.getItem('alarm-theme') || 'green';
    if (savedTheme !== 'green') {
        setAlarmTheme(savedTheme);
    }
    
    setTimeout(startLoading, 1000);
});