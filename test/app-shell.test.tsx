import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/renderer/src/App";
import { exposedApiKeys } from "../src/preload/api";

describe("CopClip app shell", () => {
  it("shows the clipboard popup and settings placeholders", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Clipboard history" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Clipboard popup placeholder")).toBeInTheDocument();
  });

  it("documents the intentionally exposed preload API surface", () => {
    expect(exposedApiKeys).toEqual(["getAppInfo"]);
  });
});
