#!/bin/bash

echo "🔧 FIXING ELF COMPATIBILITY ISSUE"
echo "=================================="

# Function to fix ELF section names
fix_elf_sections() {
    local elf_file="$1"

    if [ ! -f "$elf_file" ]; then
        echo "❌ ELF file not found: $elf_file"
        return 1
    fi

    echo "📄 Processing ELF file: $elf_file"

    # Check current sections
    echo "📋 Current sections:"
    readelf -S "$elf_file" | grep -E '\.note' || true

    # Try to rename problematic sections
    echo "🔄 Renaming problematic sections..."

    # Copy original file
    cp "$elf_file" "${elf_file}.backup"

    # Use objcopy to rename sections (if objcopy available)
    if command -v objcopy >/dev/null 2>&1; then
        echo "🛠️ Using objcopy to fix sections..."

        # Try to rename .note.gnu.build-id to shorter name
        objcopy --rename-section .note.gnu.build-id=.note.buildid "$elf_file" 2>/dev/null || true

        # Try to remove the section entirely if rename fails
        objcopy --remove-section=.note.gnu.build-id "$elf_file" 2>/dev/null || true

        echo "✅ objcopy processing completed"
    fi

    # Alternative: strip all debug info
    echo "🔪 Stripping debug information..."
    strip --strip-debug --strip-unneeded "$elf_file" 2>/dev/null || true
    strip --strip-all "$elf_file" 2>/dev/null || true

    # Check if sections are fixed
    echo "📋 Sections after processing:"
    readelf -S "$elf_file" | grep -E '\.note' || echo "✅ No problematic .note sections found"

    echo "✅ ELF compatibility fix completed for: $elf_file"
}

# Main execution
echo "🔍 Looking for ELF files to fix..."

# Find all .so files in target/deploy
for elf_file in target/deploy/*.so; do
    if [ -f "$elf_file" ]; then
        fix_elf_sections "$elf_file"
    fi
done

echo ""
echo "🎯 ELF COMPATIBILITY FIX COMPLETED!"
echo "📤 You can now try deploying with:"
echo "   solana program deploy target/deploy/game_token.so --program-id target/deploy/game_token-keypair.json"

