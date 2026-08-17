import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Stethoscope } from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

export default function RoleSelect() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center justify-between px-6 py-5">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Every Bed. Every Beat.</p>
        <h1 className="mb-8 text-center text-2xl font-bold text-slate-900 dark:text-slate-50">Sign in to VieWard</h1>
        <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
          <button
            onClick={() => navigate('/login/admin')}
            className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="rounded-xl bg-cyan-50 p-3 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"><ShieldCheck size={22} /></div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-50">Admin Console</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Full ward overview — every bed, real-time alarms, activity log, bed management.</p>
          </button>
          <button
            onClick={() => navigate('/login/nurse')}
            className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"><Stethoscope size={22} /></div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-50">Nurse Station</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Admit patients to beds, choose Adult or Neonatal mode, monitor your assigned beds.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
