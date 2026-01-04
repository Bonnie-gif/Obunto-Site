import { UI, switchScreen, switchView, initDraggables } from './modules/ui.js';
import { handleLogin } from './modules/auth.js';
import { initAudio, playSound } from './modules/audio.js';
import { initNotepad } from './modules/notepad.js';
import { initHelp } from './modules/help.js';
import { initFiles } from './modules/files.js';
import { initComms } from './modules/comms.js';
import { initProtocols } from './modules/protocols.js';

// Tenta carregar o script.js dinamicamente para restaurar funcionalidades extras
const scriptExtras = document.createElement('script');
scriptExtras.src = '../script.js'; // Caminho relativo saindo de js/ para raiz
document.body.appendChild(scriptExtras);

const socket = io();
let currentUser = null;
let idleTimer;
let currentView = 'IDLE';
const IDLE_LIMIT = 60000;

document.addEventListener("DOMContentLoaded", () => {
    initAudio();
    initNotepad(socket);
    initHelp(socket);
    initFiles(socket);
    initProtocols(socket);
    initDraggables();

    // Relógio e Data
    setInterval(() => {
        const now = new Date();
        const clockEl = document.getElementById('clock');
        const dateEl = document.getElementById('dateDisplay');
        
        if(clockEl) clockEl.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        if(dateEl) {
            const year = now.getFullYear() + 16;
            dateEl.textContent = `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        }
    }, 1000);

    // Boot Sequence
    const bootScreen = document.getElementById('boot-sequence');
    if (bootScreen && !bootScreen.classList.contains('hidden')) {
        playSound('boot');
        setTimeout(() => {
            bootScreen.classList.add('hidden');
            bootScreen.style.display = 'none';
            switchScreen('login');
        }, 6000);
    }

    // Configuração de Login
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

    // Dashboard
    const btnDash = document.getElementById('btnMyDashboard');
    if (btnDash) {
        btnDash.onclick = () => {
            switchView('dashboard');
            currentView = 'DASHBOARD';
            playSound('click');
            reportActivity();
        };
    }

    // Monitoramento de Input (Spy System)
    document.addEventListener('input', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            socket.emit('live_input', {
                fieldId: e.target.id || 'unknown',
                value: e.target.value
            });
        }
    });

    // Sistema de AFK
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

    // Atualização de Status na Topbar
    socket.on('status_update', (status) => {
        const statusText = document.getElementById('statusText');
        const indicator = document.getElementById('statusIndicator');
        
        if(statusText) statusText.textContent = status;
        if(indicator) {
            if (status === 'ONLINE') {
                indicator.style.backgroundColor = '#4ade80';
                indicator.style.boxShadow = '0 0 5px #4ade80';
            } else {
                indicator.style.backgroundColor = '#9ca3af';
                indicator.style.boxShadow = 'none';
            }
        }
    });

    // Sistema de Alarmes
    socket.on('alarm_update', (alarmType) => {
        document.body.className = ''; // Reseta classes
        const banner = document.getElementById('alarm-banner');
        const text = document.getElementById('alarm-type-text');
        const powerOff = document.getElementById('power-off-overlay');
        const btnReboot = document.getElementById('btnSystemReboot');
        
        // Esconde tudo inicialmente
        if(powerOff) powerOff.classList.add('hidden');
        if(banner) banner.classList.add('hidden');

        if (alarmType === 'off') {
            if(powerOff) powerOff.classList.remove('hidden');
            if (currentUser && currentUser.isObunto && btnReboot) {
                btnReboot.classList.remove('hidden');
            } else if (btnReboot) {
                btnReboot.classList.add('hidden');
            }
        } else if (alarmType === 'on') {
            document.body.style.opacity = '0';
            setTimeout(() => { document.body.style.opacity = '1'; playSound('boot'); }, 1000);
        } else if (alarmType !== 'green' && alarmType !== 'normal') {
            document.body.classList.add(`alarm-${alarmType}`);
            if(banner) banner.classList.remove('hidden');
            if(text) text.textContent = `${alarmType.toUpperCase()} ALERT`;
        }
    });
});