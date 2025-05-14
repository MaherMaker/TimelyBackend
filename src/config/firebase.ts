import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

try {
  let firebaseConfig: admin.ServiceAccount;
  
  // Check if we have environment variables for Firebase credentials
  if (process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_PRIVATE_KEY) {
    
    // Use environment variables
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    console.log('Using Firebase credentials from environment variables');
  } else {
    // Fallback to service account file for local development
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
                              path.join(__dirname, '../../config/timelymaheredition-firebase-adminsdk-fbsvc-b9bfc7251a.json');
                              
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Firebase service account file not found at ${serviceAccountPath}. 
                      Please set up environment variables or provide the correct file path.`);
    }
    
    firebaseConfig = require(serviceAccountPath);
    console.log('Using Firebase credentials from service account file');
  }

  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    // databaseURL: process.env.FIREBASE_DATABASE_URL // Optional: If you are using Firebase Realtime Database
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  // Prevent the application from starting if Firebase Admin SDK fails to initialize
  process.exit(1);
}

export default admin;
