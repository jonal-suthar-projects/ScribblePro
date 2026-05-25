import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext.jsx';
import { EMOJI_REACTIONS } from '../../utils/constants.js';

export function ChatPanel({ fullHeight = false, mobile = false }) {
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
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
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
      className={`flex flex-col glass rounded-xl overflow-hidden min-h-0
        ${fullHeight ? 'h-full' : 'h-full'}
        ${mobile ? 'rounded-lg' : ''}`}
    >
      <div
        className={`px-2 border-b border-white/10 font-display uppercase tracking-wider text-slate-400 shrink-0
          ${mobile ? 'py-1 text-[10px]' : 'py-2 text-sm'}`}
      >
        Chat
      </div>
      <div
        ref={listRef}
        className={`flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5 min-h-0
          ${mobile ? 'max-h-none' : 'min-h-[120px] max-h-[280px] lg:max-h-none lg:min-h-[120px]'}`}
      >
        <AnimatePresence initial={false}>
          {chatMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${mobile ? 'text-xs' : 'text-sm'} ${
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
        <div className={`px-2 text-slate-500 italic shrink-0 ${mobile ? 'text-[10px]' : 'text-xs'}`}>
          {typingUsers[0].playerName} is typing...
        </div>
      )}
      <div
        className={`flex gap-0.5 px-1.5 border-t border-white/5 overflow-x-auto shrink-0 scrollbar-hide
          ${mobile ? 'py-1' : 'py-1'}`}
      >
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => sendReaction(emoji)}
            className={`flex items-center justify-center touch-manipulation active:scale-110 transition-transform
              ${mobile ? 'text-lg min-w-[40px] min-h-[40px]' : 'text-xl min-w-[44px] min-h-[44px]'}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className={`border-t border-white/10 shrink-0 safe-bottom-input
          ${mobile ? 'p-1.5' : 'p-2'}`}
      >
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            sendTyping(e.target.value.length > 0);
          }}
          onBlur={() => sendTyping(false)}
          placeholder={placeholder}
          className={`input-glow w-full min-h-[44px] ${mobile ? 'text-sm py-2.5' : 'text-base py-3'}`}
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
