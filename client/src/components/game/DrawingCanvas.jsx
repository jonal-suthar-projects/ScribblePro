import { useState, useEffect, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas.js';
import { useGame } from '../../context/GameContext.jsx';
import { DrawingToolbar } from './DrawingToolbar.jsx';

export function DrawingCanvas({ compact = false, fillHeight = false }) {
  const { isDrawer, sendDraw, strokes, clearCanvas, undoStroke } = useGame();
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(compact ? 6 : 4);
  const [isEraser, setIsEraser] = useState(false);
  const [isFillMode, setIsFillMode] = useState(false);
  const wrapRef = useRef(null);

  const { canvasRef, startDraw, moveDraw, endDraw } = useCanvas({
    isDrawer,
    onDraw: sendDraw,
    strokes,
    color,
    brushSize,
    isEraser,
    isFillMode,
  });

  // Non-passive touch listeners so drawing doesn't scroll the page
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

  // Resize when tab becomes visible (mobile tab switch)
  useEffect(() => {
    if (!fillHeight) return;
    const ro = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [fillHeight]);

  return (
    <div
      ref={wrapRef}
      className={`flex flex-col gap-2 ${fillHeight ? 'h-full min-h-0' : 'h-full'}`}
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
      <div
        className={`relative flex-1 rounded-xl overflow-hidden border border-white/20 bg-white min-h-0
          ${fillHeight ? 'min-h-[200px]' : 'min-h-[200px] lg:min-h-[400px]'}`}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none select-none"
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
          <div className="absolute top-2 left-2 right-2 pointer-events-none">
            <span className="text-xs text-slate-600 bg-white/90 rounded-lg px-2 py-1 shadow">
              Tap inside a closed shape to fill
            </span>
          </div>
        )}
        {!isDrawer && (
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-2">
            <span className="text-slate-600 text-xs px-3 text-center bg-white/80 rounded-lg py-1.5 shadow max-w-[90%]">
              Watch the drawing — type your guess in chat below
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
