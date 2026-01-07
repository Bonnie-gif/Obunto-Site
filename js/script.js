const ADMIN_ID = '118107921024376';
let lastBroadcastTime = 0;

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => {});
    }
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

function handleLogin() {
    const userId = document.getElementById('operator-id').value.trim();
    
    if (!userId) {
        playSound('sfx-error');
        showStatus('ENTER OPERATOR ID', true);
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('arcs_users') || `{"${ADMIN_ID}":{"id":"${ADMIN_ID}","approved":true}}`);
    const pending = JSON.parse(localStorage.getItem('arcs_pending') || '[]');

    if (users[userId] && users[userId].approved) {
        playSound('sfx-poweron');
        document.getElementById('loading-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        
        if (userId === ADMIN_ID) {
            document.getElementById('admin-toggle').classList.remove('hidden');
        }
    } else if (!users[userId]) {
        if (!pending.includes(userId)) {
            pending.push(userId);
            localStorage.setItem('arcs_pending', JSON.stringify(pending));
        }
        playSound('sfx-sent');
        showStatus('REQUEST SENT - WAIT FOR APPROVAL');
        document.getElementById('operator-id').value = '';
    } else {
        playSound('sfx-denied');
        showStatus('ACCESS DENIED - NOT APPROVED', true);
    }
}

function toggleAdmin() {
    const panel = document.getElementById('admin-panel');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        loadPending();
    } else {
        panel.classList.add('hidden');
    }
}

function loadPending() {
    const pending = JSON.parse(localStorage.getItem('arcs_pending') || '[]');
    const list = document.getElementById('pending-list');
    list.innerHTML = '';
    
    if (pending.length === 0) {
        list.innerHTML = '<div style="padding:10px;text-align:center;">NO REQUESTS</div>';
        return;
    }
    
    pending.forEach(id => {
        const item = document.createElement('div');
        item.className = 'pending-item';
        item.innerHTML = `
            <span>${id}</span>
            <div class="actions">
                <button onclick="approve('${id}')">OK</button>
                <button onclick="deny('${id}')">NO</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function approve(id) {
    const users = JSON.parse(localStorage.getItem('arcs_users') || '{}');
    let pending = JSON.parse(localStorage.getItem('arcs_pending') || '[]');
    
    users[id] = { id, approved: true };
    pending = pending.filter(p => p !== id);
    
    localStorage.setItem('arcs_users', JSON.stringify(users));
    localStorage.setItem('arcs_pending', JSON.stringify(pending));
    
    playSound('sfx-blue');
    loadPending();
}

function deny(id) {
    let pending = JSON.parse(localStorage.getItem('arcs_pending') || '[]');
    pending = pending.filter(p => p !== id);
    localStorage.setItem('arcs_pending', JSON.stringify(pending));
    playSound('sfx-denied');
    loadPending();
}

function sendBroadcast() {
    const text = document.getElementById('broadcast-text').value.trim();
    const sprite = document.getElementById('sprite-select').value;
    
    if (!text) return;

    const message = {
        text: text,
        sprite: sprite,
        timestamp: Date.now()
    };

    localStorage.setItem('arcs_broadcast_msg', JSON.stringify(message));
    playSound('sfx-sent');
    document.getElementById('broadcast-text').value = '';
}

function checkBroadcast() {
    const data = localStorage.getItem('arcs_broadcast_msg');
    if (!data) return;

    const msg = JSON.parse(data);
    
    if (msg.timestamp > lastBroadcastTime) {
        lastBroadcastTime = msg.timestamp;
        showBroadcastPopup(msg);
    }
}

function showBroadcastPopup(msg) {
    const overlay = document.getElementById('broadcast-overlay');
    const textEl = document.getElementById('broadcast-message');
    const imgEl = document.getElementById('broadcast-image');

    textEl.innerText = msg.text;
    imgEl.src = `sprites/${msg.sprite}.png`;
    
    overlay.classList.remove('hidden');
    playSound('sfx-newmessage');

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 6000); 
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    });
});

window.onload = () => {
    setTimeout(startLoading, 800);
    setInterval(checkBroadcast, 1000);
};

document.getElementById('operator-id').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});