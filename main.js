import { initAudio, playSound } from './js/audio.js';
import { handleLogin } from './js/auth.js';
import { initUI } from './js/ui.js';
import { initObunto } from './js/obunto.js';

const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa Áudio
    initAudio();
    
    // Animação de Boot
    let progress = 0;
    const bar = document.querySelector('.progress-fill');
    const interval = setInterval(() => {
        progress += 5;
        if(bar) bar.style.width = `${progress}%`;
        if(progress >= 100) {
            clearInterval(interval);
            playSound('boot');
            setTimeout(() => {
                document.getElementById('boot-sequence').classList.add('hidden');
                document.getElementById('login-screen').classList.remove('hidden');
            }, 500);
        }
    }, 100);

    // Configura Login
    document.getElementById('btnLogin').onclick = () => handleLogin(socket);
    
    // Inicializa UI e Obunto
    initUI();
    initObunto(socket);

    // Relógio
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }, 1000);
});