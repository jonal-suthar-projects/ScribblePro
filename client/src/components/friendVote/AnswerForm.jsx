import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button.jsx';

export function AnswerForm({ onSubmit, disabled, submitted, isTarget }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit(text.trim());
      setText('');
    } catch (err) {
      setError(err.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (isTarget) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card text-center py-12 space-y-3"
      >
        <span className="text-5xl">👀</span>
        <p className="font-display text-xl text-neon-pink">You&apos;re the target!</p>
        <p className="text-slate-400 text-sm">Sit back and watch your friends roast you.</p>
      </motion.div>
    );
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="glass-card text-center py-12 space-y-2"
      >
        <span className="text-4xl">✅</span>
        <p className="font-display text-lg text-neon-cyan">Answer locked in!</p>
        <p className="text-slate-500 text-sm">Waiting for everyone else...</p>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="glass-card space-y-4 p-3 sm:p-4"
    >
      <label className="text-xs uppercase tracking-widest text-slate-400">
        Your anonymous answer
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 120))}
        disabled={disabled || loading}
        placeholder="Be funny. Be chaotic. Be kind-ish."
        rows={3}
        className="input-glow w-full resize-none"
        maxLength={120}
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{text.length}/120</span>
        {error && <span className="text-red-400">{error}</span>}
      </div>
      <Button type="submit" className="w-full" loading={loading} disabled={text.trim().length < 2}>
        Submit Answer
      </Button>
    </motion.form>
  );
}
