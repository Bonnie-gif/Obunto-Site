import { UI, switchScreen } from './ui.js';
import { populateDashboard } from './dashboard.js';
import { initObunto } from './obunto.js'; // Importante para o painel admin funcionar

export async function handleLogin(socket) {
    const id = UI.login.input.value.trim();
    if (!id) return null;
    
    UI.login.status.textContent = "SYNCING WITH MAINFRAME...";
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: id })
        });
        
        const data = await res.json();
        
        if (data.success) {
            const user = data.userData;
            socket.emit('register_user', user.id);
            
            // Popula dados
            populateDashboard(user);
            
            // Troca tela
            switchScreen('desktop');
            
            // Inicia sistemas do Obunto/Admin se necessário
            initObunto(socket, user.id);
            
            return user; 
        } else {
            UI.login.status.textContent = "ERROR: " + data.message;
            return null;
        }
    } catch (e) {
        console.error(e);
        UI.login.status.textContent = "CONNECTION FAILURE";
        return null;
    }
}