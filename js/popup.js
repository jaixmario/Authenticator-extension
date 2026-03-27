document.addEventListener('DOMContentLoaded', async () => {
  const onboardingView = document.getElementById('onboarding-view');
  const settingsView = document.getElementById('settings-view');
  const addView = document.getElementById('add-view');
  const cloudSetupView = document.getElementById('cloud-setup-view');
  const totpView = document.getElementById('totp-view');
  
  const onboardingUrlInput = document.getElementById('onboarding-url-input');
  const onboardingSaveBtn = document.getElementById('onboarding-save-btn');
  const onboardingSkipBtn = document.getElementById('onboarding-skip-btn');
  const onboardingError = document.getElementById('onboarding-error');

  const serverUrlInput = document.getElementById('server-url-input');
  const saveUrlBtn = document.getElementById('save-url-btn');
  const setupError = document.getElementById('setup-error');
  
  const cloudUrlSettingsInput = document.getElementById('cloud-url-settings-input');
  const saveCloudSettingsBtn = document.getElementById('save-cloud-settings-btn');
  const cloudSettingsError = document.getElementById('cloud-settings-error');
  const settingsBackBtn = document.getElementById('settings-back-btn');
  
  const manualNameInput = document.getElementById('manual-name-input');
  const manualKeyInput = document.getElementById('manual-key-input');
  const saveManualBtn = document.getElementById('save-manual-btn');
  const cancelManualBtn = document.getElementById('cancel-manual-btn');
  const addError = document.getElementById('add-error');

  const cloudUrlInput = document.getElementById('cloud-url-input');
  const saveCloudBtn = document.getElementById('save-cloud-btn');
  const cancelCloudBtn = document.getElementById('cancel-cloud-btn');
  const cloudError = document.getElementById('cloud-error');

  const totpList = document.getElementById('totp-list');
  const progressBar = document.getElementById('progress-bar');
  const settingsBtn = document.getElementById('settings-btn');
  const addBtn = document.getElementById('add-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const totpError = document.getElementById('totp-error');
  const searchInput = document.getElementById('search-input');

  const lockView = document.getElementById('lock-view');
  const pinEnableCheckbox = document.getElementById('pin-enable-checkbox');
  const pinSettingsDiv = document.getElementById('pin-settings');
  const pinInput = document.getElementById('pin-input');
  const autoLockSelect = document.getElementById('auto-lock-select');
  const savePinBtn = document.getElementById('save-pin-btn');
  const pinError = document.getElementById('pin-error');
  
  const unlockPinInput = document.getElementById('unlock-pin-input');
  const unlockBtn = document.getElementById('unlock-btn');
  const unlockError = document.getElementById('unlock-error');

  const confirmModal = document.getElementById('confirm-modal');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  let pendingDeleteAction = null;

  let updateInterval;
  let cachedSecrets = {};
  let manualKeys = {};
  let hiddenUrlKeys = [];
  let serverUrl = '';
  let cloudUrl = '';
  let skippedSetup = false;
  
  let pinEnabled = false;
  let pinCode = '';
  let autoLockTimer = 0;
  let lastActive = 0;
  let isLocked = false;
  let lastActiveState = Date.now();

  document.addEventListener('mousemove', () => { lastActiveState = Date.now(); });
  document.addEventListener('keydown', () => { lastActiveState = Date.now(); });

  setInterval(() => {
    if (!isLocked) {
      if (pinEnabled && autoLockTimer > 0 && (Date.now() - lastActiveState > autoLockTimer * 60 * 1000)) {
        showLockView();
      } else {
        lastActive = lastActiveState;
        chrome.storage.local.set({ lastActive });
      }
    }
  }, 1000);

  function parseFlatJSONWithDuplicates(text) {
    const result = {};
    const regex = /"([^"\\]+)"\s*:\s*"([^"\\]+)"/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const val = match[2];
      
      // Ignore cloud payload confirmation "ok": "ok"
      if (name === "ok" && val === "ok") continue;

      let dispName = name;
      let counter = 1;
      while (result[dispName] !== undefined) {
        dispName = `${name}${counter}`;
        counter++;
      }
      result[dispName] = val;
    }
    return result;
  }

  // Initialization
  chrome.storage.local.get(['serverUrl', 'manualKeys', 'hiddenUrlKeys', 'cloudUrl', 'skippedSetup', 'pinEnabled', 'pinCode', 'autoLockTimer', 'lastActive'], (result) => {
    if (result.manualKeys) {
      manualKeys = result.manualKeys;
    }
    if (result.hiddenUrlKeys) {
      hiddenUrlKeys = result.hiddenUrlKeys;
    }
    serverUrl = result.serverUrl || '';
    cloudUrl = result.cloudUrl || '';
    skippedSetup = result.skippedSetup || false;
    
    pinEnabled = result.pinEnabled || false;
    pinCode = result.pinCode || '';
    autoLockTimer = result.autoLockTimer || 0;
    lastActive = result.lastActive || 0;
    
    const now = Date.now();
    const timeSinceActive = now - lastActive;
    
    if (pinEnabled && pinCode) {
      if (autoLockTimer === 0 || timeSinceActive > autoLockTimer * 60 * 1000) {
        showLockView();
        return;
      }
    }
    
    lastActiveState = Date.now();
    lastActive = lastActiveState;
    chrome.storage.local.set({ lastActive });
    
    proceedInitialization();
  });

  function proceedInitialization() {
    if (serverUrl || skippedSetup || Object.keys(manualKeys).length > 0) {
      showTotpView();
    } else {
      showOnboardingView();
    }
  }

  // Views Toggles
  function showLockView() {
    isLocked = true;
    if(lockView) lockView.classList.remove('hidden');
    
    onboardingView.classList.add('hidden');
    settingsView.classList.add('hidden');
    addView.classList.add('hidden');
    cloudSetupView.classList.add('hidden');
    totpView.classList.add('hidden');
    
    unlockPinInput.value = '';
    unlockError.classList.add('hidden');
    unlockPinInput.focus();
  }

  function showOnboardingView() {
    onboardingView.classList.remove('hidden');
    settingsView.classList.add('hidden');
    addView.classList.add('hidden');
    cloudSetupView.classList.add('hidden');
    totpView.classList.add('hidden');
    onboardingError.classList.add('hidden');
    if(lockView) lockView.classList.add('hidden');
  }

  function showSettingsView() {
    settingsView.classList.remove('hidden');
    onboardingView.classList.add('hidden');
    addView.classList.add('hidden');
    cloudSetupView.classList.add('hidden');
    totpView.classList.add('hidden');
    setupError.classList.add('hidden');
    cloudSettingsError.classList.add('hidden');
    if(lockView) lockView.classList.add('hidden');
    serverUrlInput.value = serverUrl;
    cloudUrlSettingsInput.value = cloudUrl;
    
    pinEnableCheckbox.checked = pinEnabled;
    pinInput.value = pinCode;
    autoLockSelect.value = autoLockTimer.toString();
    if (pinEnabled) {
      pinSettingsDiv.classList.remove('hidden');
    } else {
      pinSettingsDiv.classList.add('hidden');
    }
  }

  function showAddView() {
    onboardingView.classList.add('hidden');
    settingsView.classList.add('hidden');
    totpView.classList.add('hidden');
    cloudSetupView.classList.add('hidden');
    addView.classList.remove('hidden');
    addError.classList.add('hidden');
    if(lockView) lockView.classList.add('hidden');
    manualNameInput.value = '';
    manualKeyInput.value = '';
  }

  function showCloudSetupView() {
    onboardingView.classList.add('hidden');
    settingsView.classList.add('hidden');
    totpView.classList.add('hidden');
    addView.classList.add('hidden');
    cloudSetupView.classList.remove('hidden');
    cloudError.classList.add('hidden');
    if(lockView) lockView.classList.add('hidden');
    cloudUrlInput.value = cloudUrl;
  }

  async function showTotpView() {
    onboardingView.classList.add('hidden');
    settingsView.classList.add('hidden');
    addView.classList.add('hidden');
    cloudSetupView.classList.add('hidden');
    totpView.classList.remove('hidden');
    totpError.classList.add('hidden');
    if(lockView) lockView.classList.add('hidden');
    
    totpList.innerHTML = '<li class="totp-item" style="justify-content:center;">Loading...</li>';
    cachedSecrets = {}; // Reset

    try {
      if (serverUrl) {
        const response = await fetch(serverUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        cachedSecrets = parseFlatJSONWithDuplicates(text);
      }
    } catch (error) {
      showError(totpError, 'Failed to sync with server.');
      console.error(error);
    }

    updateCodes();
    
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateCodes, 1000);
  }

  unlockBtn.addEventListener('click', unlockAttempt);
  unlockPinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') unlockAttempt();
  });

  confirmCancelBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    pendingDeleteAction = null;
  });

  confirmDeleteBtn.addEventListener('click', () => {
    if (pendingDeleteAction) {
      pendingDeleteAction();
      pendingDeleteAction = null;
    }
    confirmModal.classList.add('hidden');
  });

  function unlockAttempt() {
    const entered = unlockPinInput.value;
    if (entered === pinCode) {
      isLocked = false;
      lockView.classList.add('hidden');
      lastActiveState = Date.now();
      lastActive = lastActiveState;
      chrome.storage.local.set({ lastActive });
      proceedInitialization();
    } else {
      showError(unlockError, 'Incorrect PIN.');
      unlockPinInput.value = '';
      unlockPinInput.focus();
    }
  }

  // Event Listeners
  onboardingSaveBtn.addEventListener('click', async () => {
    const url = onboardingUrlInput.value.trim();
    if (!url) { showError(onboardingError, 'Please enter a valid URL.'); return; }
    try { new URL(url); } catch { showError(onboardingError, 'Invalid URL format.'); return; }

    try {
      onboardingSaveBtn.textContent = 'Saving...';
      onboardingSaveBtn.disabled = true;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      serverUrl = url;
      skippedSetup = false;
      hiddenUrlKeys = []; // Reset hidden URL keys when saving
      chrome.storage.local.set({ serverUrl, skippedSetup, hiddenUrlKeys }, () => {
        showTotpView();
      });
    } catch (error) {
      showError(onboardingError, 'Failed to fetch data from URL.');
      console.error(error);
    } finally {
      onboardingSaveBtn.textContent = 'Save & Continue';
      onboardingSaveBtn.disabled = false;
    }
  });

  onboardingSkipBtn.addEventListener('click', () => {
    skippedSetup = true;
    chrome.storage.local.set({ skippedSetup }, () => {
      showAddView();
    });
  });

  saveUrlBtn.addEventListener('click', async () => {
    const url = serverUrlInput.value.trim();
    if (!url) {
      if (serverUrl !== '') {
        serverUrl = '';
        chrome.storage.local.set({ serverUrl }, () => {
           saveUrlBtn.textContent = 'URL Cleared!';
           setTimeout(() => { saveUrlBtn.textContent = 'Update URL'; }, 1500);
        });
      }
      return;
    }

    try {
      new URL(url);
    } catch {
      showError(setupError, 'Invalid URL format.');
      return;
    }

    try {
      saveUrlBtn.textContent = 'Verifying...';
      saveUrlBtn.disabled = true;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      serverUrl = url;
      skippedSetup = false;
      hiddenUrlKeys = [];
      chrome.storage.local.set({ serverUrl, skippedSetup, hiddenUrlKeys }, () => {
        saveUrlBtn.textContent = 'Saved!';
        setTimeout(() => { saveUrlBtn.textContent = 'Update URL'; }, 1500);
      });
    } catch (error) {
      showError(setupError, 'Failed to fetch data from URL.');
      console.error(error);
    } finally {
      if (saveUrlBtn.textContent !== 'Saved!') {
        saveUrlBtn.textContent = 'Update URL';
      }
      saveUrlBtn.disabled = false;
    }
  });

  settingsBtn.addEventListener('click', () => {
    clearInterval(updateInterval);
    showSettingsView();
  });

  settingsBackBtn.addEventListener('click', () => {
    showTotpView();
  });

  saveCloudSettingsBtn.addEventListener('click', () => {
    const url = cloudUrlSettingsInput.value.trim();
    if (!url) {
      showError(cloudSettingsError, 'Please enter a valid API URL.');
      return;
    }
    try { new URL(url); } catch { showError(cloudSettingsError, 'Invalid API URL format.'); return; }
    
    cloudUrl = url;
    chrome.storage.local.set({ cloudUrl }, () => {
      saveCloudSettingsBtn.textContent = 'Saved!';
      setTimeout(() => { saveCloudSettingsBtn.textContent = 'Save Cloud URL'; }, 1500);
    });
  });

  pinEnableCheckbox.addEventListener('change', () => {
    if (pinEnableCheckbox.checked) {
      pinSettingsDiv.classList.remove('hidden');
    } else {
      pinSettingsDiv.classList.add('hidden');
      pinEnabled = false;
      chrome.storage.local.set({ pinEnabled }, () => {
        pinError.classList.add('hidden');
      });
    }
  });

  savePinBtn.addEventListener('click', () => {
    const isEnabled = pinEnableCheckbox.checked;
    const newPin = pinInput.value.trim();
    const newTimer = parseInt(autoLockSelect.value);

    if (isEnabled) {
      if (!/^\d{4}$/.test(newPin)) {
        showError(pinError, 'PIN must be exactly 4 digits.');
        return;
      }
      pinCode = newPin;
      autoLockTimer = newTimer;
    }
    pinEnabled = isEnabled;
    
    chrome.storage.local.set({ pinEnabled, pinCode, autoLockTimer }, () => {
      savePinBtn.textContent = 'Saved!';
      setTimeout(() => { savePinBtn.textContent = 'Save Security Settings'; }, 1500);
      pinError.classList.add('hidden');
    });
  });

  addBtn.addEventListener('click', () => {
    showAddView();
  });

  refreshBtn.addEventListener('click', async () => {
    if (serverUrl) {
      refreshBtn.disabled = true;
      const svg = refreshBtn.querySelector('svg');
      if (svg) svg.classList.add('spin-animation');
      totpList.innerHTML = '<li class="totp-item" style="justify-content:center;">Refreshing...</li>';
      try {
        const response = await fetch(serverUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        cachedSecrets = parseFlatJSONWithDuplicates(text);
        hiddenUrlKeys = [];
        chrome.storage.local.set({ hiddenUrlKeys });
      } catch (error) {
        showError(totpError, 'Failed to refresh from server.');
        console.error(error);
      } finally {
        refreshBtn.disabled = false;
        const svg = refreshBtn.querySelector('svg');
        if (svg) svg.classList.remove('spin-animation');
        totpList.innerHTML = '';
        updateCodes();
      }
    }
  });

  cancelManualBtn.addEventListener('click', () => {
    if (serverUrl || skippedSetup || Object.keys(manualKeys).length > 0) {
      showTotpView();
    } else {
      showOnboardingView();
    }
  });

  uploadBtn.addEventListener('click', () => {
    if (!cloudUrl) {
      showCloudSetupView();
    } else {
      uploadToCloud();
    }
  });

  cancelCloudBtn.addEventListener('click', () => {
    if (serverUrl || skippedSetup || Object.keys(manualKeys).length > 0) {
      showTotpView();
    } else {
      showOnboardingView();
    }
  });

  saveCloudBtn.addEventListener('click', () => {
    const url = cloudUrlInput.value.trim();
    if (!url) {
      showError(cloudError, 'Please enter a valid API URL.');
      return;
    }
    
    try {
      new URL(url);
    } catch {
      showError(cloudError, 'Invalid API URL format.');
      return;
    }
    
    cloudUrl = url;
    chrome.storage.local.set({ cloudUrl }, () => {
      uploadToCloud();
      showTotpView(); // Return user back after starting
    });
  });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const items = totpList.querySelectorAll('.totp-item');
    items.forEach(item => {
      const nameEl = item.querySelector('.totp-service');
      if (nameEl) {
        const name = nameEl.textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
      }
    });
  });

  saveManualBtn.addEventListener('click', () => {
    let name = manualNameInput.value.trim();
    const key = manualKeyInput.value.trim().toUpperCase().replace(/\s+/g, '');
    
    if (!name || !key) {
      showError(addError, 'Both fields are required.');
      return;
    }

    // Try dummy decoding to validate base32
    try {
      base32ToUint8Array(key);
    } catch (e) {
      showError(addError, 'Invalid Base32 Secret Key.');
      return;
    }

    const combined = { ...cachedSecrets, ...manualKeys };
    let baseName = name;
    let counter = 1;
    while (combined[name] !== undefined) {
      name = `${baseName}${counter}`;
      counter++;
    }

    manualKeys[name] = key;
    chrome.storage.local.set({ manualKeys }, () => {
      showTotpView();
    });
  });

  async function uploadToCloud() {
    uploadBtn.disabled = true;
    const svg = uploadBtn.querySelector('svg');
    if (svg) svg.classList.add('spin-animation');

    const combinedSecrets = { ...cachedSecrets };
    for (const key of hiddenUrlKeys) {
      delete combinedSecrets[key];
    }
    
    // Resolve collisions for cloud payload
    for (const [name, key] of Object.entries(manualKeys)) {
      let dispName = name;
      let counter = 1;
      while (combinedSecrets[dispName] !== undefined) {
        dispName = `${name}${counter}`;
        counter++;
      }
      combinedSecrets[dispName] = key;
    }
    
    const payload = { ...combinedSecrets, ok: "ok" };

    try {
      const response = await fetch(cloudUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      // Show short feedback on UI
      showError(totpError, 'Uploaded to Cloud successfully!');
      totpError.style.color = '#4caf50'; // Green
      setTimeout(() => { totpError.classList.add('hidden'); totpError.style.color = 'var(--error-color)'; }, 3000);
    } catch (error) {
      showError(totpError, 'Failed to upload to cloud: ' + error.message);
      console.error(error);
    } finally {
      uploadBtn.disabled = false;
      if (svg) svg.classList.remove('spin-animation');
    }
  }

  // UI Updates
  async function updateCodes() {
    const epoch = Math.round(Date.now() / 1000.0);
    const remainingSeconds = 30 - (epoch % 30);
    const progressPercent = (remainingSeconds / 30) * 100;
    
    progressBar.style.width = `${progressPercent}%`;

    const combinedSecrets = { ...cachedSecrets };
    for (const key of hiddenUrlKeys) {
      delete combinedSecrets[key];
    }
    
    const uiServices = [];
    for (const [name, key] of Object.entries(combinedSecrets)) {
      uiServices.push({ displayName: name, key: key, source: 'server', originalName: name });
    }
    for (const [name, key] of Object.entries(manualKeys)) {
      let dispName = name;
      let counter = 1;
      while (uiServices.find(s => s.displayName === dispName)) {
        dispName = `${name}${counter}`;
        counter++;
      }
      uiServices.push({ displayName: dispName, key: key, source: 'manual', originalName: name });
    }
    
    if (uiServices.length === 0) {
      totpList.innerHTML = '<li class="totp-item" style="justify-content:center; color: var(--text-secondary);">No keys available. Add one!</li>';
      return;
    }

    if (totpList.children.length === 0 || totpList.children[0].textContent.includes('Loading') || totpList.children[0].textContent.includes('No keys')) {
      totpList.innerHTML = '';
      for (const service of uiServices) {
        const li = document.createElement('li');
        li.className = 'totp-item';
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'totp-details';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'totp-service';
        nameDiv.textContent = service.displayName + (service.source === 'manual' ? ' (Manual)' : '');
        
        const codeDiv = document.createElement('div');
        codeDiv.className = 'totp-code';
        codeDiv.id = `code-${service.displayName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        codeDiv.textContent = '------';
        codeDiv.title = 'Click to copy';
        
        codeDiv.onclick = async () => {
          const rawCode = codeDiv.dataset.code;
          if (!rawCode) return;
          try {
            await navigator.clipboard.writeText(rawCode);
            codeDiv.classList.add('copied');
            codeDiv.textContent = 'COPIED';
            codeDiv.dataset.copiedUntil = Date.now() + 1500;
            setTimeout(() => {
              if (Date.now() >= parseInt(codeDiv.dataset.copiedUntil)) {
                codeDiv.classList.remove('copied');
                codeDiv.textContent = rawCode.slice(0, 3) + ' ' + rawCode.slice(3);
              }
            }, 1500);
          } catch (e) {
            console.error('Copy failed', e);
          }
        };
        
        detailsDiv.appendChild(nameDiv);
        detailsDiv.appendChild(codeDiv);
        li.appendChild(detailsDiv);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.title = 'Delete Key';
        deleteBtn.onclick = () => {
          confirmMessage.textContent = `Delete "${service.displayName}"?`;
          pendingDeleteAction = () => {
            if (service.source === 'manual') {
              delete manualKeys[service.originalName];
            } else {
              hiddenUrlKeys.push(service.originalName);
            }
            chrome.storage.local.set({ manualKeys, hiddenUrlKeys }, () => {
              totpList.innerHTML = '';
              updateCodes();
            });
          };
          confirmModal.classList.remove('hidden');
        };
        li.appendChild(deleteBtn);

        totpList.appendChild(li);
      }
      
      const query = searchInput.value.toLowerCase().trim();
      if (query !== '') {
        const items = totpList.querySelectorAll('.totp-item');
        items.forEach(item => {
          const nameEl = item.querySelector('.totp-service');
          if (nameEl) {
            const name = nameEl.textContent.toLowerCase();
            item.style.display = name.includes(query) ? 'flex' : 'none';
          }
        });
      }
    }

    for (const service of uiServices) {
      const code = await generateTOTP(service.key);
      
      const safeId = service.displayName.replace(/[^a-zA-Z0-9]/g, '-');
      const codeElement = document.getElementById(`code-${safeId}`);
      if (codeElement) {
         codeElement.dataset.code = code;
         if (Date.now() >= parseInt(codeElement.dataset.copiedUntil || 0)) {
           codeElement.textContent = code.slice(0,3) + ' ' + code.slice(3);
         }
      }
    }
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
  }
});
