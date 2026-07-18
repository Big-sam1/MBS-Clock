/* Smart Alarm Pro - Analog & Digital Clock Component */

import { formatTime, formatDate } from '../utils/helpers.js';

export const ClockComponent = {
  // Initialize elements
  init(containerEl, settings) {
    this.container = containerEl;
    this.settings = settings;
    
    // Default world timezones to display
    this.worldTimezones = [
      { name: 'London', tz: 'Europe/London' },
      { name: 'Tokyo', tz: 'Asia/Tokyo' },
      { name: 'New York', tz: 'America/New_York' }
    ];

    this.render();
    this.startTicks();
  },

  updateSettings(settings) {
    this.settings = settings;
    this.render();
  },

  render() {
    this.container.innerHTML = `
      <div class="view-title-container">
        <div>
          <h1 class="view-title">Clocks & Timezones</h1>
          <p class="view-subtitle">Monitor local time, world time, and timezone discrepancies</p>
        </div>
      </div>

      <div class="dashboard-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
        <!-- Local Time Display -->
        <div class="glass-panel" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 380px;">
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--accent-secondary); margin-bottom: 1rem; letter-spacing: 0.5px; text-transform: uppercase;">Local Time</h2>
          
          <div class="analog-clock-container">
            <div class="analog-clock" id="local-analog-clock">
              <div class="clock-face">
                <div class="clock-ticks" id="local-clock-ticks"></div>
                <div class="clock-number clock-number-12">12</div>
                <div class="clock-number clock-number-3">3</div>
                <div class="clock-number clock-number-6">6</div>
                <div class="clock-number clock-number-9">9</div>
                <div class="clock-hand hour-hand" id="local-hour-hand"></div>
                <div class="clock-hand minute-hand" id="local-minute-hand"></div>
                <div class="clock-hand second-hand" id="local-second-hand"></div>
                <div class="clock-center-dot"></div>
              </div>
            </div>
          </div>

          <div id="local-digital-time" class="glow-text" style="font-size: 2.5rem; font-weight: 800; margin-top: 1rem; letter-spacing: -1px;">00:00:00</div>
          <div id="local-digital-date" style="font-size: 1rem; color: var(--text-secondary); margin-top: 4px; font-weight: 500;">Saturday, 18 July 2026</div>
        </div>

        <!-- World Timezones List -->
        <div class="glass-panel" style="display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">World Clocks</h2>
            <button id="add-timezone-btn" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Zone
            </button>
          </div>

          <div id="world-clocks-list" style="display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex-grow: 1; max-height: 290px; padding-right: 4px;">
            <!-- Rendered by JS -->
          </div>
        </div>
      </div>

      <!-- Add Timezone Modal (Nested) -->
      <div id="add-timezone-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Add World Clock</h3>
            <span class="modal-close" id="close-tz-modal">&times;</span>
          </div>
          <div class="form-group">
            <label for="tz-label-input">Label (e.g. London, Paris)</label>
            <input type="text" id="tz-label-input" class="form-control" placeholder="Enter custom label">
          </div>
          <div class="form-group">
            <label for="tz-select-input">Select Timezone</label>
            <select id="tz-select-input" class="form-control">
              <option value="UTC">Coordinated Universal Time (UTC)</option>
              <option value="Europe/London">London, UK (BST/GMT)</option>
              <option value="Europe/Paris">Paris, France (CEST/CET)</option>
              <option value="Asia/Tokyo">Tokyo, Japan (JST)</option>
              <option value="Asia/Kolkata">Kolkata, India (IST)</option>
              <option value="America/New_York">New York, USA (EDT/EST)</option>
              <option value="America/Chicago">Chicago, USA (CDT/CST)</option>
              <option value="America/Denver">Denver, USA (MDT/MST)</option>
              <option value="America/Los_Angeles">Los Angeles, USA (PDT/PST)</option>
              <option value="Australia/Sydney">Sydney, Australia (AEST)</option>
              <option value="Africa/Johannesburg">Johannesburg, South Africa (SAST)</option>
              <option value="Asia/Dubai">Dubai, UAE (GST)</option>
            </select>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 1.5rem;">
            <button id="cancel-tz-btn" class="btn-secondary">Cancel</button>
            <button id="save-tz-btn" class="btn-primary">Add Clock</button>
          </div>
        </div>
      </div>
    `;

    this.renderTicks('local-clock-ticks');
    this.renderWorldClocks();
    this.setupListeners();
  },

  renderTicks(ticksContainerId) {
    const container = document.getElementById(ticksContainerId);
    if (!container) return;
    container.innerHTML = '';
    
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue; // Skip numbers locations
      const tick = document.createElement('div');
      tick.className = 'clock-tick';
      tick.style.transform = `rotate(${i * 6}deg)`;
      container.appendChild(tick);
    }
  },

  setupListeners() {
    const addBtn = document.getElementById('add-timezone-btn');
    const modal = document.getElementById('add-timezone-modal');
    const closeBtn = document.getElementById('close-tz-modal');
    const cancelBtn = document.getElementById('cancel-tz-btn');
    const saveBtn = document.getElementById('save-tz-btn');

    if (addBtn && modal) {
      addBtn.addEventListener('click', () => {
        document.getElementById('tz-label-input').value = '';
        modal.classList.add('active');
      });
    }

    const closeModal = () => modal && modal.classList.remove('active');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const label = document.getElementById('tz-label-input').value.trim();
        const tz = document.getElementById('tz-select-input').value;
        if (!label) return;

        this.worldTimezones.push({ name: label, tz });
        closeModal();
        this.renderWorldClocks();
      });
    }
  },

  renderWorldClocks() {
    const container = document.getElementById('world-clocks-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (this.worldTimezones.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No world clocks added.</div>`;
      return;
    }

    const now = new Date();

    this.worldTimezones.forEach((tzData, index) => {
      let timeStr = '';
      let dateStr = '';
      try {
        timeStr = now.toLocaleTimeString('en-US', {
          timeZone: tzData.tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: !this.settings.clockFormat24
        });
        
        dateStr = now.toLocaleDateString('en-US', {
          timeZone: tzData.tz,
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      } catch (e) {
        timeStr = '--:--:--';
        dateStr = 'Invalid Timezone';
      }

      // Find hours offset relative to local time
      let offsetText = '';
      try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tzData.tz, timeZoneName: 'short' });
        const localFormatter = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' });
        const tzParts = formatter.formatToParts(now);
        const localParts = localFormatter.formatToParts(now);
        const tzName = tzParts.find(p => p.type === 'timeZoneName')?.value || '';
        
        // Calculate hour offset
        const localTimeAtTz = new Date(now.toLocaleString('en-US', { timeZone: tzData.tz }));
        const diffHours = Math.round((localTimeAtTz - now) / (1000 * 60 * 60));
        
        offsetText = diffHours === 0 ? 'Same time' : (diffHours > 0 ? `+${diffHours} hrs` : `${diffHours} hrs`);
        offsetText += ` (${tzName})`;
      } catch (e) {}

      const card = document.createElement('div');
      card.className = 'glass-card';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';
      card.style.padding = '0.9rem 1.25rem';
      
      card.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 1rem;">${tzData.name}</span>
            <span style="font-size: 0.75rem; color: var(--accent-secondary); background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px;">${offsetText}</span>
          </div>
          <span style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="font-family: monospace; font-size: 1.35rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px;">${timeStr}</span>
          <button class="delete-tz-btn btn-icon" data-index="${index}" style="width: 32px; height: 32px; border-radius: 8px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: var(--danger-color);">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    // Add delete listeners
    container.querySelectorAll('.delete-tz-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = btn.getAttribute('data-index');
        this.worldTimezones.splice(index, 1);
        this.renderWorldClocks();
      });
    });
  },

  startTicks() {
    const updateTime = () => {
      const now = new Date();
      
      // Update local analog clock hands
      const hr = now.getHours();
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const ms = now.getMilliseconds();
      
      const hrHand = document.getElementById('local-hour-hand');
      const minHand = document.getElementById('local-minute-hand');
      const secHand = document.getElementById('local-second-hand');
      
      if (hrHand) hrHand.style.transform = `rotate(${(hr * 30) + (min / 2)}deg)`;
      if (minHand) minHand.style.transform = `rotate(${(min * 6) + (sec / 10)}deg)`;
      if (secHand) secHand.style.transform = `rotate(${(sec * 6) + (ms / 166.6)}deg)`; // fractional rotation for smooth movement

      // Update local digital text
      const digTime = document.getElementById('local-digital-time');
      const digDate = document.getElementById('local-digital-date');
      
      if (digTime) {
        digTime.textContent = formatTime(now, this.settings.clockFormat24, this.settings.showSeconds);
      }
      if (digDate) {
        digDate.textContent = formatDate(now, 'full');
      }

      // Update world time displays every second
      // To minimize render load, we just select and update time labels directly if they exist
      const worldList = document.getElementById('world-clocks-list');
      if (worldList && sec % 1 === 0) {
        const timeSpans = worldList.querySelectorAll('span[style*="font-family: monospace"]');
        timeSpans.forEach((span, index) => {
          const tzData = this.worldTimezones[index];
          if (tzData) {
            span.textContent = now.toLocaleTimeString('en-US', {
              timeZone: tzData.tz,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: !this.settings.clockFormat24
            });
          }
        });
      }

      requestAnimationFrame(updateTime);
    };

    updateTime();
  }
};
