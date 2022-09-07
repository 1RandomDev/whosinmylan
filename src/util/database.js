const SqliteDatabase = require('better-sqlite3');

class Database {
    constructor(dbPath) {
        this.db = new SqliteDatabase(dbPath);
        this.db.exec('CREATE TABLE IF NOT EXISTS devices ('
            + 'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,'
            + 'name VARCHAR,'
            + 'known INTEGER,'
            + 'ip VARCHAR,'
            + 'mac VARCHAR,'
            + 'hw VARCHAR,'
            + 'last_seen INTEGER)');
    }

    close() {
        this.db.close();
    }

    saveDevice(device) {
        let stmt = this.db.prepare('INSERT INTO devices (name, known, ip, mac, hw, last_seen) VALUES (@name, @known, @ip, @mac, @hw, @last_seen)');
        stmt.run(device);
        stmt = this.db.prepare('SELECT last_insert_rowid() AS id');
        device.id = stmt.get().id;
        return device;
    }

    getDevice(id) {
        const stmt = this.db.prepare('SELECT * FROM devices WHERE id = ?');
        const device = stmt.get(id);
        return device;
    }

    getAllDevices() {
        const stmt = this.db.prepare('SELECT * FROM devices ORDER BY id DESC');
        return stmt.all();
    }

    updateDevice(device) {
        const stmt = this.db.prepare('UPDATE devices SET name = @name, known = @known, ip = @ip, mac = @mac, hw = @hw, last_seen = @last_seen WHERE id = @id');
        stmt.run(device);
    }

    deleteDevice(id) {
        const stmt = this.db.prepare('DELETE FROM devices WHERE id = ?');
        stmt.run(id);
    }
}

module.exports = Database;
