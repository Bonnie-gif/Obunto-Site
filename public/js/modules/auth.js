import { UI, switchScreen } from './ui.js';
import { populateDashboard } from './dashboard.js';
import { initObunto } from './obunto.js';

export async function handleLogin(socket) {
    const id = UI.login.input.value.trim();
    if (!id) return;

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

            populateDashboard(user);

            switchScreen('desktop');

            initObunto(socket, user.id);

        } else {
            UI.login.status.textContent = "ERROR: " + data.message;
        }
    } catch (e) {
        console.error(e);
        UI.login.status.textContent = "CONNECTION FAILURE";
    }
}