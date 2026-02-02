#!/bin/bash
cd /home/codoo/dev/account-management

echo "Checking Supabase status..."
supabase status

echo ""
echo "Applying migrations..."
supabase migration up

echo ""
echo "Verifying tables exist..."
PGPASSWORD=postgres psql -h localhost -p 54422 -U postgres -d postgres -c "\dt" 2>&1

echo ""
echo "Checking migration history..."
supabase migration list
