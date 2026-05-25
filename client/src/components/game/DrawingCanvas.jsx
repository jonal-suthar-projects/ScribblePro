import { useState, useEffect, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas.js';
import { useGame } from '../../context/GameContext.jsx';
import { DrawingToolbar } from './DrawingToolbar.jsx';
import { CANVAS_ASPECT } from '../../utils/canvasCoords.js';

export function DrawingCanvas({ compact = false, fillHeight = false }) {
  const { isDrawer, sendDraw, strokes, clearCanvas, undoStroke } = useGame();
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(compact ? 6 : 4);
  const [isEraser, setIsEraser] = useState(false);
  const [isFillMode, setIsFillMode] = useState(false);
  const boardRef = useRef(null);

  const { canvasRef, startDraw, moveDraw, endDraw } = useCanvas({
    isDrawer,
    onDraw: sendDraw,
    strokes,
    color,
    brushSize,
    isEraser,
    isFillMode,
    containerRef: boardRef,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawer) return;

    const preventScroll = (e) => e.preventDefault();

    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, [canvasRef, isDrawer]);

  return (
    <div
      className={`flex flex-col gap-1.5 min-h-0 ${fillHeight ? 'h-full' : 'h-full'}`}
    >
      {isDrawer && (
        <DrawingToolbar
          color={color}
          setColor={setColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          isEraser={isEraser}
          setIsEraser={setIsEraser}
          isFillMode={isFillMode}
          setIsFillMode={setIsFillMode}
          onClear={clearCanvas}
          onUndo={undoStroke}
          compact={compact}
        />
      )}
      {/* Single board container — canvas fills it exactly (no letterbox dead zones) */}
      <div
        ref={boardRef}
        className={`relative w-full rounded-xl overflow-hidden border border-white/20 bg-white touch-none
          ${fillHeight ? 'flex-1 min-h-[160px]' : 'min-h-[200px] lg:min-h-[400px]'}`}
        style={{ aspectRatio: fillHeight ? undefined : CANVAS_ASPECT }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none select-none"
          style={{
            cursor: isDrawer ? (isFillMode ? 'cell' : 'crosshair') : 'default',
            touchAction: 'none',
          }}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
          onTouchCancel={endDraw}
        />
        {isDrawer && isFillMode && (
          <div className="absolute top-1 left-1 right-1 pointer-events-none z-10">
            <span className="text-[10px] text-slate-600 bg-white/90 rounded px-1.5 py-0.5 shadow">
              Tap inside a closed shape to fill
            </span>
          </div>
        )}
        {!isDrawer && (
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-1 z-10">
            <span className="text-slate-600 text-[10px] px-2 text-center bg-white/85 rounded py-1 shadow max-w-[92%]">
              Watch the drawing — guess in chat
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
