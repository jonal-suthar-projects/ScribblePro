function parseHex(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Dark ink / stroke boundary — do not flood across these pixels */
function isStrokeBoundary(r, g, b, a) {
  if (a < 40) return false;
  return luminance(r, g, b) < 95;
}

function isNearWhite(r, g, b, a) {
  return a > 20 && r > 245 && g > 245 && b > 245;
}

/**
 * Flood fill on canvas bitmap (handles devicePixelRatio correctly).
 * @param {HTMLCanvasElement} canvas
 * @param {number} logicalX - CSS pixel X
 * @param {number} logicalY - CSS pixel Y
 * @param {string} fillColor - hex
 */
export function floodFillCanvas(canvas, logicalX, logicalY, fillColor) {
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const x0 = Math.floor(logicalX * dpr);
  const y0 = Math.floor(logicalY * dpr);
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  ctx.restore();

  const data = imageData.data;
  const { r: fillR, g: fillG, b: fillB } = parseHex(fillColor);

  const startIdx = (y0 * w + x0) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];
  const startA = data[startIdx + 3];
  const fillingFromBackground = isNearWhite(startR, startG, startB, startA);

  if (
    Math.abs(startR - fillR) < 8 &&
    Math.abs(startG - fillG) < 8 &&
    Math.abs(startB - fillB) < 8
  ) {
    return;
  }

  const match = (idx) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (isStrokeBoundary(r, g, b, a)) return false;
    if (fillingFromBackground) return isNearWhite(r, g, b, a);
    if (a < 10) return startA < 10;
    return (
      Math.abs(r - startR) <= 28 &&
      Math.abs(g - startG) <= 28 &&
      Math.abs(b - startB) <= 28
    );
  };

  const stack = [[x0, y0]];
  const visited = new Uint8Array(w * h);

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const vi = y * w + x;
    if (visited[vi]) continue;

    const idx = vi * 4;
    if (!match(idx)) continue;

    visited[vi] = 1;
    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = 255;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(imageData, 0, 0);
  ctx.restore();
}
