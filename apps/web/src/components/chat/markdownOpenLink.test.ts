import { describe, expect, it } from "vite-plus/test";

import { openLinkLabel, parseOpenLinkHref, shortWebUrl } from "./markdownOpenLink";

describe("parseOpenLinkHref", () => {
  it("unwraps a web URL", () => {
    expect(parseOpenLinkHref("t3-open:http://localhost:4321/posts/")).toBe(
      "http://localhost:4321/posts/",
    );
    expect(parseOpenLinkHref("t3-open:https://example.com")).toBe("https://example.com");
  });

  it("rejects anything that isn't a wrapped web URL", () => {
    expect(parseOpenLinkHref("http://localhost:4321/")).toBeNull();
    expect(parseOpenLinkHref("t3-open:javascript:alert(1)")).toBeNull();
    expect(parseOpenLinkHref("t3-open:file:///etc/hosts")).toBeNull();
    expect(parseOpenLinkHref("t3-open:localhost:4321")).toBeNull();
    expect(parseOpenLinkHref("t3-action:show-demo")).toBeNull();
    expect(parseOpenLinkHref(undefined)).toBeNull();
  });
});

describe("shortWebUrl", () => {
  it("drops the scheme and a bare trailing slash", () => {
    expect(shortWebUrl("http://localhost:4321/")).toBe("localhost:4321");
    expect(shortWebUrl("http://localhost:4321/posts/")).toBe("localhost:4321/posts");
    expect(shortWebUrl("http://127.0.0.1:5173/?a=1#x")).toBe("127.0.0.1:5173/?a=1#x");
  });
});

describe("openLinkLabel", () => {
  const href = "t3-open:http://localhost:4321/posts/";
  const target = "http://localhost:4321/posts/";

  it("keeps written text", () => {
    expect(openLinkLabel("posts", href, target)).toBe("posts");
  });

  it("falls back to the short URL", () => {
    expect(openLinkLabel(null, href, target)).toBe("localhost:4321/posts");
    expect(openLinkLabel(" ", href, target)).toBe("localhost:4321/posts");
    expect(openLinkLabel(href, href, target)).toBe("localhost:4321/posts");
    expect(openLinkLabel(target, href, target)).toBe("localhost:4321/posts");
  });
});
