const bootStatus = document.getElementById("boot-status");
const bootLog = document.getElementById("boot-log");
const bootMessage = document.getElementById("boot-message");
const bootActions = document.getElementById("boot-actions");
const bootPrompt = document.getElementById("boot-prompt");
const enterSystemButton = document.getElementById("enter-system");
const bootMeter = document.querySelector(".boot-meter");
const bootScreen = document.querySelector('[data-screen="boot"]');
const systemScreen = document.querySelector('[data-screen="system"]');
const systemDate = document.getElementById("system-date");
const resetSystemButton = document.getElementById("reset-system");
const nextTransmissionButton = document.getElementById("next-transmission");
const navItems = Array.from(document.querySelectorAll(".nav-item"));
const panels = Array.from(document.querySelectorAll(".panel"));
const waveform = document.getElementById("waveform");
const playToggle = document.getElementById("play-toggle");
const progressShell = document.getElementById("progress-shell");
const progressFill = document.getElementById("progress-fill");
const progressHead = document.getElementById("progress-head");
const currentTime = document.getElementById("current-time");
const transmissionLoading = document.getElementById("transmission-loading");
const transmissionContent = document.getElementById("transmission-content");
const archiveTriggers = Array.from(document.querySelectorAll(".archive-trigger"));
const contactConsole = document.getElementById("contact-console");
const contactForm = document.getElementById("contact-form");
const contactInput = document.getElementById("contact-input");

const bootLines = [
  "UPLINK ESTABLISHED...",
  "HANDSHAKE PROTOCOL: ACCEPTED",
  "DECRYPTING PAYLOAD...",
  "RECEIVING...",
  "INITIALIZING AUDIO DRIVERS...",
  "ASSET ARCHIVE: MOUNTED",
  "WARNING: UNREGISTERED ACCESS DETECTED",
  "OVERRIDING...",
  "SYSTEM READY."
];

const bootSequence = [
  { label: "SIGNAL FOUND", delay: 2200, meter: true, clearLog: true },
  { label: "RECEIVING...", delay: 5600, meter: true, revealLines: true },
  { label: "RECEIVING...", delay: 0, meter: true, showActions: true }
];

const panelOrder = ["transmission", "archive", "subject", "contact"];
let activePanel = "transmission";
let bootState = "awaiting-start";
let bootTimeouts = [];
let entryTimeouts = [];
let playbackProgress = 0;
let playbackInterval = null;
let waveformInterval = null;
let isPlaying = false;

createWaveformBars();
updateDate();
runBootSequence();
bindEvents();

function bindEvents() {
  enterSystemButton.addEventListener("click", beginEntrySequence);
  resetSystemButton.addEventListener("click", resetSystem);
  nextTransmissionButton.addEventListener("click", goToNextPanel);
  bootScreen.addEventListener("click", handleBootClick);

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      showPanel(item.dataset.panelTarget);
    });
  });

  document.addEventListener("keydown", handleGlobalKeys);
  progressShell.addEventListener("click", handleProgressInput);
  progressShell.addEventListener("keydown", handleProgressKeyDown);
  playToggle.addEventListener("click", togglePlayback);

  archiveTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const item = trigger.closest(".archive-item");
      const isOpen = item.classList.contains("is-open");

      document.querySelectorAll(".archive-item").forEach((entry) => {
        entry.classList.remove("is-open");
      });

      if (!isOpen) {
        item.classList.add("is-open");
      }
    });
  });

  contactForm.addEventListener("submit", handleContactSubmit);
  contactInput.addEventListener("input", () => {
    contactInput.value = contactInput.value.toUpperCase();
  });

  document.querySelectorAll('a[href="#"]').forEach((link) => {
    link.addEventListener("click", (event) => event.preventDefault());
  });
}

function handleBootClick() {
  if (bootState === "awaiting-start") {
    startBootSequence();
    return;
  }

  if (bootState === "ready") {
    beginEntrySequence();
  }
}

function runBootSequence() {
  clearBootTimers();
  clearEntryTimers();
  bootState = "awaiting-start";
  bootStatus.textContent = "NO SIGNAL";
  bootStatus.hidden = false;
  bootLog.innerHTML = "";
  bootLog.hidden = false;
  bootMessage.hidden = true;
  bootMessage.classList.remove("is-fade-out");
  bootActions.hidden = true;
  bootMeter.hidden = false;
  bootMeter.classList.remove("is-visible");
  bootPrompt.hidden = false;
}

function startBootSequence() {
  if (bootState !== "awaiting-start") {
    return;
  }

  clearBootTimers();
  bootState = "booting";
  bootPrompt.hidden = true;
  bootMessage.hidden = true;
  bootActions.hidden = true;
  bootLog.innerHTML = "";

  let elapsed = 0;

  bootSequence.forEach((step) => {
    const timer = window.setTimeout(() => {
      bootStatus.textContent = step.label;
      bootMeter.classList.toggle("is-visible", Boolean(step.meter));

      if (step.clearLog) {
        bootLog.innerHTML = "";
      }

      if (step.revealLines) {
        revealBootLines();
      }

      if (step.showActions) {
        bootActions.hidden = false;
        bootState = "ready";
      }
    }, elapsed);

    bootTimeouts.push(timer);
    elapsed += step.delay;
  });
}

function revealBootLines() {
  bootLog.innerHTML = "";

  bootLines.forEach((line, index) => {
    const entry = document.createElement("p");
    entry.textContent = `> ${line}`;
    bootLog.appendChild(entry);

    const timer = window.setTimeout(() => {
      entry.classList.add("is-visible");
    }, index * 420);

    bootTimeouts.push(timer);
  });
}

function clearBootTimers() {
  bootTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  bootTimeouts = [];
}

function clearEntryTimers() {
  entryTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  entryTimeouts = [];
}

function handleGlobalKeys(event) {
  if (bootState === "ready" && event.key === "Enter") {
    beginEntrySequence();
    return;
  }

  if (bootState === "awaiting-start" && (event.key === "Enter" || event.key === " " || event.key.length === 1)) {
    event.preventDefault();
    startBootSequence();
    return;
  }

  if (systemScreen.classList.contains("is-hidden")) {
    return;
  }

  if (["1", "2", "3", "4"].includes(event.key)) {
    showPanel(panelOrder[Number(event.key) - 1]);
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    event.preventDefault();
    goToNextPanel();
    return;
  }

  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    const currentIndex = panelOrder.indexOf(activePanel);
    const nextIndex = (currentIndex - 1 + panelOrder.length) % panelOrder.length;
    showPanel(panelOrder[nextIndex]);
  }
}

function activateSystem() {
  if (bootState === "active") {
    return;
  }

  bootState = "active";
  bootScreen.classList.add("is-hidden");
  systemScreen.classList.remove("is-hidden");
  showPanel(activePanel);
}

function beginEntrySequence() {
  if (bootState !== "ready") {
    return;
  }

  clearEntryTimers();
  bootState = "entering";
  bootStatus.hidden = true;
  bootMeter.hidden = true;
  bootLog.hidden = true;
  bootActions.hidden = true;
  bootPrompt.hidden = true;
  bootMessage.hidden = false;
  bootMessage.classList.remove("is-fade-out");

  const fadeTimer = window.setTimeout(() => {
    bootMessage.classList.add("is-fade-out");
  }, 2600);

  const activateTimer = window.setTimeout(() => {
    activateSystem();
  }, 3600);

  entryTimeouts.push(fadeTimer, activateTimer);
}

function resetSystem() {
  stopPlayback();
  playbackProgress = 0;
  updateProgressUI();
  systemScreen.classList.add("is-hidden");
  bootScreen.classList.remove("is-hidden");
  transmissionLoading.classList.remove("is-hidden");
  transmissionContent.classList.add("is-hidden");
  runBootSequence();
}

function showPanel(panelName) {
  activePanel = panelName;

  navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.panelTarget === panelName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === panelName);
  });

  if (panelName === "transmission") {
    primeTransmissionPanel();
  }
}

function goToNextPanel() {
  const currentIndex = panelOrder.indexOf(activePanel);
  const nextIndex = (currentIndex + 1) % panelOrder.length;
  showPanel(panelOrder[nextIndex]);
}

function primeTransmissionPanel() {
  if (!transmissionContent.classList.contains("is-hidden")) {
    return;
  }

  transmissionLoading.classList.remove("is-hidden");

  window.setTimeout(() => {
    transmissionLoading.classList.add("is-hidden");
    transmissionContent.classList.remove("is-hidden");
  }, 900);
}

function createWaveformBars() {
  waveform.innerHTML = "";

  for (let index = 0; index < 40; index += 1) {
    const bar = document.createElement("span");
    bar.className = "waveform-bar";
    bar.style.height = `${26 + Math.abs(Math.sin(index * 0.85)) * 54}%`;
    waveform.appendChild(bar);
  }
}

function animateWaveform() {
  const bars = waveform.querySelectorAll(".waveform-bar");
  const activeCount = Math.round((playbackProgress / 100) * bars.length);

  bars.forEach((bar, index) => {
    const base = isPlaying ? 24 + Math.random() * 66 : 28 + Math.abs(Math.sin(index * 0.8)) * 46;
    bar.style.height = `${base}%`;
    bar.classList.toggle("is-active", index < activeCount);
  });
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
    return;
  }

  isPlaying = true;
  playToggle.textContent = "■";
  animateWaveform();
  waveformInterval = window.setInterval(animateWaveform, 220);
  playbackInterval = window.setInterval(() => {
    playbackProgress += 0.45;

    if (playbackProgress >= 100) {
      playbackProgress = 0;
    }

    updateProgressUI();
  }, 100);
}

function stopPlayback() {
  isPlaying = false;
  playToggle.textContent = "▶";
  window.clearInterval(playbackInterval);
  window.clearInterval(waveformInterval);
  playbackInterval = null;
  waveformInterval = null;
  animateWaveform();
}

function handleProgressInput(event) {
  const rect = progressShell.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  playbackProgress = Math.max(0, Math.min(100, ratio * 100));
  updateProgressUI();
}

function handleProgressKeyDown(event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();
  playbackProgress += event.key === "ArrowRight" ? 5 : -5;
  playbackProgress = Math.max(0, Math.min(100, playbackProgress));
  updateProgressUI();
}

function updateProgressUI() {
  progressFill.style.width = `${playbackProgress}%`;
  progressHead.style.left = `${playbackProgress}%`;
  progressShell.setAttribute("aria-valuenow", String(Math.round(playbackProgress)));
  currentTime.textContent = formatTime((playbackProgress / 100) * 272);
  animateWaveform();
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(Math.floor(totalSeconds % 60)).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function handleContactSubmit(event) {
  event.preventDefault();
  const message = contactInput.value.trim();

  if (!message) {
    return;
  }

  appendConsoleLine(`> USR: ${message}`, "user");
  contactInput.value = "";

  window.setTimeout(() => {
    appendConsoleLine("> SYS: MESSAGE ENCRYPTED AND SENT.");
  }, 700);
}

function appendConsoleLine(text, type = "system") {
  const line = document.createElement("p");
  line.textContent = text;

  if (type === "user") {
    line.classList.add("user");
  }

  contactConsole.appendChild(line);
  contactConsole.scrollTop = contactConsole.scrollHeight;
}

function updateDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  systemDate.textContent = `${year}.${month}.${day}`;
}
