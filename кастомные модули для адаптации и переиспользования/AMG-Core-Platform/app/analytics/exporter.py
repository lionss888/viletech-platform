"""Data exporter for analytics and reporting."""

import json
import csv
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
from sqlalchemy.orm import Session

from app.analytics.collector import DataCollector
from app.utils.logging import get_logger

logger = get_logger(__name__)


class DataExporter:
    """Exports analytics data in various formats for customer analysis."""
    
    def __init__(self, db: Session):
        self.db = db
        self.collector = DataCollector(db)
    
    def export_daily_report(
        self,
        date: Optional[datetime] = None,
        format: str = "json",
        output_path: Optional[str] = None
    ) -> str:
        """Export daily analytics report."""
        try:
            stats = self.collector.get_daily_stats(date)
            
            if not output_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = f"analytics_daily_{timestamp}.{format}"
            
            if format.lower() == "json":
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(stats, f, indent=2, ensure_ascii=False, default=str)
            
            elif format.lower() == "csv":
                # Flatten the nested structure for CSV
                flattened_data = self._flatten_dict(stats)
                
                with open(output_path, 'w', newline='', encoding='utf-8') as f:
                    if flattened_data:
                        writer = csv.DictWriter(f, fieldnames=flattened_data[0].keys())
                        writer.writeheader()
                        writer.writerows(flattened_data)
            
            elif format.lower() == "xlsx":
                # Create Excel file with multiple sheets
                with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                    # Main stats sheet
                    df_stats = pd.DataFrame([stats])
                    df_stats.to_excel(writer, sheet_name='Daily_Stats', index=False)
                    
                    # Sessions sheet
                    if 'sessions' in stats:
                        df_sessions = pd.DataFrame([stats['sessions']])
                        df_sessions.to_excel(writer, sheet_name='Sessions', index=False)
                    
                    # Models sheet
                    if 'models' in stats and 'usage' in stats['models']:
                        df_models = pd.DataFrame(stats['models']['usage'])
                        df_models.to_excel(writer, sheet_name='Model_Usage', index=False)
            
            logger.info(f"Daily report exported to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to export daily report: {str(e)}")
            raise
    
    def export_user_analytics(
        self,
        user_id: str,
        days: int = 30,
        format: str = "json",
        output_path: Optional[str] = None
    ) -> str:
        """Export user-specific analytics."""
        try:
            analytics = self.collector.get_user_analytics(user_id, days)
            
            if not output_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = f"analytics_user_{user_id}_{timestamp}.{format}"
            
            if format.lower() == "json":
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(analytics, f, indent=2, ensure_ascii=False, default=str)
            
            elif format.lower() == "csv":
                flattened_data = self._flatten_dict(analytics)
                
                with open(output_path, 'w', newline='', encoding='utf-8') as f:
                    if flattened_data:
                        writer = csv.DictWriter(f, fieldnames=flattened_data[0].keys())
                        writer.writeheader()
                        writer.writerows(flattened_data)
            
            elif format.lower() == "xlsx":
                with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                    # User overview
                    df_user = pd.DataFrame([analytics])
                    df_user.to_excel(writer, sheet_name='User_Overview', index=False)
                    
                    # Sessions detail
                    if 'sessions' in analytics:
                        df_sessions = pd.DataFrame([analytics['sessions']])
                        df_sessions.to_excel(writer, sheet_name='Sessions', index=False)
                    
                    # Model usage
                    if 'models' in analytics and 'preferred' in analytics['models']:
                        df_models = pd.DataFrame(analytics['models']['preferred'], 
                                               columns=['model', 'usage_count'])
                        df_models.to_excel(writer, sheet_name='Model_Usage', index=False)
            
            logger.info(f"User analytics exported to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to export user analytics: {str(e)}")
            raise
    
    def export_conversation_data(
        self,
        conversation_id: str,
        format: str = "json",
        output_path: Optional[str] = None
    ) -> str:
        """Export detailed conversation data."""
        try:
            analytics = self.collector.get_conversation_analytics(conversation_id)
            
            if not output_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = f"analytics_conversation_{conversation_id}_{timestamp}.{format}"
            
            if format.lower() == "json":
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(analytics, f, indent=2, ensure_ascii=False, default=str)
            
            elif format.lower() == "csv":
                flattened_data = self._flatten_dict(analytics)
                
                with open(output_path, 'w', newline='', encoding='utf-8') as f:
                    if flattened_data:
                        writer = csv.DictWriter(f, fieldnames=flattened_data[0].keys())
                        writer.writeheader()
                        writer.writerows(flattened_data)
            
            logger.info(f"Conversation data exported to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to export conversation data: {str(e)}")
            raise
    
    def export_raw_interactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        format: str = "csv",
        output_path: Optional[str] = None
    ) -> str:
        """Export raw interaction data for detailed analysis."""
        try:
            raw_data = self.collector.get_export_data(
                start_date, end_date, user_id, conversation_id
            )
            
            if not output_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = f"analytics_raw_interactions_{timestamp}.{format}"
            
            if format.lower() == "json":
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(raw_data, f, indent=2, ensure_ascii=False, default=str)
            
            elif format.lower() == "csv":
                if raw_data:
                    with open(output_path, 'w', newline='', encoding='utf-8') as f:
                        writer = csv.DictWriter(f, fieldnames=raw_data[0].keys())
                        writer.writeheader()
                        writer.writerows(raw_data)
                else:
                    # Create empty CSV with headers
                    with open(output_path, 'w', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow([
                            'id', 'session_id', 'conversation_id', 'interaction_type',
                            'timestamp', 'message_content', 'message_length', 'model_used',
                            'response_time_ms', 'response_length', 'error_type', 'error_message', 'metadata'
                        ])
            
            elif format.lower() == "xlsx":
                if raw_data:
                    df = pd.DataFrame(raw_data)
                    df.to_excel(output_path, index=False)
                else:
                    # Create empty Excel file
                    df = pd.DataFrame(columns=[
                        'id', 'session_id', 'conversation_id', 'interaction_type',
                        'timestamp', 'message_content', 'message_length', 'model_used',
                        'response_time_ms', 'response_length', 'error_type', 'error_message', 'metadata'
                    ])
                    df.to_excel(output_path, index=False)
            
            logger.info(f"Raw interactions exported to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to export raw interactions: {str(e)}")
            raise
    
    def export_topics_analysis(
        self,
        days: int = 30,
        format: str = "json",
        output_path: Optional[str] = None
    ) -> str:
        """Export topics and patterns analysis."""
        try:
            topics = self.collector.get_topics_analysis(days)
            
            if not output_path:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = f"analytics_topics_{days}days_{timestamp}.{format}"
            
            if format.lower() == "json":
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(topics, f, indent=2, ensure_ascii=False, default=str)
            
            elif format.lower() == "csv":
                # Export keywords as CSV
                if 'top_keywords' in topics:
                    with open(output_path, 'w', newline='', encoding='utf-8') as f:
                        writer = csv.DictWriter(f, fieldnames=['word', 'count'])
                        writer.writeheader()
                        writer.writerows(topics['top_keywords'])
            
            elif format.lower() == "xlsx":
                with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                    # Keywords sheet
                    if 'top_keywords' in topics:
                        df_keywords = pd.DataFrame(topics['top_keywords'])
                        df_keywords.to_excel(writer, sheet_name='Keywords', index=False)
                    
                    # Summary sheet
                    summary_data = {
                        'metric': ['Total Messages', 'Question Rate', 'Avg Message Length', 'Unique Words'],
                        'value': [
                            topics.get('total_messages', 0),
                            topics.get('question_analysis', {}).get('question_rate', 0),
                            topics.get('content_analysis', {}).get('avg_message_length', 0),
                            topics.get('content_analysis', {}).get('unique_words', 0)
                        ]
                    }
                    df_summary = pd.DataFrame(summary_data)
                    df_summary.to_excel(writer, sheet_name='Summary', index=False)
            
            logger.info(f"Topics analysis exported to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to export topics analysis: {str(e)}")
            raise
    
    def export_comprehensive_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        output_dir: Optional[str] = None
    ) -> Dict[str, str]:
        """Export comprehensive analytics report with multiple files."""
        try:
            if start_date is None:
                start_date = datetime.utcnow() - timedelta(days=30)
            if end_date is None:
                end_date = datetime.utcnow()
            
            if not output_dir:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_dir = f"analytics_comprehensive_{timestamp}"
            
            Path(output_dir).mkdir(parents=True, exist_ok=True)
            
            exported_files = {}
            
            # Daily stats
            daily_stats = self.collector.get_daily_stats(start_date.date())
            daily_file = Path(output_dir) / "daily_stats.json"
            with open(daily_file, 'w', encoding='utf-8') as f:
                json.dump(daily_stats, f, indent=2, ensure_ascii=False, default=str)
            exported_files['daily_stats'] = str(daily_file)
            
            # Raw interactions
            raw_file = self.export_raw_interactions(
                start_date, end_date, 
                format="csv",
                output_path=str(Path(output_dir) / "raw_interactions.csv")
            )
            exported_files['raw_interactions'] = raw_file
            
            # Topics analysis
            topics_file = self.export_topics_analysis(
                days=(end_date - start_date).days,
                format="xlsx",
                output_path=str(Path(output_dir) / "topics_analysis.xlsx")
            )
            exported_files['topics_analysis'] = topics_file
            
            # Create summary report
            summary = {
                "report_generated_at": datetime.utcnow().isoformat(),
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": (end_date - start_date).days
                },
                "files_exported": exported_files,
                "summary_stats": daily_stats
            }
            
            summary_file = Path(output_dir) / "summary_report.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False, default=str)
            exported_files['summary'] = str(summary_file)
            
            logger.info(f"Comprehensive report exported to {output_dir}")
            return exported_files
            
        except Exception as e:
            logger.error(f"Failed to export comprehensive report: {str(e)}")
            raise
    
    def _flatten_dict(self, data: Dict[str, Any], parent_key: str = '', sep: str = '_') -> List[Dict[str, Any]]:
        """Flatten nested dictionary for CSV export."""
        items = []
        
        def _flatten(obj, parent_key='', sep='_'):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    new_key = f"{parent_key}{sep}{k}" if parent_key else k
                    _flatten(v, new_key, sep)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    new_key = f"{parent_key}{sep}{i}" if parent_key else str(i)
                    _flatten(item, new_key, sep)
            else:
                items.append({parent_key: obj})
        
        _flatten(data, parent_key, sep)
        return items if items else [{}]
