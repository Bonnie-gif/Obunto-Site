/**
 * ARCS - Advanced Research & Containment System
 * Client v3.2.2 - Modular Architecture
 */

// Import all modules
import { initSocket } from './socket.js';
import * as auth from './auth.js';
import * as ui from './ui.js';
import * as utils from './utils.js';
import * as handlers from './handlers.js';
import * as admin from './admin.js';
import * as radio from './radio.js';
import * as tickets from './tickets.js';

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Socket.io
    initSocket();
    
    // Load saved theme
    const savedTheme = localStorage.getItem('arcs_theme') || 'green';
    utils.setAlarmTheme(savedTheme);
    
    // Start loading animation
    setTimeout(utils.startLoading, 1000);
    
    // Setup handlers
    handlers.setupInputHandlers();
    handlers.setupTabHandlers();
    handlers.setupSpriteSelector();
});

// Export functions to window for HTML onclick attributes
window.handleLogin = auth.handleLogin;
window.handleNewOperator = auth.handleNewOperator;
window.logout = auth.logout;
window.goToHome = ui.goToHome;
window.setAlarmTheme = utils.setAlarmTheme;
window.hideNotification = ui.hideNotification;
window.showUsersSection = ui.showUsersSection;
window.closeIdPopup = ui.closeIdPopup;
window.copyUserId = ui.copyUserId;

// Admin functions
window.loadPendingList = admin.loadPendingList;
window.approveUser = admin.approveUser;
window.denyUser = admin.denyUser;
window.loadActiveUsers = admin.loadActiveUsers;
window.banUser = admin.banUser;
window.unbanUser = admin.unbanUser;
window.editUser = admin.editUser;
window.saveUserChanges = admin.saveUserChanges;
window.editPermissions = admin.editPermissions;
window.savePermissions = admin.savePermissions;
window.sendBroadcast = admin.sendBroadcast;
window.loadAnalytics = admin.loadAnalytics;
window.renderCustomTabsInEditor = admin.renderCustomTabsInEditor;
window.saveNewTab = admin.saveNewTab;
window.deleteCustomTab = admin.deleteCustomTab;
window.publishTabs = admin.publishTabs;
window.saveWelcomeChanges = admin.saveWelcomeChanges;

// Radio functions
window.sendRadioMessage = radio.sendRadioMessage;
window.loadRadioMessages = radio.loadRadioMessages;
window.appendRadioMessage = radio.appendRadioMessage;
window.deleteRadio = radio.deleteRadio;
window.clearRadioMessages = radio.clearRadioMessages;

// Tickets functions
window.loadHelpTickets = tickets.loadHelpTickets;
window.openNewTicketModal = tickets.openNewTicketModal;
window.closeNewTicketModal = tickets.closeNewTicketModal;
window.createNewTicket = tickets.createNewTicket;
window.approveTicket = tickets.approveTicket;
window.rejectTicket = tickets.rejectTicket;
window.closeTicketById = tickets.closeTicketById;
window.openTicketChat = tickets.openTicketChat;
window.closeTicketChatWindow = tickets.closeTicketChatWindow;
window.sendTicketMsg = tickets.sendTicketMsg;
window.handleTicketMessage = tickets.handleTicketMessage;

// UI Modal functions
window.openAdmin = () => {
    ui.openModal('admin-panel');
    admin.loadPendingList(true);
};
window.closeAdmin = () => ui.closeModal('admin-panel');
window.addNewTab = () => ui.openModal('new-tab-modal');
window.closeNewTabModal = () => ui.closeModal('new-tab-modal');
window.editWelcomeHome = () => {
    document.getElementById('welcome-title-input').value = document.getElementById('home-welcome-title').textContent;
    document.getElementById('welcome-text-input').value = document.getElementById('home-welcome-text').textContent;
    ui.openModal('edit-welcome-modal');
};
window.closeWelcomeModal = () => ui.closeModal('edit-welcome-modal');
window.closeEditUserModal = () => ui.closeModal('edit-user-modal');
window.closePermissionsModal = () => ui.closeModal('permissions-modal');

window.updateWelcomeScreen = ui.updateWelcomeScreen;
window.renderMenuTabs = ui.renderMenuTabs;
window.showCustomTab = ui.showCustomTab;

console.log('ARCS v3.2.2 Modular System Loaded');