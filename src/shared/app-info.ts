export type AppInfo = {
  name: string;
  version: string;
  platform: NodeJS.Platform;
};

export const appInfo: AppInfo = {
  name: "CopClip",
  version: "0.1.0",
  platform: process.platform
};
