# Stripe Environment Variables Setup Script
Write-Host "🔧 Setting up Stripe Environment Variables" -ForegroundColor Cyan
Write-Host ""

# Read current .env file
$envContent = Get-Content .env -Raw

# Check what's missing
$missingVars = @()

if ($envContent -notmatch "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY") {
    $missingVars += "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
}

if ($envContent -notmatch "STRIPE_WEBHOOK_SECRET") {
    $missingVars += "STRIPE_WEBHOOK_SECRET"
}

if ($envContent -notmatch "STRIPE_STARTER_PRICE_ID") {
    $missingVars += "STRIPE_STARTER_PRICE_ID"
}

if ($envContent -notmatch "STRIPE_PRO_PRICE_ID") {
    $missingVars += "STRIPE_PRO_PRICE_ID"
}

if ($envContent -notmatch "STRIPE_ENTERPRISE_PRICE_ID") {
    $missingVars += "STRIPE_ENTERPRISE_PRICE_ID"
}

if ($missingVars.Count -eq 0) {
    Write-Host "✅ All Stripe environment variables are already set!" -ForegroundColor Green
    exit 0
}

Write-Host "❌ Missing Stripe environment variables:" -ForegroundColor Red
foreach ($var in $missingVars) {
    Write-Host "   - $var" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 To complete the setup, you need to:" -ForegroundColor Cyan
Write-Host "1. Go to your Stripe Dashboard (https://dashboard.stripe.com/)" -ForegroundColor White
Write-Host "2. Get your Publishable Key from Developers > API Keys" -ForegroundColor White
Write-Host "3. Create products and prices for each plan:" -ForegroundColor White
Write-Host "   - Starter Plan: `$29/month" -ForegroundColor White
Write-Host "   - Pro Plan: `$99/month" -ForegroundColor White
Write-Host "   - Enterprise Plan: `$299/month" -ForegroundColor White
Write-Host "4. Set up webhooks and get the webhook secret" -ForegroundColor White
Write-Host "5. Add these variables to your .env file:" -ForegroundColor White
Write-Host ""

Write-Host "Example .env additions:" -ForegroundColor Green
Write-Host "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=`"pk_live_your_publishable_key`"" -ForegroundColor Gray
Write-Host "STRIPE_WEBHOOK_SECRET=`"whsec_your_webhook_secret`"" -ForegroundColor Gray
Write-Host "STRIPE_STARTER_PRICE_ID=`"price_starter_plan_id`"" -ForegroundColor Gray
Write-Host "STRIPE_PRO_PRICE_ID=`"price_pro_plan_id`"" -ForegroundColor Gray
Write-Host "STRIPE_ENTERPRISE_PRICE_ID=`"price_enterprise_plan_id`"" -ForegroundColor Gray

Write-Host ""
Write-Host "📖 For detailed instructions, see: STRIPE_SETUP_GUIDE.md" -ForegroundColor Cyan
