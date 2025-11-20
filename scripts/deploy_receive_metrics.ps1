<#
Deploy the `receive-metrics` Edge Function using the Supabase CLI.

Prerequisites:
- Install Node.js and the Supabase CLI (`npm install -g supabase` or use npx)
- Set environment variables: `SUPABASE_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN` (or pass as args)

Usage:
  .\scripts\deploy_receive_metrics.ps1
#>

param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
  [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN
)

if (-not $ProjectRef -or -not $AccessToken) {
  Write-Error "Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN environment variables."
  exit 2
}

Write-Output "Deploying receive-metrics function to Supabase project $ProjectRef"

# Use npx to avoid requiring global install
npx supabase@latest functions deploy receive-metrics --project-ref $ProjectRef --token $AccessToken

if ($LASTEXITCODE -ne 0) {
  Write-Error "Supabase function deploy failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Output "Deployment finished. Set VITE_RECEIVE_METRICS_URL to the function URL in your .env or CI secrets."
