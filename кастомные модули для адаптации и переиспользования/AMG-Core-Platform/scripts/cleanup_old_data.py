#!/usr/bin/env python3
"""Data cleanup script for AMG Flow retention policy."""

import os
import sys
import argparse
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config.retention import (
    DEFAULT_RETENTION_POLICY, 
    PRODUCTION_RETENTION_POLICY, 
    DEVELOPMENT_RETENTION_POLICY
)
from app.config import settings


class DataCleanup:
    """Data cleanup manager for retention policy."""
    
    def __init__(self, policy_name: str = "default", dry_run: bool = False):
        """Initialize cleanup manager."""
        self.policy_name = policy_name
        self.dry_run = dry_run
        
        # Select policy
        if policy_name == "production":
            self.policy = PRODUCTION_RETENTION_POLICY
        elif policy_name == "development":
            self.policy = DEVELOPMENT_RETENTION_POLICY
        else:
            self.policy = DEFAULT_RETENTION_POLICY
        
        # Override dry_run if specified
        if dry_run:
            self.policy.dry_run = True
        
        # Database connection
        self.engine = create_engine(settings.database_url)
        self.Session = sessionmaker(bind=self.engine)
        
        # Statistics
        self.stats = {
            "tables_processed": 0,
            "records_deleted": 0,
            "records_archived": 0,
            "errors": 0
        }
    
    def cleanup_table(self, table_name: str) -> Dict[str, Any]:
        """Clean up old data from specific table."""
        print(f"🧹 Cleaning table: {table_name}")
        
        retention_days = self.policy.get_retention_days(table_name)
        date_column = self.policy.get_date_column(table_name)
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        result = {
            "table": table_name,
            "retention_days": retention_days,
            "cutoff_date": cutoff_date,
            "records_found": 0,
            "records_deleted": 0,
            "records_archived": 0,
            "error": None
        }
        
        try:
            with self.Session() as session:
                # Count records to be deleted
                count_query = text(f"""
                    SELECT COUNT(*) as count 
                    FROM {table_name} 
                    WHERE {date_column} < :cutoff_date
                """)
                count_result = session.execute(count_query, {"cutoff_date": cutoff_date}).fetchone()
                result["records_found"] = count_result[0] if count_result else 0
                
                if result["records_found"] == 0:
                    print(f"   ✅ No old records found in {table_name}")
                    return result
                
                print(f"   📊 Found {result['records_found']} old records in {table_name}")
                
                if self.policy.dry_run:
                    print(f"   🔍 DRY RUN: Would delete {result['records_found']} records")
                    result["records_deleted"] = result["records_found"]
                    return result
                
                # Archive data if enabled
                if self.policy.archive_before_delete and self.policy.should_archive(table_name):
                    archived_count = self._archive_table_data(session, table_name, cutoff_date)
                    result["records_archived"] = archived_count
                    print(f"   📦 Archived {archived_count} records")
                
                # Delete old records in batches
                deleted_count = self._delete_old_records(session, table_name, date_column, cutoff_date)
                result["records_deleted"] = deleted_count
                print(f"   🗑️  Deleted {deleted_count} records")
                
                session.commit()
                
        except Exception as e:
            result["error"] = str(e)
            print(f"   ❌ Error cleaning {table_name}: {e}")
            self.stats["errors"] += 1
        
        return result
    
    def _archive_table_data(self, session, table_name: str, cutoff_date: datetime) -> int:
        """Archive old data before deletion."""
        try:
            # Create archive table if it doesn't exist
            archive_table = f"{table_name}_archive"
            create_archive_query = text(f"""
                CREATE TABLE IF NOT EXISTS {archive_table} 
                (LIKE {table_name} INCLUDING ALL)
            """)
            session.execute(create_archive_query)
            
            # Copy data to archive
            date_column = self.policy.get_date_column(table_name)
            archive_query = text(f"""
                INSERT INTO {archive_table} 
                SELECT * FROM {table_name} 
                WHERE {date_column} < :cutoff_date
            """)
            result = session.execute(archive_query, {"cutoff_date": cutoff_date})
            return result.rowcount
            
        except Exception as e:
            print(f"   ⚠️  Archive failed for {table_name}: {e}")
            return 0
    
    def _delete_old_records(self, session, table_name: str, date_column: str, cutoff_date: datetime) -> int:
        """Delete old records in batches."""
        total_deleted = 0
        batch_size = self.policy.batch_size
        
        while True:
            # Delete batch
            delete_query = text(f"""
                DELETE FROM {table_name} 
                WHERE {date_column} < :cutoff_date 
                AND id IN (
                    SELECT id FROM {table_name} 
                    WHERE {date_column} < :cutoff_date 
                    LIMIT :batch_size
                )
            """)
            
            result = session.execute(delete_query, {
                "cutoff_date": cutoff_date,
                "batch_size": batch_size
            })
            
            deleted_count = result.rowcount
            total_deleted += deleted_count
            
            if deleted_count == 0:
                break
            
            print(f"   🔄 Deleted batch of {deleted_count} records...")
            session.commit()
        
        return total_deleted
    
    def cleanup_all_tables(self) -> List[Dict[str, Any]]:
        """Clean up all configured tables."""
        print(f"🚀 Starting data cleanup with policy: {self.policy_name}")
        print(f"📅 Cutoff date: {datetime.utcnow() - timedelta(days=min(
            self.policy.get_retention_days(table) 
            for table in self.policy.tables_to_clean.keys()
        ))}")
        print(f"🔍 Dry run: {self.policy.dry_run}")
        print()
        
        results = []
        
        for table_name, config in self.policy.tables_to_clean.items():
            print(f"📋 Table: {table_name} ({config['description']})")
            print(f"   Retention: {config['retention_days']} days")
            
            result = self.cleanup_table(table_name)
            results.append(result)
            
            # Update statistics
            self.stats["tables_processed"] += 1
            self.stats["records_deleted"] += result["records_deleted"]
            self.stats["records_archived"] += result["records_archived"]
            
            print()
        
        return results
    
    def print_summary(self, results: List[Dict[str, Any]]):
        """Print cleanup summary."""
        print("=" * 60)
        print("📊 CLEANUP SUMMARY")
        print("=" * 60)
        
        print(f"Policy: {self.policy_name}")
        print(f"Dry run: {self.policy.dry_run}")
        print(f"Tables processed: {self.stats['tables_processed']}")
        print(f"Records deleted: {self.stats['records_deleted']}")
        print(f"Records archived: {self.stats['records_archived']}")
        print(f"Errors: {self.stats['errors']}")
        print()
        
        print("📋 Table details:")
        for result in results:
            status = "✅" if not result["error"] else "❌"
            print(f"  {status} {result['table']}: {result['records_deleted']} deleted, {result['records_archived']} archived")
            if result["error"]:
                print(f"    Error: {result['error']}")
        
        print()
        if self.policy.dry_run:
            print("🔍 This was a DRY RUN - no data was actually deleted")
        else:
            print("✅ Cleanup completed successfully")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Clean up old data based on retention policy")
    parser.add_argument(
        "--policy", 
        choices=["default", "development", "production"], 
        default="default",
        help="Retention policy to use"
    )
    parser.add_argument(
        "--dry-run", 
        action="store_true",
        help="Show what would be deleted without actually deleting"
    )
    parser.add_argument(
        "--table",
        help="Clean specific table only"
    )
    
    args = parser.parse_args()
    
    # Initialize cleanup manager
    cleanup = DataCleanup(policy_name=args.policy, dry_run=args.dry_run)
    
    try:
        if args.table:
            # Clean specific table
            if args.table not in cleanup.policy.tables_to_clean:
                print(f"❌ Table '{args.table}' not configured for cleanup")
                sys.exit(1)
            
            result = cleanup.cleanup_table(args.table)
            cleanup.print_summary([result])
        else:
            # Clean all tables
            results = cleanup.cleanup_all_tables()
            cleanup.print_summary(results)
    
    except KeyboardInterrupt:
        print("\n⚠️  Cleanup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
