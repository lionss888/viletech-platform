"""API routes for learning and model training."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.learning.rag_system import rag_system
from app.learning.data_collector import data_collector
from app.learning.training_pipeline import training_pipeline, TrainingConfig
from app.utils.logging import get_request_id
from app.api.v1.schemas import (
    RAGStatsResponse,
    TrainingDataResponse,
    TrainingRequest,
    TrainingResponse,
    ModelListResponse,
    ModelInfo
)

router = APIRouter()


@router.get("/rag/stats")
async def get_rag_stats():
    """Get RAG system statistics."""
    try:
        stats = rag_system.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get RAG stats: {str(e)}")


@router.post("/rag/add-conversation")
async def add_conversation_to_rag(
    convo_id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Add conversation to RAG system."""
    try:
        await rag_system.add_conversation(db, convo_id, limit)
        return {"message": f"Conversation {convo_id} added to RAG system"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add conversation: {str(e)}")


@router.delete("/rag/conversation/{convo_id}")
async def delete_conversation_from_rag(convo_id: str):
    """Delete conversation from RAG system."""
    try:
        success = await rag_system.delete_conversation(convo_id)
        if success:
            return {"message": f"Conversation {convo_id} deleted from RAG system"}
        else:
            return {"message": f"No documents found for conversation {convo_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


@router.post("/rag/reset")
async def reset_rag_system():
    """Reset the entire RAG system."""
    try:
        success = await rag_system.reset_system()
        if success:
            return {"message": "RAG system reset successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to reset RAG system")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset RAG system: {str(e)}")


@router.get("/rag/search")
async def search_rag_context(
    query: str,
    top_k: int = 5,
    min_relevance: float = 0.7,
    convo_id: Optional[str] = None
):
    """Search for relevant context in RAG system."""
    try:
        chunks = await rag_system.search_relevant_context(
            query=query,
            top_k=top_k,
            min_relevance=min_relevance,
            filter_convo_id=convo_id
        )
        
        return {
            "query": query,
            "results": [
                {
                    "content": chunk.content,
                    "convo_id": chunk.convo_id,
                    "role": chunk.role,
                    "relevance_score": chunk.relevance_score,
                    "document_id": chunk.document_id
                }
                for chunk in chunks
            ],
            "total_results": len(chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search RAG context: {str(e)}")


@router.get("/training/data", response_model=TrainingDataResponse)
async def get_training_data(
    convo_id: Optional[str] = None,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    """Get training data from conversations."""
    try:
        if convo_id:
            examples = data_collector.collect_conversation_data(db, convo_id)
            total_examples = len(examples)
        else:
            dataset = data_collector.collect_all_conversations(db, limit)
            examples = dataset.examples
            total_examples = len(examples)
        
        return TrainingDataResponse(
            total_examples=total_examples,
            examples=[{
                "instruction": ex.instruction,
                "output": ex.output_text,
                "quality_score": ex.quality_score,
                "conversation_id": ex.conversation_id
            } for ex in examples[:10]]  # Return first 10 examples
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get training data: {str(e)}")


@router.post("/training/export")
async def export_training_data(
    format_type: str = "alpaca",
    filepath: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export training data to file."""
    try:
        dataset = data_collector.collect_all_conversations(db)
        
        if not filepath:
            filepath = f"training_data_{get_request_id()}.json"
        
        success = data_collector.export_dataset(dataset, filepath, format_type)
        
        if success:
            return {"message": f"Training data exported to {filepath}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to export training data")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")


@router.post("/training/train", response_model=TrainingResponse)
async def train_model(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Train a model on conversation data."""
    try:
        # Collect training data
        if request.convo_id:
            examples = data_collector.collect_conversation_data(db, request.convo_id)
            if not examples:
                raise HTTPException(status_code=400, detail="No training data found for conversation")
            
            # Create dataset
            from app.learning.data_collector import TrainingDataset
            dataset = TrainingDataset(
                examples=examples,
                metadata={"source": "single_conversation", "convo_id": request.convo_id},
                created_at=datetime.utcnow()
            )
        else:
            dataset = data_collector.collect_all_conversations(db, request.limit)
        
        if not dataset.examples:
            raise HTTPException(status_code=400, detail="No training data available")
        
        # Configure training
        config = TrainingConfig(
            base_model=request.base_model,
            new_model_name=request.new_model_name,
            epochs=request.epochs,
            learning_rate=request.learning_rate
        )
        
        # Start training (in background for long-running tasks)
        if request.background:
            background_tasks.add_task(
                _train_model_background,
                dataset,
                config
            )
            return TrainingResponse(
                status="started",
                message="Training started in background",
                model_name=request.new_model_name
            )
        else:
            # Run training synchronously
            metrics = training_pipeline.train_model(dataset, config)
            return TrainingResponse(
                status="completed",
                message="Training completed",
                model_name=request.new_model_name,
                metrics=metrics.__dict__
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/models", response_model=ModelListResponse)
async def get_available_models():
    """Get list of available models."""
    try:
        models = training_pipeline.get_available_models()
        model_info = [ModelInfo(name=name, size=0, modified_at="") for name in models]
        return ModelListResponse(models=model_info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")


@router.delete("/models/{model_name}")
async def delete_model(model_name: str):
    """Delete a trained model."""
    try:
        success = training_pipeline.delete_model(model_name)
        if success:
            return {"message": f"Model {model_name} deleted successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to delete model")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")


async def _train_model_background(dataset, config):
    """Background task for model training."""
    try:
        metrics = training_pipeline.train_model(dataset, config)
        # Log completion
        from app.utils.logging import get_logger
        logger = get_logger(__name__)
        logger.info(f"Background training completed for {config.new_model_name}")
    except Exception as e:
        logger.error(f"Background training failed: {str(e)}")


# Additional schemas for learning endpoints
from pydantic import BaseModel
from datetime import datetime

class RAGStatsResponse(BaseModel):
    total_chunks: int
    total_embeddings: int
    unique_conversations: int

class TrainingDataResponse(BaseModel):
    total_examples: int
    examples: List[dict]

class TrainingRequest(BaseModel):
    convo_id: Optional[str] = None
    base_model: str = "llama3.2:3b-instruct-q4_0"
    new_model_name: str = "amg-flow-custom"
    epochs: int = 3
    learning_rate: float = 0.0001
    limit: int = 1000
    background: bool = True

class TrainingResponse(BaseModel):
    status: str
    message: str
    model_name: str
    metrics: Optional[dict] = None

class ModelListResponse(BaseModel):
    models: List[ModelInfo]
