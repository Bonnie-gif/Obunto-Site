const socket = io();
const screens = {
  boot: document.getElementById('boot'),
  login: document.getElementById('login'),
  desktop: document.getElementById('desktop')
};
const UI = {
  inpId: document.getElementById('inpId'),
  btnLogin: document.getElementById('btnLogin'),
  btnGuest: document.getElementById('btnGuest'),
  loginStatus: document.getElementById('loginStatus'),
  search: document.getElementById('search'),
  btnSearch: document.getElementById('btnSearch'),
  btnRefresh: document.getElementById('btnRefresh'),
  glist: document.getElementById('glist'),
  historyList: document.getElementById('historyList'),
  viewer: document.getElementById('viewer'),
  dateDisplay: document.getElementById('dateDisplay'),
  profileWindow: document.getElementById('profile-window'),
  profileBody: document.getElementById('profile-body'),
  profileClose: document.getElementById('closeProfile'),
  obuntoBubble: document.getElementById('obunto-bubble'),
  obuntoImg: document.getElementById('obunto-img'),
  obuntoText: document.getElementById('obunto-text'),
  clock: document.getElementById('clock'),
  btnUnfreeze: document.getElementById('btnUnfreeze')
};
let historyList = JSON.parse(localStorage.getItem('tsc_history') || '[]');
let currentUser = null;

function show(screen) {
  Object.values(screens).forEach(s => s && s.classList.add('hidden'));
  const el = screens[screen];
  if (el) el.classList.remove('hidden');
}

function bootSequence() {
  show('boot');
  const progEl = document.getElementById('boot-progress');
  const statusEl = document.getElementById('boot-status');
  let p = 0;
  const t = setInterval(() => {
    p += 12;
    if (p > 100) p = 100;
    const full = '■'.repeat(Math.floor(p / 10));
    const empty = '□'.repeat(10 - Math.floor(p / 10));
    if (progEl) progEl.textContent = `[${full}${empty}] ${p}%`;
    if (p >= 50) {
      if (statusEl) statusEl.textContent = 'LOADING SYSTEM';
    }
    if (p >= 100) {
      clearInterval(t);
      if (statusEl) statusEl.textContent = 'COMPLETE';
      setTimeout(() => show('login'), 600);
    }
  }, 180);
}

function showObunto(text, mood) {
  if (!UI.obuntoBubble) return;
  UI.obuntoImg.src = `/obunto/${(mood || 'normal')}.png`;
  UI.obuntoText.textContent = text;
  UI.obuntoBubble.classList.remove('hidden');
  setTimeout(() => UI.obuntoBubble.classList.add('hidden'), 5000);
}

function updateClock() {
  if (!UI.clock) return;
  const now = new Date();
  UI.clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);

async function apiLogin(id) {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id })
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: 'NETWORK' };
  }
}

function renderHistory() {
  if (!UI.historyList) return;
  UI.historyList.innerHTML = '';
  historyList.forEach(entry => {
    const d = document.createElement('div');
    d.className = 'recent-item';
    d.textContent = `${entry.name} (${entry.id})`;
    d.onclick = () => { UI.search.value = entry.id; performSearch(); };
    UI.historyList.appendChild(d);
  });
}

function renderGroups(groups) {
  if (!UI.glist) return;
  UI.glist.innerHTML = '';
  groups.slice(0, 10).forEach(g => {
    const el = document.createElement('div');
    el.className = 'group-item';
    const left = document.createElement('div');
    left.textContent = g.dept || g.group || 'UNKNOWN';
    const right = document.createElement('div');
    right.style.color = '#0b69ff';
    right.textContent = g.role || '';
    el.appendChild(left);
    el.appendChild(right);
    UI.glist.appendChild(el);
  });
}

function renderDossier(user) {
  if (!UI.profileBody) return;
  const avatar = user.avatar || '/assets/icon-large-owner_info-28x14.png';
  const affiliations = user.affiliations || [];
  const html = [];
  html.push(`<div style="display:flex;gap:18px">`);
  html.push(`<div class="card-avatar"><img src="${avatar}" alt=""><div style="font-weight:900;margin-top:6px">${escapeHtml(user.username)}</div><div style="font-family:${'ui-monospace,monospace'};color:var(--muted)">${escapeHtml(user.id)}</div></div>`);
  html.push(`<div class="card-info">`);
  html.push(`<div class="info-line"><strong>RANK</strong> • <span style="color:var(--accent)">${escapeHtml(user.rank || '')}</span></div>`);
  html.push(`<div class="info-line"><strong>AFFILIATIONS</strong></div>`);
  html.push(`<div style="margin-bottom:8px">`);
  if (affiliations.length) {
    affiliations.forEach(a => {
      html.push(`<div style="padding:6px;border-radius:8px;background:linear-gradient(180deg,#fff,#f6f9ff);margin-bottom:6px"><strong>${escapeHtml(a.dept || a)}</strong><div style="font-family:${'ui-monospace,monospace'};color:var(--muted)">${escapeHtml(a.role || '')}</div></div>`);
    });
  } else {
    html.push(`<div style="color:var(--muted)">No affiliations</div>`);
  }
  html.push(`</div>`);
  html.push(`<div><textarea id="noteField" class="note-area" placeholder="Operator notes...">${escapeHtml(localStorage.getItem('note_'+user.id) || '')}</textarea></div>`);
  html.push(`</div>`);
  html.push(`</div>`);
  UI.profileBody.innerHTML = html.join('');
  UI.profileWindow.classList.remove('hidden');
  UI.profileWindow.classList.add('window');
  const noteField = document.getElementById('noteField');
  if (noteField) noteField.addEventListener('input', () => localStorage.setItem('note_'+user.id, noteField.value));
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function performSearch() {
  const q = (UI.search && UI.search.value || '').trim();
  if (!q) return;
  UI.viewer.innerHTML = '<div style="color:var(--muted);font-weight:700">RETRIEVING DOSSIER...</div>';
  let id = q;
  if (!/^\d+$/.test(q) && q.startsWith('@')) id = q.slice(1);
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id })
    });
    const data = await res.json();
    if (!data.success) {
      UI.viewer.innerHTML = `<div style="color:#ef4444">${escapeHtml(data.message || 'NOT FOUND')}</div>`;
      showObunto('Data not found','werror');
      return;
    }
    const user = data.userData;
    historyList = historyList.filter(h => String(h.id) !== String(user.id));
    historyList.unshift({ id: user.id, name: user.username });
    if (historyList.length > 8) historyList.length = 8;
    localStorage.setItem('tsc_history', JSON.stringify(historyList));
    renderHistory();
    renderGroups(user.affiliations || []);
    UI.viewer.innerHTML = `<div style="font-weight:900">${escapeHtml(user.username)}</div><div style="color:var(--muted);font-family:ui-monospace,monospace">ID: ${escapeHtml(user.id)} • ${escapeHtml(user.rank || '')}</div><div style="margin-top:12px"><button id="openProfile" class="primary">OPEN DOSSIER</button></div>`;
    const openProfile = document.getElementById('openProfile');
    if (openProfile) openProfile.addEventListener('click', () => renderDossier(user));
    if (user.isObunto) showObunto('Obunto activated','smug');
  } catch (e) {
    UI.viewer.innerHTML = `<div style="color:#ef4444">NETWORK ERROR</div>`;
    showObunto('Connection error','werror');
  }
}

UI.btnLogin && UI.btnLogin.addEventListener('click', async () => {
  const id = (UI.inpId && UI.inpId.value || '').trim();
  if (!id) return;
  UI.loginStatus.textContent = 'AUTHENTICATING';
  const r = await apiLogin(id);
  if (r.success) {
    currentUser = r.userData;
    show('desktop');
    renderGroups(currentUser.affiliations || []);
    if (currentUser.isObunto) showObunto('Welcome, operator','smug');
  } else {
    UI.loginStatus.textContent = r.message || 'DENIED';
    showObunto('Access denied','werror');
  }
});

UI.btnGuest && UI.btnGuest.addEventListener('click', () => {
  show('desktop');
  UI.viewer.innerHTML = '<div class="empty">GUEST SESSION</div>';
});

UI.btnSearch && UI.btnSearch.addEventListener('click', performSearch);
UI.search && UI.search.addEventListener('keydown', e => { if (e.key === 'Enter') performSearch(); });
UI.btnRefresh && UI.btnRefresh.addEventListener('click', () => {
  const last = localStorage.getItem('tsc_paper_user_v3');
  if (last) { UI.search.value = last; performSearch(); }
});
UI.profileClose && UI.profileClose.addEventListener('click', () => {
  if (UI.profileWindow) UI.profileWindow.classList.add('hidden');
});

UI.btnUnfreeze && UI.btnUnfreeze.addEventListener('click', () => showObunto('System reset requested','werror'));

socket.on('display_mascot_message', data => {
  const msg = data && data.message ? data.message : '';
  const mood = data && data.mood ? data.mood.toLowerCase() : 'normal';
  showObunto(msg, mood);
});

document.addEventListener('DOMContentLoaded', () => {
  bootSequence();
  renderHistory();
  const stored = localStorage.getItem('tsc_history');
  if (stored) historyList = JSON.parse(stored);
  updateClock();
});
