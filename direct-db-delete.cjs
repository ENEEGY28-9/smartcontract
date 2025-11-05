const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pocketbase', 'pb_data', 'data.db');

console.log('🔗 Connecting to database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

// Count rooms before deletion
db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
    if (err) {
        console.error('❌ Error counting rooms:', err.message);
        return;
    }

    console.log(`📊 Found ${row.count} rooms to delete`);

    if (row.count === 0) {
        console.log('✅ No rooms to delete');
        db.close();
        return;
    }

    // Delete all rooms
    db.run("DELETE FROM rooms", function(err) {
        if (err) {
            console.error('❌ Error deleting rooms:', err.message);
            db.close();
            return;
        }

        console.log(`🗑️ Deleted ${this.changes} rooms`);

        // Vacuum to reclaim space
        db.run("VACUUM", (err) => {
            if (err) {
                console.error('❌ Error vacuuming:', err.message);
            } else {
                console.log('🧹 Database vacuumed');
            }

            // Verify deletion
            db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
                if (err) {
                    console.error('❌ Error verifying deletion:', err.message);
                } else {
                    console.log(`📊 Remaining rooms: ${row.count}`);
                    if (row.count === 0) {
                        console.log('🎉 All rooms data cleared successfully!');
                    } else {
                        console.log('⚠️ Some rooms may still remain');
                    }
                }
                db.close();
            });
        });
    });
});
