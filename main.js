// TSC Newton OS - Unified Logic

const SOUNDS = {
    boot: document.getElementById('sfx-boot'),
    click: document.getElementById('sfx-click'),
    notify: document.getElementById('sfx-notify'),
    denied: document.getElementById('sfx-denied'),
    sent: document.getElementById('sfx-sent'),
    error: document.getElementById('sfx-error'),
    powerOn: document.getElementById('sfx-power-on'),
    powerOff: document.getElementById('sfx-power-off')
};

function playSound(name) {
    if (SOUNDS[name]) {
        try {
            SOUNDS[name].currentTime = 0;
            SOUNDS[name].play().catch(() => {});
        } catch (e) {}
    }
}

let socket;
try {
    socket = io();
} catch (e) {
    console.error("Socket IO failed:", e);
    socket = { on: () => {}, emit: () => {} };
}

let currentUser = null;
let idleTimer;
let currentView = 'IDLE';
const IDLE_LIMIT = 60000;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Audio Init
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => playSound('click'));
    });

    // 2. Boot Sequence
    const bootScreen = document.getElementById('boot-sequence');
    if (bootScreen) {
        playSound('boot');
        setTimeout(() => {
            bootScreen.classList.add('hidden');
            const loginScreen = document.getElementById('login-screen');
            if (loginScreen) {
                loginScreen.classList.remove('hidden');
                loginScreen.classList.add('active');
            }
        }, 6000);
    }

    // 3. Clock
    setInterval(() => {
        const now = new Date();
        const clock = document.getElementById('clock');
        const dateDisplay = document.getElementById('dateDisplay');
        if (clock) clock.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        if (dateDisplay) {
            const year = now.getFullYear() + 16;
            dateDisplay.textContent = `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        }
    }, 1000);

    // 4. Login Logic
    const btnLogin = document.getElementById('btnLogin');
    const inpId = document.getElementById('inpId');

    async function attemptLogin() {
        const userId = inpId.value.trim();
        const status = document.getElementById('loginStatus');
        if (!userId) return;

        status.textContent = "AUTHENTICATING...";
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            
            if (data.success) {
                status.textContent = "ACCESS GRANTED";
                playSound('notify');
                currentUser = data.userData;
                socket.emit('register_user', currentUser.id);
                
                // Update Sidebar/Dash
                document.getElementById('sbUser').textContent = currentUser.username.toUpperCase();
                document.getElementById('sbRank').textContent = currentUser.rank;
                
                const dashName = document.getElementById('dashName');
                if (dashName) dashName.textContent = currentUser.displayName.toUpperCase();
                
                const dashAvatar = document.getElementById('dashAvatar');
                if (dashAvatar && currentUser.avatar) dashAvatar.src = currentUser.avatar;
                
                // Show Admin Tools if applicable
                if (currentUser.isObunto || currentUser.isHoltz) {
                    document.getElementById('btnObuntoControl').classList.remove('hidden');
                    document.getElementById('admin-panel').classList.remove('hidden');
                }

                setTimeout(() => {
                    document.getElementById('login-screen').classList.add('hidden');
                    document.getElementById('desktop-screen').classList.remove('hidden');
                    document.getElementById('desktop-screen').classList.add('active');
                }, 1000);
            } else {
                status.textContent = data.message || "ACCESS DENIED";
                playSound('denied');
            }
        } catch (e) {
            status.textContent = "CONNECTION ERROR";
            playSound('error');
        }
    }

    if (btnLogin) btnLogin.onclick = attemptLogin;
    if (inpId) inpId.onkeydown = (e) => { if (e.key === "Enter") attemptLogin(); };

    // 5. Window Management
    function toggleWindow(id) {
        const win = document.getElementById(id);
        if (win) {
            if (win.classList.contains('hidden')) {
                win.classList.remove('hidden');
                playSound('click');
            } else {
                win.classList.add('hidden');
            }
        }
    }

    document.getElementById('btnOpenNotepad').onclick = () => toggleWindow('notepad-window');
    document.getElementById('closeNotepad').onclick = () => toggleWindow('notepad-window');
    
    document.getElementById('btnOpenDarch').onclick = () => toggleWindow('darch-window');
    document.getElementById('closeDarch').onclick = () => toggleWindow('darch-window');
    
    document.getElementById('btnOpenComms').onclick = () => toggleWindow('comms-window');
    document.getElementById('closeComms').onclick = () => toggleWindow('comms-window');

    document.getElementById('btnOpenHelp').onclick = () => toggleWindow('help-window');
    document.getElementById('closeHelp').onclick = () => toggleWindow('help-window');

    document.getElementById('btnMyDashboard').onclick = () => {
        document.querySelectorAll('.viewer').forEach(v => v.classList.add('hidden'));
        document.getElementById('view-dashboard').classList.remove('hidden');
        currentView = 'DASHBOARD';
        reportActivity();
    };

    // 6. AFK / Activity
    function reportActivity(isAfk = false) {
        if (!currentUser) return;
        const openWins = [];
        document.querySelectorAll('.window-newton:not(.hidden)').forEach(w => openWins.push(w.id));
        socket.emit('update_activity', { view: currentView, afk: isAfk, fullState: { windows: openWins } });
    }

    function resetIdle() {
        clearTimeout(idleTimer);
        reportActivity(false);
        idleTimer = setTimeout(() => reportActivity(true), IDLE_LIMIT);
    }
    document.addEventListener('mousemove', resetIdle);
    document.addEventListener('keydown', resetIdle);

    // 7. Socket Events
    socket.on('status_update', (status) => {
        document.getElementById('statusText').textContent = status;
        const ind = document.getElementById('statusIndicator');
        ind.style.backgroundColor = status === 'ONLINE' ? '#4ade80' : '#9ca3af';
        ind.style.boxShadow = status === 'ONLINE' ? '0 0 5px #4ade80' : 'none';
    });

    socket.on('alarm_update', (type) => {
        document.body.className = '';
        const banner = document.getElementById('alarm-banner');
        if (type === 'off') {
            banner.classList.add('hidden');
            document.getElementById('power-off-overlay').classList.remove('hidden');
        } else if (type !== 'green') {
            document.body.classList.add(`alarm-${type}`);
            banner.classList.remove('hidden');
            document.getElementById('alarm-type-text').textContent = `${type.toUpperCase()} ALERT`;
        }
    });

    // 8. Extras (Konami Code)
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let kIndex = 0;
    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[kIndex]) {
            kIndex++;
            if (kIndex === konamiCode.length) {
                kIndex = 0;
                alert("KONAMI CODE ACTIVATED: GOD MODE (Just kidding)");
                playSound('notify');
            }
        } else {
            kIndex = 0;
        }
    });
});