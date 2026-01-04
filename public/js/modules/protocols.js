import { playSound } from './audio.js';

export function initProtocols(socket) {
    // Referências aos elementos do DOM
    const overlay = document.getElementById('protocol-overlay');
    const cntDiv = document.getElementById('protocol-countdown');
    const cntImg = document.getElementById('proto-cnt-img');
    const taskDiv = document.getElementById('protocol-task');
    const codeDisplay = document.getElementById('proto-code-display');
    const input = document.getElementById('proto-input');
    const desc = document.getElementById('proto-desc');

    // Se os elementos não existirem no HTML, aborta para não dar erro
    if (!overlay || !cntDiv || !taskDiv || !input) {
        console.warn('Protocol UI elements missing. Skipping protocol init.');
        return;
    }

    let currentTask = null;

    // Listener para iniciar protocolo vindo do servidor
    socket.on('protocol_task_assigned', (task) => {
        console.log('Protocol task received:', task);
        currentTask = task;
        startSequence();
    });

    function startSequence() {
        // Mostra overlay e reseta fases
        overlay.classList.remove('hidden');
        cntDiv.classList.remove('hidden');
        taskDiv.classList.add('hidden');
        
        playSound('notify');

        // Contagem Regressiva Visual (3, 2, 1...)
        const seq = [3, 2, 1, 0];
        let idx = 0;

        const interval = setInterval(() => {
            if (idx >= seq.length) {
                clearInterval(interval);
                cntDiv.classList.add('hidden');
                startTask(); // Vai para a tarefa
                return;
            }
            
            const num = seq[idx];
            // Atualiza a imagem se existir
            if (cntImg) {
                // Lógica para imagem de prioridade (0 = none/start)
                const imgNum = num === 0 ? 'none' : num;
                cntImg.src = `/assets/icon-small-priority_${imgNum}-15x14.png`;
            }
            
            playSound('click');
            idx++;
        }, 1000);
    }

    function startTask() {
        taskDiv.classList.remove('hidden');
        input.value = '';
        input.focus();

        // Configura o desafio (ex: Código HEX)
        if (currentTask && currentTask.type === 'HEX') {
            const targetCode = Math.floor(Math.random() * 16777215).toString(16).toUpperCase();
            currentTask.code = targetCode; // Salva o código correto
            
            if (desc) desc.textContent = "INPUT VERIFICATION CODE TO STABILIZE SYSTEM.";
            if (codeDisplay) codeDisplay.textContent = targetCode;
        }
    }

    // Listener para o Input
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentTask) {
            const typed = input.value.trim().toUpperCase();
            
            if (typed === currentTask.code) {
                // Sucesso
                playSound('click'); // ou som de sucesso
                socket.emit('task_complete', { success: true, type: currentTask.type });
                overlay.classList.add('hidden');
            } else {
                // Erro
                playSound('denied');
                input.value = ''; // Limpa para tentar de novo
                input.classList.add('error-shake'); // Opcional: efeito visual
                setTimeout(() => input.classList.remove('error-shake'), 500);
            }
        }
    });
}