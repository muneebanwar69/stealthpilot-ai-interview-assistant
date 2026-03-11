# Parakeet AI - Quick cURL Commands Reference

## 🔑 Admin Login & Get Token

```powershell
# Login as admin
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body "username=admin&password=admin123" -ContentType "application/x-www-form-urlencoded"
$TOKEN = $response.access_token
Write-Host "Token: $TOKEN"
```

Or using curl:
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

---

## 📊 Get System Stats

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/stats" -Headers @{Authorization="Bearer $TOKEN"}
```

```bash
curl -X GET "http://localhost:8000/api/admin/stats" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 👥 User Management

### Register New User (will be PENDING)
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" -Method Post -Body (@{
  email = "newuser@example.com"
  username = "newuser"
  password = "SecurePass123"
  full_name = "New User"
} | ConvertTo-Json) -ContentType "application/json"
```

```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","username":"newuser","password":"SecurePass123","full_name":"New User"}'
```

### Get Pending Users
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users/pending" -Headers @{Authorization="Bearer $TOKEN"}
```

```bash
curl -X GET "http://localhost:8000/api/admin/users/pending" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get All Users
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users" -Headers @{Authorization="Bearer $TOKEN"}
```

```bash
curl -X GET "http://localhost:8000/api/admin/users" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Specific User
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users/2" -Headers @{Authorization="Bearer $TOKEN"}
```

```bash
curl -X GET "http://localhost:8000/api/admin/users/2" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ✅ Approve User

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users/2/approve" -Method Post -Headers @{Authorization="Bearer $TOKEN"}
```

```bash
curl -X POST "http://localhost:8000/api/admin/users/2/approve" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ❌ Reject User

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users/2/reject" -Method Post -Headers @{Authorization="Bearer $TOKEN"}
```

```bash
curl -X POST "http://localhost:8000/api/admin/users/2/reject" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🚫 Suspend User

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users/2/suspend" -Method Post -Headers @{Authorization="Bearer $TOKEN"}
```

```bash
curl -X POST "http://localhost:8000/api/admin/users/2/suspend" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🗑️ Delete User

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users/2" -Method Delete -Headers @{Authorization="Bearer $TOKEN"}
```

```bash
curl -X DELETE "http://localhost:8000/api/admin/users/2" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔄 Complete Workflow Example

```powershell
# 1. Login as admin
$admin = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body "username=admin&password=admin123" -ContentType "application/x-www-form-urlencoded"
$TOKEN = $admin.access_token
$headers = @{Authorization="Bearer $TOKEN"}

# 2. Register a new user
$newUser = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" -Method Post -Body (@{
  email = "john@example.com"
  username = "john"
  password = "John123!@#"
  full_name = "John Doe"
} | ConvertTo-Json) -ContentType "application/json"

Write-Host "New user ID: $($newUser.user_id), Status: $($newUser.status)"

# 3. Try to login (should fail - PENDING)
try {
  Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body "username=john&password=John123!@#" -ContentType "application/x-www-form-urlencoded"
  Write-Host "ERROR: User logged in despite PENDING status!"
} catch {
  Write-Host "✅ Correctly blocked: $($_.Exception.Message)"
}

# 4. Get pending users
$pending = Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users/pending" -Headers $headers
Write-Host "`nPending users: $($pending.Count)"
$pending | Format-Table id, username, email, status

# 5. Approve the user
$USER_ID = $newUser.user_id
$approved = Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users/$USER_ID/approve" -Method Post -Headers $headers
Write-Host "`nUser approved: $($approved.username), Status: $($approved.status)"

# 6. Now login should succeed
$userLogin = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body "username=john&password=John123!@#" -ContentType "application/x-www-form-urlencoded"
Write-Host "✅ User logged in successfully!"
Write-Host "   Username: $($userLogin.user.username)"
Write-Host "   Role: $($userLogin.user.role)"

# 7. Get all users
$allUsers = Invoke-RestMethod -Uri "http://localhost:8000/api/admin/users" -Headers $headers
Write-Host "`nTotal users: $($allUsers.Count)"
$allUsers | Format-Table id, username, email, role, status, is_active

# 8. Get system stats
$stats = Invoke-RestMethod -Uri "http://localhost:8000/api/admin/stats" -Headers $headers
Write-Host "`nSystem Statistics:"
Write-Host "   Total Users: $($stats.total_users)"
Write-Host "   Pending: $($stats.pending_users)"
Write-Host "   Approved: $($stats.approved_users)"
Write-Host "   Sessions: $($stats.total_sessions)"
```

---

## 🔐 Security Tests

### Test unauthorized access (should fail)
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:8000/api/admin/stats"
} catch {
  Write-Host "✅ Correctly blocked: $($_.Exception.Message)"
}
```

### Test PENDING user login (should fail)
```powershell
# First register a user
$testUser = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" -Method Post -Body (@{
  email = "test@test.com"
  username = "test"
  password = "Test123"
  full_name = "Test"
} | ConvertTo-Json) -ContentType "application/json"

# Try to login immediately (should fail)
try {
  Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body "username=test&password=Test123" -ContentType "application/x-www-form-urlencoded"
  Write-Host "❌ SECURITY ISSUE: PENDING user logged in!"
} catch {
  Write-Host "✅ Correctly blocked PENDING user"
}
```

---

## 📋 All Available Admin Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register` | POST | Register new user (→ PENDING) | No |
| `/api/auth/login` | POST | Login (only APPROVED users) | No |
| `/api/auth/me` | GET | Get current user info | Yes |
| `/api/admin/stats` | GET | System statistics | Admin |
| `/api/admin/users/pending` | GET | Get pending users | Admin |
| `/api/admin/users` | GET | Get all users | Admin |
| `/api/admin/users/{id}` | GET | Get specific user | Admin |
| `/api/admin/users/{id}/approve` | POST | Approve user | Admin |
| `/api/admin/users/{id}/reject` | POST | Reject user | Admin |
| `/api/admin/users/{id}/suspend` | POST | Suspend user | Admin |
| `/api/admin/users/{id}` | DELETE | Delete user | Admin |

---

## 🚀 Quick Start

**Backend:**
```powershell
cd d:\cheating-daddy-master\parakeet-backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```powershell
cd d:\cheating-daddy-master\parakeet-frontend
npm run dev
```

**Run Full Test Suite:**
```powershell
cd d:\cheating-daddy-master
.\test_admin_api.ps1
```

**Admin Panel:**
- http://localhost:3000/sign-in → Login as `admin` / `admin123`
- http://localhost:3000/admin → Admin dashboard
