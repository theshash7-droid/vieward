/**
 * Firebase is the real-time data layer between the ESP32 bedside sensors
 * and this app. Both the Arduino sketch (see /esp32/vieward_bed_node.ino)
 * and this frontend read/write the same Realtime Database, so a sensor
 * reading pushed from a bed shows up here within roughly a second — no
 * custom backend server to run or deploy.
 *
 * If no Firebase project is configured yet (no .env values set), the app
 * automatically falls back to an internal simulation so it's fully
 * demoable out of the box. Nothing else in the app needs to know which
 * mode it's in — see useWardData.js.
 */
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.databaseURL && firebaseConfig.projectId
);

let app = null;
let database = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  database = getDatabase(app);
}

export { app, database };
