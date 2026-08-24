"""Knowledge Sources API endpoints"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.core.exceptions import not_found_exception, bad_request_exception
from app.database.schemas.knowledge_source import (
    KnowledgeSourceCreate,
    KnowledgeSourceUpdate,
    KnowledgeSourceResponse,
    KnowledgeChunkResponse,
    KnowledgeSearchRequest,
    KnowledgeSearchResult,
)
from app.services.knowledge_source_service import KnowledgeSourceService
from app.services.rag_service import RAGService

router = APIRouter()


@router.post("/", response_model=KnowledgeSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_source(
    source: KnowledgeSourceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Создать новый источник знаний (URL)
    """
    service = KnowledgeSourceService(db)
    
    try:
        if source.source_type == "url":
            result = await service.add_url_source(
                name=source.name,
                url=source.source_url,
                description=source.description,
                auto_refresh=source.auto_refresh,
                created_by=current_user.get("user_id"),
                category=source.category
            )
        else:
            raise bad_request_exception("Use /upload endpoint for file sources")
        
        # Подсчитываем chunks
        chunks_count = len(service.get_source_chunks(result.id))
        
        response = KnowledgeSourceResponse.from_orm(result)
        response.chunks_count = chunks_count
        
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create knowledge source: {str(e)}"
        )


@router.post("/upload", response_model=KnowledgeSourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_knowledge_source(
    name: str = Form(...),
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None, description="Категория знаний: project_management, compliance, etc."),
    owner_only: bool = Form(False, description="Доступ только для владельца"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Загрузить файл как источник знаний
    
    - **name**: Название источника знаний
    - **file**: Файл для загрузки (PDF, TXT, CSV, JSON)
    - **description**: Описание источника
    - **category**: Категория знаний (project_management, compliance, etc.)
    - **owner_only**: Если true, доступ только для владельца
    """
    service = KnowledgeSourceService(db)
    
    try:
        result = await service.add_file_source(
            name=name,
            file=file,
            description=description,
            created_by=current_user.get("user_id"),
            category=category,
            owner_only=owner_only
        )
        
        # Подсчитываем chunks
        chunks_count = len(service.get_source_chunks(result.id))
        
        response = KnowledgeSourceResponse.from_orm(result)
        response.chunks_count = chunks_count
        
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload knowledge source: {str(e)}"
        )


@router.get("/", response_model=List[KnowledgeSourceResponse])
def list_knowledge_sources(
    active_only: bool = True,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Получить список источников знаний
    """
    service = KnowledgeSourceService(db)
    sources = service.list_sources(active_only=active_only, limit=limit, offset=offset)
    
    results = []
    for source in sources:
        response = KnowledgeSourceResponse.from_orm(source)
        response.chunks_count = len(service.get_source_chunks(source.id))
        results.append(response)
    
    return results


@router.get("/{source_id}", response_model=KnowledgeSourceResponse)
def get_knowledge_source(
    source_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Получить источник знаний по ID
    """
    service = KnowledgeSourceService(db)
    source = service.get_source(source_id)
    
    if not source:
        raise not_found_exception("Knowledge source", str(source_id))
    
    response = KnowledgeSourceResponse.from_orm(source)
    response.chunks_count = len(service.get_source_chunks(source.id))
    
    return response


@router.put("/{source_id}", response_model=KnowledgeSourceResponse)
def update_knowledge_source(
    source_id: UUID,
    update_data: KnowledgeSourceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Обновить источник знаний
    """
    service = KnowledgeSourceService(db)
    
    try:
        result = service.update_source(
            source_id=source_id,
            name=update_data.name,
            description=update_data.description,
            is_active=update_data.is_active,
            auto_refresh=update_data.auto_refresh
        )
        
        response = KnowledgeSourceResponse.from_orm(result)
        response.chunks_count = len(service.get_source_chunks(result.id))
        
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update knowledge source: {str(e)}"
        )


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_source(
    source_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Удалить источник знаний
    """
    service = KnowledgeSourceService(db)
    
    try:
        service.delete_source(source_id)
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete knowledge source: {str(e)}"
        )


@router.post("/{source_id}/refresh")
async def refresh_knowledge_source(
    source_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Обновить источник знаний (перезагрузить контент)
    """
    service = KnowledgeSourceService(db)
    
    try:
        chunks_count = await service.refresh_source(source_id)
        
        return {
            "message": "Source refreshed successfully",
            "source_id": str(source_id),
            "chunks_created": chunks_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh knowledge source: {str(e)}"
        )


@router.get("/{source_id}/chunks", response_model=List[KnowledgeChunkResponse])
def get_source_chunks(
    source_id: UUID,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Получить chunks источника знаний
    """
    service = KnowledgeSourceService(db)
    chunks = service.get_source_chunks(source_id, limit=limit)
    
    return [KnowledgeChunkResponse.from_orm(chunk) for chunk in chunks]


@router.post("/search", response_model=List[KnowledgeSearchResult])
async def search_knowledge(
    request: KnowledgeSearchRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Поиск по базе знаний
    """
    rag_service = RAGService(db)
    
    try:
        results = await rag_service.search_knowledge(
            query=request.query,
            source_ids=request.source_ids,
            top_k=request.top_k,
            min_similarity=request.min_similarity
        )
        
        return [KnowledgeSearchResult(**result) for result in results]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search knowledge: {str(e)}"
        )
