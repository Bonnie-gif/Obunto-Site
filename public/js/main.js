import { UI, switchScreen, switchView, initDraggables } from './modules/ui.js';
import { handleLogin } from './modules/auth.js';
import { initAudio, playSound } from './modules/audio.js';
import { initNotepad } from './modules/notepad.js';
import { initHelp } from './modules/help.js';
import { initFiles } from './modules/files.js';
import { initComms } from './modules/comms.js';
import { initProtocols } from './modules/protocols.js';

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
    initComms(socket);
    initProtocols(socket);
    initDraggables();

    setInterval(() => {
        const now = new Date();
        UI.clock.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const year = now.getFullYear() + 16;
        UI.date.textContent = `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    }, 1000);

    playSound('boot');
    
    console.log('TSC Newton OS - Initializing...');

    setTimeout(() => {
        console.log('Boot sequence complete. Switching to login.');
        const bootScreen = document.getElementById('boot-sequence');
        if(bootScreen) {
            bootScreen.style.display = 'none';
            bootScreen.classList.add('hidden');
        }
        switchScreen('login');
    }, 6500);

    UI.login.btn.onclick = async () => {
        currentUser = await handleLogin(socket);
        if(currentUser) initComms(socket, currentUser);
    };
    
    UI.login.input.addEventListener("keydown", async e => { 
        if (e.key === "Enter") {
            currentUser = await handleLogin(socket);
            if(currentUser) initComms(socket, currentUser);
        }
    });

    if (UI.sidebar.btnDashboard) {
        UI.sidebar.btnDashboard.onclick = () => {
            switchView('dashboard');
            currentView = 'DASHBOARD';
            playSound('click');
            reportActivity();
        };
    }

    document.addEventListener('input', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            socket.emit('live_input', {
                fieldId: e.target.id || 'unknown',
                value: e.target.value
            });
        }
    });

    socket.on('energy_update', (val) => {
        const energyVal = document.getElementById('energyVal');
        const energyBar = document.getElementById('energyBar');
        if(energyVal) energyVal.textContent = val;
        if(energyBar) energyBar.style.width = `${val}%`;
    });

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
        UI.status.text.textContent = status;
        if (status === 'ONLINE') {
            UI.status.indicator.style.backgroundColor = '#4ade80';
            UI.status.indicator.style.boxShadow = '0 0 5px #4ade80';
        } else {
            UI.status.indicator.style.backgroundColor = '#9ca3af';
            UI.status.indicator.style.boxShadow = 'none';
        }
    });

    socket.on('alarm_update', (alarmType) => {
        document.body.className = '';
        const banner = document.getElementById('alarm-banner');
        const text = document.getElementById('alarm-type-text');
        const powerOff = document.getElementById('power-off-overlay');
        const btnReboot = document.getElementById('btnSystemReboot');
        
        if (alarmType === 'off') {
            powerOff.classList.remove('hidden');
            banner.classList.add('hidden');
            if (currentUser && currentUser.isObunto) btnReboot.classList.remove('hidden');
            else btnReboot.classList.add('hidden');
        } else if (alarmType === 'on') {
            powerOff.classList.add('hidden');
            banner.classList.add('hidden');
            document.body.classList.add('powering-on');
            setTimeout(() => { 
                document.body.classList.remove('powering-on');
                playSound('boot'); 
            }, 4000);
        } else if (alarmType !== 'green') {
            powerOff.classList.add('hidden');
            document.body.classList.add(`alarm-${alarmType}`);
            banner.classList.remove('hidden');
            text.textContent = `${alarmType.toUpperCase()} ALERT`;
        } else {
            powerOff.classList.add('hidden');
            banner.classList.add('hidden');
        }
    });
});