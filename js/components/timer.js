/* Smart Alarm Pro - Stopwatch, Countdown & Pomodoro Component */

import { AudioServiceInstance } from '../services/audioService.js';
import { VoiceServiceInstance } from '../services/voiceService.js';

export const TimerComponent = {
  init(containerEl) {
    this.container = containerEl;
    this.activeTab = 'stopwatch'; // 'stopwatch', 'countdown', 'pomodoro'
    
    // 1. Stopwatch State
    this.swTime = 0; // ms
    this.swInterval = null;
    this.swRunning = false;
    this.swLaps = [];
    this.swLastTime = 0;

    // 2. Countdown State
    this.cdTotal = 0; // seconds
    this.cdRemaining = 0; // seconds
    this.cdInterval = null;
    this.cdRunning = false;
    this.cdInputs = { hrs: 0, mins: 0, secs: 0 };

    // 3. Pomodoro State
    this.pomoMode = 'focus'; // 'focus', 'short-break', 'long-break'
    this.pomoRemaining = 25 * 60; // seconds
    this.pomoInterval = null;
    this.pomoRunning = false;
    this.pomoCycleCount = 0;
    this.pomoAmbientSound = 'none';

    this.render();
  },

  render() {
    this.container.innerHTML = `
      <div class="view-title-container">
        <div>
          <h1 class="view-title">Stopwatch & Focus</h1>
          <p class="view-subtitle">Monitor activities, configure timers, or launch focus sessions</p>
        </div>
        
        <!-- Tab Swapper -->
        <div style="display: flex; background: var(--glass-bg); padding: 4px; border-radius: 12px; border: 1px solid var(--glass-border);">
          <button class="cal-tab-btn ${this.activeTab === 'stopwatch' ? 'active' : ''}" data-tab="stopwatch" style="${this.getTabBtnStyle(this.activeTab === 'stopwatch')}">Stopwatch</button>
          <button class="cal-tab-btn ${this.activeTab === 'countdown' ? 'active' : ''}" data-tab="countdown" style="${this.getTabBtnStyle(this.activeTab === 'countdown')}">Countdown</button>
          <button class="cal-tab-btn ${this.activeTab === 'pomodoro' ? 'active' : ''}" data-tab="pomodoro" style="${this.getTabBtnStyle(this.activeTab === 'pomodoro')}">Pomodoro Focus</button>
        </div>
      </div>

      <div class="timer-split-layout" style="display: grid; grid-template-columns: 1.4fr 1.6fr; gap: 2rem; flex-grow: 1; align-items: start;">
        
        <!-- Left Pane: Radial/Digi Timer View -->
        <div class="glass-panel" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; position: relative;">
          ${this.renderTimerDisplay()}
        </div>

        <!-- Right Pane: Controls/Lap history/Pomo details -->
        <div class="glass-panel" style="min-height: 400px; display: flex; flex-direction: column;">
          ${this.renderTimerControls()}
        </div>

      </div>
    `;

    this.setupListeners();
  },

  getTabBtnStyle(isActive) {
    return `
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      font-family: var(--font-family);
      background: ${isActive ? 'var(--accent-color)' : 'transparent'};
      color: ${isActive ? '#ffffff' : 'var(--text-secondary)'};
      box-shadow: ${isActive ? '0 4px 10px var(--accent-glow)' : 'none'};
      transition: all var(--transition-speed);
    `;
  },

  renderTimerDisplay() {
    if (this.activeTab === 'stopwatch') {
      const formatSW = (totalMs) => {
        const ms = Math.floor((totalMs % 1000) / 10);
        const s = Math.floor((totalMs / 1000) % 60);
        const m = Math.floor((totalMs / (1000 * 60)) % 60);
        const h = Math.floor(totalMs / (1000 * 60 * 60));
        
        const hStr = h > 0 ? String(h).padStart(2, '0') + ':' : '';
        return `${hStr}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}<span class="timer-digits-ms">.${String(ms).padStart(2, '0')}</span>`;
      };

      return `
        <div class="timer-radial-wrapper" style="border: 4px solid var(--glass-border); border-radius: 50%; width: 220px; height: 220px; display:flex; justify-content:center; align-items:center; box-shadow: var(--card-shadow);">
          <div class="timer-digits-container">
            <span class="timer-digits" id="sw-digits-el">${formatSW(this.swTime)}</span>
            <span class="timer-label">Stopwatch</span>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'countdown') {
      const pct = this.cdTotal > 0 ? (this.cdRemaining / this.cdTotal) * 691 : 691;
      
      const formatCD = (sec) => {
        const s = sec % 60;
        const m = Math.floor((sec / 60) % 60);
        const h = Math.floor(sec / 3600);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      return `
        <div class="timer-radial-wrapper">
          <svg class="timer-svg" viewBox="0 0 240 240">
            <circle class="timer-track" cx="120" cy="120" r="110"></circle>
            <circle class="timer-progress" id="cd-progress-ring" cx="120" cy="120" r="110" style="stroke-dashoffset: ${pct};"></circle>
          </svg>
          <div class="timer-digits-container">
            <span class="timer-digits" id="cd-digits-el">${formatCD(this.cdRemaining)}</span>
            <span class="timer-label">Countdown</span>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'pomodoro') {
      const modeTimes = { 'focus': 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };
      const maxTime = modeTimes[this.pomoMode];
      const pct = (this.pomoRemaining / maxTime) * 691;

      const formatPomo = (sec) => {
        const s = sec % 60;
        const m = Math.floor(sec / 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      const labels = { 'focus': 'Focus Session', 'short-break': 'Short Break', 'long-break': 'Long Break' };

      return `
        <div class="timer-radial-wrapper">
          <svg class="timer-svg" viewBox="0 0 240 240">
            <circle class="timer-track" cx="120" cy="120" r="110"></circle>
            <circle class="timer-progress" id="pomo-progress-ring" cx="120" cy="120" r="110" style="stroke-dashoffset: ${pct}; stroke: ${this.pomoMode === 'focus' ? 'var(--accent-color)' : 'var(--success-color)'};"></circle>
          </svg>
          <div class="timer-digits-container">
            <span class="timer-digits" id="pomo-digits-el">${formatPomo(this.pomoRemaining)}</span>
            <span class="timer-label" id="pomo-mode-label-el">${labels[this.pomoMode]}</span>
          </div>
        </div>
      `;
    }
  },

  renderTimerControls() {
    if (this.activeTab === 'stopwatch') {
      return `
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Laps & Records</h2>
        
        <!-- Controls Buttons -->
        <div style="display: flex; gap: 12px; margin-bottom: 1.5rem;">
          <button id="sw-start-stop" class="btn-primary" style="flex-grow: 1; background: ${this.swRunning ? 'var(--danger-color)' : 'var(--accent-color)'}; box-shadow: 0 4px 15px ${this.swRunning ? 'var(--danger-glow)' : 'var(--accent-glow)'};">
            ${this.swRunning ? 'Pause' : 'Start'}
          </button>
          <button id="sw-lap-reset" class="btn-secondary" style="width: 100px;">
            ${this.swRunning ? 'Lap' : 'Reset'}
          </button>
        </div>

        <!-- Laps List -->
        <div style="flex-grow: 1; display: flex; flex-direction: column; overflow-y: auto; max-height: 250px; padding-right: 4px;">
          <div style="display: grid; grid-template-columns: 80px 1fr 1fr; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px; font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-align: right;">
            <div style="text-align: left;">LAP</div>
            <div>LAP TIME</div>
            <div>TOTAL TIME</div>
          </div>
          <div id="sw-laps-container" style="display: flex; flex-direction: column; gap: 8px;">
            ${this.renderLapsList()}
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'countdown') {
      return `
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Setup Countdown</h2>
        
        <!-- Input fields (H/M/S) -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 1.5rem;" id="cd-setup-inputs">
          <div class="form-group" style="margin: 0;">
            <label>Hours</label>
            <select id="cd-input-hours" class="form-control" ${this.cdRunning ? 'disabled' : ''}>
              ${Array.from({length: 24}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label>Minutes</label>
            <select id="cd-input-minutes" class="form-control" ${this.cdRunning ? 'disabled' : ''}>
              ${Array.from({length: 60}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label>Seconds</label>
            <select id="cd-input-seconds" class="form-control" ${this.cdRunning ? 'disabled' : ''}>
              ${Array.from({length: 60}, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 1.5rem;">
          <button id="cd-start-stop" class="btn-primary" style="flex-grow: 1; background: ${this.cdRunning ? 'var(--danger-color)' : 'var(--accent-color)'}; box-shadow: 0 4px 15px ${this.cdRunning ? 'var(--danger-glow)' : 'var(--accent-glow)'};">
            ${this.cdRunning ? 'Pause' : 'Start Timer'}
          </button>
          <button id="cd-reset" class="btn-secondary" style="width: 100px;">Reset</button>
        </div>

        <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
          <strong>Tip:</strong> An announcement and synthesized chord chime will play upon timer completion, working completely offline.
        </div>
      `;
    }

    if (this.activeTab === 'pomodoro') {
      return `
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Pomodoro Focus</h2>
        <span style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1.5rem; display: block;">Cycle completed: <strong id="pomo-cycles-el">${this.pomoCycleCount}</strong> / 4</span>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 1.5rem;">
          <button class="btn-secondary pomo-mode-btn" data-mode="focus" style="padding: 0.5rem 0; font-size: 0.75rem; border-color: ${this.pomoMode === 'focus' ? 'var(--accent-color)' : 'var(--glass-border)'};">25m Focus</button>
          <button class="btn-secondary pomo-mode-btn" data-mode="short-break" style="padding: 0.5rem 0; font-size: 0.75rem; border-color: ${this.pomoMode === 'short-break' ? 'var(--success-color)' : 'var(--glass-border)'};">5m Break</button>
          <button class="btn-secondary pomo-mode-btn" data-mode="long-break" style="padding: 0.5rem 0; font-size: 0.75rem; border-color: ${this.pomoMode === 'long-break' ? 'var(--glass-border)' : 'var(--glass-border)'};">15m Break</button>
        </div>

        <!-- Ambient sound options -->
        <div class="form-group" style="margin-bottom: 1.5rem;">
          <label for="pomo-ambient-sound">Ambient Focus Sounds (Synthesized)</label>
          <select id="pomo-ambient-sound" class="form-control">
            <option value="none" ${this.pomoAmbientSound === 'none' ? 'selected' : ''}>None</option>
            <option value="ocean" ${this.pomoAmbientSound === 'ocean' ? 'selected' : ''}>Ocean Waves</option>
            <option value="rain" ${this.pomoAmbientSound === 'rain' ? 'selected' : ''}>Gentle Rain</option>
            <option value="forest" ${this.pomoAmbientSound === 'forest' ? 'selected' : ''}>Forest Wind</option>
            <option value="meditation" ${this.pomoAmbientSound === 'meditation' ? 'selected' : ''}>Theta Meditation Beats</option>
          </select>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 1.5rem;">
          <button id="pomo-start-stop" class="btn-primary" style="flex-grow: 1; background: ${this.pomoRunning ? 'var(--danger-color)' : 'var(--accent-color)'}; box-shadow: 0 4px 15px ${this.pomoRunning ? 'var(--danger-glow)' : 'var(--accent-glow)'};">
            ${this.pomoRunning ? 'Pause Session' : 'Start Focus'}
          </button>
          <button id="pomo-reset" class="btn-secondary" style="width: 100px;">Reset</button>
        </div>
      `;
    }
  },

  renderLapsList() {
    if (this.swLaps.length === 0) {
      return `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 2rem;">No laps recorded.</div>`;
    }

    const formatLapTime = (totalMs) => {
      const ms = Math.floor((totalMs % 1000) / 10);
      const s = Math.floor((totalMs / 1000) % 60);
      const m = Math.floor((totalMs / (1000 * 60)) % 60);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    };

    return this.swLaps.map((lap, index) => {
      return `
        <div style="display: grid; grid-template-columns: 80px 1fr 1fr; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.05); text-align: right;">
          <div style="text-align: left; font-weight: 700; color: var(--text-muted);">#${this.swLaps.length - index}</div>
          <div style="font-family: monospace;">${formatLapTime(lap.lapTime)}</div>
          <div style="font-family: monospace; color: var(--text-secondary);">${formatLapTime(lap.totalTime)}</div>
        </div>
      `;
    }).join('');
  },

  setupListeners() {
    // 1. Tab switches
    this.container.querySelectorAll('.cal-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Stop any running intervals before swapping to clear memory
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
      });
    });

    // 2. Stopwatch Actions
    const swStartStop = document.getElementById('sw-start-stop');
    const swLapReset = document.getElementById('sw-lap-reset');

    if (swStartStop) {
      swStartStop.addEventListener('click', () => {
        if (this.swRunning) {
          // Pause
          this.swRunning = false;
          clearInterval(this.swInterval);
        } else {
          // Start
          this.swRunning = true;
          const startTime = Date.now() - this.swTime;
          this.swInterval = setInterval(() => {
            this.swTime = Date.now() - startTime;
            const digits = document.getElementById('sw-digits-el');
            if (digits) {
              const ms = Math.floor((this.swTime % 1000) / 10);
              const s = Math.floor((this.swTime / 1000) % 60);
              const m = Math.floor((this.swTime / (1000 * 60)) % 60);
              const h = Math.floor(this.swTime / (1000 * 60 * 60));
              const hStr = h > 0 ? String(h).padStart(2, '0') + ':' : '';
              digits.innerHTML = `${hStr}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}<span class="timer-digits-ms">.${String(ms).padStart(2, '0')}</span>`;
            }
          }, 47); // ~20 FPS display update is efficient enough
        }
        this.render(); // update buttons labels
      });
    }

    if (swLapReset) {
      swLapReset.addEventListener('click', () => {
        if (this.swRunning) {
          // Record lap
          const totalTime = this.swTime;
          const lapTime = totalTime - this.swLastTime;
          this.swLastTime = totalTime;
          
          this.swLaps.unshift({ lapTime, totalTime });
          
          const lapsContainer = document.getElementById('sw-laps-container');
          if (lapsContainer) {
            lapsContainer.innerHTML = this.renderLapsList();
          }
        } else {
          // Reset
          this.swTime = 0;
          this.swLastTime = 0;
          this.swLaps = [];
          this.render();
        }
      });
    }

    // 3. Countdown Actions
    const cdStartStop = document.getElementById('cd-start-stop');
    const cdReset = document.getElementById('cd-reset');

    if (cdStartStop) {
      cdStartStop.addEventListener('click', () => {
        if (this.cdRunning) {
          // Pause
          this.cdRunning = false;
          clearInterval(this.cdInterval);
          this.render();
        } else {
          // Start
          if (this.cdRemaining === 0) {
            // Read inputs
            const hrs = Number(document.getElementById('cd-input-hours').value) || 0;
            const mins = Number(document.getElementById('cd-input-minutes').value) || 0;
            const secs = Number(document.getElementById('cd-input-seconds').value) || 0;
            
            this.cdTotal = (hrs * 3600) + (mins * 60) + secs;
            this.cdRemaining = this.cdTotal;
            this.cdInputs = { hrs, mins, secs };
          }
          
          if (this.cdRemaining <= 0) return; // ignore empty timer starts

          this.cdRunning = true;
          this.cdInterval = setInterval(() => {
            this.cdRemaining--;

            // Update DOM digits and ring dynamically without re-render
            const digits = document.getElementById('cd-digits-el');
            const ring = document.getElementById('cd-progress-ring');
            
            if (digits) {
              const s = this.cdRemaining % 60;
              const m = Math.floor((this.cdRemaining / 60) % 60);
              const h = Math.floor(this.cdRemaining / 3600);
              digits.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }

            if (ring && this.cdTotal > 0) {
              const offset = (this.cdRemaining / this.cdTotal) * 691;
              ring.style.strokeDashoffset = offset;
            }

            if (this.cdRemaining <= 0) {
              // Timer Finished!
              this.cdRunning = false;
              clearInterval(this.cdInterval);
              
              // Trigger Alert Sounds
              AudioServiceInstance.play('bell', 0.8, false);
              VoiceServiceInstance.speak('Countdown completed!');

              this.render();
            }
          }, 1000);
          
          this.render();
        }
      });
    }

    if (cdReset) {
      cdReset.addEventListener('click', () => {
        this.cdRunning = false;
        clearInterval(this.cdInterval);
        this.cdRemaining = 0;
        this.cdTotal = 0;
        this.render();
      });
    }

    // 4. Pomodoro Focus Actions
    const pomoStartStop = document.getElementById('pomo-start-stop');
    const pomoReset = document.getElementById('pomo-reset');
    const ambientSelect = document.getElementById('pomo-ambient-sound');

    if (ambientSelect) {
      ambientSelect.addEventListener('change', () => {
        this.pomoAmbientSound = ambientSelect.value;
        if (this.pomoRunning) {
          // Restart/apply ambient sound dynamically
          this.playPomoAmbient();
        }
      });
    }

    if (pomoStartStop) {
      pomoStartStop.addEventListener('click', () => {
        if (this.pomoRunning) {
          // Pause pomo
          this.pomoRunning = false;
          clearInterval(this.pomoInterval);
          AudioServiceInstance.stop(); // Stop ambient sound
          this.render();
        } else {
          // Start pomo
          this.pomoRunning = true;
          this.playPomoAmbient();

          this.pomoInterval = setInterval(() => {
            this.pomoRemaining--;

            // Update DOM directly for smooth rendering
            const digits = document.getElementById('pomo-digits-el');
            const ring = document.getElementById('pomo-progress-ring');
            
            if (digits) {
              const s = this.pomoRemaining % 60;
              const m = Math.floor(this.pomoRemaining / 60);
              digits.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }

            const modeTimes = { 'focus': 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };
            const maxTime = modeTimes[this.pomoMode];
            if (ring) {
              const offset = (this.pomoRemaining / maxTime) * 691;
              ring.style.strokeDashoffset = offset;
            }

            if (this.pomoRemaining <= 0) {
              // Cycle finished
              this.pomoRunning = false;
              clearInterval(this.pomoInterval);
              AudioServiceInstance.stop(); // Stop ambient sounds

              // Triggers alert
              AudioServiceInstance.play('bell', 0.8, false);
              
              if (this.pomoMode === 'focus') {
                VoiceServiceInstance.speak('Focus session completed. Take a break.');
                this.pomoCycleCount++;
                // auto-switch to short-break or long-break
                this.pomoMode = this.pomoCycleCount % 4 === 0 ? 'long-break' : 'short-break';
                this.pomoRemaining = this.pomoMode === 'long-break' ? 15 * 60 : 5 * 60;
              } else {
                VoiceServiceInstance.speak('Break is over. Time to focus.');
                this.pomoMode = 'focus';
                this.pomoRemaining = 25 * 60;
              }
              
              this.render();
            }
          }, 1000);
          
          this.render();
        }
      });
    }

    if (pomoReset) {
      pomoReset.addEventListener('click', () => {
        this.pomoRunning = false;
        clearInterval(this.pomoInterval);
        AudioServiceInstance.stop();
        
        const modeTimes = { 'focus': 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };
        this.pomoRemaining = modeTimes[this.pomoMode];
        this.render();
      });
    }

    // Pomodoro Mode Manual Buttons
    this.container.querySelectorAll('.pomo-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.pomoRunning) return; // prevent updates during session
        
        this.pomoMode = btn.getAttribute('data-mode');
        const modeTimes = { 'focus': 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };
        this.pomoRemaining = modeTimes[this.pomoMode];
        this.render();
      });
    });
  },

  playPomoAmbient() {
    if (this.pomoAmbientSound !== 'none') {
      // Loop ambient sound continuously through synthesiser
      AudioServiceInstance.play(this.pomoAmbientSound, 0.4, true);
    } else {
      AudioServiceInstance.stop();
    }
  },

  destroy() {
    if (this.swInterval) clearInterval(this.swInterval);
    if (this.cdInterval) clearInterval(this.cdInterval);
    if (this.pomoInterval) clearInterval(this.pomoInterval);
    AudioServiceInstance.stop();
  }
};
