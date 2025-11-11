#!/bin/bash
# Simplified Test Suite Runner - More robust JSON handling

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# API Configuration
API_URL="${API_URL:-http://localhost:3000}"
FIRM_ID="f1111111-1111-1111-1111-111111111111"

# Test data
ACCESS_TOKEN=""
USER_ID=""
DOCUMENT_ID=""
TEMPLATE_ID=""
TEST_EMAIL="test.$(date +%s)@acme.com"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Demand Letter Generator - Test Results${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Health Check
echo -n "Test 1: Health Check... "
RESP=$(curl -s -w "\n%{http_code}" "$API_URL/health")
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" = "200" ]; then
    echo -e "${GREEN}PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (HTTP $CODE)"
    ((FAILED++))
fi
((TOTAL++))

# Test 2: User Registration
echo -n "Test 2: User Registration... "
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"SecurePass123!\",\"firstName\":\"Test\",\"lastName\":\"User\",\"firmId\":\"$FIRM_ID\"}")
CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | head -n-1)
if [ "$CODE" = "201" ]; then
    USER_ID=$(echo "$BODY" | grep -o '"userId":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}PASS${NC} (User: ${USER_ID:0:8}...)"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (HTTP $CODE)"
    ((FAILED++))
fi
((TOTAL++))

# Test 3: User Login
echo -n "Test 3: User Login... "
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"SecurePass123!\",\"firmId\":\"$FIRM_ID\"}")
CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | head -n-1)
if [ "$CODE" = "200" ]; then
    ACCESS_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}PASS${NC} (Token obtained)"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (HTTP $CODE)"
    echo "  Response: $BODY"
    ((FAILED++))
    echo -e "\n${RED}Cannot proceed without authentication${NC}"
    exit 1
fi
((TOTAL++))

# Test 4: Get Current User
echo -n "Test 4: Get Current User Profile... "
RESP=$(curl -s -w "\n%{http_code}" "$API_URL/users/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" = "200" ]; then
    echo -e "${GREEN}PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (HTTP $CODE)"
    ((FAILED++))
fi
((TOTAL++))

# Test 5: List Firm Users
echo -n "Test 5: List Firm Users... "
RESP=$(curl -s -w "\n%{http_code}" "$API_URL/firms/$FIRM_ID/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" = "200" ]; then
    echo -e "${GREEN}PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (HTTP $CODE)"
    ((FAILED++))
fi
((TOTAL++))

# Test 6: Upload PDF Document
if [ -f "test-files/minimal-test.pdf" ]; then
    echo -n "Test 6: Upload PDF Document... "
    RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/documents/upload" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -F "file=@test-files/minimal-test.pdf")
    CODE=$(echo "$RESP" | tail -n1)
    BODY=$(echo "$RESP" | head -n-1)
    if [ "$CODE" = "201" ]; then
        DOCUMENT_ID=$(echo "$BODY" | grep -o '"documentId":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}PASS${NC} (Doc: ${DOCUMENT_ID:0:8}...)"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (HTTP $CODE)"
        ((FAILED++))
    fi
    ((TOTAL++))
else
    echo -e "Test 6: Upload PDF Document... ${YELLOW}SKIP${NC} (file not found)"
    ((SKIPPED++))
    ((TOTAL++))
fi

# Test 7: Upload Image
if [ -f "test-files/test-image.png" ]; then
    echo -n "Test 7: Upload Image File... "
    RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/documents/upload" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -F "file=@test-files/test-image.png")
    CODE=$(echo "$RESP" | tail -n1)
    if [ "$CODE" = "201" ]; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (HTTP $CODE)"
        ((FAILED++))
    fi
    ((TOTAL++))
else
    echo -e "Test 7: Upload Image File... ${YELLOW}SKIP${NC} (file not found)"
    ((SKIPPED++))
    ((TOTAL++))
fi

# Test 8: Reject Invalid File Type
if [ -f "test-files/dangerous.sh" ]; then
    echo -n "Test 8: Reject Invalid File Type... "
    RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/documents/upload" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -F "file=@test-files/dangerous.sh")
    CODE=$(echo "$RESP" | tail -n1)
    if [ "$CODE" = "400" ]; then
        echo -e "${GREEN}PASS${NC} (correctly rejected)"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (Expected 400, got $CODE)"
        ((FAILED++))
    fi
    ((TOTAL++))
else
    echo -e "Test 8: Reject Invalid File Type... ${YELLOW}SKIP${NC} (file not found)"
    ((SKIPPED++))
    ((TOTAL++))
fi

# Test 9: List Documents
echo -n "Test 9: List Documents... "
RESP=$(curl -s -w "\n%{http_code}" "$API_URL/documents" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" = "200" ]; then
    echo -e "${GREEN}PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (HTTP $CODE)"
    ((FAILED++))
fi
((TOTAL++))

# Test 10: Get Document Details
if [ -n "$DOCUMENT_ID" ]; then
    echo -n "Test 10: Get Document Details... "
    RESP=$(curl -s -w "\n%{http_code}" "$API_URL/documents/$DOCUMENT_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    CODE=$(echo "$RESP" | tail -n1)
    if [ "$CODE" = "200" ]; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (HTTP $CODE)"
        ((FAILED++))
    fi
    ((TOTAL++))
else
    echo -e "Test 10: Get Document Details... ${YELLOW}SKIP${NC} (no document ID)"
    ((SKIPPED++))
    ((TOTAL++))
fi

# Test 11: Generate Download URL
if [ -n "$DOCUMENT_ID" ]; then
    echo -n "Test 11: Generate Download URL... "
    RESP=$(curl -s -w "\n%{http_code}" "$API_URL/documents/$DOCUMENT_ID/download" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    CODE=$(echo "$RESP" | tail -n1)
    if [ "$CODE" = "200" ]; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (HTTP $CODE)"
        ((FAILED++))
    fi
    ((TOTAL++))
else
    echo -e "Test 11: Generate Download URL... ${YELLOW}SKIP${NC} (no document ID)"
    ((SKIPPED++))
    ((TOTAL++))
fi

# Test 12: Create Template
echo -n "Test 12: Create Template... "
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/templates" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Template","description":"Automated test","content":"Dear {{defendant_name}},\n\nI demand {{demand_amount}}.\n\nSincerely,\n{{attorney_name}}","isDefault":false}')
CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | head -n-1)
if [ "$CODE" = "201" ]; then
    TEMPLATE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}PASS${NC} (Template: ${TEMPLATE_ID:0:8}...)"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (HTTP $CODE)"
    echo "  Response: $BODY"
    ((FAILED++))
fi
((TOTAL++))

# Test 13: List Templates
echo -n "Test 13: List Templates... "
RESP=$(curl -s -w "\n%{http_code}" "$API_URL/templates" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" = "200" ]; then
    echo -e "${GREEN}PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (HTTP $CODE)"
    ((FAILED++))
fi
((TOTAL++))

# Test 14: Get Template Details
if [ -n "$TEMPLATE_ID" ]; then
    echo -n "Test 14: Get Template Details... "
    RESP=$(curl -s -w "\n%{http_code}" "$API_URL/templates/$TEMPLATE_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    CODE=$(echo "$RESP" | tail -n1)
    if [ "$CODE" = "200" ]; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (HTTP $CODE)"
        ((FAILED++))
    fi
    ((TOTAL++))
else
    echo -e "Test 14: Get Template Details... ${YELLOW}SKIP${NC} (no template ID)"
    ((SKIPPED++))
    ((TOTAL++))
fi

# Test 15: Update Template Content (New Version)
if [ -n "$TEMPLATE_ID" ]; then
    echo -n "Test 15: Update Template Content... "
    RESP=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/templates/$TEMPLATE_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"content":"UPDATED: Dear {{defendant_name}}, I demand {{demand_amount}}."}')
    CODE=$(echo "$RESP" | tail -n1)
    if [ "$CODE" = "200" ]; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC} (HTTP $CODE)"
        ((FAILED++))
    fi
    ((TOTAL++))
else
    echo -e "Test 15: Update Template Content... ${YELLOW}SKIP${NC} (no template ID)"
    ((SKIPPED++))
    ((TOTAL++))
fi

# Test 16: Invalid Credentials
echo -n "Test 16: Reject Invalid Credentials... "
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPassword!\",\"firmId\":\"$FIRM_ID\"}")
CODE=$(echo "$RESP" | tail -n1)
if [ "$CODE" = "401" ]; then
    echo -e "${GREEN}PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (Expected 401, got $CODE)"
    ((FAILED++))
fi
((TOTAL++))

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Results Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests:   $TOTAL"
echo -e "${GREEN}Passed:        $PASSED${NC}"
echo -e "${RED}Failed:        $FAILED${NC}"
echo -e "${YELLOW}Skipped:       $SKIPPED${NC}"

if [ $FAILED -eq 0 ] && [ $PASSED -gt 0 ]; then
    PASS_RATE=100
    echo -e "Pass Rate:     ${GREEN}100%${NC}"
    echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    if [ $PASSED -gt 0 ]; then
        PASS_RATE=$((PASSED * 100 / (PASSED + FAILED)))
        echo -e "Pass Rate:     ${PASS_RATE}%"
    fi
    echo -e "\n${RED}✗ Some tests failed${NC}\n"
    exit 1
fi
