// Maker patch (feat/status-marks): wraps ✓/✔, ✗/✘ and a leading ? so they
// take the theme's success, destructive and warning colours.
import "./markdownStatusMarks.css";

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

// A ? counts only before a word ("? capture"), never at the end of a
// question.
const STATUS_MARK = /[✓✔✗✘]|(?<=^|\s)\?(?= ?\p{L})/gu;
// Non-global twin for the quick check: test() on a /g regex moves lastIndex,
// which matchAll then starts from.
const HAS_STATUS_MARK = /[✓✔✗✘]|(?<=^|\s)\?(?= ?\p{L})/u;
const OK_MARKS = new Set(["✓", "✔"]);
// Code and links keep their own drawing.
const SKIP_TAGS = new Set(["pre", "code", "a", "kbd", "samp"]);

export const STATUS_OK_CLASS_NAME = "chat-markdown-status-ok";
export const STATUS_FAIL_CLASS_NAME = "chat-markdown-status-fail";
export const STATUS_ASK_CLASS_NAME = "chat-markdown-status-ask";

function statusClassName(mark: string): string {
  if (OK_MARKS.has(mark)) return STATUS_OK_CLASS_NAME;
  return mark === "?" ? STATUS_ASK_CLASS_NAME : STATUS_FAIL_CLASS_NAME;
}

function splitStatusMarks(value: string): HastNode[] | null {
  if (!HAS_STATUS_MARK.test(value)) return null;
  const parts: HastNode[] = [];
  let last = 0;
  for (const match of value.matchAll(STATUS_MARK)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: "text", value: value.slice(last, index) });
    parts.push({
      type: "element",
      tagName: "span",
      properties: {
        className: [statusClassName(match[0])],
      },
      children: [{ type: "text", value: match[0] }],
    });
    last = index + match[0].length;
  }
  if (last < value.length) parts.push({ type: "text", value: value.slice(last) });
  return parts;
}

export function rehypeStatusMarks() {
  const visit = (node: HastNode): void => {
    if (!node.children || (node.tagName && SKIP_TAGS.has(node.tagName))) return;
    const children: HastNode[] = [];
    for (const child of node.children) {
      const parts = child.type === "text" ? splitStatusMarks(child.value ?? "") : null;
      if (parts) {
        children.push(...parts);
      } else {
        visit(child);
        children.push(child);
      }
    }
    node.children = children;
  };
  return visit;
}
