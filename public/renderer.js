const socket = io();

const UI = {
    screens: {
        boot: document.getElementById('boot-3'),
        boot2: document.getElementById('boot-2'),
        login: document.getElementById('login-screen'),
        desktop: document.getElementById('desktop-screen')
    },
    dash: {
        name: document.getElementById('dashName'),
        rank: document.getElementById('dashRank'),
        id: document.getElementById('dashId'),
        avatar: document.getElementById('dashAvatar'),
        depts: document.getElementById('dashDepts')
    },
    sidebar: {
        user: document.getElementById('sbUser'),
        rank: document.getElementById('sbRank')
    },
    login: {
        btn: document.getElementById('btnLogin'),
        input: document.getElementById('inpId'),
        status: document.getElementById('loginStatus')
    },
    obunto: {
        panel: document.getElementById('admin-panel'),
        btnOpen: document.getElementById('btnObuntoControl'),
        btnClose: document.getElementById('closeAdmin'),
        moods: document.getElementById('mood-container'),
        target: document.getElementById('targetId'),
        msg: document.getElementById('adminMsg'),
        btnSend: document.getElementById('btnBroadcast'),
        bubble: document.getElementById('obunto-bubble'),
        img: document.getElementById('obunto-img'),
        text: document.getElementById('obunto-text')
    },
    clock: document.getElementById('clock'),
    date: document.getElementById('dateDisplay')
};

let currentUser = null;
let currentMood = 'normal';
const MOODS = ['annoyed', 'bug', 'dizzy', 'happy', 'hollow', 'normal', 'panic', 'sad', 'sleeping', 'Smug', 'stare', 'suspicious', 'werror'];

async function login() {
    const id = UI.login.input.value.trim();
    if (!id) return;

    UI.login.status.textContent = "SYNCING WITH MAINFRAME...";
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: id })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.userData;
            
            socket.emit('register_user', currentUser.id);

            populateDashboard(currentUser);

            // Troca de tela
            UI.screens.login.classList.add('hidden');
            UI.screens.desktop.classList.remove('hidden');
            UI.screens.desktop.classList.add('active');

            // Habilita controle para ID 8989
            if (currentUser.id === "8989") {
                UI.obunto.btnOpen.classList.remove('hidden');
                setupObuntoPanel();
            }

            speakObunto(`Identity verified. Workstation ready, ${currentUser.username}.`, "happy");

        } else {
            UI.login.status.textContent = "ERRO: " + data.message;
            speakObunto("Authentication failed.", "suspicious");
        }
    } catch (e) {
        console.error(e);
        UI.login.status.textContent = "CONNECTION FAILURE";
    }
}

function populateDashboard(user) {
    // Sidebar
    UI.sidebar.user.textContent = user.username.toUpperCase();
    UI.sidebar.rank.textContent = user.rank;

    // Cartão Principal
    UI.dash.name.textContent = user.displayName;
    UI.dash.rank.textContent = user.rank;
    UI.dash.id.textContent = user.id;
    UI.dash.avatar.src = user.avatar || '/assets/icon-large-owner_info-28x14.png';

    // Lista de Departamentos (Dados REAIS da API)
    UI.dash.depts.innerHTML = '';
    if (user.affiliations && user.affiliations.length > 0) {
        user.affiliations.forEach(aff => {
            const div = document.createElement('div');
            div.className = 'dept-row';
            div.innerHTML = `
                <div class="dept-name">${aff.groupName}</div>
                <div class="dept-role">${aff.role}</div>
            `;
            UI.dash.depts.appendChild(div);
        });
    } else {
        UI.dash.depts.innerHTML = '<div class="dept-row">NO TSC AFFILIATIONS DETECTED</div>';
    }
}

function setupObuntoPanel() {
    UI.obunto.moods.innerHTML = '';
    MOODS.forEach(mood => {
        const div = document.createElement('div');
        div.className = 'mood-icon';
        if (mood === 'normal') div.classList.add('active');
        div.innerHTML = `<img src="/obunto/${mood}.png"><br><span>${mood}</span>`;
        div.onclick = () => {
            document.querySelectorAll('.mood-icon').forEach(m => m.classList.remove('active'));
            div.classList.add('active');
            currentMood = mood;
        };
        UI.obunto.moods.appendChild(div);
    });

    UI.obunto.btnOpen.onclick = () => UI.obunto.panel.classList.remove('hidden');
    UI.obunto.btnClose.onclick = () => UI.obunto.panel.classList.add('hidden');
    
    UI.obunto.btnSend.onclick = () => {
        const msg = UI.obunto.msg.value.trim();
        const target = UI.obunto.target.value.trim();
        
        if (!msg) return;

        socket.emit('mascot_broadcast', {
            message: msg,
            mood: currentMood,
            targetId: target 
        });

        UI.obunto.msg.value = '';
        speakObunto("Message transmitted.", "smug");
    };
}

function speakObunto(text, mood) {
    UI.obunto.img.src = `/obunto/${mood}.png`;
    UI.obunto.text.textContent = text;
    UI.obunto.bubble.classList.remove('hidden');
    setTimeout(() => {
        UI.obunto.bubble.classList.add('hidden');
    }, 6000);
}

socket.on('display_mascot_message', (data) => {
    speakObunto(data.message, data.mood);
});

document.addEventListener("DOMContentLoaded", () => {
    setInterval(() => {
        const now = new Date();
        UI.clock.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const year = now.getFullYear() + 16;
        UI.date.textContent = `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    }, 1000);

    setTimeout(() => {
        UI.screens.boot.classList.add('hidden');
        UI.screens.boot2.classList.remove('hidden');
        setTimeout(() => {
            UI.screens.boot2.classList.add('hidden');
            UI.screens.login.classList.remove('hidden');
        }, 3000);
    }, 3000);

    UI.login.btn.onclick = login;
    UI.login.input.addEventListener("keydown", e => { if (e.key === "Enter") login(); });
});