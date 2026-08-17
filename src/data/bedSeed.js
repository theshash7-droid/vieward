export const BED_COUNT = Number(import.meta.env.VITE_BED_COUNT) || 8;

export function emptyBed(n) {
  const id = `bed${String(n).padStart(2, '0')}`;
  return {
    id,
    label: `Bed ${String(n).padStart(2, '0')}`,
    mode: null,          // 'adult' | 'neonatal' | null (vacant)
    patient: null,       // { name, mrn, age, sex, note, admittedAt }
    ivPrescribedRate: 0, // mL/hr, set at admission by the nurse
    ivVolumeOrdered: 0,  // mL, set at admission by the nurse
    vitals: {},          // raw readings pushed by the ESP32 node
    iv: { rate: 0, volumeInfused: 0 }, // pushed by the ESP32 flow sensor
    lastUpdate: 0,        // ms epoch of the last sensor push
    ack: false,           // alarm acknowledged flag
  };
}

export function seedBeds(count = BED_COUNT) {
  const beds = {};
  for (let i = 1; i <= count; i++) {
    const bed = emptyBed(i);
    beds[bed.id] = bed;
  }
  return beds;
}
