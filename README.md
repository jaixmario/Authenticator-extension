# 🔐 TOTP Authenticator

A lightweight, modern browser extension for generating Time-based One-Time Passwords (TOTP) — compatible with Google Authenticator, Authy, and any standard TOTP service.

![Version](https://img.shields.io/badge/version-1.1.11-blueviolet) ![Manifest](https://img.shields.io/badge/manifest-v3-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌐 **Server Sync** | Fetch TOTP keys from a remote JSON URL automatically |
| ✍️ **Manual Keys** | Add keys manually by nickname and Base32 secret |
| ☁️ **Cloud Backup** | Upload all keys to your own cloud worker API |
| 🔄 **Auto Refresh** | Codes update every second with a live progress bar |
| 📋 **Click to Copy** | Click any code to copy it to your clipboard instantly |
| 🔍 **Search** | Filter keys in real-time by nickname |
| 🔒 **PIN Lock** | Protect the extension with a 4-digit PIN and auto-lock timer |
| 🗑️ **Safe Delete** | Custom confirmation modal before deleting any key |

---

## 📦 Installation

Since this extension is not published to the Chrome Web Store, you need to load it manually:

1. **Download or clone** this repository to your local machine.
2. Open your browser and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (toggle in the top-right corner).
4. Click **"Load unpacked"** and select the `Authenticator-extension` folder.
5. The extension icon will appear in your browser toolbar. Pin it for easy access.

---

## 🚀 Usage

### First-Time Setup

When you open the extension for the first time, you'll see the **Welcome** screen. You have two options:

#### Option A: Fetch Keys from a Server URL
1. Enter a URL pointing to a JSON file containing your TOTP secrets (e.g., `https://example.com/keys.json`).
2. Click **Save & Continue**. The extension will fetch and display your keys.

**Expected JSON format:**
```json
{
  "Google": "BASE32SECRETHERE",
  "GitHub": "ANOTHERSECRET",
  "MyService": "YETSECRETKEY32"
}
```
> Duplicate keys are handled gracefully — they'll be renamed automatically (e.g., `Google`, `Google1`).

#### Option B: Add Keys Manually
1. Click **Add Key Manually** on the welcome screen.
2. Enter a **Nickname** (e.g., `GitHub`) and the **Base32 Secret Key**.
3. Click **Add Key**.

---

## ⚙️ Settings

Access settings via the **⚙️ gear icon** in the top-right of the authenticator view.

### Server Sync
- **Update URL**: Change or clear the remote JSON URL used to fetch keys. Leave blank and click the button to remove the URL.

### Security (PIN Lock)
- Toggle the **Enable PIN Lock** switch to protect the extension.
- Enter a **4-digit PIN**.
- Select an **Auto-lock timer**:
  - `Immediately` — Lock every time the popup is closed.
  - `1 minute`, `5 minutes`, `15 minutes`, `1 hour` — Lock after the selected idle time.
- Click **Save Security Settings**.

> To disable the lock, simply toggle the switch off — it will take effect immediately without needing to save.

### Cloud Backup
- Enter your **Cloud Worker API URL** (a custom endpoint that accepts a POST with your keys JSON).
- Click **Save API URL**.
- Use the **☁️ upload icon** in the main view to push all your keys to the cloud.

---

## 🔑 Key Management

### Adding Keys
- Click the **➕ plus icon** in the top-right to go to the Add Key view.
- Enter a nickname and Base32 secret, then click **Add Key**.

### Deleting Keys
- Click the **🗑️ trash icon** on any key card.
- A confirmation modal will appear — click **Delete** to confirm or **Cancel** to go back.
- **Server-synced keys** are hidden locally (not deleted remotely).
- **Manually added keys** are permanently deleted from local storage.

### Refreshing Server Keys
- Click the **🔄 refresh icon** to re-fetch all keys from your configured server URL.
- This also un-hides any previously deleted server keys.

---

## 🔒 PIN Lock Details

- The PIN and last-active timestamp are stored in `chrome.storage.local`.
- Auto-lock triggers based on your last interaction with the extension popup.
- Enter your PIN on the **App Locked** screen to unlock.
- Pressing **Enter** on the PIN field also submits it.

---

## 🛠️ Development

### Project Structure
```
Authenticator-extension/
├── manifest.json       # Chrome Extension Manifest v3
├── popup.html          # Main UI structure
├── popup.css           # Styles and theming
└── js/
    ├── base32.js       # Base32 decoder utility
    ├── totp.js         # TOTP generation via Web Crypto API
    └── popup.js        # Core application logic
```

### TOTP Implementation
- Uses the **Web Crypto API** (`crypto.subtle`) for HMAC-SHA1.
- Fully client-side — no server-side computation needed.
- Compliant with [RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238).

### Permissions
| Permission | Reason |
|---|---|
| `storage` | Save keys, settings, and PIN to local browser storage |
| `host_permissions: *://*/*` | Fetch keys from any user-configured remote URL |

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`.
3. Commit your changes: `git commit -m 'Add my feature'`.
4. Push to the branch: `git push origin feature/my-feature`.
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
