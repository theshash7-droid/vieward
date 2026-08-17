const STYLES = {
  stable: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  critical: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  vacant: 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
  fault: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
};
const DOT = {
  stable: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
  vacant: 'bg-slate-400',
  fault: 'bg-violet-500',
};
const LABEL = {
  stable: 'Stable',
  warning: 'Warning',
  critical: 'Critical',
  vacant: 'Vacant',
  fault: 'Signal Issue',
};

export default function StatusBadge({ status, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STYLES[status]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]} ${status === 'critical' ? 'animate-soft-blink' : ''}`} />
      {LABEL[status]}
    </span>
  );
}

export { STYLES, DOT, LABEL };
