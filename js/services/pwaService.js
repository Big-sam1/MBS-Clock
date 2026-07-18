let deferredInstallPrompt = null;

export const PWAService = {
  init(installButtonEl, badgeEl) {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => console.log('Service Worker registered successfully:', reg.scope))
          .catch(err => console.error('Service Worker registration failed:', err));
      });
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent standard browser bar from showing
      e.preventDefault();
      // Store event for trigger
      deferredInstallPrompt = e;
      
      // Reveal buttons/badges in UI
      if (installButtonEl) installButtonEl.style.display = 'flex';
      if (badgeEl) badgeEl.style.display = 'flex';
    });

    // Handle clicks on install button
    const triggerInstall = async () => {
      if (!deferredInstallPrompt) return;
      
      // Trigger prompt
      deferredInstallPrompt.prompt();
      
      // Wait for user outcome choice
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log(`PWA Installation Choice: ${outcome}`);
      
      // Clear stored event
      deferredInstallPrompt = null;

      // Hide elements
      if (installButtonEl) installButtonEl.style.display = 'none';
      if (badgeEl) badgeEl.style.display = 'none';
    };

    if (installButtonEl) installButtonEl.addEventListener('click', triggerInstall);
    if (badgeEl) badgeEl.addEventListener('click', triggerInstall);

    // Track successful installations
    window.addEventListener('appinstalled', () => {
      console.log('Smart Alarm Pro successfully installed on device!');
      deferredInstallPrompt = null;
      if (installButtonEl) installButtonEl.style.display = 'none';
      if (badgeEl) badgeEl.style.display = 'none';
    });
  },

  // Check if running inside standalone (installed) mode
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
};
