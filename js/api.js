export async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const authToken = localStorage.getItem('arcs_token');
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const res = await fetch(`/api${endpoint}`, config);
        const data = await res.json();
        
        if (res.status === 401 || res.status === 403) {
            if (endpoint !== '/login' && endpoint !== '/register') {
                console.warn('Session expired');
            }
        }
        
        if (!res.ok) throw new Error(data.message || 'Server Error');
        return data;
    } catch (e) {
        console.error(`API Error (${endpoint}):`, e);
        throw e;
    }
}

export async function login(userId, password = '') {
    return apiCall('/login', 'POST', { userId, password });
}

export async function register(userId) {
    return apiCall('/register', 'POST', { userId });
}

export async function sendBroadcast(text, sprite) {
    return apiCall('/broadcast', 'POST', { text, sprite });
}

export async function sendRadioMessage(text) {
    return apiCall('/radio', 'POST', { text });
}

export async function getRadioMessages() {
    return apiCall('/radio');
}

export async function clearRadio() {
    return apiCall('/radio', 'DELETE');
}

export async function deleteRadioMessage(id) {
    return apiCall(`/radio/${id}`, 'DELETE');
}

export async function getPendingUsers() {
    return apiCall('/pending');
}

export async function approveUser(userId) {
    return apiCall('/users/approve', 'POST', { userId });
}

export async function denyUser(userId) {
    return apiCall('/users/deny', 'POST', { userId });
}

export async function getUsers() {
    return apiCall('/users');
}

export async function updateUser(userId, data) {
    return apiCall(`/users/${userId}`, 'PUT', data);
}

export async function banUser(userId) {
    return apiCall(`/users/${userId}/ban`, 'POST');
}

export async function unbanUser(userId) {
    return apiCall(`/users/${userId}/unban`, 'POST');
}

export async function getUserPermissions(userId) {
    return apiCall(`/users/${userId}/permissions`);
}

export async function updateUserPermissions(userId, permissions) {
    return apiCall(`/users/${userId}/permissions`, 'PUT', { permissions });
}

export async function createHelpTicket(subject, message) {
    return apiCall('/tickets', 'POST', { subject, message });
}

export async function getHelpTickets() {
    return apiCall('/tickets');
}

export async function respondToTicket(ticketId, message) {
    return apiCall(`/tickets/${ticketId}/respond`, 'POST', { message });
}

export async function closeTicket(ticketId) {
    return apiCall(`/tickets/${ticketId}/close`, 'POST');
}

export async function getAnalytics() {
    return apiCall('/analytics');
}

export async function getWelcome() {
    return apiCall('/welcome');
}

export async function updateWelcome(data) {
    return apiCall('/welcome', 'PUT', data);
}

export async function getTabs() {
    return apiCall('/tabs');
}

export async function createTab(name, content) {
    return apiCall('/tabs', 'POST', { name, content });
}

export async function deleteTab(id) {
    return apiCall(`/tabs/${id}`, 'DELETE');
}

export async function publishTabs() {
    return apiCall('/tabs/publish', 'POST');
}