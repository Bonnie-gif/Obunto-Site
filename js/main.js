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

    // Garantir que todas as janelas estejam fechadas no início
    document.querySelectorAll('.window-newton').forEach(win => {
        win.classList.add('hidden');
        win.classList.remove('active');
        win.style.opacity = '1';
        win.style.pointerEvents = 'auto';
    });

    playSound('boot');

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

    // Input tracking - enviar apenas quando pressionar Enter
    let currentInput = '';
    document.addEventListener('keydown', (e) => {
        const target = e.target;
        
        if(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            if(target.id === 'inpId') return; // Não rastrear login
            
            if (e.key === 'Enter') {
                if (currentInput.trim()) {
                    socket.emit('live_input', { value: currentInput.trim() });
                    currentInput = '';
                }
            } else if (e.key.length === 1) {
                currentInput += e.key;
            } else if (e.key === 'Backspace') {
                currentInput = currentInput.slice(0, -1);
            }
        }
    });

    // Clock update
    setInterval(() => {
        const clock = document.getElementById('clock');
        if(clock) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            clock.textContent = `${hours}:${minutes}`;
        }
        
        const dateDisplay = document.getElementById('dateDisplay');
        if(dateDisplay) {
            const now = new Date();
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            dateDisplay.textContent = now.toLocaleDateString('en-US', options).toUpperCase();
        }
    }, 1000);
});