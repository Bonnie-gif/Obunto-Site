import { playSound } from './audio.js';

export function initComms(socket) {
    const list = document.querySelector('.comm-list');
    const input = document.getElementById('commMsgInput');
    const btn = document.getElementById('btnCommSend');
    const targetInput = document.getElementById('commTargetInput');

    function addMessage(msg, type) {
        if (!list) return;
        const el = document.createElement('div');
        el.className = `comm-msg ${type}`;
        el.innerHTML = `
            <div class="comm-meta">${msg.sender || 'UNKNOWN'}</div>
            <div class="comm-body">${msg.message}</div>
        `;
        list.appendChild(el);
        list.scrollTop = list.scrollHeight;
        if (type === 'other') playSound('notify');
    }

    function send() {
        const text = input.value.trim();
        const target = targetInput ? targetInput.value.trim() : 'ADMIN';
        if (!text) return;

        socket.emit('chat_message', { message: text, targetId: target, sender: 'USER' });
        addMessage({ sender: 'ME', message: text }, 'self');
        input.value = '';
        playSound('sent');
    }

    if (btn) btn.onclick = send;
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') send();
        });
    }

    socket.on('chat_receive', (msg) => {
        addMessage(msg, 'other');
    });
}