import type { CopClipApi } from "../../preload/api";

declare global {
  interface Window {
    copclip?: CopClipApi;
  }
}
