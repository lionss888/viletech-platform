"""Analytics API routes - только аналитика и метрики."""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.analytics.tracker import AnalyticsTracker
from app.utils.errors import ValidationError

router = APIRouter()


@router.post("/analytics/track")
async def track_event(data: Dict[str, Any], db: Session = Depends(get_db)):
    """Отслеживает аналитическое событие."""
    try:
        session_id = data.get("session_id")
        conversation_id = data.get("conversation_id")
        event_type = data.get("event_type")
        event_data = data.get("data", {})
        
        if not all([session_id, event_type]):
            raise ValidationError("session_id and event_type are required")
        
        # Создаем трекер
        tracker = AnalyticsTracker(db)
        
        # Отслеживаем событие
        await tracker.track_event(
            session_id=session_id,
            conversation_id=conversation_id,
            event_type=event_type,
            data=event_data
        )
        
        return {
            "success": True,
            "message": "Event tracked successfully"
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track event: {str(e)}")


@router.get("/analytics/daily")
async def get_daily_analytics(
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Получает ежедневную аналитику."""
    try:
        # Парсим дату или используем сегодня
        if date:
            target_date = datetime.fromisoformat(date).date()
        else:
            target_date = datetime.now().date()
        
        tracker = AnalyticsTracker(db)
        
        # Получаем аналитику за день
        analytics = await tracker.get_daily_analytics(target_date)
        
        return {
            "date": target_date.isoformat(),
            "analytics": analytics
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get daily analytics: {str(e)}")


@router.get("/analytics/user/{user_id}")
async def get_user_analytics(
    user_id: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Получает аналитику пользователя."""
    try:
        tracker = AnalyticsTracker(db)
        
        # Получаем аналитику пользователя
        analytics = await tracker.get_user_analytics(user_id, days)
        
        return {
            "user_id": user_id,
            "period_days": days,
            "analytics": analytics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user analytics: {str(e)}")


@router.get("/analytics/conversation/{conversation_id}")
async def get_conversation_analytics(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    """Получает аналитику разговора."""
    try:
        tracker = AnalyticsTracker(db)
        
        # Получаем аналитику разговора
        analytics = await tracker.get_conversation_analytics(conversation_id)
        
        return {
            "conversation_id": conversation_id,
            "analytics": analytics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversation analytics: {str(e)}")


@router.get("/analytics/models")
async def get_models_analytics(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Получает аналитику использования моделей."""
    try:
        tracker = AnalyticsTracker(db)
        
        # Получаем аналитику моделей
        analytics = await tracker.get_models_analytics(days)
        
        return {
            "period_days": days,
            "models": analytics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models analytics: {str(e)}")


@router.get("/analytics/performance")
async def get_performance_analytics(
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """Получает аналитику производительности."""
    try:
        tracker = AnalyticsTracker(db)
        
        # Получаем аналитику производительности
        analytics = await tracker.get_performance_analytics(hours)
        
        return {
            "period_hours": hours,
            "performance": analytics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance analytics: {str(e)}")


@router.post("/analytics/export")
async def export_analytics(
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Экспортирует аналитические данные."""
    try:
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        format_type = data.get("format", "json")  # json, csv
        
        if not all([start_date, end_date]):
            raise ValidationError("start_date and end_date are required")
        
        # Парсим даты
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        
        tracker = AnalyticsTracker(db)
        
        # Экспортируем данные
        exported_data = await tracker.export_analytics(start, end, format_type)
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "format": format_type,
            "data": exported_data,
            "exported_at": datetime.now().isoformat()
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export analytics: {str(e)}")


@router.get("/analytics/summary")
async def get_analytics_summary(db: Session = Depends(get_db)):
    """Получает сводку аналитики."""
    try:
        tracker = AnalyticsTracker(db)
        
        # Получаем сводку
        summary = await tracker.get_summary()
        
        return {
            "summary": summary,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analytics summary: {str(e)}")


@router.delete("/analytics/cleanup")
async def cleanup_old_analytics(
    days: int = 90,
    db: Session = Depends(get_db)
):
    """Очищает старые аналитические данные."""
    try:
        if days < 30:
            raise ValidationError("Cannot delete data newer than 30 days")
        
        tracker = AnalyticsTracker(db)
        
        # Очищаем старые данные
        deleted_count = await tracker.cleanup_old_data(days)
        
        return {
            "success": True,
            "deleted_records": deleted_count,
            "older_than_days": days
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup analytics: {str(e)}")
