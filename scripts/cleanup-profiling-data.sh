#!/bin/bash

# 🚀 GameV1 Profiling Data Cleanup Script
# Quản lý và cleanup dữ liệu profiling cũ

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PROFILE_DIR=${1:-"profiling-results"}
BACKUP_DIR=${2:-"profiling-backup"}
DRY_RUN=${3:-"false"}

# Default retention settings
RETENTION_DAYS=${RETENTION_DAYS:-30}
MAX_BACKUPS=${MAX_BACKUPS:-5}

echo -e "${BLUE}${BOLD}🧹 GameV1 Profiling Data Cleanup${NC}"
echo "==============================="
echo -e "Target directory: ${YELLOW}$PROFILE_DIR${NC}"
echo -e "Retention days: ${YELLOW}$RETENTION_DAYS${NC}"
echo -e "Max backups: ${YELLOW}$MAX_BACKUPS${NC}"

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be deleted${NC}"
fi
echo ""

# Function to check if file should be kept
should_keep() {
    local file=$1
    local days_old=$2

    # Always keep recent files
    if [ $days_old -le $RETENTION_DAYS ]; then
        return 0
    fi

    # Keep essential files longer
    case $(basename "$file") in
        "README.md"|"README-*.md"|"*.svg"|"baseline-*")
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to backup directory
backup_directory() {
    local source=$1
    local backup_name=$(basename "$source")
    local timestamp=$(date +%Y%m%d_%H%M%S)

    if [ ! -d "$source" ]; then
        echo -e "${YELLOW}⚠️  Source directory not found: $source${NC}"
        return 1
    fi

    local backup_path="$BACKUP_DIR/${backup_name}_backup_$timestamp"

    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${BLUE}📦 Would backup: $source -> $backup_path${NC}"
        return 0
    fi

    echo -e "${YELLOW}📦 Creating backup: $backup_path${NC}"
    mkdir -p "$BACKUP_DIR"
    cp -r "$source" "$backup_path"

    # Compress backup if it's large
    if [ $(du -sb "$backup_path" | cut -f1) -gt 104857600 ]; then  # 100MB
        echo -e "${YELLOW}🗜️  Compressing large backup...${NC}"
        tar -czf "${backup_path}.tar.gz" -C "$BACKUP_DIR" "$(basename "$backup_path")"
        rm -rf "$backup_path"
        backup_path="${backup_path}.tar.gz"
    fi

    echo -e "${GREEN}✅ Backup created: $backup_path${NC}"
}

# Function to cleanup old backups
cleanup_old_backups() {
    local backup_pattern="$BACKUP_DIR/*_backup_*"

    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${BLUE}🗑️  Would cleanup old backups matching: $backup_pattern${NC}"
        return 0
    fi

    echo -e "${YELLOW}🗑️  Cleaning up old backups...${NC}"

    # List backups by modification time (newest first)
    local backups=($(ls -t $backup_pattern 2>/dev/null))

    if [ ${#backups[@]} -gt $MAX_BACKUPS ]; then
        local to_remove=(${backups[@]:$MAX_BACKUPS})

        for backup in "${to_remove[@]}"; do
            if [ -f "$backup" ] || [ -d "$backup" ]; then
                echo -e "${YELLOW}🗑️  Removing old backup: $(basename "$backup")${NC}"
                rm -rf "$backup"
            fi
        done
    fi
}

# Function to analyze profiling data
analyze_profiling_data() {
    local dir=$1

    if [ ! -d "$dir" ]; then
        return
    fi

    echo -e "${BLUE}📊 Analyzing: $(basename "$dir")${NC}"

    local total_files=$(find "$dir" -type f | wc -l)
    local total_size=$(du -sh "$dir" | cut -f1)
    local oldest_file=$(find "$dir" -type f -printf '%T+ %p\n' | sort | head -1 | cut -d' ' -f2-)
    local newest_file=$(find "$dir" -type f -printf '%T+ %p\n' | sort -r | head -1 | cut -d' ' -f2-)

    echo "  Files: $total_files"
    echo "  Size: $total_size"

    if [ -n "$oldest_file" ]; then
        local days_old=$(( ( $(date +%s) - $(stat -c %Y "$oldest_file") ) / 86400 ))
        echo "  Oldest file: $days_old days old"
    fi

    if [ -n "$newest_file" ]; then
        local days_old=$(( ( $(date +%s) - $(stat -c %Y "$newest_file") ) / 86400 ))
        echo "  Newest file: $days_old days old"
    fi
}

# Main cleanup process
echo -e "${BLUE}📋 Phase 1: Analysis${NC}"

# Analyze current profiling data
if [ -d "$PROFILE_DIR" ]; then
    analyze_profiling_data "$PROFILE_DIR"
else
    echo -e "${RED}❌ Profiling directory not found: $PROFILE_DIR${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Phase 2: Cleanup Plan${NC}"

# Find files to remove
files_to_remove=()
files_to_backup=()

if [ -d "$PROFILE_DIR" ]; then
    while IFS= read -r -d '' file; do
        if [ -f "$file" ]; then
            local days_old=$(( ( $(date +%s) - $(stat -c %Y "$file") ) / 86400 ))

            if should_keep "$file" $days_old; then
                echo -e "${GREEN}✅ Keep: $(basename "$file") ($days_old days old)${NC}"
            else
                echo -e "${YELLOW}🗑️  Remove: $(basename "$file") ($days_old days old)${NC}"
                files_to_remove+=("$file")
            fi
        fi
    done < <(find "$PROFILE_DIR" -type f -print0)
fi

echo ""
echo -e "${BLUE}📋 Phase 3: Backup Important Data${NC}"

# Backup important files before cleanup
important_patterns=("README*.md" "*.svg" "baseline-*")
for pattern in "${important_patterns[@]}"; do
    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${BLUE}📦 Would backup pattern: $pattern${NC}"
    else
        # Find and backup files matching pattern
        while IFS= read -r -d '' file; do
            backup_directory "$(dirname "$file")"
            break  # Only backup once per directory
        done < <(find "$PROFILE_DIR" -name "$pattern" -print0)
    fi
done

echo ""
echo -e "${BLUE}📋 Phase 4: Execute Cleanup${NC}"

if [ ${#files_to_remove[@]} -gt 0 ]; then
    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${BLUE}🗑️  Would remove ${#files_to_remove[@]} old profiling files${NC}"
    else
        echo -e "${YELLOW}🗑️  Removing ${#files_to_remove[@]} old profiling files...${NC}"

        for file in "${files_to_remove[@]}"; do
            rm -f "$file"
            echo -e "${GREEN}✅ Removed: $(basename "$file")${NC}"
        done

        # Remove empty directories
        find "$PROFILE_DIR" -type d -empty -delete 2>/dev/null || true
    fi
else
    echo -e "${GREEN}✅ No old files to remove${NC}"
fi

echo ""
echo -e "${BLUE}📋 Phase 5: Cleanup Old Backups${NC}"

cleanup_old_backups

echo ""
echo -e "${BLUE}📋 Phase 6: Final Analysis${NC}"

# Final analysis
if [ -d "$PROFILE_DIR" ]; then
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
    echo ""

    analyze_profiling_data "$PROFILE_DIR"

    echo ""
    echo -e "${YELLOW}💡 Summary:${NC}"
    echo "  • Old profiling files removed"
    echo "  • Important data backed up"
    echo "  • Backup rotation maintained"
    echo "  • Disk space freed"

    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(find "$BACKUP_DIR" -name "*_backup_*" | wc -l)
        echo "  • Active backups: $backup_count"
    fi
else
    echo -e "${RED}❌ Profiling directory not found after cleanup${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Profiling data cleanup completed!${NC}"

# Usage examples at the end
echo ""
echo -e "${YELLOW}💡 Usage examples:${NC}"
echo "  # Dry run (preview what would be deleted)"
echo "  $0 profiling-results profiling-backup true"
echo ""
echo "  # Normal cleanup with 14 day retention"
echo "  RETENTION_DAYS=14 $0"
echo ""
echo "  # Keep only 3 backups"
echo "  MAX_BACKUPS=3 $0"
echo ""
echo "  # Custom directories"
echo "  $0 custom-profiling-dir custom-backup-dir"
