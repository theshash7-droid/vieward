import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';
import BedCard from '../components/BedCard';
import AlarmsPanel from '../components/AlarmsPanel';
import ActivityLog from '../components/ActivityLog';
import PatientDetailsModal from '../components/PatientDetailsModal';
import AdmitPatientModal from '../components/AdmitPatientModal';
import { useAuth } from '../context/AuthContext';
import { useWardData, computeStatus } from '../firebase/useWardData';

const FILTERS = ['all', 'vacant', 'stable', 'warning', 'critical'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { beds, traces, auditLog, admitPatient, dischargeBed, isLive } = useWardData();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [openBedId, setOpenBedId] = useState(null);
  const [editingBedId, setEditingBedId] = useState(null);

  const withStatus = useMemo(() => beds.map((b) => ({ bed: b, status: computeStatus(b) })), [beds]);

  const counts = useMemo(() => {
    const c = { occupied: 0, vacant: 0, critical: 0, lowVolume: 0 };
    withStatus.forEach(({ bed, status }) => {
      if (!bed.mode) c.vacant++;
      else c.occupied++;
      if (status === 'critical') c.critical++;
      if (bed.mode && bed.ivVolumeOrdered && bed.ivVolumeOrdered - (bed.iv?.volumeInfused || 0) < 50) c.lowVolume++;
    });
    return c;
  }, [withStatus]);

  const filtered = withStatus.filter(({ bed, status }) => {
    if (filter !== 'all') {
      if (filter === 'vacant' && bed.mode) return false;
      if (filter !== 'vacant' && status !== filter) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${bed.label} ${bed.patient?.name || ''} ${bed.patient?.drug || ''} ${bed.patient?.mrn || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const openBed = beds.find((b) => b.id === openBedId);
  const editingBed = beds.find((b) => b.id === editingBedId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar subtitle="Admin Console — Ward Overview" isLive={isLive} />

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-5 flex flex-wrap gap-4">
          <StatCard label="Occupied Beds" value={counts.occupied} tone="teal" />
          <StatCard label="Vacant Beds" value={counts.vacant} tone="teal" />
          <StatCard label="Critical Patients" value={counts.critical} tone="critical" />
          <StatCard label="Low IV Volume" value={counts.lowVolume} tone="warning" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3.5 py-2 text-sm font-bold capitalize transition ${
                    filter === f ? 'bg-slate-900 text-white dark:bg-cyan-600' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
              <div className="relative ml-auto min-w-[220px] flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search bed, patient, drug…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ bed, status }) => (
                <BedCard
                  key={bed.id}
                  bed={bed}
                  status={status}
                  trace={traces[bed.id]}
                  onOpen={() => (bed.mode ? setOpenBedId(bed.id) : setEditingBedId(bed.id))}
                />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400 dark:border-slate-700">
                  No beds match this filter.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <AlarmsPanel beds={beds} onSelectBed={(id) => setOpenBedId(id)} />
            <ActivityLog auditLog={auditLog} beds={beds} />
          </div>
        </div>
      </div>

      {openBed && (
        <PatientDetailsModal
          bed={openBed}
          status={computeStatus(openBed)}
          onClose={() => setOpenBedId(null)}
          canEdit
          onEdit={() => { setEditingBedId(openBed.id); setOpenBedId(null); }}
          onDischarge={() => { dischargeBed(openBed.id, user.name); setOpenBedId(null); }}
        />
      )}
      {editingBed && (
        <AdmitPatientModal
          bed={editingBed}
          actorName={user.name}
          onClose={() => setEditingBedId(null)}
          onSubmit={(payload) => { admitPatient(editingBed.id, payload, user.name); setEditingBedId(null); }}
        />
      )}
    </div>
  );
}
