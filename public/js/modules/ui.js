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
    obunto: {
        panel: document.getElementById('admin-panel'),
        btnOpen: document.getElementById('btnObuntoControl'),
        btnClose: document.getElementById('closeAdmin'),
        moods: document.getElementById('mood-container'),
        target: document.getElementById('targetId'),
        msg: document.getElementById('adminMsg'),
        btnSend: document.getElementById('btnBroadcast'),
        bubble: document.getElementById('obunto-bubble'),
        img: document.getElementById('obunto-img'),
        text: document.getElementById('obunto-text')
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