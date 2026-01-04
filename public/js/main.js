import { initAudio, playSound } from './audio.js';
import { initProtocols } from './protocols.js';

let socket;

try {
    socket = io();
} catch (e) {
    console.warn('Socket.io server not found. Running in offline mode.');
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

    Object.values(screens).forEach(s => {
        if (s) {
            s.classList.remove('active');
            s.classList.add('hidden');
        }
    });

    if (screens[screenName]) {
        screens[screenName].classList.remove('hidden');
        screens[screenName].classList.add('active');
    }
}

function startBootSequence() {
    const progressFill = document.getElementById('progress-fill');
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += 2;
        if (progressFill) progressFill.style.width = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => switchScreen('login'), 500);
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
        const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
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

        playSound('boot'); 
        status.textContent = 'ACCESS GRANTED';
        
        setTimeout(() => {
            switchScreen('desktop');
            socket.emit('login', { userId: data.id, username: data.name });
        }, 1000);

    } catch (error) {
        status.textContent = 'AUTHENTICATION FAILED';
        playSound('denied');
    }
}

function updateClock() {
    const clock = document.getElementById('clock');
    const dateDisplay = document.getElementById('dateDisplay');
    const now = new Date();
    
    if (clock) {
        clock.textContent = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', minute: '2-digit', hour12: false 
        });
    }
    
    if (dateDisplay) {
        const futureDate = new Date(now);
        futureDate.setFullYear(now.getFullYear() + 16);
        dateDisplay.textContent = futureDate.toISOString().split('T')[0];
    }
}