/* Smart Alarm Pro - Main Application Orchestrator */

import { StorageService } from './services/storage.js';
import { AlarmServiceInstance } from './services/alarmService.js';
import { AudioServiceInstance } from './services/audioService.js';
import { VoiceServiceInstance } from './services/voiceService.js';
import { NotificationService } from './services/notificationService.js';
import { PWAService } from './services/pwaService.js';

// Import UI components
import { DashboardComponent } from './components/dashboard.js';
import { ClockComponent } from './components/clock.js';
import { CalendarComponent } from './components/calendar.js';
import { TimerComponent } from './components/timer.js';
import { AnalyticsComponent } from './components/analytics.js';
import { SettingsComponent } from './components/settings.js';

class App {
  constructor() {
    this.settings = StorageService.getSettings();
    this.activeView = 'dashboard';
    this.customSoundBlob = null; // Stored blob for alarm uploads
  }

  async start() {
    // 1. Apply visual themes
    this.applyTheme(this.settings);

    // 2. Initialize PWAs and Notifications
    PWAService.init(
      document.getElementById('pwa-sidebar-install'),
      document.getElementById('pwa-bottom-install')
    );
    NotificationService.init();

    // 3. Setup Onboarding/Tutorial Flow
    this.setupOnboarding();

    // 4. Initialize Alarms Service ticks
    AlarmServiceInstance.start();

    // 5. Setup View Switching Routing
    this.setupRouting();

    // 5b. Bind Notifications Dropdown Logs
    this.setupNotificationsLog();

    // 6. Bind view modals and lists
    this.setupAlarmsView();
    this.setupTasksView();

    // 7. Load default view (Dashboard)
    this.switchView('dashboard');

    // 8. Listen for Alarm triggers to refresh views
    window.addEventListener('alarm-dismissed', () => this.refreshActiveView());
    window.addEventListener('alarm-snoozed', () => this.refreshActiveView());
    window.addEventListener('alarm-completed', () => this.refreshActiveView());
  }

  async setupNotificationsLog() {
    const bellBtn = document.getElementById('notif-bell-btn');
    const dropdown = document.getElementById('notifications-dropdown');
    const clearBtn = document.getElementById('clear-notif-logs');
    const badge = document.getElementById('bell-badge-el');

    const updateBadge = async () => {
      const history = await StorageService.getHistory();
      const count = history.length;
      if (count > 0 && badge) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else if (badge) {
        badge.style.display = 'none';
      }
    };

    updateBadge();
    window.addEventListener('alarm-dismissed', updateBadge);
    window.addEventListener('alarm-snoozed', updateBadge);
    window.addEventListener('alarm-completed', updateBadge);

    if (bellBtn && dropdown) {
      bellBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const active = dropdown.classList.toggle('active');
        if (active) {
          await this.renderNotificationsList();
        }
      });
      document.addEventListener('click', () => dropdown.classList.remove('active'));
      dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        await StorageService.clearHistory();
        await this.renderNotificationsList();
        updateBadge();
      });
    }
  }

  async renderNotificationsList() {
    const list = document.getElementById('notifications-log-list');
    if (!list) return;

    const history = await StorageService.getHistory();
    list.innerHTML = '';

    if (history.length === 0) {
      list.innerHTML = `
        <div class="notif-empty">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span>No notifications logged yet.</span>
        </div>
      `;
      return;
    }

    history.sort((a, b) => b.timestamp - a.timestamp);

    history.forEach(log => {
      const item = document.createElement('div');
      item.className = 'notif-item';
      
      const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      let actionColor = 'var(--text-secondary)';
      if (log.action === 'dismissed') actionColor = 'var(--accent-secondary)';
      if (log.action === 'snoozed') actionColor = 'var(--warning-color)';
      if (log.action === 'completed') actionColor = 'var(--success-color)';
      if (log.action === 'missed') actionColor = 'var(--danger-color)';

      item.innerHTML = `
        <div>
          Alarm <strong>${log.title}</strong> triggered at ${log.timeStr || '--:--'} was <span style="color: ${actionColor}; font-weight: bold;">${log.action}</span>.
        </div>
        <div class="notif-time">${dateStr} @ ${timeStr}</div>
      `;
      list.appendChild(item);
    });
  }

  applyTheme(settings) {
    // Clear theme classes
    document.body.className = '';
    
    if (settings.theme === 'theme-custom' && settings.customThemeColors) {
      document.body.classList.add('theme-dark'); // fallback container rules
      document.documentElement.style.setProperty('--accent-color', settings.customThemeColors.accent);
      
      // Parse RGB values for glow shadows
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '99, 102, 241';
      };
      
      document.documentElement.style.setProperty('--accent-color-rgb', hexToRgb(settings.customThemeColors.accent));
      document.documentElement.style.setProperty('--accent-glow', `rgba(${hexToRgb(settings.customThemeColors.accent)}, 0.5)`);
      document.documentElement.style.setProperty('--bg-color', settings.customThemeColors.background);
      document.documentElement.style.setProperty('--bg-gradient', 'none');
    } else {
      document.body.classList.add(settings.theme);
      // reset custom properties to inherit from theme stylesheet
      document.documentElement.style.removeProperty('--accent-color');
      document.documentElement.style.removeProperty('--accent-color-rgb');
      document.documentElement.style.removeProperty('--accent-glow');
      document.documentElement.style.removeProperty('--bg-color');
      document.documentElement.style.removeProperty('--bg-gradient');
    }
  }

  setupOnboarding() {
    const screen = document.getElementById('onboarding-screen');
    if (this.settings.onboarded) {
      screen?.classList.add('hidden');
      return;
    }

    screen?.classList.remove('hidden');

    const slides = screen.querySelectorAll('.onboarding-slide');
    const dots = screen.querySelectorAll('.onboarding-dot');
    const nextBtn = document.getElementById('onboarding-next-btn');
    const nameInput = document.getElementById('onboarding-name-input');
    
    let currentSlide = 0;

    const showSlide = (idx) => {
      slides.forEach((s, i) => s.classList.toggle('active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      nextBtn.textContent = idx === slides.length - 1 ? 'Start Application' : 'Continue';
    };

    nextBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      if (currentSlide === 0) {
        // Make name input optional, fallback to default name
        const name = nameInput.value.trim();
        this.settings.userName = name || 'Champion';
      }

      if (currentSlide < slides.length - 1) {
        currentSlide++;
        showSlide(currentSlide);
      } else {
        // Complete onboarding
        this.settings.onboarded = true;
        StorageService.saveSettings(this.settings);
        
        // Request notifications permission immediately upon onboarding complete
        await NotificationService.requestPermission();
        
        screen.classList.add('hidden');
        this.refreshActiveView();
      }
    });

    showSlide(currentSlide);
  }

  setupRouting() {
    const handleNavClick = (viewId) => {
      this.switchView(viewId);
      
      // Close sidebar in mobile if clicking nav
      if (window.innerWidth <= 768) {
        // Handled automatically by stylesheet overlays
      }
    };

    // Sidebar items
    document.querySelectorAll('.app-sidebar .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view');
        handleNavClick(viewId);
      });
    });

    // Mobile bottom nav items
    document.querySelectorAll('.app-bottom-nav .bottom-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view');
        handleNavClick(viewId);
      });
    });

    // More popup options in bottom nav
    const moreBtn = document.getElementById('nav-more-trigger');
    const moreMenu = document.getElementById('bottom-more-menu-modal');
    
    if (moreBtn && moreMenu) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.classList.toggle('active');
      });

      moreMenu.addEventListener('click', (e) => {
        const viewLink = e.target.closest('[data-view]');
        if (viewLink) {
          const viewId = viewLink.getAttribute('data-view');
          handleNavClick(viewId);
          moreMenu.classList.remove('active');
        }
      });

      document.addEventListener('click', () => moreMenu.classList.remove('active'));
    }
  }

  switchView(viewId) {
    this.activeView = viewId;

    // Remove active state from sidebar items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });

    // Remove active state from bottom items
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });

    // Hide all view panels
    document.querySelectorAll('.app-view').forEach(panel => {
      panel.classList.remove('active');
    });

    // Show selected panel
    const activePanel = document.getElementById(`view-${viewId}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // Initialize/Refresh views dynamically
    this.refreshActiveView();
  }

  async refreshActiveView() {
    const el = document.getElementById(`view-${this.activeView}`);
    if (!el) return;

    if (this.activeView === 'dashboard') {
      DashboardComponent.init(el, this.settings, (tgt) => this.switchView(tgt));
    } else if (this.activeView === 'clocks') {
      ClockComponent.init(el, this.settings);
    } else if (this.activeView === 'alarms') {
      await this.renderAlarmsList();
    } else if (this.activeView === 'tasks') {
      await this.renderTasksList();
    } else if (this.activeView === 'calendar') {
      CalendarComponent.init(el);
    } else if (this.activeView === 'timer') {
      TimerComponent.init(el);
    } else if (this.activeView === 'analytics') {
      AnalyticsComponent.init(el);
    } else if (this.activeView === 'settings') {
      SettingsComponent.init(el, this.settings, (updatedSettings, reRender) => {
        this.settings = updatedSettings;
        this.applyTheme(this.settings);
        
        // Propagate updates to components without full destruction if selected
        if (reRender) this.refreshActiveView();
      });
    }
  }

  // ==========================================
  // ALARMS VIEW LOGIC
  // ==========================================
  setupAlarmsView() {
    const modal = document.getElementById('add-alarm-modal');
    const closeBtn = document.getElementById('close-alarm-modal');
    const cancelBtn = document.getElementById('cancel-alarm-btn');
    const saveBtn = document.getElementById('save-alarm-btn');
    
    // File upload handler
    const fileInput = document.getElementById('alarm-sound-file');
    const soundSelect = document.getElementById('alarm-sound');

    if (soundSelect && fileInput) {
      soundSelect.addEventListener('change', () => {
        if (soundSelect.value === 'custom') {
          fileInput.style.display = 'block';
        } else {
          fileInput.style.display = 'none';
        }
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.customSoundBlob = file;
          console.log('Custom MP3 alarm file uploaded successfully.');
        }
      });
    }

    const closeModal = () => {
      modal?.classList.remove('active');
      this.customSoundBlob = null;
      if (fileInput) fileInput.style.display = 'none';
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const title = document.getElementById('alarm-title').value.trim() || 'Routines Alarm';
        const desc = document.getElementById('alarm-desc').value.trim();
        const time = document.getElementById('alarm-time').value;
        const priority = document.getElementById('alarm-priority').value;
        const category = document.getElementById('alarm-category').value;
        const sound = document.getElementById('alarm-sound').value;
        const voiceReminder = document.getElementById('alarm-voice-reminder').checked;
        const alarmId = document.getElementById('alarm-id-hidden').value;

        // Fetch repeat checkboxes
        const repeatDays = [];
        document.querySelectorAll('.alarm-repeat-day-chk:checked').forEach(chk => {
          repeatDays.push(Number(chk.value));
        });

        if (!time) {
          alert('Please specify a time for your alarm!');
          return;
        }

        const alarmData = {
          title,
          description: desc,
          time,
          priority,
          category,
          sound,
          voiceReminder,
          repeatDays,
          active: true
        };

        if (this.customSoundBlob) {
          alarmData.customSoundBlob = this.customSoundBlob;
        }

        if (alarmId) {
          alarmData.id = Number(alarmId);
          // Preserve custom sound blob if not overwritten
          if (!alarmData.customSoundBlob) {
            const currentAlarms = await StorageService.getAllAlarms();
            const current = currentAlarms.find(a => a.id === alarmData.id);
            if (current && current.customSoundBlob) {
              alarmData.customSoundBlob = current.customSoundBlob;
            }
          }
          await StorageService.updateAlarm(alarmData);
        } else {
          await StorageService.addAlarm(alarmData);
        }

        closeModal();
        this.refreshActiveView();
      });
    }
  }

  async renderAlarmsList() {
    const el = document.getElementById('view-alarms');
    const alarms = await StorageService.getAllAlarms();

    el.innerHTML = `
      <div class="view-title-container">
        <div>
          <h1 class="view-title">Alarms & Routines</h1>
          <p class="view-subtitle">Organize alerts, voice synthesis reminders, and ambient schedules</p>
        </div>
        <button id="add-alarm-btn" class="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Alarm
        </button>
      </div>

      <div class="alarms-list-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem;">
        ${this.generateAlarmsHtml(alarms)}
      </div>
    `;

    // Wire add button trigger
    document.getElementById('add-alarm-btn')?.addEventListener('click', () => {
      this.openAlarmFormModal();
    });

    // Wire actions (edit, delete, active switches, preview sound)
    const grid = el.querySelector('.alarms-list-grid');
    if (grid) {
      // Toggle switches
      grid.querySelectorAll('.alarm-toggle-input').forEach(chk => {
        chk.addEventListener('change', async () => {
          const card = chk.closest('.glass-card');
          const id = card.getAttribute('data-id');
          const alarm = alarms.find(a => a.id === Number(id));
          if (alarm) {
            alarm.active = chk.checked;
            await StorageService.updateAlarm(alarm);
          }
        });
      });

      // Delete buttons
      grid.querySelectorAll('.delete-alarm-action').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const card = btn.closest('.glass-card');
          const id = card.getAttribute('data-id');
          if (confirm('Are you sure you want to delete this alarm?')) {
            await StorageService.deleteAlarm(id);
            this.refreshActiveView();
          }
        });
      });

      // Edit/Card clicks
      grid.querySelectorAll('.alarm-edit-zone').forEach(zone => {
        zone.addEventListener('click', () => {
          const card = zone.closest('.glass-card');
          const id = card.getAttribute('data-id');
          const alarm = alarms.find(a => a.id === Number(id));
          if (alarm) {
            this.openAlarmFormModal(alarm);
          }
        });
      });

      // Sound Previews
      grid.querySelectorAll('.preview-sound-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const card = btn.closest('.glass-card');
          const id = card.getAttribute('data-id');
          const alarm = alarms.find(a => a.id === Number(id));
          
          if (alarm) {
            if (AudioServiceInstance.isPlaying && AudioServiceInstance.currentSound === alarm.sound) {
              AudioServiceInstance.stop();
              btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            } else {
              if (alarm.sound === 'custom' && alarm.customSoundBlob) {
                AudioServiceInstance.play('custom', this.settings.alarmVolume, false, 0, alarm.customSoundBlob);
              } else {
                AudioServiceInstance.play(alarm.sound || 'classic', this.settings.alarmVolume, false, 0);
              }
              btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg>`;
              
              // Stop preview after 4 seconds
              setTimeout(() => {
                AudioServiceInstance.stop();
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
              }, 4000);
            }
          }
        });
      });
    }
  }

  generateAlarmsHtml(alarms) {
    if (alarms.length === 0) {
      return `
        <div style="grid-column: span 2; text-align: center; padding: 5rem 2rem; color: var(--text-muted);">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; opacity: 0.6;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <p style="font-size: 1rem; font-weight: 700; color: var(--text-secondary);">No active routines added.</p>
          <span style="font-size: 0.85rem; margin-top: 4px; display:block;">Click 'Add Alarm' to map your morning routines!</span>
        </div>
      `;
    }

    const weekdaysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return alarms.map(alarm => {
      const isCustomSound = alarm.sound === 'custom' ? 'Custom Upload' : alarm.sound;
      
      // format repeat schedule days text
      let repeatStr = 'Once';
      if (alarm.repeatDays && alarm.repeatDays.length > 0) {
        if (alarm.repeatDays.length === 7) {
          repeatStr = 'Daily';
        } else if (alarm.repeatDays.length === 5 && !alarm.repeatDays.includes(5) && !alarm.repeatDays.includes(6)) {
          repeatStr = 'Weekdays';
        } else if (alarm.repeatDays.length === 2 && alarm.repeatDays.includes(5) && alarm.repeatDays.includes(6)) {
          repeatStr = 'Weekends';
        } else {
          repeatStr = alarm.repeatDays.map(d => weekdaysShort[d]).join(', ');
        }
      }

      return `
        <div class="glass-card" data-id="${alarm.id}" style="display: flex; flex-direction: column; gap: 12px; padding: 1.25rem; min-height: 140px; position: relative;">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <!-- Clickable edit zone -->
            <div class="alarm-edit-zone" style="flex-grow:1; display:flex; flex-direction:column; gap:4px; cursor:pointer;">
              <span style="font-size: 1.75rem; font-weight: 800; font-family: monospace; color: var(--text-primary); letter-spacing:-0.5px; line-height: 1;">${alarm.time}</span>
              <span style="font-size: 0.95rem; font-weight: 700; margin-top: 4px; display:flex; align-items:center; gap:8px;">
                ${alarm.title}
                <span class="badge-category cat-${alarm.category.toLowerCase()}" style="font-size: 0.6rem; padding: 1px 5px;">${alarm.category}</span>
              </span>
              ${alarm.description ? `<span style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${alarm.description}</span>` : ''}
            </div>

            <!-- Active toggle switch -->
            <label class="switch">
              <input type="checkbox" class="alarm-toggle-input" ${alarm.active ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <!-- Bottom bar: Repeat, sound, actions -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed rgba(255,255,255,0.05); padding-top:10px; margin-top:auto; font-size: 0.75rem; color: var(--text-secondary);">
            <div style="display:flex; align-items:center; gap:12px;">
              <span>🔁 ${repeatStr}</span>
              <span>🎵 ${isCustomSound}</span>
            </div>
            
            <div style="display:flex; gap:6px;">
              <button class="preview-sound-action btn-icon" style="width:28px; height:28px; border-radius:6px;" title="Preview sound">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </button>
              <button class="delete-alarm-action btn-icon" style="width:28px; height:28px; border-radius:6px; background:rgba(239,68,68,0.08); border-color:rgba(239,68,68,0.15); color:var(--danger-color);" title="Delete alarm">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openAlarmFormModal(alarm = null) {
    const modal = document.getElementById('add-alarm-modal');
    if (!modal) return;

    modal.querySelector('.modal-title').textContent = alarm ? 'Edit Alarm Routine' : 'Create Alarm Routine';
    document.getElementById('alarm-id-hidden').value = alarm ? alarm.id : '';
    document.getElementById('alarm-title').value = alarm ? alarm.title : '';
    document.getElementById('alarm-desc').value = alarm ? alarm.description : '';
    document.getElementById('alarm-time').value = alarm ? alarm.time : '';
    document.getElementById('alarm-priority').value = alarm ? alarm.priority : 'Medium';
    document.getElementById('alarm-category').value = alarm ? alarm.category : 'Personal';
    document.getElementById('alarm-sound').value = alarm ? alarm.sound : 'classic';
    document.getElementById('alarm-voice-reminder').checked = alarm ? alarm.voiceReminder : true;

    // Reset repeat checkboxes
    document.querySelectorAll('.alarm-repeat-day-chk').forEach(chk => {
      const val = Number(chk.value);
      chk.checked = alarm ? (alarm.repeatDays || []).includes(val) : false;
    });

    // Check custom file sound visibility
    const fileInput = document.getElementById('alarm-sound-file');
    if (fileInput) {
      fileInput.style.display = alarm && alarm.sound === 'custom' ? 'block' : 'none';
    }

    modal.classList.add('active');
  },

  // ==========================================
  // TASKS VIEW LOGIC
  // ==========================================
  setupTasksView() {
    const modal = document.getElementById('add-task-modal');
    const closeBtn = document.getElementById('close-task-modal');
    const cancelBtn = document.getElementById('cancel-task-btn');
    const saveBtn = document.getElementById('save-task-btn');

    const closeModal = () => modal?.classList.remove('active');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const title = document.getElementById('task-title').value.trim();
        const desc = document.getElementById('task-desc').value.trim();
        const dueDate = document.getElementById('task-due-date').value;
        const dueTime = document.getElementById('task-due-time').value;
        const priority = document.getElementById('task-priority').value;
        const category = document.getElementById('task-category').value;
        const taskId = document.getElementById('task-id-hidden').value;

        if (!title) {
          alert('Task title is required!');
          return;
        }

        const taskData = {
          title,
          description: desc,
          dueDate,
          dueTime,
          priority,
          category,
          status: 'pending'
        };

        if (taskId) {
          taskData.id = Number(taskId);
          // Preserve completion status when editing
          const currentTasks = await StorageService.getAllTasks();
          const current = currentTasks.find(t => t.id === taskData.id);
          if (current) taskData.status = current.status;
          
          await StorageService.updateTask(taskData);
        } else {
          await StorageService.addTask(taskData);
        }

        closeModal();
        this.refreshActiveView();
      });
    }
  }

  async renderTasksList() {
    const el = document.getElementById('view-tasks');
    const tasks = await StorageService.getAllTasks();

    // Default filters
    if (!this.taskFilter) this.taskFilter = 'all'; // 'all', 'today', 'important'

    el.innerHTML = `
      <canvas id="tasks-confetti-canvas" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:999;"></canvas>

      <div class="view-title-container">
        <div>
          <h1 class="view-title">Planner & Tasks</h1>
          <p class="view-subtitle">Track priority checklist items, deadlines, and active targets</p>
        </div>
        
        <div style="display: flex; gap: 12px; align-items: center;">
          <!-- Filter Tabs -->
          <div style="display: flex; background: var(--glass-bg); padding: 4px; border-radius: 12px; border: 1px solid var(--glass-border);">
            <button class="task-filter-btn" data-filter="all" style="${this.getFilterBtnStyle(this.taskFilter === 'all')}">All</button>
            <button class="task-filter-btn" data-filter="today" style="${this.getFilterBtnStyle(this.taskFilter === 'today')}">Today</button>
            <button class="task-filter-btn" data-filter="important" style="${this.getFilterBtnStyle(this.taskFilter === 'important')}">Priority</button>
          </div>

          <button id="add-task-btn" class="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Task
          </button>
        </div>
      </div>

      <div class="glass-panel" style="flex-grow: 1; display: flex; flex-direction: column;">
        <div id="tasks-items-list" style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto; max-height: 480px; padding-right: 4px;">
          ${this.generateTasksHtml(tasks)}
        </div>
      </div>
    `;

    // Add task button
    document.getElementById('add-task-btn')?.addEventListener('click', () => {
      this.openTaskFormModal();
    });

    // Wire actions (checkbox change, edit, delete)
    const list = document.getElementById('tasks-items-list');
    if (list) {
      // Checkbox click
      list.querySelectorAll('.task-toggle-check').forEach(chk => {
        chk.addEventListener('change', async () => {
          const item = chk.closest('.task-item');
          const id = item.getAttribute('data-id');
          const task = tasks.find(t => t.id === Number(id));
          if (task) {
            task.status = chk.checked ? 'completed' : 'pending';
            await StorageService.updateTask(task);
            
            if (chk.checked) {
              item.classList.add('completed');
              // Shoot confetti!
              const canvas = document.getElementById('tasks-confetti-canvas');
              import('../utils/helpers.js').then(m => m.triggerConfetti(canvas));
            } else {
              item.classList.remove('completed');
            }

            // brief re-render delay to adjust items ordering
            setTimeout(() => this.refreshActiveView(), 1000);
          }
        });
      });

      // Delete task click
      list.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const item = btn.closest('.task-item');
          const id = item.getAttribute('data-id');
          if (confirm('Are you sure you want to delete this task?')) {
            await StorageService.deleteTask(id);
            this.refreshActiveView();
          }
        });
      });

      // Edit task card click
      list.querySelectorAll('.task-edit-zone').forEach(zone => {
        zone.addEventListener('click', () => {
          const item = zone.closest('.task-item');
          const id = item.getAttribute('data-id');
          const task = tasks.find(t => t.id === Number(id));
          if (task) {
            this.openTaskFormModal(task);
          }
        });
      });
    }

    // Wire filters tab click
    document.querySelectorAll('.task-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.taskFilter = btn.getAttribute('data-filter');
        this.refreshActiveView();
      });
    });
  }

  getFilterBtnStyle(isActive) {
    return `
      padding: 0.4rem 1rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      font-family: var(--font-family);
      background: ${isActive ? 'var(--accent-color)' : 'transparent'};
      color: ${isActive ? '#ffffff' : 'var(--text-secondary)'};
      box-shadow: ${isActive ? '0 4px 10px var(--accent-glow)' : 'none'};
      transition: all var(--transition-speed);
    `;
  }

  generateTasksHtml(tasks) {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Apply filters
    let filtered = tasks;
    if (this.taskFilter === 'today') {
      filtered = tasks.filter(t => t.dueDate === todayStr);
    } else if (this.taskFilter === 'important') {
      filtered = tasks.filter(t => t.priority === 'High');
    }

    // Sort: pending first, then by priority High -> Med -> Low
    const priorityWeights = { 'High': 3, 'Medium': 2, 'Low': 1 };
    filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      return priorityWeights[b.priority] - priorityWeights[a.priority];
    });

    if (filtered.length === 0) {
      return `
        <div style="text-align: center; padding: 5rem 1rem; color: var(--text-muted);">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; opacity: 0.6;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <p style="font-size: 1rem; font-weight: 700; color: var(--text-secondary);">No tasks match this filter.</p>
          <span style="font-size: 0.85rem; margin-top: 4px; display:block;">Click 'Add Task' to schedule new objectives!</span>
        </div>
      `;
    }

    return filtered.map(task => {
      const isCompleted = task.status === 'completed';
      const catClass = `cat-${task.category.toLowerCase()}`;
      
      const dateText = task.dueDate ? task.dueDate.split('-').slice(1).reverse().join('/') : '';
      const timeText = task.dueTime ? task.dueTime : '';
      const metaStr = [dateText, timeText].filter(Boolean).join(' @ ');

      return `
        <div class="task-item ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
          <label class="task-checkbox-container">
            <input type="checkbox" class="task-toggle-check" ${isCompleted ? 'checked' : ''}>
            <span class="task-checkbox"></span>
          </label>
          
          <div class="task-body task-edit-zone" style="cursor:pointer; flex-grow:1;">
            <span class="task-title">${task.title}</span>
            ${task.description ? `<span class="task-desc">${task.description}</span>` : ''}
            ${metaStr ? `
              <div class="task-meta">
                <span class="task-meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  ${metaStr}
                </span>
              </div>
            ` : ''}
          </div>

          <div style="display:flex; align-items:center; gap:16px; flex-shrink:0;">
            <span class="badge-category ${catClass}">${task.category}</span>
            <span class="priority-flag priority-${task.priority.toLowerCase()}"></span>
            
            <button class="delete-task-btn btn-icon" style="width:28px; height:28px; border-radius:6px; background:rgba(239,68,68,0.08); border-color:rgba(239,68,68,0.15); color:var(--danger-color);">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  openTaskFormModal(task = null) {
    const modal = document.getElementById('add-task-modal');
    if (!modal) return;

    modal.querySelector('.modal-title').textContent = task ? 'Edit Task' : 'Create Task';
    document.getElementById('task-id-hidden').value = task ? task.id : '';
    document.getElementById('task-title').value = task ? task.title : '';
    document.getElementById('task-desc').value = task ? task.description : '';
    document.getElementById('task-due-date').value = task ? task.dueDate : '';
    document.getElementById('task-due-time').value = task ? task.dueTime : '';
    document.getElementById('task-priority').value = task ? task.priority : 'Medium';
    document.getElementById('task-category').value = task ? task.category : 'Personal';

    modal.classList.add('active');
  }
}

// Bootstrap application on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start().catch((error) => {
    console.error('Application start failed:', error);
    const viewContainer = document.querySelector('.view-container');
    if (viewContainer) {
      viewContainer.innerHTML = `
        <div style="padding: 2rem; color: var(--danger-color); background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.15); border-radius: 16px;">
          <h2 style="margin-bottom: 0.5rem;">Application failed to load</h2>
          <p style="margin:0;">Check the browser console for details.</p>
        </div>
      `;
    }
  });
});

window.addEventListener('error', (event) => {
  console.error('Global runtime error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
