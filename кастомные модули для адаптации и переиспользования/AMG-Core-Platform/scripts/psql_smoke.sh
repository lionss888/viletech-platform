#!/bin/bash

# PostgreSQL smoke test script
# Tests connection to external PostgreSQL cluster

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Testing PostgreSQL connection...${NC}"

# Check if PG_DSN is set (takes precedence)
if [ -n "$PG_DSN" ]; then
    echo "Using PG_DSN connection string"
    
    # Extract connection details from PG_DSN
    # Format: postgresql+psycopg://user:pass@host:port/db?params
    if [[ $PG_DSN =~ postgresql\+psycopg://([^:]+):([^@]+)@([^:]+):([^/]+)/([^?]+) ]]; then
        PGUSER="${BASH_REMATCH[1]}"
        PGPASSWORD="${BASH_REMATCH[2]}"
        PGHOST="${BASH_REMATCH[3]}"
        PGPORT="${BASH_REMATCH[4]}"
        PGDATABASE="${BASH_REMATCH[5]}"
        
        # Extract sslmode from query params
        if [[ $PG_DSN =~ sslmode=([^&]+) ]]; then
            PGSSL="${BASH_REMATCH[1]}"
        else
            PGSSL="require"
        fi
    else
        echo -e "${RED}❌ Invalid PG_DSN format${NC}"
        echo "Expected format: postgresql+psycopg://user:pass@host:port/db?sslmode=require"
        exit 1
    fi
else
    # Use individual environment variables
    PGHOST="${PGHOST:-localhost}"
    PGPORT="${PGPORT:-5432}"
    PGUSER="${PGUSER:-postgres}"
    PGPASSWORD="${PGPASSWORD:-}"
    PGDATABASE="${PGDATABASE:-postgres}"
    PGSSL="${PGSSL:-require}"
    
    echo "Using individual environment variables"
fi

# Validate required parameters
if [ -z "$PGHOST" ] || [ -z "$PGUSER" ] || [ -z "$PGDATABASE" ]; then
    echo -e "${RED}❌ Missing required parameters${NC}"
    echo "Required: PGHOST, PGUSER, PGDATABASE (or PG_DSN)"
    exit 1
fi

if [ -z "$PGPASSWORD" ]; then
    echo -e "${YELLOW}⚠️  Warning: PGPASSWORD is empty${NC}"
fi

# Build connection string for psql
CONNECTION_STRING="host=${PGHOST} port=${PGPORT} user=${PGUSER} dbname=${PGDATABASE} sslmode=${PGSSL} connect_timeout=5"

echo "Connection details:"
echo "  Host: ${PGHOST}"
echo "  Port: ${PGPORT}"
echo "  User: ${PGUSER}"
echo "  Database: ${PGDATABASE}"
echo "  SSL Mode: ${PGSSL}"
echo ""

# Test connection
echo -e "${YELLOW}Testing connection...${NC}"

if docker run --rm \
    -e PGPASSWORD="${PGPASSWORD}" \
    postgres:16-alpine \
    psql "${CONNECTION_STRING}" \
    -c "SELECT 1 as test_connection, version() as postgres_version;" 2>/dev/null; then
    
    echo -e "${GREEN}✅ PostgreSQL connection successful!${NC}"
    echo -e "${GREEN}✅ Database is accessible and responding${NC}"
    exit 0
else
    echo -e "${RED}❌ PostgreSQL connection failed!${NC}"
    echo ""
    echo "Troubleshooting tips:"
    echo "1. Check if PostgreSQL is running and accessible"
    echo "2. Verify host, port, and database name"
    echo "3. Check username and password"
    echo "4. Ensure SSL settings are correct"
    echo "5. Check firewall/network connectivity"
    echo "6. For Docker networks, ensure containers can communicate"
    echo ""
    echo "Connection string used: ${CONNECTION_STRING}"
    exit 1
fi
