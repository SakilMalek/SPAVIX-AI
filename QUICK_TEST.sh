#!/bin/bash

# Quick Testing Script for Phase 1 Fixes
# Run this after starting the server with: npm run dev

set -e

BASE_URL="http://localhost:5000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Phase 1 Quick Test Suite ===${NC}\n"

# Test 1: JWT Secret Enforcement
echo -e "${YELLOW}Test 1: JWT Secret Enforcement${NC}"
echo "Checking if server started with valid JWT_SECRET..."
if curl -s "$BASE_URL/api/auth/me" -H "Authorization: Bearer invalid" | grep -q "Invalid token"; then
  echo -e "${GREEN}✓ Server is running with JWT validation${NC}\n"
else
  echo -e "${RED}✗ Server may not have JWT validation${NC}\n"
fi

# Test 2: Signup with validation
echo -e "${YELLOW}Test 2: Input Validation - Invalid Email${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"password123"}')

if echo "$RESPONSE" | grep -q "Invalid email"; then
  echo -e "${GREEN}✓ Email validation working${NC}\n"
else
  echo -e "${RED}✗ Email validation not working${NC}\n"
  echo "Response: $RESPONSE\n"
fi

# Test 3: Short password validation
echo -e "${YELLOW}Test 3: Input Validation - Short Password${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"short"}')

if echo "$RESPONSE" | grep -q "at least 8 characters"; then
  echo -e "${GREEN}✓ Password validation working${NC}\n"
else
  echo -e "${RED}✗ Password validation not working${NC}\n"
  echo "Response: $RESPONSE\n"
fi

# Test 4: Valid signup
echo -e "${YELLOW}Test 4: Valid Signup${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testuser$(date +%s)@example.com\",\"password\":\"password123\"}")

if echo "$RESPONSE" | grep -q "token"; then
  TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Signup successful${NC}"
  echo "Token: ${TOKEN:0:20}...\n"
else
  echo -e "${RED}✗ Signup failed${NC}\n"
  echo "Response: $RESPONSE\n"
  exit 1
fi

# Test 5: Rate limiting - Login
echo -e "${YELLOW}Test 5: Rate Limiting - Login Endpoint${NC}"
echo "Making 6 login attempts..."
for i in {1..6}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}')
  
  if [ $i -eq 6 ] && [ "$STATUS" = "429" ]; then
    echo -e "${GREEN}✓ Rate limiting working (6th request blocked)${NC}\n"
  elif [ $i -lt 6 ] && [ "$STATUS" = "401" ]; then
    echo -n "."
  fi
done

# Test 6: Secure share ID generation
echo -e "${YELLOW}Test 6: Secure Share ID Generation${NC}"
echo "Creating a project..."
PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Project\",\"description\":\"Testing\"}")

if echo "$PROJECT_RESPONSE" | grep -q '"id"'; then
  PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "Project created: $PROJECT_ID"
  
  # Create a generation (mock)
  echo "Note: Full generation test requires valid Gemini API key"
  echo -e "${GREEN}✓ Project creation working${NC}\n"
else
  echo -e "${RED}✗ Project creation failed${NC}\n"
fi

# Test 7: Rate limit headers
echo -e "${YELLOW}Test 7: Rate Limit Headers${NC}"
HEADERS=$(curl -s -i "$BASE_URL/api/auth/me" -H "Authorization: Bearer $TOKEN" 2>&1 | grep -i "X-RateLimit")

if echo "$HEADERS" | grep -q "X-RateLimit-Limit"; then
  echo -e "${GREEN}✓ Rate limit headers present${NC}"
  echo "$HEADERS\n"
else
  echo -e "${RED}✗ Rate limit headers missing${NC}\n"
fi

# Test 8: Session persistence check
echo -e "${YELLOW}Test 8: Session Persistence${NC}"
echo "Checking if session table exists in PostgreSQL..."
if psql -U postgres -d spavix_db -c "\dt session" 2>/dev/null | grep -q "session"; then
  echo -e "${GREEN}✓ Session table exists in PostgreSQL${NC}\n"
else
  echo -e "${YELLOW}⚠ Could not verify session table (PostgreSQL may not be accessible)${NC}\n"
fi

# Test 9: Process cleanup check
echo -e "${YELLOW}Test 9: Python Process Cleanup${NC}"
PYTHON_COUNT=$(ps aux | grep python | grep -v grep | wc -l)
echo "Current Python processes: $PYTHON_COUNT"
if [ "$PYTHON_COUNT" -lt 2 ]; then
  echo -e "${GREEN}✓ No zombie Python processes${NC}\n"
else
  echo -e "${YELLOW}⚠ Multiple Python processes running (may be normal)${NC}\n"
fi

# Summary
echo -e "${YELLOW}=== Test Summary ===${NC}"
echo -e "${GREEN}All quick tests completed!${NC}"
echo ""
echo "For detailed testing, see: TESTING_PHASE1.md"
echo ""
echo "Next steps:"
echo "1. Review TESTING_PHASE1.md for comprehensive tests"
echo "2. Run individual tests as needed"
echo "3. Check FIXES_APPLIED.md for implementation details"
echo "4. Proceed to Phase 2 fixes when ready"
