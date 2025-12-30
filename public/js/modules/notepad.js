import { playSound } from './audio.js';

let saveTimeout;

export function initNotepad(socket) {
    const modal = document.getElementById('notepad-window');
    const textarea = document.getElementById('notepad-area');
    const btnOpen = document.getElementById('btnOpenNotepad');
    const btnClose = document.getElementById('closeNotepad');

    btnOpen.onclick = () => {
        modal.classList.remove('hidden');
        playSound('click');
    };
    btnClose.onclick = () => modal.classList.add('hidden');

    socket.on('load_notes', (text) => {
        textarea.value = text || "";
    });

    textarea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            socket.emit('save_notes', textarea.value);
        }, 1000);
    });
}