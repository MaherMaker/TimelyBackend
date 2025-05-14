"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
// Helper to map database row (snake_case) to Alarm interface (camelCase)
function mapRowToAlarm(row) {
    if (!row)
        return null;
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
function mapAlarmToDbValues(alarm) {
    const dbValues = {};
    if (alarm.userId !== undefined)
        dbValues.user_id = alarm.userId;
    if (alarm.title !== undefined)
        dbValues.title = alarm.title;
    if (alarm.time !== undefined)
        dbValues.time = alarm.time;
    if (alarm.days !== undefined)
        dbValues.days = alarm.days;
    if (alarm.sound !== undefined)
        dbValues.sound = alarm.sound;
    // Store boolean as 0/1 in DB
    if (alarm.vibration !== undefined)
        dbValues.vibration = alarm.vibration ? 1 : 0;
    if (alarm.snoozeInterval !== undefined)
        dbValues.snooze_interval = alarm.snoozeInterval;
    if (alarm.snoozeCount !== undefined)
        dbValues.snooze_count = alarm.snoozeCount;
    // Store boolean as 0/1 in DB
    if (alarm.isActive !== undefined)
        dbValues.is_active = alarm.isActive ? 1 : 0;
    // Store boolean as 0/1 in DB
    if (alarm.noRepeat !== undefined)
        dbValues.no_repeat = alarm.noRepeat ? 1 : 0;
    if (alarm.deviceId !== undefined)
        dbValues.device_id = alarm.deviceId;
    if (alarm.syncStatus !== undefined)
        dbValues.sync_status = alarm.syncStatus;
    if (alarm.createdAt !== undefined)
        dbValues.created_at = alarm.createdAt;
    if (alarm.updatedAt !== undefined)
        dbValues.updated_at = alarm.updatedAt;
    return dbValues;
}
class AlarmModel {
    async findById(id, userId) {
        const db = await (0, database_1.getDb)();
        const row = await db.get('SELECT * FROM alarms WHERE id = ? AND user_id = ?', [id, userId]);
        return mapRowToAlarm(row);
    }
    async findAllByUserId(userId) {
        const db = await (0, database_1.getDb)();
        const rows = await db.all('SELECT * FROM alarms WHERE user_id = ? ORDER BY time ASC', [userId]);
        return rows.map(row => mapRowToAlarm(row)).filter(alarm => alarm !== null);
    }
    async findAllPendingSync(userId) {
        const db = await (0, database_1.getDb)();
        const rows = await db.all('SELECT * FROM alarms WHERE user_id = ? AND sync_status = ?', [userId, 'pending']);
        return rows.map(row => mapRowToAlarm(row)).filter(alarm => alarm !== null);
    }
    async create(alarm) {
        const db = await (0, database_1.getDb)();
        const dbValues = mapAlarmToDbValues(alarm);
        const result = await db.run(`INSERT INTO alarms (
        user_id, title, time, days, sound, vibration, snooze_interval, snooze_count, is_active, no_repeat, device_id, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
        ]);
        return result.lastID || 0;
    }
    async update(id, userId, data) {
        const db = await (0, database_1.getDb)();
        const updates = [];
        const values = [];
        const dbData = mapAlarmToDbValues(data);
        Object.entries(dbData).forEach(([key, value]) => {
            if (key !== 'id' &&
                key !== 'user_id' &&
                key !== 'created_at' &&
                key !== 'updated_at') {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        });
        if (updates.length === 0)
            return;
        values.push(new Date().toISOString());
        values.push(id);
        values.push(userId);
        await db.run(`UPDATE alarms SET ${updates.join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`, values);
    }
    async updateSyncStatus(id, userId, status) {
        const db = await (0, database_1.getDb)();
        await db.run('UPDATE alarms SET sync_status = ?, updated_at = ? WHERE id = ? AND user_id = ?', [status, new Date().toISOString(), id, userId]);
    }
    async delete(id, userId) {
        const db = await (0, database_1.getDb)();
        await db.run('DELETE FROM alarms WHERE id = ? AND user_id = ?', [id, userId]);
    }
    async toggleActive(id, userId, isActive) {
        const query = `
      UPDATE alarms
      SET is_active = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `;
        const db = await (0, database_1.getDb)();
        await db.run(query, [isActive ? 1 : 0, new Date().toISOString(), id, userId]);
    }
    async getAlarmsForSync(userId, lastSyncTimestamp) {
        const db = await (0, database_1.getDb)();
        const rows = await db.all('SELECT * FROM alarms WHERE user_id = ? AND updated_at > ?', [userId, lastSyncTimestamp]);
        return rows.map(row => mapRowToAlarm(row)).filter(alarm => alarm !== null);
    }
}
exports.default = new AlarmModel();
//# sourceMappingURL=Alarm.js.map