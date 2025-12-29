const SERVER_URL = "https://obunto.onrender.com"; 
let socket;
let currentUser = null;

const ui = {
    loginOverlay: document.getElementById('login-overlay'),
    loginInput: document.getElementById('login-id'),
    loginBtn: document.getElementById('btn-login'),
    loginMsg: document.getElementById('login-msg'),
    appContainer: document.getElementById('main-app'),
    userContent: document.getElementById('user-content'),
    adminPanel: document.getElementById('admin-panel')
};

window.onload = () => {
    socket = io(SERVER_URL);
    setupSocketListeners();
};

ui.loginBtn.addEventListener('click', performLogin);
ui.loginInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') performLogin() });

async function performLogin() {
    const id = ui.loginInput.value.trim();
    if (!id) return;

    ui.loginMsg.innerText = "CONNECTING...";
    ui.loginBtn.disabled = true;

    try {
        const response = await window.electronAPI.fetchData(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id })
        });

        if (response.error) throw new Error(response.error);
        const data = response.data;

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
        ui.userContent.classList.add('hidden');
        ui.adminPanel.classList.remove('hidden');
        initAdmin();
    } else {
        socket.emit('user_login', currentUser);
    }
}

function setupSocketListeners() {
    socket.on('receive_mascot', d => {
        alert(`[${d.type}] ${d.message}`);
    });
    socket.on('force_disconnect', () => location.reload());
    socket.on('account_frozen', () => { alert("ID FROZEN"); location.reload(); });
    socket.on('account_deleted', () => { alert("ID DELETED"); location.reload(); });
}

function initAdmin() {
    socket.emit('admin_login');
    socket.on('users_list', list => {
        const c = document.getElementById('userList');
        c.innerHTML = '';
        list.forEach(u => {
            const d = document.createElement('div');
            d.style.padding = '5px';
            d.style.borderBottom = '1px dashed #333';
            d.innerHTML = `
                <div style="font-size:10px; font-weight:bold; color:${u.frozen?'#b91c1c':'#15803d'}">
                    ${u.username} [${u.dept}]
                </div>
                <div style="font-size:9px; color:#555">${u.id}</div>
                ${u.online ? `<button onclick="act('kick','${u.id}')" style="font-size:8px">KICK</button>` : ''}
                <button onclick="act('freeze','${u.id}')" style="font-size:8px">FRZ</button>
                <button onclick="act('delete','${u.id}')" style="font-size:8px; color:red">DEL</button>
            `;
            c.appendChild(d);
        });
    });
}

function act(a, id) { if(confirm(a.toUpperCase()+"?")) socket.emit('admin_'+a, id); }
function manualAction(a) { const id = document.getElementById('manualId').value.trim(); if(id) act(a, id); }
function sendBc(type) { 
    const msg = document.getElementById('bcMsg').value; 
    if(msg) { socket.emit('admin_broadcast', { message:msg, type, target:'all', mood:'normal' }); document.getElementById('bcMsg').value=''; }
}