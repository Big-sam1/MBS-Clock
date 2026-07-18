/* Smart Alarm Pro - Main Dashboard Component */

import { formatTime, formatDate, getCountdownText, triggerConfetti } from '../utils/helpers.js';
import { StorageService } from '../services/storage.js';
import { WeatherService } from '../services/weatherService.js';

export const DashboardComponent = {
  // Pre-loaded quotes
  quotes: [
    "Focus on being productive, not busy.",
    "Your future is created by what you do today, not tomorrow.",
    "Small streaks build massive habits.",
    "Rise up, start fresh, see the bright opportunity in each day.",
    "Action is the foundational key to all success.",
    "Make each day your masterpiece."
  ],

  async init(containerEl, settings, onTabSwitch) {
    this.container = containerEl;
    this.settings = settings;
    this.onTabSwitch = onTabSwitch;
    this.weatherData = null;

    // Load initial weather
    if (this.settings.weatherEnabled) {
      this.loadWeather();
    }

    await this.render();
    this.startCountdownLoop();
  },

  updateSettings(settings) {
    this.settings = settings;
    if (this.settings.weatherEnabled && !this.weatherData) {
      this.loadWeather();
    }
    this.render();
  },

  async loadWeather() {
    try {
      const coords = await WeatherService.getLocation();
      this.weatherData = await WeatherService.fetchWeather(coords.lat, coords.lon);
      this.renderWeather();
    } catch (e) {
      console.warn('Weather fetch bypassed/blocked:', e.message);
      this.renderWeatherError();
    }
  },

  async render() {
    const alarms = await StorageService.getAllAlarms();
    const tasks = await StorageService.getAllTasks();
    const history = await StorageService.getHistory();

    // Determine greeting
    const hrs = new Date().getHours();
    let greeting = 'Good Evening';
    if (hrs < 12) greeting = 'Good Morning';
    else if (hrs < 18) greeting = 'Good Afternoon';

    const name = this.settings.userName || 'Champion';

    // Find next upcoming alarm
    const nextAlarmInfo = this.getNextAlarm(alarms);
    
    // Filter today's tasks
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.dueDate === todayStr || t.status === 'pending').slice(0, 4);

    // Calculate analytics
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
    
    const randomQuote = this.quotes[new Date().getDate() % this.quotes.length];

    this.container.innerHTML = `
      <canvas id="dashboard-confetti-canvas" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:999;"></canvas>

      <div class="view-title-container">
        <div>
          <h1 class="view-title">${greeting}, ${name} 👋</h1>
          <p class="view-subtitle" id="dashboard-subtitle-date">${formatDate(new Date())}</p>
        </div>
        <div id="weather-card-container">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <div class="dashboard-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; flex-grow: 1;">
        
        <!-- Left: Time, Date & Tasks -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <!-- Large Glass Time Panel -->
          <div class="glass-panel" style="display: flex; justify-content: space-between; align-items: center; padding: 2rem 2.5rem; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.6) 100%);">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--accent-secondary); letter-spacing: 1.5px; text-transform: uppercase;">Current Local Time</span>
              <span id="dashboard-digital-time" class="glow-text" style="font-size: 3.75rem; font-weight: 800; letter-spacing: -2px; line-height: 1.1; font-variant-numeric: tabular-nums;">00:00:00</span>
              <span id="dashboard-timezone-label" style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
            
            <div style="width: 110px; height: 110px; opacity: 0.8;">
              <!-- Mini Analog Clock -->
              <div class="analog-clock" id="mini-analog-clock" style="width: 100px; height: 100px; border-width: 2px;">
                <div class="clock-face">
                  <div class="clock-hand hour-hand" id="mini-hour-hand" style="height: 25px; width: 3px; margin-left: -1.5px;"></div>
                  <div class="clock-hand minute-hand" id="mini-minute-hand" style="height: 35px; width: 2px; margin-left: -1px;"></div>
                  <div class="clock-hand second-hand" id="mini-second-hand" style="height: 42px; width: 1px; margin-left: -0.5px;"></div>
                  <div class="clock-center-dot" style="width: 6px; height: 6px;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Today's Tasks Section -->
          <div class="glass-panel" style="flex-grow: 1; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <h2 style="font-size: 1.25rem; font-weight: 700;">Today's Focus Tasks</h2>
              <button id="quick-add-task-btn" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem; border-radius: 10px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Task
              </button>
            </div>

            <div id="dashboard-tasks-list" style="display: flex; flex-direction: column; gap: 8px; flex-grow: 1;">
              ${this.renderTodayTasks(todayTasks)}
            </div>
          </div>

        </div>

        <!-- Right: Alarms, Analytics & Streaks -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">

          <!-- Next Alarm Widget -->
          <div id="next-alarm-card" class="glass-panel glow-border" style="background: rgba(var(--accent-color-rgb), 0.08); border-color: rgba(var(--accent-color-rgb), 0.25);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(var(--accent-color-rgb), 0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-color);">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-color); letter-spacing: 0.5px; text-transform: uppercase;">Upcoming Alarm</span>
                <span id="dashboard-next-alarm-countdown" style="font-size: 0.85rem; color: var(--text-primary); font-weight: 600;">--</span>
              </div>
            </div>
            ${nextAlarmInfo ? `
              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                  <div style="font-size: 2rem; font-weight: 800; color: var(--text-primary); font-variant-numeric: tabular-nums;">
                    ${nextAlarmInfo.timeFormatted}
                  </div>
                  <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-top: 2px;">
                    ${nextAlarmInfo.title}
                  </div>
                </div>
                <span class="badge-category cat-${nextAlarmInfo.category.toLowerCase()}">${nextAlarmInfo.category}</span>
              </div>
            ` : `
              <div style="color: var(--text-secondary); font-size: 0.9rem; padding: 0.5rem 0;">No active alarms scheduled.</div>
            `}
          </div>

          <!-- Productivity Analytics Widget -->
          <div class="glass-panel" style="display: flex; flex-direction: column; gap: 12px;">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">Completion Analytics</h3>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.85rem; color: var(--text-secondary);">Task Success Rate</span>
              <span style="font-size: 1rem; font-weight: 700; color: var(--success-color);">${completionRate}%</span>
            </div>
            <div style="height: 8px; border-radius: 4px; background: rgba(255,255,255,0.05); overflow: hidden; width: 100%;">
              <div style="width: ${completionRate}%; height: 100%; background: var(--success-color); box-shadow: 0 0 8px var(--success-glow); transition: width 0.5s;"></div>
            </div>
            
            <!-- Streak Tracker -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--glass-border);">
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Active Daily Streak</span>
                <span style="font-size: 1.1rem; font-weight: 800; color: var(--warning-color);">${this.calculateStreak(history)} Days 🔥</span>
              </div>
              <button id="view-analytics-btn" class="btn-icon" style="width: 36px; height: 36px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg>
              </button>
            </div>
          </div>

          <!-- Motivational Quote Widget -->
          <div class="glass-panel" style="background: rgba(255,255,255,0.01); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1.25rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-secondary); margin-bottom: 8px; opacity: 0.7;"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21zm13 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"></path></svg>
            <p style="font-size: 0.85rem; font-style: italic; color: var(--text-secondary); line-height: 1.5; font-weight: 500;">"${randomQuote}"</p>
          </div>

        </div>
      </div>
    `;

    this.renderWeather();
    this.setupListeners();
    this.startClockTicks();
  },

  renderTodayTasks(tasks) {
    if (tasks.length === 0) {
      return `
        <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); padding: 2rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 10px;"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          <span style="font-size: 0.9rem; font-weight: 600;">No tasks for today. Add a task to start crushing goals!</span>
        </div>
      `;
    }

    return tasks.map(task => {
      const isCompleted = task.status === 'completed';
      const catClass = `cat-${task.category.toLowerCase()}`;
      
      // format due date cleanly
      const dateText = task.dueDate ? task.dueDate.split('-').slice(1).reverse().join('/') : '';
      const timeText = task.dueTime ? task.dueTime : '';
      const metaStr = [dateText, timeText].filter(Boolean).join(' @ ');

      return `
        <div class="task-item ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
          <label class="task-checkbox-container">
            <input type="checkbox" class="task-toggle-check" ${isCompleted ? 'checked' : ''}>
            <span class="task-checkbox"></span>
          </label>
          <div class="task-body">
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
          <div class="task-right">
            <span class="badge-category ${catClass}">${task.category}</span>
            <span class="priority-flag priority-${task.priority.toLowerCase()}"></span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderWeather() {
    const el = document.getElementById('weather-card-container');
    if (!el) return;

    if (!this.settings.weatherEnabled) {
      el.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); cursor: pointer;" id="weather-request-enable">
          Enable Weather
        </div>
      `;
      document.getElementById('weather-request-enable')?.addEventListener('click', () => {
        this.settings.weatherEnabled = true;
        StorageService.saveSettings(this.settings);
        this.loadWeather();
      });
      return;
    }

    if (!this.weatherData) {
      el.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
          <svg class="spinSlow" style="width: 14px; height: 14px; animation: spinSlow 3s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="6.34" y1="17.66" x2="8.46" y2="19.54"></line><line x1="15.54" y1="8.46" x2="17.66" y2="6.34"></line></svg>
          Loading weather...
        </div>
      `;
      return;
    }

    // Weather SVGs based on icon type
    const getIconSvg = (name) => {
      if (name === 'sun') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--warning-color);"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      } else if (name === 'cloud-sun') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-secondary);"><path d="M12 2v2"></path><path d="M4.93 4.93l1.41 1.41"></path><path d="M20 10a8 8 0 0 0-16 0"></path><path d="M2 10h2"></path><path d="M14 17h6"></path><path d="M18.36 5.64l-1.41 1.41"></path></svg>`;
      } else if (name === 'cloud-rain' || name === 'cloud-showers-heavy') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-color);"><line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary);"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path></svg>`;
    };

    el.innerHTML = `
      <div class="glass-card" style="display: flex; align-items: center; gap: 12px; padding: 0.5rem 1rem; border-radius: 14px;">
        ${getIconSvg(this.weatherData.iconName)}
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: 700; font-size: 0.95rem;">${this.weatherData.temp}°C</span>
          <span style="font-size: 0.7rem; color: var(--text-secondary);">${this.weatherData.conditionText}</span>
        </div>
      </div>
    `;
  },

  renderWeatherError() {
    const el = document.getElementById('weather-card-container');
    if (!el) return;
    el.innerHTML = `
      <div style="font-size: 0.75rem; color: var(--text-muted);">Weather unavailable</div>
    `;
  },

  setupListeners() {
    // Quick Add Task listener
    const addBtn = document.getElementById('quick-add-task-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (this.onTabSwitch) this.onTabSwitch('tasks'); // jump to Tasks tab where modal or form resides
      });
    }

    // View Analytics listener
    const analyticsBtn = document.getElementById('view-analytics-btn');
    if (analyticsBtn) {
      analyticsBtn.addEventListener('click', () => {
        if (this.onTabSwitch) this.onTabSwitch('analytics');
      });
    }

    // Task Checkbox completion listeners
    const list = document.getElementById('dashboard-tasks-list');
    if (list) {
      list.querySelectorAll('.task-toggle-check').forEach(chk => {
        chk.addEventListener('change', async (e) => {
          const item = chk.closest('.task-item');
          const id = item.getAttribute('data-id');
          const tasks = await StorageService.getAllTasks();
          const task = tasks.find(t => t.id === Number(id));
          
          if (task) {
            task.status = chk.checked ? 'completed' : 'pending';
            await StorageService.updateTask(task);
            
            // Visual Updates
            if (chk.checked) {
              item.classList.add('completed');
              // Trigger confetti celebration!
              triggerConfetti(document.getElementById('dashboard-confetti-canvas'));
            } else {
              item.classList.remove('completed');
            }
            
            // Re-render dashboard stats after a brief delay
            setTimeout(() => this.render(), 1000);
          }
        });
      });
    }
  },

  getNextAlarm(alarms) {
    if (alarms.length === 0) return null;
    
    // Filter active alarms
    const activeAlarms = alarms.filter(a => a.active);
    if (activeAlarms.length === 0) return null;

    const now = new Date();
    const currentDay = (now.getDay() + 6) % 7; // Mon=0, Sun=6

    let soonestAlarm = null;
    let soonestTimeDiff = Infinity;

    activeAlarms.forEach(alarm => {
      const [hr, min] = alarm.time.split(':').map(Number);
      let alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hr, min, 0, 0);

      // Simple calculation of when this alarm will trigger next
      if (alarm.repeatDays && alarm.repeatDays.length > 0) {
        let found = false;
        let daysToAdd = 0;
        
        while (daysToAdd <= 7) {
          const checkDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          const dayIndex = (checkDate.getDay() + 6) % 7;
          
          if (alarm.repeatDays.includes(dayIndex)) {
            // Check if alarm time on that day is in the future
            const prospective = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), hr, min, 0, 0);
            if (prospective > now) {
              alarmDate = prospective;
              found = true;
              break;
            }
          }
          daysToAdd++;
        }
        if (!found) return; // shouldn't happen for repeating alarms
      } else {
        // Run once alarm
        if (alarmDate <= now) {
          alarmDate.setDate(alarmDate.getDate() + 1); // Tomorrow
        }
      }

      const diff = alarmDate - now;
      if (diff < soonestTimeDiff) {
        soonestTimeDiff = diff;
        soonestAlarm = {
          ...alarm,
          timeFormatted: alarmDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          targetHours: hr,
          targetMinutes: min,
          repeatDays: alarm.repeatDays
        };
      }
    });

    return soonestAlarm;
  },

  calculateStreak(history) {
    if (history.length === 0) return 0;
    
    // Sort logs descending
    const dismissedLogs = history
      .filter(h => h.action === 'dismissed' || h.action === 'completed')
      .map(h => new Date(h.timestamp).toDateString());
    
    const uniqueDates = [...new Set(dismissedLogs)];
    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    let checkDate = new Date();
    
    // Check backwards from today
    while (true) {
      if (uniqueDates.includes(checkDate.toDateString())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today is not completed yet, check if yesterday was.
        if (streak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (uniqueDates.includes(checkDate.toDateString())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    return streak;
  },

  startClockTicks() {
    const updateTime = () => {
      const now = new Date();
      const digTime = document.getElementById('dashboard-digital-time');
      const subDate = document.getElementById('dashboard-subtitle-date');
      
      if (digTime) {
        digTime.textContent = formatTime(now, this.settings.clockFormat24, this.settings.showSeconds);
      }
      if (subDate && now.getSeconds() === 0) {
        subDate.textContent = formatDate(now);
      }

      // Analog ticking
      const hr = now.getHours();
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const ms = now.getMilliseconds();
      
      const hrHand = document.getElementById('mini-hour-hand');
      const minHand = document.getElementById('mini-minute-hand');
      const secHand = document.getElementById('mini-second-hand');
      
      if (hrHand) hrHand.style.transform = `rotate(${(hr * 30) + (min / 2)}deg)`;
      if (minHand) minHand.style.transform = `rotate(${(min * 6) + (sec / 10)}deg)`;
      if (secHand) secHand.style.transform = `rotate(${(sec * 6) + (ms / 166.6)}deg)`;

      this.animationFrame = requestAnimationFrame(updateTime);
    };

    updateTime();
  },

  startCountdownLoop() {
    const updateCountdown = async () => {
      const container = document.getElementById('dashboard-next-alarm-countdown');
      if (!container) return;

      const alarms = await StorageService.getAllAlarms();
      const nextAlarmInfo = this.getNextAlarm(alarms);
      
      if (nextAlarmInfo) {
        container.textContent = getCountdownText(nextAlarmInfo.targetHours, nextAlarmInfo.targetMinutes, nextAlarmInfo.repeatDays);
      } else {
        container.textContent = 'None active';
      }
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
  },

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }
};
