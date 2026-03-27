document.addEventListener('DOMContentLoaded', async () => {
  const setupView = document.getElementById('setup-view');
  const addView = document.getElementById('add-view');
  const totpView = document.getElementById('totp-view');
  
  const serverUrlInput = document.getElementById('server-url-input');
  const saveUrlBtn = document.getElementById('save-url-btn');
  const skipSetupBtn = document.getElementById('skip-setup-btn');
  const setupError = document.getElementById('setup-error');
  
  const manualNameInput = document.getElementById('manual-name-input');
  const manualKeyInput = document.getElementById('manual-key-input');
  const saveManualBtn = document.getElementById('save-manual-btn');
  const cancelManualBtn = document.getElementById('cancel-manual-btn');
  const addError = document.getElementById('add-error');

  const totpList = document.getElementById('totp-list');
  const progressBar = document.getElementById('progress-bar');
  const settingsBtn = document.getElementById('settings-btn');
  const addBtn = document.getElementById('add-btn');
  const totpError = document.getElementById('totp-error');

  let updateInterval;
  let cachedSecrets = {};
  let manualKeys = {};
  let serverUrl = '';
  let skippedSetup = false;

  // Initialization
  chrome.storage.local.get(['serverUrl', 'manualKeys', 'skippedSetup'], (result) => {
    if (result.manualKeys) {
      manualKeys = result.manualKeys;
    }
    serverUrl = result.serverUrl || '';
    skippedSetup = result.skippedSetup || false;
    
    if (serverUrl || skippedSetup || Object.keys(manualKeys).length > 0) {
      showTotpView();
    } else {
      showSetupView();
    }
  });

  // Views Toggles
  function showSetupView() {
    setupView.classList.remove('hidden');
    addView.classList.add('hidden');
    totpView.classList.add('hidden');
    setupError.classList.add('hidden');
  }

  function showAddView() {
    setupView.classList.add('hidden');
    totpView.classList.add('hidden');
    addView.classList.remove('hidden');
    addError.classList.add('hidden');
    manualNameInput.value = '';
    manualKeyInput.value = '';
  }

  async function showTotpView() {
    setupView.classList.add('hidden');
    addView.classList.add('hidden');
    totpView.classList.remove('hidden');
    totpError.classList.add('hidden');
    
    totpList.innerHTML = '<li class="totp-item" style="justify-content:center;">Loading...</li>';
    cachedSecrets = {}; // Reset

    try {
      if (serverUrl) {
        const response = await fetch(serverUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        cachedSecrets = await response.json();
      }
    } catch (error) {
      showError(totpError, 'Failed to sync with server.');
      console.error(error);
    }

    updateCodes();
    
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateCodes, 1000);
  }

  // Event Listeners
  saveUrlBtn.addEventListener('click', async () => {
    const url = serverUrlInput.value.trim();
    if (!url) {
      showError(setupError, 'Please enter a valid URL.');
      return;
    }

    try {
      new URL(url);
    } catch {
      showError(setupError, 'Invalid URL format.');
      return;
    }

    try {
      saveUrlBtn.textContent = 'Saving...';
      saveUrlBtn.disabled = true;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      // Successful fetch
      serverUrl = url;
      skippedSetup = false;
      chrome.storage.local.set({ serverUrl, skippedSetup }, () => {
        showTotpView();
      });
    } catch (error) {
      showError(setupError, 'Failed to fetch data from URL.');
      console.error(error);
    } finally {
      saveUrlBtn.textContent = 'Save URL';
      saveUrlBtn.disabled = false;
    }
  });

  skipSetupBtn.addEventListener('click', () => {
    skippedSetup = true;
    chrome.storage.local.set({ skippedSetup }, () => {
      showTotpView();
    });
  });

  settingsBtn.addEventListener('click', () => {
    clearInterval(updateInterval);
    serverUrlInput.value = serverUrl;
    showSetupView();
  });

  addBtn.addEventListener('click', () => {
    showAddView();
  });

  cancelManualBtn.addEventListener('click', () => {
    if (serverUrl || skippedSetup || Object.keys(manualKeys).length > 0) {
      showTotpView();
    } else {
      showSetupView();
    }
  });

  saveManualBtn.addEventListener('click', () => {
    const name = manualNameInput.value.trim();
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

    manualKeys[name] = key;
    chrome.storage.local.set({ manualKeys }, () => {
      showTotpView();
    });
  });

  // UI Updates
  async function updateCodes() {
    const epoch = Math.round(Date.now() / 1000.0);
    const remainingSeconds = 30 - (epoch % 30);
    const progressPercent = (remainingSeconds / 30) * 100;
    
    progressBar.style.width = `${progressPercent}%`;

    const combinedSecrets = { ...cachedSecrets, ...manualKeys };
    const services = Object.keys(combinedSecrets);
    
    if (services.length === 0) {
      totpList.innerHTML = '<li class="totp-item" style="justify-content:center; color: var(--text-secondary);">No keys available. Add one!</li>';
      return;
    }

    if (totpList.children.length === 0 || totpList.children[0].textContent.includes('Loading') || totpList.children[0].textContent.includes('No keys')) {
      totpList.innerHTML = '';
      for (const service of services) {
        const li = document.createElement('li');
        li.className = 'totp-item';
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'totp-details';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'totp-service';
        nameDiv.textContent = service + (manualKeys[service] && cachedSecrets[service] === undefined ? ' (Manual)' : '');
        
        const codeDiv = document.createElement('div');
        codeDiv.className = 'totp-code';
        codeDiv.id = `code-${service.replace(/[^a-zA-Z0-9]/g, '-')}`;
        codeDiv.textContent = '------';
        
        detailsDiv.appendChild(nameDiv);
        detailsDiv.appendChild(codeDiv);
        li.appendChild(detailsDiv);

        if (manualKeys[service] && cachedSecrets[service] === undefined) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-btn';
          deleteBtn.innerHTML = '🗑️';
          deleteBtn.title = 'Delete Manual Key';
          deleteBtn.onclick = () => {
            delete manualKeys[service];
            chrome.storage.local.set({ manualKeys }, () => {
              showTotpView();
            });
          };
          li.appendChild(deleteBtn);
        }

        totpList.appendChild(li);
      }
    }

    for (const service of services) {
      const secret = combinedSecrets[service];
      const code = await generateTOTP(secret);
      
      const safeId = service.replace(/[^a-zA-Z0-9]/g, '-');
      const codeElement = document.getElementById(`code-${safeId}`);
      if (codeElement) {
         codeElement.textContent = code.slice(0,3) + ' ' + code.slice(3);
      }
    }
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
  }
});
