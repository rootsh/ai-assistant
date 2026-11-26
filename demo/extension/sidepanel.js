const API_URL = "http://localhost:8000/api/demo/chat";
const readButton = document.querySelector("#read-button");
const authorizeButton = document.querySelector("#authorize-button");
const readStatus = document.querySelector("#read-status");
const readIndicator = document.querySelector("#read-indicator");
const contextFields = document.querySelector("#context-fields");
const messagesByMode = {
  sysaid: document.querySelector('[data-chat="sysaid"]'),
  general: document.querySelector('[data-chat="general"]')
};
let messages = messagesByMode.sysaid;
const form = document.querySelector("#chat-form");
const questionInput = document.querySelector("#question");
const sendButton = document.querySelector("#send-button");
const debugToggle = document.querySelector("#debug-toggle");
const copyDebugButton = document.querySelector("#copy-debug");
const debugLog = document.querySelector("#debug-log");
const sysaidContextCard = document.querySelector("#sysaid-context");
const modeButtons = document.querySelectorAll("[data-mode]");
const suggestionGroups = document.querySelectorAll("[data-suggestions]");

let screenContext = null;
let activeMode = "sysaid";
let debugEnabled = false;
let lastDebugReport = null;
const CHAT_SESSION_KEY = "rtmDemoChatSession";
let lastChatSession = null;
const buildVersion = document.querySelector("#build-version");
if (buildVersion) {
  const manifest = chrome.runtime.getManifest();
  buildVersion.textContent = `v${manifest.version_name || manifest.version}`;
}

debugToggle.addEventListener("click", () => {
  debugEnabled = !debugEnabled;
  debugToggle.textContent = `Debug: ${debugEnabled ? "ligado" : "desligado"}`;
  debugToggle.setAttribute("aria-pressed", String(debugEnabled));
  debugLog.hidden = !debugEnabled;
  copyDebugButton.hidden = !debugEnabled;
  if (debugEnabled && !lastDebugReport) {
    debugLog.value = "Ativei o debug. Clique em “Ler chamado visível” para gerar o log.";
  }
});

copyDebugButton.addEventListener("click", async () => {
  if (!debugLog.value) return;
  try {
    await navigator.clipboard.writeText(debugLog.value);
    copyDebugButton.textContent = "Log copiado";
  } catch {
    debugLog.focus();
    debugLog.select();
    copyDebugButton.textContent = "Log selecionado — copie";
  }
});

authorizeButton.addEventListener("click", async () => {
  authorizeButton.disabled = true;
  try {
    // The optional host permission is requested immediately from this click gesture.
    const granted = await chrome.permissions.request({
      origins: ["https://*.sysaidit.com/*", "https://rtm.sysaidit.co/*"]
    });
    if (!granted) {
      readStatus.textContent = "O Chrome não concedeu acesso. Você pode autorizar depois por este botão.";
      return;
    }
    authorizeButton.textContent = "Acesso ao SysAid autorizado";
    readStatus.textContent = "Abra um chamado e clique em “Ler chamado visível”. O acesso vale para rtm.sysaidit.com e pode ser revogado nas configurações da extensão.";
    readButton.disabled = false;
  } catch (error) {
    readStatus.textContent = `Não foi possível solicitar a permissão: ${error.message}`;
  } finally {
    authorizeButton.disabled = false;
  }
});

function renderContext(context) {
  contextFields.replaceChildren();
  const ticketLabel = document.createElement("dt");
  ticketLabel.textContent = "Chamado";
  const ticketValue = document.createElement("dd");
  ticketValue.textContent = context.ticket_id;
  contextFields.append(ticketLabel, ticketValue);

  const supportLevelLabel = document.createElement("dt");
  supportLevelLabel.textContent = "Nível de suporte (mock)";
  const supportLevel = document.createElement("dd");
  supportLevel.textContent = "Suporte Premium";
  contextFields.append(supportLevelLabel, supportLevel);
  contextFields.hidden = false;
}

function addMessage(kind, text = "") {
  const article = document.createElement("article");
  article.className = `message ${kind}`;
  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = kind === "user" ? "VOCÊ" : "ASSISTENTE · SIMULAÇÃO";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  article.append(label, paragraph);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return paragraph;
}

function setMode(mode) {
  activeMode = mode;
  const isSysAid = mode === "sysaid";
  sysaidContextCard.hidden = !isSysAid;
  for (const button of modeButtons) {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  for (const group of suggestionGroups) {
    group.hidden = group.dataset.suggestions !== mode;
  }
  for (const [chatMode, panel] of Object.entries(messagesByMode)) {
    panel.hidden = chatMode !== mode;
  }
  messages = messagesByMode[mode];
  questionInput.placeholder = isSysAid ? "Pergunte sobre este chamado…" : "Pergunte sobre qualquer assunto…";
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

function clearChatForNewExtensionClick() {
  for (const panel of Object.values(messagesByMode)) {
    panel.querySelectorAll(".message:not(:first-child)").forEach((message) => message.remove());
    panel.scrollTop = 0;
  }
  screenContext = null;
  contextFields.replaceChildren();
  contextFields.hidden = true;
  readIndicator.classList.remove("ready");
  readStatus.textContent = "Autorize o domínio SysAid uma vez; depois, leia um chamado aberto na aba.";
  questionInput.value = "";
  debugLog.value = "";
  lastDebugReport = null;
  setMode("sysaid");
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "session" || !changes[CHAT_SESSION_KEY]) return;
  const nextSession = changes[CHAT_SESSION_KEY].newValue || 0;
  if (lastChatSession === null) {
    lastChatSession = nextSession;
    return;
  }
  if (nextSession !== lastChatSession) {
    lastChatSession = nextSession;
    clearChatForNewExtensionClick();
  }
});

void chrome.storage.session.get(CHAT_SESSION_KEY).then((stored) => {
  if (lastChatSession === null) lastChatSession = stored[CHAT_SESSION_KEY] || 0;
});


readButton.addEventListener("click", async () => {
  readButton.disabled = true;
  readStatus.textContent = "Lendo campos visíveis da aba atual…";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("Não encontrei uma aba ativa.");
    const frameResults = await collectFrameContexts(tab.id);
    const context = {};
    const frameDiagnostics = [];
    for (const { result, frameId } of frameResults) {
      if (!result || typeof result !== "object") continue;
      if (result.__diagnostics) frameDiagnostics.push({ frameId, ...result.__diagnostics });
      for (const [key, value] of Object.entries(result)) {
        if (key.startsWith("__")) continue;
        if (value && !context[key]) context[key] = value;
      }
    }
    // Preserve the ticket ID from the URL when the ticket is rendered in a frame.
    if (!context.ticket_id && tab.url) {
      const pageUrl = new URL(tab.url);
      const requestId = pageUrl.searchParams.get("id");
      if (/\/SREdit\.jsp$/i.test(pageUrl.pathname) && requestId && /^[A-Za-z0-9_-]{1,80}$/.test(requestId)) {
        context.ticket_id = requestId;
      }
    }
    screenContext = context.ticket_id ? { ticket_id: context.ticket_id } : null;
    const fieldCount = screenContext ? 1 : 0;
    if (screenContext) renderContext(screenContext);
    readStatus.textContent = fieldCount
      ? "ID do chamado capturado. Empresa e solicitante serão fictícios no mock; os demais dados seriam consultados no SysAid."
      : "Não encontrei o ID do chamado nesta página. Abra um chamado em SREdit.jsp.";
    if (debugEnabled) {
      const permissions = await chrome.permissions.getAll();
      const page = tab.url ? new URL(tab.url) : null;
      lastDebugReport = {
        build: chrome.runtime.getManifest().version_name || chrome.runtime.getManifest().version,
        tab: page ? `${page.origin}${page.pathname}` : null,
        grantedSysAidOrigins: (permissions.origins || []).filter((origin) => origin.toLowerCase().includes("sysaidit")),
        injectionFrames: frameResults.injectionFrames || 0,
        injectionError: frameResults.injectionError,
        evaluationError: frameResults.evaluationError,
        framesReturned: frameResults.length,
        frames: frameDiagnostics,
        mergedFields: Object.keys(context).filter((key) => context[key])
      };
      debugLog.value = JSON.stringify(lastDebugReport, null, 2);
    }
    readIndicator.classList.toggle("ready", fieldCount > 0);
  } catch (error) {
    readStatus.textContent = `Não foi possível ler esta aba: ${error.message}`;
    readIndicator.classList.remove("ready");
  } finally {
    readButton.disabled = false;
  }
});

async function collectFrameContexts(tabId) {
  let injectionFrames = 0;
  let injectionError = null;
  try {
    const injected = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["ticket-reader.js"]
    });
    injectionFrames = injected.length;
  } catch (error) {
    injectionError = error.message;
  }

  let frameResults = [];
  let evaluationError = null;
  try {
    frameResults = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: (includeDiagnostics) => {
        const reader = globalThis.__rtmReadVisibleTicketContext;
        if (typeof reader === "function") return reader(includeDiagnostics);
        return {
          ticket_id: null,
          subject: null,
          customer: null,
          support_type: null,
          requester: null,
          priority: null,
          status: null,
          __diagnostics: includeDiagnostics ? {
            host: location.hostname,
            path: location.pathname || "blank",
            textLength: (document.body?.innerText || "").length,
            readerInstalled: false
          } : null
        };
      },
      args: [debugEnabled]
    });
  } catch (error) {
    evaluationError = error.message;
  }

  const results = frameResults.map(({ result, frameId }) => ({ result, frameId }));
  results.injectionFrames = injectionFrames;
  results.injectionError = injectionError;
  results.evaluationError = evaluationError;
  return results;
}

async function sendQuestion(question) {
  if (activeMode === "sysaid" && !screenContext?.ticket_id) {
    readStatus.textContent = "Abra um chamado e capture o ID antes de conversar.";
    return;
  }
  const histories = Object.fromEntries(
    Object.entries(messagesByMode).map(([mode, panel]) => [
      mode,
      [...panel.querySelectorAll(".message:not(:first-child)")]
        .slice(-40)
        .map((message) => ({
          role: message.classList.contains("user") ? "user" : "assistant",
          content: message.querySelector("p")?.textContent?.trim() || ""
        }))
        .filter((message) => message.content)
    ])
  );
  addMessage("user", question);
  questionInput.value = "";
  sendButton.disabled = true;
  const responseText = addMessage("assistant");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: activeMode, message: question, screen_context: { ticket_id: activeMode === "sysaid" ? screenContext?.ticket_id || null : null }, histories })
    });
    if (!response.ok || !response.body) throw new Error(`API respondeu ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        const line = event.split("\n").find((entry) => entry.startsWith("data: "));
        if (!line) continue;
        const payload = JSON.parse(line.slice(6));
        if (payload.type === "token") responseText.textContent += payload.text;
      }
      if (done) break;
    }
  } catch (error) {
    responseText.textContent = `Não consegui acessar o mock FastAPI: ${error.message}`;
  } finally {
    sendButton.disabled = false;
    messages.scrollTop = messages.scrollHeight;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (question) void sendQuestion(question);
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => void sendQuestion(button.dataset.question));
});
