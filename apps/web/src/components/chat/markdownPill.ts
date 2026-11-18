// Maker fork: the small pill drawn for project action links and local web links in messages, so
// the buttons a reply ends with all look alike.

export const MARKDOWN_PILL_CLASS_NAME =
  "mx-0.5 inline-flex items-baseline gap-1 rounded-md border border-border/70 bg-muted/60 px-1.5 py-px align-baseline font-mono text-xs leading-normal font-medium no-underline";

export const MARKDOWN_PILL_INTERACTIVE_CLASS_NAME =
  "cursor-pointer text-foreground transition-colors hover:border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring";

/** Markdown links are info-colored with a dotted hover underline; a pill link drops both. */
export const MARKDOWN_PILL_LINK_OVERRIDES_CLASS_NAME = "text-foreground! bg-none!";

export const MARKDOWN_PILL_ICON_CLASS_NAME = "size-3 self-center";
