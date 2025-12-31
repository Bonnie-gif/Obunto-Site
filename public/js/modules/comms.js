import { UI, bringToFront, showCustomPrompt } from './ui.js';
import { playSound } from './audio.js';

export function initComms(socket) {
    const window = document.getElementById('comms-window');
    const close = document.getElementById('closeComms');
    const btnOpen = document.getElementById('btnOpenComms');
    const list = document.getElementById('comm-list');
    const preview = document.getElementById('comm-preview');
    const btnRefresh = document.getElementById('btnCommRefresh');
    const btnNew = document.getElementById('btnCommNew');

    let messages = [];

    if(btnOpen) {
        btnOpen.onclick = () => {
            window.classList.remove('hidden');
            bringToFront(window);
            playSound('click');
            socket.emit('comm_get_messages');
        };
    }
    
    if(close) close.onclick = () => window.classList.add('hidden');

    socket.on('comm_load', (msgs) => {
        messages = msgs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderList();
    });

    socket.on('comm_new', (msg) => {
        playSound('notify');
        messages.unshift(msg);
        renderList();
    });

    if(btnRefresh) btnRefresh.onclick = () => socket.emit('comm_get_messages');

    if(btnNew) {
        btnNew.onclick = async () => {
            const to = await showCustomPrompt("RECIPIENT ID (OR 'ALL'):");
            if(!to) return;
            const subject = await showCustomPrompt("SUBJECT:");
            if(!subject) return;
            const body = await showCustomPrompt("MESSAGE:");
            if(!body) return;

            socket.emit('comm_send', { to, subject, body });
        };
    }

    function renderList() {
        list.innerHTML = '';
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'comm-item';
            div.innerHTML = `
                <span style="width: 100px;">${msg.fromName}</span>
                <span style="flex: 1;">${msg.subject}</span>
                <span style="width: 80px;">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            `;
            div.onclick = () => {
                preview.textContent = `FROM: ${msg.fromName} (${msg.from})\nTO: ${msg.to}\nSUBJECT: ${msg.subject}\nDATE: ${new Date(msg.timestamp).toLocaleString()}\n\n----------------------------------------\n\n${msg.body}`;
            };
            list.appendChild(div);
        });
    }
}