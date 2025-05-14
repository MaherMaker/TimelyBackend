"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database"); // Removed initDb import
async function migrate() {
    const db = await (0, database_1.getDb)();
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    // Example of adding a column if it doesn't exist (idempotent)
    try {
        await db.run('ALTER TABLE alarms ADD COLUMN no_repeat INTEGER DEFAULT 0');
        console.log('Column no_repeat added or already exists.');
    }
    catch (error) {
        // Ignore error if column already exists (specific error code depends on SQLite version)
        if (!error.message.includes('duplicate column name')) {
            console.error('Error adding column no_repeat:', error);
        }
    }
    // Add similar checks for other columns if needed for robustness
    console.log('Migration completed successfully');
}
migrate().catch((error) => {
    console.error('Migration failed:', error);
});
//# sourceMappingURL=migrate.js.map