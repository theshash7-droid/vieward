import { AlertTriangle } from 'lucide-react';
import { rangesFor, classify } from '../data/vitalRanges';
import { computeStatus } from '../firebase/useWardData';

export default function AlarmsPanel({ beds, onSelectBed }) {
  const alarms = beds
    .filter((b) => b.mode)
    .map((b) => ({ bed: b, status: computeStatus(b) }))
    .filter((a) => a.status === 'critical' || a.status === 'warning' || a.status === 'fault')
    .sort((a) => (a.status === 'critical' ? -1 : 1));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
        <AlertTriangle size={16} className="text-amber-500" />
        Alarms
      </div>
      {alarms.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">No active alarms.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {alarms.map(({ bed, status }) => {
            const r = rangesFor(bed.mode);
            const offenders = Object.keys(r).filter((k) => bed.vitals?.[k] != null && classify(bed.vitals[k], r[k]) !== 'stable');
            const dotColor = status === 'critical' ? 'bg-red-500' : status === 'fault' ? 'bg-violet-500' : 'bg-amber-500';
            return (
              <li key={bed.id}>
                <button
                  onClick={() => onSelectBed(bed.id)}
                  className="flex w-full items-start gap-2.5 rounded-xl border border-slate-100 p-2.5 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{bed.label} — {bed.patient?.name || 'Unnamed'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {status === 'fault' ? 'Sensor signal unstable' : offenders.map((k) => r[k].label).join(', ') || 'IV flow deviating'}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
