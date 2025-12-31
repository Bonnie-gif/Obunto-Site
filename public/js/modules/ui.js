export const UI = {
    screens: {
        boot: document.getElementById('boot-sequence'),
        login: document.getElementById('login-screen'),
        desktop: document.getElementById('desktop-screen')
    },
    views: {
        idle: document.getElementById('view-idle'),
        dashboard: document.getElementById('view-dashboard')
    },
    dash: {
        name: document.getElementById('dashName'),
        rank: document.getElementById('dashRank'),
        id: document.getElementById('dashId'),
        avatar: document.getElementById('dashAvatar'),
        depts: document.getElementById('dashDepts')
    },
    sidebar: { 
        user: document.getElementById('sbUser'), 
        rank: document.getElementById('sbRank'),
        btnDashboard: document.getElementById('btnMyDashboard')
    },
    login: { btn: document.getElementById('btnLogin'), input: document.getElementById('inpId'), status: document.getElementById('loginStatus') },
    status: { indicator: document.getElementById('statusIndicator'), text: document.getElementById('statusText') },
    obunto: {
        panel: document.getElementById('admin-panel'),
        btnOpen: document.getElementById('btnObuntoControl'),
        btnClose: document.getElementById('closeAdmin'),
        moods: document.getElementById('mood-container'),
        target: document.getElementById('broadcastTarget'),
        msg: document.getElementById('adminMsg'),
        btnSend: document.getElementById('btnBroadcast'),
        btnToggle: document.getElementById('btnToggleStatus'),
        ticketList: document.getElementById('ticket-list'),
        notifyIcon: document.getElementById('admin-notify-icon'),
        bubble: document.getElementById('obunto-bubble'),
        img: document.getElementById('obunto-img'),
        text: document.getElementById('obunto-text'),
        btnMonitor: document.getElementById('btnMonitor'),
        adminChat: {
            window: document.getElementById('admin-chat-window'),
            history: document.getElementById('admin-chat-history'),
            input: document.getElementById('admin-chat-input'),
            send: document.getElementById('admin-chat-send'),
            wait: document.getElementById('admin-chat-wait'),
            close: document.getElementById('admin-chat-close'),
            target: document.getElementById('admin-chat-target')
        },
        aop: {
            window: document.getElementById('aop-window'),
            close: document.getElementById('closeAop'),
            btnReboot: document.getElementById('btnSystemReboot')
        },
        monitor: {
            window: document.getElementById('personnel-window'),
            list: document.getElementById('personnel-list'),
            close: document.getElementById('closePersonnel')
        }
    },
    help: {
        window: document.getElementById('help-window'),
        reqForm: document.getElementById('help-request-form'),
        chatInterface: document.getElementById('help-chat-interface'),
        reqInput: document.getElementById('help-req-msg'),
        reqBtn: document.getElementById('btnSendHelp'),
        reqStatus: document.getElementById('help-status'),
        history: document.getElementById('chat-history'),
        input: document.getElementById('chat-input'),
        send: document.getElementById('btnChatSend'),
        btnOpen: document.getElementById('btnOpenHelp'),
        btnClose: document.getElementById('closeHelp')
    },
    clock: document.getElementById('clock'),
    date: document.getElementById('dateDisplay'),
    dock: {
        btnHelp: document.getElementById('btnOpenHelp')
    }
};

export function switchScreen(screenName) {
    Object.values(UI.screens).forEach(el => {
        if(el) {
            el.classList.add('hidden');
            el.classList.remove('active');
        }
    });
    if(UI.screens[screenName]) {
        UI.screens[screenName].classList.remove('hidden');
        UI.screens[screenName].classList.add('active');
    }
}

export function switchView(viewName) {
    Object.values(UI.views).forEach(el => {
        if(el) el.classList.add('hidden');
    });
    const sidebarBtns = document.querySelectorAll('.btn-action');
    sidebarBtns.forEach(btn => btn.classList.remove('active-nav'));

    if(UI.views[viewName]) {
        UI.views[viewName].classList.remove('hidden');
        if(viewName === 'dashboard') {
            UI.sidebar.btnDashboard.classList.add('active-nav');
        }
    }
}

export function makeDraggable(win) {
    const header = win.querySelector('.win-header');
    if (!header) return;
    let isDragging = false, startX, startY, initialLeft, initialTop;
    header.addEventListener('mousedown', (e) => {
        if(e.target.closest('.close-btn')) return;
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        initialLeft = win.offsetLeft; initialTop = win.offsetTop;
        win.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        win.style.left = `${initialLeft + dx}px`;
        win.style.top = `${initialTop + dy}px`;
    });
    window.addEventListener('mouseup', () => { isDragging = false; win.style.cursor = 'default'; });
}

export function initDraggables() {
    document.querySelectorAll('.window-newton').forEach(win => makeDraggable(win));
}