import { playSound } from './audio.js';

export function initProtocols(socket) {
    const overlay = document.getElementById('protocol-overlay');
    const countdown = document.getElementById('protocol-countdown');
    const task = document.getElementById('protocol-task');
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
        
        if (countdown) countdown.classList.remove('hidden');
        if (task) task.classList.add('hidden');
        
        playSound('notify');

        let count = 3;
        const countText = document.querySelector('.protocol-count-text');
        
        const interval = setInterval(() => {
            count--;
            if (countText) countText.textContent = count > 0 ? count : 'GO';
            
            if (count > 0) {
                playSound('click');
            } else {
                clearInterval(interval);
                if (countdown) countdown.classList.add('hidden');
                showTask();
            }
        }, 1000);
    }

    function showTask() {
        if (task) task.classList.remove('hidden');
        
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
                    socket.emit('task_complete', { 
                        success: true, 
                        type: currentTask?.type 
                    });
                    if (overlay) overlay.classList.add('hidden');
                } else {
                    playSound('denied');
                    input.style.border = '4px solid #ff0000';
                    setTimeout(() => input.style.border = '', 500);
                }
            }
        });
    }
}