export const ipcChannels = {
  clipboardHistoryChanged: "clipboard-history:changed",
  clipboardHistoryList: "clipboard-history:list",
  clipboardHistoryRestore: "clipboard-history:restore",
  clipboardPopupDismiss: "clipboard-popup:dismiss",
  clipboardPopupOpened: "clipboard-popup:opened",
  settingsChanged: "settings:changed",
  settingsGet: "settings:get",
  settingsOpen: "settings:open",
  settingsUpdate: "settings:update"
} as const;
