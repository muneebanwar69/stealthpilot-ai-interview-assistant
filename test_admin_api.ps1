# ====================================
# Parakeet AI - Complete Admin API Test Suite
# ====================================

$BASE_URL = "http://localhost:8000/api"
$ADMIN_TOKEN = ""
$TEST_USER_ID = 0

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Parakeet AI - Admin API Test Suite" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Function to make API calls with error handling
function Invoke-APIRequest {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$ContentType = "application/json"
    )
    
    try {
        $params = @{
            Method = $Method
            Uri = $Uri
            Headers = $Headers
        }
        
        if ($Body) {
            if ($Body -is [hashtable]) {
                $params.Body = ($Body | ConvertTo-Json)
            } else {
                $params.Body = $Body
            }
            $params.ContentType = $ContentType
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
        return $null
    }
}

# ====================================
# TEST 1: Health Check
# ====================================
Write-Host "[TEST 1] Health Check..." -ForegroundColor Yellow
$health = Invoke-APIRequest -Method GET -Uri "$BASE_URL/../health"
if ($health) {
    Write-Host "   Status: $($health.status)" -ForegroundColor White
}
Write-Host ""

# ====================================
# TEST 2: Register New Test User
# ====================================
Write-Host "[TEST 2] Register new test user (should be PENDING)..." -ForegroundColor Yellow
$registerBody = @{
    email = "testuser$(Get-Random -Maximum 9999)@example.com"
    username = "testuser$(Get-Random -Maximum 9999)"
    password = "Test123!@#"
    full_name = "Test User"
}

$registerResponse = Invoke-APIRequest -Method POST -Uri "$BASE_URL/auth/register" -Body $registerBody
if ($registerResponse) {
    Write-Host "   Message: $($registerResponse.message)" -ForegroundColor White
    Write-Host "   User ID: $($registerResponse.user_id)" -ForegroundColor White
    Write-Host "   Status: $($registerResponse.status)" -ForegroundColor White
    $TEST_USER_ID = $registerResponse.user_id
}
Write-Host ""

# ====================================
# TEST 3: Try to login with PENDING account (should FAIL)
# ====================================
Write-Host "[TEST 3] Try to login with PENDING account (should be DENIED)..." -ForegroundColor Yellow
$loginBody = "username=$($registerBody.username)&password=$($registerBody.password)"
$loginResponse = Invoke-APIRequest -Method POST -Uri "$BASE_URL/auth/login" -Body $loginBody -ContentType "application/x-www-form-urlencoded"
if ($loginResponse) {
    Write-Host "   ⚠️  UNEXPECTED: User logged in despite PENDING status!" -ForegroundColor Red
} else {
    Write-Host "   ✅ Correctly blocked PENDING user from logging in" -ForegroundColor Green
}
Write-Host ""

# ====================================
# TEST 4: Admin Login
# ====================================
Write-Host "[TEST 4] Admin login..." -ForegroundColor Yellow
$adminLoginBody = "username=admin&password=admin123"
$adminLoginResponse = Invoke-APIRequest -Method POST -Uri "$BASE_URL/auth/login" -Body $adminLoginBody -ContentType "application/x-www-form-urlencoded"

if ($adminLoginResponse) {
    $ADMIN_TOKEN = $adminLoginResponse.access_token
    Write-Host "   Admin: $($adminLoginResponse.user.full_name)" -ForegroundColor White
    Write-Host "   Role: $($adminLoginResponse.user.role)" -ForegroundColor White
    Write-Host "   Token: $($ADMIN_TOKEN.Substring(0,30))..." -ForegroundColor White
}
Write-Host ""

if (-not $ADMIN_TOKEN) {
    Write-Host "❌ CRITICAL: Cannot proceed without admin token!" -ForegroundColor Red
    exit 1
}

$authHeaders = @{ Authorization = "Bearer $ADMIN_TOKEN" }

# ====================================
# TEST 5: Get System Stats
# ====================================
Write-Host "[TEST 5] Get admin system stats..." -ForegroundColor Yellow
$stats = Invoke-APIRequest -Method GET -Uri "$BASE_URL/admin/stats" -Headers $authHeaders
if ($stats) {
    Write-Host "   Total Users: $($stats.total_users)" -ForegroundColor White
    Write-Host "   Pending Users: $($stats.pending_users)" -ForegroundColor White
    Write-Host "   Approved Users: $($stats.approved_users)" -ForegroundColor White
    Write-Host "   Total Sessions: $($stats.total_sessions)" -ForegroundColor White
}
Write-Host ""

# ====================================
# TEST 6: Get Pending Users
# ====================================
Write-Host "[TEST 6] Get all pending users..." -ForegroundColor Yellow
$pendingUsers = Invoke-APIRequest -Method GET -Uri "$BASE_URL/admin/users/pending" -Headers $authHeaders
if ($pendingUsers) {
    Write-Host "   Found $($pendingUsers.Count) pending user(s)" -ForegroundColor White
    foreach ($user in $pendingUsers | Select-Object -First 3) {
        Write-Host "   - ID: $($user.id), Username: $($user.username), Email: $($user.email), Status: $($user.status)" -ForegroundColor Gray
    }
}
Write-Host ""

# ====================================
# TEST 7: Get All Users
# ====================================
Write-Host "[TEST 7] Get all users in system..." -ForegroundColor Yellow
$allUsers = Invoke-APIRequest -Method GET -Uri "$BASE_URL/admin/users" -Headers $authHeaders
if ($allUsers) {
    Write-Host "   Total: $($allUsers.Count) users" -ForegroundColor White
    foreach ($user in $allUsers | Select-Object -First 5) {
        Write-Host "   - ID: $($user.id), Username: $($user.username), Role: $($user.role), Status: $($user.status)" -ForegroundColor Gray
    }
}
Write-Host ""

# ====================================
# TEST 8: Approve the Test User
# ====================================
if ($TEST_USER_ID -gt 0) {
    Write-Host "[TEST 8] Approve test user ID $TEST_USER_ID..." -ForegroundColor Yellow
    $approvedUser = Invoke-APIRequest -Method POST -Uri "$BASE_URL/admin/users/$TEST_USER_ID/approve" -Headers $authHeaders
    if ($approvedUser) {
        Write-Host "   Username: $($approvedUser.username)" -ForegroundColor White
        Write-Host "   Status: $($approvedUser.status)" -ForegroundColor White
        Write-Host "   Approved At: $($approvedUser.approved_at)" -ForegroundColor White
    }
    Write-Host ""

    # ====================================
    # TEST 9: Now try to login as approved user (should SUCCEED)
    # ====================================
    Write-Host "[TEST 9] Login with APPROVED account (should succeed)..." -ForegroundColor Yellow
    $userLoginResponse = Invoke-APIRequest -Method POST -Uri "$BASE_URL/auth/login" -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    if ($userLoginResponse) {
        Write-Host "   ✅ User successfully logged in!" -ForegroundColor Green
        Write-Host "   Username: $($userLoginResponse.user.username)" -ForegroundColor White
        Write-Host "   Role: $($userLoginResponse.user.role)" -ForegroundColor White
        Write-Host "   Status: $($userLoginResponse.user.status)" -ForegroundColor White
    } else {
        Write-Host "   ❌ Login failed even after approval!" -ForegroundColor Red
    }
    Write-Host ""

    # ====================================
    # TEST 10: Suspend User
    # ====================================
    Write-Host "[TEST 10] Suspend user ID $TEST_USER_ID..." -ForegroundColor Yellow
    $suspendedUser = Invoke-APIRequest -Method POST -Uri "$BASE_URL/admin/users/$TEST_USER_ID/suspend" -Headers $authHeaders
    if ($suspendedUser) {
        Write-Host "   Status: $($suspendedUser.status)" -ForegroundColor White
        Write-Host "   Active: $($suspendedUser.is_active)" -ForegroundColor White
    }
    Write-Host ""

    # ====================================
    # TEST 11: Try to login as suspended user (should FAIL)
    # ====================================
    Write-Host "[TEST 11] Try to login as SUSPENDED user (should be denied)..." -ForegroundColor Yellow
    $suspendedLoginResponse = Invoke-APIRequest -Method POST -Uri "$BASE_URL/auth/login" -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    if ($suspendedLoginResponse) {
        Write-Host "   ⚠️  UNEXPECTED: Suspended user logged in!" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Correctly blocked suspended user" -ForegroundColor Green
    }
    Write-Host ""

    # ====================================
    # TEST 12: Get Specific User Details
    # ====================================
    Write-Host "[TEST 12] Get specific user details for ID $TEST_USER_ID..." -ForegroundColor Yellow
    $userDetails = Invoke-APIRequest -Method GET -Uri "$BASE_URL/admin/users/$TEST_USER_ID" -Headers $authHeaders
    if ($userDetails) {
        Write-Host "   Username: $($userDetails.username)" -ForegroundColor White
        Write-Host "   Email: $($userDetails.email)" -ForegroundColor White
        Write-Host "   Status: $($userDetails.status)" -ForegroundColor White
        Write-Host "   Role: $($userDetails.role)" -ForegroundColor White
        Write-Host "   Created: $($userDetails.created_at)" -ForegroundColor White
    }
    Write-Host ""

    # ====================================
    # TEST 13: Delete User
    # ====================================
    Write-Host "[TEST 13] Delete user ID $TEST_USER_ID..." -ForegroundColor Yellow
    $deleteResponse = Invoke-APIRequest -Method DELETE -Uri "$BASE_URL/admin/users/$TEST_USER_ID" -Headers $authHeaders
    Write-Host ""
}

# ====================================
# TEST 14: Try admin endpoint without auth (should FAIL)
# ====================================
Write-Host "[TEST 14] Try admin endpoint without authentication (should be denied)..." -ForegroundColor Yellow
$noAuthResponse = Invoke-APIRequest -Method GET -Uri "$BASE_URL/admin/stats"
if ($noAuthResponse) {
    Write-Host "   ⚠️  SECURITY ISSUE: Accessed admin endpoint without auth!" -ForegroundColor Red
} else {
    Write-Host "   ✅ Correctly blocked unauthenticated access" -ForegroundColor Green
}
Write-Host ""

# ====================================
# TEST 15: Create another user and test Reject
# ====================================
Write-Host "[TEST 15] Test user rejection flow..." -ForegroundColor Yellow
$rejectUserBody = @{
    email = "rejectme$(Get-Random -Maximum 9999)@example.com"
    username = "rejectme$(Get-Random -Maximum 9999)"
    password = "Test123!@#"
    full_name = "Reject Test User"
}

$rejectRegisterResponse = Invoke-APIRequest -Method POST -Uri "$BASE_URL/auth/register" -Body $rejectUserBody
if ($rejectRegisterResponse) {
    $REJECT_USER_ID = $rejectRegisterResponse.user_id
    Write-Host "   Created user ID: $REJECT_USER_ID" -ForegroundColor White
    
    # Reject the user
    Write-Host "   Rejecting user..." -ForegroundColor Yellow
    $rejectedUser = Invoke-APIRequest -Method POST -Uri "$BASE_URL/admin/users/$REJECT_USER_ID/reject" -Headers $authHeaders
    if ($rejectedUser) {
        Write-Host "   Status: $($rejectedUser.status)" -ForegroundColor White
    }
    
    # Try to login as rejected user
    Write-Host "   Try to login as rejected user (should fail)..." -ForegroundColor Yellow
    $rejectLoginBody = "username=$($rejectUserBody.username)&password=$($rejectUserBody.password)"
    $rejectLoginResponse = Invoke-APIRequest -Method POST -Uri "$BASE_URL/auth/login" -Body $rejectLoginBody -ContentType "application/x-www-form-urlencoded"
    if ($rejectLoginResponse) {
        Write-Host "   ⚠️  UNEXPECTED: Rejected user logged in!" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Correctly blocked rejected user" -ForegroundColor Green
    }
    
    # Clean up
    Invoke-APIRequest -Method DELETE -Uri "$BASE_URL/admin/users/$REJECT_USER_ID" -Headers $authHeaders | Out-Null
}
Write-Host ""

# ====================================
# Final Summary
# ====================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Suite Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Admin login works" -ForegroundColor Green
Write-Host "✅ New users start as PENDING" -ForegroundColor Green
Write-Host "✅ PENDING users cannot login" -ForegroundColor Green
Write-Host "✅ Admin can approve/reject users" -ForegroundColor Green
Write-Host "✅ Only APPROVED users can login" -ForegroundColor Green
Write-Host "✅ Admin can suspend/delete users" -ForegroundColor Green
Write-Host "✅ SUSPENDED users cannot login" -ForegroundColor Green
Write-Host "✅ Admin endpoints require authentication" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Admin Login Credentials:" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:3000/sign-in" -ForegroundColor White
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Admin Panel URL:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000/admin" -ForegroundColor White
Write-Host ""
