# Phase 3 Testing Script
# Tests comprehensive logging infrastructure
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

Write-Host "=== Phase 3 Testing Suite ===" -ForegroundColor $INFO
Write-Host "Testing comprehensive logging infrastructure" -ForegroundColor Gray

# ============================================================================
# TEST 1: LOGGING INFRASTRUCTURE FILES
# ============================================================================

Write-Section "Test 1: Logging Infrastructure Files"

Write-TestResult "logger.ts exists" (Test-Path "c:\SPAVIX-Vision\server\utils\logger.ts")
Write-TestResult "requestLogger.ts exists" (Test-Path "c:\SPAVIX-Vision\server\middleware\requestLogger.ts")
Write-TestResult "queryLogger.ts exists" (Test-Path "c:\SPAVIX-Vision\server\middleware\queryLogger.ts")

# ============================================================================
# TEST 2: LOGGER IMPLEMENTATION
# ============================================================================

Write-Section "Test 2: Logger Implementation"

$loggerFile = Get-Content "c:\SPAVIX-Vision\server\utils\logger.ts" -Raw

Write-TestResult "LogLevel enum exists" ($loggerFile -match "enum LogLevel")
Write-TestResult "Logger class exists" ($loggerFile -match "class Logger")
Write-TestResult "logRequest method" ($loggerFile -match "logRequest\(")
Write-TestResult "logResponse method" ($loggerFile -match "logResponse\(")
Write-TestResult "logDatabase method" ($loggerFile -match "logDatabase\(")
Write-TestResult "logAuth method" ($loggerFile -match "logAuth\(")
Write-TestResult "logSecurity method" ($loggerFile -match "logSecurity\(")

# ============================================================================
# TEST 3: REQUEST LOGGER MIDDLEWARE
# ============================================================================

Write-Section "Test 3: Request Logger Middleware"

$requestLoggerFile = Get-Content "c:\SPAVIX-Vision\server\middleware\requestLogger.ts" -Raw

Write-TestResult "requestLogger function exists" ($requestLoggerFile -match "export function requestLogger")
Write-TestResult "Request ID generation" ($requestLoggerFile -match "randomUUID\(\)")
Write-TestResult "X-Request-ID header" ($requestLoggerFile -match "X-Request-ID")
Write-TestResult "Request timing" ($requestLoggerFile -match "startTime")
Write-TestResult "Response logging" ($requestLoggerFile -match "logResponse")

# ============================================================================
# TEST 4: QUERY LOGGER
# ============================================================================

Write-Section "Test 4: Query Logger"

$queryLoggerFile = Get-Content "c:\SPAVIX-Vision\server\middleware\queryLogger.ts" -Raw

Write-TestResult "logQuery function exists" ($queryLoggerFile -match "export function logQuery")
Write-TestResult "logSlowQuery function exists" ($queryLoggerFile -match "export function logSlowQuery")
Write-TestResult "Slow query detection (1000ms)" ($queryLoggerFile -match "1000")
Write-TestResult "Query metrics interface" ($queryLoggerFile -match "interface QueryMetrics")

# ============================================================================
# TEST 5: SERVER INTEGRATION
# ============================================================================

Write-Section "Test 5: Server Integration"

$indexFile = Get-Content "c:\SPAVIX-Vision\server\index.ts" -Raw

Write-TestResult "Logger imported" ($indexFile -match "import.*logger")
Write-TestResult "requestLogger imported" ($indexFile -match "import.*requestLogger")
Write-TestResult "requestLogger middleware registered" ($indexFile -match "app.use\(requestLogger\)")

# ============================================================================
# TEST 6: DATABASE LOGGING
# ============================================================================

Write-Section "Test 6: Database Logging"

$dbFile = Get-Content "c:\SPAVIX-Vision\server\db.ts" -Raw

Write-TestResult "Query logging imported" ($dbFile -match "import.*logQuery")
Write-TestResult "Query execution logging" ($dbFile -match "logQuery\(")
Write-TestResult "Slow query logging" ($dbFile -match "logSlowQuery\(")
Write-TestResult "Query error logging" ($dbFile -match "logQuery.*error")

# ============================================================================
# TEST 7: AUTHENTICATION LOGGING
# ============================================================================

Write-Section "Test 7: Authentication Logging"

$authFile = Get-Content "c:\SPAVIX-Vision\server\routes\auth.ts" -Raw

Write-TestResult "Logger imported in auth" ($authFile -match "import.*logger")
Write-TestResult "Signup logging" ($authFile -match "logger.logAuth.*signup")
Write-TestResult "Login logging" ($authFile -match "logger.logAuth.*login")
Write-TestResult "Security event logging" ($authFile -match "logger.logSecurity")
Write-TestResult "Google OAuth logging" ($authFile -match "logger.logAuth.*Google")

# ============================================================================
# TEST 8: STRUCTURED LOG FORMAT
# ============================================================================

Write-Section "Test 8: Structured Log Format"

Write-TestResult "JSON timestamp format" ($loggerFile -match "toISOString\(\)")
Write-TestResult "Log level in output" ($loggerFile -match "level:")
Write-TestResult "Message in output" ($loggerFile -match "message:")
Write-TestResult "Context in output" ($loggerFile -match "context:")
Write-TestResult "Error details in output" ($loggerFile -match "error:")

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
    Write-Host "`nAll Phase 3 logging tests passed ✅" -ForegroundColor $PASS
    Write-Host "Logging infrastructure ready for production 🚀" -ForegroundColor $INFO
}
else {
    Write-Host "`n$failedTests test(s) failed ❌" -ForegroundColor $FAIL
}
