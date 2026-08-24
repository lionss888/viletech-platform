#!/bin/bash

# Script for exporting analytics data
# Usage: ./scripts/export_analytics.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
EXPORT_TYPE="daily"
FORMAT="json"
DAYS=30
USER_ID=""
CONVERSATION_ID=""
OUTPUT_DIR="analytics_exports"
START_DATE=""
END_DATE=""

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Export Types:"
    echo "  daily          - Daily analytics report"
    echo "  user           - User-specific analytics"
    echo "  conversation   - Conversation-specific analytics"
    echo "  raw            - Raw interaction data"
    echo "  comprehensive  - Comprehensive report with all data"
    echo "  topics         - Topics and patterns analysis"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE        Export type (default: daily)"
    echo "  -f, --format FORMAT    Output format: json, csv, xlsx (default: json)"
    echo "  -d, --days DAYS        Number of days for analysis (default: 30)"
    echo "  -u, --user-id ID       User ID for user-specific export"
    echo "  -c, --conversation-id ID  Conversation ID for conversation export"
    echo "  -o, --output-dir DIR   Output directory (default: analytics_exports)"
    echo "  -s, --start-date DATE  Start date (YYYY-MM-DD)"
    echo "  -e, --end-date DATE    End date (YYYY-MM-DD)"
    echo "  -h, --help             Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --type daily --format json"
    echo "  $0 --type user --user-id user123 --format xlsx"
    echo "  $0 --type comprehensive --days 7 --format xlsx"
    echo "  $0 --type raw --start-date 2025-01-01 --end-date 2025-01-31"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            EXPORT_TYPE="$2"
            shift 2
            ;;
        -f|--format)
            FORMAT="$2"
            shift 2
            ;;
        -d|--days)
            DAYS="$2"
            shift 2
            ;;
        -u|--user-id)
            USER_ID="$2"
            shift 2
            ;;
        -c|--conversation-id)
            CONVERSATION_ID="$2"
            shift 2
            ;;
        -o|--output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -s|--start-date)
            START_DATE="$2"
            shift 2
            ;;
        -e|--end-date)
            END_DATE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Check if API is running
log "Checking if API is running..."
if ! curl -s http://localhost:8000/v1/health > /dev/null; then
    error "API is not running. Please start it first with 'make dev' or 'docker compose up'"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build API request based on export type
case $EXPORT_TYPE in
    "daily")
        log "Exporting daily analytics..."
        
        if [ -n "$START_DATE" ]; then
            curl -X POST "http://localhost:8000/v1/analytics/export/daily" \
                 -H "Content-Type: application/json" \
                 -d "{\"date\": \"$START_DATE\", \"format\": \"$FORMAT\"}" \
                 --output "$OUTPUT_DIR/daily_report.$FORMAT"
        else
            curl -X POST "http://localhost:8000/v1/analytics/export/daily" \
                 -H "Content-Type: application/json" \
                 -d "{\"format\": \"$FORMAT\"}" \
                 --output "$OUTPUT_DIR/daily_report.$FORMAT"
        fi
        ;;
        
    "user")
        if [ -z "$USER_ID" ]; then
            error "User ID is required for user export. Use --user-id option."
        fi
        
        log "Exporting user analytics for user: $USER_ID..."
        curl -X POST "http://localhost:8000/v1/analytics/export/user/$USER_ID" \
             -H "Content-Type: application/json" \
             -d "{\"days\": $DAYS, \"format\": \"$FORMAT\"}" \
             --output "$OUTPUT_DIR/user_${USER_ID}_analytics.$FORMAT"
        ;;
        
    "conversation")
        if [ -z "$CONVERSATION_ID" ]; then
            error "Conversation ID is required for conversation export. Use --conversation-id option."
        fi
        
        log "Exporting conversation analytics for conversation: $CONVERSATION_ID..."
        curl -X POST "http://localhost:8000/v1/analytics/export/conversation/$CONVERSATION_ID" \
             -H "Content-Type: application/json" \
             -d "{\"format\": \"$FORMAT\"}" \
             --output "$OUTPUT_DIR/conversation_${CONVERSATION_ID}_analytics.$FORMAT"
        ;;
        
    "raw")
        log "Exporting raw interaction data..."
        
        REQUEST_DATA="{\"format\": \"$FORMAT\""
        if [ -n "$START_DATE" ]; then
            REQUEST_DATA="$REQUEST_DATA, \"start_date\": \"$START_DATE\""
        fi
        if [ -n "$END_DATE" ]; then
            REQUEST_DATA="$REQUEST_DATA, \"end_date\": \"$END_DATE\""
        fi
        if [ -n "$USER_ID" ]; then
            REQUEST_DATA="$REQUEST_DATA, \"user_id\": \"$USER_ID\""
        fi
        if [ -n "$CONVERSATION_ID" ]; then
            REQUEST_DATA="$REQUEST_DATA, \"conversation_id\": \"$CONVERSATION_ID\""
        fi
        REQUEST_DATA="$REQUEST_DATA}"
        
        curl -X POST "http://localhost:8000/v1/analytics/export/raw" \
             -H "Content-Type: application/json" \
             -d "$REQUEST_DATA" \
             --output "$OUTPUT_DIR/raw_interactions.$FORMAT"
        ;;
        
    "comprehensive")
        log "Exporting comprehensive analytics report..."
        
        REQUEST_DATA="{}"
        if [ -n "$START_DATE" ]; then
            REQUEST_DATA="{\"start_date\": \"$START_DATE\""
            if [ -n "$END_DATE" ]; then
                REQUEST_DATA="$REQUEST_DATA, \"end_date\": \"$END_DATE\""
            fi
            REQUEST_DATA="$REQUEST_DATA}"
        fi
        
        curl -X POST "http://localhost:8000/v1/analytics/export/comprehensive" \
             -H "Content-Type: application/json" \
             -d "$REQUEST_DATA" \
             --output "$OUTPUT_DIR/comprehensive_report.zip"
        ;;
        
    "topics")
        log "Exporting topics analysis..."
        curl -X POST "http://localhost:8000/v1/analytics/export/topics" \
             -H "Content-Type: application/json" \
             -d "{\"days\": $DAYS, \"format\": \"$FORMAT\"}" \
             --output "$OUTPUT_DIR/topics_analysis.$FORMAT"
        ;;
        
    *)
        error "Unknown export type: $EXPORT_TYPE"
        ;;
esac

# Check if export was successful
if [ $? -eq 0 ]; then
    success "Export completed successfully!"
    
    # Show file information
    log "Exported files:"
    ls -la "$OUTPUT_DIR"/*.$FORMAT 2>/dev/null || ls -la "$OUTPUT_DIR"/*.zip 2>/dev/null || true
    
    # Show file sizes
    log "File sizes:"
    du -h "$OUTPUT_DIR"/* 2>/dev/null || true
    
    echo ""
    log "Files are available in: $OUTPUT_DIR"
    
    if [ "$EXPORT_TYPE" = "comprehensive" ]; then
        log "Comprehensive report includes multiple files in a directory"
    fi
else
    error "Export failed"
fi
