function readVisibleTicketContext(includeDiagnostics = false) {
  const pageUrl = new URL(location.href);
  const requestId = /\/SREdit\.jsp$/i.test(pageUrl.pathname)
    ? pageUrl.searchParams.get("id")
    : null;
  const ticketId = requestId && /^[A-Za-z0-9_-]{1,80}$/.test(requestId)
    ? requestId
    : null;

  return {
    ticket_id: ticketId,
    __diagnostics: includeDiagnostics ? {
      host: location.hostname || (() => {
        try { return new URL(document.referrer).hostname; } catch { return ""; }
      })(),
      path: location.pathname || "blank",
      textLength: (document.body?.innerText || "").length,
      fieldCount: ticketId ? 1 : 0,
      fields: ticketId ? ["ticket_id"] : [],
      readerInstalled: true,
      inputs: document.querySelectorAll("input").length,
      textareas: document.querySelectorAll("textarea").length,
      selects: document.querySelectorAll("select").length,
      headings: document.querySelectorAll("h1, h2").length,
      iframes: document.querySelectorAll("iframe").length
    } : null
  };
}

globalThis.__rtmReadVisibleTicketContext = readVisibleTicketContext;
