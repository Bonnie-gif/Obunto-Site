const socket = io();

const SCREENS = {
  boot3: document.getElementById("boot-3"),
  boot2: document.getElementById("boot-2"),
  login: document.getElementById("login-screen"),
  desktop: document.getElementById("desktop-screen")
};

const UI = {
  search: document.getElementById("search"),
  btnSearch: document.getElementById("btnSearch"),
  btnRefresh: document.getElementById("btnRefresh"),
  sessionInfo: document.getElementById("sessionInfo"),
  gfilter: document.getElementById("gfilter"),
  glist: document.getElementById("glist"),
  historyList: document.getElementById("historyList"),
  dateDisplay: document.getElementById("dateDisplay"),
  btnUnfreeze: document.getElementById("btnUnfreeze"),
  paperContent: document.getElementById("paperContent"),
  btnLogin: document.getElementById("btnLogin"),
  inpId: document.getElementById("inpId"),
  loginStatus: document.getElementById("loginStatus"),
  profileWindow: document.getElementById("profile-window"),
  closeProfile: document.getElementById("closeProfile"),
  adminPanel: document.getElementById("admin-panel"),
  closeAdmin: document.getElementById("closeAdmin"),
  btnSettings: document.getElementById("btnSettings"),
  btnBroadcast: document.getElementById("btnBroadcast"),
  moodContainer: document.getElementById("mood-container"),
  adminMsg: document.getElementById("adminMsg"),
  charCount: document.getElementById("charCount"),
  clock: document.getElementById("clock")
};

let currentUser = null;
let searchHistory = JSON.parse(localStorage.getItem("tsc_history") || "[]");
let allGroups = [];
let currentMood = 'normal';

const MOODS = [
  'normal', 'happy', 'sad', 'annoyed', 'bug', 'dizzy',
  'hollow', 'panic', 'sleeping', 'Smug', 'stare', 'suspicious', 'werror'
];

const TSC_GROUPS = {
  11577231: "THUNDER SCIENTIFIC CORPORATION",
  11608337: "SECURITY DEPARTMENT",
  11649027: "ADMINISTRATION",
  12045972: "ETHICS COMMITTEE",
  12026513: "MEDICAL DEPARTMENT",
  12026669: "SCIENTIFIC DEPARTMENT",
  12045419: "ENGINEERING",
  12022092: "LOGISTICS",
  14159717: "INTELLIGENCE"
};

function showScreen(name) {
  Object.values(SCREENS).forEach(el => {
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("active");
  });
  
  const el = SCREENS[name];
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("active");
}

function updateClock() {
  if (!UI.clock) return;
  const now = new Date();
  UI.clock.textContent = now.toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

function updateDate() {
  if (!UI.dateDisplay) return;
  const now = new Date();
  const year = now.getFullYear() + 16;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  UI.dateDisplay.textContent = `DATE: ${year}-${month}-${day}`;
}

setInterval(updateClock, 1000);

function speakObunto(text, mood = 'normal') {
  const bubble = document.getElementById("obunto-bubble");
  const img = document.getElementById("obunto-img");
  const txt = document.getElementById("obunto-text");
  
  if (!bubble || !img || !txt) return;
  
  img.src = `/obunto/${mood}.png`;
  txt.textContent = text;
  bubble.classList.remove("hidden");
  
  setTimeout(() => {
    bubble.classList.add("hidden");
  }, 6000);
}

socket.on('display_mascot_message', (data) => {
  speakObunto(data.message, data.mood);
});

async function resolveUserId(query) {
  if (!query) return null;
  const clean = String(query).trim();
  if (clean === "") return null;
  
  if (/^\d+$/.test(clean)) return clean;
  
  const username = clean.startsWith('@') ? clean.slice(1) : clean;
  
  try {
    const payload = { 
      usernames: [username], 
      excludeBannedUsers: true 
    };
    
    const r1 = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (r1.ok) {
      const data = await r1.json();
      if (data.data && data.data.length > 0) {
        return String(data.data[0].id);
      }
    }
    
    const r2 = await fetch(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`
    );
    
    if (r2.ok) {
      const data = await r2.json();
      if (data.data && data.data.length > 0) {
        return String(data.data[0].id);
      }
    }
  } catch (e) {}
  
  return null;
}

async function getHeadshot(userId) {
  try {
    const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data[0] && data.data[0].imageUrl) {
        return data.data[0].imageUrl;
      }
    }
  } catch (e) {}
  return null;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, function(c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[c];
  });
}

async function createDossier(profile, groups, avatarUrl) {
  const id = profile?.id || "UNKNOWN";
  const name = profile?.name || "UNKNOWN";
  const display = profile?.displayName || "";
  const created = profile?.created || "";
  const savedNote = localStorage.getItem("note_" + id) || "";
  
  const tscGroups = groups.filter(g => TSC_GROUPS[g.group?.id]);
  const otherGroups = groups.filter(g => !TSC_GROUPS[g.group?.id]).slice(0, 6);
  
  const html = [];
  
  html.push('<div class="dossier">');
  html.push('<div class="dossier-header">');
  html.push('<div>');
  html.push('<div class="dossier-title">PERSONNEL DOSSIER</div>');
  html.push('<div class="dossier-ref">THUNDER SCIENTIFIC CORPORATION</div>');
  html.push('</div>');
  html.push('<div class="dossier-ref">REF: TSC-' + String(id).padStart(8, '0').slice(-6) + '</div>');
  html.push('</div>');
  
  html.push('<div class="dossier-body">');
  
  html.push('<div class="dossier-photo">');
  html.push('<img src="' + (avatarUrl || '/assets/icon-large-owner_info-28x14.png') + '" ');
  html.push('onerror="this.src=\'/assets/icon-large-owner_info-28x14.png\'" alt="Avatar">');
  html.push('<div class="dossier-name">' + escapeHtml(name) + '</div>');
  html.push('<div class="dossier-display">AKA: ' + escapeHtml(display) + '</div>');
  html.push('</div>');
  
  html.push('<div class="dossier-content">');
  
  html.push('<div class="dossier-field">');
  html.push('<div class="dossier-label">REGISTRY IDENTIFICATION</div>');
  html.push('<div class="dossier-value">' + escapeHtml(id) + '</div>');
  html.push('</div>');
  
  html.push('<div class="dossier-field">');
  html.push('<div class="dossier-label">SECURITY CLEARANCE</div>');
  html.push('<div class="dossier-value">LEVEL C1 - CONFIDENTIAL</div>');
  html.push('</div>');
  
  if (created) {
    const date = new Date(created);
    html.push('<div class="dossier-field">');
    html.push('<div class="dossier-label">RECORD ESTABLISHED</div>');
    html.push('<div class="dossier-value">' + date.toLocaleDateString() + '</div>');
    html.push('</div>');
  }
  
  if (tscGroups.length > 0) {
    html.push('<div class="affiliations-box">');
    html.push('<div class="dossier-label">TSC DEPARTMENT AFFILIATIONS</div>');
    tscGroups.forEach(aff => {
      const deptName = TSC_GROUPS[aff.group.id] || aff.group.name;
      html.push('<div class="aff-item">');
      html.push('<div class="aff-dept">' + escapeHtml(deptName) + '</div>');
      html.push('<div class="aff-role">ROLE: ' + escapeHtml(aff.role.name) + '</div>');
      html.push('</div>');
    });
    html.push('</div>');
  }
  
  if (otherGroups.length > 0) {
    html.push('<div class="affiliations-box" style="margin-top:12px;">');
    html.push('<div class="dossier-label">ADDITIONAL GROUP ASSOCIATIONS</div>');
    html.push('<small style="color:var(--ink-dim);font-size:10px;">');
    html.push(escapeHtml(otherGroups.map(g => g.group.name).join(", ")));
    html.push('</small>');
    html.push('</div>');
  }
  
  html.push('<div style="margin-top:16px;">');
  html.push('<div class="dossier-label">OPERATOR ANNOTATIONS</div>');
  html.push('<textarea class="note-input" id="operatorNote" ');
  html.push('placeholder="Enter operational notes and observations..." ');
  html.push('onchange="window.saveNote(\'' + id + '\', this.value)">');
  html.push(escapeHtml(savedNote));
  html.push('</textarea>');
  html.push('</div>');
  
  html.push('</div>');
  html.push('</div>');
  html.push('</div>');
  
  return html.join("");
}

window.saveNote = async function(userId, note) {
  localStorage.setItem("note_" + userId, note);
  try {
    await fetch('/api/save-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, note })
    });
  } catch (e) {}
};

async function searchAction() {
  try {
    if (!UI.search) return;
    const q = UI.search.value.trim();
    if (!q) return;
    
    if (UI.paperContent) {
      UI.paperContent.innerHTML = '<div style="text-align:center;padding:60px;color:var(--ink-dim);">'+
        '<div style="font-size:16px;margin-bottom:12px;">⌛ RETRIEVING DOSSIER...</div>'+
        '<div style="font-size:11px;">Querying TSC database</div>'+
        '</div>';
    }
    
    const uid = await resolveUserId(q);
    if (!uid) {
      if (UI.paperContent) {
        UI.paperContent.innerHTML = '<div style="text-align:center;padding:60px;color:#b91c1c;">'+
          '<strong style="font-size:16px;">⚠ USER NOT FOUND</strong><br><br>'+
          '<small>Invalid ID, username, or name<br>Please verify and try again</small>'+
          '</div>';
      }
      speakObunto("Data retrieval failed. User not found in database.", "bug");
      return;
    }
    
    const profileRes = await fetch("https://users.roblox.com/v1/users/" + uid);
    if (!profileRes.ok) throw new Error("Profile fetch failed");
    const profile = await profileRes.json();
    
    const groupsRes = await fetch("https://groups.roblox.com/v2/users/" + uid + "/groups/roles");
    const groupsData = await groupsRes.json();
    const groups = (groupsData && Array.isArray(groupsData.data)) ? groupsData.data : [];
    
    const avatar = await getHeadshot(uid);
    
    searchHistory = searchHistory.filter(h => String(h.id) !== String(uid));
    searchHistory.unshift({ 
      id: uid, 
      name: profile?.name || uid,
      timestamp: Date.now()
    });
    if (searchHistory.length > 10) searchHistory.length = 10;
    localStorage.setItem("tsc_history", JSON.stringify(searchHistory));
    renderHistory();
    
    const dossier = await createDossier(profile, groups, avatar);
    if (UI.paperContent) {
      UI.paperContent.innerHTML = dossier;
    }
    
    localStorage.setItem("tsc_paper_archive", dossier);
    localStorage.setItem("tsc_paper_user", uid);
    
    if (Number(profile?.id) === 1947) {
      speakObunto("Obunto mascot control protocol engaged. All systems nominal.", "Smug");
    } else {
      speakObunto("Dossier retrieved successfully. Personnel record complete.", "happy");
    }
    
  } catch (e) {
    if (UI.paperContent) {
      UI.paperContent.innerHTML = '<div style="text-align:center;padding:60px;color:#b91c1c;">'+
        '<strong style="font-size:16px;">⚠ ERROR RETRIEVING DATA</strong><br><br>'+
        '<small>' + escapeHtml(e.message) + '</small>'+
        '</div>';
    }
    speakObunto("System error occurred during data retrieval.", "werror");
  }
}

function renderHistory() {
  if (!UI.historyList) return;
  
  if (searchHistory.length === 0) {
    UI.historyList.innerHTML = '<div class="empty-history">No recent searches</div>';
    return;
  }
  
  UI.historyList.innerHTML = "";
  
  searchHistory.forEach(entry => {
    const row = document.createElement("div");
    row.className = "history-item";
    row.textContent = `> ${entry.name} (${entry.id})`;
    row.onclick = () => {
      if (UI.search) UI.search.value = entry.id;
      searchAction();
    };
    UI.historyList.appendChild(row);
  });
}

function renderGroups(groups) {
  if (!UI.glist) return;
  
  if (groups.length === 0) {
    UI.glist.innerHTML = '<div class="empty-groups">Login to view groups</div>';
    return;
  }
  
  UI.glist.innerHTML = "";
  
  const filter = UI.gfilter ? UI.gfilter.value.toLowerCase() : "";
  const filtered = groups.filter(g => {
    const name = g.name.toLowerCase();
    return name.includes(filter);
  });
  
  if (filtered.length === 0) {
    UI.glist.innerHTML = '<div class="empty-groups">No groups match filter</div>';
    return;
  }
  
  const tscGroups = filtered.filter(g => TSC_GROUPS[g.id]);
  const otherGroups = filtered.filter(g => !TSC_GROUPS[g.id]);
  
  if (tscGroups.length > 0) {
    const header = document.createElement("div");
    header.className = "group-section-header";
    header.textContent = "TSC DEPARTMENTS";
    UI.glist.appendChild(header);
    
    tscGroups.forEach(g => {
      const row = document.createElement("div");
      row.className = "group-row";
      row.innerHTML = `
        <div>
          <div class="group-name">${escapeHtml(TSC_GROUPS[g.id] || g.name)}</div>
          <div class="group-role">${escapeHtml(g.role)}</div>
        </div>
      `;
      UI.glist.appendChild(row);
    });
  }
  
  if (otherGroups.length > 0) {
    const header = document.createElement("div");
    header.className = "group-section-header";
    header.textContent = "OTHER GROUPS";
    UI.glist.appendChild(header);
    
    otherGroups.slice(0, 15).forEach(g => {
      const row = document.createElement("div");
      row.className = "group-row";
      row.innerHTML = `
        <div>
          <div class="group-name">${escapeHtml(g.name)}</div>
          <div class="group-role">${escapeHtml(g.role)}</div>
        </div>
      `;
      UI.glist.appendChild(row);
    });
  }
}

function bootSequence() {
  showScreen("boot3");
  
  let gdots = 0;
  const dotsEl = document.getElementById("glitch-dots");
  const glitchInterval = setInterval(() => {
    gdots = (gdots + 1) % 4;
    if (dotsEl) dotsEl.textContent = '.'.repeat(gdots);
  }, 500);
  
  setTimeout(() => {
    clearInterval(glitchInterval);
    showScreen("boot2");
    
    const dbEl = document.getElementById("boot-db");
    if (dbEl) {
      setTimeout(() => {
        dbEl.textContent = "OK";
      }, 800);
    }
    
    let progress = 0;
    const progInterval = setInterval(() => {
      progress += 10;
      const progEl = document.getElementById("boot-progress");
      const statusEl = document.getElementById("boot-status");
      
      if (progEl) {
        const filled = '■'.repeat(Math.floor(progress / 10));
        const empty = '□'.repeat(10 - Math.floor(progress / 10));
        progEl.textContent = `${filled}${empty} ${progress}%`;
      }
      
      if (progress >= 100) {
        clearInterval(progInterval);
        if (statusEl) statusEl.textContent = "COMPLETE";
        
        setTimeout(() => {
          showScreen("login");
        }, 1000);
      }
    }, 200);
    
  }, 3000);
}

async function login() {
  const id = UI.inpId?.value.trim();
  if (!id) return;
  
  const statusEl = UI.loginStatus;
  if (statusEl) statusEl.textContent = "AUTHENTICATING...";
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id })
    });
    
    const data = await res.json();
    
    if (data.success) {
      currentUser = data.userData;
      
      showScreen("desktop");
      
      if (UI.sessionInfo) {
        UI.sessionInfo.innerHTML = `
          <div class="session-line">STATUS: <span class="session-value">AUTHENTICATED</span></div>
          <div class="session-line">ID: <span class="session-value">${escapeHtml(currentUser.id)}</span></div>
          <div class="session-line">USER: <span class="session-value">${escapeHtml(currentUser.username)}</span></div>
        `;
      }
      
      if (currentUser.allGroups) {
        allGroups = currentUser.allGroups;
        renderGroups(allGroups);
      }
      
      if (currentUser.isAdmin && UI.btnSettings) {
        UI.btnSettings.onclick = () => {
          if (UI.adminPanel) {
            UI.adminPanel.classList.toggle("hidden");
          }
        };
        buildAdminPanel();
      }
      
      updateClock();
      updateDate();
      renderHistory();
      
      if (currentUser.isObunto) {
        speakObunto("Obunto Core online. All TSC systems operational.", "normal");
      } else {
        speakObunto(`Welcome, ${currentUser.username}. Newton OS personnel gateway ready.`, "happy");
      }
      
    } else {
      if (statusEl) statusEl.textContent = "❌ " + data.message;
      speakObunto("Authentication failed. Access denied.", "suspicious");
    }
    
  } catch (e) {
    if (statusEl) statusEl.textContent = "❌ ERROR: " + e.message;
    speakObunto("System error during authentication.", "werror");
  }
}

function buildAdminPanel() {
  if (!UI.moodContainer) return;
  
  UI.moodContainer.innerHTML = "";
  
  MOODS.forEach(mood => {
    const div = document.createElement('div');
    div.className = 'mood-icon';
    div.innerHTML = `
      <img src="/obunto/${mood}.png" alt="${mood}">
      <span>${mood.toUpperCase()}</span>
    `;
    div.onclick = () => {
      document.querySelectorAll('.mood-icon').forEach(el => el.classList.remove('active'));
      div.classList.add('active');
      currentMood = mood;
    };
    
    if (mood === 'normal') {
      div.classList.add('active');
    }
    
    UI.moodContainer.appendChild(div);
  });
}

function broadcastMascot() {
  const msg = UI.adminMsg?.value.trim();
  if (!msg) {
    speakObunto("Cannot broadcast empty message.", "annoyed");
    return;
  }
  
  socket.emit('mascot_broadcast', {
    message: msg,
    mood: currentMood
  });
  
  if (UI.adminMsg) UI.adminMsg.value = "";
  if (UI.charCount) UI.charCount.textContent = "0";
  speakObunto("Broadcast transmitted to all connected users.", "happy");
}

function makeDraggable(win) {
  const header = win.querySelector('.win-header');
  if (!header) return;
  
  let isDragging = false;
  let currentX, currentY, initialX, initialY;
  
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.close-btn')) return;
    
    isDragging = true;
    initialX = e.clientX - win.offsetLeft;
    initialY = e.clientY - win.offsetTop;
    
    function drag(e) {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      win.style.left = `${currentX}px`;
      win.style.top = `${currentY}px`;
      win.style.transform = 'none';
    }
    
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
  });
}

function initUI() {
  if (UI.btnSearch) UI.btnSearch.addEventListener("click", searchAction);
  if (UI.search) {
    UI.search.addEventListener("keydown", e => {
      if (e.key === "Enter") searchAction();
    });
  }
  
  if (UI.btnRefresh) {
    UI.btnRefresh.addEventListener("click", () => {
      const lastUser = localStorage.getItem("tsc_paper_user");
      if (lastUser && UI.search) {
        UI.search.value = lastUser;
        searchAction();
      } else {
        speakObunto("No previous search to refresh.", "stare");
      }
    });
  }
  
  if (UI.btnUnfreeze) {
    UI.btnUnfreeze.addEventListener("click", () => {
      if (UI.paperContent) {
        UI.paperContent.innerHTML = `
          <div class="welcome-screen">
            <img src="/assets/icon-large-notes_highlighted-19x25.png" class="welcome-icon">
            <div class="welcome-text">SYSTEM RESET</div>
            <div class="welcome-sub">Cache cleared - Ready for new query</div>
          </div>
        `;
      }
      speakObunto("System reset complete. All caches cleared.", "normal");
    });
  }
  
  if (UI.btnLogin) UI.btnLogin.addEventListener("click", login);
  if (UI.inpId) {
    UI.inpId.addEventListener("keydown", e => {
      if (e.key === "Enter") login();
    });
  }
  
  if (UI.gfilter) {
    UI.gfilter.addEventListener("input", () => {
      renderGroups(allGroups);
    });
  }
  
  if (UI.closeProfile) {
    UI.closeProfile.addEventListener("click", () => {
      if (UI.profileWindow) UI.profileWindow.classList.add("hidden");
    });
  }
  
  if (UI.closeAdmin) {
    UI.closeAdmin.addEventListener("click", () => {
      if (UI.adminPanel) UI.adminPanel.classList.add("hidden");
    });
  }
  
  if (UI.btnBroadcast) {
    UI.btnBroadcast.addEventListener("click", broadcastMascot);
  }
  
  if (UI.adminMsg && UI.charCount) {
    UI.adminMsg.addEventListener("input", () => {
      UI.charCount.textContent = String(UI.adminMsg.value.length);
    });
  }
  
  if (UI.profileWindow) makeDraggable(UI.profileWindow);
  if (UI.adminPanel) makeDraggable(UI.adminPanel);
  
  renderHistory();
  updateDate();
}

document.addEventListener("DOMContentLoaded", () => {
  bootSequence();
  initUI();
});