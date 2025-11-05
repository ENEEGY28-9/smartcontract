# Unity Error Checker Script
# This script analyzes Unity console output and identifies common errors

param(
    [string]$ProjectPath = "SubwaySurfers-Unity",
    [switch]$Verbose = $false
)

Write-Host "🔍 Unity Error Checker" -ForegroundColor Blue
Write-Host "====================" -ForegroundColor Blue

$projectRoot = Join-Path $PSScriptRoot $ProjectPath
$scriptsPath = Join-Path $projectRoot "Assets\Scripts"

# Common error patterns to detect
$errorPatterns = @(
    @{
        Pattern = "TextMeshProUGUI.*could not be found"
        Description = "TextMeshProUGUI not found - missing using TMPro directive"
        Severity = "High"
        Solution = "Add 'using TMPro;' to the top of the file"
    },
    @{
        Pattern = "FindObjectOfType.*obsolete"
        Description = "FindObjectOfType is obsolete in Unity 2022+"
        Severity = "Medium"
        Solution = "Replace with FindFirstObjectByType"
    },
    @{
        Pattern = "Graphics.*GetTriangleCount.*not.*found"
        Description = "Graphics.GetTriangleCount() deprecated"
        Severity = "Low"
        Solution = "Comment out or replace with alternative"
    },
    @{
        Pattern = "GameSettings.*cannot.*convert"
        Description = "GameSettings type conversion issue"
        Severity = "High"
        Solution = "Fix GameSettings class mapping in SaveLoadManager.cs"
    },
    @{
        Pattern = "AudioManager.*Instance.*not.*found"
        Description = "AudioManager.Instance not found"
        Severity = "Medium"
        Solution = "Replace with FindFirstObjectByType AudioManager"
    },
    @{
        Pattern = "Ease.*could not be found"
        Description = "Ease enum not found (DOTween missing)"
        Severity = "Medium"
        Solution = "Replace DOTween animations with Unity animations"
    }
)

Write-Host "📂 Scanning project: $projectRoot" -ForegroundColor Cyan

$issuesFound = 0
$totalFiles = 0

# Check C# files for error patterns
Get-ChildItem -Path $scriptsPath -Recurse -File -Include "*.cs" | ForEach-Object {
    $totalFiles++
    $content = Get-Content $_.FullName -Raw

    foreach ($error in $errorPatterns) {
        if ($content -match $error.Pattern) {
            Write-Host "`n❌ $($error.Description)" -ForegroundColor Red
            Write-Host "   📄 File: $($_.Name)" -ForegroundColor Gray
            Write-Host "   🔧 Solution: $($error.Solution)" -ForegroundColor Yellow
            Write-Host "   ⚠️  Severity: $($error.Severity)" -ForegroundColor Red
            $issuesFound++

            if ($Verbose) {
                # Show context around the error
                $lines = $content -split "`n"
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    if ($lines[$i] -match $error.Pattern) {
                        $start = [Math]::Max(0, $i - 2)
                        $end = [Math]::Min($lines.Count - 1, $i + 2)
                        Write-Host "   📍 Context:" -ForegroundColor Gray
                        for ($j = $start; $j -le $end; $j++) {
                            if ($j -eq $i) {
                                $marker = "   >>> "
                            } else {
                                $marker = "      "
                            }
                            Write-Host "$marker$($j + 1): $($lines[$j])" -ForegroundColor Gray
                        }
                        break
                    }
                }
            }
        }
    }
}

Write-Host "`n📊 Scan Summary:" -ForegroundColor Cyan
Write-Host "  Total files scanned: $totalFiles" -ForegroundColor White
Write-Host "  Issues found: $issuesFound" -ForegroundColor White

if ($issuesFound -eq 0) {
    Write-Host "`n✅ No common errors detected!" -ForegroundColor Green
    Write-Host "🎉 Your Unity project looks clean!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Found $issuesFound issues that can be auto-fixed." -ForegroundColor Yellow
    Write-Host "💡 Run 'unity-error-fixer.ps1' to automatically fix these issues." -ForegroundColor Cyan
}

Write-Host "`n🔧 Auto-fix commands:" -ForegroundColor Cyan
Write-Host "  .\unity-error-fixer.ps1 -ProjectPath 'SubwaySurfers-Unity'" -ForegroundColor White
Write-Host "  .\unity-error-fixer.ps1 -ProjectPath 'SubwaySurfers-Unity' -Verbose" -ForegroundColor White
