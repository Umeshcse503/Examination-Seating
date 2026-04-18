require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    let db;
    try {
        const config = {
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'jntu_exam_management',
            port: process.env.DB_PORT || 3306,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null
        };

        console.log(`Connecting to database at ${config.host}...`);
        db = await mysql.createConnection(config);

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

        // 7. Add phone_number column to students table if missing
        console.log('Checking for students table phone_number column...');
        const [studentColumns] = await db.query("SHOW COLUMNS FROM students");
        const studentColumnNames = studentColumns.map(c => c.Field);
        if (!studentColumnNames.includes('phone_number')) {
            console.log('Adding column: phone_number to students table');
            await db.query("ALTER TABLE students ADD COLUMN phone_number VARCHAR(20) AFTER email");
        }

        // 8. Migrate Feedback Table to use staff_username instead of roll_number
        console.log('Migrating feedback table for staff...');
        const [feedbackColumns] = await db.query("SHOW COLUMNS FROM feedback");
        const feedbackColumnNames = feedbackColumns.map(c => c.Field);

        if (feedbackColumnNames.includes('roll_number')) {
            console.log('Renaming feedback columns...');
            
            // Drop existing foreign keys on roll_number
            try {
                const [fks] = await db.query(`
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_NAME = 'feedback' 
                    AND COLUMN_NAME = 'roll_number' 
                    AND CONSTRAINT_NAME != 'PRIMARY' AND REFERENCED_TABLE_NAME IS NOT NULL
                `);
                for (let fk of fks) {
                    await db.query(`ALTER TABLE feedback DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                }
            } catch (err) {
                console.warn('Warning when checking foreign keys:', err.message);
            }
            
            // Delete old student feedback data to avoid violating the new staff foreign key
            await db.query("DELETE FROM feedback");
            
            await db.query("ALTER TABLE feedback CHANGE student_name staff_name VARCHAR(255) NOT NULL");
            await db.query("ALTER TABLE feedback CHANGE roll_number staff_username VARCHAR(255) NOT NULL");
            
            console.log('Adding foreign key constraint for staff_username...');
            await db.query(`
                ALTER TABLE feedback 
                ADD CONSTRAINT fk_feedback_staff 
                FOREIGN KEY (staff_username) REFERENCES staff(username) ON DELETE CASCADE
            `);
            console.log('Successfully migrated feedback table.');
        }

        // 9. Seating Allocations: Add approved_by column
        console.log('Checking for allocations table approved_by column...');
        const [allocColumns] = await db.query("SHOW COLUMNS FROM allocations");
        const allocColumnNames = allocColumns.map(c => c.Field);
        if (!allocColumnNames.includes('approved_by')) {
            console.log('Adding column: approved_by to allocations table');
            await db.query("ALTER TABLE allocations ADD COLUMN approved_by INT AFTER created_by");
            await db.query(`
                ALTER TABLE allocations 
                ADD CONSTRAINT fk_approved_by 
                FOREIGN KEY (approved_by) REFERENCES staff(staff_id) ON DELETE SET NULL
            `);
        }

        // 10. Drop exam_logs table
        console.log('Dropping exam_logs table...');
        await db.query("DROP TABLE IF EXISTS exam_logs");

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        if (db) await db.end();
        process.exit();
    }
}

migrate();
