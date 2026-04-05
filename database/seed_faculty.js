const mysql = require('mysql2/promise');

async function seedFaculty() {
    const connectionConfig = {
        host: '127.0.0.1',
        user: 'root',
        password: '', // Default XAMPP password
        database: 'jntu_exam_management'
    };

    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'];
    const facultyCount = 20;

    try {
        console.log(`Connecting to database "${connectionConfig.database}"...`);
        const connection = await mysql.createConnection(connectionConfig);

        console.log(`Seeding ${facultyCount} faculty members...`);
        
        for (let i = 1; i <= facultyCount; i++) {
            const username = `faculty${i}`;
            const name = `Faculty ${i}`;
            const email = `faculty${i}@jntu.edu`;
            const password = `faculty123`;
            const role = 'staff';
            const status = 'approved';
            const department = departments[(i - 1) % departments.length];

            await connection.query(
                "INSERT INTO staff (username, name, email, password, role, status, department) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), department=VALUES(department)",
                [username, name, email, password, role, status, department]
            );
        }

        console.log('Faculty seeding completed successfully!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:');
        console.error(err.message);
        process.exit(1);
    }
}

seedFaculty();
