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

    setTimeout(() => {
        const boot = document.getElementById('boot-sequence');
        const login = document.getElementById('login-screen');
        if (boot) {
            boot.classList.remove('active');
            boot.classList.add('hidden');
        }
        if (login) {
            login.classList.remove('hidden');
            login.classList.add('active');
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

    setInterval(() => {
        const clock = document.getElementById('clock');
        if(clock) {
            const now = new Date();
            clock.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        
        const dateDisplay = document.getElementById('dateDisplay');
        if(dateDisplay) {
            const now = new Date();
            dateDisplay.textContent = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }).toUpperCase();
        }
    }, 1000);

    socket.on('status_update', (status) => {
        const statusText = document.getElementById('statusText');
        const sbStatus = document.getElementById('sbStatus');
        const adminStatus = document.getElementById('adminStatus');
        const indicator = document.getElementById('statusIndicator');
        
        if(statusText) statusText.textContent = status;
        if(sbStatus) sbStatus.textContent = status;
        if(adminStatus) adminStatus.textContent = status;
        
        if(indicator) {
            indicator.style.backgroundColor = status === 'ONLINE' ? '#4ade80' : '#ef4444';
            indicator.style.boxShadow = status === 'ONLINE' ? '0 0 5px #4ade80' : '0 0 5px #ef4444';
        }
    });

    socket.on('alarm_update', (alarm) => {
        document.body.className = `alarm-${alarm}`;
        playSound('click');
    });

    socket.on('energy_update', (energy) => {
        const sbEnergy = document.getElementById('sbEnergy');
        const energyFill = document.getElementById('energyFill');
        const adminEnergy = document.getElementById('adminEnergy');
        const adminEnergyBar = document.getElementById('adminEnergyBar');
        
        if(sbEnergy) sbEnergy.textContent = `${Math.round(energy)}%`;
        if(energyFill) energyFill.style.width = `${energy}%`;
        if(adminEnergy) adminEnergy.textContent = `${Math.round(energy)}%`;
        if(adminEnergyBar) adminEnergyBar.style.width = `${energy}%`;
    });
});