const mysql = require('mysql2/promise');

async function syncRooms() {
    try {
        const db = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'jntu_exam_management'
        });

        console.log('Connected to MySQL database.');

        const availableRooms = [
            { roomName: 'Room 101', capacity: 60, rows: 10, cols: 6 },
            { roomName: 'Room 102', capacity: 42, rows: 7, cols: 6 },
            { roomName: 'Room 103', capacity: 40, rows: 8, cols: 5 },
            { roomName: 'Drawing Hall 201', capacity: 100, rows: 10, cols: 10 },
            { roomName: 'Seminar Hall 202', capacity: 120, rows: 12, cols: 10 },
            { roomName: 'Room 301', capacity: 60, rows: 10, cols: 6 },
            { roomName: 'Lab 1', capacity: 30, rows: 5, cols: 6 },
            { roomName: 'Lab 2', capacity: 30, rows: 6, cols: 5 },
            { roomName: 'Room 104', capacity: 60, rows: 10, cols: 6 },
            { roomName: 'Room 105', capacity: 60, rows: 10, cols: 6 },
            { roomName: 'Room 203', capacity: 40, rows: 8, cols: 5 },
            { roomName: 'Room 204', capacity: 40, rows: 8, cols: 5 },
            { roomName: 'Room 205', capacity: 50, rows: 10, cols: 5 },
            { roomName: 'Room 302', capacity: 60, rows: 10, cols: 6 },
            { roomName: 'Room 303', capacity: 60, rows: 10, cols: 6 },
            { roomName: 'Room 304', capacity: 48, rows: 8, cols: 6 },
            { roomName: 'Room 401', capacity: 70, rows: 10, cols: 7 },
            { roomName: 'Room 402', capacity: 70, rows: 10, cols: 7 },
            { roomName: 'Lab 3 (CS)', capacity: 30, rows: 5, cols: 6 },
            { roomName: 'Lab 4 (CS)', capacity: 30, rows: 5, cols: 6 },
            { roomName: 'Lab 5 (ECE)', capacity: 36, rows: 6, cols: 6 },
            { roomName: 'Lab 6 (ECE)', capacity: 36, rows: 6, cols: 6 },
            { roomName: 'Lab 7 (MECH)', capacity: 40, rows: 8, cols: 5 },
            { roomName: 'Auditorium A', capacity: 200, rows: 20, cols: 10 },
            { roomName: 'Auditorium B', capacity: 200, rows: 20, cols: 10 },
            { roomName: 'Exam Hall 1', capacity: 150, rows: 15, cols: 10 },
            { roomName: 'Exam Hall 2', capacity: 150, rows: 15, cols: 10 },
            { roomName: 'Exam Hall 3', capacity: 150, rows: 15, cols: 10 }
        ];

        // Building the SQL query
        const values = availableRooms.map(r => [r.roomName, 'Main Block', r.rows, r.cols, r.capacity]);

        for (const room of availableRooms) {
            const [existing] = await db.query("SELECT room_id FROM rooms WHERE room_name = ?", [room.roomName]);
            if (existing.length > 0) {
                await db.query(
                    "UPDATE rooms SET total_rows = ?, total_columns = ?, capacity = ? WHERE room_name = ?",
                    [room.rows, room.cols, room.capacity, room.roomName]
                );
            } else {
                await db.query(
                    "INSERT INTO rooms (room_name, building, total_rows, total_columns, capacity) VALUES (?, ?, ?, ?, ?)",
                    [room.roomName, 'Main Block', room.rows, room.cols, room.capacity]
                );
            }
        }

        console.log('Successfully synced ' + availableRooms.length + ' rooms.');
        await db.end();
        process.exit(0);
    } catch (err) {
        console.error('Error syncing rooms:', err.message);
        process.exit(1);
    }
}

syncRooms();
