import { UI, bringToFront } from '../ui.js';
import { playSound } from '../audio.js';

let currentChatTarget = null;
let currentSpyTarget = null;

export function initHoltz(socket, userId) {
    if (userId !== "36679824") return;

    // Dr. Holtz não pode reiniciar o sistema, então ocultamos esse botão
    if (UI.obunto.aop.btnReboot) {
        UI.obunto.aop.btnReboot.style.display = 'none';
    }

    // Acesso ao Painel de Controle
    UI.dock.btnObuntoControl.classList.remove('hidden');
    UI.dock.btnObuntoControl.onclick = () => {
        UI.obunto.panel.classList.remove('hidden');
        bringToFront(UI.obunto.panel);
        playSound('click');
    };

    UI.obunto.btnClose.onclick = () => UI.obunto.panel.classList.add('hidden');

    // Botões de Ação do Painel
    UI.obunto.btnMonitor.onclick = () => {
        UI.obunto.monitor.window.classList.remove('hidden');
        bringToFront(UI.obunto.monitor.window);
        playSound('click');
    };
    UI.obunto.monitor.close.onclick = () => UI.obunto.monitor.window.classList.add('hidden');

    // ENERGY CONTROLS (Holtz também pode usar)
    const btnInc = document.getElementById('btnEnergyInc');
    const btnDec = document.getElementById('btnEnergyDec');
    if (btnInc) btnInc.onclick = () => socket.emit('admin_modify_energy', 10);
    if (btnDec) btnDec.onclick = () => socket.emit('admin_modify_energy', -10);

    // Listeners
    socket.on('personnel_list_update', (list) => {
        renderPersonnelList(list, socket);
    });

    socket.on('spy_data_update', (data) => {
        if(currentSpyTarget === data.targetId) {
            renderSpyData(data.state);
        }
    });

    socket.on('spy_input_update', (data) => {
        if(currentSpyTarget === data.targetId) {
            renderSpyInput(data);
        }
    });

    UI.obunto.spy.close.onclick = () => {
        UI.obunto.spy.window.classList.add('hidden');
        currentSpyTarget = null;
    };
    
    // Broadcast e outros controles de alarme funcionam via UI global (html) pois os eventos são emitidos pelos botões existentes.
}

function renderPersonnelList(list, socket) {
    const container = UI.obunto.monitor.list;
    container.innerHTML = '';
    list.forEach(p => {
        const div = document.createElement('div');
        div.className = 'personnel-row';
        div.style.cursor = 'pointer';
        div.innerHTML = `
            <div class="p-id">${p.id}</div>
            <div class="p-name">${p.name}</div>
            <div class="p-status ${p.status.toLowerCase()}">${p.status}</div>
            <div class="p-act">${p.activity}</div>
            <button class="btn-newton" style="font-size:9px; padding:2px 4px; margin-left:5px;">TASK</button>
        `;
        
        const btnTask = div.querySelector('button');
        btnTask.onclick = (e) => {
            e.stopPropagation();
            socket.emit('admin_assign_task', { targetId: p.id, taskType: 'HEX' });
        };

        div.onclick = () => {
            startSpy(p.id, p.name, socket);
        };
        container.appendChild(div);
    });
}

function startSpy(id, name, socket) {
    currentSpyTarget = id;
    UI.obunto.spy.title.textContent = name.toUpperCase();
    UI.obunto.spy.window.classList.remove('hidden');
    bringToFront(UI.obunto.spy.window);
    UI.obunto.spy.content.innerHTML = `<div class="spy-section"><div class="spy-header">SYSTEM STATE</div><div id="spy-state-data">WAITING FOR UPLINK...</div></div><div class="spy-section" style="flex: 1; border-top: 1px dashed var(--border-light);"><div class="spy-header">KEYSTROKE FEED</div><div id="spy-input-data" class="spy-log"></div></div>`;
    socket.emit('admin_spy_start', id);
}

function renderSpyData(state) {
    if(!state) return;
    const el = document.getElementById('spy-state-data');
    if(!el) return;
    let html = `<div style="margin-bottom:10px;">CURRENT VIEW: <strong>${state.view}</strong></div>`;
    html += `<div>OPEN WINDOWS:</div>`;
    state.windows.forEach(w => { if(!w.hidden) html += `<div>- ${w.id}</div>`; });
    if(state.afk) html += `<div style="color:var(--alert-color); margin-top:10px;">[USER IS AFK]</div>`;
    el.innerHTML = html;
}

function renderSpyInput(data) {
    const el = document.getElementById('spy-input-data');
    if(!el) return;
    const line = document.createElement('div');
    const time = new Date().toLocaleTimeString().split(' ')[0];
    line.textContent = `[${time}] > ${data.value}`; 
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
}