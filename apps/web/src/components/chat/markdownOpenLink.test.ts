import { describe, expect, it } from "vite-plus/test";

import { compactWebUrl, openLinkLabel, parseOpenLinkHref, shortWebUrl } from "./markdownOpenLink";

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
    expect(openLinkLabel("localhost:4321/posts", href, target)).toBe("localhost:4321/posts");
  });

  it("shows only the end of a long address", () => {
    const long =
      "http://localhost:3000/rails/mailers/notifications_mailer/added_to_workspace_email";
    const written = "localhost:3000/rails/mailers/notifications_mailer/added_to_workspace_email";
    expect(openLinkLabel(written, `t3-open:${long}`, long)).toBe("…/added_to_workspace_email");
    expect(openLinkLabel(null, `t3-open:${long}`, long)).toBe("…/added_to_workspace_email");
  });

  it("keeps a long written label that isn't the address", () => {
    const long =
      "http://localhost:3000/rails/mailers/notifications_mailer/added_to_workspace_email";
    expect(openLinkLabel("workspace email", `t3-open:${long}`, long)).toBe("workspace email");
  });
});

describe("compactWebUrl", () => {
  it("leaves short addresses whole", () => {
    expect(compactWebUrl("http://localhost:4321/posts/")).toBe("localhost:4321/posts");
  });

  it("keeps as many trailing segments as fit", () => {
    expect(compactWebUrl("https://github.com/RoleModel/bgea_volunteer_care/pull/2104")).toBe(
      "…/bgea_volunteer_care/pull/2104",
    );
    expect(compactWebUrl("http://localhost:3000/a/very/long/path/to/some/page/")).toBe(
      "…/a/very/long/path/to/some/page",
    );
  });

  it("keeps the last segment even when it alone is long", () => {
    expect(compactWebUrl(`http://localhost:3000/x/${"y".repeat(40)}`)).toBe(`…/${"y".repeat(40)}`);
  });
});
