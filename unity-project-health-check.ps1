# Unity Project Health Check
# Comprehensive script to check and fix Unity project issues

param(
    [string]$ProjectPath = "SubwaySurfers-Unity",
    [switch]$AutoFix = $false,
    [switch]$Verbose = $false
)

Write-Host "🏥 Unity Project Health Check" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

$startTime = Get-Date
$projectRoot = Join-Path $PSScriptRoot $ProjectPath

if (-not (Test-Path $projectRoot)) {
    Write-Host "❌ Project not found: $projectRoot" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Project: $projectRoot" -ForegroundColor Cyan
Write-Host "⏰ Started at: $($startTime.ToString('HH:mm:ss'))" -ForegroundColor Cyan

# Step 1: Check for errors
Write-Host "`n🔍 Step 1: Scanning for errors..." -ForegroundColor Yellow
try {
    $checkResult = & "$PSScriptRoot\unity-error-checker.ps1" -ProjectPath $ProjectPath -Verbose:$Verbose
} catch {
    Write-Host "❌ Error running checker: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 2: Auto-fix if requested
if ($AutoFix) {
    Write-Host "`n🔧 Step 2: Applying auto-fixes..." -ForegroundColor Yellow
    try {
        $fixResult = & "$PSScriptRoot\unity-error-fixer.ps1" -ProjectPath $ProjectPath -Verbose:$Verbose
    } catch {
        Write-Host "❌ Error running fixer: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 3: Final report
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "`n📊 Final Report:" -ForegroundColor Magenta
Write-Host "  ⏱️  Duration: $($duration.TotalSeconds.ToString('F1'))s" -ForegroundColor White
Write-Host "  📁 Project: $ProjectPath" -ForegroundColor White

if ($AutoFix) {
    Write-Host "  ✅ Auto-fix: ENABLED" -ForegroundColor Green
} else {
    Write-Host "  🔍 Auto-fix: DISABLED (use -AutoFix to enable)" -ForegroundColor Yellow
}

Write-Host "`n💡 Quick commands:" -ForegroundColor Cyan
Write-Host "  Check only: .\unity-project-health-check.ps1" -ForegroundColor White
Write-Host "  Auto-fix:    .\unity-project-health-check.ps1 -AutoFix" -ForegroundColor White
Write-Host "  Verbose:     .\unity-project-health-check.ps1 -Verbose" -ForegroundColor White

Write-Host "`n🎯 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart Unity Editor" -ForegroundColor White
Write-Host "  2. Check Console for remaining errors" -ForegroundColor White
Write-Host "  3. Run this script again if new errors appear" -ForegroundColor White

Write-Host "`n🚀 Happy coding!" -ForegroundColor Green
