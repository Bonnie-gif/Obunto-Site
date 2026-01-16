import * as api from './api.js';
import { playSound, formatDate } from './utils.js';
import { escapeHtml, openModal, closeModal } from './ui.js';
import { currentUser, isAdmin } from './auth.js';
import { socket } from './socket.js';

let currentTicketId = null;
let openTicketWindows = {};

export async function loadHelpTickets() {
    try {
        const data = await api.getHelpTickets();
        
        if (isAdmin()) {
            renderAdminTicketsList(data.tickets);
        } else {
            renderUserTicketsList(data.tickets);
        }
    } catch (e) { 
        console.error(e); 
    }
}

function renderAdminTicketsList(tickets) {
    const container = document.getElementById('tickets-admin-list');
    if (!container) return;
    
    const pending = tickets.filter(t => t.status === 'pending');
    const active = tickets.filter(t => t.status === 'active');
    const closed = tickets.filter(t => t.status === 'closed');
    
    container.innerHTML = `
        <div class="tickets-section">
            <div class="tickets-section-header">PENDING REQUESTS (${pending.length})</div>
            <div class="tickets-list" id="pending-tickets-list"></div>
        </div>
        <div class="tickets-section">
            <div class="tickets-section-header">ACTIVE CHATS (${active.length})</div>
            <div class="tickets-list" id="active-tickets-list"></div>
        </div>
        <div class="tickets-section">
            <div class="tickets-section-header">CLOSED (${closed.length})</div>
            <div class="tickets-list" id="closed-tickets-list"></div>
        </div>
    `;
    
    pending.forEach(ticket => appendAdminTicketCard(ticket, 'pending'));
    active.forEach(ticket => appendAdminTicketCard(ticket, 'active'));
    closed.forEach(ticket => appendAdminTicketCard(ticket, 'closed'));
}

function appendAdminTicketCard(ticket, listType) {
    const listId = listType + '-tickets-list';
    const list = document.getElementById(listId);
    if (!list) return;
    
    const card = document.createElement('div');
    card.className = `ticket-card ticket-${ticket.status}`;
    
    let actions = '';
    if (ticket.status === 'pending') {
        actions = `
            <button class="ticket-btn approve" onclick="window.approveTicket('${ticket.id}')">APPROVE & CHAT</button>
            <button class="ticket-btn reject" onclick="window.rejectTicket('${ticket.id}')">REJECT</button>
        `;
    } else if (ticket.status === 'active') {
        actions = `
            <button class="ticket-btn chat" onclick="window.openTicketChat('${ticket.id}')">OPEN CHAT</button>
            <button class="ticket-btn close" onclick="window.closeTicketById('${ticket.id}')">CLOSE TICKET</button>
        `;
    }
    
    card.innerHTML = `
        <div class="ticket-header">
            <div class="ticket-id">TICKET #${ticket.id.slice(-6)}</div>
            <div class="ticket-user">From: ${escapeHtml(ticket.userName)}</div>
        </div>
        <div class="ticket-subject">${escapeHtml(ticket.subject)}</div>
        <div class="ticket-message">${escapeHtml(ticket.message)}</div>
        <div class="ticket-meta">${formatDate(ticket.createdAt)}</div>
        <div class="ticket-actions">${actions}</div>
    `;
    
    list.appendChild(card);
}

function renderUserTicketsList(tickets) {
    const container = document.getElementById('tickets-user-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (tickets.length === 0) {
        container.innerHTML = '<div class="tickets-empty">No tickets yet. Create one if you need help!</div>';
        return;
    }
    
    tickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = `ticket-card ticket-${ticket.status}`;
        
        let statusText = ticket.status.toUpperCase();
        let actions = '';
        
        if (ticket.status === 'active') {
            actions = `<button class="ticket-btn chat" onclick="window.openTicketChat('${ticket.id}')">OPEN CHAT</button>`;
        }
        
        card.innerHTML = `
            <div class="ticket-header">
                <div class="ticket-id">TICKET #${ticket.id.slice(-6)}</div>
                <div class="ticket-status-badge status-${ticket.status}">${statusText}</div>
            </div>
            <div class="ticket-subject">${escapeHtml(ticket.subject)}</div>
            <div class="ticket-message">${escapeHtml(ticket.message)}</div>
            <div class="ticket-meta">Created: ${formatDate(ticket.createdAt)}</div>
            <div class="ticket-actions">${actions}</div>
        `;
        
        container.appendChild(card);
    });
}

export function openNewTicketModal() {
    openModal('new-ticket-modal');
}

export function closeNewTicketModal() {
    closeModal('new-ticket-modal');
    document.getElementById('ticket-subject').value = '';
    document.getElementById('ticket-message').value = '';
}

export async function createNewTicket() {
    const subject = document.getElementById('ticket-subject').value.trim();
    const message = document.getElementById('ticket-message').value.trim();
    
    if (!subject || !message) {
        playSound('sfx-error');
        alert('Please fill in both subject and message');
        return;
    }
    
    try {
        await api.createHelpTicket(subject, message);
        playSound('sfx-sent');
        closeNewTicketModal();
        loadHelpTickets();
        alert('Help request sent! Waiting for admin approval...');
    } catch (e) {
        playSound('sfx-error');
        alert('Error creating ticket: ' + e.message);
    }
}

export async function approveTicket(ticketId) {
    try {
        await api.apiCall(`/tickets/${ticketId}/approve`, 'POST');
        playSound('sfx-blue');
        loadHelpTickets();
        openTicketChat(ticketId);
    } catch (e) {
        playSound('sfx-error');
        alert('Error approving ticket: ' + e.message);
    }
}

export async function rejectTicket(ticketId) {
    if (!confirm('Reject this help request?')) return;
    
    try {
        await api.apiCall(`/tickets/${ticketId}/reject`, 'POST');
        playSound('sfx-denied');
        loadHelpTickets();
    } catch (e) {
        playSound('sfx-error');
    }
}

export async function closeTicketById(ticketId) {
    if (!confirm('Close this ticket?')) return;
    
    try {
        await api.closeTicket(ticketId);
        playSound('sfx-denied');
        
        // Close chat window if open
        const chatWindow = document.getElementById(`ticket-chat-${ticketId}`);
        if (chatWindow) chatWindow.remove();
        
        loadHelpTickets();
    } catch (e) {
        playSound('sfx-error');
    }
}

export async function openTicketChat(ticketId) {
    currentTicketId = ticketId;
    
    // Check if window already exists
    if (document.getElementById(`ticket-chat-${ticketId}`)) {
        return;
    }
    
    try {
        const ticketData = await api.apiCall(`/tickets/${ticketId}`);
        const ticket = ticketData.ticket;
        
        const chatWindow = document.createElement('div');
        chatWindow.id = `ticket-chat-${ticketId}`;
        chatWindow.className = 'ticket-chat-window';
        
        chatWindow.innerHTML = `
            <div class="ticket-chat-header">
                <div class="ticket-chat-title">
                    <span>TICKET #${ticketId.slice(-6)}</span>
                    <span class="ticket-chat-subject">${escapeHtml(ticket.subject)}</span>
                </div>
                <button class="ticket-chat-close" onclick="window.closeTicketChatWindow('${ticketId}')">✕</button>
            </div>
            <div class="ticket-chat-messages" id="ticket-messages-${ticketId}"></div>
            <div class="ticket-chat-input-area">
                <input type="text" id="ticket-input-${ticketId}" placeholder="Type message...">
                <button onclick="window.sendTicketMsg('${ticketId}')">SEND</button>
            </div>
        `;
        
        document.body.appendChild(chatWindow);
        
        // Load existing messages
        if (ticket.messages && ticket.messages.length > 0) {
            ticket.messages.forEach(msg => appendTicketMessage(ticketId, msg));
        }
        
        // Setup enter key handler
        document.getElementById(`ticket-input-${ticketId}`).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendTicketMsg(ticketId);
        });
        
        openTicketWindows[ticketId] = true;
        
    } catch (e) {
        console.error(e);
        playSound('sfx-error');
    }
}

export function closeTicketChatWindow(ticketId) {
    const chatWindow = document.getElementById(`ticket-chat-${ticketId}`);
    if (chatWindow) chatWindow.remove();
    delete openTicketWindows[ticketId];
}

export async function sendTicketMsg(ticketId) {
    const input = document.getElementById(`ticket-input-${ticketId}`);
    const message = input.value.trim();
    
    if (!message) return;
    
    try {
        await api.respondToTicket(ticketId, message);
        input.value = '';
        playSound('sfx-sent');
    } catch (e) {
        playSound('sfx-error');
        console.error(e);
    }
}

export function handleTicketMessage(data) {
    const { ticketId, message } = data;
    
    // If chat window is open, append message
    if (openTicketWindows[ticketId]) {
        appendTicketMessage(ticketId, message);
    } else {
        // Show notification
        showTicketNotification(ticketId, message);
    }
}

function appendTicketMessage(ticketId, message) {
    const container = document.getElementById(`ticket-messages-${ticketId}`);
    if (!container) return;
    
    const div = document.createElement('div');
    const isFromAdmin = message.isAdmin;
    div.className = `ticket-chat-message ${isFromAdmin ? 'admin' : 'user'}`;
    
    div.innerHTML = `
        <div class="message-sender">${escapeHtml(message.senderName)}:</div>
        <div class="message-text">${escapeHtml(message.message)}</div>
        <div class="message-time">${formatDate(message.timestamp)}</div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showTicketNotification(ticketId, message) {
    playSound('sfx-newmessage');
    
    const notif = document.createElement('div');
    notif.className = 'ticket-notification';
    notif.innerHTML = `
        <div>New message in Ticket #${ticketId.slice(-6)}</div>
        <button onclick="window.openTicketChat('${ticketId}')">OPEN</button>
    `;
    
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 5000);
}