# Backend Scripts

Utility scripts for backend development and administration.

## Available Scripts

### set-admin.mjs
Sets a user's role to 'admin' in the database.

**Usage:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 node set-admin.mjs <email>
```

**Example:**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 node set-admin.mjs "admin@example.com"
```

**Output:**
```
🔗 Connecting to MongoDB...
👤 Setting admin role for: admin@example.com
✅ SUCCESS: admin@example.com → role: admin
```

**When to use:**
- Manually granting admin privileges to existing users
- Development and testing
- User management tasks

---
