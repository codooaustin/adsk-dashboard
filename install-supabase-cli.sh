#!/bin/bash
# Install Supabase CLI using the official installer

echo "Installing Supabase CLI..."
curl -fsSL https://supabase.com/install.sh | bash

# Add to PATH if not already there
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "Adding ~/.local/bin to PATH..."
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.local/bin:$PATH"
    echo "PATH updated. You may need to restart your terminal or run: source ~/.bashrc"
fi

echo ""
echo "Verifying installation..."
if command -v supabase &> /dev/null; then
    supabase --version
    echo ""
    echo "✅ Supabase CLI installed successfully!"
else
    echo "❌ Installation may have failed. Try running: source ~/.bashrc"
fi
