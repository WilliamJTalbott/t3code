// Maker fork: `[label](t3-open:<http(s) url>)` in a message is a web link drawn as a pill, like a
// `t3-action:` button. Only links written this way get the pill; the turn report uses it.

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

/** Longest URL label shown whole; longer ones show only their end. */
const OPEN_LINK_LABEL_MAX = 32;

/**
 * A long short-URL cut to as many trailing path segments as fit, keeping at
 * least the last: `…/bgea_volunteer_care/pull/2104`, `…/added_to_workspace_email`.
 */
export function compactWebUrl(target: string): string {
  const short = shortWebUrl(target);
  if (short.length <= OPEN_LINK_LABEL_MAX) return short;
  const segments = new URL(target).pathname
    .split("/")
    .filter((segment) => segment !== "")
    .map(decodeSegment);
  if (segments.length === 0) return short;
  let label = `…/${segments.pop()}`;
  for (let segment = segments.pop(); segment !== undefined; segment = segments.pop()) {
    const longer = `…/${segment}/${label.slice(2)}`;
    if (longer.length > OPEN_LINK_LABEL_MAX) break;
    label = longer;
  }
  return label;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * The written label, or the (compacted) URL when the text is empty or just
 * repeats the link. The full URL stays in the pill's tooltip.
 */
export function openLinkLabel(written: string | null, href: string, target: string): string {
  const label = written?.trim();
  const repeatsLink = label === href || label === target || label === shortWebUrl(target);
  return label && !repeatsLink ? label : compactWebUrl(target);
}
