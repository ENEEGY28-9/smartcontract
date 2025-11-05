# Unity Error Auto-Fixer Script
# This script automatically detects and fixes common Unity errors

param(
    [string]$ProjectPath = "SubwaySurfers-Unity",
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

Write-Host "🔧 Unity Error Auto-Fixer" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

$fixesApplied = 0
$filesModified = 0

# Apply each fix
foreach ($fix in $fixes) {
    $filePath = Join-Path $scriptsPath $fix.FileName

    if (Test-Path $filePath) {
        Write-Host "🔧 Applying: $($fix.Name)" -ForegroundColor Yellow

        $content = Get-Content $filePath -Raw
        $newContent = $content -replace $fix.Pattern, $fix.Replacement

        if ($newContent -ne $content) {
            if (-not $DryRun) {
                $newContent | Set-Content $filePath -NoNewline
            }
            Write-Host "  ✅ Fixed: $($fix.FileName)" -ForegroundColor Green
            $fixesApplied++
            $filesModified++
        } else {
            Write-Host "  ⏭️ No changes needed: $($fix.FileName)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️ File not found: $($fix.FileName)" -ForegroundColor Yellow
    }
}

# Final report
Write-Host "`n📊 Fix Summary:" -ForegroundColor Cyan
Write-Host "  Files modified: $filesModified" -ForegroundColor White
Write-Host "  Fixes applied: $fixesApplied" -ForegroundColor White

if ($DryRun) {
    Write-Host "`n🔍 This was a dry run. Use -DryRun:`$false to apply fixes." -ForegroundColor Yellow
} else {
    Write-Host "`n✅ Fixes applied successfully!" -ForegroundColor Green
    Write-Host "💡 Tip: Restart Unity to see all changes take effect." -ForegroundColor Cyan
}

Write-Host "`n🎯 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart Unity Editor" -ForegroundColor White
Write-Host "  2. Check Console for remaining errors" -ForegroundColor White
Write-Host "  3. Run this script again if new errors appear" -ForegroundColor White
