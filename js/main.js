import { initAudio, playSound } from './audio.js';
import { handleLogin } from './auth.js';
import { initUI } from './ui.js';
import { initObunto } from './obunto.js';
import { initSystem } from './system.js';
import { initNotepad } from './notepad.js';

const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initSystem(socket);
    initUI();
    initObunto(socket);
    initNotepad(socket);

    const loginBtn = document.getElementById('btnLogin');
    const inpId = document.getElementById('inpId');

    if(loginBtn) {
        loginBtn.onclick = () => handleLogin(socket);
    }
    
    if(inpId) {
        inpId.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') handleLogin(socket);
        });
    }
});