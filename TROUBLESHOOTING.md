# Supabase Troubleshooting Guide

## Common Issues When Starting Supabase

### 1. Port Conflicts

If you have another Supabase instance running, ports 54321-54327 might be in use.

**Solution: Change ports in `supabase/config.toml`**

Edit `supabase/config.toml` and change these ports to avoid conflicts:

```toml
[api]
port = 54331  # Changed from 54321

[db]
port = 54332  # Changed from 54322
shadow_port = 54330  # Changed from 54320

[studio]
port = 54333  # Changed from 54323

[inbucket]
port = 54334  # Changed from 54324

[analytics]
port = 54337  # Changed from 54327
```

### 2. Docker Issues

**Check if Docker is running:**
```bash
docker ps
```

**Check for existing Supabase containers:**
```bash
docker ps -a | grep supabase
```

**Stop all Supabase containers:**
```bash
supabase stop
```

**Clean up and restart:**
```bash
supabase stop
docker system prune -f  # Be careful - this removes unused containers
supabase start
```

### 3. Database Initialization Errors

**Reset the database:**
```bash
supabase db reset
```

**Check logs:**
```bash
supabase logs
```

### 4. Permission Issues

**If you get permission errors with Docker:**
```bash
# Add your user to docker group (if not already)
sudo usermod -aG docker $USER
# Then log out and back in, or run:
newgrp docker
```

### 5. View Detailed Error Messages

Run with verbose output:
```bash
supabase start --debug
```

Or check Docker logs directly:
```bash
docker logs supabase_db_account-management
docker logs supabase_api_account-management
```

## Getting Help

If you're still having issues, please share:
1. The exact error message from `supabase start`
2. Output of `docker ps -a`
3. Output of `supabase status`
