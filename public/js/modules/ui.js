export const UI = {
    screens: {
        boot: document.getElementById('boot-3'),
        boot2: document.getElementById('boot-2'),
        login: document.getElementById('login-screen'),
        desktop: document.getElementById('desktop-screen')
    },
    dash: {
        name: document.getElementById('dashName'),
        rank: document.getElementById('dashRank'),
        id: document.getElementById('dashId'),
        avatar: document.getElementById('dashAvatar'),
        depts: document.getElementById('dashDepts')
    },
    sidebar: { user: document.getElementById('sbUser'), rank: document.getElementById('sbRank') },
    login: { btn: document.getElementById('btnLogin'), input: document.getElementById('inpId'), status: document.getElementById('loginStatus') },
    status: { indicator: document.getElementById('statusIndicator'), text: document.getElementById('statusText') },
    obunto: {
        panel: document.getElementById('admin-panel'),
        btnOpen: document.getElementById('btnObuntoControl'),
        btnClose: document.getElementById('closeAdmin'),
        moods: document.getElementById('mood-container'),
        target: document.getElementById('targetId'),
        msg: document.getElementById('adminMsg'),
        btnSend: document.getElementById('btnBroadcast'),
        btnToggle: document.getElementById('btnToggleStatus'),
        ticketList: document.getElementById('ticket-list'),
        chatArea: document.getElementById('admin-chat-area'),
        chatHistory: document.getElementById('admin-chat-history'),
        chatInput: document.getElementById('admin-chat-input'),
        chatSend: document.getElementById('admin-chat-send'),
        chatClose: document.getElementById('admin-chat-close'),
        chatTarget: document.getElementById('admin-chat-target'),
        bubble: document.getElementById('obunto-bubble'),
        img: document.getElementById('obunto-img'),
        text: document.getElementById('obunto-text')
    },
    help: {
        window: document.getElementById('help-window'),
        reqForm: document.getElementById('help-request-form'),
        chatInterface: document.getElementById('help-chat-interface'),
        reqInput: document.getElementById('help-msg'),
        reqBtn: document.getElementById('btnSendHelp'),
        reqStatus: document.getElementById('help-status'),
        history: document.getElementById('chat-history'),
        input: document.getElementById('chat-input'),
        send: document.getElementById('btnChatSend'),
        btnOpen: document.getElementById('btnOpenHelp'),
        btnClose: document.getElementById('closeHelp')
    },
    clock: document.getElementById('clock'),
    date: document.getElementById('dateDisplay')
};

export function switchScreen(screenName) {
    Object.values(UI.screens).forEach(el => el.classList.add('hidden'));
    Object.values(UI.screens).forEach(el => el.classList.remove('active'));
    if(UI.screens[screenName]) {
        UI.screens[screenName].classList.remove('hidden');
        UI.screens[screenName].classList.add('active');
    }
}

export function makeDraggable(win) {
    const header = win.querySelector('.win-header');
    if (!header) return;
    
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
        if(e.target.closest('.close-btn')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = win.offsetLeft;
        initialTop = win.offsetTop;
        win.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const maxLeft = window.innerWidth - win.offsetWidth;
        const maxTop = window.innerHeight - win.offsetHeight;

        win.style.left = `${Math.min(Math.max(0, newLeft), maxLeft)}px`;
        win.style.top = `${Math.min(Math.max(0, newTop), maxTop)}px`;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        win.style.cursor = 'default';
    });
}

export function initDraggables() {
    document.querySelectorAll('.window-newton').forEach(win => {
        makeDraggable(win);
    });
}