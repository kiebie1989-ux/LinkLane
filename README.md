# 🔀 LinkLane

**Open URLs in the right browser – automatically.**

LinkLane is a Firefox extension that intercepts URLs matching your rules and opens them in a different browser of your choice. Perfect for opening Google Meet, Zoom or MS Teams calls in a Chromium-based browser while keeping Firefox as your default.

---

## Features

- ✅ Predefined presets for Google Meet, Zoom, MS Teams, Jitsi, Webex and more
- ✅ Add your own URL patterns (supports wildcards like `*.zoom.us`)
- ✅ Works with any browser: Chrome, Chromium, Brave, Edge, Vivaldi, Opera, Safari...
- ✅ Enable/disable individual rules or all rules at once
- ✅ Works on Linux, macOS and Windows
- ✅ Clean settings page with setup wizard
- ✅ Open source

---

## Installation

### Step 1: Install the native host

The native host is a small Python script that receives URLs from the extension and opens them in the correct browser. **Python 3 is required.**

**Linux:**
```bash
cd host
bash install_linux.sh
```

**macOS:**
```bash
cd host
bash install_macos.sh
```

**Windows:**
```
cd host
install_windows.bat
```

### Step 2: Install the Firefox extension

**From Mozilla Add-ons (recommended):**

Install LinkLane directly from [addons.mozilla.org](https://addons.mozilla.org/de/firefox/addon/linklane/).

**For developers – local testing only:**

If you want to test changes to the extension locally:
1. Open Firefox and go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `addon/manifest.json` file

> Note: Temporary add-ons are removed when Firefox is closed.

### Step 3: Configure LinkLane

1. Open the LinkLane settings (click the 🔀 icon → "Open Settings")
2. Add your browsers in the **Browsers** section (e.g. `/usr/bin/chromium-browser`)
3. Add rules using presets or manually

---

## URL Pattern Examples

| Pattern | Matches |
|---|---|
| `meet.google.com` | All Google Meet calls |
| `*.zoom.us/j/*` | All Zoom meetings |
| `jira.mycompany.com` | Your company's Jira |
| `teams.microsoft.com/l/meetup-join` | MS Teams meeting links |

---

## Requirements

- Firefox 142+
- Python 3.6+ (for the native host)

---

## Contributing

Pull requests welcome! Please open an issue first for major changes.

---

## License

MIT
