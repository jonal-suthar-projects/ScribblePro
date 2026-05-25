import { useRef, useCallback, useEffect } from 'react';
import { throttle } from '../utils/helpers.js';
import { floodFillCanvas } from '../utils/floodFill.js';
import { normalizeStroke, strokeToPixels } from '../utils/canvasCoords.js';

const CANVAS_BG = '#ffffff';

/**
 * Canvas drawing hook — handles mouse + touch, stroke batching, remote sync, fill.
 */
export function useCanvas({
  isDrawer,
  onDraw,
  strokes = [],
  color = '#000000',
  brushSize = 4,
  isEraser = false,
  isFillMode = false,
  containerRef = null,
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const dprRef = useRef(1);
  const lastLayoutRef = useRef({ w: 0, h: 0 });
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d');
    }
    return ctxRef.current;
  }, []);

  const paintBackground = useCallback((ctx, w, h) => {
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);
  }, []);

  const drawStroke = useCallback((ctx, stroke) => {
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    if (!w || !h) return;

    const local = strokeToPixels(stroke, w, h);

    if (local.type === 'fill') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      floodFillCanvas(canvas, local.x, local.y, local.color);
      return;
    }

    if (!local?.points?.length) return;
    ctx.beginPath();
    ctx.strokeStyle = local.isEraser ? CANVAS_BG : local.color;
    ctx.lineWidth = local.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = local.isEraser ? 'destination-out' : 'source-over';
    const pts = local.points;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const midX = (pts[i - 1].x + pts[i].x) / 2;
      const midY = (pts[i - 1].y + pts[i].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const redrawAll = useCallback(
    (allStrokes) => {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      if (!w || !h) return;

      const dpr = dprRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintBackground(ctx, w, h);
      allStrokes.forEach((s) => drawStroke(ctx, s));
    },
    [getCtx, drawStroke, paintBackground]
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef?.current || canvas?.parentElement;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w < 1 || h < 1) return;

    // Prevent ResizeObserver ↔ canvas resize feedback loops
    if (lastLayoutRef.current.w === w && lastLayoutRef.current.h === h) return;
    lastLayoutRef.current = { w, h };

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sizeRef.current = { w, h };
    redrawAll(strokesRef.current);
  }, [containerRef, redrawAll]);

  useEffect(() => {
    if (drawingRef.current) return;
    redrawAll(strokes);
  }, [strokes, redrawAll]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const container = containerRef?.current || canvasRef.current?.parentElement;
    const ro =
      container && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            requestAnimationFrame(resizeCanvas);
          })
        : null;
    if (ro && container) ro.observe(container);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      ro?.disconnect();
    };
  }, [resizeCanvas, containerRef]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const logicalW = sizeRef.current.w || rect.width;
    const logicalH = sizeRef.current.h || rect.height;
    const scaleX = rect.width > 0 ? logicalW / rect.width : 1;
    const scaleY = rect.height > 0 ? logicalH / rect.height : 1;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const emitDraw = useRef(
    throttle((stroke) => {
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      onDraw?.(normalizeStroke(stroke, w, h));
    }, 16)
  ).current;

  const applyFill = (pos) => {
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    if (!w || !h) return;

    const stroke = normalizeStroke(
      {
        id: `fill-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'fill',
        color,
        x: pos.x / w,
        y: pos.y / h,
      },
      w,
      h
    );

    const canvas = canvasRef.current;
    if (canvas) floodFillCanvas(canvas, pos.x, pos.y, color);
    onDraw?.(stroke);
  };

  const startDraw = (e) => {
    if (!isDrawer) return;
    e.preventDefault();

    if (isFillMode) {
      applyFill(getPos(e));
      return;
    }

    drawingRef.current = true;
    const pos = getPos(e);
    const strokeId = `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    currentStrokeRef.current = {
      id: strokeId,
      color: isEraser ? CANVAS_BG : color,
      size: isEraser ? brushSize * 3 : brushSize,
      isEraser,
      points: [pos],
    };
  };

  const moveDraw = (e) => {
    if (isFillMode || !drawingRef.current || !isDrawer) return;
    e.preventDefault();
    const pos = getPos(e);
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    const last = stroke.points[stroke.points.length - 1];
    if (Math.hypot(pos.x - last.x, pos.y - last.y) < 2) return;
    stroke.points.push(pos);
    const ctx = getCtx();
    if (ctx) drawStroke(ctx, stroke);
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    emitDraw(normalizeStroke({ ...stroke, points: [...stroke.points] }, w, h));
  };

  const endDraw = () => {
    if (isFillMode || !drawingRef.current) return;
    drawingRef.current = false;
    const stroke = currentStrokeRef.current;
    if (stroke && stroke.points.length > 0) {
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      onDraw?.(
        normalizeStroke({ ...stroke, points: [...stroke.points], final: true }, w, h)
      );
    }
    currentStrokeRef.current = null;
  };

  return {
    canvasRef,
    startDraw,
    moveDraw,
    endDraw,
  };
}
