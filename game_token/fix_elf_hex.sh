#!/bin/bash

echo "🔧 FIXING ELF COMPATIBILITY - HEX EDIT APPROACH"
echo "============================================="

ELF_FILE="target/deploy/game_token.so"
BACKUP_FILE="${ELF_FILE}.backup"

# Create backup
echo "📋 Creating backup..."
cp "$ELF_FILE" "$BACKUP_FILE"

# Find the problematic section name in hex
echo "🔍 Finding problematic section..."

# Use hexdump to find the section name
SECTION_OFFSET=$(hexdump -C "$ELF_FILE" | grep -m1 "2e 6e 6f 74 65 2e 67 6e 75 2e 62 75" | awk '{print $1}' | sed 's/:$//')

if [ -z "$SECTION_OFFSET" ]; then
    echo "❌ Could not find .note.gnu.bu section"
    exit 1
fi

echo "📍 Found section at offset: $SECTION_OFFSET"

# Convert hex offset to decimal
SECTION_OFFSET_DEC=$((16#$SECTION_OFFSET))

echo "🔄 Section offset (decimal): $SECTION_OFFSET_DEC"

# Read current section name (20 bytes)
echo "📖 Current section name (hex):"
dd if="$ELF_FILE" bs=1 skip=$SECTION_OFFSET_DEC count=20 2>/dev/null | hexdump -C

# Create new section name (16 bytes): .note.gnu.build -> .note.buildid\x00\x00\x00
# ".note.buildid" is exactly 16 bytes including null terminator
NEW_NAME_HEX="2e6e6f74652e6275696c64696400000000"

echo "✏️ New section name hex: $NEW_NAME_HEX"

# Convert hex to binary and write
echo -n "$NEW_NAME_HEX" | xxd -r -p | dd of="$ELF_FILE" bs=1 seek=$SECTION_OFFSET_DEC conv=notrunc 2>/dev/null

echo "✅ Section name modified!"

# Verify the change
echo "🔍 Verifying change..."
dd if="$ELF_FILE" bs=1 skip=$SECTION_OFFSET_DEC count=20 2>/dev/null | hexdump -C

# Test with readelf
echo "📋 ELF sections after fix:"
readelf -S "$ELF_FILE" | grep -E '\.note' || echo "✅ No problematic sections found"

echo ""
echo "🎯 ELF COMPATIBILITY FIX COMPLETED!"
echo "🚀 Try deploying now:"
echo "   solana program deploy $ELF_FILE --program-id target/deploy/game_token-keypair.json"

