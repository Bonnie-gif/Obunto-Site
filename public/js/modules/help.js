import { speak } from './obunto.js';
import { playSound } from './audio.js';

export function initHelp(socket) {
    const modal = document.getElementById('help-window');
    const input = document.getElementById('help-msg');
    const btnOpen = document.getElementById('btnOpenHelp');
    const btnClose = document.getElementById('closeHelp');
    const btnSend = document.getElementById('btnSendHelp');

    btnOpen.onclick = () => modal.classList.remove('hidden');
    btnClose.onclick = () => modal.classList.add('hidden');

    btnSend.onclick = () => {
        const msg = input.value.trim();
        if(!msg) return;
        socket.emit('request_help', msg);
        playSound('notify');
        input.value = '';
        modal.classList.add('hidden');
        speak("Request transmitted. Stand by.", "normal");
    };
}