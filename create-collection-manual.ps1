# TAO COLLECTION ROOMS BANG CACH KHAC

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TAO COLLECTION ROOMS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$pbUrl = "http://localhost:8090"

Write-Host "DANG THU TAO COLLECTION ROOMS..." -ForegroundColor Yellow

# Tao schema cho collection rooms
$roomsSchema = @{
    name = "rooms"
    type = "base"
    schema = @(
        @{ name = "id"; type = "text"; required = $true }
        @{ name = "name"; type = "text"; required = $true }
        @{ name = "game_mode"; type = "select"; required = $true; options = @{ values = @("deathmatch", "team_deathmatch", "capture_the_flag") } }
        @{ name = "max_players"; type = "number"; required = $true; options = @{ min = 2; max = 8 } }
        @{ name = "current_players"; type = "number"; required = $false; options = @{ min = 0 } }
        @{ name = "status"; type = "select"; required = $true; options = @{ values = @("waiting", "starting", "in_progress", "finished", "closed") } }
        @{ name = "host_player_id"; type = "text"; required = $true }
        @{ name = "created_at"; type = "date"; required = $true }
        @{ name = "updated_at"; type = "date"; required = $true }
        @{ name = "settings"; type = "json"; required = $false }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Schema da tao xong:" -ForegroundColor White
Write-Host $roomsSchema -ForegroundColor Gray

Write-Host ""
Write-Host "BAN CO THE COPY VA PASTE VAO POCKETBASE API:" -ForegroundColor Green
Write-Host "1. Mo trinh duyet: http://localhost:8090/_/" -ForegroundColor White
Write-Host "2. Dang nhap bang admin user" -ForegroundColor White
Write-Host "3. Mo tab moi: http://localhost:8090/api/collections" -ForegroundColor White
Write-Host "4. POST request voi body o tren" -ForegroundColor White
Write-Host ""
Write-Host "HOAC TAO THU CONG TRONG GIAO DIEN:" -ForegroundColor Yellow
Write-Host "1. Vao Collections" -ForegroundColor White
Write-Host "2. Nhấn '+ New collection'" -ForegroundColor White
Write-Host "3. Name: rooms" -ForegroundColor White
Write-Host "4. Type: base" -ForegroundColor White
Write-Host "5. Tao schema theo danh sach tren" -ForegroundColor White

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "DANH SACH TRUONG CAN TAO:" -ForegroundColor Magenta
Write-Host ""

$fields = @(
    @{name="id"; type="text"; required="true"; desc="ID phong game"},
    @{name="name"; type="text"; required="true"; desc="Ten phong game"},
    @{name="game_mode"; type="select"; required="true"; desc="Che do game"},
    @{name="max_players"; type="number"; required="true"; desc="So nguoi choi toi da"},
    @{name="current_players"; type="number"; required="false"; desc="So nguoi choi hien tai"},
    @{name="status"; type="select"; required="true"; desc="Trang thai phong"},
    @{name="host_player_id"; type="text"; required="true"; desc="ID nguoi tao phong"},
    @{name="created_at"; type="date"; required="true"; desc="Ngay tao"},
    @{name="updated_at"; type="date"; required="true"; desc="Ngay cap nhat"},
    @{name="settings"; type="json"; required="false"; desc="Cai dat bo sung"}
)

foreach ($field in $fields) {
    $name = $field.name.PadRight(18)
    $type = $field.type.PadRight(10)
    $required = if ($field.required -eq "true") { "BAT BUOC" } else { "TUY CHON" }
    $required = $required.PadRight(10)
    $desc = $field.desc
    Write-Host "$name $type $required $desc" -ForegroundColor White
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
