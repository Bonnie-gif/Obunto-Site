import { playSound } from './audio.js';

export function initHelp(socket) {
    const btn = document.getElementById('btnSendHelp');
    const txt = document.getElementById('help-req-msg');
    const status = document.getElementById('help-status');
    const chatInterface = document.getElementById('help-chat-interface');
    const requestForm = document.getElementById('help-request-form');
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const btnChatSend = document.getElementById('btnChatSend');

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

    function addChatMessage(msg, type) {
        const el = document.createElement('div');
        el.className = `chat-msg ${type}`;
        el.textContent = msg;
        chatHistory.appendChild(el);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    socket.on('admin_chat_opened', (ticket) => {
        if (status) status.textContent = "OPERATOR CONNECTED.";
        playSound('notify');
        requestForm.classList.add('hidden');
        chatInterface.classList.remove('hidden');
        addChatMessage("Connection established with TSC Support.", "system");
    });

    socket.on('chat_receive', (data) => {
        addChatMessage(data.message, data.sender === 'ADMIN' ? 'admin' : 'user');
        if(data.sender === 'ADMIN') playSound('notify');
    });

    if(btnChatSend && chatInput) {
        const sendChat = () => {
            const val = chatInput.value.trim();
            if(!val) return;
            socket.emit('chat_message', { message: val, sender: 'USER' });
            addChatMessage(val, 'user');
            chatInput.value = '';
            playSound('click');
        };
        btnChatSend.onclick = sendChat;
        chatInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') sendChat();
        });
    }
}