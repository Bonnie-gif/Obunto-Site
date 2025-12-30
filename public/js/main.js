import { UI, switchScreen } from './modules/ui.js';
import { handleLogin } from './modules/auth.js';
import { initAudio, playSound } from './modules/audio.js';
import { initNotepad } from './modules/notepad.js';
import { initHelp } from './modules/help.js';

const socket = io();

document.addEventListener("DOMContentLoaded", () => {
    initAudio();
    initNotepad(socket);
    initHelp(socket);

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
});