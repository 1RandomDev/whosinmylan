const SqliteDatabase = require('better-sqlite3');

class Database {
    constructor(dbPath) {
        this.db = new SqliteDatabase(dbPath);
        this.db.exec('CREATE TABLE IF NOT EXISTS devices ('
            + 'id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,'
            + 'if VARCHAR'
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
        let stmt = this.db.prepare('INSERT INTO devices (if, name, known, ip, mac, hw, last_seen) VALUES (@if, @name, @known, @ip, @mac, @hw, @last_seen)');
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

    getDevicesByInterface(intf) {
        const stmt = this.db.prepare('SELECT * FROM devices WHERE if = ? ORDER BY id DESC');
        return stmt.all(intf);
    }

    getAllDevices() {
        const stmt = this.db.prepare('SELECT * FROM devices ORDER BY id DESC');
        return stmt.all();
    }

    updateDevice(device) {
        const stmt = this.db.prepare('UPDATE devices SET if = @if, name = @name, known = @known, ip = @ip, mac = @mac, hw = @hw, last_seen = @last_seen WHERE id = @id');
        stmt.run(device);
    }

    deleteDevice(id) {
        const stmt = this.db.prepare('DELETE FROM devices WHERE id = ?');
        stmt.run(id);
    }

    createNewColumns(defaultValues) {
        const columns = this.db.pragma('table_info(devices)');
        if(!columns.find(column => column.name == 'if')) {
            this.db.exec('ALTER TABLE devices ADD if VARCHAR');

            const stmt = this.db.prepare('UPDATE devices SET if = @firstInterface WHERE if IS NULL');
            stmt.run(defaultValues);
        }
    }
}

module.exports = Database;
