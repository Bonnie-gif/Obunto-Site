import { UI } from './ui.js';

export function populateDashboard(user) {
    UI.sidebar.user.textContent = user.username.toUpperCase();
    UI.sidebar.rank.textContent = user.rank;
    UI.dash.name.textContent = user.displayName;
    UI.dash.rank.textContent = user.rank;
    UI.dash.id.textContent = user.id;
    UI.dash.avatar.src = user.avatar || '/assets/icon-large-owner_info-28x14.png';
    UI.dash.depts.innerHTML = '';
    if (user.affiliations && user.affiliations.length > 0) {
        user.affiliations.forEach(aff => {
            const div = document.createElement('div');
            div.className = 'dept-row';
            div.innerHTML = `<div class="dept-name">${aff.groupName}</div><div class="dept-role">${aff.role}</div>`;
            UI.dash.depts.appendChild(div);
        });
    } else {
        UI.dash.depts.innerHTML = '<div class="dept-row">NO TSC AFFILIATIONS</div>';
    }
}