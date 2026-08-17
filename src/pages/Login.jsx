import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const COPY = {
  admin: { title: 'Admin Console', hint: 'Demo — ID: admin · Password: flowguard2026' },
  nurse: { title: 'Nurse Station', hint: 'Demo — ID: nurse01 · Password: ward2026' },
};

export default function Login() {
  const { role } = useParams();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!COPY[role]) return <Navigate to="/" replace />;
  if (user) return <Navigate to={`/${user.role}`} replace />;

  const submit = (e) => {
    e.preventDefault();
    const res = login(id, pin);
    if (!res.ok) { setError(res.error); return; }
    navigate(`/${res.role}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <button onClick={() => navigate('/')} className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <ArrowLeft size={15} /> Back
        </button>
        <Logo className="mb-1" />
        <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">{COPY[role].title}</p>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Staff ID</label>
            <input
              autoFocus value={id} onChange={(e) => setId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              placeholder="e.g. admin"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Password</label>
            <input
              type="password" value={pin} onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <button type="submit" className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-bold text-white hover:bg-cyan-700">
            Sign in
          </button>
        </form>
        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">{COPY[role].hint}</p>
      </div>
    </div>
  );
}
