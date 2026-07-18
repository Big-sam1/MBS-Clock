/* Smart Alarm Pro - IndexedDB & LocalStorage Service */

const DB_NAME = 'SmartAlarmProDB';
const DB_VERSION = 1;

let dbInstance = null;

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => {
      console.error('Database failed to open:', e);
      reject(e);
    };

    request.onsuccess = async (e) => {
      dbInstance = e.target.result;
      
      // Seed default alarm and task datasets if empty
      try {
        await seedDefaultData();
      } catch (err) {
        console.error('Seeding database failed:', err);
      }
      
      resolve(dbInstance);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Store 1: Alarms
      if (!db.objectStoreNames.contains('alarms')) {
        db.createObjectStore('alarms', { keyPath: 'id', autoIncrement: true });
      }

      // Store 2: Tasks
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
      }

      // Store 3: Habits
      if (!db.objectStoreNames.contains('habits')) {
        db.createObjectStore('habits', { keyPath: 'id', autoIncrement: true });
      }

      // Store 4: Alarm ring history logs
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Seed mock database on fresh start
async function seedDefaultData() {
  const store = await getStore('alarms', 'readwrite');
  const count = await new Promise((resolve) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });

  if (count === 0) {
    console.log('Seeding initial sample alarms and tasks...');

    // Seed default alarms
    const initialAlarms = [
      {
        title: 'Morning Cardio Workout',
        description: 'Stretch, hydrate, and jog for 30 minutes. Focus on steady pacing.',
        time: '06:30',
        priority: 'High',
        category: 'Exercise',
        sound: 'birds',
        voiceReminder: true,
        repeatDays: [0, 1, 2, 3, 4, 5, 6], // Everyday
        active: true
      },
      {
        title: 'Team Standup Meeting',
        description: 'Review sprints board, prepare roadmap notes, slide decks.',
        time: '09:00',
        priority: 'Medium',
        category: 'Work',
        sound: 'piano',
        voiceReminder: true,
        repeatDays: [0, 1, 2, 3, 4], // Weekdays
        active: true
      },
      {
        title: 'Read Atomic Habits',
        description: 'Review chapters on streak-tracking systems and clear cues.',
        time: '20:00',
        priority: 'Low',
        category: 'Personal',
        sound: 'meditation',
        voiceReminder: true,
        repeatDays: [0, 1, 2, 3, 4, 5, 6],
        active: true
      }
    ];

    for (const alarm of initialAlarms) {
      await StorageService.addAlarm(alarm);
    }

    // Seed default tasks
    const todayStr = new Date().toISOString().split('T')[0];
    const initialTasks = [
      {
        title: 'Study JavaScript ES6+',
        description: 'Review promises, async triggers, and ES modules layouts.',
        dueDate: todayStr,
        dueTime: '09:30',
        priority: 'High',
        category: 'Study',
        status: 'pending'
      },
      {
        title: 'Team Meeting Prep',
        description: 'Coordinate slides templates and milestones checklists.',
        dueDate: todayStr,
        dueTime: '10:00',
        priority: 'Medium',
        category: 'Work',
        status: 'pending'
      },
      {
        title: 'Gym Cardio Routine',
        description: 'Cardio training drills and stretches.',
        dueDate: todayStr,
        dueTime: '17:30',
        priority: 'Medium',
        category: 'Exercise',
        status: 'pending'
      },
      {
        title: 'Hydrate 3L Water',
        description: 'Drink regular intervals throughout focus hours.',
        dueDate: todayStr,
        dueTime: '18:00',
        priority: 'Low',
        category: 'Personal',
        status: 'completed'
      }
    ];

    for (const task of initialTasks) {
      await StorageService.addTask(task);
    }

    // Seed habit routines
    const initialHabits = [
      { title: 'Drink Water', history: [todayStr] },
      { title: 'Read 20 Mins', history: [] },
      { title: 'Focus Workout', history: [] }
    ];

    for (const habit of initialHabits) {
      await StorageService.addHabit(habit);
    }
  }
}

// Helper to perform transaction
async function getStore(storeName, mode = 'readonly') {
  const db = await initDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

export const StorageService = {
  // ==========================================
  // ALARMS OPERATIONS
  // ==========================================
  async getAllAlarms() {
    const store = await getStore('alarms');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  },

  async addAlarm(alarm) {
    const store = await getStore('alarms', 'readwrite');
    return new Promise((resolve) => {
      const req = store.add(alarm);
      req.onsuccess = () => resolve(req.result);
    });
  },

  async updateAlarm(alarm) {
    const store = await getStore('alarms', 'readwrite');
    return new Promise((resolve) => {
      const req = store.put(alarm);
      req.onsuccess = () => resolve(req.result);
    });
  },

  async deleteAlarm(id) {
    const store = await getStore('alarms', 'readwrite');
    return new Promise((resolve) => {
      const req = store.delete(Number(id));
      req.onsuccess = () => resolve(true);
    });
  },

  // ==========================================
  // TASKS OPERATIONS
  // ==========================================
  async getAllTasks() {
    const store = await getStore('tasks');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  },

  async addTask(task) {
    const store = await getStore('tasks', 'readwrite');
    return new Promise((resolve) => {
      const req = store.add(task);
      req.onsuccess = () => resolve(req.result);
    });
  },

  async updateTask(task) {
    const store = await getStore('tasks', 'readwrite');
    return new Promise((resolve) => {
      const req = store.put(task);
      req.onsuccess = () => resolve(req.result);
    });
  },

  async deleteTask(id) {
    const store = await getStore('tasks', 'readwrite');
    return new Promise((resolve) => {
      const req = store.delete(Number(id));
      req.onsuccess = () => resolve(true);
    });
  },

  // ==========================================
  // HABITS OPERATIONS
  // ==========================================
  async getAllHabits() {
    const store = await getStore('habits');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  },

  async addHabit(habit) {
    const store = await getStore('habits', 'readwrite');
    return new Promise((resolve) => {
      const req = store.add(habit);
      req.onsuccess = () => resolve(req.result);
    });
  },

  async updateHabit(habit) {
    const store = await getStore('habits', 'readwrite');
    return new Promise((resolve) => {
      const req = store.put(habit);
      req.onsuccess = () => resolve(req.result);
    });
  },

  async deleteHabit(id) {
    const store = await getStore('habits', 'readwrite');
    return new Promise((resolve) => {
      const req = store.delete(Number(id));
      req.onsuccess = () => resolve(true);
    });
  },

  // ==========================================
  // HISTORY OPERATIONS
  // ==========================================
  async getHistory() {
    const store = await getStore('history');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  },

  async addHistoryEntry(entry) {
    const store = await getStore('history', 'readwrite');
    return new Promise((resolve) => {
      entry.timestamp = Date.now();
      const req = store.add(entry);
      req.onsuccess = () => resolve(req.result);
    });
  },

  async clearHistory() {
    const store = await getStore('history', 'readwrite');
    return new Promise((resolve) => {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
    });
  },

  // ==========================================
  // LOCALSTORAGE SETTINGS OPERATIONS
  // ==========================================
  getSettings() {
    const defaultSettings = {
      userName: '',
      onboarded: false,
      theme: 'theme-dark',
      customThemeColors: null,
      clockFormat24: false,
      showSeconds: true,
      alarmVolume: 0.8,
      speakVolume: 0.8,
      defaultSnooze: 10, // minutes
      vibrationEnabled: true,
      voiceName: '',
      weatherEnabled: true,
      weatherLocation: null,
      customSoundName: '',
      customSoundData: '', // base64 representation or cached key
      language: 'en'
    };

    const localData = localStorage.getItem('smart_alarm_settings');
    if (!localData) {
      return defaultSettings;
    }
    try {
      return { ...defaultSettings, ...JSON.parse(localData) };
    } catch (e) {
      return defaultSettings;
    }
  },

  saveSettings(settings) {
    localStorage.setItem('smart_alarm_settings', JSON.stringify(settings));
  }
};
