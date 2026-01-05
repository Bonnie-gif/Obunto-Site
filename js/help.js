import { playSound } from './audio.js';

export function initHelp(socket) {
    const btn = document.getElementById('btnSendHelp');
    const txt = document.getElementById('help-req-msg');
    const status = document.getElementById('help-status');

    if (btn && txt) {
        btn.onclick = () => {
            const msg = txt.value.trim();
            if (!msg) return;

            socket.emit('request_help', msg);
            txt.value = '';
            playSound('sent');
            
            if (status) {
                status.classList.remove('hidden');
                status.textContent = "REQUEST TRANSMITTED. STANDBY.";
            }
        };
    }

    socket.on('admin_chat_opened', () => {
        if (status) status.textContent = "OPERATOR CONNECTED.";
        playSound('notify');
    });
}