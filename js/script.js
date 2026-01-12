<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARCS - Newton OS Ver.3.2.2</title>
    <link rel="icon" href="assets/icon.png" type="image/png">
    
    <!-- CSS Files -->
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/menu.css">
    <link rel="stylesheet" href="css/notification.css">
    <link rel="stylesheet" href="css/broadcast.css">
    <link rel="stylesheet" href="css/editing.css">
    <link rel="stylesheet" href="css/alarms.css">
    <link rel="stylesheet" href="css/tickets.css">
    <link rel="stylesheet" href="css/radio.css">
    <link rel="stylesheet" href="css/credentials.css">
    <link rel="stylesheet" href="css/users.css">
    <link rel="stylesheet" href="css/analytics.css">
    <link rel="stylesheet" href="css/chat.css">
</head>
<body>
    <!-- ==================== AUDIO ELEMENTS ==================== -->
    <audio id="sfx-poweron" src="assets/audio/poweron.wav" preload="auto"></audio>
    <audio id="sfx-loading" src="assets/audio/loading.wav" preload="auto"></audio>
    <audio id="sfx-newmessage" src="assets/audio/newmessage.wav" preload="auto"></audio>
    <audio id="sfx-error" src="assets/audio/error.wav" preload="auto"></audio>
    <audio id="sfx-denied" src="assets/audio/denied.wav" preload="auto"></audio>
    <audio id="sfx-sent" src="assets/audio/sent.wav" preload="auto"></audio>
    <audio id="sfx-blue" src="assets/audio/blue.wav" preload="auto"></audio>

    <!-- ==================== GLITCH BLOCKS (Epsilon Theme) ==================== -->
    <div class="glitch-block"></div>
    <div class="glitch-block"></div>
    <div class="glitch-block"></div>
    <div class="glitch-block"></div>
    <div class="glitch-block"></div>

    <!-- ==================== LOADING SCREEN ==================== -->
    <div id="loading-screen" class="screen active">
        <div class="loading-left">
            <div class="upeo-section">
                <svg class="upeo-logo" viewBox="0 0 200 200">
                    <path d="M60,140 L40,100 Q40,80 60,70 L80,80 L100,60 L120,70 L140,50 Q160,60 150,90 L130,120 Q120,140 100,140 L80,130 L60,140 Z" fill="currentColor"/>
                    <circle cx="130" cy="90" r="30" fill="none" stroke="currentColor" stroke-width="4"/>
                    <path d="M140,80 Q150,75 160,80" stroke="currentColor" stroke-width="3" fill="none"/>
                </svg>
                <div class="upeo-text">UPEO</div>
            </div>
            
            <div class="loading-info">
                RESTARTING OS VER.3.2.2<br>
                UPEO ID confirmed<br>
                DATA SWALLOW<br>
                is for registered use only.
            </div>
        </div>

        <div class="loading-right">
            <div class="login-panel hidden" id="login-panel">
                <div class="login-header">OPERATOR ACCESS</div>
                <div class="login-body">
                    <label class="login-label">OPERATOR ID:</label>
                    <input type="text" id="operator-id" class="login-input" placeholder="ENTER ID" maxlength="20" autocomplete="off">
                    
                    <label class="login-label">PASSWORD (ADMIN ONLY):</label>
                    <input type="password" id="operator-password" class="login-input" placeholder="••••" maxlength="20" autocomplete="off">
                    
                    <div class="login-status" id="login-status"></div>
                    
                    <button class="login-btn" onclick="handleLogin()">LOGIN</button>
                    <button class="login-btn secondary" onclick="handleNewOperator()">NEW OPERATOR</button>
                    
                    <div class="login-info-text">
                        NEW OPERATORS REQUIRE ADMIN APPROVAL<br>
                        YOUR ID WILL BE SAVED IN THE QUEUE
                    </div>
                </div>
            </div>
        </div>

        <div class="data-swallow-container">
            <div class="swallow-box">
                <div class="swallow-header">
                    <div class="swallow-brand">DATA SWALLOW</div>
                    <div class="swallow-disk">
                        <div class="disk-text">
                            DATA SWALLOW 40<br>
                            UPEO VER.3.2<br>
                            SYSTEM STARTUP
                        </div>
                        <div class="disk-icon">O+</div>
                    </div>
                </div>
                <div class="loading-bar">
                    <div class="bar-fill" id="loading-progress"></div>
                </div>
                <div class="swallow-footer">DATA SWALLOW 40 を起動中です。</div>
            </div>
        </div>
    </div>

    <!-- ==================== MAIN SCREEN ==================== -->
    <div id="main-screen" class="screen">
        <div class="top-decoration">
            <div class="browser-dots">
                <span></span><span></span><span></span>
            </div>
            <div class="url-bar">ARCS - Advanced Research & Containment System ++++++++++++++++++++++++</div>
            <div class="loading-indicator">
                <span class="loading-icon">◆</span>
                <span>System Online</span>
            </div>
        </div>

        <div class="main-window">
            <!-- ==================== MENU BAR ==================== -->
            <div class="menu-bar">
                <div class="menu-button" onclick="goToHome()">MENU</div>
                
                <div class="menu-tabs hidden" id="admin-tabs">
                    <div class="tab" data-target="adm-broadcast">BROADCAST</div>
                    <div class="tab" data-target="adm-editing">EDITING</div>
                    <div class="tab" data-target="adm-alarms">ALARMS</div>
                    <div class="tab" data-target="adm-tickets">TICKETS</div>
                    <div class="tab" data-target="adm-radio">RADIO</div>
                    <div class="tab" data-target="adm-credentials">CREDENTIALS</div>
                    <div class="tab" data-target="adm-users">USERS</div>
                    <div class="tab" data-target="adm-analytics">ANALYTICS</div>
                    <div class="tab" data-target="adm-chat">CHAT</div>
                </div>
                
                <div id="custom-menu-tabs"></div>
                
                <div class="menu-user-info">
                    <span class="menu-user-name">GUEST</span>
                    <button class="menu-logout-btn" onclick="logout()">LOGOUT</button>
                </div>
            </div>

            <!-- ==================== HOME VIEW ==================== -->
            <div id="view-home" class="tab-content active">
                <div class="banner-section">
                    <img src="assets/banner.png" class="banner-img" alt="ARCS Banner" onerror="this.style.display='none'">
                </div>
                <div class="home-welcome" id="home-welcome-section">
                    <div class="welcome-title" id="home-welcome-title">WELCOME TO ARCS</div>
                    <div class="welcome-text" id="home-welcome-text">WELCOME TO ARCS V3.2.2. SELECT A MODULE FROM THE MENU BAR TO BEGIN OPERATIONS. THIS SYSTEM IS OPERATED BY UPEO AND ALL ACTIVITIES ARE MONITORED.</div>
                </div>
            </div>

            <!-- ==================== BROADCAST VIEW ==================== -->
            <div id="adm-broadcast" class="tab-content">
                <div class="cell-header">GLOBAL BROADCAST SYSTEM</div>
                <div class="news-box">
                    <label>SELECT EMOTION:</label>
                    <div class="sprite-selector" id="sprite-selector">
                        <div class="sprite-option active" data-sprite="normal">
                            <span class="sprite-emoji">😐</span>
                            <span>Normal</span>
                        </div>
                        <div class="sprite-option" data-sprite="happy">
                            <span class="sprite-emoji">😊</span>
                            <span>Happy</span>
                        </div>
                        <div class="sprite-option" data-sprite="sad">
                            <span class="sprite-emoji">😢</span>
                            <span>Sad</span>
                        </div>
                        <div class="sprite-option" data-sprite="angry">
                            <span class="sprite-emoji">😠</span>
                            <span>Angry</span>
                        </div>
                        <div class="sprite-option" data-sprite="confused">
                            <span class="sprite-emoji">😕</span>
                            <span>Confused</span>
                        </div>
                        <div class="sprite-option" data-sprite="annoyed">
                            <span class="sprite-emoji">😤</span>
                            <span>Annoyed</span>
                        </div>
                        <div class="sprite-option" data-sprite="bug">
                            <span class="sprite-emoji">🐛</span>
                            <span>Bug</span>
                        </div>
                        <div class="sprite-option" data-sprite="dizzy">
                            <span class="sprite-emoji">😵</span>
                            <span>Dizzy</span>
                        </div>
                        <div class="sprite-option" data-sprite="hollow">
                            <span class="sprite-emoji">😶</span>
                            <span>Hollow</span>
                        </div>
                        <div class="sprite-option" data-sprite="panic">
                            <span class="sprite-emoji">😰</span>
                            <span>Panic</span>
                        </div>
                        <div class="sprite-option" data-sprite="sleeping">
                            <span class="sprite-emoji">😴</span>
                            <span>Sleeping</span>
                        </div>
                        <div class="sprite-option" data-sprite="smug">
                            <span class="sprite-emoji">😏</span>
                            <span>Smug</span>
                        </div>
                        <div class="sprite-option" data-sprite="stare">
                            <span class="sprite-emoji">👀</span>
                            <span>Stare</span>
                        </div>
                        <div class="sprite-option" data-sprite="suspicious">
                            <span class="sprite-emoji">🤨</span>
                            <span>Suspicious</span>
                        </div>
                        <div class="sprite-option" data-sprite="werror">
                            <span class="sprite-emoji">⚠️</span>
                            <span>W.Error</span>
                        </div>
                    </div>
                    <input type="hidden" id="sprite-select" value="normal">
                    
                    <label>MESSAGE:</label>
                    <textarea id="broadcast-text" placeholder="TYPE YOUR BROADCAST MESSAGE..."></textarea>
                    <button id="send-broadcast" onclick="sendBroadcast()">TRANSMIT BROADCAST</button>
                </div>
            </div>

            <!-- ==================== EDITING VIEW ==================== -->
            <div id="adm-editing" class="tab-content">
                <div class="editing-workspace">
                    <div class="editing-toolbar">
                        <div class="toolbar-title">CONTENT EDITOR</div>
                        <div class="toolbar-actions">
                            <button class="toolbar-btn" onclick="editWelcomeHome()">EDIT WELCOME</button>
                            <button class="toolbar-btn" onclick="addNewTab()">+ NEW TAB</button>
                            <button class="toolbar-btn primary" onclick="publishTabs()">PUBLISH ALL</button>
                        </div>
                    </div>
                    <div class="editing-canvas" id="editing-canvas">
                        <div class="canvas-hint">CREATE NEW TABS OR EDIT THE WELCOME SCREEN</div>
                    </div>
                </div>
            </div>

            <!-- ==================== ALARMS VIEW ==================== -->
            <div id="adm-alarms" class="tab-content">
                <div class="alarms-fullwidth">
                    <div class="cell-header">SYSTEM ALARM LEVELS</div>
                    <div id="alarms-container">
                        <div class="alarm-item green">
                            <div class="alarm-header">
                                <div class="alarm-type">Code Green</div>
                                <div class="alarm-badge">Normal</div>
                            </div>
                            <div class="alarm-details">All systems operational. Standard interface active. Normal operations permitted.</div>
                            <div class="alarm-actions">
                                <button onclick="setAlarmTheme('green')">ACTIVATE</button>
                            </div>
                        </div>
                        
                        <div class="alarm-item blue">
                            <div class="alarm-header">
                                <div class="alarm-type">Code Blue</div>
                                <div class="alarm-badge">Advisory</div>
                            </div>
                            <div class="alarm-details">Interface shifted to cool blue tones. Enhanced monitoring active.</div>
                            <div class="alarm-actions">
                                <button onclick="setAlarmTheme('blue')">ACTIVATE</button>
                            </div>
                        </div>
                        
                        <div class="alarm-item red">
                            <div class="alarm-header">
                                <div class="alarm-type">Code Red</div>
                                <div class="alarm-badge">Warning</div>
                            </div>
                            <div class="alarm-details">System running in warning mode. Heightened awareness required. Non-essential operations suspended.</div>
                            <div class="alarm-actions">
                                <button onclick="setAlarmTheme('red')">ACTIVATE</button>
                            </div>
                        </div>
                        
                        <div class="alarm-item gamma">
                            <div class="alarm-header">
                                <div class="alarm-type">Gamma Protocol</div>
                                <div class="alarm-badge">Restricted</div>
                            </div>
                            <div class="alarm-details">RESTRICTED ACCESS MODE. Radio and Credentials sections locked. Personnel verification required.</div>
                            <div class="alarm-actions">
                                <button onclick="setAlarmTheme('gamma')">ACTIVATE</button>
                            </div>
                        </div>
                        
                        <div class="alarm-item epsilon">
                            <div class="alarm-header">
                                <div class="alarm-type">Epsilon Corruption</div>
                                <div class="alarm-badge">Critical</div>
                            </div>
                            <div class="alarm-details">CRITICAL: System corruption detected. Visual glitches, dead pixels, and interface instability present. Use with caution.</div>
                            <div class="alarm-actions">
                                <button onclick="setAlarmTheme('epsilon')">ACTIVATE</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ==================== TICKETS VIEW ==================== -->
            <div id="adm-tickets" class="tab-content">
                <div class="tickets-fullwidth">
                    <div class="cell-header">PENDING OPERATOR APPROVALS</div>
                    <div id="pending-list"></div>
                </div>
            </div>

            <!-- ==================== RADIO VIEW ==================== -->
            <div id="adm-radio" class="tab-content">
                <div class="radio-fullwidth">
                    <div class="cell-header">RADIO COMMUNICATIONS</div>
                    <div class="radio-header">
                        <div class="radio-frequency">FREQUENCY: 99.4 MHz</div>
                        <button class="radio-clear-btn" onclick="clearRadioMessages()">CLEAR ALL</button>
                    </div>
                    <div class="radio-status">
                        <div class="radio-status-indicator"></div>
                        <span>CHANNEL ACTIVE - BROADCASTING</span>
                    </div>
                    <div class="radio-messages" id="radio-messages">
                        <div class="radio-empty">NO MESSAGES</div>
                    </div>
                    <div class="radio-input-area">
                        <input type="text" id="radio-input" placeholder="Type your message..." maxlength="500">
                        <button onclick="sendRadioMessage()">TRANSMIT</button>
                    </div>
                </div>
            </div>

            <!-- ==================== CREDENTIALS VIEW ==================== -->
            <div id="adm-credentials" class="tab-content">
                <div class="credentials-fullwidth">
                    <div class="credentials-card">
                        <div class="credentials-header">
                            <div class="credentials-logo">ARCS</div>
                            <div class="credentials-badge">LEVEL: OMEGA</div>
                        </div>
                        <div class="credentials-body">
                            <div class="credentials-field">
                                <span class="field-label">NAME:</span>
                                <span class="field-value">OBUNTO</span>
                            </div>
                            <div class="credentials-field">
                                <span class="field-label">OPERATOR ID:</span>
                                <span class="field-value">118107921024376</span>
                            </div>
                            <div class="credentials-field">
                                <span class="field-label">CLEARANCE:</span>
                                <span class="field-value">GOLD - UNRESTRICTED</span>
                            </div>
                            <div class="credentials-field">
                                <span class="field-label">DIVISION:</span>
                                <span class="field-value">SYSTEM ADMINISTRATION</span>
                            </div>
                            <div class="credentials-field">
                                <span class="field-label">STATUS:</span>
                                <span class="field-value">ACTIVE</span>
                            </div>
                        </div>
                        <div class="credentials-footer">
                            AUTHORIZED ACCESS TO ALL FACILITIES AND SYSTEMS
                        </div>
                    </div>
                </div>
            </div>

            <!-- ==================== USERS VIEW ==================== -->
            <div id="adm-users" class="tab-content">
                <div class="users-fullwidth">
                    <div class="cell-header">USER MANAGEMENT</div>
                    <div class="users-tabs">
                        <div class="users-tab active" onclick="showUsersSection('active')">ACTIVE USERS</div>
                        <div class="users-tab" onclick="showUsersSection('banned')">BANNED USERS</div>
                    </div>
                    <div id="users-active-section" class="users-section">
                        <div id="active-users-list"></div>
                    </div>
                    <div id="users-banned-section" class="users-section hidden">
                        <div id="banned-users-list"></div>
                    </div>
                </div>
            </div>

            <!-- ==================== ANALYTICS VIEW ==================== -->
            <div id="adm-analytics" class="tab-content">
                <div class="analytics-fullwidth">
                    <div class="cell-header">SYSTEM ANALYTICS</div>
                    <div class="analytics-grid">
                        <div class="analytics-card">
                            <div class="analytics-label">TOTAL USERS</div>
                            <div class="analytics-value" id="analytics-total-users">0</div>
                        </div>
                        <div class="analytics-card">
                            <div class="analytics-label">ACTIVE USERS</div>
                            <div class="analytics-value" id="analytics-active-sessions">0</div>
                        </div>
                        <div class="analytics-card">
                            <div class="analytics-label">BROADCASTS</div>
                            <div class="analytics-value" id="analytics-broadcasts">0</div>
                        </div>
                        <div class="analytics-card">
                            <div class="analytics-label">RADIO MSGS</div>
                            <div class="analytics-value" id="analytics-radio-msgs">0</div>
                        </div>
                    </div>
                    <div class="analytics-logs" id="analytics-logs">
                        <div class="analytics-logs-title">RECENT ACTIVITY</div>
                        <div class="log-entry info">
                            <span class="log-message">System initialized</span>
                            <span class="log-time">--:--:--</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ==================== CHAT VIEW ==================== -->
            <div id="adm-chat" class="tab-content">
                <div class="chat-fullwidth">
                    <div class="cell-header">DIRECT MESSAGING</div>
                    <div class="chat-container">
                        <div class="chat-sidebar">
                            <div class="chat-sidebar-header">CONTACTS</div>
                            <div class="chat-user-list" id="chat-user-list">
                                <div class="chat-user-empty">NO USERS ONLINE</div>
                            </div>
                        </div>
                        <div class="chat-main">
                            <div class="chat-header" id="chat-header">
                                <span class="chat-recipient">SELECT A USER</span>
                                <span class="chat-status">OFFLINE</span>
                            </div>
                            <div class="chat-messages" id="chat-messages">
                                <div class="chat-empty">SELECT A USER TO START CHATTING</div>
                            </div>
                            <div class="chat-input-area">
                                <input type="text" id="chat-input" placeholder="Type a message..." maxlength="1000" disabled>
                                <button id="chat-send-btn" onclick="sendChatMessage()" disabled>SEND</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <!-- ==================== ADMIN PANEL MODAL ==================== -->
    <div id="admin-panel" class="admin-window hidden">
        <div class="window-titlebar">
            <span>ADMIN PANEL - OBUNTO</span>
            <div class="close-btn" onclick="closeAdmin()">X</div>
        </div>
        <div class="window-body">
            <div class="admin-section">
                <h3 style="margin-bottom: 16px; font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase;">PENDING ACCOUNTS</h3>
                <div id="pending-list-modal"></div>
            </div>
        </div>
    </div>

    <!-- ==================== ADMIN FAB BUTTON ==================== -->
    <div id="admin-toggle" class="admin-fab hidden" onclick="openAdmin()">+</div>

    <!-- ==================== BROADCAST NOTIFICATION ==================== -->
    <div id="broadcast-notification" class="notification hidden">
        <div class="mascot-container">
            <div id="notif-sprite">
                <span class="sprite-face">😐</span>
            </div>
            <div class="mascot-label">OBUNTO</div>
        </div>
        <div class="bubble">
            <span class="bubble-decoration top-left">◆</span>
            <div class="notification-text" id="notif-text"></div>
            <span class="bubble-decoration bottom-right">◆</span>
            <button class="notification-close" onclick="closeBroadcast()">X</button>
        </div>
    </div>

    <!-- ==================== EDIT WELCOME MODAL ==================== -->
    <div id="edit-welcome-modal" class="modal hidden">
        <div class="modal-content">
            <div class="modal-header">
                <span>EDIT WELCOME SCREEN</span>
                <div class="modal-close" onclick="closeWelcomeModal()">X</div>
            </div>
            <div class="modal-body">
                <div class="editor-field">
                    <label class="editor-label">TITLE</label>
                    <input type="text" id="welcome-title-input" class="editor-input" value="WELCOME TO ARCS">
                </div>
                <div class="editor-field">
                    <label class="editor-label">MESSAGE</label>
                    <textarea id="welcome-text-input" class="editor-textarea">WELCOME TO ARCS V3.2.2. SELECT A MODULE FROM THE MENU BAR TO BEGIN OPERATIONS.</textarea>
                </div>
                <button class="form-submit-btn" onclick="saveWelcomeChanges()">SAVE CHANGES</button>
            </div>
        </div>
    </div>

    <!-- ==================== NEW TAB MODAL ==================== -->
    <div id="new-tab-modal" class="modal hidden">
        <div class="modal-content">
            <div class="modal-header">
                <span>CREATE NEW TAB</span>
                <div class="modal-close" onclick="closeNewTabModal()">X</div>
            </div>
            <div class="modal-body">
                <div class="editor-field">
                    <label class="editor-label">TAB NAME</label>
                    <input type="text" id="new-tab-name" class="editor-input" placeholder="Enter tab name...">
                </div>
                <div class="editor-field">
                    <label class="editor-label">TAB CONTENT</label>
                    <textarea id="new-tab-content" class="editor-textarea" placeholder="Enter content for this tab..."></textarea>
                </div>
                <button class="form-submit-btn" onclick="saveNewTab()">CREATE TAB</button>
            </div>
        </div>
    </div>

    <!-- ==================== EDIT USER MODAL ==================== -->
    <div id="edit-user-modal" class="modal hidden">
        <div class="modal-content">
            <div class="modal-header">
                <span>EDIT USER</span>
                <div class="modal-close" onclick="closeEditUserModal()">X</div>
            </div>
            <div class="modal-body">
                <div class="editor-field">
                    <label class="editor-label">USER ID</label>
                    <input type="text" id="edit-user-id" class="editor-input" readonly>
                </div>
                <div class="editor-field">
                    <label class="editor-label">DISPLAY NAME</label>
                    <input type="text" id="edit-user-name" class="editor-input">
                </div>
                <div class="editor-field">
                    <label class="editor-label">STATUS</label>
                    <select id="edit-user-status" class="editor-select">
                        <option value="active">Active</option>
                        <option value="banned">Banned</option>
                    </select>
                </div>
                <button class="form-submit-btn" onclick="saveUserChanges()">SAVE CHANGES</button>
            </div>
        </div>
    </div>

    <!-- ==================== JAVASCRIPT ==================== -->
    <script src="js/script.js"></script>
</body>
</html>