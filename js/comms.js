import { playSound } from './audio.js';

export function initComms(socket) {
    const list = document.querySelector('.radio-list');
    const input = document.getElementById('radioMsgInput');
    const btn = document.getElementById('btnRadioSend');

    function addMessage(msg, type) {
        if (!list) return;
        const el = document.createElement('div');
        el.className = `comm-msg ${type}`;
        el.innerHTML = `
            <div class="comm-meta">${msg.username || 'UNKNOWN'} [${new Date(msg.timestamp).toLocaleTimeString()}]</div>
            <div class="comm-body">${msg.message}</div>
        `;
        list.appendChild(el);
        list.scrollTop = list.scrollHeight;
        if (type === 'other') playSound('notify');
    }

    function send() {
        const text = input.value.trim();
        if (!text) {
            playSound('denied');
            return;
        }

        const username = document.getElementById('sbUser').textContent;
        socket.emit('radio_broadcast', { message: text, username: username });
        input.value = '';
        playSound('sent');
    }

    if (btn) btn.onclick = send;
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') send();
        });
    }

    socket.on('radio_message', (msg) => {
        const currentUser = document.getElementById('sbUser').textContent;
        const type = msg.username === currentUser ? 'self' : 'other';
        addMessage(msg, type);
    });

    socket.on('radio_history', (messages) => {
        messages.forEach(msg => {
            const currentUser = document.getElementById('sbUser').textContent;
            const type = msg.username === currentUser ? 'self' : 'other';
            addMessage(msg, type);
        });
    });
}