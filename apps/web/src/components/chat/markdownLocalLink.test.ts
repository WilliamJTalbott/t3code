import { describe, expect, it } from "vite-plus/test";

import { isLocalWebHost, localWebLinkLabel } from "./markdownLocalLink";

describe("isLocalWebHost", () => {
  it("accepts loopback, private and tailnet hosts", () => {
    for (const host of [
      "localhost",
      "app.localhost",
      "mac.local",
      "pc.tail1234.ts.net",
      "127.0.0.1",
      "0.0.0.0",
      "10.0.0.5",
      "192.168.1.20",
      "172.20.0.3",
      "100.101.102.103",
      "[::1]",
    ]) {
      expect(isLocalWebHost(host)).toBe(true);
    }
  });

  it("rejects public hosts", () => {
    for (const host of ["example.com", "172.32.0.1", "100.128.0.1", "8.8.8.8", "localhost.com"]) {
      expect(isLocalWebHost(host)).toBe(false);
    }
  });
});

describe("localWebLinkLabel", () => {
  it("labels a bare local link without scheme or trailing slash", () => {
    expect(localWebLinkLabel("http://localhost:4321/", "http://localhost:4321/")).toBe(
      "localhost:4321",
    );
    expect(localWebLinkLabel("http://localhost:4321/posts/", "http://localhost:4321/posts/")).toBe(
      "localhost:4321/posts",
    );
    expect(localWebLinkLabel("http://localhost:4321/", "http://localhost:4321")).toBe(
      "localhost:4321",
    );
    expect(localWebLinkLabel("http://127.0.0.1:5173/?a=1#x", "http://127.0.0.1:5173/?a=1#x")).toBe(
      "127.0.0.1:5173/?a=1#x",
    );
  });

  it("leaves written link text and public links alone", () => {
    expect(localWebLinkLabel("http://localhost:4321/", "the dev server")).toBeNull();
    expect(localWebLinkLabel("https://example.com/", "https://example.com/")).toBeNull();
    expect(localWebLinkLabel("http://localhost:4321/", null)).toBeNull();
  });
});
