export type AnnotationTool = "pen" | "arrow" | "rect" | "text";

export interface AnnotationPoint {
  readonly x: number;
  readonly y: number;
}

export type AnnotationShape =
  | {
      readonly kind: "pen";
      readonly color: string;
      readonly width: number;
      readonly points: ReadonlyArray<AnnotationPoint>;
    }
  | {
      readonly kind: "arrow" | "rect";
      readonly color: string;
      readonly width: number;
      readonly from: AnnotationPoint;
      readonly to: AnnotationPoint;
    }
  | {
      readonly kind: "text";
      readonly color: string;
      readonly fontSize: number;
      readonly at: AnnotationPoint;
      readonly text: string;
    };

export const ANNOTATION_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#ffffff",
  "#111111",
] as const;

/** Stroke width in image pixels, so marks look the same size whatever the screenshot's resolution. */
export function annotationStrokeWidth(imageWidth: number, imageHeight: number): number {
  return Math.max(3, Math.round(Math.max(imageWidth, imageHeight) / 300));
}

export function annotationFontSize(strokeWidth: number): number {
  return strokeWidth * 7;
}

/** The two barb tips of an arrowhead at `to`; null when the arrow is too short to point anywhere. */
export function arrowHeadPoints(
  from: AnnotationPoint,
  to: AnnotationPoint,
  strokeWidth: number,
): readonly [AnnotationPoint, AnnotationPoint] | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return null;
  const headLength = Math.min(strokeWidth * 5, length * 0.6);
  const angle = Math.atan2(dy, dx);
  const spread = Math.PI / 7;
  return [
    {
      x: to.x - headLength * Math.cos(angle - spread),
      y: to.y - headLength * Math.sin(angle - spread),
    },
    {
      x: to.x - headLength * Math.cos(angle + spread),
      y: to.y - headLength * Math.sin(angle + spread),
    },
  ];
}

/** Drops shapes the user clicked without dragging, which would otherwise draw nothing visible. */
export function isMeaningfulAnnotation(shape: AnnotationShape): boolean {
  switch (shape.kind) {
    case "pen":
      return shape.points.length > 1;
    case "arrow":
    case "rect":
      return Math.hypot(shape.to.x - shape.from.x, shape.to.y - shape.from.y) >= 4;
    case "text":
      return shape.text.trim().length > 0;
  }
}

export function annotatedFileName(name: string): string {
  const stem = name.replace(/\.[^./\\]+$/, "") || "image";
  return `${stem.replace(/-annotated$/, "")}-annotated.png`;
}

export function drawAnnotationShape(ctx: CanvasRenderingContext2D, shape: AnnotationShape): void {
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (shape.kind) {
    case "pen": {
      ctx.lineWidth = shape.width;
      ctx.beginPath();
      shape.points.forEach((point, index) =>
        index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
      );
      ctx.stroke();
      break;
    }
    case "rect": {
      ctx.lineWidth = shape.width;
      ctx.strokeRect(
        Math.min(shape.from.x, shape.to.x),
        Math.min(shape.from.y, shape.to.y),
        Math.abs(shape.to.x - shape.from.x),
        Math.abs(shape.to.y - shape.from.y),
      );
      break;
    }
    case "arrow": {
      ctx.lineWidth = shape.width;
      ctx.beginPath();
      ctx.moveTo(shape.from.x, shape.from.y);
      ctx.lineTo(shape.to.x, shape.to.y);
      const head = arrowHeadPoints(shape.from, shape.to, shape.width);
      if (head) {
        ctx.moveTo(head[0].x, head[0].y);
        ctx.lineTo(shape.to.x, shape.to.y);
        ctx.lineTo(head[1].x, head[1].y);
      }
      ctx.stroke();
      break;
    }
    case "text": {
      ctx.font = `600 ${shape.fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textBaseline = "top";
      // A contrasting outline keeps text readable on any background.
      ctx.lineWidth = Math.max(2, shape.fontSize / 6);
      ctx.strokeStyle = isLightColor(shape.color) ? "rgb(0 0 0 / 0.7)" : "rgb(255 255 255 / 0.85)";
      shape.text.split("\n").forEach((line, index) => {
        const y = shape.at.y + index * shape.fontSize * 1.25;
        ctx.strokeText(line, shape.at.x, y);
        ctx.fillText(line, shape.at.x, y);
      });
      break;
    }
  }
  ctx.restore();
}

function isLightColor(hex: string): boolean {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}
