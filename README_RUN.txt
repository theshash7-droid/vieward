FlowGuard React app

1. Install Node.js LTS from https://nodejs.org/
2. Open PowerShell in this folder:
   C:\Users\LENOVO\Documents\Codex project\flowguard-react
3. Run:
   npm install
   npm run dev
4. Open the URL shown by Vite, usually:
   http://localhost:5173/

Default login:
admin / flowguard2026

You can also create a new account from the login page.

Care modes:

VieWard now has two switchable modes in the top bar:
- Adult ICU
- Neonatal ICU

Adult mode focuses on infusion and bed-level monitoring.
Neonatal mode adds incubator-specific monitoring:
- Incubator air temperature
- Skin temperature
- Humidity
- Oxygen concentration
- Noise exposure
- Light exposure
- Servo temperature delta
- Gestational age and birth weight
- Feeding method
- Apnea events
- Kangaroo-care readiness

The NICU "Concept Layer" is a prototype decision-support area. It is not clinically validated yet. It currently shows:
- Thermal Drift Watch
- Kangaroo-Care Window
- Developmental Stress

Arduino / sensor integration path:

VieWard now includes a Sensor Gateway button in the dashboard.
It accepts either pasted JSON or a fetchable API URL.

Expected JSON:
{
  "bedId": 1,
  "sensorId": "BED-01",
  "rate": 72,
  "prescribed": 80,
  "remaining": 140,
  "status": "ok",
  "hr": 82,
  "spo2": 98,
  "rr": 18,
  "bp": "118/76",
  "temp": "98.6 F"
}

Neonatal JSON example:
{
  "bedId": 1,
  "sensorId": "BED-01",
  "incubatorTemp": 36.5,
  "skinTemp": 36.8,
  "humidity": 65,
  "oxygen": 28,
  "noiseDb": 48,
  "lightLux": 120,
  "servoTempDelta": 0.2,
  "thermalTrend": "steady",
  "hr": 142,
  "spo2": 96,
  "rr": 42
}

For Vercel:
- Add VITE_SENSOR_API_URL in Vercel environment variables if you have a backend/API returning latest sensor readings.
- The React app can fetch that URL from Sensor Gateway.
- A real Arduino should send data to a backend/API/database, not directly to browser localStorage.
