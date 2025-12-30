import { UI } from './ui.js';
import { playSound } from './audio.js';

export function initHelp(socket) {
    const { window, reqForm, chatInterface, reqInput, reqBtn, reqStatus, history, input, send, btnOpen, btnClose } = UI.help;

    btnOpen.onclick = () => { window.classList.remove('hidden'); playSound('click'); };
    btnClose.onclick = () => window.classList.add('hidden');

    reqBtn.onclick = () => {
        const msg = reqInput.value.trim();
        if(!msg) return;
        socket.emit('request_help', msg);
        playSound('notify');
        reqStatus.classList.remove('hidden');
        reqInput.value = '';
        reqBtn.disabled = true;
    };

    socket.on('help_request_received', () => {
        reqStatus.textContent = "REQUEST TRANSMITTED. WAITING FOR OPERATOR...";
    });

    socket.on('chat_started', () => {
        playSound('startup');
        reqForm.classList.add('hidden');
        chatInterface.classList.remove('hidden');
        window.classList.remove('hidden');
        const sysMsg = document.createElement('div');
        sysMsg.className = 'chat-msg admin';
        sysMsg.textContent = "OBUNTO LINK ESTABLISHED.";
        history.appendChild(sysMsg);
    });

    socket.on('chat_receive', (data) => {
        if (data.sender !== 'USER') playSound('notify');
        const msgDiv = document.createElement('div');
        msgDiv.className = data.sender === 'USER' ? 'chat-msg user' : 'chat-msg admin';
        msgDiv.textContent = data.message;
        history.appendChild(msgDiv);
        history.scrollTop = history.scrollHeight;
    });

    function sendMessage() {
        const msg = input.value.trim();
        if(!msg) return;
        socket.emit('chat_message', { targetId: 'ADMIN', message: msg, sender: 'USER' });
        const myMsg = document.createElement('div');
        myMsg.className = 'chat-msg user';
        myMsg.textContent = msg;
        history.appendChild(myMsg);
        history.scrollTop = history.scrollHeight;
        input.value = '';
    }

    send.onclick = sendMessage;
    input.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendMessage(); });

    socket.on('chat_ended', () => {
        reqForm.classList.remove('hidden');
        chatInterface.classList.add('hidden');
        reqStatus.textContent = "SESSION CLOSED BY OPERATOR.";
        reqBtn.disabled = false;
        history.innerHTML = '';
        playSound('error');
    });
}