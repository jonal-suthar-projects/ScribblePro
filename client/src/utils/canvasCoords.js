/**
 * Normalized canvas coordinates (0–1) so laptop, tablet, and phone
 * share the same drawable space regardless of screen size.
 */

export const CANVAS_ASPECT = 4 / 3;

export function isNormalizedPoint(pt) {
  return (
    pt &&
    typeof pt.x === 'number' &&
    typeof pt.y === 'number' &&
    pt.x >= 0 &&
    pt.x <= 1.001 &&
    pt.y >= 0 &&
    pt.y <= 1.001
  );
}

export function isNormalizedStroke(stroke) {
  if (!stroke) return false;
  if (stroke.normalized) return true;
  if (stroke.type === 'fill') return stroke.x <= 1.001 && stroke.y <= 1.001;
  if (!stroke.points?.length) return false;
  return stroke.points.every(isNormalizedPoint);
}

/** Convert local pixel stroke → wire format for server/peers */
export function normalizeStroke(stroke, canvasW, canvasH) {
  if (!stroke || !canvasW || !canvasH) return stroke;

  if (stroke.type === 'fill') {
    return {
      ...stroke,
      normalized: true,
      x: stroke.x <= 1.001 ? stroke.x : stroke.x / canvasW,
      y: stroke.y <= 1.001 ? stroke.y : stroke.y / canvasH,
    };
  }

  return {
    ...stroke,
    normalized: true,
    size: stroke.size / canvasW,
    sizeNormalized: true,
    points: (stroke.points || []).map((p) =>
      isNormalizedPoint(p)
        ? p
        : { x: p.x / canvasW, y: p.y / canvasH }
    ),
  };
}

/** Convert stored stroke → pixel coords for this client's canvas */
export function strokeToPixels(stroke, canvasW, canvasH) {
  if (!stroke || !canvasW || !canvasH) return stroke;

  if (stroke.type === 'fill') {
    const x = isNormalizedStroke(stroke) ? stroke.x * canvasW : stroke.x;
    const y = isNormalizedStroke(stroke) ? stroke.y * canvasH : stroke.y;
    return { ...stroke, x, y };
  }

  const legacyW = stroke.canvasWidth;
  const legacyH = stroke.canvasHeight;
  const normalized = isNormalizedStroke(stroke);

  const points = (stroke.points || []).map((p) => {
    if (normalized) {
      return { x: p.x * canvasW, y: p.y * canvasH };
    }
    if (legacyW > 0 && legacyH > 0) {
      return { x: (p.x / legacyW) * canvasW, y: (p.y / legacyH) * canvasH };
    }
    return { x: p.x, y: p.y };
  });

  let size = stroke.size;
  if (stroke.sizeNormalized || normalized) {
    size = stroke.size * canvasW;
  } else if (legacyW > 0) {
    size = (stroke.size / legacyW) * canvasW;
  }

  return { ...stroke, points, size };
}
