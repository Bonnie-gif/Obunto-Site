import { playSound } from './audio.js';

export function initProtocols(socket) {
    const overlay = document.getElementById('protocol-overlay');
    const countdown = document.getElementById('protocol-countdown');
    const task = document.getElementById('protocol-task');
    const img = document.getElementById('proto-cnt-img');
    const input = document.getElementById('proto-input');
    const display = document.getElementById('proto-code-display');

    let currentTask = null;

    socket.on('protocol_task_assigned', (data) => {
        currentTask = data;
        startSequence();
    });

    function startSequence() {
        if(!overlay) return;
        overlay.classList.remove('hidden');
        countdown.classList.remove('hidden');
        task.classList.add('hidden');
        playSound('notify');

        let count = 3;
        if(img) img.src = `assets/icon-small-priority_${count}-15x14.png`; 

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                if(img) img.src = `assets/icon-small-priority_${count}-15x14.png`;
                playSound('click');
            } else {
                clearInterval(interval);
                countdown.classList.add('hidden');
                showTask();
            }
        }, 1000);
    }

    function showTask() {
        task.classList.remove('hidden');
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        if(display) display.textContent = code;
        if(input) {
            input.value = '';
            input.focus();
            input.dataset.code = code;
        }
    }

    if(input) {
        input.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') {
                if(input.value.toUpperCase() === input.dataset.code) {
                    playSound('click');
                    socket.emit('task_complete', { success: true, type: currentTask?.type });
                    overlay.classList.add('hidden');
                } else {
                    playSound('denied');
                    input.style.borderColor = '#ef4444';
                    setTimeout(() => input.style.borderColor = '', 500);
                }
            }
        });
    }
}