const socket = io();

// Lista de Humores
const MOODS = ['normal', 'happy', 'annoyed', 'sad', 'bug', 'werror', 'stare', 'smug', 'suspicious', 'sleeping', 'panic', 'hollow', 'dizzy'];
let currentMood = 'normal';

// DOM Elements
const screens = {
    boot: document.getElementById('boot-screen'),
    login: document.getElementById('login-screen'),
    desktop: document.getElementById('desktop-screen'),
    admin: document.getElementById('admin-screen')
};

// --- CICLO DE VIDA ---
window.onload = () => {
    // Simula Boot
    setTimeout(() => {
        screens.boot.classList.add('hidden');
        screens.login.classList.remove('hidden');
    }, 3500);

    updateClock();
    buildAdminPanel();
};

// --- SISTEMA DE LOGIN ---
document.getElementById('btnLogin').addEventListener('click', async () => {
    const id = document.getElementById('inpId').value.trim();
    const user = document.getElementById('inpUser').value.trim();
    const status = document.getElementById('loginStatus');

    if (!id || !user) {
        status.innerText = "ERR: EMPTY FIELDS";
        return;
    }

    status.innerText = "CONNECTING...";

    // Verifica Backdoor Admin
    if (id === "000" && user === "OBUNTO") {
        screens.login.classList.add('hidden');
        screens.admin.classList.remove('hidden');
        return;
    }

    // Login Normal
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id, usernameInput: user })
        });

        const result = await response.json();

        if (result.success) {
            setupUserProfile(result.userData);
            screens.login.classList.add('hidden');
            screens.desktop.classList.remove('hidden');
        } else {
            status.innerText = `ERR: ${result.message}`;
        }
    } catch (e) {
        status.innerText = "ERR: NETWORK FAIL";
    }
});

function setupUserProfile(data) {
    const container = document.getElementById('profile-content');
    container.innerHTML = `
        <div class="profile-layout">
            <img src="${data.avatar}" class="profile-pic">
            <div class="profile-data">
                <h2>${data.username.toUpperCase()}</h2>
                <p>ID: ${data.id}</p>
                <p>DEPT: ${data.department}</p>
                <p>RANK: ${data.rank}</p>
                <p>CLR: ${data.clearance}</p>
            </div>
        </div>
        <hr style="border:0; border-top:1px dashed #333; margin:15px 0;">
        <p>STATUS: ACTIVE</p>
        <p>LAST LOGIN: TODAY</p>
    `;
}

// --- FUNÇÕES DA ÁREA DE TRABALHO ---
function updateClock() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTimeout(updateClock, 1000);
}

function openWindow(winId) {
    document.getElementById(`${winId}-window`).classList.remove('hidden');
}

function closeWindow(winId) {
    document.getElementById(`${winId}-window`).classList.add('hidden');
}

function logout() {
    location.reload();
}

// --- FUNÇÕES DO ADMIN (OBUNTO) ---
function buildAdminPanel() {
    const container = document.getElementById('moodList');
    MOODS.forEach(mood => {
        const div = document.createElement('div');
        div.className = 'mood-icon';
        div.innerHTML = `<img src="obunto/${mood}.png">`;
        div.onclick = () => {
            document.querySelectorAll('.mood-icon').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            currentMood = mood;
        };
        container.appendChild(div);
    });
}

function sendBroadcast(type) {
    const msg = document.getElementById('adminMsg').value;
    if (!msg) return;

    socket.emit('mascot_broadcast', {
        message: msg,
        mood: currentMood,
        type: type
    });

    document.getElementById('adminMsg').value = "";
}

// --- RECEBIMENTO (SOCKET) ---
socket.on('display_mascot_message', (data) => {
    const overlay = document.getElementById('obunto-bubble');
    const img = document.getElementById('obunto-img');
    const txt = document.getElementById('obunto-text');

    img.src = `obunto/${data.mood}.png`;
    txt.innerText = data.message;

    overlay.className = 'obunto-overlay'; // Reset classes
    if (data.type === 'glitch') overlay.classList.add('glitch-active');
    
    overlay.classList.remove('hidden');

    // Auto-hide após 6 segundos
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 6000);
});