const mysql = require('mysql2/promise');

async function migrate() {
    const localConfig = {
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'jntu_exam_management'
    };

    const remoteConfig = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'jntu_exam_management',
        port: process.env.DB_PORT || 4000,
        ssl: { rejectUnauthorized: false }
    };

    const tables = ['staff', 'students', 'rooms', 'exam_logs', 'allocations', 'feedback'];

    let localConn, remoteConn;

    try {
        console.log('Connecting to Local MySQL...');
        localConn = await mysql.createConnection(localConfig);

        console.log('Connecting to Remote TiDB Cloud...');
        remoteConn = await mysql.createConnection(remoteConfig);

        for (const table of tables) {
            console.log(`Migrating table: ${table}...`);
            
            // Get data from local
            const [rows] = await localConn.query(`SELECT * FROM ${table}`);
            if (rows.length === 0) {
                console.log(`No data in local table ${table}. Skipping.`);
                continue;
            }

            console.log(`Found ${rows.length} rows in local. Copying to remote...`);

            // Get column names
            const columns = Object.keys(rows[0]).join(', ');
            const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');

            for (const row of rows) {
                const values = Object.values(row).map(v => {
                    // Handle JSON fields (rooms_json, faculties_json in allocations)
                    if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
                        return JSON.stringify(v);
                    }
                    return v;
                });

                try {
                    await remoteConn.query(
                        `INSERT IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`,
                        values
                    );
                } catch (err) {
                    console.error(`Error inserting row into ${table}:`, err.message);
                }
            }
            console.log(`Finished migrating ${table}.`);
        }

        console.log('\n✅ Data migration completed successfully!');
        
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
    } finally {
        if (localConn) await localConn.end();
        if (remoteConn) await remoteConn.end();
        process.exit(0);
    }
}

migrate();
