import { UI, bringToFront } from './ui.js';
import { playSound } from './audio.js';

let currentPath = [];
let allFiles = [];

export function initFiles(socket) {
    const { window, close, grid, path, btnNewFolder, btnNewFile, btnOpen } = UI.files;

    btnOpen.onclick = () => {
        window.classList.remove('hidden');
        bringToFront(window);
        playSound('click');
        socket.emit('fs_get_files');
    };
    close.onclick = () => window.classList.add('hidden');

    socket.on('fs_load', (files) => {
        allFiles = files;
        renderGrid();
    });

    btnNewFolder.onclick = async () => {
        const name = await UI.showCustomPrompt("ENTER FOLDER NAME:");
        if(name) {
            socket.emit('fs_create_item', {
                id: Date.now().toString(),
                type: 'folder',
                name: name.toUpperCase(),
                parentId: currentPath.length > 0 ? currentPath[currentPath.length-1] : 'root'
            });
        }
    };

    btnNewFile.onclick = async () => {
        const name = await UI.showCustomPrompt("ENTER FILE NAME:");
        if(name) {
            socket.emit('fs_create_item', {
                id: Date.now().toString(),
                type: 'file',
                name: name.toUpperCase() + ".TXT",
                parentId: currentPath.length > 0 ? currentPath[currentPath.length-1] : 'root',
                content: ""
            });
        }
    };

    function renderGrid() {
        grid.innerHTML = '';
        const currentParent = currentPath.length > 0 ? currentPath[currentPath.length-1] : 'root';
        
        if(currentPath.length > 0) {
            const backDiv = document.createElement('div');
            backDiv.className = 'file-item';
            backDiv.innerHTML = `<img src="/assets/button-folder-21x17.png" class="file-icon"><div class="file-name">..</div>`;
            backDiv.onclick = () => {
                currentPath.pop();
                updatePath();
                renderGrid();
            };
            grid.appendChild(backDiv);
        }

        const items = allFiles.filter(f => f.parentId === currentParent);
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'file-item';
            const icon = item.type === 'folder' ? '/assets/button-folder-21x17.png' : '/assets/button-note-15x15.png';
            div.innerHTML = `<img src="${icon}" class="file-icon"><div class="file-name">${item.name}</div>`;
            
            div.onclick = () => {
                if(item.type === 'folder') {
                    currentPath.push(item.id);
                    updatePath();
                    renderGrid();
                } else {
                    openFile(item);
                }
            };
            
            grid.appendChild(div);
        });
    }

    function updatePath() {
        path.textContent = "/ROOT/" + currentPath.join("/");
    }

    function openFile(file) {
        const notepad = document.getElementById('notepad-window');
        const area = document.getElementById('notepad-area');
        notepad.classList.remove('hidden');
        bringToFront(notepad);
        area.value = file.content || "";
        
        area.oninput = () => {
            socket.emit('fs_update_content', { id: file.id, content: area.value });
        };
    }
}