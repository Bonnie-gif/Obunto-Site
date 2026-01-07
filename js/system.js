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
        const btnToggle = document.getElementById('btnToggleStatus');
        
        if(status === 'ONLINE') {
            if (ind) {
                ind.style.backgroundColor = '#00dd00';
                ind.style.borderColor = '#00aa00';
                ind.style.boxShadow = 'inset 1px 1px 0 rgba(0, 0, 0, 0.3), 0 0 8px rgba(0, 255, 0, 0.6)';
            }
            if (txt) txt.textContent = 'ONLINE';
            if (btnToggle) {
                btnToggle.textContent = 'SET OFFLINE';
                btnToggle.style.background = '#90ee90';
            }
        } else {
            if (ind) {
                ind.style.backgroundColor = '#dd0000';
                ind.style.borderColor = '#aa0000';
                ind.style.boxShadow = 'inset 1px 1px 0 rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 0, 0, 0.6)';
            }
            if (txt) txt.textContent = 'OFFLINE';
            if (btnToggle) {
                btnToggle.textContent = 'SET ONLINE';
                btnToggle.style.background = '#ffaaaa';
            }
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