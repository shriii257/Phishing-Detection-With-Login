# Phishing Detection Extension with Login

A full-stack cybersecurity tool that detects phishing websites in real time — right from your browser. It combines a Chrome extension that scans every URL you visit with a Flask + MongoDB backend that tracks your scan history, lets you manage your account, and gives you a proper dashboard to see what's been caught.


## What This Project Does

Phishing attacks are one of the most common ways people get tricked online — fake login pages, lookalike bank sites, sketchy domains with character swaps like `paypa1.com`. This project fights back by automatically analyzing every website you visit the moment the page loads.

The extension checks for things like:
- Whether the site uses HTTPS
- Suspicious top-level domains (`.ru`, `.tk`, `.xyz`, etc.)
- Brand names buried in subdomains instead of the actual domain
- Character substitutions that make domains look legitimate (`g00gle`, `paypa1`)
- IP addresses used as domain names
- URLs that are suspiciously long or have too many hyphens
- Excessive subdomains that are a classic phishing trick

When something looks off, you'll see a colored warning banner slide down at the top of the page. Critical threats trigger a browser notification and flip the extension icon badge to a red `!`. Everything is also saved to your account so you can review your scan history later.

---

## Project Structure

```
Phishing-Detection-With-Login-main/
│
├── backend/                    # Flask API server
│   ├── app.py                  # Main server — auth, scan saving, stats
│   └── templates/
│       ├── dashboard.html      # Scan overview and stats
│       ├── history.html        # Full scan history with filters
│       ├── login.html          # Login page
│       ├── register.html       # Registration page
│       └── profile.html        # User profile and account info
│
└── extension/                  # Chrome extension
    ├── manifest.json           # Extension config (Manifest V3)
    ├── background.js           # Core URL analysis logic + tab monitoring
    ├── content.js              # Injects warning banners into web pages
    ├── popup.html              # Extension popup UI
    ├── popup.js                # Popup logic — login, scan display, dashboard link
    ├── styles.css              # Popup styling
    └── icon.png                # Extension icon
```

---

## Prerequisites

Before you start, make sure you have these installed:

- **Python 3.8+**
- **MongoDB** (running locally on port `27017`, or use MongoDB Atlas)
- **Google Chrome** (or any Chromium-based browser)
- **pip** for Python package management

---

## Backend Setup

### 1. Install Python dependencies

There's no `requirements.txt` included, so install these manually:

```bash
pip install flask flask-pymongo flask-cors werkzeug pyjwt
```

### 2. Set up environment variables (optional but recommended)

By default the app uses:
- `SECRET_KEY` → `phishing-secret-2024` *(change this in production)*
- `MONGO_URI` → `mongodb://localhost:27017/phishing_detector`

You can override these by setting environment variables before running:

```bash
# Linux / macOS
export SECRET_KEY=your-secret-key-here
export MONGO_URI=mongodb://localhost:27017/phishing_detector

# Windows (Command Prompt)
set SECRET_KEY=your-secret-key-here
set MONGO_URI=mongodb://localhost:27017/phishing_detector
```

### 3. Start MongoDB

Make sure MongoDB is running before you start the Flask server:

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows — start from Services or run:
mongod
```

### 4. Run the Flask server

```bash
cd backend
python app.py
```

The server will start at `http://localhost:5000`. You should see something like:

```
* Running on http://127.0.0.1:5000
* Debug mode: on
```

---

## Extension Setup

### 1. Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Toggle **Developer mode** on (top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. The extension will appear in your list — pin it for easy access by clicking the puzzle icon in the toolbar

### 2. Connect to your backend

The extension talks to `http://localhost:5000` by default (defined at the top of `popup.js`). As long as the Flask server is running, everything should connect automatically.

---

## How to Use It

1. **Register an account** — open the extension popup and create an account. Your credentials are stored securely in MongoDB with hashed passwords.

2. **Log in** — once logged in, you'll stay authenticated via a JWT token stored locally (24-hour expiry).

3. **Browse normally** — the extension automatically scans every page you visit. If something looks suspicious, a warning banner appears at the top of the page instantly. Critical threats also send a browser notification.

4. **Check the popup** — click the extension icon at any time to see a detailed breakdown of the current page's threat analysis.

5. **Open the dashboard** — click the "Dashboard" button in the popup to open the full web interface where you can see your scan history, stats, and account info.

---

## API Reference

The Flask backend exposes a REST API used by both the extension popup and the web dashboard.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Log in and receive a JWT token |
| GET | `/api/auth/me` | Get current user info *(requires token)* |

### Scans

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scans` | Save a scan result *(requires token)* |
| GET | `/api/scans` | Get scan history with pagination *(requires token)* |
| GET | `/api/scans/stats` | Get stats + recent activity *(requires token)* |
| DELETE | `/api/scans/<scan_id>` | Delete a scan record *(requires token)* |

All protected routes need an `Authorization: Bearer <token>` header.

---

## Detection Logic

The `background.js` file is where all the analysis happens. Here's what it checks for every URL:

| Check | What It Catches | Severity |
|-------|----------------|----------|
| No HTTPS | Unencrypted connections | Medium |
| Suspicious TLD | `.ru`, `.tk`, `.xyz`, `.top`, `.click`, `.ml`, etc. | High |
| Long URL (100+ chars) | Obfuscated phishing links | Medium |
| Too many subdomains (4+) | `secure.login.paypal.fake.com` style attacks | Medium |
| IP address as hostname | Bypasses domain-based trust | High |
| Brand in subdomain | `paypal.evil-site.com` style spoofing | High |
| Homograph / char substitution | `paypa1`, `g00gle`, `arnazon` | Critical |
| Suspicious keywords + hyphens | `secure-verify-login.com` patterns | Medium |
| Too many hyphens (4+) | Common phishing domain pattern | Medium |

Warning banners are color-coded by severity — orange for medium, red-orange for high, crimson for critical.

---

## Customization

A few things you might want to tweak:

**Add more brands to watch for** — open `background.js` and add to the `POPULAR_BRANDS` array:
```javascript
const POPULAR_BRANDS = [
  'google', 'facebook', 'amazon', ...
  'yourbank', 'yourservice'  // add yours here
];
```

**Add or remove suspicious TLDs** — edit the `SUSPICIOUS_TLDS` array in the same file.

**Change the URL length threshold** — currently flagged at 100 characters. Search for `url.length > 100` in `background.js` and adjust.

**Point the extension to a remote server** — change the `API_BASE` value at the top of `popup.js`:
```javascript
const API_BASE = 'https://your-deployed-server.com';
```

---

## Troubleshooting

**Extension won't load**
- Make sure all files are inside the `extension/` folder
- Double-check `manifest.json` for any syntax errors
- Confirm Developer mode is enabled in `chrome://extensions/`

**No warning banners appearing**
- Open DevTools (F12) and check the Console tab for errors
- Make sure you're on a regular website, not a `chrome://` internal page
- Try disabling and re-enabling the extension

**Login or registration failing**
- Verify the Flask server is running at `http://localhost:5000`
- Check that MongoDB is running and accessible
- Look at the Flask terminal output for error messages

**Scans not saving to history**
- Make sure you're logged in — the popup should show your name
- The token may have expired (24-hour limit) — log out and back in

---

## Future Ideas

A few things worth adding if you want to take this further:

- [ ] Integration with Google Safe Browsing API for known-bad URL lookups
- [ ] Machine learning model trained on phishing datasets
- [ ] User-managed whitelist and blacklist
- [ ] Export scan history as CSV or PDF
- [ ] Certificate transparency log checks
- [ ] Support for Firefox via WebExtensions API
- [ ] Dockerized setup so the backend is easier to deploy
- [ ] Rate limiting on the API to prevent abuse

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Browser Extension | Chrome Extension (Manifest V3) |
| Extension Logic | Vanilla JavaScript |
| Backend Framework | Flask (Python) |
| Database | MongoDB via PyMongo |
| Authentication | JWT (JSON Web Tokens) |
| Password Hashing | Werkzeug (PBKDF2) |
| Cross-Origin Requests | Flask-CORS |

---

## License

This is an educational project — feel free to use it, break it, and build on it. If you deploy it anywhere publicly, make sure to set a proper `SECRET_KEY` and lock down the CORS settings in `app.py`.
