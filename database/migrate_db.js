const mysql = require('mysql2/promise');

async function migrate() {
    let db;
    try {
        db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'jntu_exam_management'
        });

        console.log('Connected to MySQL database.');

        // 1. Handle exam_halls -> rooms transition
        const [examHallsExist] = await db.query("SHOW TABLES LIKE 'exam_halls'");
        const [roomsExist] = await db.query("SHOW TABLES LIKE 'rooms'");

        if (examHallsExist.length > 0 && roomsExist.length === 0) {
            console.log('Renaming exam_halls to rooms...');
            await db.query("RENAME TABLE exam_halls TO rooms");
            await db.query("ALTER TABLE rooms CHANGE hall_id room_id INT AUTO_INCREMENT");
            await db.query("ALTER TABLE rooms CHANGE hall_name room_name VARCHAR(100) NOT NULL");
        } else if (examHallsExist.length > 0 && roomsExist.length > 0) {
            console.log('Both exam_halls and rooms exist. Dropping obsolete exam_halls...');
            await db.query("DROP TABLE exam_halls");
        }

        // 2. Ensure rooms table is created if it doesn't exist yet
        await db.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                room_id INT AUTO_INCREMENT PRIMARY KEY,
                room_name VARCHAR(100) NOT NULL,
                building VARCHAR(100),
                capacity INT NOT NULL DEFAULT 60,
                total_rows INT NOT NULL DEFAULT 10,
                total_columns INT NOT NULL DEFAULT 6,
                status ENUM('active', 'maintenance') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Add missing columns to existing rooms table
        const [columns] = await db.query("SHOW COLUMNS FROM rooms");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('building')) {
            console.log('Adding column: building');
            await db.query("ALTER TABLE rooms ADD COLUMN building VARCHAR(100) AFTER room_name");
        }
        if (!columnNames.includes('total_rows')) {
            console.log('Adding column: total_rows');
            await db.query("ALTER TABLE rooms ADD COLUMN total_rows INT NOT NULL DEFAULT 10 AFTER building");
        }
        if (!columnNames.includes('total_columns')) {
            console.log('Adding column: total_columns');
            await db.query("ALTER TABLE rooms ADD COLUMN total_columns INT NOT NULL DEFAULT 6 AFTER total_rows");
        }

        // 4. Drop obsolete tables
        console.log('Dropping obsolete exams table if it exists...');
        await db.query("DROP TABLE IF EXISTS exams");

        // 5. Cleanup duplicate rooms
        console.log('Cleaning up duplicate room entries...');
        // Delete rooms with the same name, keeping the one with the lowest ID
        await db.query(`
            DELETE r1 FROM rooms r1
            INNER JOIN rooms r2 
            WHERE r1.room_id > r2.room_id AND r1.room_name = r2.room_name
        `);

        // 6. Update Staff Emails
        console.log('Updating staff emails...');
        await db.query("UPDATE staff SET email = CONCAT(username, '@gmail.com') WHERE email LIKE '%@jntu.edu' OR email = ''");

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        if (db) await db.end();
        process.exit();
    }
}

migrate();
