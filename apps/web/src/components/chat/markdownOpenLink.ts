// Maker fork: `[label](t3-open:<http(s) url>)` in a message is a web link drawn as a pill, like a
// `t3-action:` button. Only links written this way get the pill; the dev-loop report line uses it.

const OPEN_LINK_PREFIX = "t3-open:";

/** The web URL a `t3-open:<url>` href wraps, or null. */
export function parseOpenLinkHref(href: string | null | undefined): string | null {
  if (!href?.startsWith(OPEN_LINK_PREFIX)) return null;
  const target = href.slice(OPEN_LINK_PREFIX.length);
  try {
    const url = new URL(target);
    return url.protocol === "http:" || url.protocol === "https:" ? target : null;
  } catch {
    return null;
  }
}

/** The URL without its scheme or a bare trailing slash: `localhost:4321/posts`. */
export function shortWebUrl(target: string): string {
  const url = new URL(target);
  const rest = `${url.search}${url.hash}`;
  const path = url.pathname === "/" ? (rest ? "/" : "") : url.pathname.replace(/\/$/u, "");
  return `${url.host}${path}${rest}`;
}

/** The written label, or the short URL when the text is empty or just repeats the link. */
export function openLinkLabel(written: string | null, href: string, target: string): string {
  const label = written?.trim();
  return label && label !== href && label !== target ? label : shortWebUrl(target);
}
