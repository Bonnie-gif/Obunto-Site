import { initAudio, playSound } from './audio.js';
import { handleLogin } from './auth.js';
import { initUI } from './ui.js';
import { initObunto } from './obunto.js';
import { initSystem } from './system.js';
import { initNotepad } from './notepad.js';
import { initComms } from './comms.js';
import { initFiles } from './files.js';
import { initHelp } from './help.js';
import { initProtocols } from './protocols.js';

const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initSystem(socket);
    initUI();
    initObunto(socket);
    initNotepad(socket);
    initComms(socket);
    initFiles(socket);
    initHelp(socket);
    initProtocols(socket);

    playSound('boot');

    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;
            progressFill.style.width = progress + '%';
            if (progress >= 100) clearInterval(interval);
        }, 200);
    }

    setTimeout(() => {
        const boot = document.getElementById('boot-sequence');
        const login = document.getElementById('login-screen');
        
        if (boot) {
            boot.classList.remove('active');
            boot.classList.add('hidden');
        }
        if (login) {
            login.classList.remove('hidden');
        }
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

    function updateDateTime() {
        const clock = document.getElementById('clock');
        const dateDisplay = document.getElementById('dateDisplay');
        
        if(clock) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            clock.textContent = `${hours}:${minutes}`;
        }
        
        if(dateDisplay) {
            const now = new Date();
            const options = { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            };
            dateDisplay.textContent = now.toLocaleDateString('en-US', options).toUpperCase();
        }
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
});