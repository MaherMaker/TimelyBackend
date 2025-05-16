import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

try {
  const firebaseConfig: admin.ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace literal \n with actual newline characters
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // Validate that all required fields are present
  if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
    console.error('Firebase credentials not found in environment variables. Please check your .env file.');
    console.error('Required environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    throw new Error('Firebase environment variables not found. See console for details.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });
  console.log('Firebase Admin SDK initialized successfully using environment variables.');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  process.exit(1);
}

export default admin;
