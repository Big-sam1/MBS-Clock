/* Smart Alarm Pro - Alarm Scheduler & Ringing Lifecycle Service */

import { StorageService } from './storage.js';
import { AudioServiceInstance } from './audioService.js';
import { VoiceServiceInstance } from './voiceService.js';
import { NotificationService } from './notificationService.js';

class AlarmService {
  constructor() {
    this.timerInterval = null;
    this.wakeLock = null;
    this.currentRingingAlarm = null;
    this.snoozedAlarms = []; // Array of { alarmId, triggerTime }
    this.speechRepeatInterval = null;
  }

  // Start polling clock ticks every second
  start() {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => this.checkAlarms(), 1000);
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  async checkAlarms() {
    const now = new Date();
    const currentHrs = now.getHours();
    const currentMins = now.getMinutes();
    const currentSecs = now.getSeconds();
    
    // Only check triggers at the beginning of a minute (second === 0)
    if (currentSecs !== 0) {
      // Check in-memory snoozed alarms (precise to seconds if needed, or check by minute)
      this.checkSnoozes(now);
      return;
    }

    const currentDayOfWeek = (now.getDay() + 6) % 7; // Mon=0, Sun=6
    const timeStr = `${String(currentHrs).padStart(2, '0')}:${String(currentMins).padStart(2, '0')}`;
    
    const alarms = await StorageService.getAllAlarms();
    
    for (const alarm of alarms) {
      if (!alarm.active) continue;

      let shouldTrigger = false;

      // Check repeat configuration
      if (alarm.repeatDays && alarm.repeatDays.length > 0) {
        if (alarm.repeatDays.includes(currentDayOfWeek) && alarm.time === timeStr) {
          shouldTrigger = true;
        }
      } else {
        // Run once
        if (alarm.time === timeStr) {
          shouldTrigger = true;
          // Turn off one-shot alarm so it doesn't ring next day
          alarm.active = false;
          await StorageService.updateAlarm(alarm);
        }
      }

      if (shouldTrigger) {
        this.triggerAlarm(alarm);
        break; // trigger one alarm at a time
      }
    }

    this.checkSnoozes(now);
  }

  checkSnoozes(now) {
    const nowMs = now.getTime();
    
    // Filter out triggered snoozes
    const triggered = this.snoozedAlarms.filter(s => nowMs >= s.triggerTime);
    this.snoozedAlarms = this.snoozedAlarms.filter(s => nowMs < s.triggerTime);

    triggered.forEach(async (snooze) => {
      const alarms = await StorageService.getAllAlarms();
      const alarm = alarms.find(a => a.id === snooze.alarmId);
      if (alarm) {
        this.triggerAlarm(alarm, true);
      }
    });
  }

  async triggerAlarm(alarm, isSnoozed = false) {
    if (this.currentRingingAlarm) {
      // Alarm already active, track missed alarm log for new one
      await StorageService.addHistoryEntry({
        alarmId: alarm.id,
        title: alarm.title,
        action: 'missed',
        timeStr: alarm.time
      });
      return;
    }

    this.currentRingingAlarm = alarm;
    
    // Acquire screen Wake Lock to prevent screen sleeping on bedside table
    this.acquireWakeLock();

    // Trigger push notification fallback
    NotificationService.show(`Alarm: ${alarm.title}`, {
      body: alarm.description || 'Time to complete your routine!',
      tag: 'alarm-ring',
      requireInteraction: true
    });

    // Vibrate device if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 300, 500, 300, 500]);
    }

    // Load Ring Overlay
    this.showRingOverlay(alarm);
  }

  showRingOverlay(alarm) {
    const overlay = document.getElementById('alarm-ring-overlay');
    if (!overlay) return;

    // Populate details
    overlay.querySelector('.ring-alarm-title').textContent = alarm.title;
    overlay.querySelector('.ring-alarm-description').textContent = alarm.description || 'Wake up and start your day!';
    
    const metaBox = overlay.querySelector('.ring-alarm-meta');
    metaBox.innerHTML = `
      <span class="ring-meta-tag cat-${alarm.category.toLowerCase()}">${alarm.category}</span>
      <span class="ring-meta-tag" style="border-color: var(--warning-color); color: var(--warning-color);">Priority: ${alarm.priority}</span>
    `;

    overlay.querySelector('.ring-time').textContent = alarm.time;
    overlay.classList.add('active');

    // Play synthesized Audio Sound
    const settings = StorageService.getSettings();
    
    // Custom audio blob vs synthesized wave
    if (alarm.sound === 'custom' && alarm.customSoundBlob) {
      AudioServiceInstance.play('custom', settings.alarmVolume, true, 3, alarm.customSoundBlob);
    } else {
      AudioServiceInstance.play(alarm.sound || 'classic', settings.alarmVolume, true, 3);
    }

    // Speak Voice Reminder (Speech Synthesis)
    const speakWords = () => {
      const greetName = settings.userName ? `, ${settings.userName}` : '';
      let speechText = `Attention${greetName}. It is ${alarm.time}. Time for your task: ${alarm.title}.`;
      if (alarm.voiceReminder && alarm.description) {
        speechText += ` Notes: ${alarm.description}`;
      }
      VoiceServiceInstance.speak(speechText, settings.speakVolume, 0.95, 1.0, settings.voiceName);
    };

    if (alarm.voiceReminder) {
      speakWords();
      // Repeat voice announcement every 20 seconds if alarm remains active
      this.speechRepeatInterval = setInterval(speakWords, 22000);
    }

    this.bindOverlayControls();
  }

  bindOverlayControls() {
    const overlay = document.getElementById('alarm-ring-overlay');
    if (!overlay) return;

    // Clear previous event listeners using clone node strategy
    const dismissBtn = overlay.querySelector('.btn-dismiss');
    const snoozeBtn = overlay.querySelector('.btn-snooze');
    const completeBtn = overlay.querySelector('.btn-complete');
    
    const cloneAndBind = (el, callback) => {
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      clone.addEventListener('click', callback);
    };

    cloneAndBind(dismissBtn, () => this.dismissAlarm());
    cloneAndBind(snoozeBtn, () => this.snoozeAlarm());
    cloneAndBind(completeBtn, () => this.completeAssociatedTask());

    // Additional mini links
    const speakBtn = document.getElementById('ring-speak-again-link');
    const stopMusicBtn = document.getElementById('ring-stop-music-link');

    cloneAndBind(speakBtn, (e) => {
      e.preventDefault();
      const settings = StorageService.getSettings();
      const alarm = this.currentRingingAlarm;
      let speechText = `Time for your task: ${alarm.title}. ${alarm.description || ''}`;
      VoiceServiceInstance.speak(speechText, settings.speakVolume, 0.95, 1.0, settings.voiceName);
    });

    cloneAndBind(stopMusicBtn, (e) => {
      e.preventDefault();
      AudioServiceInstance.stop();
    });
  }

  async dismissAlarm() {
    const alarm = this.currentRingingAlarm;
    this.cleanRingingState();

    // Log to History
    await StorageService.addHistoryEntry({
      alarmId: alarm.id,
      title: alarm.title,
      action: 'dismissed',
      timeStr: alarm.time
    });

    // Dispatch update notification
    window.dispatchEvent(new CustomEvent('alarm-dismissed'));
  }

  async snoozeAlarm() {
    const alarm = this.currentRingingAlarm;
    const settings = StorageService.getSettings();
    const snoozeMinutes = settings.defaultSnooze || 10;
    
    this.cleanRingingState();

    // Schedule snooze trigger
    const triggerTime = Date.now() + snoozeMinutes * 60 * 1000;
    this.snoozedAlarms.push({
      alarmId: alarm.id,
      triggerTime
    });

    await StorageService.addHistoryEntry({
      alarmId: alarm.id,
      title: alarm.title,
      action: 'snoozed',
      timeStr: alarm.time
    });

    alert(`Alarm snoozed for ${snoozeMinutes} minutes`);
    
    // Dispatch update notification
    window.dispatchEvent(new CustomEvent('alarm-snoozed'));
  }

  async completeAssociatedTask() {
    const alarm = this.currentRingingAlarm;
    this.cleanRingingState();

    // Complete task in DB
    const tasks = await StorageService.getAllTasks();
    
    // Find a pending task that matches the alarm label
    const matchingTask = tasks.find(t => t.title.toLowerCase().trim() === alarm.title.toLowerCase().trim() && t.status === 'pending');
    
    if (matchingTask) {
      matchingTask.status = 'completed';
      await StorageService.updateTask(matchingTask);
    }

    // Log completion history
    await StorageService.addHistoryEntry({
      alarmId: alarm.id,
      title: alarm.title,
      action: 'completed',
      timeStr: alarm.time
    });

    // Confetti celebration!
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10001';
    document.body.appendChild(canvas);

    // Dynamic import to avoid cycles or load helper directly
    import('../utils/helpers.js').then(m => {
      m.triggerConfetti(canvas);
      setTimeout(() => canvas.remove(), 4000);
    });

    window.dispatchEvent(new CustomEvent('alarm-completed'));
  }

  cleanRingingState() {
    // Hide overlay
    const overlay = document.getElementById('alarm-ring-overlay');
    if (overlay) overlay.classList.remove('active');

    // Stop audio & speech
    AudioServiceInstance.stop();
    VoiceServiceInstance.stop();
    
    if (this.speechRepeatInterval) {
      clearInterval(this.speechRepeatInterval);
      this.speechRepeatInterval = null;
    }

    // Release Wake Lock
    this.releaseWakeLock();

    this.currentRingingAlarm = null;
  }

  // Wake Lock API implementations
  async acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock acquired successfully.');
    } catch (err) {
      console.warn(`Failed to request screen Wake Lock: ${err.message}`);
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
        console.log('Wake Lock released.');
      });
    }
  }
}

export const AlarmServiceInstance = new AlarmService();
