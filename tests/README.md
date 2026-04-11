# API Test Suite

## Running Tests

Start the backend server first:

```bash
cd backend
NODE_TLS_REJECT_UNAUTHORIZED=0 npm start
```

Then run from the **project root**:

```bash
bash tests/master-test.sh
```

## What's Covered (100+ tests)

| Section | Tests |
|---|---|
| Auth — Register | valid, missing/wrong-type fields, duplicate email/username |
| Auth — Login | valid, wrong password, nonexistent email, bad format |
| Auth — GET /me | valid token, no token, invalid token, no Bearer prefix |
| Access Control | 401 (no token) and 403 (non-admin) for write endpoints |
| Create Problem | valid, auto-lowercase slug, null starterCode uses default |
| Create — required fields | missing/null/wrong-type, title/description/slug length, difficulty case, duplicate slug |
| Create — testCases | null, object, empty array, null/array element, missing fields, whitespace |
| Create — optional fields | tags, starterCode, timeLimit, memoryLimit boundary values |
| Update Problem | invalid ObjectId, nonexistent, all field validations, valid updates |
| GET Problems | list (testCases excluded), by slug (testCases excluded), slug normalization, draft hidden |
| Submission API | auth, validation, unsupported language, invalid IDs, publish-only problem, successful submission, list & detail access |
| Delete Problem | invalid ObjectId, nonexistent, valid delete, double-delete |
| Unknown Routes | 404 for unregistered paths |

## Notes

- Each run registers unique test users (timestamp-based) — safe to run repeatedly
- The set-admin script is called automatically by the test suite
- Transient `000` responses (Atlas latency under load) are reported as skipped, not failed
