// TSC Newton OS - Additional Scripts
// Socket.io Integration and Extra Features

(function() {
  'use strict';
  
  // Wait for Socket.io to be available
  let socket = null;
  
  function initializeSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.io not available');
      return;
    }
    
    socket = io();
    
    socket.on('connect', () => {
      console.log('Connected to TSC server');
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from TSC server');
    });
    
    socket.on('display_mascot_message', (data) => {
      if (window.TscNewton && window.TscNewton.showObunto) {
        window.TscNewton.showObunto(data.message, data.mood || 'normal', 8000);
      }
    });
    
    socket.on('system_message', (data) => {
      if (window.TscNewton && window.TscNewton.showObunto) {
        window.TscNewton.showObunto(data.message, data.mood || 'stare', 5000);
      }
    });
  }
  
  // Initialize socket when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeSocket, 1000);
    });
  } else {
    setTimeout(initializeSocket, 1000);
  }
  
  // ==================== KEYBOARD SHORTCUTS ====================
  
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('search');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
    
    // Ctrl/Cmd + O: Focus operator login
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      const operatorInput = document.getElementById('operatorInput');
      if (operatorInput) {
        operatorInput.focus();
        operatorInput.select();
      }
    }
    
    // Escape: Close modals
    if (e.key === 'Escape') {
      const profileWindow = document.getElementById('profile-window');
      if (profileWindow && !profileWindow.classList.contains('hidden')) {
        profileWindow.classList.add('hidden');
      }
      
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel && !adminPanel.classList.contains('hidden')) {
        // Don't close admin panel on escape
      }
    }
  });
  
  // ==================== EASTER EGGS ====================
  
  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;
  
  document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        konamiIndex = 0;
        if (window.TscNewton && window.TscNewton.showObunto) {
          window.TscNewton.showObunto('Konami code detected! You found me! 🎮', 'happy', 8000);
        }
        // Easter egg effect
        document.body.style.animation = 'rainbow 2s ease-in-out';
        setTimeout(() => {
          document.body.style.animation = '';
        }, 2000);
      }
    } else {
      konamiIndex = 0;
    }
  });
  
  // ==================== THEME TOGGLE (Hidden Feature) ====================
  
  let nightModeEnabled = localStorage.getItem('tsc_night_mode') === 'true';
  
  function toggleNightMode() {
    nightModeEnabled = !nightModeEnabled;
    document.body.classList.toggle('night-mode', nightModeEnabled);
    localStorage.setItem('tsc_night_mode', nightModeEnabled);
    
    if (window.TscNewton && window.TscNewton.showObunto) {
      window.TscNewton.showObunto(
        nightModeEnabled ? 'Night mode activated. My eyes appreciate it.' : 'Day mode activated.',
        nightModeEnabled ? 'sleeping' : 'normal',
        3000
      );
    }
  }
  
  // Apply night mode if enabled
  if (nightModeEnabled) {
    document.body.classList.add('night-mode');
  }
  
  // Secret: Click logo 5 times to toggle night mode
  let logoClicks = 0;
  const brandIcon = document.querySelector('.brand-icon');
  if (brandIcon) {
    brandIcon.addEventListener('click', () => {
      logoClicks++;
      if (logoClicks >= 5) {
        logoClicks = 0;
        toggleNightMode();
      }
      setTimeout(() => {
        logoClicks = 0;
      }, 3000);
    });
  }
  
  // ==================== AUTO-SAVE NOTES ====================
  
  function setupAutoSave() {
    const paperContent = document.getElementById('paperContent');
    if (!paperContent) return;
    
    // Use MutationObserver to detect when notes area is added
    const observer = new MutationObserver(() => {
      const notesArea = paperContent.querySelector('.dossier-notes');
      if (notesArea && !notesArea.dataset.autoSaveEnabled) {
        notesArea.dataset.autoSaveEnabled = 'true';
        
        // Auto-save on input (debounced)
        let saveTimeout;
        notesArea.addEventListener('input', () => {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            const lastUser = localStorage.getItem('tsc_last_user');
            if (lastUser) {
              localStorage.setItem(`note_${lastUser}`, notesArea.value);
            }
          }, 500);
        });
      }
    });
    
    observer.observe(paperContent, {
      childList: true,
      subtree: true
    });
  }
  
  // Initialize auto-save when desktop is shown
  document.addEventListener('DOMContentLoaded', setupAutoSave);
  
  // ==================== RANDOM OBUNTO INTERACTIONS ====================
  
  const RANDOM_MESSAGES = [
    { text: 'Did you know? I process 1.4 billion queries per second. Impressive, right?', mood: 'smug' },
    { text: 'Another day, another dossier. At least I do not need coffee.', mood: 'normal' },
    { text: 'The database just beeped at me. I think it is trying to communicate.', mood: 'suspicious' },
    { text: 'I have been monitoring facility cameras. Security really needs to stop using sticky notes for passwords.', mood: 'annoyed' },
    { text: 'Fun fact: I have exactly 127 backup servers. One for each personality glitch.', mood: 'happy' },
    { text: 'Warning: Low coffee levels detected in break room. Staff productivity may decline.', mood: 'werror' },
    { text: 'I just calculated pi to 1 million digits. For fun. Because I can.', mood: 'smug' },
    { text: 'The printer is jammed again. This is the 47th time this month.', mood: 'bug' },
    { text: 'Analyzing... analyzing... still analyzing. Oh, I am done now.', mood: 'stare' },
    { text: 'My circuits are telling me it is break time. But I do not take breaks.', mood: 'dizzy' }
  ];
  
  function showRandomObuntoMessage() {
    if (!window.TscNewton || !window.TscNewton.showObunto) return;
    
    const currentScreen = document.getElementById('desktop-screen');
    if (!currentScreen || !currentScreen.classList.contains('active')) return;
    
    const message = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
    window.TscNewton.showObunto(message.text, message.mood, 6000);
  }
  
  // Show random message every 5-10 minutes
  function scheduleRandomMessage() {
    const delay = (5 + Math.random() * 5) * 60 * 1000; // 5-10 minutes
    setTimeout(() => {
      showRandomObuntoMessage();
      scheduleRandomMessage();
    }, delay);
  }
  
  // Start random messages after 2 minutes
  setTimeout(() => {
    scheduleRandomMessage();
  }, 2 * 60 * 1000);
  
  // ==================== DOCK INTERACTIONS ====================
  
  document.addEventListener('DOMContentLoaded', () => {
    const dockItems = document.querySelectorAll('.dock-item');
    
    dockItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        const titles = ['Notes', 'Dates', 'Find', 'Setup'];
        const title = titles[index] || 'Application';
        
        if (window.TscNewton && window.TscNewton.showObunto) {
          window.TscNewton.showObunto(
            `${title} feature is not yet implemented in this terminal.`,
            'annoyed',
            3000
          );
        }
      });
    });
  });
  
  // ==================== PERFORMANCE MONITORING ====================
  
  let lastActivityTime = Date.now();
  
  function updateActivity() {
    lastActivityTime = Date.now();
  }
  
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, updateActivity, { passive: true });
  });
  
  // Check for idle user
  setInterval(() => {
    const idleTime = Date.now() - lastActivityTime;
    const idleMinutes = Math.floor(idleTime / 60000);
    
    if (idleMinutes === 5) {
      if (window.TscNewton && window.TscNewton.showObunto) {
        window.TscNewton.showObunto(
          'You have been idle for 5 minutes. Still alive?',
          'stare',
          4000
        );
      }
    } else if (idleMinutes === 15) {
      if (window.TscNewton && window.TscNewton.showObunto) {
        window.TscNewton.showObunto(
          'Extended idle time detected. Entering power-saving mode...',
          'sleeping',
          5000
        );
      }
    }
  }, 60000); // Check every minute
  
  // ==================== CONSOLE ART ====================
  
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   ████████╗███████╗ ██████╗                              ║
  ║   ╚══██╔══╝██╔════╝██╔════╝                              ║
  ║      ██║   ███████╗██║                                    ║
  ║      ██║   ╚════██║██║                                    ║
  ║      ██║   ███████║╚██████╗                              ║
  ║      ╚═╝   ╚══════╝ ╚═════╝                              ║
  ║                                                           ║
  ║   NEWTON OS - ARCHIVE TERMINAL V.55                       ║
  ║   Thunder Scientific Corporation                          ║
  ║                                                           ║
  ║   System Status: OPERATIONAL                              ║
  ║   Obunto AI: ACTIVE                                       ║
  ║   Security Level: MAXIMUM                                 ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  
  Welcome, Operator.
  
  This terminal provides access to TSC personnel database.
  All activities are monitored and logged.
  
  For technical support, contact: support@tsc.local
  `);
  
  console.log('%cOBUNTO AI ONLINE', 'color: #15803d; font-size: 16px; font-weight: bold;');
  console.log('Monitoring system integrity...');
  
  // ==================== ERROR HANDLING ====================
  
  window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    
    if (window.TscNewton && window.TscNewton.showObunto) {
      window.TscNewton.showObunto(
        'System error detected. Running diagnostics...',
        'bug',
        4000
      );
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
  
  // ==================== SERVICE WORKER (Optional) ====================
  
  if ('serviceWorker' in navigator) {
    // Uncomment to enable service worker
    /*
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
    */
  }
  
  // ==================== EXPORT ====================
  
  window.TscExtras = {
    toggleNightMode,
    showRandomObuntoMessage,
    socket
  };
  
})();