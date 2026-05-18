const t = (key) => browser.i18n.getMessage(key) || key;

let enabled = true;

function updateStatus() {
  const label = document.getElementById("statusLabel");
  const btn = document.getElementById("toggleBtn");
  if (enabled) {
    label.textContent = t("popup_status_active");
    label.className = "status-label active";
    btn.textContent = t("popup_btn_on");
    btn.className = "toggle-btn";
  } else {
    label.textContent = t("popup_status_inactive");
    label.className = "status-label inactive";
    btn.textContent = t("popup_btn_off");
    btn.className = "toggle-btn off";
  }
}

async function init() {
  document.getElementById("openSettingsLabel").textContent = t("popup_open_settings");
  document.getElementById("rulesLabel").textContent = t("popup_rules");
  document.getElementById("hostStatus").textContent = t("popup_checking_host");

  const data = await browser.storage.local.get(["rules", "enabled"]);
  const rules = (data.rules || []).filter(r => r.enabled);
  enabled = data.enabled !== false;

  document.getElementById("ruleCount").textContent = rules.length;
  updateStatus();

  // Nativen Host prüfen
  const result = await browser.runtime.sendMessage({ action: "testHost" });
  const dot = document.getElementById("hostDot");
  const status = document.getElementById("hostStatus");
  if (result && result.connected) {
    dot.classList.add("ok");
    status.textContent = t("popup_host_connected");
  } else {
    dot.classList.add("err");
    status.textContent = t("popup_host_not_found");
  }

  document.getElementById("toggleBtn").addEventListener("click", async () => {
    const result = await browser.runtime.sendMessage({ action: "toggle" });
    enabled = result.enabled;
    updateStatus();
  });

  document.getElementById("openSettings").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });
}

init();
