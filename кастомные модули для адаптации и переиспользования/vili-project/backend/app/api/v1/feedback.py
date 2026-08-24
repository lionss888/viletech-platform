"""Operator feedback endpoints"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from uuid import UUID, uuid4

router = APIRouter()


# In-memory storage for MVP (replace with database in production)
_feedback_storage: Dict[str, Dict[str, Any]] = {}


class FeedbackRequest(BaseModel):
    """Operator feedback"""
    document_id: str
    analysis_id: Optional[str] = None
    operator_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    feedback_type: str = "accuracy"
    comment: str = ""
    corrected_data: dict = {}


class FeedbackResponse(BaseModel):
    """Feedback response"""
    id: str
    document_id: str
    analysis_id: Optional[str] = None
    operator_id: Optional[str] = None
    rating: int
    feedback_type: str
    comment: str
    corrected_data: dict


@router.get("/")
async def list_feedback(
    document_id: Optional[str] = Query(None, description="Filter by document ID"),
    feedback_type: Optional[str] = Query(None, description="Filter by feedback type"),
    min_rating: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> Dict[str, Any]:
    """
    List all feedback with optional filters
    
    - **document_id**: Filter by document UUID
    - **feedback_type**: Filter by type (accuracy, speed, usability, other)
    - **min_rating**: Minimum rating filter (1-5)
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records to return
    """
    # Filter feedback
    filtered = list(_feedback_storage.values())
    
    if document_id:
        filtered = [f for f in filtered if f.get("document_id") == document_id]
    
    if feedback_type:
        filtered = [f for f in filtered if f.get("feedback_type") == feedback_type]
    
    if min_rating:
        filtered = [f for f in filtered if f.get("rating", 0) >= min_rating]
    
    # Pagination
    total = len(filtered)
    paginated = filtered[skip:skip + limit]
    
    return {
        "total": total,
        "feedback": paginated,
        "skip": skip,
        "limit": limit
    }


@router.post("/")
async def submit_feedback(request: FeedbackRequest) -> Dict[str, Any]:
    """
    Submit operator feedback for adaptive learning
    
    - **document_id**: Document ID
    - **analysis_id**: Analysis result ID
    - **operator_id**: Operator ID
    - **rating**: Rating 1-5
    - **feedback_type**: Type of feedback (accuracy, speed, usability, other)
    - **comment**: Optional comment
    - **corrected_data**: Optional corrected data for learning
    """
    # Validate rating
    if request.rating < 1 or request.rating > 5:
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5")
    
    # Generate ID and store
    feedback_id = str(uuid4())
    feedback_data = {
        "id": feedback_id,
        "document_id": request.document_id,
        "analysis_id": request.analysis_id,
        "operator_id": request.operator_id,
        "rating": request.rating,
        "feedback_type": request.feedback_type,
        "comment": request.comment,
        "corrected_data": request.corrected_data
    }
    
    _feedback_storage[feedback_id] = feedback_data
    
    return {
        "status": "success",
        "feedback_id": feedback_id,
        "message": "Feedback received and will be used for adaptive learning"
    }


@router.get("/by-document/{document_id}")
async def get_feedback_by_document(document_id: str) -> Dict[str, Any]:
    """Get all feedback for a specific document"""
    feedback_list = [
        f for f in _feedback_storage.values() 
        if f.get("document_id") == document_id
    ]
    
    return {
        "document_id": document_id,
        "feedback": feedback_list,
        "total": len(feedback_list)
    }


@router.get("/{feedback_id}")
async def get_feedback_by_id(feedback_id: str) -> Dict[str, Any]:
    """Get a specific feedback by ID"""
    # Try to parse as UUID
    try:
        UUID(feedback_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid feedback ID format")
    
    feedback = _feedback_storage.get(feedback_id)
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return feedback
