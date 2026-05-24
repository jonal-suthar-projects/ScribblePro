export function Input({ label, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input className={`input-glow ${className}`} {...props} />
    </div>
  );
}
