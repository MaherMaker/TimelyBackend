import { getDb } from '../config/database';
import logger from '../utils/logger';

export interface RefreshToken {
  id?: number;
  user_id: number;
  selector: string;
  hashed_verifier: string;
  device_id?: string | null;
  expires_at: string; // ISO 8601 date string
  created_at?: string; // ISO 8601 date string
  revoked_at?: string | null; // ISO 8601 date string
}

class RefreshTokenModel {
  async create(token: Omit<RefreshToken, 'id' | 'created_at' | 'revoked_at'>): Promise<number> {
    const db = await getDb();
    const createdAt = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO refresh_tokens (user_id, selector, hashed_verifier, device_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [token.user_id, token.selector, token.hashed_verifier, token.device_id, token.expires_at, createdAt]
    );
    if (result.lastID === undefined) {
        throw new Error('Failed to create refresh token, lastID is undefined');
    }
    return result.lastID;
  }

  async findBySelector(selector: string): Promise<RefreshToken | null> {
    const db = await getDb();
    const token = await db.get<RefreshToken>('SELECT * FROM refresh_tokens WHERE selector = ?', [selector]);
    return token || null;
  }

  async findByUserIdAndDeviceId(userId: number, deviceId: string): Promise<RefreshToken | null> {
    const db = await getDb();
    const token = await db.get<RefreshToken>(
      'SELECT * FROM refresh_tokens WHERE user_id = ? AND device_id = ? AND revoked_at IS NULL ORDER BY created_at DESC',
      [userId, deviceId]
    );
    return token || null;
  }

  async revoke(id: number): Promise<void> {
    const db = await getDb();
    const revokedAt = new Date().toISOString();
    await db.run('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?', [revokedAt, id]);
  }

  async revokeAllByUserId(userId: number, exceptSelector?: string): Promise<void> {
    const db = await getDb();
    const revokedAt = new Date().toISOString();
    let query = 'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL';
    const params: any[] = [revokedAt, userId];
    if (exceptSelector) {
      query += ' AND selector != ?';
      params.push(exceptSelector);
    }
    await db.run(query, params);
  }
  
  async revokeAllByUserIdAndDeviceId(userId: number, deviceId: string, exceptSelector?: string): Promise<void> {
    const db = await getDb();
    const revokedAt = new Date().toISOString();
    let query = 'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND device_id = ? AND revoked_at IS NULL';
    const params: any[] = [revokedAt, userId, deviceId];

    if (exceptSelector) {
        query += ' AND selector != ?';
        params.push(exceptSelector);
    }
    await db.run(query, params);
    logger.info(`Revoked refresh tokens for user ${userId} on device ${deviceId}` + (exceptSelector ? ` except ${exceptSelector}`: ''));
  }

  async deleteExpiredTokens(): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    // Delete tokens that are expired or revoked for more than a certain period (e.g., 30 days after revocation)
    // For simplicity, here we just delete expired ones.
    const result = await db.run('DELETE FROM refresh_tokens WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < date(?, \'-30 days\'))', [now, now]);
    logger.info(`Deleted ${result.changes} expired/old revoked refresh tokens.`);
  }
}

export default new RefreshTokenModel();
