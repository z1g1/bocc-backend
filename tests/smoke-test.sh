#!/bin/bash
# Smoke test for BOCC backend API
# Tests the checkin endpoint with debug flag to verify API is working

set -e

# Configuration
API_URL="${API_URL:-http://localhost:8888/.netlify/functions/checkin}"
TIMESTAMP=$(date +%s)
TEST_EMAIL="smoke-test-${TIMESTAMP}@test.local"
TEST_TOKEN="${TEST_TOKEN:-test-smoke-token}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "BOCC Backend API Smoke Test"
echo "=========================================="
echo "Testing: ${API_URL}"
echo "Test email: ${TEST_EMAIL}"
echo ""

# Test payload with debug flag
PAYLOAD=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "name": "Smoke Test User",
  "phone": "555-0100",
  "businessName": "Smoke Test Co",
  "okToEmail": true,
  "eventId": "smoke-test",
  "debug": "1",
  "token": "${TEST_TOKEN}"
}
EOF
)

echo "Sending test request..."
echo ""

# Make the request and capture response
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

# Extract response body (all but last line)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response:"
echo "${BODY}" | jq '.' 2>/dev/null || echo "${BODY}"
echo ""
echo "HTTP Status: ${HTTP_CODE}"
echo ""

# Verify response
if [ "${HTTP_CODE}" = "200" ]; then
  # Check if response contains success message
  if echo "${BODY}" | grep -q "Check-in successful"; then
    echo -e "${GREEN}✓ Smoke test PASSED${NC}"
    echo "  - API is responding"
    echo "  - Check-in endpoint working"
    echo "  - Debug flag accepted"
    exit 0
  else
    echo -e "${RED}✗ Smoke test FAILED${NC}"
    echo "  - Expected 'Check-in successful' in response"
    echo "  - Got: ${BODY}"
    exit 1
  fi
else
  echo -e "${RED}✗ Smoke test FAILED${NC}"
  echo "  - Expected HTTP 200, got ${HTTP_CODE}"
  echo "  - Response: ${BODY}"
  exit 1
fi
