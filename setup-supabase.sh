#!/bin/bash
# Setup script for Supabase CLI installation and project initialization

set -e

echo "🚀 Setting up Supabase for account-management project..."
echo ""

# Step 1: Install Supabase CLI if not already installed
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI already installed: $(supabase --version)"
else
    echo "📦 Installing Supabase CLI..."
    mkdir -p ~/.local/bin
    cd ~/.local/bin
    
    # Download and extract Supabase CLI
    curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz
    tar -xzf supabase.tar.gz
    chmod +x supabase
    rm supabase.tar.gz
    
    # Add to PATH
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        export PATH="$HOME/.local/bin:$PATH"
        echo "✅ Added ~/.local/bin to PATH"
    fi
    
    echo "✅ Supabase CLI installed: $(~/.local/bin/supabase --version)"
fi

# Step 2: Navigate to project directory
cd ~/dev/account-management

# Step 3: Initialize Supabase (if not already initialized)
if [ -d "supabase" ]; then
    echo "✅ Supabase already initialized in this project"
else
    echo "🔧 Initializing Supabase project..."
    supabase init
    echo "✅ Supabase initialized"
fi

# Step 4: Check Docker
echo ""
echo "🐳 Checking Docker connection..."
if docker ps &> /dev/null; then
    echo "✅ Docker is running"
    echo ""
    echo "📋 Next steps:"
    echo "1. Run 'supabase start' to start the local Supabase instance"
    echo "2. Copy the connection details to your .env.local file"
else
    echo "⚠️  Docker is not accessible. Make sure Docker Desktop is running."
    exit 1
fi

echo ""
echo "✨ Setup complete!"
