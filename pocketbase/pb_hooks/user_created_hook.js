/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook để tự động tạo energy record khi user mới được tạo
 */

onRecordAfterCreateRequest((e) => {
    // Chỉ áp dụng cho users collection
    if (e.record.collection().name !== '_pb_users_auth_') {
        return;
    }

    try {
        console.log('🎯 New user created, auto-creating energy record...');

        const userId = e.record.id;
        const userEmail = e.record.get('email');

        console.log(`👤 User: ${userEmail} (ID: ${userId})`);

        // Tạo energy record với default points
        const energyData = {
            user_id: userId,
            points: 100, // Default starting energy
            last_updated: new Date().toISOString()
        };

        // Tạo energy record
        const energyRecord = $app.dao().saveRecord(
            new Record($app.dao().findCollectionByNameOrId('energies'), energyData)
        );

        console.log(`✅ Auto-created energy record for ${userEmail}: ${energyRecord.get('points')} points`);

    } catch (error) {
        console.error('❌ Failed to auto-create energy record:', error);
        console.error('Error details:', error.message);

        // Có thể throw error để rollback user creation, nhưng tạm thời chỉ log
        // throw new Error('Failed to create energy record for new user');
    }
}, "_pb_users_auth_");







