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
            ind.style.backgroundColor = '#4ade80';
            txt.textContent = 'ONLINE';
        } else {
            ind.style.backgroundColor = '#ef4444';
            txt.textContent = 'OFFLINE';
        }
    });

    socket.on('alarm_update', (type) => {
        document.body.className = `alarm-${type}`;
        if(type === 'green') {
            document.getElementById('alarm-banner')?.classList.add('hidden');
        } else {
            document.getElementById('alarm-banner')?.classList.remove('hidden');
            const txt = document.getElementById('alarm-type-text');
            if(txt) txt.textContent = `${type.toUpperCase()} ALERT`;
        }
    });
}