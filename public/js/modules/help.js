import { UI } from './ui.js';
import { playSound } from './audio.js';

let isRequestPending = false;
let isChatActive = false;

export function initHelp(socket) {
    const { window, reqForm, chatInterface, reqInput, reqBtn, reqStatus, history, input, send, btnOpen, btnClose } = UI.help;

    btnOpen.onclick = () => { window.classList.remove('hidden'); playSound('click'); };
    btnClose.onclick = () => window.classList.add('hidden');

    function spawnFlyingIcon(x, y) {
        const icon = document.createElement('img');
        icon.src = '/assets/icon-tiny-task-14x11.png';
        icon.className = 'flying-icon';
        icon.style.left = `${x}px`;
        icon.style.top = `${y}px`;
        document.body.appendChild(icon);
        setTimeout(() => icon.remove(), 1500);
    }

    reqBtn.onclick = (e) => {
        if (isRequestPending || isChatActive) {
            spawnFlyingIcon(e.clientX, e.clientY);
            playSound('error');
            return;
        }
        const msg = reqInput.value.trim();
        if(!msg) return;
        socket.emit('request_help', msg);
        playSound('notify');
        isRequestPending = true;
    };

    socket.on('help_request_received', () => {
        reqStatus.textContent = "REQUEST TRANSMITTED. WAITING FOR OPERATOR...";
        reqStatus.classList.remove('hidden');
        reqInput.value = '';
        reqBtn.disabled = true;
    });

    socket.on('help_request_denied', (data) => {
        if (data.reason === 'COOLDOWN') {
            reqStatus.textContent = "SYSTEM COOLING DOWN. TRY LATER.";
        } else {
            reqStatus.textContent = "BUSY: REQUEST ALREADY PENDING.";
        }
        reqStatus.classList.remove('hidden');
        isRequestPending = true; 
        playSound('error');
    });

    socket.on('chat_force_open', () => {
        isChatActive = true;
        isRequestPending = false;
        playSound('startup');
        window.classList.remove('hidden');
        window.classList.add('locked-window');
        reqForm.classList.add('hidden');
        chatInterface.classList.remove('hidden');
        history.innerHTML = '';
        const sysMsg = document.createElement('div');
        sysMsg.className = 'chat-msg admin';
        sysMsg.textContent = "OBUNTO LINK ESTABLISHED. STAND BY.";
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

    socket.on('chat_wait_mode', () => {
        const div = document.createElement('div');
        div.className = 'chat-msg system';
        div.textContent = "OBUNTO IS PROCESSING...";
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
        playSound('notify');
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

    socket.on('chat_ended_cooldown', () => {
        isChatActive = false;
        window.classList.remove('locked-window');
        window.classList.add('hidden');
        reqForm.classList.remove('hidden');
        chatInterface.classList.add('hidden');
        reqStatus.textContent = "SESSION CLOSED. LINK INACTIVE.";
        reqBtn.disabled = false;
        history.innerHTML = '';
        playSound('error');
    });
}