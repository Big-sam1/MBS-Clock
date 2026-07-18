/* Smart Alarm Pro - Productivity Analytics & Habit Tracker */

import { StorageService } from '../services/storage.js';
import { triggerConfetti } from '../utils/helpers.js';

export const AnalyticsComponent = {
  async init(containerEl) {
    this.container = containerEl;
    await this.render();
  },

  async render() {
    const tasks = await StorageService.getAllTasks();
    const history = await StorageService.getHistory();
    const habits = await StorageService.getAllHabits();

    // 1. Calculate general stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 2. Format weekly chart data (last 7 days completed tasks)
    const chartData = this.getWeeklyStats(tasks);

    this.container.innerHTML = `
      <canvas id="analytics-confetti-canvas" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:999;"></canvas>

      <div class="view-title-container">
        <div>
          <h1 class="view-title">Analytics & Habits</h1>
          <p class="view-subtitle">Monitor goals, review completion trends, and check recurring routines</p>
        </div>
      </div>

      <div class="dashboard-grid" style="display: grid; grid-template-columns: 1.5fr 1.5fr; gap: 1.5rem; flex-grow: 1;">
        
        <!-- Left: Completion Stats & SVG Charts -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <!-- Summary Row Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div class="glass-panel" style="padding: 1.25rem; text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">Completed</span>
              <div style="font-size: 1.75rem; font-weight: 800; color: var(--success-color); margin-top: 4px;">${completedTasks}</div>
            </div>
            <div class="glass-panel" style="padding: 1.25rem; text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">Pending</span>
              <div style="font-size: 1.75rem; font-weight: 800; color: var(--accent-secondary); margin-top: 4px;">${pendingTasks}</div>
            </div>
            <div class="glass-panel" style="padding: 1.25rem; text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">Success Rate</span>
              <div style="font-size: 1.75rem; font-weight: 800; color: var(--warning-color); margin-top: 4px;">${completionRate}%</div>
            </div>
          </div>

          <!-- Weekly Completion SVG Chart -->
          <div class="glass-panel" style="flex-grow: 1; display: flex; flex-direction: column;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1.5rem;">Weekly Accomplishments</h3>
            
            <div class="analytics-chart-container">
              ${this.drawSVGChart(chartData)}
            </div>
          </div>

        </div>

        <!-- Right: Habit Tracker Grid -->
        <div class="glass-panel" style="display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 style="font-size: 1.25rem; font-weight: 800;">Routine Habits</h2>
            <button id="add-habit-btn" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem; border-radius: 10px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Habit
            </button>
          </div>

          <!-- Habits Grid List -->
          <div id="habits-list-container" style="display: flex; flex-direction: column; gap: 16px; flex-grow: 1; overflow-y: auto; max-height: 380px; padding-right: 4px;">
            ${this.renderHabits(habits)}
          </div>
        </div>

      </div>

      <!-- Add Habit Modal -->
      <div id="add-habit-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Track New Habit</h3>
            <span class="modal-close" id="close-habit-modal">&times;</span>
          </div>
          <div class="form-group">
            <label for="habit-title-input">Habit Name (e.g. Read, Exercise, Hydrate)</label>
            <input type="text" id="habit-title-input" class="form-control" placeholder="Enter habit title">
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 1.5rem;">
            <button id="cancel-habit-btn" class="btn-secondary">Cancel</button>
            <button id="save-habit-btn" class="btn-primary">Create Habit</button>
          </div>
        </div>
      </div>
    `;

    this.setupListeners();
  },

  getWeeklyStats(tasks) {
    const data = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Fill last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = tasks.filter(t => t.dueDate === dateStr && t.status === 'completed').length;
      data.push({
        label: days[d.getDay()],
        value: count
      });
    }
    return data;
  },

  drawSVGChart(data) {
    const maxVal = Math.max(...data.map(d => d.value), 4); // baseline max height
    const chartHeight = 160;
    const chartWidth = 350;
    
    // Draw bar nodes inside SVG
    const barsHtml = data.map((d, index) => {
      const x = 30 + index * 45;
      const barHeight = (d.value / maxVal) * (chartHeight - 40);
      const y = chartHeight - 30 - barHeight;
      
      return `
        <!-- Bar shadow/glow -->
        <rect x="${x}" y="${y}" width="20" height="${barHeight}" rx="4" fill="url(#chart-glow-grad)" style="opacity: 0.15; filter: blur(4px);"/>
        <!-- Front Bar -->
        <rect x="${x}" y="${y}" width="20" height="${barHeight}" rx="4" fill="url(#chart-bar-grad)"/>
        <!-- Text Label -->
        <text x="${x + 10}" y="${chartHeight - 10}" fill="var(--text-secondary)" font-size="10" font-weight="700" text-anchor="middle">${d.label}</text>
        <!-- Value Label -->
        <text x="${x + 10}" y="${y - 6}" fill="var(--text-primary)" font-size="10" font-weight="bold" text-anchor="middle">${d.value}</text>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" style="width: 100%; height: 100%; overflow: visible;">
        <defs>
          <linearGradient id="chart-bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent-secondary)"/>
            <stop offset="100%" stop-color="var(--accent-color)"/>
          </linearGradient>
          <linearGradient id="chart-glow-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent-secondary)"/>
            <stop offset="100%" stop-color="var(--accent-color)"/>
          </linearGradient>
        </defs>
        
        <!-- Y Grid lines -->
        <line x1="20" y1="20" x2="${chartWidth}" y2="20" stroke="rgba(255,255,255,0.03)" stroke-dasharray="4"/>
        <line x1="20" y1="70" x2="${chartWidth}" y2="70" stroke="rgba(255,255,255,0.03)" stroke-dasharray="4"/>
        <line x1="20" y1="120" x2="${chartWidth}" y2="120" stroke="rgba(255,255,255,0.03)" stroke-dasharray="4"/>
        <line x1="20" y1="130" x2="${chartWidth}" y2="130" stroke="rgba(255,255,255,0.08)"/>

        ${barsHtml}
      </svg>
    `;
  },

  renderHabits(habits) {
    if (habits.length === 0) {
      return `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px; opacity: 0.6;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          <p style="font-size: 0.9rem; font-weight:600;">No routines added. Track your first habit!</p>
        </div>
      `;
    }

    // Get last 7 date strings (Mon-Sun headers)
    const dates = [];
    const dateLabels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
      dateLabels.push(d.toLocaleString('default', { weekday: 'narrow' }));
    }

    return habits.map(habit => {
      // Calculate current streak
      const streak = this.calculateHabitStreak(habit.history || []);

      const dayBubbles = dates.map(dateStr => {
        const isCompleted = (habit.history || []).includes(dateStr);
        const bubbleStyle = isCompleted 
          ? `background: var(--success-color); border:none; box-shadow: 0 0 8px var(--success-glow);` 
          : `background: rgba(255,255,255,0.02); border: 1.5px dashed var(--glass-border);`;

        return `
          <div class="habit-circle ${isCompleted ? 'completed' : ''}" 
               data-date="${dateStr}" 
               data-habit-id="${habit.id}"
               style="${bubbleStyle}">
          </div>
        `;
      }).join('');

      return `
        <div class="glass-card" style="display: flex; flex-direction: column; gap: 12px; padding: 1rem 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-weight: 700; font-size: 1rem;">${habit.title}</span>
              <span style="font-size: 0.75rem; color: var(--warning-color); font-weight: 600;">${streak} Day Streak 🔥</span>
            </div>
            
            <button class="delete-habit-btn btn-icon" data-id="${habit.id}" style="width: 28px; height: 28px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: var(--danger-color);">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>

          <!-- Weekly grid dots -->
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; align-items: center; gap: 8px;">
            ${dateLabels.map(l => `<span style="font-size: 0.65rem; font-weight: 700; color: var(--text-muted);">${l}</span>`).join('')}
            ${dayBubbles}
          </div>
        </div>
      `;
    }).join('');
  },

  calculateHabitStreak(history) {
    if (history.length === 0) return 0;
    
    let streak = 0;
    let checkDate = new Date();

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (history.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today is not checked, check yesterday
        if (streak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = checkDate.toISOString().split('T')[0];
          if (history.includes(yesterdayStr)) {
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

  setupListeners() {
    // Open Habit Modal
    const addBtn = document.getElementById('add-habit-btn');
    const modal = document.getElementById('add-habit-modal');
    const closeBtn = document.getElementById('close-habit-modal');
    const cancelBtn = document.getElementById('cancel-habit-btn');
    const saveBtn = document.getElementById('save-habit-btn');

    if (addBtn && modal) {
      addBtn.addEventListener('click', () => {
        document.getElementById('habit-title-input').value = '';
        modal.classList.add('active');
      });
    }

    const closeModal = () => modal && modal.classList.remove('active');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const title = document.getElementById('habit-title-input').value.trim();
        if (!title) return;

        await StorageService.addHabit({
          title,
          history: []
        });

        closeModal();
        this.render();
      });
    }

    // Delete Habit Listener
    this.container.querySelectorAll('.delete-habit-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        await StorageService.deleteHabit(id);
        this.render();
      });
    });

    // Check habit bubble toggles
    this.container.querySelectorAll('.habit-circle').forEach(circle => {
      circle.addEventListener('click', async () => {
        const habitId = circle.getAttribute('data-habit-id');
        const dateStr = circle.getAttribute('data-date');
        
        const habits = await StorageService.getAllHabits();
        const habit = habits.find(h => h.id === Number(habitId));
        
        if (habit) {
          if (!habit.history) habit.history = [];
          
          const index = habit.history.indexOf(dateStr);
          if (index > -1) {
            // Uncheck
            habit.history.splice(index, 1);
          } else {
            // Check!
            habit.history.push(dateStr);
            triggerConfetti(document.getElementById('analytics-confetti-canvas'));
          }

          await StorageService.updateHabit(habit);
          this.render();
        }
      });
    });
  }
};
