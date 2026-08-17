/*
  VieWard Bedside Node — ESP32 example sketch
  ---------------------------------------------
  What this does:
    Every few seconds, reads sensor values (replace the placeholder
    readSensors() function with your actual SpO2/HR/temp/RR/flow-rate
    sensor code) and pushes them straight to the same Firebase Realtime
    Database the VieWard web app is already listening to. No custom
    backend server, no extra app to run — the bed card on screen updates
    within about a second of the HTTP request completing.

  Before uploading:
    1. Install the "Firebase ESP32 Client" library by mobizt via
       Arduino IDE -> Tools -> Manage Libraries -> search "Firebase ESP Client".
    2. Fill in WIFI_SSID / WIFI_PASSWORD below.
    3. Fill in FIREBASE_HOST and FIREBASE_AUTH below — same project as
       the VITE_FIREBASE_DATABASE_URL you put in the web app's .env file.
       FIREBASE_HOST is that URL WITHOUT "https://" and WITHOUT a
       trailing slash, e.g. "vieward-icu-default-rtdb.asia-southeast1.firebasedatabase.app"
       FIREBASE_AUTH is a database secret or, better, a service-account
       token — for a quick start you can use a Realtime Database Secret
       from Firebase Console -> Project Settings -> Service Accounts ->
       Database Secrets (legacy, but the simplest path to get a working
       demo; swap for proper Firebase Auth before real deployment).
    4. Set BED_ID to which bed this node is physically mounted on
       (must match a bed id already shown in the app, e.g. "bed01").
    5. Wire up your actual sensors and replace readSensors().

  This one sketch works for both Adult and Neonatal beds — the fields
  you push (hr, spo2, temp, rr) are the shared set. Push incTemp and
  humidity too if this node is on a Neonatal/incubator bed; the app
  simply ignores fields it doesn't need for Adult mode.
*/

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"

// ---------- 1. Wi-Fi ----------
#define WIFI_SSID     "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ---------- 2. Firebase ----------
#define FIREBASE_HOST "YOUR_PROJECT-default-rtdb.REGION.firebasedatabase.app"
#define FIREBASE_AUTH "YOUR_DATABASE_SECRET_OR_TOKEN"

// ---------- 3. Which bed is this node? ----------
#define BED_ID "bed01"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastPush = 0;
const unsigned long PUSH_INTERVAL_MS = 2000; // push every 2 seconds

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connected: " + WiFi.localIP().toString());
}

void connectFirebase() {
  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

// Replace this with real sensor reads (MAX30102 for HR/SpO2, DS18B20 or
// a thermistor for temp, a pressure/flow sensor for the IV line, etc).
// Returning plausible fake numbers for now so the sketch compiles and
// runs standalone for testing the connection end to end.
struct Readings {
  float hr, spo2, temp, rr, ivRate, ivVolumeInfused;
};
Readings readSensors() {
  Readings r;
  r.hr = 70 + random(-5, 6);
  r.spo2 = 97 + random(-1, 2);
  r.temp = 36.8 + (random(-3, 4) / 10.0);
  r.rr = 16 + random(-2, 3);
  r.ivRate = 80 + random(-4, 5);
  r.ivVolumeInfused += 0; // accumulate this yourself from your flow sensor
  return r;
}

void pushReadings() {
  Readings r = readSensors();
  FirebaseJson json;

  // Vitals — this is the object the web app reads as bed.vitals
  json.set("vitals/hr", r.hr);
  json.set("vitals/spo2", r.spo2);
  json.set("vitals/temp", r.temp);
  json.set("vitals/rr", r.rr);
  // If this node is on a Neonatal/incubator bed, also send:
  // json.set("vitals/incTemp", incubatorAirTemp);
  // json.set("vitals/humidity", incubatorHumidity);

  // IV flow — this is bed.iv, read by the infusion panel
  json.set("iv/rate", r.ivRate);
  json.set("iv/volumeInfused", r.ivVolumeInfused);

  // Tells the app this node is alive right now — if this stops updating
  // for more than ~8 seconds, VieWard flags the bed as "Signal Issue"
  // instead of silently showing stale numbers.
  json.set("lastUpdate", (double)(millis())); // replace with real epoch ms if you have NTP synced

  String path = String("beds/") + BED_ID;
  if (Firebase.RTDB.updateNode(&fbdo, path.c_str(), &json)) {
    Serial.println("Pushed reading OK");
  } else {
    Serial.println("Push failed: " + fbdo.errorReason());
  }
}

void setup() {
  Serial.begin(115200);
  connectWifi();
  connectFirebase();
}

void loop() {
  if (millis() - lastPush >= PUSH_INTERVAL_MS) {
    lastPush = millis();
    pushReadings();
  }
}
