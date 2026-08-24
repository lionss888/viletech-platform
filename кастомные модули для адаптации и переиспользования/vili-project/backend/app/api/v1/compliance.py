"""Compliance checking endpoints"""

import time
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
from uuid import UUID, uuid4
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.dependencies import get_db
from app.core.exceptions import RAGException, LLMException
from app.database.schemas.compliance import (
    ComplianceCheckRequest,
    ComplianceCheckResult,
    ComplianceCheckItem,
    ComplianceCheckListResponse,
    ComplianceCheckResponse,
)
from app.services.rag_service import RAGService
from app.services.llm_service import LLMService

router = APIRouter()


@router.post("/check", response_model=ComplianceCheckResult)
async def check_compliance(
    request: ComplianceCheckRequest,
    db: Session = Depends(get_db)
) -> ComplianceCheckResult:
    """
    Perform compliance checks on document
    
    - **document_id**: Document to check
    - **check_types**: Types of checks (sanctions, kyc, aml, travel_rule, fatf)
    - **use_rag**: Use RAG knowledge base for compliance rules
    """
    start_time = time.time()
    
    try:
        # Проверяем существование документа
        doc_query = text("""
            SELECT id, type, format, parsed_data, status
            FROM payment_documents
            WHERE id = :document_id
        """)
        
        result = db.execute(doc_query, {"document_id": str(request.document_id)})
        document = result.fetchone()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Инициализируем сервисы
        llm_service = LLMService()
        rag_service = RAGService(db) if request.use_rag else None
        
        # Извлекаем текст документа
        parsed_data = document.parsed_data if document.parsed_data else {}
        document_text = parsed_data.get('text', str(parsed_data))
        
        # Выполняем проверки для каждого типа
        checks = []
        overall_risk_level = "low"
        risk_levels_priority = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        
        for check_type in request.check_types:
            # Получаем контекст из RAG для данного типа проверки
            context = ""
            if request.use_rag and rag_service:
                try:
                    context = await rag_service.get_context_for_query(
                        query=f"Compliance {check_type} проверка для {document.type} платежа",
                        max_chunks=3
                    )
                    
                    # Также ищем в старой compliance_knowledge_base
                    compliance_context = await rag_service.search_compliance_knowledge(
                        query=f"{check_type} правила и требования",
                        category=check_type,
                        top_k=3
                    )
                    
                    if compliance_context:
                        compliance_texts = [item['content'] for item in compliance_context]
                        context += "\n\n" + "\n---\n".join(compliance_texts)
                        
                except Exception as e:
                    print(f"RAG context retrieval failed for {check_type}: {e}")
                    context = ""
            
            # Формируем промпт для LLM
            check_prompt = f"""Выполни {check_type} compliance проверку для платежного документа.

Тип документа: {document.type}
Формат: {document.format}

Документ:
{document_text[:1500]}

Контекст правил:
{context if context else "Используй общие знания о " + check_type + " compliance"}

Проверь:
1. Соответствие требованиям {check_type}
2. Наличие подозрительных паттернов
3. Полноту необходимой информации
4. Риски нарушения compliance

Оцени:
- status: passed/failed/warning
- risk_level: low/medium/high/critical
- findings: список найденных проблем
- recommendations: рекомендации по устранению

Ответь в формате JSON."""

            # Вызываем LLM
            llm_response = await llm_service.complete(
                prompt=check_prompt,
                model="local-llama",
                temperature=0.2,  # Низкая температура для точности
                max_tokens=1000
            )
            
            # Обрабатываем ответ (для MVP - базовый парсинг)
            # В идеале нужно парсить JSON из ответа
            response_text = llm_response.get("content", "").lower()
            
            # Определяем статус на основе ответа
            if "passed" in response_text or "compliant" in response_text:
                status = "passed"
                risk_level = "low"
            elif "failed" in response_text or "violation" in response_text:
                status = "failed"
                risk_level = "high"
            elif "warning" in response_text or "potential" in response_text:
                status = "warning"
                risk_level = "medium"
            else:
                status = "pending"
                risk_level = "low"
            
            # Обновляем общий уровень риска
            if risk_levels_priority.get(risk_level, 0) > risk_levels_priority.get(overall_risk_level, 0):
                overall_risk_level = risk_level
            
            check_item = ComplianceCheckItem(
                type=check_type,
                status=status,
                risk_level=risk_level,
                details={
                    "llm_response": llm_response.get("content", ""),
                    "model_used": llm_response.get("model", "unknown"),
                    "rag_used": request.use_rag,
                    "context_available": bool(context)
                },
                confidence=0.85,
                findings=[],
                recommendations=[]
            )
            
            checks.append(check_item)
            
            # Сохраняем в БД
            insert_check = text("""
                INSERT INTO compliance_checks 
                (id, document_id, check_type, status, details, risk_level)
                VALUES (:id, :document_id, :check_type, :status, :details, :risk_level)
            """)
            
            db.execute(insert_check, {
                "id": str(uuid4()),
                "document_id": str(request.document_id),
                "check_type": check_type,
                "status": status,
                "details": check_item.details,
                "risk_level": risk_level
            })
        
        db.commit()
        
        # Определяем общий статус
        if any(check.status == "failed" for check in checks):
            overall_status = "failed"
        elif any(check.status == "warning" for check in checks):
            overall_status = "warning"
        elif all(check.status == "passed" for check in checks):
            overall_status = "passed"
        else:
            overall_status = "pending"
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return ComplianceCheckResult(
            document_id=request.document_id,
            status=overall_status,
            overall_risk_level=overall_risk_level,
            checks=checks,
            processing_time_ms=processing_time_ms,
            timestamp=db.execute(text("SELECT NOW()")).fetchone()[0]
        )
        
    except HTTPException:
        raise
    except (RAGException, LLMException) as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {str(e)}")


@router.get("/statistics")
async def get_compliance_statistics(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get compliance statistics across all documents"""
    try:
        stats_query = text("""
            SELECT 
                COUNT(*) as total_checks,
                COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                COUNT(CASE WHEN status = 'warning' THEN 1 END) as warnings,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
            FROM compliance_checks
        """)
        
        result = db.execute(stats_query)
        stats = result.fetchone()
        
        # Статистика по типам
        type_query = text("""
            SELECT check_type, COUNT(*) as count
            FROM compliance_checks
            GROUP BY check_type
            ORDER BY count DESC
        """)
        
        type_result = db.execute(type_query)
        by_type = {row.check_type: row.count for row in type_result.fetchall()}
        
        # Статистика по уровням риска
        risk_query = text("""
            SELECT risk_level, COUNT(*) as count
            FROM compliance_checks
            GROUP BY risk_level
            ORDER BY 
                CASE risk_level
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END
        """)
        
        risk_result = db.execute(risk_query)
        by_risk_level = {row.risk_level: row.count for row in risk_result.fetchall()}
        
        return {
            "total_checks": stats.total_checks if stats.total_checks else 0,
            "passed": stats.passed if stats.passed else 0,
            "failed": stats.failed if stats.failed else 0,
            "warnings": stats.warnings if stats.warnings else 0,
            "pending": stats.pending if stats.pending else 0,
            "by_type": by_type,
            "by_risk_level": by_risk_level
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


@router.get("/checks")
async def list_compliance_checks(
    document_id: Optional[UUID] = Query(None, description="Filter by document ID"),
    status: Optional[str] = Query(None, description="Filter by status (passed, failed, warning, pending)"),
    check_type: Optional[str] = Query(None, description="Filter by check type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    List all compliance checks with optional filters
    
    - **document_id**: Filter by document UUID
    - **status**: Filter by status (passed, failed, warning, pending)
    - **check_type**: Filter by check type (sanctions, kyc, aml, etc.)
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records to return
    """
    try:
        # Build WHERE clauses
        where_clauses = []
        params = {"skip": skip, "limit": limit}
        
        if document_id:
            where_clauses.append("document_id = :document_id")
            params["document_id"] = str(document_id)
        
        if status:
            where_clauses.append("status = :status")
            params["status"] = status
        
        if check_type:
            where_clauses.append("check_type = :check_type")
            params["check_type"] = check_type
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Get total count
        count_query = text(f"""
            SELECT COUNT(*) as total
            FROM compliance_checks
            WHERE {where_sql}
        """)
        count_result = db.execute(count_query, params)
        total = count_result.fetchone().total
        
        # Get checks
        select_query = text(f"""
            SELECT id, document_id, check_type, status, details, risk_level, created_at
            FROM compliance_checks
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :skip
        """)
        
        result = db.execute(select_query, params)
        checks = result.fetchall()
        
        return {
            "total": total,
            "checks": [
                {
                    "id": str(check.id),
                    "document_id": str(check.document_id),
                    "check_type": check.check_type,
                    "status": check.status,
                    "details": check.details,
                    "risk_level": check.risk_level,
                    "created_at": check.created_at.isoformat() if check.created_at else None
                }
                for check in checks
            ],
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list compliance checks: {str(e)}")


@router.get("/checks/{check_id}")
async def get_compliance_check_by_id(
    check_id: UUID,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get a specific compliance check by ID"""
    try:
        query = text("""
            SELECT id, document_id, check_type, status, details, risk_level, created_at
            FROM compliance_checks
            WHERE id = :check_id
        """)
        
        result = db.execute(query, {"check_id": str(check_id)})
        check = result.fetchone()
        
        if not check:
            raise HTTPException(status_code=404, detail="Compliance check not found")
        
        return {
            "id": str(check.id),
            "document_id": str(check.document_id),
            "check_type": check.check_type,
            "status": check.status,
            "details": check.details,
            "risk_level": check.risk_level,
            "created_at": check.created_at.isoformat() if check.created_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get compliance check: {str(e)}")


@router.get("/rules")
async def list_compliance_rules() -> Dict[str, Any]:
    """
    List available compliance rules and check types
    
    Returns the supported compliance check types and their descriptions.
    """
    return {
        "rules": [
            {
                "type": "sanctions",
                "name": "Sanctions Screening",
                "description": "Check against global sanctions lists (OFAC, EU, UN)",
                "severity": "critical"
            },
            {
                "type": "aml",
                "name": "Anti-Money Laundering",
                "description": "AML checks including transaction patterns and suspicious activity",
                "severity": "high"
            },
            {
                "type": "kyc",
                "name": "Know Your Customer",
                "description": "Customer identification and verification checks",
                "severity": "high"
            },
            {
                "type": "travel_rule",
                "name": "Travel Rule",
                "description": "FATF Travel Rule compliance for crypto transactions",
                "severity": "medium"
            },
            {
                "type": "fatf",
                "name": "FATF Compliance",
                "description": "Financial Action Task Force recommendations compliance",
                "severity": "high"
            },
            {
                "type": "pep",
                "name": "PEP Screening",
                "description": "Politically Exposed Persons screening",
                "severity": "high"
            }
        ],
        "total": 6
    }


@router.get("/{document_id}", response_model=ComplianceCheckListResponse)
async def get_compliance_results(
    document_id: UUID,
    db: Session = Depends(get_db)
) -> ComplianceCheckListResponse:
    """Get compliance check results for document"""
    try:
        # Проверяем существование документа
        doc_query = text("""
            SELECT id FROM payment_documents WHERE id = :document_id
        """)
        result = db.execute(doc_query, {"document_id": str(document_id)})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Получаем результаты проверок
        checks_query = text("""
            SELECT id, document_id, check_type, status, details, risk_level, created_at
            FROM compliance_checks
            WHERE document_id = :document_id
            ORDER BY created_at DESC
        """)
        
        result = db.execute(checks_query, {"document_id": str(document_id)})
        checks = result.fetchall()
        
        if not checks:
            return ComplianceCheckListResponse(
                document_id=document_id,
                checks=[],
                overall_status="not_checked",
                summary={
                    "total_checks": 0,
                    "by_status": {},
                    "by_risk_level": {}
                }
            )
        
        # Формируем ответ
        checks_list = [
            ComplianceCheckResponse(
                id=check.id,
                document_id=check.document_id,
                check_type=check.check_type,
                status=check.status,
                details=check.details,
                risk_level=check.risk_level,
                created_at=check.created_at
            )
            for check in checks
        ]
        
        # Подсчитываем статистику
        status_counts = {}
        risk_counts = {}
        for check in checks:
            status_counts[check.status] = status_counts.get(check.status, 0) + 1
            risk_counts[check.risk_level] = risk_counts.get(check.risk_level, 0) + 1
        
        # Определяем общий статус
        if any(check.status == "failed" for check in checks):
            overall_status = "failed"
        elif any(check.status == "warning" for check in checks):
            overall_status = "warning"
        elif all(check.status == "passed" for check in checks):
            overall_status = "passed"
        else:
            overall_status = "mixed"
        
        return ComplianceCheckListResponse(
            document_id=document_id,
            checks=checks_list,
            overall_status=overall_status,
            summary={
                "total_checks": len(checks),
                "by_status": status_counts,
                "by_risk_level": risk_counts,
                "latest_check": checks[0].created_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get compliance results: {str(e)}")
