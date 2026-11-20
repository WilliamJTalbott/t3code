/* oxlint-disable t3code/no-untranslated-copy -- maker fork: English-only, never sent upstream */
import {
  ArrowUpRightIcon,
  PencilIcon,
  Redo2Icon,
  SquareIcon,
  TypeIcon,
  Undo2Icon,
} from "lucide-react";
import {
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn, isMacPlatform } from "~/lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogFooter, DialogPopup, DialogTitle } from "../ui/dialog";
import { Kbd } from "../ui/kbd";
import { toastManager } from "../ui/toast";
import { Toggle, ToggleGroup } from "../ui/toggle-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { composerFloatingLayerProps } from "./composerEventScope";
import {
  ANNOTATION_COLORS,
  annotatedFileName,
  annotationFontSize,
  annotationStrokeWidth,
  drawAnnotationShape,
  isMeaningfulAnnotation,
  type AnnotationPoint,
  type AnnotationShape,
  type AnnotationTool,
} from "./imageAnnotation.logic";

const TOOLS: ReadonlyArray<{
  readonly tool: AnnotationTool;
  readonly label: string;
  readonly shortcut: string;
  readonly Icon: typeof PencilIcon;
}> = [
  { tool: "pen", label: "Pen", shortcut: "P", Icon: PencilIcon },
  { tool: "arrow", label: "Arrow", shortcut: "A", Icon: ArrowUpRightIcon },
  { tool: "rect", label: "Box", shortcut: "B", Icon: SquareIcon },
  { tool: "text", label: "Text", shortcut: "T", Icon: TypeIcon },
];

interface TextDraft {
  readonly at: AnnotationPoint;
  readonly left: number;
  readonly top: number;
  readonly displayScale: number;
}

export function ImageAnnotationDialog({
  file,
  name,
  onCancel,
  onSave,
}: {
  readonly file: File;
  readonly name: string;
  readonly onCancel: () => void;
  readonly onSave: (annotated: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const draftRef = useRef<AnnotationShape | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const loaded = imageSize !== null;
  const strokeWidth = imageSize ? annotationStrokeWidth(imageSize.width, imageSize.height) : 4;
  const [tool, setTool] = useState<AnnotationTool>("arrow");
  const [color, setColor] = useState<string>(ANNOTATION_COLORS[0]);
  const [shapes, setShapes] = useState<ReadonlyArray<AnnotationShape>>([]);
  const [redoStack, setRedoStack] = useState<ReadonlyArray<AnnotationShape>>([]);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const mod = isMacPlatform(navigator.platform) ? "⌘" : "Ctrl+";

  const paint = (committed: ReadonlyArray<AnnotationShape>) => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !bitmap || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    for (const shape of committed) drawAnnotationShape(ctx, shape);
    if (draftRef.current) drawAnnotationShape(ctx, draftRef.current);
  };

  const onLoadFailed = useEffectEvent(() => {
    toastManager.add({ type: "error", title: `'${name}' could not be opened for annotation.` });
    onCancel();
  });

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- decodes the image file into a bitmap the canvas draws from, and frees it on close
  useLayoutEffect(() => {
    let disposed = false;
    void createImageBitmap(file).then(
      (bitmap) => {
        if (disposed) {
          bitmap.close();
          return;
        }
        bitmapRef.current = bitmap;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
        }
        setImageSize({ width: bitmap.width, height: bitmap.height });
      },
      () => {
        if (!disposed) onLoadFailed();
      },
    );
    return () => {
      disposed = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [file]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- repaints the canvas, which lives outside React, from the committed shapes
  useLayoutEffect(() => {
    if (loaded) paint(shapes);
  });

  const toImagePoint = (event: { clientX: number; clientY: number }): AnnotationPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const commit = (shape: AnnotationShape) => {
    if (!isMeaningfulAnnotation(shape)) return;
    setShapes((current) => [...current, shape]);
    setRedoStack([]);
  };

  const undo = () => {
    const last = shapes.at(-1);
    if (!last) return;
    setShapes(shapes.slice(0, -1));
    setRedoStack([...redoStack, last]);
  };

  const redo = () => {
    const next = redoStack.at(-1);
    if (!next) return;
    setRedoStack(redoStack.slice(0, -1));
    setShapes([...shapes, next]);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!loaded || event.button !== 0) return;
    const point = toImagePoint(event);
    if (!point) return;
    event.preventDefault();
    if (tool === "text") {
      const canvas = event.currentTarget;
      const stage = stageRef.current;
      if (!stage) return;
      const canvasRect = canvas.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      setTextDraft({
        at: point,
        left: event.clientX - stageRect.left,
        top: event.clientY - stageRect.top,
        displayScale: canvasRect.width / canvas.width,
      });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    draftRef.current =
      tool === "pen"
        ? { kind: "pen", color, width: strokeWidth, points: [point] }
        : { kind: tool, color, width: strokeWidth, from: point, to: point };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const draft = draftRef.current;
    if (!draft) return;
    const point = toImagePoint(event);
    if (!point) return;
    draftRef.current =
      draft.kind === "pen"
        ? { ...draft, points: [...draft.points, point] }
        : draft.kind === "text"
          ? draft
          : { ...draft, to: point };
    paint(shapes);
  };

  const onPointerUp = () => {
    const draft = draftRef.current;
    draftRef.current = null;
    if (draft) commit(draft);
    paint(shapes);
  };

  const commitText = (text: string) => {
    if (textDraft) {
      commit({
        kind: "text",
        color,
        fontSize: annotationFontSize(strokeWidth),
        at: textDraft.at,
        text,
      });
    }
    setTextDraft(null);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded || saving) return;
    setSaving(true);
    canvas.toBlob((blob) => {
      if (!blob) {
        setSaving(false);
        toastManager.add({ type: "error", title: "The annotated image could not be saved." });
        return;
      }
      onSave(new File([blob], annotatedFileName(name), { type: "image/png" }));
    }, "image/png");
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.target instanceof HTMLTextAreaElement) return;
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (mod && key === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && key === "enter") {
      event.preventDefault();
      save();
      return;
    }
    if (mod || event.altKey) return;
    const shortcut = TOOLS.find((entry) => entry.shortcut.toLowerCase() === key);
    if (shortcut) {
      event.preventDefault();
      setTool(shortcut.tool);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogPopup
        {...composerFloatingLayerProps}
        className="flex h-[min(90vh,64rem)] max-w-[min(95vw,96rem)] flex-col overflow-hidden"
        showCloseButton={false}
        onKeyDown={onKeyDown}
      >
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5">
          <DialogTitle className="sr-only">Annotate {name}</DialogTitle>
          <span aria-hidden="true" className="min-w-0 flex-1 truncate font-medium text-sm">
            {name}
          </span>
          <ToggleGroup
            aria-label="Annotation tool"
            value={[tool]}
            onValueChange={(value: unknown[]) => {
              const next = TOOLS.find((entry) => value.includes(entry.tool));
              if (next) setTool(next.tool);
            }}
          >
            {TOOLS.map(({ tool: entryTool, label, shortcut, Icon }) => (
              <Tooltip key={entryTool}>
                <TooltipTrigger render={<Toggle value={entryTool} aria-label={label} />}>
                  <Icon className="size-3.5" />
                </TooltipTrigger>
                <TooltipPopup>
                  {label} <Kbd>{shortcut}</Kbd>
                </TooltipPopup>
              </Tooltip>
            ))}
          </ToggleGroup>
          <div role="radiogroup" aria-label="Annotation colour" className="flex items-center gap-1">
            {ANNOTATION_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={color === swatch}
                aria-label={swatch}
                onClick={() => setColor(swatch)}
                className={cn(
                  "flex size-6 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60",
                  color === swatch && "ring-2 ring-inset ring-ring",
                )}
              >
                <span
                  style={{ backgroundColor: swatch }}
                  className="size-4 rounded-full border border-foreground/20"
                />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Undo"
              disabled={shapes.length === 0}
              onClick={undo}
            >
              <Undo2Icon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Redo"
              disabled={redoStack.length === 0}
              onClick={redo}
            >
              <Redo2Icon />
            </Button>
          </div>
        </div>
        <div
          ref={stageRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/40 p-4"
        >
          <canvas
            ref={canvasRef}
            aria-label={`Drawing surface for ${name}`}
            className={cn(
              "max-h-full max-w-full touch-none shadow-sm",
              tool === "text" ? "cursor-text" : "cursor-crosshair",
              !loaded && "invisible",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {textDraft ? (
            <textarea
              autoFocus
              aria-label="Annotation text"
              rows={1}
              placeholder="Type, then Enter"
              className="absolute min-w-40 resize-none border-0 bg-transparent p-0 font-semibold leading-tight outline-1 outline-dashed outline-current"
              style={{
                left: textDraft.left,
                top: textDraft.top,
                color,
                fontSize: annotationFontSize(strokeWidth) * textDraft.displayScale,
              }}
              // Blur is the single commit path, so Enter, Escape and clicking away never commit twice.
              onBlur={(event) => commitText(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.value = "";
                  event.currentTarget.blur();
                } else if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            />
          ) : null}
        </div>
        <DialogFooter className="items-center">
          <span className="me-auto hidden text-muted-foreground text-xs sm:block">
            <Kbd>{mod}Z</Kbd> undo · <Kbd>{mod}⇧Z</Kbd> redo · <Kbd>{mod}↵</Kbd> save
          </span>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!loaded || saving}>
            Use annotated image
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
