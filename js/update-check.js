/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Firebase Auto-Update Check
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   
   Add this script to your website's <head> or at the end of <body>.
   It checks Firebase Firestore for the latest app version and
   prompts the user to update if a newer version is available.
   
   For the Android apps (TWA), the website itself IS the app,
   so updating the website = updating the app. But this script
   also checks for native APK updates stored in Firestore.
   
   Add to index.html before </body>:
   <script src="./js/update-check.js"></script>
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const UpdateCheck = {
  async check() {
    // Only check if Firebase is available
    if (!window.__fb) {
      console.log('UpdateCheck: Firebase not ready');
      return;
    }

    try {
      const FB = window.__fb;
      const snap = await FB.getDoc(FB.doc(FB.db, 'setting', 'app_version'));
      
      if (!snap.exists()) {
        console.log('UpdateCheck: No version document found');
        return;
      }

      const data = snap.data();
      const latestVersion = data.latestVersion || '1.0.0';
      const updateUrl = data.updateUrl || '';
      const updateMessage = data.updateMessage || 'à¦¨à¦¤à§à¦¨ version à¦ªà¦¾à¦“à¦¯à¦¼à¦¾ à¦—à§‡à¦›à§‡! à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à§à¦¨à¥¤';
      const forceUpdate = data.forceUpdate || false;

      // Check stored version
      const currentVersion = localStorage.getItem('golapi_app_version') || '1.0.0';
      
      if (this.compareVersions(latestVersion, currentVersion) > 0) {
        this.showUpdatePrompt(updateMessage, updateUrl, forceUpdate);
      }
    } catch (e) {
      console.log('UpdateCheck: Error checking version:', e.message);
    }
  },

  compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const va = partsA[i] || 0;
      const vb = partsB[i] || 0;
      if (va > vb) return 1;
      if (va < vb) return -1;
    }
    return 0;
  },

  showUpdatePrompt(message, url, force) {
    // Remove existing prompt
    const existing = document.getElementById('updatePromptModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'updatePromptModal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    `;
    
    const card = document.createElement('div');
    card.style.cssText = `
      background: #1a1a2e; border: 1px solid rgba(233,30,99,0.3);
      border-radius: 16px; padding: 28px 24px; max-width: 340px;
      width: 90%; text-align: center; color: #fff;
      box-shadow: 0 8px 32px rgba(233,30,99,0.2);
    `;
    
    card.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 12px">ðŸ”„</div>
      <h3 style="font-size: 18px; margin-bottom: 8px; font-family: 'Hind Siliguri', sans-serif">à¦†à¦ªà¦¡à§‡à¦Ÿ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾ à¦—à§‡à¦›à§‡</h3>
      <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 20px; font-family: 'Hind Siliguri', sans-serif">${message}</p>
      <a href="${url || '#'}" onclick="UpdateCheck.updateNow(event, '${url}')" 
         style="display: block; background: linear-gradient(135deg, #e91e63, #c2185b); 
         color: #fff; padding: 12px 24px; border-radius: 10px; 
         text-decoration: none; font-weight: 600; font-size: 14px;
         font-family: 'Hind Siliguri', sans-serif">
         â¬‡ï¸ à¦†à¦ªà¦¡à§‡à¦Ÿ à¦•à¦°à§à¦¨
      </a>
      ${!force ? `<button onclick="UpdateCheck.later()" 
         style="margin-top: 12px; background: transparent; border: none; 
         color: rgba(255,255,255,0.4); font-size: 12px; cursor: pointer;
         font-family: 'Hind Siliguri', sans-serif">
         à¦ªà¦°à§‡ à¦•à¦°à¦¬</button>` : ''}
    `;
    
    modal.appendChild(card);
    document.body.appendChild(modal);

    if (force) {
      // Prevent closing on background click for force updates
      modal.addEventListener('click', (e) => {
        if (e.target === modal) e.stopPropagation();
      });
    } else {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
    }
  },

  updateNow(event, url) {
    event.preventDefault();
    if (url) {
      window.open(url, '_blank');
    }
    localStorage.setItem('golapi_app_version', 'latest');
    document.getElementById('updatePromptModal')?.remove();
  },

  later() {
    document.getElementById('updatePromptModal')?.remove();
  },

  // Call this after app boots
  init() {
    // Wait for Firebase to be ready
    if (window.__fb) {
      this.check();
    } else {
      window.addEventListener('firebase-ready', () => this.check());
    }
    
    // Check every 30 minutes
    setInterval(() => this.check(), 30 * 60 * 1000);
  }
};

// Auto-initialize after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UpdateCheck.init());
} else {
  UpdateCheck.init();
}