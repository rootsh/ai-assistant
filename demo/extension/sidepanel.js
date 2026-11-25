const API_URL = "http://localhost:8000/api/demo/chat";
const readButton = document.querySelector("#read-button");
const authorizeButton = document.querySelector("#authorize-button");
const readStatus = document.querySelector("#read-status");
const readIndicator = document.querySelector("#read-indicator");
const contextFields = document.querySelector("#context-fields");
const messages = document.querySelector("#messages");
const form = document.querySelector("#chat-form");
const questionInput = document.querySelector("#question");
const sendButton = document.querySelector("#send-button");
const debugToggle = document.querySelector("#debug-toggle");
const copyDebugButton = document.querySelector("#copy-debug");
const debugLog = document.querySelector("#debug-log");

let screenContext = null;
let debugEnabled = false;
let lastDebugReport = null;
const buildVersion = document.querySelector("#build-version");
if (buildVersion) {
  const manifest = chrome.runtime.getManifest();
  buildVersion.textContent = `v${manifest.version_name || manifest.version}`;
}

const labels = {
  ticket_id: "Chamado",
  subject: "Assunto",
  customer: "Empresa/cliente",
  support_type: "Tipo de suporte",
  requester: "Solicitante",
  priority: "Prioridade",
  status: "Status"
};

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
  for (const [key, label] of Object.entries(labels)) {
    if (!context[key]) continue;
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = context[key];
    contextFields.append(dt, dd);
  }
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
    screenContext = context;
    renderContext(context);
    const fieldCount = Object.values(context).filter(Boolean).length;
    if (!fieldCount) screenContext = null;
    const detailFields = ["customer", "subject", "support_type"].filter((key) => context[key]).length;
    readStatus.textContent = fieldCount
      ? detailFields
        ? `${fieldCount} campo(s) capturado(s). Somente os valores selecionados são enviados à API local.`
        : `${fieldCount} campo(s) capturado(s), mas os campos do formulário não foram lidos. Ative o Debug para ver o diagnóstico.`
      : `Não encontrei campos de chamado. Ative o Debug para ver o diagnóstico.`;
    if (debugEnabled) {
      const permissions = await chrome.permissions.getAll();
      const page = tab.url ? new URL(tab.url) : null;
      lastDebugReport = {
        build: chrome.runtime.getManifest().version_name || chrome.runtime.getManifest().version,
        tab: page ? `${page.origin}${page.pathname}` : null,
        grantedSysAidOrigins: (permissions.origins || []).filter((origin) => origin.toLowerCase().includes("sysaidit")),
        injectionFrames: frameResults.injectionFrames || 0,
        injectionError: frameResults.injectionError,
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
  const requestId = `rtm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const responses = [];
  const listener = (message, sender) => {
    if (message?.type === "RTM_VISIBLE_CONTEXT_RESULT" && message.requestId === requestId) {
      responses.push({ result: message.context, frameId: sender.frameId });
    }
  };
  chrome.runtime.onMessage.addListener(listener);
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
  let dispatchError = null;
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "RTM_READ_VISIBLE_CONTEXT",
      requestId,
      debug: debugEnabled
    });
  } catch (error) {
    dispatchError = error.message;
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  chrome.runtime.onMessage.removeListener(listener);
  responses.injectionFrames = injectionFrames;
  responses.injectionError = injectionError;
  if (!responses.length) {
    throw new Error(
      `Nenhum content script respondeu. Injeção: ${injectionFrames} frame(s)${injectionError ? ` (${injectionError})` : ""}; mensagem: ${dispatchError || "sem resposta"}.`
    );
  }
  return responses;
}

async function sendQuestion(question) {
  if (!screenContext || (!screenContext.ticket_id && !screenContext.subject)) {
    readStatus.textContent = "Abra um chamado e leia pelo menos o ID ou o assunto antes de conversar.";
    return;
  }
  addMessage("user", question);
  questionInput.value = "";
  sendButton.disabled = true;
  const responseText = addMessage("assistant");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, screen_context: screenContext })
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
