export default function ActivityLog({ auditLog, beds }) {
  const entries = Object.entries(auditLog)
    .flatMap(([bedId, list]) => list.map((e) => ({ ...e, bedId })))
    .sort((a, b) => b.t - a.t)
    .slice(0, 12);

  const labelFor = (bedId) => beds.find((b) => b.id === bedId)?.label || bedId;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Ward Activity Log</div>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">No activity yet this session.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {entries.map((e, i) => (
            <li key={i} className="border-l-2 border-cyan-400 pl-3">
              <div className="font-mono-num text-[11px] text-slate-400 dark:text-slate-500">
                {new Date(e.t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {labelFor(e.bedId)}
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300">{e.text}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
