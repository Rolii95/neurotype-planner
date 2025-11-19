# Universal Neurotype Planner - Windows Setup Script
# Run this in PowerShell as Administrator

Write-Host "🧠 Universal Neurotype Planner - Windows Setup" -ForegroundColor Cyan
Write-Host "Setting up development environment..." -ForegroundColor Yellow

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "❌ Please run this script as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check if Chocolatey is installed
if (-not (Test-Command choco)) {
    Write-Host "📦 Installing Chocolatey package manager..." -ForegroundColor Green
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
} else {
    Write-Host "✅ Chocolatey already installed" -ForegroundColor Green
}

# Install Node.js
if (-not (Test-Command node)) {
    Write-Host "📦 Installing Node.js 18 LTS..." -ForegroundColor Green
    choco install nodejs-lts -y
    refreshenv
} else {
    $nodeVersion = node --version
    Write-Host "✅ Node.js already installed: $nodeVersion" -ForegroundColor Green
}

# Install Git (if needed)
if (-not (Test-Command git)) {
    Write-Host "📦 Installing Git..." -ForegroundColor Green
    choco install git -y
    refreshenv
} else {
    Write-Host "✅ Git already installed" -ForegroundColor Green
}

# Install VS Code (if needed)
if (-not (Test-Command code)) {
    Write-Host "📦 Installing Visual Studio Code..." -ForegroundColor Green
    choco install vscode -y
    refreshenv
} else {
    Write-Host "✅ VS Code already installed" -ForegroundColor Green
}

Write-Host "`n🎉 Setup complete! Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart PowerShell to reload PATH" -ForegroundColor Yellow
Write-Host "2. Navigate to project directory" -ForegroundColor Yellow
Write-Host "3. Run: npm install" -ForegroundColor Yellow
Write-Host "4. Set up Supabase project and configure .env" -ForegroundColor Yellow
Write-Host "5. Run: npm run dev" -ForegroundColor Yellow

Write-Host "`nDocumentation:" -ForegroundColor Cyan
Write-Host "- Development Roadmap: DEVELOPMENT_ROADMAP.md" -ForegroundColor White
Write-Host "- Getting Started: ONBOARDING_COMPLETE.md" -ForegroundColor White
Write-Host "- Supabase Setup: SUPABASE_SETUP.md" -ForegroundColor White