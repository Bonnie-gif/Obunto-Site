import { UI, switchScreen, initDraggables } from './modules/ui.js';
import { handleLogin } from './modules/auth.js';
import { initAudio, playSound } from './modules/audio.js';
import { initNotepad } from './modules/notepad.js';
import { initHelp } from './modules/help.js';

const socket = io();

document.addEventListener("DOMContentLoaded", () => {
    initAudio();
    initNotepad(socket);
    initHelp(socket);
    initDraggables(); // Enable dragging for windows

    setInterval(() => {
        const now = new Date();
        UI.clock.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const year = now.getFullYear() + 16;
        UI.date.textContent = `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    }, 1000);

    setTimeout(() => {
        UI.screens.boot.classList.add('hidden');
        switchScreen('boot2');
        playSound('click');
        setTimeout(() => {
            switchScreen('login');
        }, 3000);
    }, 3000);

    UI.login.btn.onclick = () => handleLogin(socket);
    UI.login.input.addEventListener("keydown", e => { 
        if (e.key === "Enter") handleLogin(socket); 
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
});