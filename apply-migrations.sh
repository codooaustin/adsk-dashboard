#!/bin/bash
# Script to apply database migrations for Phase 2

set -e

cd /home/codoo/dev/account-management

echo "========================================="
echo "Applying Phase 2 Database Migrations"
echo "========================================="
echo ""

# Check if Supabase is running
echo "1. Checking Supabase status..."
if ! supabase status > /dev/null 2>&1; then
    echo "   Supabase is not running. Starting Supabase..."
    supabase start
    echo "   Waiting for Supabase to be ready..."
    sleep 5
else
    echo "   Supabase is running."
fi

echo ""
echo "2. Applying migrations..."
supabase migration up

echo ""
echo "3. Verifying tables were created..."
TABLES=$(PGPASSWORD=postgres psql -h localhost -p 54422 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('accounts', 'datasets', 'usage_facts', 'products', 'product_aliases');" 2>/dev/null | tr -d ' ')

if [ "$TABLES" = "5" ]; then
    echo "   ✓ All 5 tables created successfully!"
    echo "   - accounts"
    echo "   - datasets"
    echo "   - usage_facts"
    echo "   - products"
    echo "   - product_aliases"
else
    echo "   ⚠ Warning: Expected 5 tables, found $TABLES"
fi

echo ""
echo "4. Verifying storage bucket..."
BUCKET=$(PGPASSWORD=postgres psql -h localhost -p 54422 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM storage.buckets WHERE id = 'datasets';" 2>/dev/null | tr -d ' ')

if [ "$BUCKET" = "1" ]; then
    echo "   ✓ Storage bucket 'datasets' created successfully!"
else
    echo "   ⚠ Warning: Storage bucket 'datasets' not found"
fi

echo ""
echo "========================================="
echo "Migration complete!"
echo "========================================="
