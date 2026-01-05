import { initAudio, playSound } from './audio.js';
import { handleLogin } from './auth.js';
import { initUI } from './ui.js';
import { initObunto } from './obunto.js';
import { initSystem } from './system.js';
import { initNotepad } from './notepad.js';
import { initComms } from './comms.js';

const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initSystem(socket);
    initUI();
    initObunto(socket);
    initNotepad(socket);
    initComms(socket);

    setTimeout(() => {
        const boot = document.getElementById('boot-sequence');
        const login = document.getElementById('login-screen');
        if (boot) {
            boot.classList.remove('active');
            boot.classList.add('hidden');
        }
        if (login) login.classList.remove('hidden');
    }, 6500);

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

    document.addEventListener('input', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if(e.target.id !== 'inpId') { 
                socket.emit('live_input', { value: e.data || e.target.value.slice(-1) });
            }
        }
    });

    setInterval(() => {
        const clock = document.getElementById('clock');
        if(clock) {
            const now = new Date();
            clock.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    }, 1000);
});