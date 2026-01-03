# Phase 2 Testing Guide

Complete testing procedures for all Phase 2 critical fixes.

---

## Quick Start

Run the automated test script:

```powershell
.\test-phase2.ps1
```

For verbose output with detailed information:

```powershell
.\test-phase2.ps1 -Verbose
```

---

## What Gets Tested

### Test 1: Standardized Error Handling (4 tests)
- ✅ Validation error response format
- ✅ Error code present in response
- ✅ ISO 8601 timestamp format
- ✅ All required fields present

### Test 2: Secure OAuth Cookies (5 tests)
- ✅ Auth cookie middleware exists
- ✅ Security headers present
- ✅ Content Security Policy header
- ✅ HSTS header (production)
- ✅ Rate limit headers still working

### Test 3: Database Connection Pool (4 tests)
- ✅ Pool max: 20 connections
- ✅ Pool min: 2 connections
- ✅ Idle timeout: 30000ms
- ✅ Connection timeout: 5000ms
- ✅ Statement timeout: 30000ms
- ✅ Pool monitoring added

### Test 4: HTTPS & Security Headers (5 tests)
- ✅ Security headers middleware exists
- ✅ HTTPS redirect middleware exists
- ✅ Referrer-Policy header
- ✅ Permissions-Policy header
- ✅ Rate limit headers still present

### Test 5: Error Handler Integration (4 tests)
- ✅ Error handler middleware file exists
- ✅ Error handler imported in server
- ✅ AppError class defined
- ✅ Error codes defined

**Total: 22 automated tests**

---

## Expected Output

```
=== Phase 2 Testing Suite ===
Testing all Phase 2 fixes

=== Test 1: Standardized Error Handling ===

Test 1.1: Validation Error Response Format
[PASS] Validation error format
[PASS] Error code present
[PASS] ISO 8601 timestamp

=== Test 2: Secure OAuth Cookies ===

[PASS] authCookie.ts exists
[PASS] Security headers present
[PASS] CSP header present
[PASS] HSTS header present
[PASS] Rate limit headers present

=== Test 3: Database Connection Pool ===

[PASS] Pool max: 20
[PASS] Pool min: 2
[PASS] Idle timeout: 30000ms
[PASS] Connection timeout: 5000ms
[PASS] Statement timeout: 30000ms
[PASS] Pool monitoring added

=== Test 4: HTTPS Enforcement & Security Headers ===

[PASS] securityHeaders.ts exists
[PASS] HTTPS redirect function exists
[PASS] Referrer-Policy header
[PASS] Permissions-Policy header
[PASS] Rate limit headers present

=== Test 5: Error Handler Integration ===

[PASS] errorHandler.ts exists
[PASS] Error handler imported in index.ts
[PASS] AppError class defined
[PASS] ErrorCodes defined

=== Test Summary ===

Total Tests: 22
Passed: 22
Failed: 0
Success Rate: 100%

All Phase 2 tests passed!

Phase 2 Fixes Verified:
  [OK] Standardized API Error Handling
  [OK] Secure OAuth Cookies
  [OK] Database Connection Pool Optimization
  [OK] HTTPS Enforcement & Security Headers

Ready for Phase 3!
```

---

## Manual Testing (Optional)

### Test Error Response Format

```powershell
# Test validation error
$body = @{
    email = "invalid"
    password = "short"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/signup" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -UseBasicParsing
```

**Expected Response:**
```json
{
  "error": "Validation error: ...",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "timestamp": "2024-01-02T21:50:00.000Z"
}
```

---

### Test Security Headers

```powershell
# Check all security headers
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/me" `
  -Method GET `
  -Headers @{"Authorization"="Bearer test"} `
  -UseBasicParsing

# Display headers
$response.Headers | Format-Table -AutoSize
```

**Expected Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000 (production only)
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
```

---

### Test Database Connection Pool

Check server logs for pool statistics:

```
[DB Pool Stats] { totalCount: 5, idleCount: 3, waitingCount: 0 }
```

This appears every 60 seconds in development mode.

---

### Test Error Codes

```powershell
# Test different error scenarios
$scenarios = @(
    @{ name = "Invalid Token"; endpoint = "/api/auth/me"; headers = @{"Authorization"="Bearer invalid"} },
    @{ name = "Not Found"; endpoint = "/api/projects/nonexistent"; headers = @{"Authorization"="Bearer test"} },
    @{ name = "Validation"; endpoint = "/api/auth/signup"; body = @{email="invalid"; password="short"} }
)

foreach ($scenario in $scenarios) {
    Write-Host "Testing: $($scenario.name)"
    try {
        Invoke-WebRequest -Uri "http://localhost:5000$($scenario.endpoint)" `
          -Method POST `
          -Headers @{"Content-Type"="application/json"; $scenario.headers} `
          -Body ($scenario.body | ConvertTo-Json) `
          -UseBasicParsing
    }
    catch {
        $error = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Error Code: $($error.code)"
        Write-Host "  Status: $($error.statusCode)"
        Write-Host ""
    }
}
```

---

## Troubleshooting

### Tests Fail: "Connection refused"
- **Issue:** Server not running
- **Solution:** Start server with `npm run dev`

### Tests Fail: "Invalid token"
- **Issue:** Normal behavior - we're testing error handling
- **Solution:** This is expected, tests should still pass

### Tests Fail: "Headers not found"
- **Issue:** Security headers middleware not loaded
- **Solution:** Verify `securityHeaders` imported in `index.ts`

### Tests Fail: "File not found"
- **Issue:** New files not created
- **Solution:** Verify all Phase 2 files exist:
  - `server/middleware/errorHandler.ts`
  - `server/middleware/authCookie.ts`
  - `server/middleware/securityHeaders.ts`

---

## Test Results Interpretation

### All Tests Pass (100%)
✅ Phase 2 is fully implemented and working correctly
✅ Ready to proceed to Phase 3

### Some Tests Fail
⚠️ Review failed tests and check:
1. Are all Phase 2 files created?
2. Are all imports correct?
3. Is the server running?
4. Check server logs for errors

### Most Tests Fail
❌ Phase 2 implementation may be incomplete
❌ Review PHASE2_IMPLEMENTATION_SUMMARY.md
❌ Verify all files were created correctly

---

## Next Steps After Testing

If all tests pass:
1. ✅ Phase 2 is verified
2. ✅ Ready for Phase 3
3. ✅ Proceed with logging infrastructure

If tests fail:
1. ⚠️ Review error messages
2. ⚠️ Check file creation
3. ⚠️ Verify imports
4. ⚠️ Restart server
5. ⚠️ Run tests again

---

## Test Script Features

- **Automated:** 22 tests run automatically
- **Colorized:** Pass/Fail clearly marked
- **Verbose Mode:** Detailed output with `-Verbose` flag
- **Summary:** Overall success rate and status
- **Fast:** Completes in seconds

---

## Files Tested

The test script verifies these files exist and are properly configured:

1. `server/middleware/errorHandler.ts` - Error handling
2. `server/middleware/authCookie.ts` - Secure cookies
3. `server/middleware/securityHeaders.ts` - Security headers
4. `server/index.ts` - Integration of all middleware
5. `server/db.ts` - Connection pool configuration
6. `server/routes/auth.ts` - OAuth updates

---

## Running the Tests

### Option 1: Quick Test (Recommended)
```powershell
.\test-phase2.ps1
```

### Option 2: Verbose Test (Detailed)
```powershell
.\test-phase2.ps1 -Verbose
```

### Option 3: Custom Base URL
```powershell
.\test-phase2.ps1 -BaseUrl "https://your-domain.com"
```

---

## Success Criteria

Phase 2 is considered complete when:
- ✅ All 22 tests pass
- ✅ Error responses are standardized
- ✅ Security headers are present
- ✅ OAuth tokens are in secure cookies
- ✅ Connection pool is optimized
- ✅ HTTPS redirect is configured

Once all criteria are met, proceed to Phase 3!
