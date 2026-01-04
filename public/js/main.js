import { initAudio, playSound } from './modules/audio.js';
import { initProtocols } from './modules/protocols.js';

let socket;

try {
    if (typeof io !== 'undefined') {
        socket = io();
    } else {
        throw new Error('Socket missing');
    }
} catch (e) {
    socket = { on: () => {}, emit: () => {} };
}

document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initProtocols(socket);
    startBootSequence();
    updateClock();
    setInterval(updateClock, 1000);

    const loginBtn = document.getElementById('btnLogin');
    const loginInput = document.getElementById('inpId');

    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (loginInput) {
        loginInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
});

function switchScreen(screenName) {
    const screens = {
        boot: document.getElementById('boot-sequence'),
        login: document.getElementById('login-screen'),
        desktop: document.getElementById('desktop-screen')
    };

    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
            screen.classList.add('hidden');
            screen.style.display = 'none';
        }
    });

    if (screens[screenName]) {
        screens[screenName].classList.remove('hidden');
        screens[screenName].classList.add('active');
        screens[screenName].style.display = 'flex';
    }
}

function startBootSequence() {
    const progressFill = document.getElementById('progress-fill');
    let progress = 0;

    const interval = setInterval(() => {
        progress += 2;
        if (progressFill) progressFill.style.width = progress + '%';

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                switchScreen('login');
                playSound('boot');
            }, 500);
        }
    }, 50);
}

async function handleLogin() {
    const input = document.getElementById('inpId');
    const status = document.getElementById('loginStatus');
    const userId = input.value.trim();

    if (!userId) {
        status.textContent = 'ID REQUIRED';
        return;
    }

    status.textContent = 'AUTHENTICATING...';
    playSound('click');

    try {
        const response = await fetch(`/api/roblox/${userId}`);
        
        if (!response.ok) throw new Error('User not found');
        const data = await response.json();

        const sessionInfo = document.getElementById('sessionInfo');
        if (sessionInfo) {
            sessionInfo.innerHTML = `
                <div class="session-line">STATUS: <span class="session-value">ACTIVE</span></div>
                <div class="session-line">USER: <span class="session-value">${data.name}</span></div>
                <div class="session-line">ID: <span class="session-value">${data.id}</span></div>
            `;
        }

        status.textContent = 'ACCESS GRANTED';
        playSound('notify');
        
        socket.emit('login', { userId: data.id, username: data.name });

        setTimeout(() => {
            switchScreen('desktop');
        }, 1000);

    } catch (error) {
        status.textContent = 'ACCESS DENIED';
        playSound('denied');
    }
}

function updateClock() {
    const clock = document.getElementById('clock');
    const dateDisplay = document.getElementById('dateDisplay');
    const now = new Date();
    
    if (clock) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clock.textContent = `${hours}:${minutes}`;
    }
    
    if (dateDisplay) {
        const futureDate = new Date(now);
        futureDate.setFullYear(now.getFullYear() + 16);
        dateDisplay.textContent = futureDate.toISOString().split('T')[0];
    }
}