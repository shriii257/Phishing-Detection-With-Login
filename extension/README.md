# 🛡️ Phishing Detection Chrome Extension

A cybersecurity project that detects and warns users about potentially phishing websites in real-time.

## 📋 Features

- **Real-time URL Analysis**: Automatically scans every website you visit
- **Multiple Detection Methods**:
  - HTTPS/SSL validation
  - Suspicious TLD detection (.ru, .tk, .xyz, etc.)
  - Lookalike domain detection (paypa1.com, g00gle.com)
  - Homograph attack detection (character substitutions)
  - IP address usage detection
  - Excessive subdomain detection
  - Suspicious keyword patterns
  - URL length analysis
  
- **Multi-level Alerts**:
  - In-page warning banner
  - Browser notification for critical threats
  - Extension icon badge indicator
  - Detailed popup with threat information

## 🚀 Installation Instructions

### Step 1: Create Project Folder
1. Create a new folder on your computer named `phishing-detector`
2. Save all the project files in this folder

### Step 2: Create Icon (Simple Method)
Since we can't include actual image files, create a simple icon:

**Option A - Use a placeholder:**
1. Download any shield icon (128x128 pixels) from the internet
2. Rename it to `icon.png`
3. Place it in your project folder

**Option B - Create using online tool:**
1. Visit: https://favicon.io/favicon-generator/
2. Create a simple shield emoji icon (🛡️)
3. Download and rename to `icon.png`

### Step 3: Load Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"** button
5. Select your `phishing-detector` folder
6. The extension should now appear in your extensions list!

### Step 4: Pin the Extension (Optional)
1. Click the puzzle icon in Chrome toolbar
2. Find "Phishing Detection Extension"
3. Click the pin icon to keep it visible

## 📁 Project Structure

```
phishing-detector/
│
├── manifest.json       # Extension configuration
├── background.js       # Main detection logic
├── content.js          # Warning banner script
├── popup.html          # Popup interface
├── popup.js           # Popup functionality
├── styles.css         # Popup styling
├── icon.png           # Extension icon (you create this)
└── README.md          # This file
```

## 🧪 Testing the Extension

### Test with Safe Sites:
- Visit: `https://google.com` - Should show ✓ safe
- Visit: `https://github.com` - Should show ✓ safe

### Test with Suspicious Patterns:
1. **No HTTPS**: Visit any `http://` site (not https)
2. **Long URL**: Create a bookmark with a very long URL (100+ chars)
3. **Suspicious TLD**: Visit sites ending in .tk, .xyz (be careful!)
4. **IP Address**: Visit any site by IP like `http://142.250.185.46`

### What You Should See:
- ⚠️ Warning banner at top of suspicious pages
- 🔴 Red badge (!) on extension icon
- Browser notification for critical threats
- Detailed threat list in popup when you click extension icon

## 💡 How It Works

### 1. Background Script (background.js)
- Monitors all tab updates
- Analyzes URLs using multiple security checks
- Stores threat data for each tab
- Sends alerts to content script and popup

### 2. Content Script (content.js)
- Injects warning banner into suspicious pages
- Creates visual alerts directly on the webpage
- Can be dismissed by user

### 3. Popup (popup.html + popup.js)
- Shows detailed analysis when you click extension icon
- Displays current URL and all detected threats
- Color-coded severity levels (green/yellow/orange/red)

## 🎯 Detection Techniques Explained

### 1. HTTPS Check
- Verifies if site uses encrypted connection
- HTTP sites flagged as medium risk

### 2. Lookalike Domain Detection
- Checks for character substitutions (0 for O, 1 for I)
- Detects brand names in wrong positions (paypal.fake-site.com)
- Protects against homograph attacks

### 3. Suspicious TLD Detection
- Flags domains from high-risk extensions
- Examples: .ru, .tk, .xyz, .top

### 4. Structural Analysis
- Too many subdomains (security.login.verify.paypal.com)
- Excessive URL length (often used to hide real domain)
- Too many hyphens in domain name

### 5. Pattern Recognition
- Suspicious keywords: "verify", "secure", "login", "update"
- IP addresses instead of domain names
- Unusual domain structures

## 📝 Customization Ideas

### Easy Modifications:
1. **Add More Brands**: Edit `POPULAR_BRANDS` array in `background.js`
2. **Adjust Sensitivity**: Change threshold values (URL length, subdomain count)
3. **Add New TLDs**: Update `SUSPICIOUS_TLDS` array
4. **Change Colors**: Modify CSS in `styles.css`

### Advanced Features to Add:
- Database of known phishing sites
- Machine learning classification
- Certificate validation
- Page content analysis
- User reporting system
- Whitelist/blacklist management


## 🔧 Troubleshooting

### Extension won't load:
- Make sure all files are in the same folder
- Check that manifest.json has no syntax errors
- Verify Developer mode is enabled

### No warnings appearing:
- Check browser console for errors (F12)
- Make sure you're visiting actual websites (not chrome:// pages)
- Try reloading the extension

### Banner not showing:
- Some sites may block content scripts
- Check if content.js is properly listed in manifest.json

## 📚 Learning Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Web Security Basics](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Phishing Attack Types](https://www.phishing.org/phishing-types)

## 🚀 Future Enhancements

- [ ] Integration with Google Safe Browsing API
- [ ] Machine learning model for better detection
- [ ] User whitelist/blacklist functionality
- [ ] Export threat reports
- [ ] Multi-language support
- [ ] Certificate chain validation
- [ ] Screenshot capture of suspicious sites

## 📄 License

This is an educational project. Feel free to modify and use for learning purposes.

