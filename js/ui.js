import { playSound } from './audio.js';

export function initUI() {
    document.querySelectorAll('.window-newton').forEach(win => {
        const header = win.querySelector('.win-header');
        if(!header) return;

        header.onmousedown = (e) => {
            if(e.target.closest('button')) return;
            
            let shiftX = e.clientX - win.getBoundingClientRect().left;
            let shiftY = e.clientY - win.getBoundingClientRect().top;

            function moveAt(pageX, pageY) {
                win.style.left = pageX - shiftX + 'px';
                win.style.top = pageY - shiftY + 'px';
            }

            function onMouseMove(event) {
                moveAt(event.pageX, event.pageY);
            }

            document.addEventListener('mousemove', onMouseMove);

            header.onmouseup = () => {
                document.removeEventListener('mousemove', onMouseMove);
                header.onmouseup = null;
            };
        };
        
        win.onmousedown = () => {
            document.querySelectorAll('.window-newton').forEach(w => w.style.zIndex = 1000);
            win.style.zIndex = 1001;
        };
    });

    setupWindowToggle('btnNotepad', 'notepad-window', 'closeNote');
    setupWindowToggle('btnObunto', 'obunto-window', null);
    setupWindowToggle('btnOpenDarch', 'darch-window', 'closeDarch');
    setupWindowToggle('btnOpenComms', 'comms-window', 'closeComms');
    setupWindowToggle('btnOpenHelp', 'help-window', 'closeHelp');
    setupWindowToggle('btnObuntoControl', 'admin-panel', 'closeAdmin');
    
    document.getElementById('btnMyDashboard').onclick = () => {
        document.querySelectorAll('.viewer').forEach(v => v.classList.add('hidden'));
        document.getElementById('view-dashboard').classList.remove('hidden');
        playSound('click');
    };
}

function setupWindowToggle(btnId, winId, closeId) {
    const btn = document.getElementById(btnId);
    const win = document.getElementById(winId);
    const close = document.getElementById(closeId);

    if (btn && win) {
        btn.onclick = () => {
            const isHidden = win.classList.contains('hidden');
            document.querySelectorAll('.window-newton').forEach(w => w.style.zIndex = 1000);
            
            if (isHidden) {
                win.classList.remove('hidden');
                win.style.zIndex = 1001;
                playSound('click');
            } else {
                win.classList.add('hidden');
            }
        };
    }

    if (close && win) {
        close.onclick = () => {
            win.classList.add('hidden');
            playSound('click');
        };
    }
}

export function renderDashboard(userData) {
    const dashName = document.getElementById('dashName');
    const dashId = document.getElementById('dashId');
    const dashRank = document.getElementById('dashRank');
    const dashAvatar = document.getElementById('dashAvatar');
    const dashDepts = document.getElementById('dashDepts');

    if (dashName) dashName.textContent = userData.displayName.toUpperCase();
    if (dashId) dashId.textContent = userData.id;
    if (dashRank) dashRank.textContent = userData.rank;
    if (dashAvatar && userData.avatar) dashAvatar.src = userData.avatar;

    if (dashDepts && userData.affiliations) {
        dashDepts.innerHTML = '';
        userData.affiliations.forEach(aff => {
            const row = document.createElement('div');
            row.className = 'dept-row';
            row.innerHTML = `
                <div class="dept-name">${aff.groupName}</div>
                <div class="dept-role">${aff.role} (Rank ${aff.rank})</div>
            `;
            dashDepts.appendChild(row);
        });
    }
}