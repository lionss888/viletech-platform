"""Risk assessment endpoints"""

import time
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
from uuid import UUID, uuid4
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

from app.core.dependencies import get_db
from app.core.exceptions import RAGException, LLMException
from app.database.schemas.risk import (
    RiskAssessmentRequest,
    RiskAssessmentDetailed,
    RiskAssessmentResponse,
    RiskFactor,
    EconomicIndex,
)
from app.services.rag_service import RAGService
from app.services.llm_service import LLMService

router = APIRouter()
logger = logging.getLogger(__name__)

# Таймауты для операций
RAG_TIMEOUT = 30.0  # 30 секунд для RAG поиска
LLM_TIMEOUT = 120.0  # 2 минуты для LLM генерации


@router.post("/assess", response_model=RiskAssessmentDetailed)
async def assess_risk(
    request: RiskAssessmentRequest,
    db: Session = Depends(get_db)
) -> RiskAssessmentDetailed:
    """
    Assess risk for payment document
    
    - **document_id**: Document to assess
    - **include_economic_indices**: Include economic indices in assessment
    - **use_rag**: Use RAG knowledge base for risk factors
    - **country_codes**: Country codes for economic indices (ISO 3166-1 alpha-3)
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
        
        # Получаем контекст из RAG для оценки рисков
        context = ""
        if request.use_rag and rag_service:
            try:
                logger.info(f"Fetching RAG context for risk assessment (document_id: {request.document_id})")
                context = await asyncio.wait_for(
                    rag_service.get_context_for_query(
                        query=f"Оценка рисков для {document.type} платежа, факторы риска",
                        max_chunks=5
                    ),
                    timeout=RAG_TIMEOUT
                )
                logger.info(f"RAG context retrieved successfully ({len(context)} chars)")
            except asyncio.TimeoutError:
                logger.warning(f"RAG context retrieval timed out after {RAG_TIMEOUT}s")
                context = ""
            except Exception as e:
                logger.warning(f"RAG context retrieval failed: {e}")
                context = ""
        
        # Получаем экономические индексы если требуется
        economic_indices = []
        economic_indices_text = ""
        
        if request.include_economic_indices and request.country_codes:
            indices_query = text("""
                SELECT country_code, index_type, value, year, source
                FROM economic_indices
                WHERE country_code = ANY(:country_codes)
                  AND year >= EXTRACT(YEAR FROM NOW()) - 2
                ORDER BY country_code, index_type, year DESC
            """)
            
            result = db.execute(indices_query, {
                "country_codes": request.country_codes
            })
            indices = result.fetchall()
            
            for idx in indices:
                # Определяем impact на основе типа индекса и значения
                impact = "neutral"
                if idx.index_type == "corruption" and idx.value > 50:
                    impact = "negative"
                elif idx.index_type == "economic_freedom" and idx.value > 70:
                    impact = "positive"
                
                economic_indices.append(EconomicIndex(
                    country_code=idx.country_code,
                    index_type=idx.index_type,
                    value=idx.value,
                    year=idx.year,
                    impact=impact,
                    description=f"{idx.index_type} для {idx.country_code}"
                ))
            
            if economic_indices:
                economic_indices_text = "\n".join([
                    f"- {ei.country_code}: {ei.index_type} = {ei.value} ({ei.year})"
                    for ei in economic_indices
                ])
        
        # Формируем промпт для LLM
        economic_section = f"Экономические индексы:\n{economic_indices_text}" if economic_indices_text else ""
        context_section = f"Контекст из базы знаний:\n{context}" if context else ""
        
        risk_prompt = f"""Выполни оценку рисков для платежного документа.

Тип документа: {document.type}
Формат: {document.format}

Документ:
{document_text[:1500]}

{economic_section}

{context_section}

Оцени следующие аспекты:
1. Финансовый риск (liquidity, credit, market)
2. Операционный риск (fraud, errors, delays)
3. Compliance риск (regulatory, legal)
4. Репутационный риск
5. Геополитический риск

Для каждого фактора определи:
- name: название фактора
- category: категория риска
- weight: вес фактора (0-1)
- score: оценка риска (0-1, где 1 - максимальный риск)
- severity: low/medium/high/critical

Итоговая оценка:
- risk_score: общий балл риска (0-1)
- risk_level: low/medium/high/critical
- recommendation: approve/reject/review/request_info
- confidence: уверенность в оценке (0-1)
- mitigations: список рекомендаций по снижению рисков

Ответь в формате JSON."""

        # Вызываем LLM с таймаутом
        logger.info(f"Calling LLM for risk assessment (document_id: {request.document_id})")
        try:
            llm_response = await asyncio.wait_for(
                llm_service.complete(
                    prompt=risk_prompt,
                    model="local-llama",
                    temperature=0.3,
                    max_tokens=2000
                ),
                timeout=LLM_TIMEOUT
            )
            logger.info(f"LLM response received successfully")
        except asyncio.TimeoutError:
            logger.error(f"LLM call timed out after {LLM_TIMEOUT}s")
            db.rollback()
            raise HTTPException(
                status_code=504,
                detail=f"Risk assessment timeout: LLM service did not respond within {LLM_TIMEOUT}s. Please try again or reduce the complexity of the request."
            )
        except LLMException as e:
            logger.error(f"LLM error: {e}")
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"LLM service error: {str(e)}"
            )
        
        # Обрабатываем ответ (для MVP - базовая логика)
        response_text = llm_response.get("content", "").lower()
        
        # Определяем уровень риска на основе ответа
        if "critical" in response_text or "high risk" in response_text:
            risk_level = "critical"
            risk_score = 0.85
            recommendation = "reject"
        elif "high" in response_text or "significant" in response_text:
            risk_level = "high"
            risk_score = 0.70
            recommendation = "review"
        elif "medium" in response_text or "moderate" in response_text:
            risk_level = "medium"
            risk_score = 0.45
            recommendation = "review"
        else:
            risk_level = "low"
            risk_score = 0.20
            recommendation = "approve"
        
        # Создаем факторы риска (для MVP - базовые)
        risk_factors = [
            RiskFactor(
                name="Financial Risk",
                category="financial",
                weight=0.3,
                score=risk_score * 0.8,
                description="Оценка финансового риска транзакции",
                severity=risk_level
            ),
            RiskFactor(
                name="Compliance Risk",
                category="compliance",
                weight=0.3,
                score=risk_score * 0.9,
                description="Риск нарушения compliance требований",
                severity=risk_level
            ),
            RiskFactor(
                name="Operational Risk",
                category="operational",
                weight=0.25,
                score=risk_score * 1.1,
                description="Операционные риски обработки",
                severity=risk_level if risk_score * 1.1 < 0.7 else "high"
            ),
            RiskFactor(
                name="Reputational Risk",
                category="reputational",
                weight=0.15,
                score=risk_score * 0.7,
                description="Репутационный риск",
                severity="low" if risk_score < 0.5 else "medium"
            )
        ]
        
        # Сохраняем в БД
        insert_risk = text("""
            INSERT INTO risk_assessments 
            (id, document_id, risk_score, risk_level, factors, economic_indices, 
             recommendation, model_version)
            VALUES (:id, :document_id, :risk_score, :risk_level, :factors, 
                    :economic_indices, :recommendation, :model_version)
        """)
        
        db.execute(insert_risk, {
            "id": str(uuid4()),
            "document_id": str(request.document_id),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "factors": {"factors": [f.dict() for f in risk_factors]},
            "economic_indices": {"indices": [ei.dict() for ei in economic_indices]} if economic_indices else None,
            "recommendation": recommendation,
            "model_version": llm_response.get("model", "unknown")
        })
        db.commit()
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return RiskAssessmentDetailed(
            document_id=request.document_id,
            status="completed",
            risk_score=risk_score,
            risk_level=risk_level,
            recommendation=recommendation,
            confidence=0.82,
            factors=risk_factors,
            economic_indices=economic_indices,
            analysis={
                "llm_response": llm_response.get("content", ""),
                "model_used": llm_response.get("model", "unknown"),
                "rag_used": request.use_rag,
                "economic_indices_used": request.include_economic_indices
            },
            mitigations=[
                "Провести дополнительную проверку KYC",
                "Запросить подтверждающие документы",
                "Усилить мониторинг транзакции"
            ] if risk_score > 0.5 else ["Стандартная обработка"],
            processing_time_ms=processing_time_ms,
            timestamp=datetime.now()
        )
        
    except HTTPException:
        raise
    except (RAGException, LLMException) as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Risk assessment failed: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Risk assessment failed: {str(e)}")


@router.get("/statistics")
async def get_risk_statistics(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get risk statistics across all documents"""
    try:
        stats_query = text("""
            SELECT 
                COUNT(*) as total_assessments,
                AVG(risk_score) as avg_risk_score,
                COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk,
                COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk,
                COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk,
                COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_risk,
                COUNT(CASE WHEN recommendation = 'approve' THEN 1 END) as recommend_approve,
                COUNT(CASE WHEN recommendation = 'reject' THEN 1 END) as recommend_reject,
                COUNT(CASE WHEN recommendation = 'review' THEN 1 END) as recommend_review,
                COUNT(CASE WHEN recommendation = 'request_info' THEN 1 END) as recommend_request_info
            FROM risk_assessments
        """)
        
        result = db.execute(stats_query)
        stats = result.fetchone()
        
        # Определяем тренд (для MVP - простая логика)
        trend = "stable"
        avg_score = stats.avg_risk_score if stats.avg_risk_score else 0
        if avg_score and avg_score > 0.6:
            trend = "increasing"
        elif avg_score and avg_score < 0.3:
            trend = "decreasing"
        
        return {
            "total_assessments": stats.total_assessments if stats.total_assessments else 0,
            "average_risk_score": round(avg_score, 3) if avg_score else 0,
            "by_risk_level": {
                "low": stats.low_risk if stats.low_risk else 0,
                "medium": stats.medium_risk if stats.medium_risk else 0,
                "high": stats.high_risk if stats.high_risk else 0,
                "critical": stats.critical_risk if stats.critical_risk else 0
            },
            "by_recommendation": {
                "approve": stats.recommend_approve if stats.recommend_approve else 0,
                "reject": stats.recommend_reject if stats.recommend_reject else 0,
                "review": stats.recommend_review if stats.recommend_review else 0,
                "request_info": stats.recommend_request_info if stats.recommend_request_info else 0
            },
            "trend": trend
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


@router.get("/assessments")
async def list_risk_assessments(
    document_id: Optional[UUID] = Query(None, description="Filter by document ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    recommendation: Optional[str] = Query(None, description="Filter by recommendation"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    List all risk assessments with optional filters
    
    - **document_id**: Filter by document UUID
    - **risk_level**: Filter by risk level (low, medium, high, critical)
    - **recommendation**: Filter by recommendation (approve, reject, review, request_info)
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
        
        if risk_level:
            where_clauses.append("risk_level = :risk_level")
            params["risk_level"] = risk_level
        
        if recommendation:
            where_clauses.append("recommendation = :recommendation")
            params["recommendation"] = recommendation
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Get total count
        count_query = text(f"""
            SELECT COUNT(*) as total
            FROM risk_assessments
            WHERE {where_sql}
        """)
        count_result = db.execute(count_query, params)
        total = count_result.fetchone().total
        
        # Get assessments
        select_query = text(f"""
            SELECT id, document_id, risk_score, risk_level, recommendation, 
                   model_version, created_at
            FROM risk_assessments
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :skip
        """)
        
        result = db.execute(select_query, params)
        assessments = result.fetchall()
        
        return {
            "total": total,
            "assessments": [
                {
                    "id": str(a.id),
                    "document_id": str(a.document_id),
                    "risk_score": a.risk_score,
                    "risk_level": a.risk_level,
                    "recommendation": a.recommendation,
                    "model_version": a.model_version,
                    "created_at": a.created_at.isoformat() if a.created_at else None
                }
                for a in assessments
            ],
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list risk assessments: {str(e)}")


@router.get("/assessments/{assessment_id}")
async def get_risk_assessment_by_id(
    assessment_id: UUID,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get a specific risk assessment by ID"""
    try:
        query = text("""
            SELECT id, document_id, risk_score, risk_level, factors, 
                   economic_indices, recommendation, model_version, created_at
            FROM risk_assessments
            WHERE id = :assessment_id
        """)
        
        result = db.execute(query, {"assessment_id": str(assessment_id)})
        assessment = result.fetchone()
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Risk assessment not found")
        
        return {
            "id": str(assessment.id),
            "document_id": str(assessment.document_id),
            "risk_score": assessment.risk_score,
            "risk_level": assessment.risk_level,
            "factors": assessment.factors,
            "economic_indices": assessment.economic_indices,
            "recommendation": assessment.recommendation,
            "model_version": assessment.model_version,
            "created_at": assessment.created_at.isoformat() if assessment.created_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get risk assessment: {str(e)}")


@router.get("/factors")
async def list_risk_factors() -> Dict[str, Any]:
    """
    List available risk factors and their descriptions
    
    Returns the supported risk factor categories and their details.
    """
    return {
        "factors": [
            {
                "name": "Financial Risk",
                "category": "financial",
                "description": "Risks related to financial aspects of the transaction",
                "sub_factors": ["liquidity", "credit", "market", "currency"]
            },
            {
                "name": "Compliance Risk",
                "category": "compliance",
                "description": "Risks related to regulatory and legal compliance",
                "sub_factors": ["sanctions", "aml", "kyc", "fatf", "travel_rule"]
            },
            {
                "name": "Operational Risk",
                "category": "operational",
                "description": "Risks related to operational processes",
                "sub_factors": ["fraud", "errors", "delays", "system_failure"]
            },
            {
                "name": "Reputational Risk",
                "category": "reputational",
                "description": "Risks that could affect organization reputation",
                "sub_factors": ["media", "customer_trust", "partner_relations"]
            },
            {
                "name": "Geopolitical Risk",
                "category": "geopolitical",
                "description": "Risks related to geopolitical factors",
                "sub_factors": ["country_risk", "political_instability", "sanctions_exposure"]
            }
        ],
        "total": 5
    }


@router.get("/{document_id}", response_model=RiskAssessmentResponse)
async def get_risk_assessment(
    document_id: UUID,
    db: Session = Depends(get_db)
) -> RiskAssessmentResponse:
    """Get risk assessment for document"""
    try:
        # Проверяем существование документа
        doc_query = text("""
            SELECT id FROM payment_documents WHERE id = :document_id
        """)
        result = db.execute(doc_query, {"document_id": str(document_id)})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Получаем последнюю оценку рисков
        risk_query = text("""
            SELECT id, document_id, risk_score, risk_level, factors, 
                   economic_indices, recommendation, model_version, created_at
            FROM risk_assessments
            WHERE document_id = :document_id
            ORDER BY created_at DESC
            LIMIT 1
        """)
        
        result = db.execute(risk_query, {"document_id": str(document_id)})
        risk = result.fetchone()
        
        if not risk:
            raise HTTPException(status_code=404, detail="No risk assessment found for this document")
        
        return RiskAssessmentResponse(
            id=risk.id,
            document_id=risk.document_id,
            risk_score=risk.risk_score,
            risk_level=risk.risk_level,
            recommendation=risk.recommendation,
            factors=risk.factors,
            economic_indices=risk.economic_indices,
            model_version=risk.model_version,
            created_at=risk.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get risk assessment: {str(e)}")


@router.get("/{document_id}/history")
async def get_risk_assessment_history(
    document_id: UUID,
    limit: int = 10,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get risk assessment history for document"""
    try:
        query = text("""
            SELECT id, risk_score, risk_level, recommendation, model_version, created_at
            FROM risk_assessments
            WHERE document_id = :document_id
            ORDER BY created_at DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, {
            "document_id": str(document_id),
            "limit": limit
        })
        assessments = result.fetchall()
        
        if not assessments:
            raise HTTPException(status_code=404, detail="No risk assessments found")
        
        return {
            "document_id": str(document_id),
            "total": len(assessments),
            "assessments": [
                {
                    "id": str(a.id),
                    "risk_score": a.risk_score,
                    "risk_level": a.risk_level,
                    "recommendation": a.recommendation,
                    "model_version": a.model_version,
                    "created_at": a.created_at.isoformat()
                }
                for a in assessments
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")


@router.get("/economic-indices/{country_code}")
async def get_economic_indices(
    country_code: str,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get economic indices for a country
    
    - **country_code**: ISO 3166-1 alpha-3 country code (e.g., USA, RUS, CHN)
    - **year**: Optional year filter
    """
    try:
        if len(country_code) != 3:
            raise HTTPException(status_code=400, detail="Invalid country code. Must be 3 characters (ISO 3166-1 alpha-3)")
        
        query_str = """
            SELECT id, country_code, index_type, value, year, source, updated_at
            FROM economic_indices
            WHERE country_code = :country_code
        """
        
        params = {"country_code": country_code.upper()}
        
        if year:
            query_str += " AND year = :year"
            params["year"] = year
        
        query_str += " ORDER BY year DESC, index_type"
        
        query = text(query_str)
        result = db.execute(query, params)
        indices = result.fetchall()
        
        if not indices:
            return {
                "country_code": country_code.upper(),
                "indices": [],
                "message": "No economic indices found for this country"
            }
        
        return {
            "country_code": country_code.upper(),
            "total": len(indices),
            "indices": [
                {
                    "id": str(idx.id),
                    "index_type": idx.index_type,
                    "value": idx.value,
                    "year": idx.year,
                    "source": idx.source,
                    "updated_at": idx.updated_at.isoformat()
                }
                for idx in indices
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get economic indices: {str(e)}")
