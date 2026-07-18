/* Smart Alarm Pro - Calendar Component */

import { StorageService } from '../services/storage.js';

export const CalendarComponent = {
  async init(containerEl) {
    this.container = containerEl;
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.searchQuery = '';
    
    await this.render();
  },

  async render() {
    const alarms = await StorageService.getAllAlarms();
    const tasks = await StorageService.getAllTasks();

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthName = this.currentDate.toLocaleString('default', { month: 'long' });

    // Filter tasks & alarms by query if search exists
    const filteredTasks = this.searchQuery 
      ? tasks.filter(t => t.title.toLowerCase().includes(this.searchQuery.toLowerCase()) || (t.description && t.description.toLowerCase().includes(this.searchQuery.toLowerCase()))) 
      : tasks;
      
    const filteredAlarms = this.searchQuery 
      ? alarms.filter(a => a.title.toLowerCase().includes(this.searchQuery.toLowerCase()) || (a.description && a.description.toLowerCase().includes(this.searchQuery.toLowerCase()))) 
      : alarms;

    this.container.innerHTML = `
      <div class="view-title-container">
        <div>
          <h1 class="view-title">Calendar & Events</h1>
          <p class="view-subtitle">Organize and visualize tasks, routines, and alarm triggers</p>
        </div>
        <div style="display: flex; gap: 12px;">
          <input type="text" id="cal-search-input" class="form-control" placeholder="Search events..." value="${this.searchQuery}" style="width: 200px; padding: 0.5rem 0.85rem; font-size: 0.85rem;">
          <input type="date" id="cal-jump-input" class="form-control" style="width: 150px; padding: 0.5rem 0.85rem; font-size: 0.85rem;">
        </div>
      </div>

      <div class="calendar-main-layout" style="display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 1.5rem; flex-grow: 1;">
        
        <!-- Left: Month Grid Card -->
        <div class="glass-panel" style="display: flex; flex-direction: column;">
          
          <!-- Month Header Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 style="font-size: 1.25rem; font-weight: 800;">${monthName} ${year}</h2>
            <div style="display: flex; gap: 8px;">
              <button id="cal-prev-month" class="btn-icon" style="width: 34px; height: 34px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button id="cal-today" class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; border-radius: 8px;">Today</button>
              <button id="cal-next-month" class="btn-icon" style="width: 34px; height: 34px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>

          <!-- Calendar Grid -->
          <div style="display: flex; flex-direction: column; gap: 10px; flex-grow: 1; min-height: 280px;">
            <!-- Week Days Header -->
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: 700; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">
              <div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div><div>SUN</div>
            </div>
            
            <!-- Calendar Days Cells -->
            <div id="calendar-days-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; flex-grow: 1;">
              ${this.generateCalendarDays(year, month, filteredAlarms, filteredTasks)}
            </div>
          </div>
        </div>

        <!-- Right: Day Details / Agenda -->
        <div class="glass-panel" style="display: flex; flex-direction: column;">
          <h2 style="font-size: 1.15rem; font-weight: 700; color: var(--accent-secondary); margin-bottom: 1rem;" id="agenda-date-title">
            Agenda: ${this.selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </h2>
          
          <div id="calendar-agenda-list" style="display: flex; flex-direction: column; gap: 10px; flex-grow: 1; overflow-y: auto; max-height: 320px; padding-right: 4px;">
            ${this.generateAgendaItems(alarms, tasks)}
          </div>
        </div>

      </div>
    `;

    this.setupListeners();
  },

  generateCalendarDays(year, month, alarms, tasks) {
    const firstDay = new Date(year, month, 1);
    // Convert getDay() standard Sun-Sat (0-6) to Mon-Sun (0-6)
    let firstDayIndex = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    let html = '';
    const now = new Date();

    // 1. Previous month blank days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      html += `
        <div style="background: rgba(255,255,255,0.01); color: var(--text-muted); opacity: 0.3; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 8px; min-height: 52px; font-size: 0.8rem; font-weight: 600;">
          <span>${dayNum}</span>
        </div>
      `;
    }

    // 2. Current Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const tempDate = new Date(year, month, day);
      const isToday = tempDate.toDateString() === now.toDateString();
      const isSelected = tempDate.toDateString() === this.selectedDate.toDateString();
      
      // Determine dot indicator flags for active items
      const dateStr = tempDate.toISOString().split('T')[0];
      const hasTasks = tasks.some(t => t.dueDate === dateStr);
      
      // Check alarm schedule matches this day
      const dayIndex = (tempDate.getDay() + 6) % 7; // Mon=0, Sun=6
      const hasAlarms = alarms.some(a => {
        if (!a.active) return false;
        if (a.repeatDays && a.repeatDays.length > 0) {
          return a.repeatDays.includes(dayIndex);
        } else {
          // Simple single alarm date matching (optional, standard logic runs next date)
          return false;
        }
      });

      let cellStyle = `background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 8px; min-height: 52px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s;`;
      
      if (isToday) {
        cellStyle += `background: rgba(var(--accent-color-rgb), 0.1); border-color: var(--accent-color); color: var(--accent-color);`;
      }
      if (isSelected) {
        cellStyle += `box-shadow: 0 0 10px rgba(var(--accent-color-rgb), 0.3); border-color: var(--text-primary);`;
      }

      html += `
        <div class="cal-day-cell" data-date="${dateStr}" style="${cellStyle}">
          <span>${day}</span>
          <div style="display: flex; gap: 4px; justify-content: flex-end; margin-top: 4px;">
            ${hasAlarms ? `<span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-secondary); box-shadow: 0 0 4px var(--accent-secondary);"></span>` : ''}
            ${hasTasks ? `<span style="width: 6px; height: 6px; border-radius: 50%; background: var(--success-color); box-shadow: 0 0 4px var(--success-color);"></span>` : ''}
          </div>
        </div>
      `;
    }

    // 3. Next month blank days to fill grid (assuming 42 cells total)
    const totalCellsUsed = firstDayIndex + daysInMonth;
    const remainingCells = 42 - totalCellsUsed;
    for (let day = 1; day <= remainingCells; day++) {
      html += `
        <div style="background: rgba(255,255,255,0.01); color: var(--text-muted); opacity: 0.3; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 8px; min-height: 52px; font-size: 0.8rem; font-weight: 600;">
          <span>${day}</span>
        </div>
      `;
    }

    return html;
  },

  generateAgendaItems(alarms, tasks) {
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    const dayOfWeek = (this.selectedDate.getDay() + 6) % 7; // Mon=0, Sun=6

    // Filter alarms active on this weekday or single alarms today
    const dayAlarms = alarms.filter(a => {
      if (!a.active) return false;
      if (this.searchQuery && !a.title.toLowerCase().includes(this.searchQuery.toLowerCase())) return false;

      if (a.repeatDays && a.repeatDays.length > 0) {
        return a.repeatDays.includes(dayOfWeek);
      }
      return false; // Assuming single alarms fire today/tomorrow depending on clock time
    });

    const dayTasks = tasks.filter(t => {
      if (this.searchQuery && !t.title.toLowerCase().includes(this.searchQuery.toLowerCase())) return false;
      return t.dueDate === dateStr;
    });

    if (dayAlarms.length === 0 && dayTasks.length === 0) {
      return `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px; opacity: 0.6;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <p style="font-size: 0.85rem;">Nothing scheduled for this day.</p>
        </div>
      `;
    }

    let html = '';

    // Render Alarms
    dayAlarms.forEach(alarm => {
      html += `
        <div class="glass-card" style="border-left: 3px solid var(--accent-secondary); padding: 0.8rem 1rem; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; font-size: 0.9rem;">${alarm.title}</span>
              <span class="badge-category cat-${alarm.category.toLowerCase()}" style="font-size: 0.6rem; padding: 1px 4px;">Alarm</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">${alarm.description || 'No notes'}</span>
          </div>
          <span style="font-weight: 700; font-family: monospace; font-size: 1.15rem; color: var(--accent-secondary);">${alarm.time}</span>
        </div>
      `;
    });

    // Render Tasks
    dayTasks.forEach(task => {
      const isCompleted = task.status === 'completed';
      html += `
        <div class="glass-card" style="border-left: 3px solid var(--success-color); padding: 0.8rem 1rem; display: flex; justify-content: space-between; align-items: center; opacity: ${isCompleted ? 0.6 : 1};">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; font-size: 0.9rem; text-decoration: ${isCompleted ? 'line-through' : 'none'};">${task.title}</span>
              <span class="badge-category cat-${task.category.toLowerCase()}" style="font-size: 0.6rem; padding: 1px 4px;">${task.category}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">${task.description || 'No description'}</span>
          </div>
          <span style="font-weight: 700; font-family: monospace; font-size: 0.9rem; color: var(--success-color);">${task.dueTime || 'All-day'}</span>
        </div>
      `;
    });

    return html;
  },

  setupListeners() {
    // Month navigation
    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    });

    document.getElementById('cal-next-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    });

    document.getElementById('cal-today')?.addEventListener('click', () => {
      this.currentDate = new Date();
      this.selectedDate = new Date();
      this.render();
    });

    // Day cell click selector
    this.container.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        this.selectedDate = new Date(dateStr);
        this.render(); // Redraw with selected active highlight and agenda updates
      });
    });

    // Jump-to-date input listener
    const jumpInput = document.getElementById('cal-jump-input');
    if (jumpInput) {
      jumpInput.addEventListener('change', () => {
        if (!jumpInput.value) return;
        const target = new Date(jumpInput.value);
        this.currentDate = new Date(target.getFullYear(), target.getMonth(), 1);
        this.selectedDate = target;
        this.render();
      });
    }

    // Search events live filter
    const searchInput = document.getElementById('cal-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value;
        // Don't redial whole month to avoid losing focus, or just re-render cleanly
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.render(), 300);
      });
      // Maintain input focus cursor position
      searchInput.focus();
      const val = searchInput.value;
      searchInput.value = '';
      searchInput.value = val;
    }
  }
};
