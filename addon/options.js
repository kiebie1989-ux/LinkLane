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

// ---- DOM helper ----
function mkEl(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null) continue;
      switch (k) {
        case "cls":    node.className = v; break;
        case "style":  node.style.cssText = v; break;
        case "txt":    node.textContent = v; break;
        case "id":     node.id = v; break;
        case "title":  node.title = v; break;
        case "href":   node.href = v; break;
        case "target": node.target = v; break;
        case "type":   node.type = v; break;
        case "value":  node.value = v; break;
        case "checked": node.checked = v; break;
        default:
          if (k.startsWith("data_")) node.dataset[k.slice(5)] = v;
          else node.setAttribute(k, v);
      }
    }
  }
  for (const child of children) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

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
  document.getElementById("setupBanner").classList.add("visible");
}

// ---- Browsers ----
function renderBrowsers() {
  const el = document.getElementById("browsersList");
  clearEl(el);
  if (browsers.length === 0) {
    el.appendChild(mkEl("div", { cls: "empty-state" },
      mkEl("div", { cls: "icon", txt: "🌐" }),
      t("options_no_browsers_yet")
    ));
    return;
  }
  const tbody = mkEl("tbody");
  browsers.forEach((b, i) => {
    tbody.appendChild(mkEl("tr", null,
      mkEl("td", null, mkEl("strong", { txt: b.name })),
      mkEl("td", null, mkEl("span", { cls: "pattern-badge", txt: b.path })),
      mkEl("td", null, mkEl("button", {
        cls: "btn btn-danger", txt: t("options_delete"),
        data_action: "delete-browser", data_index: String(i)
      }))
    ));
  });
  el.appendChild(mkEl("table", { cls: "rules-table" },
    mkEl("thead", null, mkEl("tr", null,
      mkEl("th", { txt: t("options_browser_name") }),
      mkEl("th", { txt: t("options_browser_path") }),
      mkEl("th", {})
    )),
    tbody
  ));
}

function updateBrowserSelect() {
  const sel = document.getElementById("newBrowserSelect");
  clearEl(sel);
  browsers.forEach(b => sel.appendChild(mkEl("option", { value: b.id, txt: b.name })));
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
      if (statusEl) {
        clearEl(statusEl);
        statusEl.appendChild(mkEl("span", { cls: "ok", txt: `\u2713 ${result.browsers.length} ${t("options_browsers_found")}` }));
      }
    } else {
      if (statusEl) statusEl.textContent = t("options_no_browsers_found");
    }
  } catch (e) {
    if (statusEl) {
      clearEl(statusEl);
      statusEl.appendChild(mkEl("span", { cls: "err", txt: e.message }));
    }
  }
}

// ---- Rules ----
function renderRules() {
  const el = document.getElementById("rulesContainer");
  clearEl(el);
  if (rules.length === 0) {
    el.appendChild(mkEl("div", { cls: "empty-state" },
      mkEl("div", { cls: "icon", txt: "\uD83D\uDD00" }),
      t("options_no_rules_yet")
    ));
    return;
  }
  const tbody = mkEl("tbody");
  rules.forEach((r, i) => {
    const b = browsers.find(x => x.id === r.browserId);
    const modeLabel = r.openMode === "window" ? t("options_open_mode_window") : t("options_open_mode_tab");
    const cb = mkEl("input", { type: "checkbox", checked: r.enabled, data_action: "toggle-rule", data_index: String(i) });
    const label = mkEl("label", { cls: "toggle" }, cb, mkEl("span", { cls: "slider" }));
    tbody.appendChild(mkEl("tr", null,
      mkEl("td", null, mkEl("span", { cls: "pattern-badge", txt: r.pattern })),
      mkEl("td", null, mkEl("span", { cls: "browser-badge", txt: b ? b.name : "?" })),
      mkEl("td", null, mkEl("span", { style: "font-size:11px;color:#aaa", txt: modeLabel })),
      mkEl("td", null, label),
      mkEl("td", null, mkEl("button", {
        cls: "btn btn-danger", txt: t("options_delete"),
        data_action: "delete-rule", data_index: String(i)
      }))
    ));
  });
  el.appendChild(mkEl("table", { cls: "rules-table" },
    mkEl("thead", null, mkEl("tr", null,
      mkEl("th", { txt: t("options_pattern") }),
      mkEl("th", { txt: t("options_browser") }),
      mkEl("th", { txt: t("options_open_mode") }),
      mkEl("th", { txt: t("options_enabled") }),
      mkEl("th", {})
    )),
    tbody
  ));
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
  clearEl(grid);
  if (visible.length === 0) {
    grid.appendChild(mkEl("span", { style: "font-size:12px;color:#555", txt: t("options_no_presets_yet") }));
    return;
  }
  visible.forEach((p, i) => {
    const exists = rules.some(r => r.pattern === p.pattern);
    grid.appendChild(mkEl("div", {
      cls: `preset-chip${exists ? " added" : ""}`,
      title: p.pattern,
      data_action: "add-preset",
      data_index: String(i)
    },
      `${exists ? "\u2713" : "+"} ${p.name}`,
      mkEl("span", {
        style: "margin-left:5px;color:#e94560;cursor:pointer;font-size:12px;line-height:1;",
        title: t("options_delete"),
        txt: "\u00d7",
        data_action: "delete-preset",
        data_index: String(i)
      })
    ));
  });
}

function showBrowserPicker(presetIndex) {
  const p = getVisiblePresets()[presetIndex];
  if (!p) return;
  document.getElementById("browserPicker")?.remove();
  document.getElementById("browserPickerBackdrop")?.remove();

  const backdrop = mkEl("div", {
    id: "browserPickerBackdrop",
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;"
  });
  document.body.appendChild(backdrop);

  const picker = mkEl("div", {
    id: "browserPicker",
    style: "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#16213e;border:1px solid #e94560;border-radius:10px;padding:24px;z-index:9999;min-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.6);"
  });
  document.body.appendChild(picker);

  picker.appendChild(mkEl("div", { style: "font-size:15px;font-weight:700;margin-bottom:16px;color:#e0e0e0;", txt: p.name }));

  const modeSelect = mkEl("select", {
    id: "pickerOpenMode",
    style: "background:#0f3460;border:1px solid #1a4a80;border-radius:6px;padding:7px 10px;color:#e0e0e0;font-size:13px;width:100%;"
  },
    mkEl("option", { value: "tab", txt: t("options_open_mode_tab") }),
    mkEl("option", { value: "window", txt: t("options_open_mode_window") })
  );
  picker.appendChild(mkEl("div", { style: "margin-bottom:14px;" },
    mkEl("div", { style: "font-size:11px;color:#aaa;text-transform:uppercase;margin-bottom:5px", txt: t("options_open_mode") }),
    modeSelect
  ));
  picker.appendChild(mkEl("div", { style: "font-size:11px;color:#aaa;text-transform:uppercase;margin-bottom:8px;", txt: t("options_browser") }));

  browsers.forEach(b => {
    const supportsWindow = b.supportsNewWindow !== false;
    const btn = mkEl("button", {
      style: "display:block;width:100%;background:#0f3460;border:1px solid #1a4a80;border-radius:6px;padding:10px 14px;color:#e0e0e0;cursor:pointer;text-align:left;font-size:13px;margin-bottom:8px;",
      data_action: "pick-browser",
      data_browserId: b.id,
      data_presetIndex: String(presetIndex),
      data_supportsNewWindow: supportsWindow ? "1" : "0"
    },
      mkEl("strong", { txt: b.name }),
      ...(!supportsWindow ? [mkEl("span", { style: "font-size:10px;color:#888;font-weight:normal", txt: ` (${t("options_tab_only")})` })] : []),
      mkEl("span", { style: "color:#aaa;font-size:11px;display:block;margin-top:2px", txt: b.path })
    );
    btn.addEventListener("mouseover", () => btn.style.borderColor = "#e94560");
    btn.addEventListener("mouseout", () => btn.style.borderColor = "#1a4a80");
    picker.appendChild(btn);
  });

  const cancel = mkEl("button", {
    style: "width:100%;background:transparent;border:1px solid #555;border-radius:6px;padding:6px 14px;color:#aaa;cursor:pointer;font-size:12px;margin-top:4px;",
    txt: t("options_cancel")
  });
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
  document.getElementById("patternHint").textContent = t("options_pattern_hint")
    .replace("{0}", "*.zoom.us/j/*")
    .replace("{1}", "meet.google.com")
    .replace("{2}", "jira.meinefirma.de");
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
  clearEl(result);
  result.appendChild(mkEl("span", {
    cls: response?.connected ? "ok" : "err",
    txt: response?.connected ? `\u2713 ${t("setup_connected")}` : `\u2717 ${t("setup_not_connected")}`
  }));
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
    clearEl(patterns);
    patterns.appendChild(mkEl("p", { txt: t("help_patterns_p1") }));
    const tbody = mkEl("tbody");
    [
      ["meet.google.com",                   t("help_ex_meet")],
      ["*.zoom.us/j/*",                     t("help_ex_zoom")],
      ["teams.microsoft.com/l/meetup-join", t("help_ex_teams")],
      ["jira.mycompany.com",                t("help_ex_jira")],
      ["*.mycompany.com",                   t("help_ex_wildcard")],
    ].forEach(([pat, desc]) => {
      tbody.appendChild(mkEl("tr", null,
        mkEl("td", { txt: pat }),
        mkEl("td", { txt: desc })
      ));
    });
    patterns.appendChild(mkEl("table", null,
      mkEl("thead", null, mkEl("tr", null,
        mkEl("th", { txt: t("help_col_pattern") }),
        mkEl("th", { txt: t("help_col_matches") })
      )),
      tbody
    ));
    patterns.appendChild(mkEl("p", { style: "margin-top:10px;", txt: t("help_patterns_note") }));
  }

  const install = document.getElementById("help-body-install");
  if (install) {
    clearEl(install);
    install.appendChild(mkEl("p", { txt: t("help_install_p1") }));
    const ghP = mkEl("p", {}, t("help_install_github") + " ");
    ghP.appendChild(mkEl("a", {
      href: "https://github.com/kiebie1989-ux/LinkLane/tree/main/host",
      target: "_blank",
      style: "color:#e94560",
      txt: "github.com/kiebie1989-ux/LinkLane"
    }));
    install.appendChild(ghP);
    [
      ["Linux",   "cd host && bash install_linux.sh"],
      ["macOS",   "cd host && bash install_macos.sh"],
      ["Windows", "cd host && install_windows.bat"],
    ].forEach(([os, cmd]) => {
      install.appendChild(mkEl("p", {},
        mkEl("strong", { txt: os }),
        "\u00a0\u00a0",
        mkEl("code", { txt: cmd })
      ));
    });
    install.appendChild(mkEl("p", { style: "color:#aaa;margin-top:6px;" },
      t("help_install_note") + " ",
      mkEl("code", { txt: "python.org" })
    ));
  }

  const faq = document.getElementById("help-body-faq");
  if (faq) {
    clearEl(faq);
    [
      [t("help_faq_1_q"), t("help_faq_1_a"), null],
      [t("help_faq_2_q"), t("help_faq_2_a"), null],
      [t("help_faq_3_q"), t("help_faq_3_a"), "/usr/bin/chromium-browser"],
      [t("help_faq_4_q"), t("help_faq_4_a"), "~/.mozilla/native-messaging-hosts/"],
    ].forEach(([q, a, code]) => {
      const p = mkEl("p", {},
        mkEl("strong", { txt: q }),
        document.createElement("br"),
        a + (code ? " " : ""),
        ...(code ? [mkEl("code", { txt: code })] : [])
      );
      faq.appendChild(p);
    });
  }
}

load();
