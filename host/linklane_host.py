#!/usr/bin/env python3
"""
LinkLane Native Host
Receives messages from the Firefox extension and opens URLs in the specified browser.
Runs on Linux, macOS and Windows.
"""
import sys
import json
import struct
import subprocess
import platform
import os

KNOWN_BROWSERS = {
    "Linux": [
        {"name": "Chromium",       "path": "/usr/bin/chromium-browser",      "supports_new_window": True},
        {"name": "Chromium",       "path": "/usr/bin/chromium",               "supports_new_window": True},
        {"name": "Google Chrome",  "path": "/usr/bin/google-chrome",          "supports_new_window": True},
        {"name": "Google Chrome",  "path": "/usr/bin/google-chrome-stable",   "supports_new_window": True},
        {"name": "Brave",          "path": "/usr/bin/brave-browser",          "supports_new_window": True},
        {"name": "Brave",          "path": "/usr/bin/brave",                  "supports_new_window": True},
        {"name": "Vivaldi",        "path": "/usr/bin/vivaldi",                "supports_new_window": True},
        {"name": "Opera",          "path": "/usr/bin/opera",                  "supports_new_window": True},
        {"name": "Microsoft Edge", "path": "/usr/bin/microsoft-edge",         "supports_new_window": True},
        {"name": "Waterfox",       "path": "/usr/bin/waterfox",               "supports_new_window": True},
    ],
    "Darwin": [
        {"name": "Google Chrome",  "path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",   "supports_new_window": True},
        {"name": "Chromium",       "path": "/Applications/Chromium.app/Contents/MacOS/Chromium",             "supports_new_window": True},
        {"name": "Brave",          "path": "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",  "supports_new_window": True},
        {"name": "Microsoft Edge", "path": "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "supports_new_window": True},
        {"name": "Vivaldi",        "path": "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi",               "supports_new_window": True},
        {"name": "Opera",          "path": "/Applications/Opera.app/Contents/MacOS/Opera",                   "supports_new_window": True},
        {"name": "Safari",         "path": "/Applications/Safari.app/Contents/MacOS/Safari",                 "supports_new_window": False},
    ],
    "Windows": [
        {"name": "Google Chrome",  "path": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",                             "supports_new_window": True},
        {"name": "Google Chrome",  "path": "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",                       "supports_new_window": True},
        {"name": "Chromium",       "path": "C:\\Program Files\\Chromium\\Application\\chrome.exe",                                   "supports_new_window": True},
        {"name": "Brave",          "path": "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",                 "supports_new_window": True},
        {"name": "Microsoft Edge", "path": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",                      "supports_new_window": True},
        {"name": "Vivaldi",        "path": "C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe",                                   "supports_new_window": True},
        {"name": "Opera",          "path": "C:\\Program Files\\Opera\\launcher.exe",                                                "supports_new_window": True},
    ]
}

def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    length = struct.unpack('=I', raw_length)[0]
    message = sys.stdin.buffer.read(length).decode('utf-8')
    return json.loads(message)

def send_message(message):
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('=I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

def detect_browsers():
    system = platform.system()
    candidates = KNOWN_BROWSERS.get(system, [])
    found = []
    seen_names = set()
    for b in candidates:
        if os.path.isfile(b["path"]) and b["name"] not in seen_names:
            found.append({"name": b["name"], "path": b["path"], "supports_new_window": b.get("supports_new_window", True)})
            seen_names.add(b["name"])
    return found

def open_url(browser_path, url, open_mode="tab"):
    system = platform.system()
    args = [browser_path]
    if open_mode == "window":
        args.append("--new-window")
    args.append(url)
    try:
        if system == "Windows":
            subprocess.Popen(args, creationflags=subprocess.DETACHED_PROCESS)
        else:
            subprocess.Popen(args)
        return True
    except Exception as e:
        return str(e)

def main():
    message = read_message()
    if not message:
        send_message({"status": "error", "message": "No message received"})
        return
    action = message.get("action")
    if action == "ping":
        send_message({"status": "pong"})
    elif action == "detect_browsers":
        browsers = detect_browsers()
        send_message({"status": "ok", "browsers": browsers})
    elif action == "open":
        url = message.get("url")
        browser = message.get("browser")
        open_mode = message.get("open_mode", "tab")
        if not url or not browser:
            send_message({"status": "error", "message": "Missing url or browser"})
            return
        result = open_url(browser, url, open_mode)
        if result is True:
            send_message({"status": "ok"})
        else:
            send_message({"status": "error", "message": result})
    else:
        send_message({"status": "error", "message": f"Unknown action: {action}"})

if __name__ == "__main__":
    main()
