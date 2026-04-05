const mysql = require('mysql2/promise');

async function seed() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'jntu_exam_management'
    });

    console.log('Connected to database for seeding...');

    const rooms = [
        { roomName: "Room 101", students: ["25XW5A0501", "25XW5A0502"] },
        { roomName: "Room 102", students: ["25XW5A0503", "25XW5A0504"] }
    ];

    const faculties = [
        { name: "Dr. Ramesh Kumar", rooms: ["Room 101"] },
        { name: "Prof. S. Lakshmi", rooms: ["Room 102"] }
    ];

    // 1. Approved Allocation
    await conn.execute(
        "INSERT INTO allocations (exam_date, exam_time, exam_type, batch, rooms_json, faculties_json, created_by, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            '2026-04-10', '10:00 AM', 'Mid 1 Examination', 'CSE | 2nd Year',
            JSON.stringify(rooms), JSON.stringify(faculties), 1, 'approved', 'Verified and Approved by Principal'
        ]
    );

    // 2. Pending Allocation
    await conn.execute(
        "INSERT INTO allocations (exam_date, exam_time, exam_type, batch, rooms_json, faculties_json, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            '2026-05-15', '02:00 PM', 'End Semester Examination', 'ECE | 3rd Year',
            JSON.stringify(rooms), JSON.stringify(faculties), 1, 'pending'
        ]
    );

    console.log('Successfully seeded 1 approved and 1 pending allocation.');
    await conn.end();
}

seed().catch(console.error);
