import * as sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const dbDir = path.dirname(dbPath);

// Ensure the database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

async function getDbConnection() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  return db;
}

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await getDbConnection();
  }
  return dbInstance;
}

// Removed CREATE TABLE statements. Schema management should be handled by migration scripts.
export async function initDb(): Promise<void> {
  const db = await getDb();
  // Ensure foreign keys are enabled on connection
  await db.run('PRAGMA foreign_keys = ON');
  console.log('Database connection established and foreign keys enabled.');
}