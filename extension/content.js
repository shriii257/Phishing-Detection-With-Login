// Content script - runs on every webpage
// This creates the warning banner that appears at the top of suspicious sites

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showWarning') {
    showWarningBanner(request.threats, request.url);
  }
});

// Function to create and display warning banner
function showWarningBanner(threats, url) {
  // Remove existing banner if present
  const existing = document.getElementById('phishing-warning-banner');
  if (existing) {
    existing.remove();
  }
  
  // Determine overall severity level
  const hasCritical = threats.some(t => t.severity === 'critical');
  const hasHigh = threats.some(t => t.severity === 'high');
  
  let severityLevel = 'medium';
  let bannerColor = '#FFA500'; // Orange for medium
  let warningText = '⚠️ WARNING: This site may be suspicious';
  
  if (hasCritical) {
    severityLevel = 'critical';
    bannerColor = '#DC143C'; // Red for critical
    warningText = '🚨 DANGER: This site is likely a phishing attempt!';
  } else if (hasHigh) {
    severityLevel = 'high';
    bannerColor = '#FF6347'; // Tomato red for high
    warningText = '⚠️ ALERT: This site shows multiple warning signs';
  }
  
  // Create banner element
  const banner = document.createElement('div');
  banner.id = 'phishing-warning-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: ${bannerColor};
    color: white;
    padding: 15px 20px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    border-bottom: 3px solid rgba(0,0,0,0.2);
  `;
  
  // Create banner content
  const content = document.createElement('div');
  content.style.cssText = 'max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;';
  
  // Warning message and details
  const messageDiv = document.createElement('div');
  messageDiv.style.flex = '1';
  
  const title = document.createElement('div');
  title.style.cssText = 'font-weight: bold; font-size: 16px; margin-bottom: 8px;';
  title.textContent = warningText;
  
  const detailsList = document.createElement('ul');
  detailsList.style.cssText = 'margin: 5px 0 0 20px; padding: 0; font-size: 13px;';
  
  // Show top 3 threats
  threats.slice(0, 3).forEach(threat => {
    const li = document.createElement('li');
    li.textContent = threat.message;
    li.style.marginBottom = '3px';
    detailsList.appendChild(li);
  });
  
  messageDiv.appendChild(title);
  messageDiv.appendChild(detailsList);
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Close';
  closeBtn.style.cssText = `
    background: rgba(255,255,255,0.2);
    border: 2px solid white;
    color: white;
    padding: 8px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    margin-left: 20px;
  `;
  closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
  closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
  closeBtn.onclick = () => banner.remove();
  
  // Assemble banner
  content.appendChild(messageDiv);
  content.appendChild(closeBtn);
  banner.appendChild(content);
  
  // Insert banner at top of page
  document.body.insertBefore(banner, document.body.firstChild);
  
  // Add a small delay to push page content down smoothly
  document.body.style.marginTop = '0px';
  setTimeout(() => {
    document.body.style.transition = 'margin-top 0.3s ease';
    document.body.style.marginTop = banner.offsetHeight + 'px';
  }, 10);
}

// Check if we should show warning on page load
// (in case background script already detected threat)
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({ action: 'checkThreats' });
});