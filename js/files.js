import { playSound } from './audio.js';

export function initFiles(socket) {
    const grid = document.getElementById('darchGrid');
    const pathDisplay = document.getElementById('darchPath');
    let currentPath = '/';

    function renderFiles(files) {
        if (!grid) return;
        grid.innerHTML = '';
        
        files.forEach(file => {
            const el = document.createElement('div');
            el.className = 'file-item';
            
            const iconSrc = file.type === 'folder' 
                ? '/assets/icon-small-folder-15x11.png' 
                : '/assets/icon-small-text-3x10.png';
            
            el.innerHTML = `
                <img src="${iconSrc}" class="file-icon">
                <span class="file-name">${file.name}</span>
            `;
            
            el.onclick = () => {
                if (file.type === 'folder') {
                    currentPath += file.name + '/';
                    requestFiles();
                    playSound('click');
                } else {
                    playSound('denied');
                }
            };
            grid.appendChild(el);
        });
        
        if (pathDisplay) pathDisplay.textContent = currentPath;
    }

    function requestFiles() {
        socket.emit('fs_get_files', { path: currentPath });
    }

    socket.on('fs_load', (files) => {
        if (!files || files.length === 0) {
            renderFiles([
                { name: 'SYSTEM', type: 'folder' },
                { name: 'PERSONNEL', type: 'folder' },
                { name: 'LOGS', type: 'folder' },
                { name: 'README.txt', type: 'file' }
            ]);
        } else {
            renderFiles(files);
        }
    });

    const btnHome = document.getElementById('btnDarchHome');
    if (btnHome) {
        btnHome.onclick = () => {
            currentPath = '/';
            requestFiles();
            playSound('click');
        };
    }
    
    const btnNewFolder = document.getElementById('btnNewFolder');
    if (btnNewFolder) {
        btnNewFolder.onclick = () => {
            const name = prompt("FOLDER NAME:");
            if(name && name.trim()) {
                socket.emit('fs_create_item', { 
                    name: name.trim().toUpperCase(), 
                    type: 'folder', 
                    parentId: currentPath 
                });
                playSound('click');
            }
        };
    }
    
    requestFiles();
}