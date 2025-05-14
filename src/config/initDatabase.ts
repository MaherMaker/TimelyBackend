import { initDb } from './database';

async function initializeDatabase() {
  try {
    await initDb();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

initializeDatabase();