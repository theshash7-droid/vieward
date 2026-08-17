export default function StatCard({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'text-slate-900 dark:text-slate-50',
    teal: 'text-cyan-600 dark:text-cyan-400',
    critical: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
  }[tone];

  return (
    <div className="flex-1 min-w-[150px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1.5 font-mono-num text-3xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
