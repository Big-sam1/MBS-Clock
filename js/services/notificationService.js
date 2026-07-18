/* Smart Alarm Pro - Browser Notification Service */

export const NotificationService = {
  supported: 'Notification' in window,

  init() {
    if (this.supported && Notification.permission === 'default') {
      // Don't auto-request on start, let component trigger it when toggled in Settings
    }
  },

  async requestPermission() {
    if (!this.supported) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  getPermissionState() {
    if (!this.supported) return 'unsupported';
    return Notification.permission;
  },

  show(title, options = {}) {
    if (!this.supported || Notification.permission !== 'granted') {
      console.warn('Notifications not enabled or supported');
      return null;
    }

    const defaultOptions = {
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'smart-alarm-notif',
      renotify: true
    };

    const mergedOptions = { ...defaultOptions, ...options };
    
    // Check if we are running inside Service Worker or Main Thread
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      // SW notification is better
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, mergedOptions);
      });
      return null;
    } else {
      // Fallback: standard Window Notification
      return new Notification(title, mergedOptions);
    }
  }
};
