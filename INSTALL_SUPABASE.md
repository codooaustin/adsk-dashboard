# Installing Supabase CLI

Run these commands in your WSL terminal:

## Step 1: Install Supabase CLI

```bash
# Create the bin directory
mkdir -p ~/.local/bin

# Download and install Supabase CLI
cd ~/.local/bin
curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz
tar -xzf supabase.tar.gz
chmod +x supabase
rm supabase.tar.gz
```

## Step 2: Add to PATH

```bash
# Add to PATH for current session
export PATH="$HOME/.local/bin:$PATH"

# Add to PATH permanently (adds to ~/.bashrc)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

## Step 3: Verify Installation

```bash
# Reload your shell or run:
source ~/.bashrc

# Check version
supabase --version
```

## Step 4: Initialize Supabase in Your Project

```bash
cd ~/dev/account-management
supabase init
```

## Step 5: Start Supabase

```bash
supabase start
```

This will create Docker containers for this project. After it completes, copy the connection details to your `.env.local` file.

## Troubleshooting

If you get "command not found" after installation:
- Make sure you've run `source ~/.bashrc` or restarted your terminal
- Verify the file exists: `ls -la ~/.local/bin/supabase`
- Check your PATH: `echo $PATH` (should include `~/.local/bin`)
