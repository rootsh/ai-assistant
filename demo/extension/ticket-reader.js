function readVisibleTicketContext(includeDiagnostics = false) {
  const frameHost = location.hostname || (() => {
    try { return new URL(document.referrer).hostname; } catch { return ""; }
  })();
  const emptyContext = () => ({
    ticket_id: null, subject: null, customer: null, support_type: null,
    requester: null, priority: null, status: null,
    __diagnostics: includeDiagnostics ? {
      host: frameHost,
      path: location.pathname || "blank",
      textLength: (document.body?.innerText || "").length,
      fieldCount: 0,
      inputs: document.querySelectorAll("input").length,
      textareas: document.querySelectorAll("textarea").length,
      selects: document.querySelectorAll("select").length,
      headings: document.querySelectorAll("h1, h2").length,
      iframes: document.querySelectorAll("iframe").length
    } : null
  });
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
    const rawValue = (value || "").replace(/\s+/g, " ").trim();
    const clean = key === "requester"
      ? rawValue.replace(/^contato\s*[:：-]?\s*/i, "").trim()
      : rawValue;
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
    // SysAid may render "Breve descrição" as a label next to an input whose value
    // is not included in document.body.innerText.
    for (const field of document.querySelectorAll("input, textarea")) {
      if (!visible(field)) continue;
      const parentText = field.parentElement?.parentElement?.innerText || "";
      const nearbyText = [
        field.getAttribute("aria-label"),
        field.getAttribute("name"),
        field.id,
        field.getAttribute("placeholder"),
        ...(field.labels || []).map((label) => label.innerText || label.textContent || ""),
        field.parentElement?.innerText,
        field.parentElement?.previousElementSibling?.innerText,
        parentText.length <= 300 ? parentText : ""
      ].filter(Boolean).join(" ");
      const value = readElementValue(field).replace(/\s+/g, " ").trim();
      if (/breve descrição|breve descricao|subject|título do chamado/i.test(nearbyText) && value) {
        values.subject = value.slice(0, 160);
        break;
      }
    }
  }
  if (!values.subject) {
    const headings = [...document.querySelectorAll("h1, h2")].filter(visible);
    const heading = headings.find((element) => (element.innerText || element.textContent || "").trim());
    if (heading) values.subject = (heading.innerText || heading.textContent || "").trim().slice(0, 160);
  }
  if (!values.subject) {
    const lines = (document.body?.innerText || "").split("\n").map((line) => line.trim()).filter(Boolean);
    const ticketIndex = lines.findIndex((line) => values.ticket_id && line.includes(values.ticket_id) && /incidente|chamado|solicitação/i.test(line));
    const candidate = ticketIndex >= 0 ? lines[ticketIndex + 1] : "";
    if (candidate && candidate.length <= 160 && !/^(cancelar|aplicar|salvar|ações?)$/i.test(candidate)) {
      values.subject = candidate;
    }
  }

  return {
    ticket_id: values.ticket_id || null,
    subject: values.subject || null,
    customer: values.customer || null,
    support_type: values.support_type || null,
    requester: values.requester || null,
    priority: values.priority || null,
    status: values.status || null,
    __diagnostics: includeDiagnostics ? {
      host: frameHost,
      path: location.pathname || "blank",
      textLength: (document.body?.innerText || "").length,
      fieldCount: Object.values(values).filter(Boolean).length,
      fields: Object.keys(values).filter((key) => values[key]),
      inputs: document.querySelectorAll("input").length,
      textareas: document.querySelectorAll("textarea").length,
      selects: document.querySelectorAll("select").length,
      headings: document.querySelectorAll("h1, h2").length,
      iframes: document.querySelectorAll("iframe").length
    } : null
  };
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "RTM_READ_VISIBLE_CONTEXT") return false;
  const context = readVisibleTicketContext(Boolean(message.debug));
  void chrome.runtime.sendMessage({
    type: "RTM_VISIBLE_CONTEXT_RESULT",
    requestId: message.requestId,
    context
  });
  sendResponse({ ok: true });
  return false;
});
