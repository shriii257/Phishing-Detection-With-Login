// Background script runs in the background and monitors all tabs
// This is the main security checking logic

// List of suspicious TLDs (Top Level Domains) often used in phishing
const SUSPICIOUS_TLDS = ['.ru', '.tk', '.xyz', '.top', '.work', '.click', '.gq', '.ml', '.ga', '.cf'];

// List of commonly phished brands - used to detect lookalike domains
const POPULAR_BRANDS = [
  'google', 'facebook', 'amazon', 'paypal', 'microsoft', 'apple', 
  'netflix', 'instagram', 'twitter', 'linkedin', 'ebay', 'yahoo',
  'bankofamerica', 'chase', 'wellsfargo', 'citibank'
];

// Common character substitutions used in phishing (homograph attacks)
const SUSPICIOUS_CHARS = {
  '0': 'o',  // zero instead of letter o
  '1': 'i',  // one instead of letter i
  '3': 'e',  // three instead of letter e
  '5': 's',  // five instead of letter s
  '8': 'b',  // eight instead of letter b
  'vv': 'w'  // double v instead of w
};

// Function to check if URL is suspicious
function analyzeURL(url) {
  const threats = [];
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const protocol = urlObj.protocol;
    
    // Check 1: HTTPS validation
    if (protocol !== 'https:') {
      threats.push({
        type: 'NO_HTTPS',
        message: '⚠️ Site does not use HTTPS encryption',
        severity: 'medium'
      });
    }
    
    // Check 2: Suspicious TLD
    for (const tld of SUSPICIOUS_TLDS) {
      if (hostname.endsWith(tld)) {
        threats.push({
          type: 'SUSPICIOUS_TLD',
          message: `🚨 Suspicious domain extension: ${tld}`,
          severity: 'high'
        });
        break;
      }
    }
    
    // Check 3: Excessive length (phishing URLs are often very long)
    if (url.length > 100) {
      threats.push({
        type: 'LONG_URL',
        message: '⚠️ Unusually long URL detected',
        severity: 'medium'
      });
    }
    
    // Check 4: Too many subdomains (e.g., secure.login.paypal.suspicious.com)
    const subdomains = hostname.split('.');
    if (subdomains.length > 4) {
      threats.push({
        type: 'MANY_SUBDOMAINS',
        message: '⚠️ Excessive subdomains detected',
        severity: 'medium'
      });
    }
    
    // Check 5: IP address instead of domain name
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
      threats.push({
        type: 'IP_ADDRESS',
        message: '🚨 Using IP address instead of domain name',
        severity: 'high'
      });
    }
    
    // Check 6: Lookalike domain detection (homograph attack)
    for (const brand of POPULAR_BRANDS) {
      if (hostname.includes(brand)) {
        // Check for character substitutions
        let hasSubstitution = false;
        for (const [fake, real] of Object.entries(SUSPICIOUS_CHARS)) {
          if (hostname.includes(fake) && hostname.includes(brand)) {
            hasSubstitution = true;
            threats.push({
              type: 'LOOKALIKE_DOMAIN',
              message: `🚨 Possible fake ${brand} site (character substitution detected)`,
              severity: 'critical'
            });
            break;
          }
        }
        
        // Check for brand name in subdomain (e.g., paypal.fake-site.com)
        const parts = hostname.split('.');
        const mainDomain = parts.length >= 2 ? parts[parts.length - 2] : '';
        if (hostname.includes(brand) && !mainDomain.includes(brand)) {
          threats.push({
            type: 'BRAND_IN_SUBDOMAIN',
            message: `⚠️ Brand name "${brand}" appears in subdomain, not main domain`,
            severity: 'high'
          });
        }
      }
    }
    
    // Check 7: Suspicious keywords in URL
    const suspiciousKeywords = ['verify', 'account', 'secure', 'login', 'update', 'confirm', 'banking'];
    const urlLower = url.toLowerCase();
    for (const keyword of suspiciousKeywords) {
      if (urlLower.includes(keyword) && urlLower.includes('-')) {
        threats.push({
          type: 'SUSPICIOUS_KEYWORDS',
          message: `⚠️ Suspicious keywords with hyphens detected: "${keyword}"`,
          severity: 'medium'
        });
        break;
      }
    }
    
    // Check 8: Too many hyphens (common in phishing)
    const hyphenCount = (hostname.match(/-/g) || []).length;
    if (hyphenCount > 3) {
      threats.push({
        type: 'MANY_HYPHENS',
        message: '⚠️ Excessive hyphens in domain name',
        severity: 'medium'
      });
    }
    
  } catch (error) {
    console.error('Error analyzing URL:', error);
  }
  
  return threats;
}

// Listen for tab updates (when user navigates to a new page)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only check when page has finished loading
  if (changeInfo.status === 'complete' && tab.url) {
    const threats = analyzeURL(tab.url);
    
    // If threats detected, show warning
    if (threats.length > 0) {
      // Store threats for popup to access
      chrome.storage.local.set({
        [`threats_${tabId}`]: threats,
        [`url_${tabId}`]: tab.url
      });
      
      // Send message to content script to show warning banner
      chrome.tabs.sendMessage(tabId, {
        action: 'showWarning',
        threats: threats,
        url: tab.url
      }).catch(err => {
        // Ignore errors if content script not ready
        console.log('Could not send message to content script');
      });
      
      // Update extension icon to show warning
      chrome.action.setBadgeText({ text: '!', tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId });
      
      // Show browser notification for critical threats
      const criticalThreats = threats.filter(t => t.severity === 'critical');
      if (criticalThreats.length > 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: '⚠️ PHISHING WARNING',
          message: `This site may be dangerous!\n${criticalThreats[0].message}`,
          priority: 2
        });
      }
    } else {
      // Clear badge if no threats
      chrome.action.setBadgeText({ text: '', tabId: tabId });
      chrome.storage.local.remove([`threats_${tabId}`, `url_${tabId}`]);
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const threats = analyzeURL(tabs[0].url);
        sendResponse({ threats: threats, url: tabs[0].url });
      }
    });
    return true; // Keep message channel open for async response
  }
});