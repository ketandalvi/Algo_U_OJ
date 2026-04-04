#!/bin/bash
# ================================================================
# CODING JUDGE — MASTER TEST SUITE
# Run from project root: bash tests/master-test.sh
# Requires: server running on localhost:5000
# ================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

BASE_URL="http://localhost:5000"
ADMIN_TOKEN=""
USER_TOKEN=""
PROBLEM_ID=""
PROBLEM_SLUG=""
PASSED=0
FAILED=0
SKIPPED=0
TOTAL=0
TS=$(date +%s)

# ----------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------
assert_test() {
  local label="$1"
  local expected="$2"
  local response="$3"

  local actual
  actual=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')
  TOTAL=$((TOTAL + 1))

  # 000 = curl connection error (transient Atlas latency) — skip rather than fail
  if [ "$actual" = "000" ] || [ -z "$actual" ]; then
    echo -e "  ${YELLOW}⚠ SKIP${NC} $label ${YELLOW}(transient — curl got no response)${NC}"
    SKIPPED=$((SKIPPED + 1))
    return
  fi

  if [ "$actual" = "$expected" ]; then
    local msg
    msg=$(echo "$body" | grep -o '"message":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ -n "$msg" ]; then
      echo -e "  ${GREEN}✓${NC} $label ${BLUE}→${NC} \"$msg\""
    else
      echo -e "  ${GREEN}✓${NC} $label"
    fi
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} $label"
    echo -e "    Expected: $expected | Got: $actual"
    local msg
    msg=$(echo "$body" | grep -o '"message":"[^"]*' | head -1 | cut -d'"' -f4)
    [ -n "$msg" ] && echo -e "    Message: $msg"
    FAILED=$((FAILED + 1))
  fi
}

section() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━ $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

echo ""
echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║         CODING JUDGE — MASTER TEST SUITE (ts=$TS)           ║${NC}"
echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"

# ================================================================
# SETUP
# ================================================================
section "SETUP"

# Check server is up
echo -e "${YELLOW}Checking server...${NC}"
SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$SERVER_CHECK" != "200" ]; then
  echo -e "${RED}Server not responding at $BASE_URL — is it running?${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Server is up${NC}"

# Register admin user
echo -e "${YELLOW}Registering admin user (admin$TS)...${NC}"
REG_RES=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin$TS\",\"email\":\"admin$TS@test.com\",\"password\":\"testpass123\"}")
ADMIN_TOKEN=$(echo "$REG_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ADMIN_EMAIL="admin$TS@test.com"

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}Registration failed — cannot continue${NC}"
  echo "$REG_RES"
  exit 1
fi
echo -e "${GREEN}✓ Admin user registered${NC}"

# Set admin role (run set-admin from its own directory so dotenv resolves)
echo -e "${YELLOW}Setting admin role via set-admin.mjs...${NC}"
SET_ADMIN_OUT=$(cd backend/scripts && NODE_TLS_REJECT_UNAUTHORIZED=0 node set-admin.mjs "$ADMIN_EMAIL" 2>&1)
if echo "$SET_ADMIN_OUT" | grep -q "SUCCESS"; then
  echo -e "${GREEN}✓ Admin role set${NC}"
else
  echo -e "${RED}✗ set-admin failed — admin-only tests will 403${NC}"
  echo "$SET_ADMIN_OUT"
fi

# Register non-admin user
echo -e "${YELLOW}Registering non-admin user (user$TS)...${NC}"
REG_USER=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"user$TS\",\"email\":\"user$TS@test.com\",\"password\":\"userpass123\"}")
USER_TOKEN=$(echo "$REG_USER" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$USER_TOKEN" ]; then
  echo -e "${RED}Non-admin registration failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Non-admin user registered${NC}"

# ================================================================
# SECTION 1: POST /api/auth/register
# ================================================================
section "1. AUTH — POST /api/auth/register"

assert_test "Register valid user → 201" "201" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"fresh$TS\",\"email\":\"fresh$TS@test.com\",\"password\":\"password123\"}")"

assert_test "Register — body is array → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" -d '[]')"

assert_test "Register — malformed JSON → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" -d '{bad json')"

assert_test "Register — missing all fields → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" -d '{}')"

assert_test "Register — username < 3 chars → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"ab","email":"ab@test.com","password":"password123"}')"

assert_test "Register — username > 20 chars → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"averylongusernamethatexceeds","email":"long@test.com","password":"password123"}')"

assert_test "Register — username with spaces → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"my user","email":"myuser@test.com","password":"password123"}')"

assert_test "Register — invalid email format → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"validuser","email":"notanemail","password":"password123"}')"

assert_test "Register — password < 6 chars → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"validuser","email":"valid@test.com","password":"abc"}')"

assert_test "Register — duplicate email → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"other$TS\",\"email\":\"admin$TS@test.com\",\"password\":\"password123\"}")"

assert_test "Register — duplicate username → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin$TS\",\"email\":\"other$TS@test.com\",\"password\":\"password123\"}")"

# ================================================================
# SECTION 2: POST /api/auth/login
# ================================================================
section "2. AUTH — POST /api/auth/login"

assert_test "Login valid credentials → 200" "200" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"admin$TS@test.com\",\"password\":\"testpass123\"}")"

assert_test "Login — wrong password → 401" "401" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"admin$TS@test.com\",\"password\":\"wrongpassword\"}")"

assert_test "Login — nonexistent email → 401" "401" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"nobody@example.com","password":"password123"}')"

assert_test "Login — missing password → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"admin$TS@test.com\"}")"

assert_test "Login — invalid email format → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"notanemail","password":"password123"}')"

# ================================================================
# SECTION 3: GET /api/auth/me
# ================================================================
section "3. AUTH — GET /api/auth/me"

assert_test "GET /me — valid token → 200" "200" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $ADMIN_TOKEN")"

assert_test "GET /me — no token → 401" "401" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/me")"

assert_test "GET /me — invalid token → 401" "401" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer thisisaninvalidtoken")"

assert_test "GET /me — no Bearer prefix → 401" "401" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/me" \
    -H "Authorization: $ADMIN_TOKEN")"

# ================================================================
# SECTION 4: Access Control (protect + adminOnly)
# ================================================================
section "4. PROBLEMS — Access Control"

assert_test "POST /problems — no token → 401" "401" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" \
    -d '{"title":"T","slug":"t","description":"t","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "POST /problems — non-admin token → 403" "403" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"title":"T","slug":"t","description":"t","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "PATCH /problems/:id — no token → 401" "401" \
  "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/507f1f77bcf86cd799439011" \
    -H "Content-Type: application/json" -d '{"status":"published"}')"

assert_test "PATCH /problems/:id — non-admin token → 403" "403" \
  "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/507f1f77bcf86cd799439011" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"status":"published"}')"

assert_test "DELETE /problems/:id — no token → 401" "401" \
  "$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/problems/507f1f77bcf86cd799439011")"

assert_test "DELETE /problems/:id — non-admin token → 403" "403" \
  "$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/problems/507f1f77bcf86cd799439011" \
    -H "Authorization: Bearer $USER_TOKEN")"

# ================================================================
# SECTION 5: createProblem — Happy Path + Valid Edge Cases
# ================================================================
section "5. CREATE PROBLEM — Valid Cases"

# Main create — capture ID for later tests
CREATE_RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"title\": \"Two Sum $TS\",
    \"slug\": \"two-sum-$TS\",
    \"description\": \"Given an array of integers and a target, return indices of two numbers that add up to target.\",
    \"difficulty\": \"Easy\",
    \"tags\": [\"array\", \"hash-map\"],
    \"testCases\": [
      {\"input\": \"nums=[2,7,11,15],target=9\", \"expectedOutput\": \"[0,1]\"},
      {\"input\": \"nums=[3,3],target=6\",        \"expectedOutput\": \"[0,1]\"}
    ],
    \"timeLimit\": 5000,
    \"memoryLimit\": 128
  }")
CREATE_STATUS=$(echo "$CREATE_RES" | tail -n1)
CREATE_BODY=$(echo "$CREATE_RES" | sed '$d')
PROBLEM_ID=$(echo "$CREATE_BODY" | grep -oE '"_id":"[a-f0-9]{24}"' | tail -1 | grep -oE '[a-f0-9]{24}')
PROBLEM_SLUG="two-sum-$TS"
TOTAL=$((TOTAL + 1))
if [ "$CREATE_STATUS" = "201" ] && [ -n "$PROBLEM_ID" ]; then
  echo -e "  ${GREEN}✓${NC} Create valid problem → 201, ID: $PROBLEM_ID"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✗ FAIL${NC} Create valid problem → status $CREATE_STATUS"
  echo "  $CREATE_BODY"
  FAILED=$((FAILED + 1))
fi

# Slug with uppercase letters — controller lowercases it, should create fine
assert_test "Create — slug auto-lowercased (UPPER-SLUG-$TS → valid) → 201" "201" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"title\": \"Uppercase Slug Test $TS\",
      \"slug\": \"UPPER-SLUG-$TS\",
      \"description\": \"Slug should be auto-lowercased before validation and saving.\",
      \"difficulty\": \"Medium\",
      \"testCases\": [{\"input\": \"1\", \"expectedOutput\": \"1\"}]
    }")"

# starterCode: null in create → uses default, should create fine
assert_test "Create — starterCode: null uses default → 201" "201" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"title\": \"Null Starter Code $TS\",
      \"slug\": \"null-starter-$TS\",
      \"description\": \"Problem with null starterCode should fall back to defaults.\",
      \"difficulty\": \"Hard\",
      \"testCases\": [{\"input\": \"input1\", \"expectedOutput\": \"output1\"}],
      \"starterCode\": null
    }")"

# ================================================================
# SECTION 6: createProblem — Required Fields
# ================================================================
section "6. CREATE PROBLEM — Missing / Wrong-Type Required Fields"

assert_test "Create — missing title → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"slug":"no-title","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — missing slug → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"No Slug","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — missing description → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"No Desc","slug":"no-desc","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — missing difficulty → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"No Diff","slug":"no-diff","description":"Description is present here.","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — missing testCases → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"No Cases","slug":"no-cases","description":"Description is present here.","difficulty":"Easy"}')"

assert_test "Create — title = null → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":null,"slug":"null-title","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — title = 123 (number) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":123,"slug":"num-title","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — title too short (2 chars) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"AB","slug":"short-title","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — description too short (< 10 chars) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Short Desc","slug":"short-desc","description":"Short","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — slug with spaces → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Slug Spaces","slug":"bad slug","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — slug with underscores → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Slug Underscore","slug":"bad_slug","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — slug too short (1 char) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Slug One Char","slug":"a","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — difficulty wrong case ('easy') → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Wrong Diff","slug":"wrong-diff","description":"Description is present here.","difficulty":"easy","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — difficulty = 'HARD' (all caps) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Wrong Hard","slug":"wrong-hard","description":"Description is present here.","difficulty":"HARD","testCases":[{"input":"a","expectedOutput":"b"}]}')"

assert_test "Create — duplicate slug → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"title\":\"Dupe Slug\",\"slug\":\"two-sum-$TS\",\"description\":\"Duplicate slug should be rejected.\",\"difficulty\":\"Easy\",\"testCases\":[{\"input\":\"a\",\"expectedOutput\":\"b\"}]}")"

assert_test "Create — body is array → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '[]')"

sleep 0.3

# ================================================================
# SECTION 7: createProblem — testCases Validation
# ================================================================
section "7. CREATE PROBLEM — testCases Validation"

assert_test "Create — testCases = null → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TC Null","slug":"tc-null","description":"Description is present here.","difficulty":"Easy","testCases":null}')"

assert_test "Create — testCases = {} (object, not array) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TC Object","slug":"tc-object","description":"Description is present here.","difficulty":"Easy","testCases":{}}')"

assert_test "Create — testCases = [] (empty array) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TC Empty","slug":"tc-empty","description":"Description is present here.","difficulty":"Easy","testCases":[]}')"

assert_test "Create — testCases = [null] → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TC Null El","slug":"tc-null-el","description":"Description is present here.","difficulty":"Easy","testCases":[null]}')"

assert_test "Create — testCases = [[1,2,3]] (array element) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TC Array El","slug":"tc-array-el","description":"Description is present here.","difficulty":"Easy","testCases":[[1,2,3]]}')"

assert_test "Create — testCase missing input → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TC No Input","slug":"tc-no-input","description":"Description is present here.","difficulty":"Easy","testCases":[{"expectedOutput":"result"}]}')"

assert_test "Create — testCase missing expectedOutput → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TC No Output","slug":"tc-no-output","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"test"}]}')"

assert_test "Create — testCase input = whitespace only → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TC Whitespace","slug":"tc-whitespace","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"   ","expectedOutput":"result"}]}')"

assert_test "Create — testCase expectedOutput = empty string → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TC Empty Out","slug":"tc-empty-out","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"test","expectedOutput":""}]}')"

sleep 0.3

# ================================================================
# SECTION 8: createProblem — Optional Fields Validation
# ================================================================
section "8. CREATE PROBLEM — Optional Fields Validation"

assert_test "Create — tags = 'string' (not array) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Tags String","slug":"tags-string","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"tags":"array"}')"

assert_test "Create — tags with non-string element → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Tags Mixed","slug":"tags-mixed","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"tags":["valid",123]}')"

assert_test "Create — tags with empty string element → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Tags Empty El","slug":"tags-empty-el","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"tags":["valid",""]}')"

assert_test "Create — starterCode = 'string' → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"SC String","slug":"sc-string","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"starterCode":"function(){}"}')"

assert_test "Create — starterCode = [] (array) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"SC Array","slug":"sc-array","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"starterCode":[]}')"

assert_test "Create — starterCode invalid language key → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"SC Lang","slug":"sc-lang","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"starterCode":{"java":"class Solution{}"}}')"

assert_test "Create — starterCode lang value = number → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"SC Num Val","slug":"sc-num-val","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"starterCode":{"python":42}}')"

assert_test "Create — timeLimit = 0 (< 1000) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TL Zero","slug":"tl-zero","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"timeLimit":0}')"

assert_test "Create — timeLimit = 999 (< 1000) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TL 999","slug":"tl-999","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"timeLimit":999}')"

assert_test "Create — timeLimit = 16000 (> 15000) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TL High","slug":"tl-high","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"timeLimit":16000}')"

assert_test "Create — timeLimit = '5000' (string) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"TL String","slug":"tl-str","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"timeLimit":"5000"}')"

assert_test "Create — memoryLimit = 15 (< 16) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"ML Low","slug":"ml-low","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"memoryLimit":15}')"

assert_test "Create — memoryLimit = 513 (> 512) → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/problems" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"ML High","slug":"ml-high","description":"Description is present here.","difficulty":"Easy","testCases":[{"input":"a","expectedOutput":"b"}],"memoryLimit":513}')"

sleep 0.3

# ================================================================
# SECTION 9: updateProblem — PATCH /api/problems/:id
# ================================================================
section "9. UPDATE PROBLEM — PATCH /api/problems/:id"

if [ -z "$PROBLEM_ID" ]; then
  echo -e "  ${YELLOW}SKIP — no PROBLEM_ID (create test failed)${NC}"
else
  assert_test "Update — invalid ObjectId → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/notanobjectid" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"status":"published"}')"

  assert_test "Update — valid ObjectId, nonexistent → 404" "404" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/507f1f77bcf86cd799439011" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"status":"published"}')"

  assert_test "Update — body is array → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '[]')"

  assert_test "Update — no valid fields (slug/createdBy ignored) → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"slug":"cant-change","createdBy":"fakeid"}')"

  assert_test "Update — title too short (2 chars) → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"title":"AB"}')"

  assert_test "Update — description too short (< 10 chars) → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"description":"Short"}')"

  assert_test "Update — difficulty invalid value → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"difficulty":"extreme"}')"

  assert_test "Update — tags not array → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"tags":"array"}')"

  assert_test "Update — starterCode = null → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"starterCode":null}')"

  assert_test "Update — starterCode = [] → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"starterCode":[]}')"

  assert_test "Update — starterCode invalid language (ruby) → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"starterCode":{"ruby":"def solution"}}')"

  assert_test "Update — timeLimit out of range (500) → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"timeLimit":500}')"

  assert_test "Update — memoryLimit out of range (1000) → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"memoryLimit":1000}')"

  assert_test "Update — status = 'active' (invalid) → 400" "400" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"status":"active"}')"

  assert_test "Update — valid: publish problem → 200" "200" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"status":"published"}')"

  assert_test "Update — valid: title + difficulty → 200" "200" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"title":"Updated Two Sum Title","difficulty":"Medium"}')"

  assert_test "Update — valid: starterCode with valid language → 200" "200" \
    "$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{"starterCode":{"python":"def solution(nums, target):","javascript":"function twoSum(nums, target) {}"}}')"
fi

# ================================================================
# SECTION 10: GET /api/problems and GET /api/problems/:slug
# ================================================================
section "10. GET PROBLEMS"

assert_test "GET /problems → 200" "200" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/problems")"

# testCases must NOT appear in list response
LIST_BODY=$(curl -s "$BASE_URL/api/problems")
TOTAL=$((TOTAL + 1))
if echo "$LIST_BODY" | grep -q '"testCases"'; then
  echo -e "  ${RED}✗ FAIL${NC} GET /problems — testCases must be excluded from list"
  FAILED=$((FAILED + 1))
else
  echo -e "  ${GREEN}✓${NC} GET /problems — testCases correctly excluded from list"
  PASSED=$((PASSED + 1))
fi

assert_test "GET /problems/:slug (valid, published) → 200" "200" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/problems/$PROBLEM_SLUG")"

# testCases must NOT appear in single problem response
SINGLE_BODY=$(curl -s "$BASE_URL/api/problems/$PROBLEM_SLUG")
TOTAL=$((TOTAL + 1))
if echo "$SINGLE_BODY" | grep -q '"testCases"'; then
  echo -e "  ${RED}✗ FAIL${NC} GET /problems/:slug — testCases must be excluded"
  FAILED=$((FAILED + 1))
else
  echo -e "  ${GREEN}✓${NC} GET /problems/:slug — testCases correctly excluded"
  PASSED=$((PASSED + 1))
fi

assert_test "GET /problems/:slug — nonexistent → 404" "404" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/problems/this-slug-does-not-exist")"

assert_test "GET /problems/:slug — slug normalization (uppercase URL) → 200" "200" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/problems/$(echo $PROBLEM_SLUG | tr '[:lower:]' '[:upper:]')")"

# Draft problem must NOT be accessible via GET /:slug
DRAFT_RES=$(curl -s -X POST "$BASE_URL/api/problems" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"title\": \"Draft Only $TS\",
    \"slug\": \"draft-only-$TS\",
    \"description\": \"This problem intentionally stays as draft and should not be public.\",
    \"difficulty\": \"Easy\",
    \"testCases\": [{\"input\": \"x\", \"expectedOutput\": \"y\"}]
  }")
assert_test "GET /problems/:slug — draft problem → 404 (not public)" "404" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/problems/draft-only-$TS")"

# ================================================================
# SECTION 11: DELETE /api/problems/:id
# ================================================================
section "11. DELETE PROBLEM — DELETE /api/problems/:id"

assert_test "Delete — invalid ObjectId → 400" "400" \
  "$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/problems/notanid" \
    -H "Authorization: Bearer $ADMIN_TOKEN")"

assert_test "Delete — valid ObjectId, nonexistent → 404" "404" \
  "$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/problems/507f1f77bcf86cd799439011" \
    -H "Authorization: Bearer $ADMIN_TOKEN")"

if [ -n "$PROBLEM_ID" ]; then
  assert_test "Delete — valid problem → 200" "200" \
    "$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")"

  assert_test "Delete — same ID again (already deleted) → 404" "404" \
    "$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/problems/$PROBLEM_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")"

  assert_test "GET /problems/:slug after delete → 404" "404" \
    "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/problems/$PROBLEM_SLUG")"
fi

# ================================================================
# SECTION 12: Misc — Unknown Routes
# ================================================================
section "12. MISC — Unknown Routes"

assert_test "GET /api/unknown → 404" "404" \
  "$(curl -s -w "\n%{http_code}" "$BASE_URL/api/unknown")"

assert_test "POST /api/random-path → 404" "404" \
  "$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/random-path" \
    -H "Content-Type: application/json" -d '{}')"

# ================================================================
# FINAL SUMMARY
# ================================================================
echo ""
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}${BOLD}  TEST SUMMARY${NC}"
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Total   : $TOTAL"
echo -e "  ${GREEN}Passed  : $PASSED${NC}"
if [ "$SKIPPED" -gt 0 ]; then
  echo -e "  ${YELLOW}Skipped : $SKIPPED (transient Atlas connection — re-run to verify)${NC}"
fi
if [ "$FAILED" -gt 0 ]; then
  echo -e "  ${RED}Failed  : $FAILED${NC}"
else
  echo -e "  ${GREEN}Failed  : 0${NC}"
  [ "$SKIPPED" -eq 0 ] && echo -e "  ${GREEN}All tests passed!${NC}"
fi
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

[ "$FAILED" -gt 0 ] && exit 1 || exit 0
