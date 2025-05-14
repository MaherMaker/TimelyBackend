import { getDb } from '../config/database';
import bcrypt from 'bcrypt';

export interface User {
  id?: number;
  username: string;
  email: string;
  password: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserWithoutPassword {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

class UserModel {
  async findByUsername(username: string): Promise<User | null> {
    const db = await getDb();
    const user = await db.get<User>('SELECT * FROM users WHERE username = ?', [username]);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = await getDb();
    const user = await db.get<User>('SELECT * FROM users WHERE email = ?', [email]);
    return user || null;
  }

  async findById(id: number): Promise<User | null> {
    const db = await getDb();
    const user = await db.get<User>('SELECT * FROM users WHERE id = ?', [id]);
    return user || null;
  }

  async create(user: User): Promise<number> {
    const db = await getDb();
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    const result = await db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [user.username, user.email, hashedPassword]
    );
    
    return result.lastID || 0;
  }

  async update(id: number, data: Partial<User>): Promise<void> {
    const db = await getDb();
    const updates: string[] = [];
    const values: any[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (updates.length === 0) return;
    
    values.push(new Date().toISOString());
    values.push(id);
    
    await db.run(
      `UPDATE users SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`,
      values
    );
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const db = await getDb();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.run(
      'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
      [hashedPassword, new Date().toISOString(), id]
    );
  }

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM users WHERE id = ?', [id]);
  }

  async findAll(): Promise<UserWithoutPassword[]> {
    const db = await getDb();
    const users = await db.all<User[]>('SELECT * FROM users');
    
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as UserWithoutPassword;
    });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}

export default new UserModel();