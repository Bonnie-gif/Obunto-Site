import { playSound } from './audio.js';

let energyLevel = 100;
const ENERGY_DEPLETION_TIME = 48 * 60 * 60 * 1000;
const ENERGY_DEPLETION_INTERVAL = 1000;
const ENERGY_DEPLETION_RATE = 100 / (ENERGY_DEPLETION_TIME / ENERGY_DEPLETION_INTERVAL);

export function initSystem(socket) {
    const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let kIdx = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konami[kIdx]) {
            kIdx++;
            if (kIdx === konami.length) {
                alert("SYSTEM OVERRIDE: GOD MODE ENABLED");
                kIdx = 0;
                playSound('notify');
            }
        } else {
            kIdx = 0;
        }
    });

    socket.on('status_update', (status) => {
        const el = document.getElementById('sbStatus');
        if(el) el.textContent = status;
        
        const adminEl = document.getElementById('adminStatus');
        if(adminEl) adminEl.textContent = status;
        
        const ind = document.getElementById('statusIndicator');
        const txt = document.getElementById('statusText');
        
        if(status === 'ONLINE') {
            if (ind) {
                ind.style.backgroundColor = '#00ff00';
                ind.style.boxShadow = 'inset 2px 2px 0 rgba(0, 0, 0, 0.35), inset -1px -1px 0 rgba(255, 255, 255, 0.6), 0 0 10px rgba(0, 255, 0, 0.7)';
            }
            if (txt) txt.textContent = 'ONLINE';
        } else {
            if (ind) {
                ind.style.backgroundColor = '#ff0000';
                ind.style.boxShadow = 'inset 2px 2px 0 rgba(0, 0, 0, 0.35), inset -1px -1px 0 rgba(255, 255, 255, 0.6), 0 0 10px rgba(255, 0, 0, 0.7)';
            }
            if (txt) txt.textContent = 'OFFLINE';
        }
    });

    socket.on('alarm_update', (type) => {
        document.body.className = `alarm-${type}`;
        
        const banner = document.getElementById('alarm-banner');
        if(type === 'green') {
            if (banner) banner.classList.add('hidden');
        } else {
            if (banner) banner.classList.remove('hidden');
            const txt = document.getElementById('alarm-type-text');
            if(txt) txt.textContent = `${type.toUpperCase()} ALERT`;
        }
    });

    socket.on('energy_update', (energy) => {
        energyLevel = energy;
        updateEnergyDisplay();
    });

    socket.on('energy_boost', (data) => {
        energyLevel = Math.min(100, energyLevel + data.amount);
        socket.emit('update_energy', energyLevel);
        updateEnergyDisplay();
        playSound('notify');
    });

    function updateEnergyDisplay() {
        const sbEnergy = document.getElementById('sbEnergy');
        const energyFill = document.getElementById('energyFill');
        const adminEnergy = document.getElementById('adminEnergy');
        const adminEnergyBar = document.getElementById('adminEnergyBar');

        const energyText = `${Math.round(energyLevel)}%`;
        
        if (sbEnergy) sbEnergy.textContent = energyText;
        if (adminEnergy) adminEnergy.textContent = energyText;
        
        if (energyFill) energyFill.style.width = `${energyLevel}%`;
        if (adminEnergyBar) adminEnergyBar.style.width = `${energyLevel}%`;

        if (energyLevel < 25) {
            if (energyFill) energyFill.style.background = 'linear-gradient(180deg, #ff0000 0%, #cc0000 50%, #990000 100%)';
            if (adminEnergyBar) adminEnergyBar.style.background = 'linear-gradient(180deg, #ff0000 0%, #cc0000 50%, #990000 100%)';
        } else if (energyLevel < 50) {
            if (energyFill) energyFill.style.background = 'linear-gradient(180deg, #ffaa00 0%, #dd8800 50%, #bb6600 100%)';
            if (adminEnergyBar) adminEnergyBar.style.background = 'linear-gradient(180deg, #ffaa00 0%, #dd8800 50%, #bb6600 100%)';
        } else {
            if (energyFill) energyFill.style.background = 'linear-gradient(180deg, #00ff00 0%, #00cc00 50%, #009900 100%)';
            if (adminEnergyBar) adminEnergyBar.style.background = 'linear-gradient(180deg, #00ff00 0%, #00cc00 50%, #009900 100%)';
        }
    }

    setInterval(() => {
        if (energyLevel > 0) {
            energyLevel = Math.max(0, energyLevel - ENERGY_DEPLETION_RATE);
            socket.emit('update_energy', energyLevel);
            updateEnergyDisplay();

            if (energyLevel === 0) {
                socket.emit('system_shutdown');
            }
        }
    }, ENERGY_DEPLETION_INTERVAL);

    socket.emit('request_energy');
    updateEnergyDisplay();
}