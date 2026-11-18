// Maker fork: a bare link to a local or private-network web address (a dev server) is drawn as a
// pill, like a project action link, instead of a favicon link.

const PRIVATE_HOST_PATTERNS: ReadonlyArray<RegExp> = [
  /^localhost$/u,
  /\.localhost$/u,
  /\.local$/u,
  /\.ts\.net$/u,
  /^127\.\d+\.\d+\.\d+$/u,
  /^0\.0\.0\.0$/u,
  /^10\.\d+\.\d+\.\d+$/u,
  /^192\.168\.\d+\.\d+$/u,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/u,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/u, // Tailscale (CGNAT range)
  /^\[::1\]$/u,
];

export function isLocalWebHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

function parseWebUrl(href: string): URL | null {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * The pill label for a bare local link (its text is the URL itself), or null. The label drops the
 * scheme and a trailing slash: `http://localhost:4321/posts/` reads `localhost:4321/posts`.
 */
export function localWebLinkLabel(href: string, text: string | null): string | null {
  const url = parseWebUrl(href);
  if (!url || !isLocalWebHost(url.hostname)) return null;
  const written = text?.trim();
  if (!written || (written !== href && `${written}/` !== href)) return null;
  const rest = `${url.search}${url.hash}`;
  const path = url.pathname === "/" ? (rest ? "/" : "") : url.pathname.replace(/\/$/u, "");
  return `${url.host}${path}${rest}`;
}
