import * as api from './api.js';
import { playSound } from './utils.js';
import { showStatus, enterMainScreen } from './ui.js';
import { socket } from './socket.js';

export let currentUser = null;
export let authToken = localStorage.getItem('arcs_token');

export function setCurrentUser(user) {
    currentUser = user;
}

export function setAuthToken(token) {
    authToken = token;
    localStorage.setItem('arcs_token', token);
}

export async function handleLogin() {
    const userId = document.getElementById('operator-id').value.trim();
    const passwordEl = document.getElementById('operator-password');
    const password = passwordEl ? passwordEl.value : '';

    if (!userId) {
        playSound('sfx-error');
        showStatus('ENTER OPERATOR ID', 'error');
        return;
    }

    try {
        const data = await api.login(userId, password);
        
        setAuthToken(data.token);
        setCurrentUser(data.user);

        // Register socket identity
        socket.emit('register', { userId: currentUser.id, isAdmin: currentUser.isAdmin });

        playSound('sfx-poweron');
        enterMainScreen(currentUser);

    } catch (e) {
        playSound('sfx-error');
        showStatus(e.message.toUpperCase(), 'error');
    }
}

export async function handleNewOperator() {
    const userIdInput = document.getElementById('operator-id');
    const userId = userIdInput.value.trim().toUpperCase() || generateUserId();
    
    try {
        await api.register(userId);
        playSound('sfx-sent');
        showStatus('REQUEST SENT', 'success');
        
        showIdPopup(userId);
        userIdInput.value = userId;
        
    } catch (e) {
        playSound('sfx-error');
        showStatus(e.message.toUpperCase(), 'error');
    }
}

export function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('arcs_token');
    location.reload();
}

export function generateUserId() {
    return 'OP' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function isAdmin() {
    return currentUser?.isAdmin || false;
}

export function hasPermission(permission) {
    if (isAdmin()) return true;
    return currentUser?.permissions?.includes(permission) || false;
}

function showIdPopup(userId) {
    let popup = document.getElementById('id-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'id-popup';
        popup.className = 'modal';
        popup.innerHTML = `
            <div class="modal-content" style="min-width: 350px;">
                <h3>SAVE YOUR ID</h3>
                <p>Request sent. Save this ID to login:</p>
                <div id="popup-user-id" style="font-family:monospace; font-size:1.5em; margin:15px 0; border:1px solid #ccc; padding:10px;">${userId}</div>
                <button onclick="window.copyUserId()">COPY ID</button>
                <button onclick="window.closeIdPopup()" style="margin-top:10px;">CLOSE</button>
            </div>
        `;
        document.body.appendChild(popup);
    } else {
        document.getElementById('popup-user-id').textContent = userId;
    }
    popup.classList.remove('hidden');
}