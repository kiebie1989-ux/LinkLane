let rules = [];
let browsers = [];
let presets = [];
let userPresets = [];
let deletedPresets = [];
let i18nOverrides = null;

const t = (key) => {
  if (i18nOverrides && i18nOverrides[key]) return i18nOverrides[key].message;
  return browser.i18n.getMessage(key) || key;
};

// ---- Init ----
async function load() {
  const [data, fetchedPresets] = await Promise.all([
    browser.storage.local.get(["rules", "browsers", "language", "userPresets", "deletedPresets"]),
    browser.runtime.sendMessage({ action: "getPresets" })
  ]);
  rules = data.rules || [];
  browsers = data.browsers || [];
  presets = fetchedPresets || [];
  userPresets = data.userPresets || [];
  deletedPresets = data.deletedPresets || [];

  const lang = data.language || "auto";
  if (lang !== "auto") {
    try {
      const resp = await fetch(browser.runtime.getURL(`_locales/${lang}/messages.json`));
      i18nOverrides = await resp.json();
    } catch (e) { i18nOverrides = null; }
  } else {
    i18nOverrides = null;
  }

  applyTranslations();
  const sel = document.getElementById("langSelect");
  if (sel) sel.value = lang;
  renderAll();
  renderHelp();
  if (browsers.length === 0) autoDetectBrowsers();
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const msg = t(el.getAttribute("data-i18n"));
    if (msg && msg !== el.getAttribute("data-i18n")) el.textContent = msg;
  });
}

function renderAll() {
  renderBrowsers();
  renderRules();
  renderPresets();
  checkSetup();
  updateBrowserSelect();
}

// ---- Storage ----
async function save(showNotice = true) {
  await browser.storage.local.set({ rules, browsers, userPresets, deletedPresets });
  if (showNotice) {
    const n = document.getElementById("saveNotice");
    n.textContent = typeof showNotice === "string" ? showNotice : t("options_saved");
    n.classList.add("visible");
    setTimeout(() => n.classList.remove("visible"), 2000);
  }
}

function checkSetup() {
  const banner = document.getElementById("setupBanner");
  banner.classList.add("visible");
}

// ---- Browsers ----
function renderBrowsers() {
  const el = document.getElementById("browsersList");
  if (browsers.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🌐</div>${t("options_no_browsers_yet")}</div>`;
    return;
  }
  el.innerHTML = `<table class="rules-table">
    <thead><tr>
      <th>${t("options_browser_name")}</th>
      <th>${t("options_browser_path")}</th>
      <th></th>
    </tr></thead>
    <tbody>
      ${browsers.map((b, i) => `<tr>
        <td><strong>${escHtml(b.name)}</strong></td>
        <td><span class="pattern-badge">${escHtml(b.path)}</span></td>
        <td><button class="btn btn-danger" data-action="delete-browser" data-index="${i}">${t("options_delete")}</button></td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function updateBrowserSelect() {
  const sel = document.getElementById("newBrowserSelect");
  sel.innerHTML = browsers.map(b => `<option value="${escHtml(b.id)}">${escHtml(b.name)}</option>`).join('');
}

async function autoDetectBrowsers() {
  const statusEl = document.getElementById("detectStatus");
  if (statusEl) statusEl.textContent = t("options_detecting");
  try {
    const result = await browser.runtime.sendMessage({ action: "detectBrowsers" });
    if (result && result.browsers && result.browsers.length > 0) {
      result.browsers.forEach(b => {
        if (!browsers.find(x => x.path === b.path)) {
          browsers.push({ id: `b_${Date.now()}_${Math.random()}`, name: b.name, path: b.path, supportsNewWindow: b.supports_new_window !== false });
        }
      });
      await save(false);
      renderAll();
      if (statusEl) statusEl.innerHTML = `<span class="ok">✓ ${result.browsers.length} ${t("options_browsers_found")}</span>`;
    } else {
      if (statusEl) statusEl.innerHTML = `<span style="color:#aaa">${t("options_no_browsers_found")}</span>`;
    }
  } catch (e) {
    if (statusEl) statusEl.innerHTML = `<span class="err">${escHtml(e.message)}</span>`;
  }
}

// ---- Rules ----
function renderRules() {
  const el = document.getElementById("rulesContainer");
  if (rules.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🔀</div>${t("options_no_rules_yet")}</div>`;
    return;
  }
  el.innerHTML = `<table class="rules-table">
    <thead><tr>
      <th>${t("options_pattern")}</th>
      <th>${t("options_browser")}</th>
      <th>${t("options_open_mode")}</th>
      <th>${t("options_enabled")}</th>
      <th></th>
    </tr></thead>
    <tbody>
      ${rules.map((r, i) => {
    const b = browsers.find(b => b.id === r.browserId);
    const modeLabel = r.openMode === "window" ? t("options_open_mode_window") : t("options_open_mode_tab");
    return `<tr>
          <td><span class="pattern-badge">${escHtml(r.pattern)}</span></td>
          <td><span class="browser-badge">${escHtml(b ? b.name : '?')}</span></td>
          <td><span style="font-size:11px;color:#aaa">${escHtml(modeLabel)}</span></td>
          <td><label class="toggle">
            <input type="checkbox" data-action="toggle-rule" data-index="${i}" ${r.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label></td>
          <td><button class="btn btn-danger" data-action="delete-rule" data-index="${i}">${t("options_delete")}</button></td>
        </tr>`;
  }).join('')}
    </tbody>
  </table>`;
}

// ---- Presets ----
function getVisiblePresets() {
  return [
    ...presets.filter(p => !deletedPresets.includes(p.pattern)),
    ...userPresets
  ];
}

function renderPresets() {
  const visible = getVisiblePresets();
  const grid = document.getElementById("presetsGrid");
  if (visible.length === 0) {
    grid.innerHTML = `<span style="font-size:12px;color:#555">${t("options_no_presets_yet")}</span>`;
    return;
  }
  grid.innerHTML = visible.map((p, i) => {
    const exists = rules.some(r => r.pattern === p.pattern);
    return `<div class="preset-chip ${exists ? 'added' : ''}" data-action="add-preset" data-index="${i}" title="${escHtml(p.pattern)}">
      ${exists ? '✓' : '+'} ${escHtml(p.name)}
      <span data-action="delete-preset" data-index="${i}" style="margin-left:5px;color:#e94560;cursor:pointer;font-size:12px;line-height:1;" title="${escHtml(t('options_delete'))}">×</span>
    </div>`;
  }).join('');
}

function showBrowserPicker(presetIndex) {
  const p = getVisiblePresets()[presetIndex];
  if (!p) return;
  const existing = document.getElementById("browserPicker");
  if (existing) existing.remove();
  const bd = document.getElementById("browserPickerBackdrop");
  if (bd) bd.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "browserPickerBackdrop";
  backdrop.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;";
  document.body.appendChild(backdrop);

  const picker = document.createElement("div");
  picker.id = "browserPicker";
  picker.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:#16213e;border:1px solid #e94560;border-radius:10px;padding:24px;
    z-index:9999;min-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.6);`;
  document.body.appendChild(picker);

  const title = document.createElement("div");
  title.style.cssText = "font-size:15px;font-weight:700;margin-bottom:16px;color:#e0e0e0;";
  title.textContent = p.name;
  picker.appendChild(title);

  // Open mode select
  const modeRow = document.createElement("div");
  modeRow.style.cssText = "margin-bottom:14px;";
  modeRow.innerHTML = `
    <div style="font-size:11px;color:#aaa;text-transform:uppercase;margin-bottom:5px">${escHtml(t("options_open_mode"))}</div>
    <select id="pickerOpenMode" style="background:#0f3460;border:1px solid #1a4a80;border-radius:6px;padding:7px 10px;color:#e0e0e0;font-size:13px;width:100%;">
      <option value="tab">${escHtml(t("options_open_mode_tab"))}</option>
      <option value="window">${escHtml(t("options_open_mode_window"))}</option>
    </select>`;
  picker.appendChild(modeRow);

  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11px;color:#aaa;text-transform:uppercase;margin-bottom:8px;";
  sub.textContent = t("options_browser");
  picker.appendChild(sub);

  browsers.forEach(b => {
    const supportsWindow = b.supportsNewWindow !== false;
    const btn = document.createElement("button");
    btn.style.cssText = `display:block;width:100%;background:#0f3460;border:1px solid #1a4a80;
      border-radius:6px;padding:10px 14px;color:#e0e0e0;cursor:pointer;text-align:left;
      font-size:13px;margin-bottom:8px;`;
    btn.dataset.action = "pick-browser";
    btn.dataset.browserId = b.id;
    btn.dataset.presetIndex = presetIndex;
    btn.dataset.supportsNewWindow = supportsWindow ? "1" : "0";
    btn.innerHTML = `<strong>${escHtml(b.name)}</strong>${!supportsWindow ? ` <span style="font-size:10px;color:#888;font-weight:normal">(${escHtml(t("options_tab_only"))})</span>` : ''}<span style="color:#aaa;font-size:11px;display:block;margin-top:2px">${escHtml(b.path)}</span>`;
    btn.addEventListener("mouseover", () => btn.style.borderColor = "#e94560");
    btn.addEventListener("mouseout", () => btn.style.borderColor = "#1a4a80");
    picker.appendChild(btn);
  });

  const cancel = document.createElement("button");
  cancel.style.cssText = `width:100%;background:transparent;border:1px solid #555;
    border-radius:6px;padding:6px 14px;color:#aaa;cursor:pointer;font-size:12px;margin-top:4px;`;
  cancel.textContent = t("options_cancel");
  cancel.addEventListener("click", () => { picker.remove(); backdrop.remove(); });
  picker.appendChild(cancel);
  backdrop.addEventListener("click", () => { picker.remove(); backdrop.remove(); });
}

// ---- Central event delegation ----
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  const index = parseInt(el.dataset.index);

  if (action === "delete-preset") {
    e.stopPropagation();
    const p = getVisiblePresets()[index];
    if (!p) return;
    if (presets.some(bp => bp.pattern === p.pattern)) {
      deletedPresets.push(p.pattern);
    } else {
      userPresets = userPresets.filter(up => up.pattern !== p.pattern);
    }
    await save(false);
    renderPresets();
    return;
  }

  if (action === "delete-browser") {
    const browserId = browsers[index].id;
    browsers.splice(index, 1);
    rules = rules.filter(r => r.browserId !== browserId);
    await save(t("options_deleted"));
    renderAll();
  }

  if (action === "delete-rule") {
    rules.splice(index, 1);
    await save(t("options_deleted"));
    renderAll();
  }

  if (action === "add-preset") {
    const p = getVisiblePresets()[index];
    if (!p || rules.some(r => r.pattern === p.pattern)) return;
    if (browsers.length === 0) { alert(t("options_add_browser_first")); return; }
    showBrowserPicker(index);
  }

  if (action === "pick-browser") {
    const browserId = el.dataset.browserId;
    const presetIndex = parseInt(el.dataset.presetIndex);
    const supportsNewWindow = el.dataset.supportsNewWindow !== "0";
    let openMode = document.getElementById("pickerOpenMode")?.value || "tab";
    if (!supportsNewWindow) openMode = "tab";
    const p = getVisiblePresets()[presetIndex];
    document.getElementById("browserPicker")?.remove();
    document.getElementById("browserPickerBackdrop")?.remove();
    if (p && !rules.some(r => r.pattern === p.pattern)) {
      rules.push({ id: `r_${Date.now()}`, pattern: p.pattern, browserId, enabled: true, openMode });
      await save();
      renderAll();
    }
  }
});

document.addEventListener("change", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (el.dataset.action === "toggle-rule") {
    rules[parseInt(el.dataset.index)].enabled = el.checked;
    await save();
  }
});

// ---- Buttons ----
document.getElementById("detectBrowsersBtn").addEventListener("click", autoDetectBrowsers);

document.getElementById("showAddBrowser").addEventListener("click", () => {
  document.getElementById("addBrowserForm").classList.toggle("visible");
});
document.getElementById("cancelBrowser").addEventListener("click", () => {
  document.getElementById("addBrowserForm").classList.remove("visible");
});
document.getElementById("saveBrowser").addEventListener("click", async () => {
  const name = document.getElementById("newBrowserName").value.trim();
  const path = document.getElementById("newBrowserPath").value.trim();
  if (!name || !path) { alert(t("options_fill_all_fields")); return; }
  browsers.push({ id: `b_${Date.now()}`, name, path });
  await save();
  renderAll();
  document.getElementById("newBrowserName").value = "";
  document.getElementById("newBrowserPath").value = "";
  document.getElementById("addBrowserForm").classList.remove("visible");
});

document.getElementById("showAddRule").addEventListener("click", () => {
  updateBrowserSelect();
  document.getElementById("addRuleForm").classList.toggle("visible");
  // Pattern hint mit Beispielen befüllen
  const hint = t("options_pattern_hint")
    .replace("{0}", "*.zoom.us/j/*")
    .replace("{1}", "meet.google.com")
    .replace("{2}", "jira.meinefirma.de");
  document.getElementById("patternHint").innerHTML = hint
    .replace(/(\*[^\s|]+)/g, '<code style="color:#7eb8f7">$1</code>')
    .replace(/(meet\.google\.com)/g, '<code style="color:#7eb8f7">$1</code>')
    .replace(/(jira\.[^\s<]+)/g, '<code style="color:#7eb8f7">$1</code>');
});
document.getElementById("cancelRule").addEventListener("click", () => {
  document.getElementById("addRuleForm").classList.remove("visible");
});
document.getElementById("saveRule").addEventListener("click", async () => {
  const name = document.getElementById("newRuleName").value.trim();
  const pattern = document.getElementById("newPattern").value.trim();
  const browserId = document.getElementById("newBrowserSelect").value;
  const openMode = document.getElementById("newOpenMode").value;
  if (!pattern || !browserId) { alert(t("options_fill_all_fields")); return; }
  rules.push({ id: `r_${Date.now()}`, pattern, browserId, openMode, enabled: true });
  // Auto-create preset if pattern not already covered
  const allPatterns = [...presets.map(p => p.pattern), ...userPresets.map(p => p.pattern)];
  if (!allPatterns.includes(pattern)) {
    userPresets.push({ name: name || pattern, pattern });
  }
  await save();
  renderAll();
  document.getElementById("newRuleName").value = "";
  document.getElementById("newPattern").value = "";
  document.getElementById("addRuleForm").classList.remove("visible");
});

document.getElementById("checkHost").addEventListener("click", async () => {
  const result = document.getElementById("hostCheckResult");
  result.textContent = t("setup_checking");
  const response = await browser.runtime.sendMessage({ action: "testHost" });
  result.innerHTML = response?.connected
    ? `<span class="ok">✓ ${t("setup_connected")}</span>`
    : `<span class="err">✗ ${t("setup_not_connected")}</span>`;
});

document.getElementById("langSelect").addEventListener("change", async (e) => {
  await browser.storage.local.set({ language: e.target.value });
  const note = document.getElementById("langSaveNote");
  note.style.display = "inline";
  setTimeout(() => { note.style.display = "none"; window.location.reload(); }, 600);
});

// ---- Help Accordions ----
function renderHelp() {
  const patterns = document.getElementById("help-body-patterns");
  if (patterns) {
    patterns.innerHTML = `
      <p>${t("help_patterns_p1")}</p>
      <table>
        <thead><tr><th>${t("help_col_pattern")}</th><th>${t("help_col_matches")}</th></tr></thead>
        <tbody>
          <tr><td>meet.google.com</td><td>${t("help_ex_meet")}</td></tr>
          <tr><td>*.zoom.us/j/*</td><td>${t("help_ex_zoom")}</td></tr>
          <tr><td>teams.microsoft.com/l/meetup-join</td><td>${t("help_ex_teams")}</td></tr>
          <tr><td>jira.mycompany.com</td><td>${t("help_ex_jira")}</td></tr>
          <tr><td>*.mycompany.com</td><td>${t("help_ex_wildcard")}</td></tr>
        </tbody>
      </table>
      <p style="margin-top:10px;">${t("help_patterns_note")}</p>`;
  }

  const install = document.getElementById("help-body-install");
  if (install) {
    install.innerHTML = `
      <p>${t("help_install_p1")}</p>
      <p>${t("help_install_github")} <a href="https://github.com/kiebie1989-ux/LinkLane/tree/main/host" target="_blank" style="color:#e94560">github.com/kiebie1989-ux/LinkLane</a></p>
      <p><strong>Linux</strong> &nbsp;<code>cd host &amp;&amp; bash install_linux.sh</code></p>
      <p><strong>macOS</strong> &nbsp;<code>cd host &amp;&amp; bash install_macos.sh</code></p>
      <p><strong>Windows</strong> &nbsp;<code>cd host &amp;&amp; install_windows.bat</code></p>
      <p style="color:#aaa;margin-top:6px;">${t("help_install_note")} <code>python.org</code></p>`;
  }

  const faq = document.getElementById("help-body-faq");
  if (faq) {
    faq.innerHTML = `
      <p><strong>${t("help_faq_1_q")}</strong><br>${t("help_faq_1_a")}</p>
      <p><strong>${t("help_faq_2_q")}</strong><br>${t("help_faq_2_a")}</p>
      <p><strong>${t("help_faq_3_q")}</strong><br>${t("help_faq_3_a")} <code>/usr/bin/chromium-browser</code></p>
      <p><strong>${t("help_faq_4_q")}</strong><br>${t("help_faq_4_a")} <code>~/.mozilla/native-messaging-hosts/</code></p>`;
  }
}

// ---- Helper ----
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

load();
