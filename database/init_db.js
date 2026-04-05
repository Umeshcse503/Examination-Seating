const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDB() {
    const connectionConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
    };

    const dbName = process.env.DB_NAME || 'jntu_exam_management';
    const sqlFile = path.join(__dirname, 'mysql_setup.sql');

    try {
        console.log(`Connecting to MySQL at ${connectionConfig.host}...`);
        const connection = await mysql.createConnection(connectionConfig);

        console.log(`Creating database "${dbName}" if it doesn't exist...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName};`);
        await connection.query(`USE ${dbName};`);

        console.log(`Reading SQL setup file: ${sqlFile}`);
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Split by semicolon, but handle cases where semicolon might be in strings
        // This is a simple split, works for most basic SQL files
        const statements = sql
            .split(/;\s*$/m)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Executing ${statements.length} SQL statements...`);
        for (const statement of statements) {
            try {
                await connection.query(statement);
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY' || err.code === 'ER_TABLE_EXISTS_ERROR') {
                    // Ignore duplicate entries or tables that already exist
                    continue;
                }
                console.error(`Error executing statement: ${statement.substring(0, 50)}...`);
                console.error(err.message);
            }
        }

        console.log('Database initialization completed successfully!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Initialization failed:');
        console.error(err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('\n[ERROR] MySQL service is not running. Please start MySQL in XAMPP Control Panel.');
        }
        process.exit(1);
    }
}

initDB();
