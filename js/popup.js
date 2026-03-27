document.addEventListener('DOMContentLoaded', async () => {
  const setupView = document.getElementById('setup-view');
  const totpView = document.getElementById('totp-view');
  
  const serverUrlInput = document.getElementById('server-url-input');
  const saveUrlBtn = document.getElementById('save-url-btn');
  const setupError = document.getElementById('setup-error');
  
  const totpList = document.getElementById('totp-list');
  const progressBar = document.getElementById('progress-bar');
  const settingsBtn = document.getElementById('settings-btn');
  const totpError = document.getElementById('totp-error');

  let updateInterval;
  let cachedSecrets = null;

  // Check if URL is saved
  chrome.storage.local.get(['serverUrl'], (result) => {
    if (result.serverUrl) {
      showTotpView(result.serverUrl);
    } else {
      showSetupView();
    }
  });

  // Save URL
  saveUrlBtn.addEventListener('click', async () => {
    const url = serverUrlInput.value.trim();
    if (!url) {
      showError(setupError, 'Please enter a valid URL.');
      return;
    }

    try {
      new URL(url); // Validate URL format
    } catch {
      showError(setupError, 'Invalid URL format.');
      return;
    }

    // Test the URL before saving
    try {
      saveUrlBtn.textContent = 'Saving...';
      saveUrlBtn.disabled = true;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      // Save to storage
      chrome.storage.local.set({ serverUrl: url }, () => {
        showTotpView(url, data);
      });
    } catch (error) {
      showError(setupError, 'Failed to fetch data from URL.');
      console.error(error);
    } finally {
      saveUrlBtn.textContent = 'Save';
      saveUrlBtn.disabled = false;
    }
  });

  // Go back to setup/settings
  settingsBtn.addEventListener('click', () => {
    clearInterval(updateInterval);
    chrome.storage.local.get(['serverUrl'], (result) => {
      serverUrlInput.value = result.serverUrl || '';
      showSetupView();
    });
  });

  function showSetupView() {
    setupView.classList.remove('hidden');
    totpView.classList.add('hidden');
    setupError.classList.add('hidden');
  }

  async function showTotpView(url, initialData = null) {
    setupView.classList.add('hidden');
    totpView.classList.remove('hidden');
    totpError.classList.add('hidden');
    totpList.innerHTML = '<li class="totp-item" style="text-align:center;">Loading...</li>';

    try {
      if (initialData) {
        cachedSecrets = initialData;
      } else {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        cachedSecrets = await response.json();
      }

      updateCodes();
      
      // Clear any existing interval
      if (updateInterval) clearInterval(updateInterval);
      
      // Set interval to update progress and codes
      updateInterval = setInterval(updateCodes, 1000);
      
    } catch (error) {
      showError(totpError, 'Failed to sync with server.');
      totpList.innerHTML = '';
      console.error(error);
    }
  }

  async function updateCodes() {
    if (!cachedSecrets) return;

    // Calculate remaining seconds in the current 30 second window
    const epoch = Math.round(Date.now() / 1000.0);
    const remainingSeconds = 30 - (epoch % 30);
    const progressPercent = (remainingSeconds / 30) * 100;
    
    progressBar.style.width = `${progressPercent}%`;

    const services = Object.keys(cachedSecrets);
    
    if (totpList.children.length === 0 || totpList.children[0].textContent === 'Loading...') {
      totpList.innerHTML = ''; // Clear loading state
      for (const service of services) {
        const li = document.createElement('li');
        li.className = 'totp-item';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'totp-service';
        nameDiv.textContent = service;
        
        const codeDiv = document.createElement('div');
        codeDiv.className = 'totp-code';
        codeDiv.id = `code-${service}`;
        codeDiv.textContent = '------'; // Placeholder
        
        li.appendChild(nameDiv);
        li.appendChild(codeDiv);
        totpList.appendChild(li);
      }
    }

    // Generate codes
    for (const service of services) {
      const secret = cachedSecrets[service];
      const code = await generateTOTP(secret);
      
      const codeElement = document.getElementById(`code-${service}`);
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
