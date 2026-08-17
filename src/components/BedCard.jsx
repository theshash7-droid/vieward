import { Activity, Droplet } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { rangesFor, classify } from '../data/vitalRanges';

function Sparkline({ trace, status }) {
  if (!trace || trace.length < 2) return <div className="h-7" />;
  const min = Math.min(...trace);
  const max = Math.max(...trace);
  const span = max - min || 1;
  const pts = trace
    .map((v, i) => {
      const x = (i / (trace.length - 1)) * 100;
      const y = 26 - ((v - min) / span) * 20 - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke = { critical: '#DC2626', warning: '#D97706', stable: '#0891B2' }[status] || '#94A3B8';
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BedCard({ bed, status, trace, onOpen }) {
  if (!bed.mode) {
    return (
      <div className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center dark:border-slate-700 dark:bg-slate-800/40">
        <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{bed.label}</div>
        <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Vacant — ready for admission</div>
      </div>
    );
  }

  const r = rangesFor(bed.mode);
  const keys = Object.keys(r).slice(0, 4);

  const ringClass = {
    critical: 'ring-2 ring-red-400 animate-alarm-ring',
    warning: 'ring-1 ring-amber-300',
    fault: 'ring-1 ring-violet-300',
    stable: 'ring-1 ring-emerald-100 dark:ring-emerald-500/20',
  }[status];

  return (
    <button
      onClick={onOpen}
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 ${ringClass}`}
    >
      <div className="flex items-start justify-between">
        <span className="font-bold text-slate-900 dark:text-slate-50">{bed.label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            bed.mode === 'adult'
              ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400'
              : 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400'
          }`}
        >
          {bed.mode === 'adult' ? 'Adult' : 'Neonatal'}
        </span>
      </div>

      <StatusBadge status={status} className="mt-2 w-fit" />

      <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{bed.patient?.name || '—'}</div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 font-mono-num text-[13px]">
        {keys.map((k) => {
          const val = bed.vitals?.[k];
          const cls = val != null ? classify(val, r[k]) : 'fault';
          const color =
            cls === 'critical' ? 'text-red-600 dark:text-red-400' : cls === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300';
          return (
            <div key={k} className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <span>{r[k].label.replace('Resp. Rate', 'RR').replace('Heart Rate', 'HR')}</span>
              <span className={`font-semibold ${color}`}>{val != null ? val.toFixed(1) : '—'}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        <Droplet size={11} />
        {bed.iv?.rate != null ? `${bed.iv.rate.toFixed(0)} mL/hr` : '—'}
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <Activity size={11} />
        {status === 'fault' ? 'no signal' : 'live'}
      </div>

      <Sparkline trace={trace} status={status} />
    </button>
  );
}
