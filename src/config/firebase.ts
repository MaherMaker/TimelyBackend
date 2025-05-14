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
    let serviceAccountPath = '';
    
    // Check the environment variable first
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    } else {
      // Try multiple potential locations
      const possiblePaths = [
        path.join(__dirname, '../../config/timelymaheredition-firebase-adminsdk-fbsvc-b9bfc7251a.json'),
        path.join(__dirname, './firebase-service-account-key.json'),
        path.join(process.cwd(), 'config/timelymaheredition-firebase-adminsdk-fbsvc-b9bfc7251a.json'),
        path.join(process.cwd(), 'src/config/firebase-service-account-key.json')
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          serviceAccountPath = possiblePath;
          break;
        }
      }
    }
    
    if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
      console.error('Firebase credentials not found. Please check these locations:');
      console.error('1. FIREBASE_SERVICE_ACCOUNT_PATH environment variable in your .env file');
      console.error('2. ./src/config/firebase-service-account-key.json');
      console.error('3. ./config/timelymaheredition-firebase-adminsdk-fbsvc-b9bfc7251a.json');
      console.error('\nTo fix this:');
      console.error('1. Get a service account key from Firebase Console > Project Settings > Service Accounts');
      console.error('2. Save it to ./src/config/firebase-service-account-key.json');
      console.error('3. Update your .env file with the absolute path to this file');
      
      throw new Error('Firebase service account file not found. See console for details.');
    }
    
    console.log(`Using Firebase credentials from service account file: ${serviceAccountPath}`);
    try {
      firebaseConfig = require(serviceAccountPath);
    } catch (err) {
      console.error(`Error loading Firebase config from ${serviceAccountPath}:`, err);
      throw new Error(`Failed to load Firebase service account. The file may be corrupted or have invalid JSON.`);
    }
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
