import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRUSH_COLORS } from '../../utils/constants.js';

export function DrawingToolbar({
  color,
  setColor,
  brushSize,
  setBrushSize,
  isEraser,
  setIsEraser,
  isFillMode,
  setIsFillMode,
  onClear,
  onUndo,
  compact = false,
}) {
  const [colorsOpen, setColorsOpen] = useState(false);

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => setColorsOpen(!colorsOpen)}
            className="shrink-0 w-11 h-11 rounded-xl border-2 border-neon-cyan/50 flex items-center justify-center touch-manipulation"
            style={{ backgroundColor: isEraser ? '#334155' : color }}
            aria-label="Pick color"
          >
            <span className="text-lg">{isEraser ? '🧹' : '●'}</span>
          </button>
          <input
            type="range"
            min="2"
            max="24"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 min-w-[80px] h-11 accent-neon-cyan touch-manipulation"
            aria-label="Brush size"
          />
          <ToolBtn
            active={isFillMode}
            onClick={() => {
              setIsFillMode(!isFillMode);
              setIsEraser(false);
            }}
            label="Fill closed shape"
          >
            🪣
          </ToolBtn>
          <ToolBtn
            active={isEraser}
            onClick={() => {
              setIsEraser(!isEraser);
              setIsFillMode(false);
            }}
            label="Eraser"
          >
            🧹
          </ToolBtn>
          <ToolBtn onClick={onUndo} label="Undo">
            ↩
          </ToolBtn>
          <ToolBtn onClick={onClear} danger label="Clear">
            🗑
          </ToolBtn>
        </div>
        <AnimatePresence>
          {colorsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-6 gap-2 p-2 glass rounded-xl">
                {BRUSH_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      setIsEraser(false);
                      setIsFillMode(false);
                      setColorsOpen(false);
                    }}
                    className={`w-10 h-10 rounded-full border-2 touch-manipulation ${
                      color === c && !isEraser ? 'border-neon-cyan scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 glass rounded-xl">
      <div className="flex gap-1 flex-wrap">
        {BRUSH_COLORS.map((c) => (
          <motion.button
            key={c}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setColor(c);
              setIsEraser(false);
              setIsFillMode(false);
            }}
            className={`w-7 h-7 rounded-full border-2 touch-manipulation ${
              color === c && !isEraser ? 'border-neon-cyan scale-110' : 'border-white/20'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <input
        type="range"
        min="2"
        max="24"
        value={brushSize}
        onChange={(e) => setBrushSize(Number(e.target.value))}
        className="w-20 accent-neon-cyan"
        title="Brush size"
      />
      <button
        type="button"
        onClick={() => {
          setIsFillMode(!isFillMode);
          setIsEraser(false);
        }}
        className={`px-3 py-2 min-h-[44px] rounded-lg text-sm touch-manipulation ${
          isFillMode ? 'bg-neon-cyan/30 border border-neon-cyan' : 'bg-white/5'
        }`}
      >
        Fill
      </button>
      <button
        type="button"
        onClick={() => {
          setIsEraser(!isEraser);
          setIsFillMode(false);
        }}
        className={`px-3 py-2 min-h-[44px] rounded-lg text-sm touch-manipulation ${
          isEraser ? 'bg-neon-pink/30 border border-neon-pink' : 'bg-white/5'
        }`}
      >
        Eraser
      </button>
      <button
        type="button"
        onClick={onUndo}
        className="px-3 py-2 min-h-[44px] rounded-lg bg-white/5 text-sm hover:bg-white/10 touch-manipulation"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onClear}
        className="px-3 py-2 min-h-[44px] rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 touch-manipulation"
      >
        Clear
      </button>
    </div>
  );
}

function ToolBtn({ children, onClick, active, danger, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`shrink-0 w-11 h-11 rounded-xl text-lg flex items-center justify-center touch-manipulation
        ${active ? 'bg-neon-pink/30 border border-neon-pink' : ''}
        ${danger ? 'bg-red-500/20' : 'bg-white/10'}
        ${!active && !danger ? 'hover:bg-white/15' : ''}`}
    >
      {children}
    </button>
  );
}
