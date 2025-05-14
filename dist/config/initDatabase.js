"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
async function initializeDatabase() {
    try {
        await (0, database_1.initDb)();
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Database initialization failed:', error);
    }
}
initializeDatabase();
//# sourceMappingURL=initDatabase.js.map