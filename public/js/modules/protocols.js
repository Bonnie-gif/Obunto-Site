import { playSound } from './audio.js';

export function initProtocols(socket) {
    const overlay = document.getElementById('protocol-overlay');
    const cntDiv = document.getElementById('protocol-countdown');
    const cntImg = document.getElementById('proto-cnt-img');
    const taskDiv = document.getElementById('protocol-task');
    const codeDisplay = document.getElementById('proto-code-display');
    const input = document.getElementById('proto-input');
    const desc = document.getElementById('proto-desc');

    if (!overlay || !cntDiv || !taskDiv || !input) return;

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

        updateImage(3);

        const interval = setInterval(() => {
            if (idx >= seq.length) {
                clearInterval(interval);
                cntDiv.classList.add('hidden');
                startTask();
                return;
            }
            
            const num = seq[idx];
            updateImage(num);
            playSound('click');
            idx++;
        }, 1000);
    }

    function updateImage(num) {
        if (cntImg) {
            const suffix = num === 0 ? 'none' : num;
            cntImg.src = `assets/icon-small-priority_${suffix}-15x14.png`;
        }
    }

    function startTask() {
        taskDiv.classList.remove('hidden');
        input.value = '';
        input.focus();

        if (currentTask && currentTask.type === 'HEX') {
            const targetCode = Math.floor(Math.random()*16777215).toString(16).toUpperCase();
            currentTask.code = targetCode;
            if (desc) desc.textContent = "INPUT VERIFICATION CODE TO STABILIZE SYSTEM.";
            if (codeDisplay) codeDisplay.textContent = targetCode;
        }
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && currentTask) {
                if (input.value.toUpperCase() === currentTask.code) {
                    playSound('click');
                    socket.emit('task_complete', { success: true, type: currentTask.type });
                    overlay.classList.add('hidden');
                } else {
                    playSound('denied');
                    input.value = '';
                }
            }
        });
    }
}