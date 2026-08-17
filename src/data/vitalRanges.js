/**
 * Vital sign reference ranges used to classify each bed as
 * Stable / Warning / Critical.
 *
 * These are general clinical reference ranges for adult ICU and neonatal
 * (NICU/incubator) monitoring, compiled from standard nursing and pediatric
 * critical care references (PALS guidelines, AAP clinical practice
 * parameters, WHO thermal care guidance, and NICU nursing education
 * material). They are reasonable defaults for a monitoring product demo —
 * NOT a substitute for your hospital's own clinical protocol. Before real
 * patient use, a clinician on your team should review and, if needed,
 * adjust these thresholds, and the admitting clinician should be able to
 * override them per patient (prescribed limits, prematurity, comorbidity).
 *
 * Structure per parameter:
 *   normal        [low, high]  -> "stable"
 *   warningLow / warningHigh   -> "warning" band just outside normal
 *   (anything beyond the warning band on either side)  -> "critical"
 */

export const ADULT_RANGES = {
  spo2: {
    label: 'SpO₂', unit: '%', min: 70, max: 100,
    normal: [95, 100],
    warningLow: [90, 94.9],
    note: 'Peripheral oxygen saturation, pulse oximetry.',
  },
  hr: {
    label: 'Heart Rate', unit: 'bpm', min: 30, max: 200,
    normal: [60, 100],
    warningLow: [50, 59.9], warningHigh: [100.1, 120],
    note: 'Resting adult heart rate, standard clinical range.',
  },
  temp: {
    label: 'Temperature', unit: '°C', min: 33, max: 42,
    normal: [36.5, 37.5],
    warningLow: [35.5, 36.49], warningHigh: [37.51, 38.4],
    note: 'Core/oral equivalent. >38.0°C is clinical fever.',
  },
  rr: {
    label: 'Resp. Rate', unit: '/min', min: 0, max: 45,
    normal: [12, 20],
    warningLow: [8, 11.9], warningHigh: [20.1, 24],
    note: 'Adult resting respiratory rate.',
  },
  nibp_sys: {
    label: 'NIBP Sys', unit: 'mmHg', min: 40, max: 220,
    normal: [90, 120],
    warningLow: [80, 89.9], warningHigh: [120.1, 140],
    note: 'Non-invasive systolic blood pressure, intermittent reading.',
  },
};

export const NEONATAL_RANGES = {
  spo2: {
    label: 'SpO₂', unit: '%', min: 70, max: 100,
    // NICU units commonly target ~90-95% for preterm infants on
    // supplemental oxygen to reduce risk of retinopathy of prematurity,
    // while a healthy term newborn off oxygen targets ≥95%. 90-97% is a
    // reasonable general default; make it configurable per-unit protocol.
    normal: [90, 97],
    warningLow: [88, 89.9], warningHigh: [97.1, 98.9],
    note: 'Target band varies by gestational age & unit protocol — adjustable per patient.',
  },
  hr: {
    label: 'Heart Rate', unit: 'bpm', min: 60, max: 240,
    normal: [120, 160],
    warningLow: [100, 119.9], warningHigh: [160.1, 180],
    note: 'Term/preterm newborn resting heart rate (PALS reference range).',
  },
  temp: {
    label: 'Skin Temp.', unit: '°C', min: 33, max: 39,
    normal: [36.5, 37.5],
    warningLow: [36.0, 36.49], warningHigh: [37.51, 38.0],
    note: 'WHO thermal care target — avoid cold stress and hyperthermia.',
  },
  rr: {
    label: 'Resp. Rate', unit: '/min', min: 0, max: 100,
    normal: [30, 60],
    warningLow: [20, 29.9], warningHigh: [60.1, 70],
    note: 'Brief pauses <20s (periodic breathing) are normal; true apnea (>20s) is not.',
  },
  incTemp: {
    label: 'Incubator Air', unit: '°C', min: 25, max: 39,
    normal: [34.5, 36.5],
    warningLow: [33.5, 34.49], warningHigh: [36.51, 37.5],
    note: 'Servo/air temperature inside the incubator shell, not the infant.',
  },
  humidity: {
    label: 'Humidity', unit: '%', min: 0, max: 100,
    normal: [50, 60],
    warningLow: [40, 49.9], warningHigh: [60.1, 70],
    note: 'Incubator relative humidity — protects skin barrier in preterm infants.',
  },
};

export function classify(value, range) {
  if (value == null || Number.isNaN(value)) return 'fault';
  const [nLow, nHigh] = range.normal;
  if (value >= nLow && value <= nHigh) return 'stable';
  if (range.warningLow && value >= range.warningLow[0] && value <= range.warningLow[1]) return 'warning';
  if (range.warningHigh && value >= range.warningHigh[0] && value <= range.warningHigh[1]) return 'warning';
  return 'critical';
}

export const STATUS_RANK = { stable: 0, warning: 1, fault: 1.5, critical: 2, vacant: -1 };

export function worstStatus(statuses) {
  return statuses.reduce((worst, s) => (STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst), 'stable');
}

export function rangesFor(mode) {
  return mode === 'neonatal' ? NEONATAL_RANGES : ADULT_RANGES;
}
