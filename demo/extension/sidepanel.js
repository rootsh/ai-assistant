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

let screenContext = null;

const labels = {
  ticket_id: "Chamado",
  subject: "Assunto",
  customer: "Empresa/cliente",
  support_type: "Tipo de suporte",
  requester: "Solicitante",
  priority: "Prioridade",
  status: "Status"
};

function readVisibleTicketContext() {
  if (location.hostname !== "rtm.sysaidit.com") return null;
  const aliases = {
    ticket_id: ["id", "ticket id", "case id", "número", "número do chamado", "id do chamado", "chamado", "solicitação"],
    subject: ["subject", "title", "assunto", "título", "resumo", "breve descrição", "breve descricao"],
    customer: ["customer", "company", "organization", "cliente", "empresa", "empresa cliente", "organização"],
    support_type: ["support type", "tipo de suporte", "tipo do suporte", "tipo de suporte contratado", "suporte contratado"],
    requester: ["requester", "contact", "reported by", "solicitante", "contato", "usuário", "usuário solicitante", "email", "e-mail"],
    priority: ["priority", "prioridade"],
    status: ["status", "state", "situação", "estado"]
  };
  const normalize = (value) => (value || "").replace(/[⋮…]/g, "").replace(/\s+/g, " ").trim().replace(/:$/, "").toLocaleLowerCase();
  const visible = (element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const values = {};
  const pageUrl = new URL(location.href);
  if (/\/SREdit\.jsp$/i.test(pageUrl.pathname)) {
    const requestId = pageUrl.searchParams.get("id");
    if (requestId && /^[A-Za-z0-9_-]{1,80}$/.test(requestId)) {
      values.ticket_id = requestId;
    }
  }
  const setValue = (label, value) => {
    const key = Object.keys(aliases).find((candidate) => aliases[candidate].includes(normalize(label)));
    const clean = (value || "").replace(/\s+/g, " ").trim();
    if (key && clean && clean.length <= 240 && !values[key]) values[key] = clean;
  };
  const readElementValue = (element) => {
    if (!element) return "";
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return element.value;
    return element.innerText || element.textContent || "";
  };

  for (const labelElement of document.querySelectorAll("label, th, dt, [aria-label], [data-label]")) {
    if (!visible(labelElement)) continue;
    const label = labelElement.getAttribute("aria-label") || labelElement.getAttribute("data-label") || labelElement.innerText || labelElement.textContent || "";
    const forId = labelElement.getAttribute("for");
    const target = (forId && document.getElementById(forId)) || labelElement.nextElementSibling || labelElement.parentElement?.querySelector("dd, td, input, textarea, select, [role='textbox']");
    setValue(label, readElementValue(target));
  }

  // Extract only recognized label/value pairs from visible text; never send the full page.
  const visibleLines = (document.body?.innerText || "").split("\n").slice(0, 500);
  for (let index = 0; index < visibleLines.length; index += 1) {
    const line = visibleLines[index].replace(/[⋮…]/g, "").trim();
    const separator = line.indexOf(":");
    if (separator > 0) {
      setValue(line.slice(0, separator), line.slice(separator + 1));
      continue;
    }
    const normalizedLine = normalize(line);
    const matchedLabel = Object.entries(aliases)
      .flatMap(([key, names]) => names.map((name) => ({ key, name })))
      .filter(({ name }) => normalizedLine === name || normalizedLine.startsWith(name + " "))
      .sort((left, right) => right.name.length - left.name.length)[0];
    if (matchedLabel) {
      const remainder = line.slice(matchedLabel.name.length).replace(/^\s+/, "");
      setValue(matchedLabel.name, remainder || visibleLines[index + 1] || "");
    } else {
      setValue(line, visibleLines[index + 1] || "");
    }
  }

  // SysAid renders the selected service category in a visible form control.
  for (const field of document.querySelectorAll("input, textarea, select")) {
    if (!visible(field) || values.support_type) continue;
    const value = readElementValue(field).replace(/\s+/g, " ").trim();
    if (/suporte técnico/i.test(value)) values.support_type = value.slice(0, 120);
  }

  if (!values.subject) {
    const heading = document.querySelector("h1, h2");
    if (heading && visible(heading)) values.subject = (heading.innerText || heading.textContent || "").trim().slice(0, 160);
  }
  if (!values.subject) {
    const descriptionLabel = [...document.querySelectorAll("label, th, dt, div, span, strong, b")]
      .find((element) => visible(element) && normalize(element.innerText || element.textContent) === "breve descrição");
    const nearbyText = descriptionLabel?.parentElement?.innerText || "";
    const match = nearbyText.match(/breve descrição\s*([\s\S]{0,180})/i);
    if (match?.[1]?.trim()) values.subject = match[1].trim().split("\n")[0].trim().slice(0, 160);
  }

  return {
    ticket_id: values.ticket_id || null,
    subject: values.subject || null,
    customer: values.customer || null,
    support_type: values.support_type || null,
    requester: values.requester || null,
    priority: values.priority || null,
    status: values.status || null
  };
}

authorizeButton.addEventListener("click", async () => {
  authorizeButton.disabled = true;
  try {
    // The optional host permission is requested immediately from this click gesture.
    const granted = await chrome.permissions.request({
      origins: ["https://rtm.sysaidit.com/*"]
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
    const frameResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: readVisibleTicketContext
    });
    const context = {};
    for (const { result } of frameResults) {
      if (!result) continue;
      for (const [key, value] of Object.entries(result)) {
        if (value && !context[key]) context[key] = value;
      }
    }
    screenContext = context;
    renderContext(context);
    const fieldCount = Object.values(context).filter(Boolean).length;
    if (!fieldCount) screenContext = null;
    readStatus.textContent = fieldCount
      ? `${fieldCount} campo(s) capturado(s). Somente os valores selecionados são enviados à API local.`
      : "Não encontrei campos de chamado. Abra um chamado no SysAid e tente novamente.";
    readIndicator.classList.toggle("ready", fieldCount > 0);
  } catch (error) {
    readStatus.textContent = `Não foi possível ler esta aba: ${error.message}`;
    readIndicator.classList.remove("ready");
  } finally {
    readButton.disabled = false;
  }
});

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
