import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("./markdownStatusMarks.css", () => ({}));

const { rehypeStatusMarks, STATUS_ASK_CLASS_NAME, STATUS_FAIL_CLASS_NAME, STATUS_OK_CLASS_NAME } =
  await import("./markdownStatusMarks");

type Node = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const text = (value: string): Node => ({ type: "text", value });
const el = (tagName: string, children: Node[]): Node => ({
  type: "element",
  tagName,
  properties: {},
  children,
});

function run(tree: Node): Node {
  rehypeStatusMarks()(tree as never);
  return tree;
}

const marks = (node: Node): string[] =>
  (node.children ?? []).flatMap((child) =>
    child.tagName === "span"
      ? [
          `${(child.properties?.["className"] as string[] | undefined)?.[0]}:${child.children?.[0]?.value}`,
        ]
      : marks(child),
  );

describe("rehypeStatusMarks", () => {
  it("wraps each mark with its status class and keeps the text around it", () => {
    const tree = run(
      el("root", [el("p", [el("strong", [text("✓ added shader ✗ headless check ✔ pushed")])])]),
    );
    expect(marks(tree)).toEqual([
      `${STATUS_OK_CLASS_NAME}:✓`,
      `${STATUS_FAIL_CLASS_NAME}:✗`,
      `${STATUS_OK_CLASS_NAME}:✔`,
    ]);
    const strong = tree.children?.[0]?.children?.[0];
    expect(strong?.children?.map((c) => c.value ?? c.children?.[0]?.value).join("")).toBe(
      "✓ added shader ✗ headless check ✔ pushed",
    );
  });

  it("marks a ? that starts a word, not one that ends a question", () => {
    const tree = run(
      el("root", [el("p", [text("✓ pushed ? capture ?shots Pipeline? Why? ok ? 2")])]),
    );
    expect(marks(tree)).toEqual([
      `${STATUS_OK_CLASS_NAME}:✓`,
      `${STATUS_ASK_CLASS_NAME}:?`,
      `${STATUS_ASK_CLASS_NAME}:?`,
    ]);
  });

  it("leaves code, code blocks and links alone", () => {
    const tree = run(
      el("root", [
        el("p", [el("code", [text("✓ ok")]), el("a", [text("✗ link")])]),
        el("pre", [el("code", [text("✘ fail")])]),
      ]),
    );
    expect(marks(tree)).toEqual([]);
  });

  it("does nothing to text without marks", () => {
    const tree = run(el("root", [el("p", [text("all good")])]));
    expect(tree.children?.[0]?.children).toEqual([text("all good")]);
  });
});
