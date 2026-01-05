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
            el.innerHTML = `
                <img src="assets/${file.type === 'folder' ? 'button-folder-21x17.png' : 'button-text-22x17.png'}" class="file-icon">
                <span class="file-name">${file.name}</span>
            `;
            el.onclick = () => {
                if (file.type === 'folder') {
                    currentPath += file.name + '/';
                    requestFiles();
                } else {
                    alert(`Opening ${file.name}...`);
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
            // Arquivos de exemplo se vazio
            renderFiles([
                { name: 'SYSTEM', type: 'folder' },
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
        };
    }
}