let socket;
let currentUser = null;

const ui = {
    loginOverlay: document.getElementById('login-overlay'),
    loginInput: document.getElementById('login-id'),
    loginBtn: document.getElementById('btn-login'),
    loginMsg: document.getElementById('login-msg'),
    appContainer: document.querySelector('.app-container'),
    adminPanel: document.getElementById('admin-panel'),
    userContent: document.getElementById('user-content')
};

window.onload = () => {
    // Conecta ao Socket.io do próprio servidor (mesma origem)
    socket = io();
    setupSocketListeners();
    document.getElementById('login-id').focus();
};

ui.loginBtn.addEventListener('click', performLogin);
ui.loginInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') performLogin() });

async function performLogin() {
    const id = ui.loginInput.value.trim();
    if (!id) return;

    ui.loginMsg.innerText = "CONNECTING...";
    ui.loginBtn.disabled = true;

    try {
        // Fetch direto para a API do próprio site
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id })
        });

        const data = await res.json();

        if (data.success) {
            currentUser = data.userData;
            setupSession();
        } else {
            ui.loginMsg.innerText = "DENIED: " + (data.message || "UNKNOWN");
            ui.loginBtn.disabled = false;
        }
    } catch (err) {
        ui.loginMsg.innerText = "CONNECTION FAILED";
        ui.loginBtn.disabled = false;
        console.error(err);
    }
}

function setupSession() {
    ui.loginOverlay.style.display = 'none';
    ui.appContainer.classList.remove('blur-lock');
    
    document.getElementById('profile-name').innerText = currentUser.username;
    document.getElementById('profile-id').innerText = currentUser.id;
    document.getElementById('profile-rank').innerText = currentUser.rank;
    if(currentUser.avatar) document.getElementById('profile-avatar').src = currentUser.avatar;

    if (currentUser.isAdmin) {
        if(ui.userContent) ui.userContent.classList.add('hidden');
        if(ui.adminPanel) {
            ui.adminPanel.classList.remove('hidden');
            initAdmin();
        }
    } else {
        socket.emit('user_login', currentUser);
    }
    
    // Inicia sua lógica antiga se existir
    if(window.init) window.init();
}

function setupSocketListeners() {
    socket.on('receive_mascot', d => {
        if(window.Assistant) window.Assistant.speak(d.message, "normal");
        else alert(d.message);
    });
    socket.on('force_disconnect', () => location.reload());
    socket.on('account_frozen', () => { alert("ID FROZEN"); location.reload(); });
    socket.on('account_deleted', () => { alert("ID DELETED"); location.reload(); });
}

function initAdmin() {
    socket.emit('admin_login');
    socket.on('users_list', list => {
        const c = document.getElementById('userList');
        if(!c) return;
        c.innerHTML = '';
        list.forEach(u => {
            const d = document.createElement('div');
            d.className = 'db-entry';
            d.innerHTML = `
                <div style="font-weight:bold; color:${u.frozen?'#b91c1c':'#15803d'}">
                    ${u.username}
                </div>
                <div style="font-size:9px; opacity:0.7">${u.dept}</div>
                <div style="margin-top:2px;">
                    ${u.online ? `<button onclick="act('kick','${u.id}')" class="mini-btn">KICK</button>` : ''}
                    <button onclick="act('freeze','${u.id}')" class="mini-btn">FRZ</button>
                    <button onclick="act('delete','${u.id}')" class="mini-btn" style="color:#b91c1c">DEL</button>
                </div>
            `;
            c.appendChild(d);
        });
    });
}

function act(a, id) { if(confirm(a.toUpperCase()+"?")) socket.emit('admin_'+a, id); }
function manualAction(a) { const id = document.getElementById('manualId').value.trim(); if(id) act(a, id); }
function sendBc(type) { 
    const msg = document.getElementById('bcMsg').value; 
    if(msg) { socket.emit('admin_broadcast', { message:msg, type, target:'all' }); document.getElementById('bcMsg').value=''; }
}