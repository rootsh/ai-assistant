const CHAT_SESSION_KEY = "rtmDemoChatSession";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

chrome.action.onClicked.addListener((tab) => {
  // Open synchronously from the toolbar gesture; also signal a fresh chat session.
  const opening = tab?.windowId !== undefined
    ? chrome.sidePanel.open({ windowId: tab.windowId })
    : Promise.resolve();
  const resetting = chrome.storage.session.get(CHAT_SESSION_KEY).then((stored) =>
    chrome.storage.session.set({ [CHAT_SESSION_KEY]: (stored[CHAT_SESSION_KEY] || 0) + 1 })
  );
  void Promise.allSettled([opening, resetting]);
});
