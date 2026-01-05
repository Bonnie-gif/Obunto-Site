import { playSound } from './audio.js';

export function initUI() {
    let zIndexCounter = 1000;

    document.querySelectorAll('.window-newton').forEach(win => {
        const header = win.querySelector('.win-header');
        const resizeHandle = win.querySelector('.resize-handle');
        
        if (header) {
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
        }

        win.onmousedown = () => {
            zIndexCounter++;
            win.style.zIndex = zIndexCounter;
        };

        if (resizeHandle) {
            resizeHandle.onmousedown = (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                function resize(event) {
                    win.style.width = (event.clientX - win.getBoundingClientRect().left) + 'px';
                    win.style.height = (event.clientY - win.getBoundingClientRect().top) + 'px';
                }
                
                function stopResize() {
                    document.removeEventListener('mousemove', resize);
                    document.removeEventListener('mouseup', stopResize);
                }
                
                document.addEventListener('mousemove', resize);
                document.addEventListener('mouseup', stopResize);
            };
        }
    });

    document.querySelectorAll('[data-action="minimize"]').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const win = e.target.closest('.window-newton');
            win.classList.toggle('minimized');
            playSound('click');
        };
    });

    document.querySelectorAll('[data-action="maximize"]').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const win = e.target.closest('.window-newton');
            if (!win.dataset.originalSize) {
                win.dataset.originalSize = JSON.stringify({
                    width: win.style.width,
                    height: win.style.height,
                    top: win.style.top,
                    left: win.style.left
                });
                win.style.width = '100%';
                win.style.height = 'calc(100vh - 48px)';
                win.style.top = '0';
                win.style.left = '0';
            } else {
                const original = JSON.parse(win.dataset.originalSize);
                Object.assign(win.style, original);
                delete win.dataset.originalSize;
            }
            playSound('click');
        };
    });

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const win = e.target.closest('.window-newton');
            win.classList.add('hidden');
            playSound('click');
        };
    });

    setupWindowToggle('btnNotepad', 'notepad-window');
    setupWindowToggle('btnOpenDarch', 'darch-window');
    setupWindowToggle('btnOpenRadio', 'radio-window');
    setupWindowToggle('btnOpenHelp', 'help-window');
    setupWindowToggle('btnObuntoControl', 'admin-panel');
    
    const btnDashboard = document.getElementById('btnMyDashboard');
    if (btnDashboard) {
        btnDashboard.onclick = () => {
            document.querySelectorAll('.viewer').forEach(v => v.classList.add('hidden'));
            document.getElementById('view-dashboard').classList.remove('hidden');
            playSound('click');
        };
    }
}

function setupWindowToggle(btnId, winId) {
    const btn = document.getElementById(btnId);
    const win = document.getElementById(winId);

    if (btn && win) {
        btn.onclick = () => {
            const isHidden = win.classList.contains('hidden');
            if (isHidden) {
                win.classList.remove('hidden');
                // Ensure it opens on top
                let maxZ = 1000;
                document.querySelectorAll('.window-newton').forEach(w => {
                    const z = parseInt(window.getComputedStyle(w).zIndex || 1000);
                    if(z > maxZ) maxZ = z;
                });
                win.style.zIndex = maxZ + 1;
                playSound('click');
            } else {
                win.classList.add('hidden');
            }
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
        if(userData.affiliations.length === 0) {
            dashDepts.innerHTML = '<div class="dept-row">NO AFFILIATIONS DETECTED</div>';
        } else {
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
}