const POCKETBASE_URL = 'http://127.0.0.1:8090';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';

async function checkUsers() {
    try {
        console.log('🔐 Authenticating as admin...');
        const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identity: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            })
        });

        if (!authResponse.ok) {
            throw new Error(`Authentication failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        const adminToken = authData.token;

        const usersResponse = await fetch(`${POCKETBASE_URL}/api/collections/users/records`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!usersResponse.ok) {
            throw new Error(`Failed to fetch users: ${usersResponse.status}`);
        }

        const usersData = await usersResponse.json();

        console.log('Available users:');
        usersData.items.forEach(user => {
            console.log(`- ${user.name} (${user.email}) - ID: ${user.id}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkUsers();

