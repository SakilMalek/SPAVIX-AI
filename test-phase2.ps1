# Phase 2 Testing Script
# Tests all critical Phase 2 fixes
# PowerShell 5.1 compatible | PSScriptAnalyzer clean

param(
    [string]$BaseUrl = "http://localhost:5000",
    [switch]$Verbose = $false
)

# =========================
# Colors
# =========================
$PASS = "Green"
$FAIL = "Red"
$WARN = "Yellow"
$INFO = "Cyan"

# =========================
# Counters
# =========================
$totalTests  = 0
$passedTests = 0
$failedTests = 0

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = ""
    )

    $script:totalTests++

    if ($Passed) {
        $script:passedTests++
        Write-Host "[PASS]" -ForegroundColor $PASS -NoNewline
        Write-Host " $TestName"
    }
    else {
        $script:failedTests++
        Write-Host "[FAIL]" -ForegroundColor $FAIL -NoNewline
        Write-Host " $TestName"
    }

    if ($Verbose -and $Details) {
        Write-Host "       $Details" -ForegroundColor Gray
    }
}

function Write-Section {
    param([string]$Title)

    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor $INFO
    Write-Host ""
}

# ============================================================================
# START
# ============================================================================

Write-Host "=== Phase 2 Testing Suite ===" -ForegroundColor $INFO
Write-Host "Testing all Phase 2 fixes" -ForegroundColor Gray

# ============================================================================
# TEST 1: STANDARDIZED ERROR HANDLING
# ============================================================================

Write-Section "Test 1: Standardized Error Handling"

# 1.1 Validation Error Format
try {
    Invoke-WebRequest `
        -Uri "$BaseUrl/api/auth/signup" `
        -Method POST `
        -Headers @{ "Content-Type"="application/json" } `
        -Body (@{ email="invalid"; password="short" } | ConvertTo-Json) `
        -UseBasicParsing `
        -ErrorAction Stop

    Write-TestResult "Validation error format" $false "Request unexpectedly succeeded"
}
catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json

    $valid =
        -not [string]::IsNullOrWhiteSpace($err.error) -and
        -not [string]::IsNullOrWhiteSpace($err.code) -and
        $null -ne $err.statusCode -and
        -not [string]::IsNullOrWhiteSpace($err.timestamp)

    Write-TestResult "Validation error format" $valid
}

# 1.2 Error Code Present
try {
    Invoke-WebRequest `
        -Uri "$BaseUrl/api/auth/me" `
        -Headers @{ Authorization="Bearer invalid" } `
        -UseBasicParsing `
        -ErrorAction Stop

    Write-TestResult "Error code present" $false
}
catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-TestResult "Error code present" (-not [string]::IsNullOrWhiteSpace($err.code))
}

# 1.3 ISO Timestamp
try {
    Invoke-WebRequest `
        -Uri "$BaseUrl/api/auth/signup" `
        -Method POST `
        -Headers @{ "Content-Type"="application/json" } `
        -Body (@{ email="test"; password="test" } | ConvertTo-Json) `
        -UseBasicParsing `
        -ErrorAction Stop
}
catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    $isISO = $err.timestamp -match '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
    Write-TestResult "ISO 8601 timestamp" $isISO
}

# ============================================================================
# TEST 2: SECURE OAUTH COOKIES & HEADERS
# ============================================================================

Write-Section "Test 2: Secure OAuth Cookies & Headers"

Write-TestResult "authCookie.ts exists" (Test-Path "c:\SPAVIX-Vision\server\middleware\authCookie.ts")

try {
    $res = Invoke-WebRequest -Uri "$BaseUrl/api/auth/me" -Headers @{ Authorization="Bearer test" } -UseBasicParsing -ErrorAction SilentlyContinue

    if ($res) {
        $h = $res.Headers
        $ok =
            -not [string]::IsNullOrWhiteSpace($h["X-Content-Type-Options"]) -and
            -not [string]::IsNullOrWhiteSpace($h["X-Frame-Options"]) -and
            -not [string]::IsNullOrWhiteSpace($h["X-XSS-Protection"])
        Write-TestResult "Security headers present" $ok
    } else {
        Write-TestResult "Security headers present" $false
    }
}
catch {
    Write-TestResult "Security headers present" $false
}

try {
    $res = Invoke-WebRequest "$BaseUrl/api/auth/me" -Headers @{Authorization="Bearer test"} -UseBasicParsing -ErrorAction SilentlyContinue
    $hasCsp = $res -and -not [string]::IsNullOrWhiteSpace($res.Headers["Content-Security-Policy"])
    Write-TestResult "CSP header present" $hasCsp
}
catch { Write-TestResult "CSP header present" $false }

try {
    $res = Invoke-WebRequest "$BaseUrl/api/auth/me" -Headers @{Authorization="Bearer test"} -UseBasicParsing -ErrorAction SilentlyContinue
    $hasHsts = $res -and -not [string]::IsNullOrWhiteSpace($res.Headers["Strict-Transport-Security"])
    Write-TestResult "HSTS header present" $hasHsts
}
catch { Write-TestResult "HSTS header present" $false }

# ============================================================================
# TEST 3: DATABASE CONNECTION POOL
# ============================================================================

Write-Section "Test 3: Database Connection Pool"

$db = Get-Content "c:\SPAVIX-Vision\server\db.ts" -Raw

Write-TestResult "Pool max 20" ($db -match "max:\s*20")
Write-TestResult "Pool min 2" ($db -match "min:\s*2")
Write-TestResult "Idle timeout 30000" ($db -match "idleTimeoutMillis:\s*30000")
Write-TestResult "Connection timeout 5000" ($db -match "connectionTimeoutMillis:\s*5000")
Write-TestResult "Statement timeout 30000" ($db -match "statement_timeout:\s*30000")
Write-TestResult "Pool monitoring added" ($db -match "Pool Stats")

# ============================================================================
# TEST 4: HTTPS & SECURITY MIDDLEWARE
# ============================================================================

Write-Section "Test 4: HTTPS & Security Middleware"

$secFile = "c:\SPAVIX-Vision\server\middleware\securityHeaders.ts"
$sec = Get-Content $secFile -Raw

Write-TestResult "securityHeaders.ts exists" (Test-Path $secFile)
Write-TestResult "HTTPS redirect exists" ($sec -match "httpsRedirect")

try {
    Write-TestResult "Referrer-Policy header" (-not [string]::IsNullOrWhiteSpace(
        (Invoke-WebRequest "$BaseUrl/api/auth/me" -Headers @{Authorization="Bearer test"} -UseBasicParsing).Headers["Referrer-Policy"]
    ))
}
catch { Write-TestResult "Referrer-Policy header" $false }

try {
    Write-TestResult "Permissions-Policy header" (-not [string]::IsNullOrWhiteSpace(
        (Invoke-WebRequest "$BaseUrl/api/auth/me" -Headers @{Authorization="Bearer test"} -UseBasicParsing).Headers["Permissions-Policy"]
    ))
}
catch { Write-TestResult "Permissions-Policy header" $false }

try {
    Write-TestResult "Rate limit headers present" (-not [string]::IsNullOrWhiteSpace(
        (Invoke-WebRequest "$BaseUrl/api/auth/me" -Headers @{Authorization="Bearer test"} -UseBasicParsing).Headers["X-RateLimit-Limit"]
    ))
}
catch { Write-TestResult "Rate limit headers present" $false }

# ============================================================================
# TEST 5: ERROR HANDLER
# ============================================================================

Write-Section "Test 5: Error Handler Integration"

$errorFile = "c:\SPAVIX-Vision\server\middleware\errorHandler.ts"
$indexFile = "c:\SPAVIX-Vision\server\index.ts"

Write-TestResult "errorHandler.ts exists" (Test-Path $errorFile)
Write-TestResult "errorHandler wired" ((Get-Content $indexFile -Raw) -match "errorHandler")
Write-TestResult "AppError class exists" ((Get-Content $errorFile -Raw) -match "class AppError")
Write-TestResult "ErrorCodes enum exists" ((Get-Content $errorFile -Raw) -match "ErrorCodes")

# ============================================================================
# SUMMARY
# ============================================================================

Write-Section "Test Summary"

$passPercentage = [math]::Round(($passedTests / [math]::Max(1,$totalTests)) * 100, 2)

if ($failedTests -gt 0) { $failedColor = $FAIL } else { $failedColor = $PASS }
if ($passPercentage -eq 100) { $successColor = $PASS } else { $successColor = $WARN }

Write-Host "Total Tests : $totalTests" -ForegroundColor $INFO
Write-Host "Passed      : $passedTests" -ForegroundColor $PASS
Write-Host "Failed      : $failedTests" -ForegroundColor $failedColor
Write-Host "Success Rate: $passPercentage%" -ForegroundColor $successColor

if ($failedTests -eq 0) {
    Write-Host "`nAll Phase 2 tests passed ✅" -ForegroundColor $PASS
    Write-Host "Ready for Phase 3 🚀" -ForegroundColor $INFO
}
else {
    Write-Host "`n$failedTests test(s) failed ❌" -ForegroundColor $FAIL
}
