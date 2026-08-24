"""API routes for analytics and data collection."""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.analytics.tracker import AnalyticsTracker
from app.analytics.collector import DataCollector
from app.analytics.exporter import DataExporter
from app.utils.logging import get_request_id

router = APIRouter()


@router.get("/analytics/daily")
async def get_daily_analytics(
    date: Optional[str] = None,
    days: int = 1,
    db: Session = Depends(get_db)
):
    """Get daily analytics statistics."""
    try:
        collector = DataCollector(db)
        
        parsed_date = None
        if date:
            parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        
        stats = collector.get_daily_stats(parsed_date, days)
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get daily analytics: {str(e)}")


@router.get("/analytics/user/{user_id}")
async def get_user_analytics(
    user_id: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get user-specific analytics."""
    try:
        collector = DataCollector(db)
        analytics = collector.get_user_analytics(user_id, days)
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user analytics: {str(e)}")


@router.get("/analytics/conversation/{conversation_id}")
async def get_conversation_analytics(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    """Get conversation-specific analytics."""
    try:
        collector = DataCollector(db)
        analytics = collector.get_conversation_analytics(conversation_id)
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversation analytics: {str(e)}")


@router.get("/analytics/topics")
async def get_topics_analysis(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get topics and patterns analysis."""
    try:
        collector = DataCollector(db)
        topics = collector.get_topics_analysis(days)
        return topics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get topics analysis: {str(e)}")


@router.post("/analytics/export/daily")
async def export_daily_report(
    date: Optional[str] = None,
    format: str = "json",
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Export daily analytics report."""
    try:
        exporter = DataExporter(db)
        
        parsed_date = None
        if date:
            parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        
        if background_tasks:
            # Run in background for large exports
            background_tasks.add_task(
                _export_daily_background,
                exporter,
                parsed_date,
                format
            )
            return {"message": "Export started in background", "status": "started"}
        else:
            file_path = exporter.export_daily_report(parsed_date, format)
            return {"message": "Export completed", "file_path": file_path}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export daily report: {str(e)}")


@router.post("/analytics/export/user/{user_id}")
async def export_user_analytics(
    user_id: str,
    days: int = 30,
    format: str = "json",
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Export user analytics."""
    try:
        exporter = DataExporter(db)
        
        if background_tasks:
            background_tasks.add_task(
                _export_user_background,
                exporter,
                user_id,
                days,
                format
            )
            return {"message": "Export started in background", "status": "started"}
        else:
            file_path = exporter.export_user_analytics(user_id, days, format)
            return {"message": "Export completed", "file_path": file_path}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export user analytics: {str(e)}")


@router.post("/analytics/export/conversation/{conversation_id}")
async def export_conversation_data(
    conversation_id: str,
    format: str = "json",
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Export conversation data."""
    try:
        exporter = DataExporter(db)
        
        if background_tasks:
            background_tasks.add_task(
                _export_conversation_background,
                exporter,
                conversation_id,
                format
            )
            return {"message": "Export started in background", "status": "started"}
        else:
            file_path = exporter.export_conversation_data(conversation_id, format)
            return {"message": "Export completed", "file_path": file_path}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export conversation data: {str(e)}")


@router.post("/analytics/export/raw")
async def export_raw_interactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    format: str = "csv",
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Export raw interaction data."""
    try:
        exporter = DataExporter(db)
        
        parsed_start = None
        parsed_end = None
        
        if start_date:
            parsed_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            parsed_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if background_tasks:
            background_tasks.add_task(
                _export_raw_background,
                exporter,
                parsed_start,
                parsed_end,
                user_id,
                conversation_id,
                format
            )
            return {"message": "Export started in background", "status": "started"}
        else:
            file_path = exporter.export_raw_interactions(
                parsed_start, parsed_end, user_id, conversation_id, format
            )
            return {"message": "Export completed", "file_path": file_path}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export raw interactions: {str(e)}")


@router.post("/analytics/export/comprehensive")
async def export_comprehensive_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Export comprehensive analytics report."""
    try:
        exporter = DataExporter(db)
        
        parsed_start = None
        parsed_end = None
        
        if start_date:
            parsed_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            parsed_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if background_tasks:
            background_tasks.add_task(
                _export_comprehensive_background,
                exporter,
                parsed_start,
                parsed_end
            )
            return {"message": "Comprehensive export started in background", "status": "started"}
        else:
            files = exporter.export_comprehensive_report(parsed_start, parsed_end)
            return {"message": "Export completed", "files": files}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export comprehensive report: {str(e)}")


@router.get("/analytics/sessions")
async def get_active_sessions(
    db: Session = Depends(get_db)
):
    """Get active user sessions."""
    try:
        from app.analytics.models import UserSession
        
        active_sessions = db.query(UserSession).filter(
            UserSession.is_active == True
        ).all()
        
        return {
            "active_sessions": len(active_sessions),
            "sessions": [
                {
                    "session_id": session.session_id,
                    "user_id": session.user_id,
                    "started_at": session.started_at.isoformat(),
                    "ip_address": session.ip_address,
                    "user_agent": session.user_agent
                }
                for session in active_sessions
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active sessions: {str(e)}")


@router.get("/analytics/metrics")
async def get_system_metrics(
    days: int = 7,
    db: Session = Depends(get_db)
):
    """Get system-wide metrics."""
    try:
        collector = DataCollector(db)
        
        # Get daily stats for the period
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        daily_stats = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            stats = collector.get_daily_stats(date.date())
            daily_stats.append(stats)
        
        # Calculate totals
        total_sessions = sum(day.get('sessions', {}).get('total', 0) for day in daily_stats)
        total_conversations = sum(day.get('conversations', {}).get('total', 0) for day in daily_stats)
        total_interactions = sum(day.get('interactions', {}).get('total', 0) for day in daily_stats)
        
        return {
            "period_days": days,
            "total_sessions": total_sessions,
            "total_conversations": total_conversations,
            "total_interactions": total_interactions,
            "daily_breakdown": daily_stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system metrics: {str(e)}")


# Background task functions
async def _export_daily_background(exporter, date, format):
    """Background task for daily export."""
    try:
        file_path = exporter.export_daily_report(date, format)
        print(f"Daily export completed: {file_path}")
    except Exception as e:
        print(f"Daily export failed: {str(e)}")


async def _export_user_background(exporter, user_id, days, format):
    """Background task for user export."""
    try:
        file_path = exporter.export_user_analytics(user_id, days, format)
        print(f"User export completed: {file_path}")
    except Exception as e:
        print(f"User export failed: {str(e)}")


async def _export_conversation_background(exporter, conversation_id, format):
    """Background task for conversation export."""
    try:
        file_path = exporter.export_conversation_data(conversation_id, format)
        print(f"Conversation export completed: {file_path}")
    except Exception as e:
        print(f"Conversation export failed: {str(e)}")


async def _export_raw_background(exporter, start_date, end_date, user_id, conversation_id, format):
    """Background task for raw data export."""
    try:
        file_path = exporter.export_raw_interactions(start_date, end_date, user_id, conversation_id, format)
        print(f"Raw data export completed: {file_path}")
    except Exception as e:
        print(f"Raw data export failed: {str(e)}")


async def _export_comprehensive_background(exporter, start_date, end_date):
    """Background task for comprehensive export."""
    try:
        files = exporter.export_comprehensive_report(start_date, end_date)
        print(f"Comprehensive export completed: {files}")
    except Exception as e:
        print(f"Comprehensive export failed: {str(e)}")
