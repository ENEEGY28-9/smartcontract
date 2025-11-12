# 📊 DEPLOYMENT MONITORING SCRIPT
# Monitors GitHub Actions workflow status in real-time

param(
    [int]$CheckInterval = 30,  # seconds between checks
    [int]$MaxChecks = 60,      # maximum number of checks (30 minutes at 30s intervals)
    [switch]$Silent
)

$REPO_URL = "https://api.github.com/repos/ENEEGY28-9/smartcontract/actions/runs"
$WORKFLOW_NAME = "deploy-fixed.yml"

function Get-WorkflowStatus {
    try {
        $response = Invoke-RestMethod -Uri $REPO_URL -Method Get -Headers @{
            "Accept" = "application/vnd.github.v3+json"
            "User-Agent" = "PowerShell-Script"
        }

        # Find the latest deployment workflow run
        $latestRun = $response.workflow_runs | Where-Object {
            $_.name -like "*deploy*" -or $_.path -like "*deploy-fixed*"
        } | Select-Object -First 1

        if ($latestRun) {
            return @{
                Status = $latestRun.status
                Conclusion = $latestRun.conclusion
                CreatedAt = $latestRun.created_at
                UpdatedAt = $latestRun.updated_at
                HtmlUrl = $latestRun.html_url
                RunId = $latestRun.id
            }
        }
    }
    catch {
        Write-Host "⚠️  Unable to check GitHub status (may be rate limited)" -ForegroundColor Yellow
    }

    return $null
}

function Format-TimeAgo {
    param([DateTime]$DateTime)

    $now = Get-Date
    $diff = $now - $DateTime

    if ($diff.TotalMinutes -lt 1) {
        return "$([math]::Round($diff.TotalSeconds)) seconds ago"
    }
    elseif ($diff.TotalHours -lt 1) {
        return "$([math]::Round($diff.TotalMinutes)) minutes ago"
    }
    elseif ($diff.TotalDays -lt 1) {
        return "$([math]::Round($diff.TotalHours)) hours ago"
    }
    else {
        return "$([math]::Round($diff.TotalDays)) days ago"
    }
}

function Show-Status {
    param($StatusInfo)

    if (!$StatusInfo) {
        Write-Host "❓ Unable to retrieve workflow status" -ForegroundColor Yellow
        return
    }

    $createdTime = [DateTime]::Parse($StatusInfo.CreatedAt)
    $updatedTime = [DateTime]::Parse($StatusInfo.UpdatedAt)

    Write-Host ""
    Write-Host "📊 DEPLOYMENT STATUS" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan

    switch ($StatusInfo.Status) {
        "queued" {
            Write-Host "⏳ Status: Queued" -ForegroundColor Yellow
            Write-Host "📝 The workflow is waiting to run" -ForegroundColor Yellow
        }
        "in_progress" {
            Write-Host "🔄 Status: In Progress" -ForegroundColor Blue
            Write-Host "⚙️  The deployment is currently running" -ForegroundColor Blue
        }
        "completed" {
            switch ($StatusInfo.Conclusion) {
                "success" {
                    Write-Host "✅ Status: Completed Successfully!" -ForegroundColor Green
                    Write-Host "🎉 Smart contract deployed to Solana Devnet!" -ForegroundColor Green
                }
                "failure" {
                    Write-Host "❌ Status: Failed" -ForegroundColor Red
                    Write-Host "💥 Deployment encountered an error" -ForegroundColor Red
                }
                "cancelled" {
                    Write-Host "🚫 Status: Cancelled" -ForegroundColor Yellow
                    Write-Host "🛑 The deployment was cancelled" -ForegroundColor Yellow
                }
                default {
                    Write-Host "❓ Status: Completed ($($StatusInfo.Conclusion))" -ForegroundColor Gray
                }
            }
        }
        default {
            Write-Host "❓ Status: $($StatusInfo.Status)" -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "⏰ Started: $(Format-TimeAgo $createdTime)" -ForegroundColor White
    Write-Host "🔄 Updated: $(Format-TimeAgo $updatedTime)" -ForegroundColor White
    Write-Host "🔗 View Details: $($StatusInfo.HtmlUrl)" -ForegroundColor White
}

function Show-Progress {
    $status = Get-WorkflowStatus

    if ($status) {
        Show-Status $status

        # Show expected progress for in-progress deployments
        if ($status.Status -eq "in_progress") {
            Write-Host ""
            Write-Host "📋 EXPECTED PROGRESS:" -ForegroundColor Cyan
            Write-Host "  1. 🔧 Setting up Rust toolchain (~1 min)" -ForegroundColor White
            Write-Host "  2. 📦 Installing Solana CLI (~1 min)" -ForegroundColor White
            Write-Host "  3. ⚓ Installing Anchor framework (~2 min)" -ForegroundColor White
            Write-Host "  4. 🔑 Creating and funding wallet (~2 min)" -ForegroundColor White
            Write-Host "  5. 🏗️ Building smart contract (~2 min)" -ForegroundColor White
            Write-Host "  6. 🚀 Deploying to devnet (~2 min)" -ForegroundColor White
            Write-Host "  7. ✅ Verifying deployment (~1 min)" -ForegroundColor White
            Write-Host "  8. 🧪 Running tests (~1 min)" -ForegroundColor White
            Write-Host ""
            Write-Host "⏱️  Total estimated time: 10-12 minutes" -ForegroundColor Yellow
        }
    }
}

# Main monitoring loop
if (!$Silent) {
    Write-Host "👀 MONITORING DEPLOYMENT PROGRESS..." -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Checking GitHub Actions status every $CheckInterval seconds..." -ForegroundColor Blue
    Write-Host "📊 Press Ctrl+C to stop monitoring" -ForegroundColor Blue
    Write-Host ""
}

$checkCount = 0
$lastStatus = $null

while ($checkCount -lt $MaxChecks) {
    $checkCount++

    if (!$Silent) {
        Write-Host "🔍 Check #$checkCount ($([math]::Round((Get-Date).TimeOfDay.TotalSeconds))s elapsed)" -ForegroundColor Gray
    }

    $currentStatus = Get-WorkflowStatus

    if ($currentStatus) {
        # Only show status if it changed or it's the first check
        if ($null -eq $lastStatus -or
            $lastStatus.Status -ne $currentStatus.Status -or
            $lastStatus.Conclusion -ne $currentStatus.Conclusion) {

            Show-Progress

            $lastStatus = $currentStatus
        }
        elseif (!$Silent) {
            Write-Host "   ↻ Status unchanged" -ForegroundColor Gray
        }

        # Exit if deployment completed
        if ($currentStatus.Status -eq "completed") {
            Write-Host ""

            if ($currentStatus.Conclusion -eq "success") {
                Write-Host "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
                Write-Host "🏆 Smart contract is now live on Solana Devnet!" -ForegroundColor Green
                Write-Host ""
                Write-Host "📋 NEXT STEPS:" -ForegroundColor Cyan
                Write-Host "1. Check the deployment report artifact on GitHub" -ForegroundColor White
                Write-Host "2. Test player claims: node game_token/player_claim_real.js" -ForegroundColor White
                Write-Host "3. Verify on Solana Explorer" -ForegroundColor White
            }
            else {
                Write-Host "❌ DEPLOYMENT FAILED" -ForegroundColor Red
                Write-Host "🔍 Check the GitHub Actions logs for error details" -ForegroundColor Red
            }

            exit 0
        }
    }
    else {
        if (!$Silent) {
            Write-Host "   ⚠️ Unable to check status" -ForegroundColor Yellow
        }
    }

    if ($checkCount -lt $MaxChecks) {
        Start-Sleep -Seconds $CheckInterval
    }
}

Write-Host ""
Write-Host "⏰ Monitoring timeout reached ($([math]::Round($MaxChecks * $CheckInterval / 60)) minutes)" -ForegroundColor Yellow
Write-Host "🔄 Deployment may still be running. Check GitHub Actions directly:" -ForegroundColor Yellow
Write-Host "   https://github.com/ENEEGY28-9/smartcontract/actions" -ForegroundColor White
