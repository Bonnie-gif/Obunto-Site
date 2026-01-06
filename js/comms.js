import { playSound } from './audio.js';

export function initComms(socket) {
    const list = document.querySelector('.radio-list');
    const input = document.getElementById('radioMsgInput');
    const btn = document.getElementById('btnRadioSend');

    function addMessage(msg, type) {
        if (!list) return;
        const el = document.createElement('div');
        el.className = `comm-msg ${type}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        el.innerHTML = `
            <div class="comm-meta">${msg.username || 'UNKNOWN'} [${time}]</div>
            <div class="comm-body">${escapeHtml(msg.message)}</div>
        `;
        list.appendChild(el);
        list.scrollTop = list.scrollHeight;
        
        if (type === 'other') playSound('notify');
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function send() {
        const text = input.value.trim();
        if (!text) {
            playSound('denied');
            return;
        }

        const username = document.getElementById('sbUser')?.textContent || 'UNKNOWN';
        socket.emit('radio_broadcast', { message: text, username: username });
        input.value = '';
        playSound('sent');
    }

    if (btn) btn.onclick = send;
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });
    }

    socket.on('radio_message', (msg) => {
        const currentUser = document.getElementById('sbUser')?.textContent;
        const type = msg.username === currentUser ? 'self' : 'other';
        addMessage(msg, type);
    });

    socket.on('radio_history', (messages) => {
        if (!list) return;
        const currentUser = document.getElementById('sbUser')?.textContent;
        messages.forEach(msg => {
            const type = msg.username === currentUser ? 'self' : 'other';
            addMessage(msg, type);
        });
    });
}