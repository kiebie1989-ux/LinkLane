#!/bin/bash
set -e

echo ""
echo "  🔀 LinkLane - Native Host Installer (Linux)"
echo "  ============================================"
echo ""

# ---- Python check / install ----
if ! command -v python3 &>/dev/null; then
  echo "  Python 3 not found. Attempting to install..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y python3
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y python3
  elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm python
  elif command -v zypper &>/dev/null; then
    sudo zypper install -y python3
  else
    echo "  ERROR: Could not install Python 3 automatically."
    echo "  Please install Python 3.6+ manually and re-run this script."
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

# Install native messaging manifest
MANIFEST_DIR="$HOME/.mozilla/native-messaging-hosts"
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
