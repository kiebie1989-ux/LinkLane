// LinkLane - Background Script

const NATIVE_HOST = "linklane_host";

const DEFAULT_PRESETS = [
  // Video conferencing
  { name: "Google Meet",       pattern: "meet.google.com",                    category: "video" },
  { name: "Zoom",              pattern: "zoom.us/j/",                         category: "video" },
  { name: "Microsoft Teams",   pattern: "teams.microsoft.com/l/meetup-join",  category: "video" },
  { name: "Jitsi Meet",        pattern: "meet.jit.si",                        category: "video" },
  { name: "Webex",             pattern: "webex.com/meet",                     category: "video" },
  { name: "GoTo Meeting",      pattern: "gotomeet.me",                        category: "video" },
  { name: "BigBlueButton",     pattern: "bigbluebutton",                      category: "video" },
  { name: "8x8 Jitsi",         pattern: "8x8.vc",                            category: "video" },
  { name: "Whereby",           pattern: "whereby.com",                        category: "video" },
  { name: "Amazon Chime",      pattern: "chime.aws",                          category: "video" },
  // Collaboration
  { name: "Miro",              pattern: "miro.com/app/",                      category: "collab" },
  { name: "Figma",             pattern: "figma.com",                          category: "collab" },
  { name: "Notion",            pattern: "notion.so",                          category: "collab" },
  { name: "Confluence",        pattern: "atlassian.net/wiki",                 category: "collab" },
  { name: "SharePoint",        pattern: "sharepoint.com",                     category: "collab" },
  { name: "Google Docs",       pattern: "docs.google.com",                    category: "collab" },
  // Project management
  { name: "Jira",              pattern: "atlassian.net/jira",                 category: "pm" },
  { name: "Trello",            pattern: "trello.com",                         category: "pm" },
  { name: "Asana",             pattern: "app.asana.com",                      category: "pm" },
  { name: "Linear",            pattern: "linear.app",                         category: "pm" },
  { name: "Monday.com",        pattern: "monday.com",                         category: "pm" },
  // Dev
  { name: "GitHub",            pattern: "github.com",                         category: "dev" },
  { name: "GitLab",            pattern: "gitlab.com",                         category: "dev" },
  { name: "Bitbucket",         pattern: "bitbucket.org",                      category: "dev" },
  { name: "CodeSandbox",       pattern: "codesandbox.io",                     category: "dev" },
  { name: "Replit",            pattern: "replit.com",                         category: "dev" },
  // Communication
  { name: "Slack",             pattern: "app.slack.com",                      category: "comm" },
  { name: "Discord",           pattern: "discord.com/channels",               category: "comm" },
  { name: "WhatsApp Web",      pattern: "web.whatsapp.com",                   category: "comm" },
  { name: "Telegram Web",      pattern: "web.telegram.org",                   category: "comm" },
  { name: "Mattermost",        pattern: "mattermost",                         category: "comm" },
];

let rules = [];
let browsers = [];
let enabled = true;

async function loadSettings() {
  const data = await browser.storage.local.get(["rules", "browsers", "enabled"]);
  rules = data.rules || [];
  browsers = data.browsers || [];
  enabled = data.enabled !== undefined ? data.enabled : true;
}

function matchesPattern(url, pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(escaped, 'i').test(url);
}

function findMatchingRule(url) {
  if (!enabled) return null;
  return rules.find(rule => rule.enabled && matchesPattern(url, rule.pattern)) || null;
}

async function openInBrowser(url, browserId, openMode) {
  const b = browsers.find(b => b.id === browserId);
  if (!b) return false;
  try {
    const response = await browser.runtime.sendNativeMessage(NATIVE_HOST, {
      action: "open", url, browser: b.path, open_mode: openMode || "tab"
    });
    return response && response.status === "ok";
  } catch (e) {
    console.error("LinkLane: Native host error:", e);
    return false;
  }
}

browser.webRequest.onBeforeRequest.addListener(
  async function (details) {
    await loadSettings();
    const rule = findMatchingRule(details.url);
    if (!rule) return {};
    openInBrowser(details.url, rule.browserId, rule.openMode);
    setTimeout(() => browser.tabs.remove(details.tabId).catch(() => { }), 300);
    return { cancel: true };
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["blocking"]
);

browser.runtime.onMessage.addListener(async (message) => {
  if (message.action === "getPresets") return DEFAULT_PRESETS;

  if (message.action === "testHost") {
    try {
      const r = await browser.runtime.sendNativeMessage(NATIVE_HOST, { action: "ping" });
      return { connected: r && r.status === "pong" };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  }

  if (message.action === "detectBrowsers") {
    try {
      const r = await browser.runtime.sendNativeMessage(NATIVE_HOST, { action: "detect_browsers" });
      return { browsers: r.browsers || [] };
    } catch (e) {
      return { browsers: [], error: e.message };
    }
  }

  if (message.action === "toggle") {
    enabled = !enabled;
    await browser.storage.local.set({ enabled });
    return { enabled };
  }
});

// Open options page on first install
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    browser.runtime.openOptionsPage();
  }
});

loadSettings();
