# Script thiết lập admin và tạo collections
param(
    [string]$PocketBaseUrl = "http://localhost:8090",
    [string]$AdminEmail = "admin2@pocketbase.local",
    [string]$AdminPassword = "admin123456"
)

Write-Host "Setting up Admin and Collections..." -ForegroundColor Cyan

# Trước tiên, hãy thử truy cập vào admin dashboard để xem có sẵn sàng không
Write-Host "Checking PocketBase admin dashboard..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$PocketBaseUrl/_/" -UseBasicParsing
    Write-Host "Admin dashboard is accessible" -ForegroundColor Green
} catch {
    Write-Host "Admin dashboard not accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Tạo script HTML để tự động tạo admin user
$setupScript = @"
<!DOCTYPE html>
<html>
<head>
    <title>PocketBase Admin Setup</title>
</head>
<body>
    <h1>Setting up PocketBase Admin User</h1>
    <div id="status">Initializing...</div>

    <script>
        async function setupAdmin() {
            try {
                // Try to login first
                const loginResponse = await fetch('$PocketBaseUrl/api/admins/auth-with-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        identity: '$AdminEmail',
                        password: '$AdminPassword'
                    })
                });

                if (loginResponse.ok) {
                    document.getElementById('status').innerHTML = 'Admin user already exists and login successful!';
                    return;
                }

                // If login fails, try to create admin user
                document.getElementById('status').innerHTML = 'Creating admin user...';

                // Note: This might not work as admin creation typically requires existing admin
                // This is just for demonstration

            } catch (error) {
                document.getElementById('status').innerHTML = 'Error: ' + error.message;
            }
        }

        setupAdmin();
    </script>
</body>
</html>
"@

$setupScript | Out-File -FilePath "admin-setup.html" -Encoding UTF8

Write-Host "Admin setup script created as admin-setup.html" -ForegroundColor Green
Write-Host "Please open http://localhost:8090/_/ in your browser to complete admin setup" -ForegroundColor Yellow
Write-Host "Then run the room creation script again." -ForegroundColor Yellow

# Tạo một script đơn giản để tạo room mà không cần authentication nâng cao
Write-Host "Creating simple room creation script..." -ForegroundColor Yellow

$simpleRoomScript = @"
# Simple room creation (for testing without full auth)
Write-Host "Creating a test room..." -ForegroundColor Yellow

try {
    # Test basic connection
    $health = Invoke-RestMethod -Uri "$PocketBaseUrl/api/health" -Method Get
    Write-Host "PocketBase is running" -ForegroundColor Green

    # Try to create a simple collection without auth (might not work)
    Write-Host "Note: Full room creation requires admin authentication" -ForegroundColor Yellow
    Write-Host "Please complete admin setup first in the browser" -ForegroundColor Yellow

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
"@

$simpleRoomScript | Out-File -FilePath "simple-room-test.ps1" -Encoding UTF8

Write-Host "Simple room test script created as simple-room-test.ps1" -ForegroundColor Green
