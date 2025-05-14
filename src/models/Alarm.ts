import { getDb } from '../config/database';

// Interface uses camelCase for application consistency
export interface Alarm {
  id?: number;
  userId: number; // Mapped from user_id
  title: string;
  time: string;
  days: string;
  sound?: string;
  vibration?: boolean;
  snoozeInterval?: number; // Mapped from snooze_interval
  snoozeCount?: number; // Mapped from snooze_count
  isActive?: boolean; // Mapped from is_active
  noRepeat?: boolean; // Mapped from no_repeat
  createdAt?: string; // Mapped from created_at
  updatedAt?: string; // Mapped from updated_at
  deviceId?: string; // Mapped from device_id
  syncStatus?: 'synced' | 'pending' | 'conflict'; // Mapped from sync_status
}

// Helper to map database row (snake_case) to Alarm interface (camelCase)
function mapRowToAlarm(row: any): Alarm | null {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    time: row.time,
    days: row.days,
    sound: row.sound,
    vibration: row.vibration === 1, // Assuming DB stores boolean as 0/1
    snoozeInterval: row.snooze_interval,
    snoozeCount: row.snooze_count,
    isActive: row.is_active === 1, // Assuming DB stores boolean as 0/1
    noRepeat: row.no_repeat === 1, // Assuming DB stores boolean as 0/1
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deviceId: row.device_id,
    syncStatus: row.sync_status,
  };
}

// Helper to map Alarm interface (camelCase) to database values (snake_case)
function mapAlarmToDbValues(alarm: Partial<Alarm>): any {
  const dbValues: any = {};
  if (alarm.userId !== undefined) dbValues.user_id = alarm.userId;
  if (alarm.title !== undefined) dbValues.title = alarm.title;
  if (alarm.time !== undefined) dbValues.time = alarm.time;
  if (alarm.days !== undefined) dbValues.days = alarm.days;
  if (alarm.sound !== undefined) dbValues.sound = alarm.sound;
  // Store boolean as 0/1 in DB
  if (alarm.vibration !== undefined) dbValues.vibration = alarm.vibration ? 1 : 0;
  if (alarm.snoozeInterval !== undefined) dbValues.snooze_interval = alarm.snoozeInterval;
  if (alarm.snoozeCount !== undefined) dbValues.snooze_count = alarm.snoozeCount;
  // Store boolean as 0/1 in DB
  if (alarm.isActive !== undefined) dbValues.is_active = alarm.isActive ? 1 : 0;
  // Store boolean as 0/1 in DB
  if (alarm.noRepeat !== undefined) dbValues.no_repeat = alarm.noRepeat ? 1 : 0;
  if (alarm.deviceId !== undefined) dbValues.device_id = alarm.deviceId;
  if (alarm.syncStatus !== undefined) dbValues.sync_status = alarm.syncStatus;
  if (alarm.createdAt !== undefined) dbValues.created_at = alarm.createdAt;
  if (alarm.updatedAt !== undefined) dbValues.updated_at = alarm.updatedAt;
  return dbValues;
}

class AlarmModel {
  async findById(id: number, userId: number): Promise<Alarm | null> {
    const db = await getDb();
    const row = await db.get(
      'SELECT * FROM alarms WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return mapRowToAlarm(row);
  }

  async findAllByUserId(userId: number): Promise<Alarm[]> {
    const db = await getDb();
    const rows = await db.all(
      'SELECT * FROM alarms WHERE user_id = ? ORDER BY time ASC',
      [userId]
    );
    return rows.map(row => mapRowToAlarm(row)).filter(alarm => alarm !== null) as Alarm[];
  }

  async findAllPendingSync(userId: number): Promise<Alarm[]> {
    const db = await getDb();
    const rows = await db.all(
      'SELECT * FROM alarms WHERE user_id = ? AND sync_status = ?',
      [userId, 'pending']
    );
    return rows.map(row => mapRowToAlarm(row)).filter(alarm => alarm !== null) as Alarm[];
  }

  async create(alarm: Alarm): Promise<number> {
    const db = await getDb();

    const dbValues = mapAlarmToDbValues(alarm);

    const result = await db.run(
      `INSERT INTO alarms (
        user_id, title, time, days, sound, vibration, snooze_interval, snooze_count, is_active, no_repeat, device_id, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbValues.user_id,
        dbValues.title,
        dbValues.time,
        dbValues.days,
        dbValues.sound || null,
        dbValues.vibration !== undefined ? dbValues.vibration : 1, // Default true (1)
        dbValues.snooze_interval || 5,
        dbValues.snooze_count || 3,
        dbValues.is_active !== undefined ? dbValues.is_active : 1, // Default true (1)
        dbValues.no_repeat !== undefined ? dbValues.no_repeat : 0, // Default false (0)
        dbValues.device_id || null,
        dbValues.sync_status || 'pending',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    return result.lastID || 0;
  }

  async update(id: number, userId: number, data: Partial<Alarm>): Promise<void> {
    const db = await getDb();
    const updates: string[] = [];
    const values: any[] = [];

    const dbData = mapAlarmToDbValues(data);

    Object.entries(dbData).forEach(([key, value]) => {
      if (
        key !== 'id' &&
        key !== 'user_id' &&
        key !== 'created_at' &&
        key !== 'updated_at'
      ) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) return;

    values.push(new Date().toISOString());
    values.push(id);
    values.push(userId);

    await db.run(
      `UPDATE alarms SET ${updates.join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`,
      values
    );
  }

  async updateSyncStatus(id: number, userId: number, status: 'synced' | 'pending' | 'conflict'): Promise<void> {
    const db = await getDb();
    await db.run(
      'UPDATE alarms SET sync_status = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [status, new Date().toISOString(), id, userId]
    );
  }

  async delete(id: number, userId: number): Promise<void> {
    const db = await getDb();
    await db.run(
      'DELETE FROM alarms WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  async toggleActive(id: number, userId: number, isActive: boolean): Promise<void> {
    const query = `
      UPDATE alarms
      SET is_active = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `;
    const db = await getDb();
    await db.run(query, [isActive ? 1 : 0, new Date().toISOString(), id, userId]);
  }

  async getAlarmsForSync(userId: number, lastSyncTimestamp: string): Promise<Alarm[]> {
    const db = await getDb();
    const rows = await db.all(
      'SELECT * FROM alarms WHERE user_id = ? AND updated_at > ?',
      [userId, lastSyncTimestamp]
    );
    return rows.map(row => mapRowToAlarm(row)).filter(alarm => alarm !== null) as Alarm[];
  }
}

export default new AlarmModel();