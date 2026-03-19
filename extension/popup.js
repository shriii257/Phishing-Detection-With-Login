const API_BASE = 'http://localhost:5000';

// ── Boot ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Wire up ALL event listeners here — no inline onclick in HTML
  document.getElementById('tab-login').addEventListener('click', () => showTab('login'));
  document.getElementById('tab-register').addEventListener('click', () => showTab('register'));
  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('reg-btn').addEventListener('click', doRegister);
  document.getElementById('dashboard-btn').addEventListener('click', openDashboard);
  document.getElementById('logout-btn').addEventListener('click', doLogout);

  // Enter key support
  document.getElementById('login-password').addEventListener('keypress', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('reg-password').addEventListener('keypress', e => {
    if (e.key === 'Enter') doRegister();
  });

  // Check auth state
  const token = localStorage.getItem('pd_token');
  if (token) {
    showMainScreen();
    analyzeCurrentPage();
  } else {
    showAuthScreen();
  }
});

// ── Screen helpers ───────────────────────────────────
function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'block';
  document.getElementById('main-screen').style.display = 'none';
}

function showMainScreen() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';
  const user = JSON.parse(localStorage.getItem('pd_user') || '{}');
  document.getElementById('user-name').textContent = user.name || 'User';
}

function showTab(tab) {
  document.getElementById('login-form').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

function openDashboard() {
  chrome.tabs.create({ url: `${API_BASE}/dashboard` });
}

function doLogout() {
  localStorage.removeItem('pd_token');
  localStorage.removeItem('pd_user');
  showAuthScreen();
}

// ── Login ────────────────────────────────────────────
async function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }

  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const res  = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('pd_token', data.token);
    localStorage.setItem('pd_user', JSON.stringify(data.user));
    showMainScreen();
    analyzeCurrentPage();
  } catch (e) {
    errEl.textContent = e.message;
    btn.disabled = false;
    btn.textContent = 'Sign In →';
  }
}

// ── Register ─────────────────────────────────────────
async function doRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  const btn      = document.getElementById('reg-btn');

  errEl.textContent = '';
  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }

  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    const res  = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    localStorage.setItem('pd_token', data.token);
    localStorage.setItem('pd_user', JSON.stringify(data.user));
    showMainScreen();
    analyzeCurrentPage();
  } catch (e) {
    errEl.textContent = e.message;
    btn.disabled = false;
    btn.textContent = 'Create Account →';
  }
}

// ── Scan ─────────────────────────────────────────────
function analyzeCurrentPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const url = tabs[0].url;

    displayURL(url);

    if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) {
      showSpecialPageMessage();
      return;
    }

    chrome.runtime.sendMessage({ action: 'analyzeCurrentTab' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Runtime error:', chrome.runtime.lastError.message);
        return;
      }
      if (response && response.threats !== undefined) {
        displayResults(response.threats);
        saveScanToBackend(url, response.threats);
      }
    });
  });
}

async function saveScanToBackend(url, threats) {
  const token = localStorage.getItem('pd_token');
  if (!token) return;

  try {
    await fetch(`${API_BASE}/api/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ url, threats })
    });
  } catch (e) {
    console.log('Could not save scan:', e.message);
  }
}

// ── Display helpers ───────────────────────────────────
function displayURL(url) {
  const el = document.getElementById('current-url');
  try {
    el.textContent = new URL(url).hostname;
    el.title = url;
  } catch {
    el.textContent = url;
  }
}

function displayResults(threats) {
  const statusDiv        = document.getElementById('status');
  const statusText       = statusDiv.querySelector('.status-text');
  const statusIcon       = statusDiv.querySelector('.status-icon');
  const threatsContainer = document.getElementById('threats-container');
  const threatsList      = document.getElementById('threats-list');
  const safeMessage      = document.getElementById('safe-message');

  if (threats.length === 0) {
    statusDiv.className            = 'status-safe';
    statusIcon.textContent         = '✓';
    statusText.textContent         = 'Site appears safe';
    safeMessage.style.display      = 'block';
    threatsContainer.style.display = 'none';
    return;
  }

  const hasCritical = threats.some(t => t.severity === 'critical');
  const hasHigh     = threats.some(t => t.severity === 'high');

  if (hasCritical) {
    statusDiv.className    = 'status-danger';
    statusIcon.textContent = '⚠';
    statusText.textContent = 'DANGER: Likely phishing site!';
  } else if (hasHigh) {
    statusDiv.className    = 'status-warning';
    statusIcon.textContent = '⚠';
    statusText.textContent = 'Warning: Suspicious site detected';
  } else {
    statusDiv.className    = 'status-caution';
    statusIcon.textContent = '!';
    statusText.textContent = 'Caution: Minor concerns detected';
  }

  safeMessage.style.display      = 'none';
  threatsContainer.style.display = 'block';
  threatsList.innerHTML = '';

  threats.forEach(threat => {
    const item  = document.createElement('div');
    item.className = `threat-item threat-${threat.severity}`;

    const badge = document.createElement('span');
    badge.className   = 'severity-badge';
    badge.textContent = threat.severity.toUpperCase();

    const msg = document.createElement('span');
    msg.className   = 'threat-message';
    msg.textContent = threat.message;

    item.appendChild(badge);
    item.appendChild(msg);
    threatsList.appendChild(item);
  });
}

function showSpecialPageMessage() {
  const statusDiv = document.getElementById('status');
  statusDiv.className = 'status-info';
  statusDiv.querySelector('.status-icon').textContent = 'ℹ';
  statusDiv.querySelector('.status-text').textContent = 'Cannot analyze browser pages';

  const safeMessage = document.getElementById('safe-message');
  safeMessage.style.display = 'block';
  safeMessage.innerHTML = `
    <div class="safe-box">
      <div class="safe-icon">ℹ️</div>
      <p>This is a browser internal page.</p>
      <p class="safe-note">Extension works on regular websites only.</p>
    </div>`;
  document.getElementById('threats-container').style.display = 'none';
}