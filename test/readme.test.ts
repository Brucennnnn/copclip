import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("developer documentation", () => {
  it("documents the core local development commands", () => {
    const readme = readFileSync("README.md", "utf8");

    expect(readme).toContain("npm install");
    expect(readme).toContain("npm run dev");
    expect(readme).toContain("npm test");
    expect(readme).toContain("npm run build");
  });
});
