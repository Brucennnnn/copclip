export const ipcChannels = {
  clipboardHistoryChanged: "clipboard-history:changed",
  clipboardHistoryClear: "clipboard-history:clear",
  clipboardHistoryDelete: "clipboard-history:delete",
  clipboardHistoryList: "clipboard-history:list",
  clipboardHistoryPin: "clipboard-history:pin",
  clipboardHistoryRestore: "clipboard-history:restore",
  clipboardHistoryUnpin: "clipboard-history:unpin",
  clipboardPopupDismiss: "clipboard-popup:dismiss",
  clipboardPopupOpened: "clipboard-popup:opened",
  settingsChanged: "settings:changed",
  settingsGet: "settings:get",
  settingsOpen: "settings:open",
  settingsUpdate: "settings:update"
} as const;
