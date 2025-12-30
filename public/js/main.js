import { UI, switchScreen, switchView, initDraggables } from './modules/ui.js';
import { handleLogin } from './modules/auth.js';
import { initAudio, playSound } from './modules/audio.js';
import { initNotepad } from './modules/notepad.js';
import { initHelp } from './modules/help.js';

const socket = io();
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    initAudio();
    initNotepad(socket);
    initHelp(socket);
    initDraggables();

    setInterval(() => {
        const now = new Date();
        UI.clock.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const year = now.getFullYear() + 16;
        UI.date.textContent = `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    }, 1000);

    playSound('boot');
    setTimeout(() => {
        const bootScreen = document.getElementById('boot-sequence');
        if(bootScreen) bootScreen.classList.add('hidden');
        switchScreen('login');
    }, 6000);

    UI.login.btn.onclick = async () => {
        currentUser = await handleLogin(socket);
    };
    
    UI.login.input.addEventListener("keydown", async e => { 
        if (e.key === "Enter") currentUser = await handleLogin(socket); 
    });

    if (UI.sidebar.btnDashboard) {
        UI.sidebar.btnDashboard.onclick = () => {
            switchView('dashboard');
            playSound('click');
        };
    }

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
            
            if (currentUser && currentUser.isObunto) {
                btnReboot.classList.remove('hidden');
            } else {
                btnReboot.classList.add('hidden');
            }

        } else if (alarmType === 'on') {
            powerOff.classList.add('hidden');
            banner.classList.add('hidden');
            document.body.style.opacity = '0';
            setTimeout(() => { document.body.style.opacity = '1'; playSound('boot'); }, 1000);
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