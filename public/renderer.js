const socket = io();

// UI Elements Map
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

/* ================= LOGIN ================= */

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
            
            // Register socket
            socket.emit('register_user', currentUser.id);

            // Populate Dash
            populateDashboard(currentUser);

            // Show Desktop
            UI.screens.login.classList.add('hidden');
            UI.screens.desktop.classList.remove('hidden');
            UI.screens.desktop.classList.add('active');

            // === OBUNTO MASTER CONTROL CHECK ===
            if (currentUser.id === "8989") {
                // Show the control button in dock
                UI.obunto.btnOpen.classList.remove('hidden');
                // Initialize the control panel logic
                setupObuntoPanel();
                speakObunto("System Control Online. Awaiting manual input.", "smug");
            } else {
                speakObunto(`Welcome back, ${currentUser.username}.`, "happy");
            }

        } else {
            UI.login.status.textContent = "ERROR: " + data.message;
            speakObunto("Access Denied.", "suspicious");
        }
    } catch (e) {
        console.error(e);
        UI.login.status.textContent = "CONNECTION FAILURE";
    }
}

function populateDashboard(user) {
    UI.sidebar.user.textContent = user.username.toUpperCase();
    UI.sidebar.rank.textContent = user.rank;

    UI.dash.name.textContent = user.displayName;
    UI.dash.rank.textContent = user.rank;
    UI.dash.id.textContent = user.id;
    UI.dash.avatar.src = user.avatar || '/assets/icon-large-owner_info-28x14.png';

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
        UI.dash.depts.innerHTML = '<div class="dept-row">NO TSC AFFILIATIONS</div>';
    }
}

/* ================= OBUNTO LOGIC ================= */

function setupObuntoPanel() {
    // Generate Mood Grid
    UI.obunto.moods.innerHTML = '';
    MOODS.forEach(mood => {
        const div = document.createElement('div');
        div.className = 'mood-icon';
        if (mood === 'normal') div.classList.add('active'); // Default active
        div.innerHTML = `<img src="/obunto/${mood}.png"><br><span>${mood}</span>`;
        
        div.onclick = () => {
            // Remove active class from all
            document.querySelectorAll('.mood-icon').forEach(m => m.classList.remove('active'));
            // Add to clicked
            div.classList.add('active');
            currentMood = mood;
        };
        UI.obunto.moods.appendChild(div);
    });

    // Panel Open/Close
    UI.obunto.btnOpen.onclick = () => UI.obunto.panel.classList.remove('hidden');
    UI.obunto.btnClose.onclick = () => UI.obunto.panel.classList.add('hidden');
    
    // Send Logic
    UI.obunto.btnSend.onclick = () => {
        const msg = UI.obunto.msg.value.trim();
        const target = UI.obunto.target.value.trim();
        
        if (!msg) {
            alert("Message cannot be empty.");
            return;
        }

        // Send to Server
        socket.emit('mascot_broadcast', {
            message: msg,
            mood: currentMood,
            targetId: target 
        });

        // Clear message but keep target (useful for chatting)
        UI.obunto.msg.value = '';
        
        // Show local confirmation
        const type = target ? `USER ${target}` : "GLOBAL";
        speakObunto(`Message transmitted to [${type}].`, "smug");
    };
}

// Global function to show bubble
function speakObunto(text, mood) {
    UI.obunto.img.src = `/obunto/${mood}.png`;
    UI.obunto.text.textContent = text;
    UI.obunto.bubble.classList.remove('hidden');
    
    // Auto hide after 6 seconds
    if (window.obuntoTimeout) clearTimeout(window.obuntoTimeout);
    window.obuntoTimeout = setTimeout(() => {
        UI.obunto.bubble.classList.add('hidden');
    }, 6000);
}

// Socket Listener
socket.on('display_mascot_message', (data) => {
    speakObunto(data.message, data.mood);
});

/* ================= BOOT & CLOCK ================= */

document.addEventListener("DOMContentLoaded", () => {
    // Clock
    setInterval(() => {
        const now = new Date();
        UI.clock.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const year = now.getFullYear() + 16;
        UI.date.textContent = `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    }, 1000);

    // Boot Sequence
    setTimeout(() => {
        UI.screens.boot.classList.add('hidden');
        UI.screens.boot2.classList.remove('hidden');
        setTimeout(() => {
            UI.screens.boot2.classList.add('hidden');
            UI.screens.login.classList.remove('hidden');
        }, 3000);
    }, 3000);

    // Event Listeners
    UI.login.btn.onclick = login;
    UI.login.input.addEventListener("keydown", e => { if (e.key === "Enter") login(); });
});