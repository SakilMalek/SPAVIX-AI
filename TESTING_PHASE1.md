# Phase 1 Testing Guide

Complete testing procedures for all Phase 1 critical security fixes.

## Prerequisites

Before running tests, ensure:

1. **Environment Variables Set:**
   ```bash
   export JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
   export SESSION_SECRET="z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0v9"
   export GEMINI_API_KEY="your-actual-gemini-api-key"
   export DATABASE_URL="postgresql://user:password@localhost:5432/spavix_db"
   export FRONTEND_URL="http://localhost:5000"
   export NODE_ENV="development"
   ```

2. **Database Running:**
   ```bash
   # PostgreSQL must be running and accessible
   psql -U user -d spavix_db -c "SELECT 1;"
   ```

3. **Server Started:**
   ```bash
   npm run dev
   # Expected output: "✅ All required secrets validated successfully"
   # Expected output: "serving on port 5000"
   ```

---

## Test 1: JWT Secret Enforcement

### 1.1 Test Missing JWT_SECRET

**Objective:** Verify server fails if JWT_SECRET is not set

**Steps:**
```bash
# Stop the server
# Unset JWT_SECRET
unset JWT_SECRET

# Start server
npm run dev
```

**Expected Result:**
```
❌ Secret validation failed: FATAL: JWT_SECRET environment variable is required...
```

**Pass/Fail:** ✅ PASS if server exits with error message

---

### 1.2 Test Weak JWT_SECRET

**Objective:** Verify server rejects JWT_SECRET shorter than 32 characters

**Steps:**
```bash
# Stop the server
export JWT_SECRET="short"

# Start server
npm run dev
```

**Expected Result:**
```
❌ Secret validation failed: FATAL: JWT_SECRET must be at least 32 characters long...
```

**Pass/Fail:** ✅ PASS if server exits with error message

---

### 1.3 Test Valid JWT_SECRET

**Objective:** Verify server starts with valid JWT_SECRET

**Steps:**
```bash
# Stop the server
export JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"

# Start server
npm run dev
```

**Expected Result:**
```
✅ All required secrets validated successfully
[timestamp] [express] serving on port 5000
```

**Pass/Fail:** ✅ PASS if server starts successfully

---

### 1.4 Test JWT Token Validation

**Objective:** Verify JWT tokens are signed with the correct secret

**Steps:**
```bash
# 1. Sign up a new user
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "profilePicture": "avatar-1"
  }'

# Expected response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": { "id": "...", "email": "test@example.com", ... }
# }

# 2. Save the token
TOKEN="<token-from-response>"

# 3. Use token to access protected endpoint
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# { "id": "...", "email": "test@example.com", ... }
```

**Pass/Fail:** ✅ PASS if token works and user data is returned

---

## Test 2: Secure Share IDs & Rate Limiting

### 2.1 Test Secure Share ID Generation

**Objective:** Verify share IDs are cryptographically random

**Steps:**
```bash
# 1. Create a generation (requires authentication)
curl -X POST http://localhost:5000/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "roomType": "bedroom",
    "style": "modern",
    "materials": {}
  }'

# Save the generationId from response

# 2. Create a share link
GENERATION_ID="<id-from-response>"
curl -X POST http://localhost:5000/api/generations/$GENERATION_ID/share \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# { "success": true, "shareId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" }

# 3. Verify share ID format (32 hex characters)
SHARE_ID="<shareId-from-response>"
echo $SHARE_ID | grep -E '^[a-f0-9]{32}$'
```

**Expected Result:**
- Share ID matches pattern `^[a-f0-9]{32}$`
- Each share ID is different (run multiple times)

**Pass/Fail:** ✅ PASS if share IDs are 32-character hex strings

---

### 2.2 Test Rate Limiting - Login Endpoint

**Objective:** Verify login endpoint has rate limiting (5 attempts per 15 minutes)

**Steps:**
```bash
# Make 6 login attempts in quick succession
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wrongpassword"
    }' -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

**Expected Result:**
- Attempts 1-5: Status 401 (Invalid credentials)
- Attempt 6: Status 429 (Too Many Requests)
- Response includes: `"error": "Too many login attempts..."`

**Pass/Fail:** ✅ PASS if 6th request returns 429

---

### 2.3 Test Rate Limiting - Signup Endpoint

**Objective:** Verify signup endpoint has rate limiting (3 attempts per hour)

**Steps:**
```bash
# Make 4 signup attempts in quick succession
for i in {1..4}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:5000/api/auth/signup \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"test$i@example.com\",
      \"password\": \"password123\"
    }" -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

**Expected Result:**
- Attempts 1-3: Status 200 or 409 (success or user exists)
- Attempt 4: Status 429 (Too Many Requests)

**Pass/Fail:** ✅ PASS if 4th request returns 429

---

### 2.4 Test Rate Limiting - Generation Endpoint

**Objective:** Verify generation endpoint has rate limiting (10 per hour per user)

**Steps:**
```bash
# Make 11 generation requests
for i in {1..11}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:5000/api/generations \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "roomType": "bedroom",
      "style": "modern"
    }' -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

**Expected Result:**
- Attempts 1-10: Status 500 or 200 (processing)
- Attempt 11: Status 429 (Too Many Requests)

**Pass/Fail:** ✅ PASS if 11th request returns 429

---

### 2.5 Test Rate Limit Headers

**Objective:** Verify rate limit headers are present in responses

**Steps:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -v
```

**Expected Result:**
```
< X-RateLimit-Limit: 100
< X-RateLimit-Remaining: 99
< X-RateLimit-Reset: 1234567890
```

**Pass/Fail:** ✅ PASS if headers are present

---

## Test 3: PostgreSQL Session Store

### 3.1 Test Session Persistence

**Objective:** Verify sessions persist across server restarts

**Steps:**
```bash
# 1. Login to create a session
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 2. Verify session works
curl -b cookies.txt http://localhost:5000/api/auth/me

# Expected: User data returned

# 3. Stop the server
# Ctrl+C in the terminal running npm run dev

# 4. Start the server again
npm run dev

# 5. Use the same session cookie
curl -b cookies.txt http://localhost:5000/api/auth/me

# Expected: User data still returned (session persisted)
```

**Pass/Fail:** ✅ PASS if session works after restart

---

### 3.2 Test Session Table Creation

**Objective:** Verify PostgreSQL session table is created automatically

**Steps:**
```bash
# Connect to PostgreSQL
psql -U user -d spavix_db

# Check if session table exists
\dt session

# Expected output:
# List of relations
#  Schema | Name    | Type  | Owner
# --------+---------+-------+-------
#  public | session | table | user
```

**Pass/Fail:** ✅ PASS if session table exists

---

### 3.3 Test Session Secret Enforcement

**Objective:** Verify SESSION_SECRET is required

**Steps:**
```bash
# Stop the server
unset SESSION_SECRET

# Start server
npm run dev
```

**Expected Result:**
```
❌ Secret validation failed: FATAL: SESSION_SECRET environment variable is required...
```

**Pass/Fail:** ✅ PASS if server exits with error

---

## Test 4: Input Validation

### 4.1 Test Invalid Email Validation

**Objective:** Verify invalid emails are rejected

**Steps:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123"
  }'
```

**Expected Result:**
```json
{
  "error": "Validation error: email: Invalid email address"
}
```

**Pass/Fail:** ✅ PASS if validation error returned

---

### 4.2 Test Short Password Validation

**Objective:** Verify passwords shorter than 8 characters are rejected

**Steps:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "short"
  }'
```

**Expected Result:**
```json
{
  "error": "Validation error: password: Password must be at least 8 characters"
}
```

**Pass/Fail:** ✅ PASS if validation error returned

---

### 4.3 Test Project Name Validation

**Objective:** Verify project names have length limits

**Steps:**
```bash
# Test empty name
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "", "description": "test"}'

# Expected: Validation error

# Test oversized name (256+ characters)
LONG_NAME=$(printf 'a%.0s' {1..300})
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$LONG_NAME\", \"description\": \"test\"}"

# Expected: Validation error
```

**Expected Result:**
```json
{
  "error": "Validation error: name: String must contain at most 255 character(s)"
}
```

**Pass/Fail:** ✅ PASS if validation errors returned

---

### 4.4 Test Description Length Validation

**Objective:** Verify descriptions have max 2000 character limit

**Steps:**
```bash
# Create description with 2001 characters
LONG_DESC=$(printf 'a%.0s' {1..2001})
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test\", \"description\": \"$LONG_DESC\"}"
```

**Expected Result:**
```json
{
  "error": "Validation error: description: String must contain at most 2000 character(s)"
}
```

**Pass/Fail:** ✅ PASS if validation error returned

---

## Test 5: Python Process Cleanup

### 5.1 Test Process Termination on Error

**Objective:** Verify Python processes are terminated on error

**Steps:**
```bash
# 1. Monitor Python processes
watch -n 1 'ps aux | grep python | grep -v grep | wc -l'

# 2. In another terminal, send invalid generation request
curl -X POST http://localhost:5000/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "data:image/png;base64,invalid",
    "roomType": "bedroom",
    "style": "modern"
  }'

# 3. Watch the process count - should return to 0 after error
```

**Expected Result:**
- Process count increases when request is made
- Process count returns to 0 after error (no zombie processes)

**Pass/Fail:** ✅ PASS if no zombie processes remain

---

### 5.2 Test Temporary File Cleanup

**Objective:** Verify temporary files are cleaned up on error

**Steps:**
```bash
# 1. Check backend_output directory before test
ls -la backend_output/ | wc -l

# 2. Send invalid generation request
curl -X POST http://localhost:5000/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "data:image/png;base64,invalid",
    "roomType": "bedroom",
    "style": "modern"
  }'

# 3. Check backend_output directory after test
ls -la backend_output/ | wc -l

# 4. Check server logs for cleanup messages
# Expected: "[Gemini] Cleaned up: /path/to/input_*.png"
```

**Expected Result:**
- File count doesn't increase significantly
- Cleanup messages in logs
- No orphaned temporary files

**Pass/Fail:** ✅ PASS if files are cleaned up

---

### 5.3 Test Process Timeout Handling

**Objective:** Verify processes are killed after timeout

**Steps:**
```bash
# 1. Modify gemini_image_generate.py to add a long sleep (for testing only)
# Add: import time; time.sleep(400) at the start

# 2. Send generation request
curl -X POST http://localhost:5000/api/generations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "roomType": "bedroom",
    "style": "modern"
  }'

# 3. Wait 5+ minutes and check logs
# Expected: "[Gemini] Process timeout - killing Python process"
# Expected: "[Gemini] SIGTERM failed - force killing with SIGKILL"

# 4. Verify no zombie processes
ps aux | grep python | grep -v grep
```

**Expected Result:**
- Timeout message in logs after 5 minutes
- Process killed with SIGKILL
- No zombie processes

**Pass/Fail:** ✅ PASS if process is properly terminated

---

## Automated Test Script

Save this as `test-phase1.sh`:

```bash
#!/bin/bash

set -e

echo "=== Phase 1 Testing Suite ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function
test_endpoint() {
  local name=$1
  local method=$2
  local url=$3
  local data=$4
  local expected_status=$5
  local token=$6

  echo -n "Testing: $name... "
  
  if [ -z "$token" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
      -H "Content-Type: application/json" \
      -d "$data")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  status=$(echo "$response" | tail -n1)
  
  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}PASS${NC} (Status: $status)"
    ((PASSED++))
  else
    echo -e "${RED}FAIL${NC} (Expected: $expected_status, Got: $status)"
    ((FAILED++))
  fi
}

# Run tests
echo "1. Testing JWT Secret Enforcement"
test_endpoint "Valid signup" "POST" "http://localhost:5000/api/auth/signup" \
  '{"email":"test@example.com","password":"password123"}' "200"

echo ""
echo "2. Testing Input Validation"
test_endpoint "Invalid email" "POST" "http://localhost:5000/api/auth/signup" \
  '{"email":"invalid","password":"password123"}' "400"

test_endpoint "Short password" "POST" "http://localhost:5000/api/auth/signup" \
  '{"email":"test2@example.com","password":"short"}' "400"

echo ""
echo "=== Test Results ==="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
```

Run with:
```bash
chmod +x test-phase1.sh
./test-phase1.sh
```

---

## Checklist

- [ ] JWT Secret enforcement verified
- [ ] Secure share IDs verified
- [ ] Rate limiting on login verified
- [ ] Rate limiting on signup verified
- [ ] Rate limiting on generation verified
- [ ] Session persistence verified
- [ ] Session table created in PostgreSQL
- [ ] Input validation for email verified
- [ ] Input validation for password verified
- [ ] Input validation for project name verified
- [ ] Input validation for description verified
- [ ] Python process cleanup verified
- [ ] No zombie processes after errors
- [ ] Temporary files cleaned up
- [ ] Process timeout handling verified

---

## Troubleshooting

### Server won't start - JWT_SECRET error
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# If empty, set it
export JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

### Database connection error
```bash
# Verify PostgreSQL is running
psql -U user -d spavix_db -c "SELECT 1;"

# If not running, start it
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### Rate limiting not working
```bash
# Check if rate limit middleware is loaded
grep -n "rateLimit" server/index.ts

# Verify rate limit cleanup is running
grep -n "startRateLimitCleanup" server/index.ts
```

### Session not persisting
```bash
# Check session table exists
psql -U user -d spavix_db -c "\dt session"

# Check SESSION_SECRET is set
echo $SESSION_SECRET
```
