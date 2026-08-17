export default function Logo({ size = 34, withWordmark = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" className="fill-cyan-50 dark:fill-slate-800" />
        <path
          d="M4 20C7 13 13.5 9 20 9s13 4 16 11c-3 7-9.5 11-16 11S7 27 4 20Z"
          className="stroke-cyan-600 dark:stroke-cyan-400"
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d="M6 20H13L16 12L21 27L24.5 16L27 20H34"
          className="stroke-slate-800 dark:stroke-slate-100"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Vie<span className="text-cyan-600 dark:text-cyan-400">Ward</span>
        </span>
      )}
    </div>
  );
}
