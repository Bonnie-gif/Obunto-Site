import { playSound } from './audio.js';

export function initProtocols(socket) {
    const overlay = document.getElementById('protocol-overlay');
    const cntDiv = document.getElementById('protocol-countdown');
    const cntImg = document.getElementById('proto-cnt-img');
    const taskDiv = document.getElementById('protocol-task');
    const codeDisplay = document.getElementById('proto-code-display');
    const input = document.getElementById('proto-input');
    const desc = document.getElementById('proto-desc');

    let currentTask = null;

    socket.on('protocol_task_assigned', (task) => {
        currentTask = task;
        startSequence();
    });

    function startSequence() {
        overlay.classList.remove('hidden');
        cntDiv.classList.remove('hidden');
        taskDiv.classList.add('hidden');
        playSound('notify');

        const seq = [3, 2, 1, 0];
        let idx = 0;

        const interval = setInterval(() => {
            if (idx >= seq.length) {
                clearInterval(interval);
                cntDiv.classList.add('hidden');
                startTask();
                return;
            }
            
            const num = seq[idx];
            if (num === 0) {
                cntImg.src = '/assets/icon-small-priority_none-15x14.png';
            } else {
                cntImg.src = `/assets/icon-small-priority_${num}-15x14.png`;
            }
            playSound('click');
            idx++;
        }, 1000);
    }

    function startTask() {
        taskDiv.classList.remove('hidden');
        input.value = '';
        input.focus();

        if (currentTask.type === 'HEX') {
            const targetCode = Math.floor(Math.random()*16777215).toString(16).toUpperCase();
            currentTask.code = targetCode;
            desc.textContent = "INPUT VERIFICATION CODE TO STABILIZE SYSTEM.";
            codeDisplay.textContent = targetCode;
        }
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (input.value.toUpperCase() === currentTask.code) {
                playSound('success'); // Need a success sound, reusing click for now if missing
                socket.emit('task_complete', { success: true, type: currentTask.type });
                overlay.classList.add('hidden');
            } else {
                playSound('error');
                input.value = '';
                input.classList.add('error-shake');
                setTimeout(() => input.classList.remove('error-shake'), 500);
            }
        }
    });
}