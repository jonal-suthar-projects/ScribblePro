import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext.jsx';
import { EMOJI_REACTIONS } from '../../utils/constants.js';

export function ChatPanel({ fullHeight = false }) {
  const {
    chatMessages,
    sendChat,
    sendGuess,
    sendReaction,
    sendTyping,
    typingUsers,
    isDrawer,
    hasGuessed,
    room,
  } = useGame();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg) return;
    if (isDrawer) {
      sendChat(msg);
    } else if (!hasGuessed && room?.phase === 'drawing') {
      sendGuess(msg);
    } else {
      sendChat(msg);
    }
    setInput('');
    sendTyping(false);
  };

  const placeholder = isDrawer
    ? 'Chat only (drawing)...'
    : hasGuessed
      ? 'Chat...'
      : 'Type your guess...';

  return (
    <div
      className={`flex flex-col glass rounded-xl overflow-hidden
        ${fullHeight ? 'h-full min-h-0' : 'h-full'}`}
    >
      <div className="px-3 py-2 border-b border-white/10 font-display text-sm uppercase tracking-wider text-slate-400 shrink-0">
        Chat
      </div>
      <div
        className={`flex-1 overflow-y-auto p-3 space-y-2 overscroll-contain
          ${fullHeight ? 'min-h-0' : 'min-h-[120px] max-h-[280px] lg:max-h-none lg:min-h-[120px]'}`}
      >
        <AnimatePresence initial={false}>
          {chatMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm ${
                msg.type === 'system'
                  ? 'text-neon-green text-center italic'
                  : msg.type === 'guess'
                    ? 'text-slate-400'
                    : ''
              }`}
            >
              {msg.type !== 'system' && (
                <span className="font-semibold text-neon-cyan">{msg.playerName}: </span>
              )}
              <span className={msg.type === 'guess' ? 'line-through opacity-60' : ''}>
                {msg.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
      {typingUsers.length > 0 && (
        <div className="px-3 text-xs text-slate-500 italic shrink-0">
          {typingUsers[0].playerName} is typing...
        </div>
      )}
      <div className="flex gap-1 px-2 py-1 border-t border-white/5 overflow-x-auto shrink-0 scrollbar-hide">
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => sendReaction(emoji)}
            className="text-xl min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-110 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-2 border-t border-white/10 shrink-0 safe-bottom-input"
      >
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            sendTyping(e.target.value.length > 0);
          }}
          onBlur={() => sendTyping(false)}
          placeholder={placeholder}
          className="input-glow text-base py-3 min-h-[48px]"
          maxLength={200}
          enterKeyHint={hasGuessed || isDrawer ? 'send' : 'go'}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
