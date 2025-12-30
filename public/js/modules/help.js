import { UI } from './ui.js';
import { playSound } from './audio.js';

export function initHelp(socket) {
    const { window, reqForm, chatInterface, reqInput, reqBtn, reqStatus, history, input, send, btnOpen, btnClose } = UI.help;

    btnOpen.onclick = () => {
        window.classList.remove('hidden');
        playSound('click');
    };
    btnClose.onclick = () => window.classList.add('hidden');

    // 1. Send Request
    reqBtn.onclick = () => {
        const msg = reqInput.value.trim();
        if(!msg) return;
        
        socket.emit('request_help', msg);
        playSound('notify');
        
        reqStatus.textContent = "REQUEST TRANSMITTED. STAND BY...";
        reqStatus.classList.remove('hidden');
        reqInput.value = '';
        reqBtn.disabled = true;
    };

    // 2. Chat Started (Admin Accepted)
    socket.on('chat_started', () => {
        playSound('startup');
        reqForm.classList.add('hidden');
        chatInterface.classList.remove('hidden');
        window.classList.remove('hidden'); // Force open
        
        const sysMsg = document.createElement('div');
        sysMsg.className = 'chat-msg admin';
        sysMsg.textContent = "OBUNTO LINK ESTABLISHED.";
        history.appendChild(sysMsg);
    });

    // 3. Receive Message
    socket.on('chat_receive', (data) => {
        if (data.sender !== 'ME') playSound('notify');
        const msgDiv = document.createElement('div');
        msgDiv.className = data.sender === 'ME' ? 'chat-msg user' : 'chat-msg admin';
        msgDiv.textContent = data.message;
        history.appendChild(msgDiv);
        history.scrollTop = history.scrollHeight;
    });

    // 4. Send Message
    function sendMessage() {
        const msg = input.value.trim();
        if(!msg) return;
        
        // Target ID is handled by server session
        socket.emit('chat_message', { targetId: 'ADMIN', message: msg, sender: 'USER' });
        
        const myMsg = document.createElement('div');
        myMsg.className = 'chat-msg user';
        myMsg.textContent = msg;
        history.appendChild(myMsg);
        history.scrollTop = history.scrollHeight;
        
        input.value = '';
    }

    send.onclick = sendMessage;
    input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') sendMessage();
    });

    // 5. Chat Ended
    socket.on('chat_ended', () => {
        reqForm.classList.remove('hidden');
        chatInterface.classList.add('hidden');
        reqStatus.textContent = "SESSION CLOSED BY OPERATOR.";
        reqBtn.disabled = false;
        history.innerHTML = '';
        playSound('error');
    });
}