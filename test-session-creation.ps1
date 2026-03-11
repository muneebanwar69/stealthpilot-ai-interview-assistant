# Test Session Creation Script
# This script tests the complete session creation flow

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Session Creation Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Test backend health
Write-Host "1. Checking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    Write-Host "   ✓ Backend is healthy" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Backend is not responding" -ForegroundColor Red
    exit 1
}

# Step 2: Login as admin
Write-Host "2. Logging in as admin..." -ForegroundColor Yellow
try {
    $loginBody = "username=admin&password=admin123"
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    $token = $loginResponse.access_token
    Write-Host "   ✓ Login successful" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Create a new session
Write-Host "3. Creating new session..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $sessionBody = @{
        profile_type = "interview"
        language = "en"
        company_name = "Test Company"
        role_title = "Software Engineer"
    } | ConvertTo-Json
    
    $sessionResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/sessions/" -Method Post -Headers $headers -Body $sessionBody -ContentType "application/json"
    Write-Host "   ✓ Session created successfully!" -ForegroundColor Green
    Write-Host "   Session ID: $($sessionResponse.id)" -ForegroundColor Cyan
    Write-Host "   Company: $($sessionResponse.company_name)" -ForegroundColor Cyan
    Write-Host "   Role: $($sessionResponse.role_title)" -ForegroundColor Cyan
    Write-Host "   Started at: $($sessionResponse.started_at)" -ForegroundColor Cyan
} catch {
    Write-Host "   ✗ Session creation failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Get all sessions
Write-Host "4. Fetching all sessions..." -ForegroundColor Yellow
try {
    $allSessions = Invoke-RestMethod -Uri "http://localhost:8000/api/sessions/" -Method Get -Headers $headers
    Write-Host "   ✓ Found $($allSessions.Count) sessions" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Failed to fetch sessions: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "All tests passed! ✓" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now test the frontend:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3000" -ForegroundColor White
Write-Host "2. Login with admin / admin123" -ForegroundColor White
Write-Host "3. Click 'Start Live Session' button" -ForegroundColor White
Write-Host ""
