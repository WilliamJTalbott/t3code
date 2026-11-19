import { describe, expect, it } from "vite-plus/test";

import {
  parseProjectActionHref,
  projectActionLabel,
  projectActionTerminalInput,
} from "./MarkdownProjectActionLink";

describe("parseProjectActionHref", () => {
  it("reads a script id", () => {
    expect(parseProjectActionHref("t3-action:show-demo")).toBe("show-demo");
    expect(parseProjectActionHref("t3-action:dev")).toBe("dev");
  });

  it("rejects ids a project script can't have", () => {
    expect(parseProjectActionHref("t3-action:Show")).toBeNull();
    expect(parseProjectActionHref("t3-action:show:demo")).toBeNull();
    expect(parseProjectActionHref("t3-action:-dev")).toBeNull();
    expect(parseProjectActionHref(`t3-action:${"a".repeat(25)}`)).toBeNull();
  });

  it("ignores other links", () => {
    expect(parseProjectActionHref("https://example.com")).toBeNull();
    expect(parseProjectActionHref("t3-thread://v2/env/thread")).toBeNull();
  });
});

describe("projectActionLabel", () => {
  it("drops a leading play sign", () => {
    expect(projectActionLabel("▶ show:demo", "show-demo")).toBe("show:demo");
    expect(projectActionLabel("▶️dev", "dev")).toBe("dev");
  });

  it("falls back to the id", () => {
    expect(projectActionLabel(null, "verify")).toBe("verify");
    expect(projectActionLabel("▶ ", "verify")).toBe("verify");
  });
});

describe("projectActionTerminalInput", () => {
  it("exits the shell only when the command succeeds", () => {
    expect(projectActionTerminalInput("mise run show")).toBe(" { mise run show; } && exit\r");
  });

  it("drops a trailing separator that would break the group", () => {
    expect(projectActionTerminalInput("a && b; ")).toBe(" { a && b; } && exit\r");
  });
});
