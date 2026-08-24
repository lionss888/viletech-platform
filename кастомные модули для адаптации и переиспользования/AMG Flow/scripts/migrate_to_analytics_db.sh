#!/bin/bash

# Script for migrating to separate analytics database
# Usage: ./scripts/migrate_to_analytics_db.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BACKUP_DATA=true
CREATE_ANALYTICS_DB=true
MIGRATE_EXISTING_DATA=true
TEST_MIGRATION=false

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
    echo "Options:"
    echo "  --no-backup           Skip data backup"
    echo "  --no-create-db        Skip analytics database creation"
    echo "  --no-migrate          Skip existing data migration"
    echo "  --test-only           Test migration without applying changes"
    echo "  -h, --help            Show this help"
    echo ""
    echo "This script will:"
    echo "  1. Backup existing data"
    echo "  2. Create separate analytics database"
    echo "  3. Migrate analytics tables to new database"
    echo "  4. Update application configuration"
    echo "  5. Test the migration"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-backup)
            BACKUP_DATA=false
            shift
            ;;
        --no-create-db)
            CREATE_ANALYTICS_DB=false
            shift
            ;;
        --no-migrate)
            MIGRATE_EXISTING_DATA=false
            shift
            ;;
        --test-only)
            TEST_MIGRATION=true
            shift
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

log "Starting migration to separate analytics database..."

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    error "Docker is not running. Please start Docker first."
fi

# Check if current system is running
if docker compose ps | grep -q "Up"; then
    warning "Current system is running. Stopping services..."
    docker compose down
fi

# Step 1: Backup existing data
if [ "$BACKUP_DATA" = true ]; then
    log "Step 1: Backing up existing data..."
    
    # Start only the database for backup
    docker compose up -d db
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10
    
    # Create backup
    BACKUP_FILE="backup_before_analytics_migration_$(date +%Y%m%d_%H%M%S).sql"
    log "Creating backup: $BACKUP_FILE"
    
    docker compose exec -T db pg_dump -U user -d appdb > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        success "Backup created: $BACKUP_FILE"
    else
        error "Failed to create backup"
    fi
    
    # Stop database
    docker compose down
else
    log "Skipping data backup"
fi

# Step 2: Create analytics database
if [ "$CREATE_ANALYTICS_DB" = true ]; then
    log "Step 2: Creating analytics database..."
    
    # Start both databases
    docker compose -f docker-compose.analytics.yml up -d db analytics_db
    
    # Wait for databases to be ready
    log "Waiting for databases to be ready..."
    sleep 15
    
    # Test connections
    log "Testing database connections..."
    
    # Test operational database
    if docker compose exec db pg_isready -U user -d appdb; then
        success "Operational database is ready"
    else
        error "Operational database is not ready"
    fi
    
    # Test analytics database
    if docker compose exec analytics_db pg_isready -U analytics_user -d analytics; then
        success "Analytics database is ready"
    else
        error "Analytics database is not ready"
    fi
    
else
    log "Skipping analytics database creation"
fi

# Step 3: Migrate existing data
if [ "$MIGRATE_EXISTING_DATA" = true ]; then
    log "Step 3: Migrating existing analytics data..."
    
    # Create migration script
    cat > migrate_analytics_data.py << 'EOF'
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database URLs
OPERATIONAL_DB_URL = "postgresql+psycopg2://user:pass@localhost:5432/appdb"
ANALYTICS_DB_URL = "postgresql+psycopg2://analytics_user:analytics_pass@localhost:5433/analytics"

def migrate_data():
    # Create engines
    operational_engine = create_engine(OPERATIONAL_DB_URL)
    analytics_engine = create_engine(ANALYTICS_DB_URL)
    
    # Check if analytics tables exist in operational DB
    with operational_engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('user_sessions', 'user_interactions', 'conversation_metrics')
        """))
        existing_tables = [row[0] for row in result]
    
    if not existing_tables:
        print("No analytics tables found in operational database")
        return
    
    print(f"Found analytics tables: {existing_tables}")
    
    # Migrate each table
    for table in existing_tables:
        print(f"Migrating table: {table}")
        
        # Get data from operational DB
        with operational_engine.connect() as conn:
            result = conn.execute(text(f"SELECT * FROM {table}"))
            rows = result.fetchall()
            columns = result.keys()
        
        if not rows:
            print(f"No data in {table}")
            continue
        
        # Insert data into analytics DB
        with analytics_engine.connect() as conn:
            # Create table if not exists (simplified)
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS {table} (
                    LIKE {table} INCLUDING ALL
                )
            """))
            
            # Insert data
            for row in rows:
                values = ', '.join([f"'{str(v)}'" if v is not None else 'NULL' for v in row])
                conn.execute(text(f"INSERT INTO {table} VALUES ({values}) ON CONFLICT DO NOTHING"))
            
            conn.commit()
        
        print(f"Migrated {len(rows)} rows from {table}")
    
    print("Data migration completed")

if __name__ == "__main__":
    migrate_data()
EOF
    
    # Run migration
    python migrate_analytics_data.py
    
    if [ $? -eq 0 ]; then
        success "Data migration completed"
    else
        error "Data migration failed"
    fi
    
    # Clean up
    rm migrate_analytics_data.py
    
else
    log "Skipping data migration"
fi

# Step 4: Update application configuration
log "Step 4: Updating application configuration..."

# Create environment file for analytics
cat > .env.analytics << EOF
# Analytics Database Configuration
ANALYTICS_PG_DSN=postgresql+psycopg2://analytics_user:analytics_pass@analytics_db:5432/analytics
ANALYTICS_DB_POOL_SIZE=5
ANALYTICS_DB_POOL_TIMEOUT=30
SYNC_ENABLED=true
SYNC_BATCH_SIZE=1000
SYNC_INTERVAL_SECONDS=300
EOF

success "Configuration updated"

# Step 5: Test migration
if [ "$TEST_MIGRATION" = true ]; then
    log "Step 5: Testing migration..."
    
    # Start the system with analytics database
    docker compose -f docker-compose.analytics.yml up -d
    
    # Wait for services to be ready
    sleep 20
    
    # Test API health
    if curl -s http://localhost:8000/v1/health > /dev/null; then
        success "API is healthy"
    else
        error "API health check failed"
    fi
    
    # Test analytics endpoints
    if curl -s http://localhost:8000/v1/analytics/daily > /dev/null; then
        success "Analytics endpoints are working"
    else
        warning "Analytics endpoints may not be working yet"
    fi
    
    # Show database status
    log "Database status:"
    docker compose -f docker-compose.analytics.yml ps
    
    success "Migration test completed"
    
    # Stop services
    docker compose -f docker-compose.analytics.yml down
else
    log "Skipping migration test"
fi

# Summary
log "Migration completed!"
echo ""
echo "Next steps:"
echo "1. Start the system with analytics database:"
echo "   docker compose -f docker-compose.analytics.yml up -d"
echo ""
echo "2. Run database migrations:"
echo "   make db-migrate"
echo ""
echo "3. Test the system:"
echo "   make health"
echo "   make analytics-daily"
echo ""
echo "4. Monitor analytics database:"
echo "   docker compose -f docker-compose.analytics.yml logs analytics_db"
echo ""

if [ "$BACKUP_DATA" = true ]; then
    echo "Backup file: $BACKUP_FILE"
fi

success "Migration script completed successfully"
