// List of tracking parameters to strip from URLs
const TRACKING_PARAMS = [
  // Google / UTM
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_name', 'utm_brand', 'utm_social', 'utm_social-type',
  'gclid', 'gclsrc', 'dclid', '_ga', '_gl',
  // Facebook
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
  // Microsoft / Bing
  'msclkid',
  // Mailchimp
  'mc_cid', 'mc_eid',
  // HubSpot
  '_hsenc', '_hsmi', '__hssc', '__hstc', '__hsfp', 'hsCtaTracking',
  // Yandex
  'yclid', '_openstat',
  // Twitter / X
  'twclid', 's', 't',
  // TikTok
  'ttclid',
  // Other common trackers
  'igshid', 'mkt_tok', 'ref', 'ref_src', 'ref_url',
  'campaign_id', 'ad_id', 'adset_id'
];

// Clean a URL by removing tracking parameters
function cleanUrl(url) {
  try {
    const urlObj = new URL(url);
    TRACKING_PARAMS.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
  } catch (e) {
    return url; // Return original if not a valid URL
  }
}

// Strip HTML and return plain text
function stripFormatting(text) {
  if (!text) return '';
  // Find URLs in the text and clean them
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (match) => cleanUrl(match));
}

// Increment usage counter
async function incrementCounter() {
  const result = await chrome.storage.local.get(['usageCount']);
  const newCount = (result.usageCount || 0) + 1;
  await chrome.storage.local.set({ usageCount: newCount });
  return newCount;
}

// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'cleancopy-selection',
    title: 'CleanCopy: Copy as Plain Text',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'cleancopy-link',
    title: 'CleanCopy: Copy Clean Link (no tracking)',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'cleancopy-page',
    title: 'CleanCopy: Copy Clean Page URL',
    contexts: ['page']
  });

  // Initialize counter
  chrome.storage.local.get(['usageCount'], (result) => {
    if (result.usageCount === undefined) {
      chrome.storage.local.set({ usageCount: 0 });
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let textToCopy = '';

  if (info.menuItemId === 'cleancopy-selection' && info.selectionText) {
    textToCopy = stripFormatting(info.selectionText);
  } else if (info.menuItemId === 'cleancopy-link' && info.linkUrl) {
    textToCopy = cleanUrl(info.linkUrl);
  } else if (info.menuItemId === 'cleancopy-page' && tab && tab.url) {
    textToCopy = cleanUrl(tab.url);
  }

  if (!textToCopy) return;

  // Inject script into the page to write to clipboard
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => {
        navigator.clipboard.writeText(text).then(() => {
          // Show a brief on-page confirmation
          const toast = document.createElement('div');
          toast.textContent = '✓ Copied clean text!';
          toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1a1a1a;
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            z-index: 2147483647;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            opacity: 0;
            transition: opacity 0.2s;
          `;
          document.body.appendChild(toast);
          requestAnimationFrame(() => { toast.style.opacity = '1'; });
          setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
          }, 1500);
        }).catch(err => console.error('CleanCopy clipboard error:', err));
      },
      args: [textToCopy]
    });

    await incrementCounter();
  } catch (err) {
    console.error('CleanCopy error:', err);
  }
});