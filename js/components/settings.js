/* Smart Alarm Pro - Settings Panel Component */

import { StorageService } from '../services/storage.js';
import { VoiceServiceInstance } from '../services/voiceService.js';
import { generateQR } from '../utils/helpers.js';

export const SettingsComponent = {
  init(containerEl, settings, onSettingsChange) {
    this.container = containerEl;
    this.settings = settings;
    this.onSettingsChange = onSettingsChange;

    this.render();
  },

  render() {
    // Generate voices list
    const voices = VoiceServiceInstance.getVoices();
    const voiceOptions = voices.map(v => {
      const isSelected = v.name === this.settings.voiceName ? 'selected' : '';
      return `<option value="${v.name}" ${isSelected}>${v.name} (${v.lang})</option>`;
    }).join('');

    this.container.innerHTML = `
      <div class="view-title-container">
        <div>
          <h1 class="view-title">System Settings</h1>
          <p class="view-subtitle">Customize preferences, theme appearances, and speech engines</p>
        </div>
      </div>

      <div class="settings-grid" style="display: grid; grid-template-columns: 1.6fr 1.4fr; gap: 1.5rem; flex-grow: 1; align-items: start;">
        
        <!-- Left: Preferences Form -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <!-- General Preferences Card -->
          <div class="glass-panel" style="display: flex; flex-direction: column; gap: 16px;">
            <h2 style="font-size: 1.15rem; font-weight: 700; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">Time & Formats</h2>
            
            <div class="switch-control">
              <div>
                <strong style="display: block; font-size: 0.9rem;">24-Hour Time Format</strong>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">Toggle between 12-hour (AM/PM) and 24-hour display</span>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-format-24" ${this.settings.clockFormat24 ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="switch-control">
              <div>
                <strong style="display: block; font-size: 0.9rem;">Display Clock Seconds</strong>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">Toggle seconds sweep visibility</span>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-show-seconds" ${this.settings.showSeconds ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="switch-control">
              <div>
                <strong style="display: block; font-size: 0.9rem;">Show Weather Forecast</strong>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">Enable local weather data on the dashboard</span>
              </div>
              <label class="switch">
                <input type="checkbox" id="set-weather-enabled" ${this.settings.weatherEnabled ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <!-- Audio & Speech Engine -->
          <div class="glass-panel" style="display: flex; flex-direction: column; gap: 16px;">
            <h2 style="font-size: 1.15rem; font-weight: 700; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">Audio & Speech</h2>
            
            <div class="form-group">
              <label>Default Alarm Music Volume</label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <input type="range" id="set-alarm-vol" min="0" max="1" step="0.05" value="${this.settings.alarmVolume}" style="flex-grow: 1; accent-color: var(--accent-color);">
                <span style="font-size: 0.85rem; font-weight: bold; width: 35px; text-align: right;" id="alarm-vol-lbl">${Math.round(this.settings.alarmVolume * 100)}%</span>
              </div>
            </div>

            <div class="form-group">
              <label>Voice Assistant Pitch / Speed Volume</label>
              <div style="display: flex; align-items: center; gap: 12px;">
                <input type="range" id="set-speak-vol" min="0" max="1" step="0.05" value="${this.settings.speakVolume}" style="flex-grow: 1; accent-color: var(--accent-color);">
                <span style="font-size: 0.85rem; font-weight: bold; width: 35px; text-align: right;" id="speak-vol-lbl">${Math.round(this.settings.speakVolume * 100)}%</span>
              </div>
            </div>

            <div class="form-group">
              <label for="set-voice-select">Voice Profile (Web Speech Synthesis)</label>
              <select id="set-voice-select" class="form-control">
                <option value="">Default System Voice</option>
                ${voiceOptions}
              </select>
            </div>
            
            <button id="test-voice-btn" class="btn-secondary" style="padding: 0.6rem; font-size: 0.85rem; border-radius: 8px;">Test Voice Output</button>
          </div>
        </div>

        <!-- Right: Themes, Backup & Sync -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">

          <!-- Themes Card -->
          <div class="glass-panel" style="display: flex; flex-direction: column; gap: 16px;">
            <h2 style="font-size: 1.15rem; font-weight: 700; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">Visual Themes</h2>
            
            <div class="form-group">
              <label for="set-theme-select">Select Theme Palette</label>
              <select id="set-theme-select" class="form-control">
                <option value="theme-dark" ${this.settings.theme === 'theme-dark' ? 'selected' : ''}>Deep Blue Slate (Dark)</option>
                <option value="theme-light" ${this.settings.theme === 'theme-light' ? 'selected' : ''}>Minimal Frosted (Light)</option>
                <option value="theme-black" ${this.settings.theme === 'theme-black' ? 'selected' : ''}>AMOLED Pure Black</option>
                <option value="theme-purple" ${this.settings.theme === 'theme-purple' ? 'selected' : ''}>Royal Velvet (Purple)</option>
                <option value="theme-green" ${this.settings.theme === 'theme-green' ? 'selected' : ''}>Emerald Glass (Green)</option>
                <option value="theme-orange" ${this.settings.theme === 'theme-orange' ? 'selected' : ''}>Sunset Amber (Orange)</option>
                <option value="theme-pink" ${this.settings.theme === 'theme-pink' ? 'selected' : ''}>Warm Rose (Pink)</option>
                <option value="theme-cyberpunk" ${this.settings.theme === 'theme-cyberpunk' ? 'selected' : ''}>Cyberpunk Neon</option>
                <option value="theme-neon" ${this.settings.theme === 'theme-neon' ? 'selected' : ''}>Electric Forest (Neon)</option>
              </select>
            </div>
            
            <!-- Custom Theme Accent Color Pickers -->
            <div style="display: flex; flex-direction: column; gap: 10px; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 12px;">
              <strong style="font-size: 0.85rem; color: var(--text-secondary); display:block;">Custom Theme Builder</strong>
              <div style="display: flex; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem;">
                  <input type="color" id="custom-accent-picker" value="${this.settings.customThemeColors?.accent || '#6366f1'}" style="width: 32px; height: 32px; border-radius: 5px; border:none; cursor:pointer; background:none;">
                  Accent Glow
                </div>
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem;">
                  <input type="color" id="custom-bg-picker" value="${this.settings.customThemeColors?.background || '#0b0f19'}" style="width: 32px; height: 32px; border-radius: 5px; border:none; cursor:pointer; background:none;">
                  Background
                </div>
              </div>
              <button id="apply-custom-theme" class="btn-primary" style="padding: 0.5rem; font-size: 0.8rem; margin-top: 4px;">Apply Custom Theme</button>
            </div>
          </div>

          <!-- Backup & Restore Sync Card -->
          <div class="glass-panel" style="display: flex; flex-direction: column; gap: 16px;">
            <h2 style="font-size: 1.15rem; font-weight: 700; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">Backup & Synchronization</h2>
            
            <div style="display: flex; gap: 10px;">
              <button id="export-backup-btn" class="btn-secondary" style="flex-grow: 1; padding: 0.6rem 0; font-size: 0.85rem;">Export JSON</button>
              <button id="import-backup-btn" class="btn-secondary" style="flex-grow: 1; padding: 0.6rem 0; font-size: 0.85rem;">Import JSON</button>
              <input type="file" id="import-file-input" style="display: none;" accept=".json">
            </div>

            <button id="gen-qr-btn" class="btn-primary" style="width: 100%; padding: 0.65rem 0; font-size: 0.85rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
              Generate Sync QR Code
            </button>
          </div>

        </div>
      </div>

      <!-- QR Code Modal -->
      <div id="qr-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 320px; text-align: center;">
          <div class="modal-header">
            <h3 class="modal-title">Sync Settings QR</h3>
            <span class="modal-close" id="close-qr-modal">&times;</span>
          </div>
          <div style="display: flex; justify-content: center; margin: 1rem 0;">
            <canvas id="qr-code-canvas"></canvas>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5;">Scan this with another Smart Alarm Pro device to instantly clone preferences and settings</p>
        </div>
      </div>
    `;

    this.setupListeners();
  },

  setupListeners() {
    // 1. Checkboxes format/seconds
    const format24 = document.getElementById('set-format-24');
    const showSec = document.getElementById('set-show-seconds');

    if (format24) {
      format24.addEventListener('change', () => {
        this.settings.clockFormat24 = format24.checked;
        this.save();
      });
    }

    if (showSec) {
      showSec.addEventListener('change', () => {
        this.settings.showSeconds = showSec.checked;
        this.save();
      });
    }

    const weatherEnabled = document.getElementById('set-weather-enabled');
    if (weatherEnabled) {
      weatherEnabled.addEventListener('change', () => {
        this.settings.weatherEnabled = weatherEnabled.checked;
        this.save();
      });
    }

    // 2. Volumes
    const alarmVol = document.getElementById('set-alarm-vol');
    const speakVol = document.getElementById('set-speak-vol');
    const alarmVolLbl = document.getElementById('alarm-vol-lbl');
    const speakVolLbl = document.getElementById('speak-vol-lbl');

    if (alarmVol) {
      alarmVol.addEventListener('input', () => {
        this.settings.alarmVolume = parseFloat(alarmVol.value);
        if (alarmVolLbl) alarmVolLbl.textContent = `${Math.round(this.settings.alarmVolume * 100)}%`;
        this.save(false); // save but don't re-render whole layout to prevent slider jump
      });
    }

    if (speakVol) {
      speakVol.addEventListener('input', () => {
        this.settings.speakVolume = parseFloat(speakVol.value);
        if (speakVolLbl) speakVolLbl.textContent = `${Math.round(this.settings.speakVolume * 100)}%`;
        this.save(false);
      });
    }

    // 3. Voice Selector
    const voiceSelect = document.getElementById('set-voice-select');
    if (voiceSelect) {
      voiceSelect.addEventListener('change', () => {
        this.settings.voiceName = voiceSelect.value;
        this.save();
      });
    }

    // Test speech trigger
    document.getElementById('test-voice-btn')?.addEventListener('click', () => {
      const text = `Greetings ${this.settings.userName || 'User'}. Smart Alarm Pro speech assistant is active.`;
      VoiceServiceInstance.speak(text, this.settings.speakVolume, 1.0, 1.0, this.settings.voiceName);
    });

    // 4. Themes
    const themeSelect = document.getElementById('set-theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        this.settings.theme = themeSelect.value;
        // remove custom builder colors if selector theme overrides it
        this.settings.customThemeColors = null;
        this.save();
      });
    }

    // 5. Custom Accent Pickers
    document.getElementById('apply-custom-theme')?.addEventListener('click', () => {
      const accent = document.getElementById('custom-accent-picker').value;
      const bg = document.getElementById('custom-bg-picker').value;
      
      this.settings.theme = 'theme-custom';
      this.settings.customThemeColors = { accent, background: bg };
      this.save();
    });

    // 6. JSON Export
    document.getElementById('export-backup-btn')?.addEventListener('click', async () => {
      const allAlarms = await StorageService.getAllAlarms();
      const allTasks = await StorageService.getAllTasks();
      
      const backupData = {
        settings: this.settings,
        alarms: allAlarms,
        tasks: allTasks
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `smart_alarm_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    // 7. JSON Import
    const importInput = document.getElementById('import-file-input');
    document.getElementById('import-backup-btn')?.addEventListener('click', () => {
      importInput?.click();
    });

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.settings) {
              this.settings = data.settings;
              this.save();
            }
            if (data.alarms) {
              // clear and write
              const currentAlarms = await StorageService.getAllAlarms();
              for (const a of currentAlarms) await StorageService.deleteAlarm(a.id);
              for (const a of data.alarms) {
                delete a.id; // autoincrement handles new write cleanly
                await StorageService.addAlarm(a);
              }
            }
            if (data.tasks) {
              const currentTasks = await StorageService.getAllTasks();
              for (const t of currentTasks) await StorageService.deleteTask(t.id);
              for (const t of data.tasks) {
                delete t.id;
                await StorageService.addTask(t);
              }
            }
            alert('Settings and database successfully imported!');
            location.reload(); // refresh layout cleanly
          } catch (err) {
            alert('Error parsing JSON backup file: ' + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // 8. QR Code generation modal
    const qrModal = document.getElementById('qr-modal');
    const genQRBtn = document.getElementById('gen-qr-btn');
    const closeQR = document.getElementById('close-qr-modal');

    if (genQRBtn && qrModal) {
      genQRBtn.addEventListener('click', () => {
        qrModal.classList.add('active');
        
        // Serialize settings for QR payload
        const qrPayload = JSON.stringify({
          n: this.settings.userName,
          t: this.settings.theme,
          f: this.settings.clockFormat24
        });
        
        const canvas = document.getElementById('qr-code-canvas');
        generateQR(qrPayload, canvas);
      });
    }

    if (closeQR) {
      closeQR.addEventListener('click', () => {
        qrModal?.classList.remove('active');
      });
    }
  },

  save(reRender = true) {
    StorageService.saveSettings(this.settings);
    if (this.onSettingsChange) {
      this.onSettingsChange(this.settings, reRender);
    }
  }
};
