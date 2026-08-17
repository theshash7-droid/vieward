import { useEffect, useState } from 'react';
import { LogOut, Radio, MonitorPlay } from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

export default function TopBar({ subtitle, isLive }) {
  const { user, logout } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-6 py-3.5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="flex items-center gap-4">
        <Logo size={32} />
        {subtitle && <span className="hidden text-sm font-medium text-slate-400 dark:text-slate-500 sm:inline">{subtitle}</span>}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="hidden font-mono-num text-slate-500 dark:text-slate-400 md:inline">
          {now.toLocaleDateString('en-GB')} · {now.toLocaleTimeString('en-GB')}
        </span>

        <span
          className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide sm:inline-flex ${
            isLive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }`}
        >
          {isLive ? <Radio size={12} /> : <MonitorPlay size={12} />}
          {isLive ? 'Live Sensor Feed' : 'Demo Simulation'}
        </span>

        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{user?.name}</span>
          <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{user?.role}</span>
        </div>

        <ThemeToggle />

        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}
