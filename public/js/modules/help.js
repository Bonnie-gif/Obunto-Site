import { playSound } from './audio.js';

export function initHelp(socket) {
    const modal = document.getElementById('help-window');
    const input = document.getElementById('help-msg');
    const history = document.getElementById('chat-history');
    const btnOpen = document.getElementById('btnOpenHelp');
    const btnClose = document.getElementById('closeHelp');
    const btnSend = document.getElementById('btnSendHelp');

    btnOpen.onclick = () => modal.classList.remove('hidden');
    btnClose.onclick = () => modal.classList.add('hidden');

    function appendMessage(msg, type) {
        const div = document.createElement('div');
        div.className = `chat-msg ${type}`;
        div.textContent = msg;
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    }

    btnSend.onclick = () => {
        const msg = input.value.trim();
        if(!msg) return;
        socket.emit('request_help', msg);
        appendMessage(msg, 'user');
        playSound('click');
        input.value = '';
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnSend.click();
    });

    socket.on('chat_reply', (data) => {
        appendMessage(data.message, 'admin');
        playSound('notify');
        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
        }
    });
}