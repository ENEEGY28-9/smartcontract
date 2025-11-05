// Fix energies collection schema to allow zero points
async function fixEnergiesSchema() {
    console.log('🔧 Fixing energies collection schema...');

    try {
        const pbUrl = 'http://localhost:8090';

        // Authenticate as admin
        console.log('🔑 Authenticating as admin...');
        const authResponse = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identity: 'admin@example.com',
                password: 'admin123456'
            })
        });

        if (!authResponse.ok) {
            throw new Error(`Admin auth failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;

        console.log('✅ Admin authentication successful');

        // Get current collection schema
        console.log('📋 Getting current energies collection...');
        const getResponse = await fetch(`${pbUrl}/api/collections/energies`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!getResponse.ok) {
            throw new Error(`Failed to get collection: ${getResponse.status}`);
        }

        const collection = await getResponse.json();
        console.log('Current schema:', JSON.stringify(collection.schema, null, 2));

        // Update the points field to be not required (optional with default value)
        const updatedSchema = collection.schema.map(field => {
            if (field.name === 'points') {
                return {
                    ...field,
                    required: false, // Make it optional
                    options: {
                        ...field.options,
                        min: 0,
                        max: null,
                        noDecimal: false
                    }
                };
            }
            return field;
        });

        const updateData = {
            schema: updatedSchema
        };

        console.log('📝 Updating energies collection schema...');
        console.log('New points field config:', JSON.stringify(updatedSchema.find(f => f.name === 'points'), null, 2));

        const updateResponse = await fetch(`${pbUrl}/api/collections/${collection.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log('✅ Energies collection schema updated successfully!');
            console.log('Updated schema:', JSON.stringify(result.schema.find(f => f.name === 'points'), null, 2));
        } else {
            const errorData = await updateResponse.text();
            console.log('❌ Error updating collection:', updateResponse.status);
            console.log('❌ Error details:', errorData);
        }

        // Test update with zero
        console.log('\n🧪 Testing update with points = 0...');
        
        // First, get a user's energy record
        const energiesResponse = await fetch(`${pbUrl}/api/collections/energies/records?perPage=1`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (energiesResponse.ok) {
            const energiesData = await energiesResponse.json();
            if (energiesData.items && energiesData.items.length > 0) {
                const testRecord = energiesData.items[0];
                console.log('Found test record:', testRecord.id, 'current points:', testRecord.points);

                const testUpdateResponse = await fetch(`${pbUrl}/api/collections/energies/records/${testRecord.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        points: 0,
                        user_id: testRecord.user_id,
                        last_updated: new Date().toISOString()
                    })
                });

                if (testUpdateResponse.ok) {
                    const updatedRecord = await testUpdateResponse.json();
                    console.log('✅ Test update successful! Points now:', updatedRecord.points);
                } else {
                    const testError = await testUpdateResponse.json();
                    console.log('❌ Test update failed:', testError);
                }
            }
        }

    } catch (error) {
        console.error('❌ Script error:', error.message);
    }

    console.log('\n📋 Summary:');
    console.log('- Changed points field from required to optional');
    console.log('- Zero values should now be accepted');
    console.log('- Try the E to ETH conversion again!');
}

fixEnergiesSchema();

