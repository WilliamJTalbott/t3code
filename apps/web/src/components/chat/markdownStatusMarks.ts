// Maker patch (feat/status-marks): wraps ✓/✔ and ✗/✘ so they take the
// theme's success and destructive colours.
import "./markdownStatusMarks.css";

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const STATUS_MARK = /[✓✔✗✘]/g;
// Non-global twin for the quick check: test() on a /g regex moves lastIndex,
// which matchAll then starts from.
const HAS_STATUS_MARK = /[✓✔✗✘]/;
const OK_MARKS = new Set(["✓", "✔"]);
// Code and links keep their own drawing.
const SKIP_TAGS = new Set(["pre", "code", "a", "kbd", "samp"]);

export const STATUS_OK_CLASS_NAME = "chat-markdown-status-ok";
export const STATUS_FAIL_CLASS_NAME = "chat-markdown-status-fail";

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
        className: [OK_MARKS.has(match[0]) ? STATUS_OK_CLASS_NAME : STATUS_FAIL_CLASS_NAME],
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
