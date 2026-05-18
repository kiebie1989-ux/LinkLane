#!/bin/bash
set -e

echo ""
echo "  🔀 LinkLane - Native Host Installer (macOS)"
echo "  ============================================"
echo ""

# ---- Python check / install ----
if ! command -v python3 &>/dev/null; then
  echo "  Python 3 not found. Attempting to install via Homebrew..."
  if command -v brew &>/dev/null; then
    brew install python3
  else
    echo "  ERROR: Homebrew not found and Python 3 is missing."
    echo "  Install Homebrew (https://brew.sh) or Python 3 manually, then re-run."
    exit 1
  fi
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(sys.version_info[:2])')
echo "  ✓ Python 3 found ($PYTHON_VERSION)"

mkdir -p "$HOME/bin"
SCRIPT_PATH="$HOME/bin/linklane_host.py"
cp linklane_host.py "$SCRIPT_PATH"
chmod +x "$SCRIPT_PATH"
echo "  ✓ Host script installed to $SCRIPT_PATH"

MANIFEST_DIR="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
mkdir -p "$MANIFEST_DIR"
MANIFEST_PATH="$MANIFEST_DIR/linklane_host.json"

cat > "$MANIFEST_PATH" << EOF
{
  "name": "linklane_host",
  "description": "LinkLane Native Host - Opens URLs in external browsers",
  "path": "$SCRIPT_PATH",
  "type": "stdio",
  "allowed_extensions": ["linklane@linklane"]
}
EOF

echo "  ✓ Native messaging manifest installed to $MANIFEST_PATH"
echo ""
echo "  ✅ Installation complete!"
echo "  → Restart Firefox and open the LinkLane settings to verify the connection."
echo ""
