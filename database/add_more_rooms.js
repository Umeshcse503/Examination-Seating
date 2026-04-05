const mysql = require('mysql2/promise');

async function addRooms() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'jntu_exam_management'
        });

        console.log('Connected to MySQL database.');

        const rooms = [];
        for (let i = 1; i <= 20; i++) {
            const hallNum = 500 + i;
            rooms.push([`Room ${hallNum}`, 'Engineering Block', 6, 10, 60]);
        }

        const sql = "INSERT IGNORE INTO rooms (room_name, building, total_rows, total_columns, capacity) VALUES ?";
        const [result] = await db.query(sql, [rooms]);

        console.log(`Successfully added ${result.affectedRows} more rooms.`);
        await db.end();
        process.exit(0);
    } catch (err) {
        console.error('Error adding rooms:', err.message);
        process.exit(1);
    }
}

addRooms();
