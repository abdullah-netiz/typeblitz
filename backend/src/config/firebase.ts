import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Firebase Admin SDK for Backend Token Verification
// You must provide the path to your Service Account JSON file in your .env
try {
  if (!admin.apps.length) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      console.log('Firebase Admin initialized with real credentials.');
    } else {
      console.warn('\n--- FIREBASE WARNING ---');
      console.warn('Backend is missing GOOGLE_APPLICATION_CREDENTIALS.');
      console.warn('Real JWT tokens cannot be verified until this is set.');
      console.warn('------------------------\n');
      admin.initializeApp(); // Fallback empty initialization that will fail verifyIdToken
    }
  }
} catch (error) {
  console.error('Firebase integration failed', error);
}

export default admin;
