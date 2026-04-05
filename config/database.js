const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jntu_exam_management',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Use promise-based wrapper for convenience
const promiseDb = db.promise();

// Check connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('Database "exam_management" not found. Please run mysql_setup.sql in phpMyAdmin.');
        }
    } else {
        console.log('Connected to MySQL database via XAMPP.');
        connection.release();
    }
});

module.exports = promiseDb;
