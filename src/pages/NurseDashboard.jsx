import { useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import BedCard from '../components/BedCard';
import AlarmsPanel from '../components/AlarmsPanel';
import PatientDetailsModal from '../components/PatientDetailsModal';
import AdmitPatientModal from '../components/AdmitPatientModal';
import { useAuth } from '../context/AuthContext';
import { useWardData, computeStatus } from '../firebase/useWardData';

export default function NurseDashboard() {
  const { user } = useAuth();
  const { beds, traces, admitPatient, dischargeBed, isLive } = useWardData();
  const [openBedId, setOpenBedId] = useState(null);
  const [editingBedId, setEditingBedId] = useState(null);

  const withStatus = useMemo(() => beds.map((b) => ({ bed: b, status: computeStatus(b) })), [beds]);
  const openBed = beds.find((b) => b.id === openBedId);
  const editingBed = beds.find((b) => b.id === editingBedId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar subtitle="Nurse Station — Bed Admission &amp; Monitoring" isLive={isLive} />

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <h1 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">Beds</h1>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {withStatus.map(({ bed, status }) => (
                <div key={bed.id} className="flex flex-col gap-2">
                  <BedCard bed={bed} status={status} trace={traces[bed.id]} onOpen={() => (bed.mode ? setOpenBedId(bed.id) : setEditingBedId(bed.id))} />
                  <button
                    onClick={() => setEditingBedId(bed.id)}
                    className="rounded-xl border border-cyan-200 bg-cyan-50 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-400 dark:hover:bg-cyan-500/20"
                  >
                    {bed.mode ? 'Edit Patient Details' : 'Admit Patient'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <AlarmsPanel beds={beds} onSelectBed={(id) => setOpenBedId(id)} />
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
