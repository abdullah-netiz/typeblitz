import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Firebase Admin SDK for Backend Token Verification
// Supports two modes:
//   1. FIREBASE_SERVICE_ACCOUNT env var (JSON string) — for cloud deployments
//   2. GOOGLE_APPLICATION_CREDENTIALS env var (file path) — for local development
try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT.');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      console.log('Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS.');
    } else {
      console.warn('\n--- FIREBASE WARNING ---');
      console.warn('Backend is missing Firebase credentials.');
      console.warn('Set FIREBASE_SERVICE_ACCOUNT (JSON) or GOOGLE_APPLICATION_CREDENTIALS (file path).');
      console.warn('------------------------\n');
      admin.initializeApp();
    }
  }
} catch (error) {
  console.error('Firebase integration failed', error);
}

export default admin;
