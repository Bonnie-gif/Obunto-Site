import { initAudio, playSound } from './audio.js';
import { initProtocols } from './protocols.js';

console.log('TSC Newton OS - Starting Main Module...');

// ============================================
// SOCKET.IO CONNECTION HANDLING (CORREÇÃO)
// ============================================
let socket;
try {
    // Tenta conectar se a biblioteca 'io' estiver carregada no HTML
    if (typeof io !== 'undefined') {
        socket = io();
        console.log('Socket.io initialized.');
    } else {
        throw new Error('Socket.io library not found');
    }
} catch (e) {
    console.warn('Running in OFFLINE MODE (Socket missing or connection failed):', e);
    // Cria um objeto "mock" para não quebrar o código que usa socket.on/emit
    socket = { 
        on: (event, callback) => console.log(`[OFFLINE] Mock listener for: ${event}`), 
        emit: (event, data) => console.log(`[OFFLINE] Mock emit: ${event}`, data) 
    };
}

// ============================================
// SYSTEM INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing system...');

    // Inicializa subsistemas
    initAudio();
    initProtocols(socket);
    
    // Inicia Boot
    startBootSequence();
    
    // Inicia Relógio
    updateClock();
    setInterval(updateClock, 1000);

    // Event Listeners de Login
    const loginBtn = document.getElementById('btnLogin');
    const loginInput = document.getElementById('inpId');

    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    if (loginInput) {
        loginInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
});

// ============================================
// SCREEN MANAGEMENT
// ============================================
export function switchScreen(screenName) {
    console.log('Switching to screen:', screenName);
    
    const screens = {
        boot: document.getElementById('boot-sequence'),
        login: document.getElementById('login-screen'),
        desktop: document.getElementById('desktop-screen')
    };

    // Esconde todas
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.classList.remove('active');
            screen.classList.add('hidden');
            screen.style.display = 'none'; // Força CSS inline para garantir
        }
    });

    // Mostra a desejada
    if (screens[screenName]) {
        screens[screenName].classList.remove('hidden');
        screens[screenName].classList.add('active');
        screens[screenName].style.display = 'flex'; // Força CSS inline
    } else {
        console.error('Screen not found:', screenName);
    }
}

// ============================================
// BOOT SEQUENCE
// ============================================
function startBootSequence() {
    const progressFill = document.getElementById('progress-fill');
    let progress = 0;

    const interval = setInterval(() => {
        progress += 2; // Velocidade do boot
        if (progressFill) {
            progressFill.style.width = progress + '%';
        }

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                switchScreen('login');
                playSound('boot'); // Toca som se disponível
            }, 800);
        }
    }, 50);
}

// ============================================
// LOGIN LOGIC
// ============================================
async function handleLogin() {
    const input = document.getElementById('inpId');
    const status = document.getElementById('loginStatus');
    const userId = input.value.trim();

    if (!userId) {
        status.textContent = 'ERROR: USER ID REQUIRED';
        return;
    }

    status.textContent = 'AUTHENTICATING...';
    playSound('click');

    try {
        // API Call
        const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        
        if (!response.ok) {
            throw new Error('USER NOT FOUND');
        }

        const userData = await response.json();
        
        // Update Session Info
        const sessionInfo = document.getElementById('sessionInfo');
        if (sessionInfo) {
            sessionInfo.innerHTML = `
                <div class="session-line">STATUS: <span class="session-value">AUTHENTICATED</span></div>
                <div class="session-line">ID: <span class="session-value">${userData.id}</span></div>
                <div class="session-line">USER: <span class="session-value">${userData.name}</span></div>
            `;
        }

        status.textContent = 'ACCESS GRANTED';
        playSound('notify');
        
        // Notify Server
        socket.emit('login', { userId: userData.id, username: userData.name });

        // Transition to Desktop
        setTimeout(() => {
            switchScreen('desktop');
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        status.textContent = 'ERROR: ' + error.message;
        playSound('denied');
    }
}

// ============================================
// CLOCK & DATE
// ============================================
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
        // Data futura (Lore: 2042)
        const futureDate = new Date(now);
        futureDate.setFullYear(now.getFullYear() + 16);
        const y = futureDate.getFullYear();
        const m = String(futureDate.getMonth() + 1).padStart(2, '0');
        const d = String(futureDate.getDate()).padStart(2, '0');
        dateDisplay.textContent = `${y}-${m}-${d}`;
    }
}