import { UI, bringToFront } from './ui.js';
import { playSound } from './audio.js';

let currentUser = null;

export function initComms(socket, user) {
    currentUser = user;
    const { window, close, btnOpen, list, targetInput, msgInput, btnSend } = UI.comms;

    if(btnOpen) {
        btnOpen.onclick = () => {
            window.classList.remove('hidden');
            bringToFront(window);
            playSound('click');
        };
    }
    
    if(close) close.onclick = () => window.classList.add('hidden');

    socket.on('comm_receive', (msg) => {
        playSound('notify');
        addMessage(msg);
    });

    btnSend.onclick = sendMessage;
    msgInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') sendMessage();
    });

    function sendMessage() {
        const text = msgInput.value.trim();
        const target = targetInput.value.trim() || 'GLOBAL';
        if(!text) return;

        socket.emit('comm_send_msg', { target, message: text });
        msgInput.value = '';
    }

    function addMessage(msg) {
        const div = document.createElement('div');
        // Verifica se a mensagem veio do usuário atual
        const isSelf = msg.fromName === currentUser.username;
        div.className = `comm-msg ${isSelf ? 'self' : 'other'}`;
        const time = new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        div.innerHTML = `
            <div class="comm-meta">[${time}] ${msg.fromName} >> ${msg.to}</div>
            <div class="comm-body">${msg.body}</div>
        `;
        list.appendChild(div);
        list.scrollTop = list.scrollHeight;
    }
}