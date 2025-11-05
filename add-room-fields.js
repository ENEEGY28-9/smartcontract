// Script to add individual fields to rooms collection
const POCKETBASE_URL = 'http://localhost:8090';

async function addFieldToRooms(fieldData) {
    console.log(`Adding field: ${fieldData.name}`);

    try {
        // Authenticate
        const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
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
            throw new Error('Authentication failed');
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;

        // Add field to rooms collection
        const response = await fetch(`${POCKETBASE_URL}/api/collections/1378lh283rztfah/fields`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(fieldData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ Failed to add ${fieldData.name}:`, response.status, errorText);
            return false;
        }

        console.log(`✅ Added field: ${fieldData.name}`);
        return true;

    } catch (error) {
        console.error(`❌ Error adding ${fieldData.name}:`, error.message);
        return false;
    }
}

async function addAllFields() {
    console.log('🚀 Adding fields to rooms collection...');

    const fields = [
        {
            name: "game_type",
            type: "select",
            required: false,
            options: {
                values: ["subway_surfers", "infinite_runner", "puzzle", "racing", "other"],
                maxSelect: 1
            }
        },
        {
            name: "game_settings",
            type: "json",
            required: false,
            options: {}
        },
        {
            name: "status",
            type: "select",
            required: true,
            options: {
                values: ["waiting", "playing", "finished", "cancelled"],
                maxSelect: 1
            }
        },
        {
            name: "max_members",
            type: "number",
            required: true,
            options: {
                min: 2,
                max: 50,
                noDecimal: true
            }
        },
        {
            name: "is_private",
            type: "bool",
            required: false,
            options: {}
        },
        {
            name: "password",
            type: "text",
            required: false,
            options: {
                min: null,
                max: null,
                pattern: ""
            }
        }
    ];

    for (const field of fields) {
        await addFieldToRooms(field);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('🎉 Finished adding fields!');
}

addAllFields();

