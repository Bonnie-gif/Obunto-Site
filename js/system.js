import { playSound } from './audio.js';

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
            if (ind) ind.style.backgroundColor = '#00ff00';
            if (txt) txt.textContent = 'ONLINE';
        } else {
            if (ind) ind.style.backgroundColor = '#ff0000';
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
}