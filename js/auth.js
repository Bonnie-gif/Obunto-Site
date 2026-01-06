import { playSound } from './audio.js';
import { renderDashboard } from './ui.js';

export async function handleLogin(socket) {
    const input = document.getElementById('inpId');
    const status = document.getElementById('loginStatus');
    const userId = input.value.trim();

    if (!userId) {
        status.textContent = 'ID REQUIRED';
        playSound('denied');
        return null;
    }

    status.textContent = 'AUTHENTICATING...';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        });
        
        const data = await response.json();

        if (data.success) {
            status.textContent = 'ACCESS GRANTED';
            playSound('notify');
            
            const userData = data.userData;
            window.userData = userData; 
            socket.emit('register_user', userData.id);
            
            const sbUser = document.getElementById('sbUser');
            const sbRank = document.getElementById('sbRank');
            
            if (sbUser) sbUser.textContent = userData.username.toUpperCase();
            if (sbRank) sbRank.textContent = userData.rank;
            
            renderDashboard(userData);

            const helpBtn = document.querySelector('[data-personnel-only]');
            if (userData.isObunto || userData.isHoltz) {
                const adminPanel = document.getElementById('admin-panel');
                if (adminPanel) adminPanel.classList.remove('hidden');
                
                const dockAdmin = document.getElementById('btnObuntoControl');
                if (dockAdmin) dockAdmin.classList.remove('hidden');

                if(helpBtn) helpBtn.style.display = 'none';
            } else {
                if(helpBtn) helpBtn.style.display = 'flex';
            }

            setTimeout(() => {
                const loginScreen = document.getElementById('login-screen');
                const desktopScreen = document.getElementById('desktop-screen');
                
                if (loginScreen) loginScreen.classList.add('hidden');
                if (desktopScreen) {
                    desktopScreen.classList.remove('hidden');
                    desktopScreen.classList.add('active');
                }
            }, 1000);

            return userData;
        } else {
            status.textContent = data.message || 'ACCESS DENIED';
            playSound('denied');
            return null;
        }

    } catch (error) {
        status.textContent = 'CONNECTION ERROR';
        playSound('denied');
        return null;
    }
}