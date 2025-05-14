import { getDb } from './database'; // Removed initDb import

async function migrate() {
  const db = await getDb();

  // Ensure the users table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure the devices table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      device_name TEXT NOT NULL,
      last_sync TIMESTAMP,
      fcm_token TEXT, -- Added FCM token column
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Added updated_at column
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, device_id)
    )
  `);

  // Ensure the alarms table exists with all required columns (using snake_case for DB)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      time TEXT NOT NULL,
      days TEXT NOT NULL, -- Storing as JSON string
      sound TEXT,
      vibration INTEGER DEFAULT 1, -- Using INTEGER 0/1 for BOOLEAN
      snooze_interval INTEGER DEFAULT 5,
      snooze_count INTEGER DEFAULT 3,
      is_active INTEGER DEFAULT 1, -- Using INTEGER 0/1 for BOOLEAN
      no_repeat INTEGER DEFAULT 0, -- Using INTEGER 0/1 for BOOLEAN
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      device_id TEXT,
      sync_status TEXT DEFAULT 'synced',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure the refresh_tokens table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      selector TEXT NOT NULL UNIQUE,
      hashed_verifier TEXT NOT NULL,
      device_id TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Example of adding a column if it doesn't exist (idempotent)
  try {
      await db.run('ALTER TABLE alarms ADD COLUMN no_repeat INTEGER DEFAULT 0');
      console.log('Column no_repeat added or already exists.');
  } catch (error: any) {
      // Ignore error if column already exists (specific error code depends on SQLite version)
      if (!error.message.includes('duplicate column name')) {
          console.error('Error adding column no_repeat:', error);
      }
  }
  // Add similar checks for other columns if needed for robustness

  // Add fcm_token to devices table if it doesn't exist (idempotent)
  try {
    await db.run('ALTER TABLE devices ADD COLUMN fcm_token TEXT');
    console.log('Column fcm_token added to devices or already exists.');
  } catch (error: any) {
    // Ignore error if column already exists
    if (!error.message.includes('duplicate column name')) {
        console.error('Error adding column fcm_token to devices:', error);
    }
  }

  // Add updated_at to devices table if it doesn't exist (idempotent)
  try {
    // Cannot add with non-constant default in ALTER TABLE for SQLite
    await db.run('ALTER TABLE devices ADD COLUMN updated_at TIMESTAMP');
    console.log('Column updated_at added to devices or already exists.');
    // If you need to backfill existing rows, you would do it here with an UPDATE statement.
    // For updated_at, it's typically set on new inserts/updates, so backfilling might not be critical.
  } catch (error: any) {
    // Ignore error if column already exists
    if (!error.message.includes('duplicate column name')) {
        console.error('Error adding column updated_at to devices:', error);
    }
  }

  console.log('Migration completed successfully');
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
});