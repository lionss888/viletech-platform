"""Document analysis endpoints"""

import time
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.dependencies import get_db
from app.core.exceptions import DocumentProcessingException, LLMException
from app.database.schemas.document import (
    DocumentUploadResponse,
    DocumentAnalysisRequest,
    DocumentAnalysisResponse,
    PaymentDocumentResponse,
    PaymentDocumentList,
)
from app.services.document_processor import DocumentProcessor
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = "traditional",
    customer_id: str = Query(..., description="Customer UUID"),
    db: Session = Depends(get_db)
) -> DocumentUploadResponse:
    """
    Upload and process payment document
    
    - **file**: Payment document file (PDF, JSON, SWIFT, XML, TXT)
    - **document_type**: 'traditional' or 'crypto'
    - **customer_id**: Customer UUID
    """
    if document_type not in ['traditional', 'crypto']:
        raise HTTPException(status_code=400, detail="Invalid document_type. Must be 'traditional' or 'crypto'")
    
    try:
        # Читаем содержимое файла
        file_content = await file.read()
        
        # Обрабатываем документ
        processor = DocumentProcessor()
        processed = processor.process_document(
            file_content=file_content,
            file_name=file.filename,
        )
        
        # Сохраняем в БД
        document_id = uuid4()
        
        insert_query = text("""
            INSERT INTO payment_documents (id, type, format, raw_data, parsed_data, status, customer_id)
            VALUES (:id, :type, :format, :raw_data, :parsed_data, :status, :customer_id)
        """)
        
        db.execute(insert_query, {
            "id": str(document_id),
            "type": document_type,
            "format": processed.get('metadata', {}).get('format', 'UNKNOWN'),
            "raw_data": file_content,
            "parsed_data": processed.get('parsed_data', {}),
            "status": "pending",
            "customer_id": customer_id
        })
        db.commit()
        
        return DocumentUploadResponse(
            document_id=document_id,
            status="pending",
            format=processed.get('metadata', {}).get('format', 'UNKNOWN'),
            type=document_type,
            message="Document uploaded successfully. Use /analyze endpoint to process it."
        )
        
    except DocumentProcessingException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


class DirectAnalysisRequest(BaseModel):
    """Request for direct document analysis without upload"""
    content: str
    document_type: str = "traditional"
    format: Optional[str] = "text"


@router.post("/analyze")
async def analyze_document_direct(
    request: DirectAnalysisRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Analyze document content directly without file upload
    
    - **content**: Document content as text
    - **document_type**: 'traditional' or 'crypto'
    - **format**: Document format (text, SWIFT, JSON, XML)
    """
    if not request.content:
        raise HTTPException(status_code=422, detail="Content is required")
    
    if request.document_type not in ['traditional', 'crypto']:
        raise HTTPException(status_code=422, detail="Invalid document_type. Must be 'traditional' or 'crypto'")
    
    start_time = time.time()
    
    try:
        # Process document content
        processor = DocumentProcessor()
        processed = processor.process_document(
            file_content=request.content.encode('utf-8'),
            file_name=f"direct_analysis.{request.format or 'txt'}",
            format_hint=request.format
        )
        
        # Initialize LLM service
        llm_service = LLMService()
        
        # Create analysis prompt
        analysis_prompt = f"""Проанализируй платежный документ типа {request.document_type}.

Формат: {request.format}
Данные документа:
{request.content[:2000]}

Выполни следующий анализ:
1. Извлеки ключевые сущности (отправитель, получатель, сумма, валюта, дата)
2. Определи sentiment (positive, neutral, negative)
3. Проверь структуру и полноту данных
4. Оцени confidence level анализа (0-1)

Ответь в формате JSON."""
        
        llm_response = await llm_service.complete(
            prompt=analysis_prompt,
            model="local-llama",
            temperature=0.3,
            max_tokens=1500
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return {
            "status": "completed",
            "document_type": request.document_type,
            "format": request.format,
            "analysis": {
                "confidence": 0.85,
                "entities": [],
                "sentiment": "neutral",
                "llm_response": llm_response.get("content", ""),
                "model_used": llm_response.get("model", "unknown"),
            },
            "processing_time_ms": processing_time_ms
        }
        
    except LLMException as e:
        raise HTTPException(status_code=500, detail=f"LLM analysis failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/{document_id}/analyze", response_model=DocumentAnalysisResponse)
async def analyze_document(
    document_id: UUID,
    request: DocumentAnalysisRequest = DocumentAnalysisRequest(),
    db: Session = Depends(get_db)
) -> DocumentAnalysisResponse:
    """
    Analyze payment document using LLM and RAG
    
    - **document_id**: Document UUID to analyze
    - **include_compliance**: Include compliance checks in analysis
    - **include_risk**: Include risk assessment in analysis
    - **use_rag**: Use RAG knowledge base for enhanced analysis
    """
    start_time = time.time()
    
    try:
        # Получаем документ из БД
        select_query = text("""
            SELECT id, type, format, parsed_data, status
            FROM payment_documents
            WHERE id = :document_id
        """)
        
        result = db.execute(select_query, {"document_id": str(document_id)})
        document = result.fetchone()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Обновляем статус на processing
        update_query = text("""
            UPDATE payment_documents
            SET status = 'processing', updated_at = NOW()
            WHERE id = :document_id
        """)
        db.execute(update_query, {"document_id": str(document_id)})
        db.commit()
        
        # Инициализируем сервисы
        llm_service = LLMService()
        rag_service = RAGService(db) if request.use_rag else None
        
        # Формируем текст для анализа
        parsed_data = document.parsed_data if document.parsed_data else {}
        document_text = parsed_data.get('text', str(parsed_data))
        
        # Получаем контекст из RAG если требуется
        context = ""
        if request.use_rag and rag_service:
            try:
                context = await rag_service.get_context_for_query(
                    query=f"Анализ платежного документа типа {document.type} формата {document.format}",
                    max_chunks=5
                )
            except Exception as e:
                print(f"RAG context retrieval failed: {e}")
                context = ""
        
        # Анализируем через LLM
        analysis_prompt = f"""Проанализируй платежный документ типа {document.type}.

Формат: {document.format}
Данные документа:
{document_text[:2000]}

Выполни следующий анализ:
1. Извлеки ключевые сущности (отправитель, получатель, сумма, валюта, дата)
2. Определи sentiment (positive, neutral, negative)
3. Проверь структуру и полноту данных
4. Оцени confidence level анализа (0-1)

Ответь в формате JSON."""
        
        if context:
            analysis_prompt = f"Контекст из базы знаний:\n{context}\n\n{analysis_prompt}"
        
        llm_response = await llm_service.complete(
            prompt=analysis_prompt,
            model="local-llama",
            temperature=0.3,
            max_tokens=1500
        )
        
        # Базовый разбор ответа (в идеале - парсинг JSON, но для MVP - простой подход)
        analysis_result = {
            "confidence": 0.85,
            "entities": [],
            "sentiment": "neutral",
            "llm_response": llm_response.get("content", ""),
            "model_used": llm_response.get("model", "unknown"),
            "rag_used": request.use_rag
        }
        
        # Сохраняем результат анализа
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        analysis_insert = text("""
            INSERT INTO analysis_results 
            (id, document_id, analysis_type, result_data, confidence_score, model_version, duration_ms, success)
            VALUES (:id, :document_id, :analysis_type, :result_data, :confidence_score, :model_version, :duration_ms, :success)
        """)
        
        db.execute(analysis_insert, {
            "id": str(uuid4()),
            "document_id": str(document_id),
            "analysis_type": "document",
            "result_data": analysis_result,
            "confidence_score": analysis_result["confidence"],
            "model_version": llm_response.get("model", "unknown"),
            "duration_ms": processing_time_ms,
            "success": True
        })
        
        # Обновляем статус документа
        update_status = text("""
            UPDATE payment_documents
            SET status = 'completed', updated_at = NOW()
            WHERE id = :document_id
        """)
        db.execute(update_status, {"document_id": str(document_id)})
        db.commit()
        
        return DocumentAnalysisResponse(
            document_id=document_id,
            status="completed",
            analysis=analysis_result,
            confidence=analysis_result["confidence"],
            entities=analysis_result.get("entities", []),
            sentiment=analysis_result.get("sentiment", "neutral"),
            compliance_checks=None,  # Добавляется через /compliance/check
            risk_assessment=None,    # Добавляется через /risk/assess
            processing_time_ms=processing_time_ms
        )
        
    except HTTPException:
        raise
    except LLMException as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"LLM analysis failed: {str(e)}")
    except Exception as e:
        db.rollback()
        # Обновляем статус на failed
        try:
            update_failed = text("""
                UPDATE payment_documents
                SET status = 'failed', updated_at = NOW()
                WHERE id = :document_id
            """)
            db.execute(update_failed, {"document_id": str(document_id)})
            db.commit()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/{document_id}", response_model=PaymentDocumentResponse)
async def get_document(
    document_id: UUID,
    db: Session = Depends(get_db)
) -> PaymentDocumentResponse:
    """Get document by ID"""
    try:
        query = text("""
            SELECT id, type, format, parsed_data, status, operator_id, customer_id, created_at, updated_at
            FROM payment_documents
            WHERE id = :document_id
        """)
        
        result = db.execute(query, {"document_id": str(document_id)})
        document = result.fetchone()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return PaymentDocumentResponse(
            id=document.id,
            type=document.type,
            format=document.format,
            status=document.status,
            parsed_data=document.parsed_data,
            operator_id=document.operator_id,
            customer_id=document.customer_id,
            created_at=document.created_at,
            updated_at=document.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")


@router.get("/", response_model=PaymentDocumentList)
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> PaymentDocumentList:
    """
    List all documents with pagination and filters
    
    - **skip**: Number of documents to skip
    - **limit**: Maximum number of documents to return
    - **status**: Filter by status (pending, processing, completed, failed, review_required)
    - **document_type**: Filter by type (traditional, crypto)
    - **customer_id**: Filter by customer UUID
    """
    try:
        # Строим WHERE условия
        where_clauses = []
        params = {"skip": skip, "limit": limit}
        
        if status:
            where_clauses.append("status = :status")
            params["status"] = status
        
        if document_type:
            where_clauses.append("type = :type")
            params["type"] = document_type
        
        if customer_id:
            where_clauses.append("customer_id = :customer_id")
            params["customer_id"] = customer_id
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Получаем общее количество
        count_query = text(f"""
            SELECT COUNT(*) as total
            FROM payment_documents
            WHERE {where_sql}
        """)
        
        count_result = db.execute(count_query, params)
        total = count_result.fetchone().total
        
        # Получаем документы
        select_query = text(f"""
            SELECT id, type, format, parsed_data, status, operator_id, customer_id, created_at, updated_at
            FROM payment_documents
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :skip
        """)
        
        result = db.execute(select_query, params)
        documents = result.fetchall()
        
        documents_list = [
            PaymentDocumentResponse(
                id=doc.id,
                type=doc.type,
                format=doc.format,
                status=doc.status,
                parsed_data=doc.parsed_data,
                operator_id=doc.operator_id,
                customer_id=doc.customer_id,
                created_at=doc.created_at,
                updated_at=doc.updated_at
            )
            for doc in documents
        ]
        
        return PaymentDocumentList(
            total=total,
            documents=documents_list,
            skip=skip,
            limit=limit
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete document by ID"""
    try:
        # Проверяем существование
        check_query = text("""
            SELECT id FROM payment_documents WHERE id = :document_id
        """)
        result = db.execute(check_query, {"document_id": str(document_id)})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Удаляем (CASCADE удалит связанные записи)
        delete_query = text("""
            DELETE FROM payment_documents WHERE id = :document_id
        """)
        db.execute(delete_query, {"document_id": str(document_id)})
        db.commit()
        
        return {
            "status": "success",
            "message": "Document deleted successfully",
            "document_id": str(document_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.get("/{document_id}/analysis")
async def get_document_analysis(
    document_id: UUID,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get all analysis results for a document"""
    try:
        query = text("""
            SELECT id, analysis_type, result_data, confidence_score, model_version, 
                   duration_ms, success, error_message, created_at
            FROM analysis_results
            WHERE document_id = :document_id
            ORDER BY created_at DESC
        """)
        
        result = db.execute(query, {"document_id": str(document_id)})
        analyses = result.fetchall()
        
        if not analyses:
            raise HTTPException(status_code=404, detail="No analysis results found for this document")
        
        return {
            "document_id": str(document_id),
            "total": len(analyses),
            "analyses": [
                {
                    "id": str(analysis.id),
                    "analysis_type": analysis.analysis_type,
                    "result_data": analysis.result_data,
                    "confidence_score": analysis.confidence_score,
                    "model_version": analysis.model_version,
                    "duration_ms": analysis.duration_ms,
                    "success": analysis.success,
                    "error_message": analysis.error_message,
                    "created_at": analysis.created_at.isoformat()
                }
                for analysis in analyses
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analysis results: {str(e)}")
