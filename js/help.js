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
            if (!msg) {
                playSound('denied');
                return;
            }

            socket.emit('request_help', { message: msg });
            txt.value = '';
            playSound('sent');
            
            if (status) {
                status.classList.remove('hidden');
                status.textContent = "TRANSMITTING TO ADMIN...";
            }
        };
    }

    socket.on('help_request_sent', () => {
        if(status) status.textContent = "REQUEST SENT. STANDBY.";
    });

    socket.on('help_accepted', (data) => {
        if (status) status.textContent = "OPERATOR CONNECTED.";
        playSound('notify');
        requestForm.classList.add('hidden');
        chatInterface.classList.remove('hidden');
        
        const el = document.createElement('div');
        el.className = 'chat-msg system';
        el.textContent = data.message;
        chatHistory.appendChild(el);
    });

    socket.on('help_rejected', (data) => {
        if (status) status.textContent = "REQUEST DECLINED.";
        playSound('denied');
        alert(data.message);
    });

    if(btnChatSend && chatInput) {
        const sendChat = () => {
            const val = chatInput.value.trim();
            if(!val) return;
            
            const el = document.createElement('div');
            el.className = 'chat-msg user';
            el.textContent = val;
            chatHistory.appendChild(el);
            
            socket.emit('chat_message', { message: val, targetId: 'ADMIN', sender: 'USER' });
            chatInput.value = '';
            playSound('click');
        };
        
        btnChatSend.onclick = sendChat;
        chatInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') sendChat();
        });
    }
}