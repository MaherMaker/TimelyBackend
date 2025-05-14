"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const bcrypt_1 = __importDefault(require("bcrypt"));
class UserModel {
    async findByUsername(username) {
        const db = await (0, database_1.getDb)();
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        return user || null;
    }
    async findByEmail(email) {
        const db = await (0, database_1.getDb)();
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        return user || null;
    }
    async findById(id) {
        const db = await (0, database_1.getDb)();
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        return user || null;
    }
    async create(user) {
        const db = await (0, database_1.getDb)();
        const hashedPassword = await bcrypt_1.default.hash(user.password, 10);
        const result = await db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [user.username, user.email, hashedPassword]);
        return result.lastID || 0;
    }
    async update(id, data) {
        const db = await (0, database_1.getDb)();
        const updates = [];
        const values = [];
        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        });
        if (updates.length === 0)
            return;
        values.push(new Date().toISOString());
        values.push(id);
        await db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, values);
    }
    async updatePassword(id, newPassword) {
        const db = await (0, database_1.getDb)();
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await db.run('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', [hashedPassword, new Date().toISOString(), id]);
    }
    async delete(id) {
        const db = await (0, database_1.getDb)();
        await db.run('DELETE FROM users WHERE id = ?', [id]);
    }
    async findAll() {
        const db = await (0, database_1.getDb)();
        const users = await db.all('SELECT * FROM users');
        return users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }
    async validatePassword(user, password) {
        return bcrypt_1.default.compare(password, user.password);
    }
}
exports.default = new UserModel();
//# sourceMappingURL=User.js.map