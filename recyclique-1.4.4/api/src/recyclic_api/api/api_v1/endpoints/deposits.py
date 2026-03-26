from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime, timezone
from uuid import UUID
from recyclic_api.core.database import get_db
from recyclic_api.models.deposit import Deposit, DepositStatus
from recyclic_api.schemas.deposit import DepositResponse, DepositCreate, DepositFinalize

router = APIRouter()

@router.get("/", response_model=List[DepositResponse])
async def get_deposits(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all deposits"""
    deposits = db.query(Deposit).offset(skip).limit(limit).all()
    return deposits

@router.get("/{deposit_id}", response_model=DepositResponse)
async def get_deposit(deposit_id: UUID, db: Session = Depends(get_db)):
    """Get deposit by ID"""
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    return deposit

@router.post("/", response_model=DepositResponse)
async def create_deposit(deposit: DepositCreate, db: Session = Depends(get_db)):
    """Create new deposit"""
    db_deposit = Deposit(**deposit.model_dump())
    db.add(db_deposit)
    db.commit()
    db.refresh(db_deposit)
    return db_deposit

@router.put("/{deposit_id}", response_model=DepositResponse)
async def finalize_deposit(
    deposit_id: UUID,
    finalization: DepositFinalize,
    db: Session = Depends(get_db),
):
    """
    Finalize deposit after human validation/correction (Story 4.3).

    Auth: même périmètre que les autres routes ``/deposits`` (pas de garde dédiée
    sur cette route ; confiance réseau / couche applicative amont si besoin).

    This endpoint handles:
    - Validation of AI classification by user
    - Correction of AI classification with user's choice
    - Setting final status to completed
    - Tracking AI vs human decisions for analysis
    """
    # Get the deposit
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")

    # Validate that deposit is in a state that can be finalized
    if deposit.status not in [DepositStatus.CLASSIFIED, DepositStatus.PENDING_VALIDATION]:
        raise HTTPException(
            status_code=400,
            detail=f"Deposit cannot be finalized from status: {deposit.status}"
        )

    # Store original AI classification for analysis
    ai_suggested_category = deposit.eee_category or deposit.category
    
    # Performance metrics tracking
    start_time = datetime.now(timezone.utc)
    decision_type = "correction" if finalization.correction_applied else "validation"

    # Handle correction vs validation
    if finalization.correction_applied and finalization.final_category:
        # User corrected the AI classification
        deposit.category = finalization.final_category
        deposit.eee_category = finalization.final_category
        # deposit.human_corrected = True  # Temporarily commented out
        # deposit.human_validated = False  # Temporarily commented out

        # Store correction info for AI improvement analysis
        if not deposit.alternative_categories:
            deposit.alternative_categories = {}

        # Track that this was a human correction
        correction_info = {
            "ai_suggested": str(ai_suggested_category) if ai_suggested_category else None,
            "human_corrected": str(finalization.final_category),
            "corrected_at": datetime.now(timezone.utc).isoformat(),
            "confidence_score": deposit.confidence_score or deposit.ai_confidence,
            "processing_time_ms": (datetime.now(timezone.utc) - start_time).total_seconds() * 1000,
            "decision_type": decision_type
        }

        if isinstance(deposit.alternative_categories, dict):
            merged = dict(deposit.alternative_categories)
            merged["correction_info"] = correction_info
            deposit.alternative_categories = merged
        else:
            deposit.alternative_categories = {"correction_info": correction_info}

    elif finalization.validated:
        # User validated the AI classification - keep current category
        if ai_suggested_category:
            deposit.category = ai_suggested_category
            deposit.eee_category = ai_suggested_category
        # deposit.human_validated = True  # Temporarily commented out
        # deposit.human_corrected = False  # Temporarily commented out

        # Track that this was validated by human
        if not deposit.alternative_categories:
            deposit.alternative_categories = {}

        validation_info = {
            "ai_suggested": str(ai_suggested_category) if ai_suggested_category else None,
            "human_validated": True,
            "validated_at": datetime.now(timezone.utc).isoformat(),
            "confidence_score": deposit.confidence_score or deposit.ai_confidence,
            "processing_time_ms": (datetime.now(timezone.utc) - start_time).total_seconds() * 1000,
            "decision_type": decision_type
        }

        if isinstance(deposit.alternative_categories, dict):
            merged = dict(deposit.alternative_categories)
            merged["validation_info"] = validation_info
            deposit.alternative_categories = merged
        else:
            deposit.alternative_categories = {"validation_info": validation_info}
    else:
        raise HTTPException(
            status_code=400,
            detail="Either validation must be true or correction with final_category must be provided"
        )

    # Set final status
    deposit.status = DepositStatus.COMPLETED

    # Update timestamp
    deposit.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(deposit)
        return deposit

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to finalize deposit: {str(e)}")


@router.get("/metrics/validation-performance", response_model=Dict[str, Any])
async def get_validation_metrics(db: Session = Depends(get_db)):
    """
    Get validation performance metrics for AI vs human decisions.
    Provides insights into validation patterns and performance.
    """
    try:
        # Get completed deposits with validation/correction data
        completed_deposits = db.query(Deposit).filter(
            Deposit.status == DepositStatus.COMPLETED,
            Deposit.alternative_categories.isnot(None)
        ).all()
        
        metrics = {
            "total_completed": len(completed_deposits),
            "validation_stats": {
                "total_validations": 0,
                "total_corrections": 0,
                "avg_processing_time_ms": 0.0,
                "confidence_distribution": {
                    "high_confidence": 0,  # > 0.8
                    "medium_confidence": 0,  # 0.5-0.8
                    "low_confidence": 0   # < 0.5
                }
            },
            "ai_performance": {
                "accuracy_rate": 0.0,  # % of validations vs corrections
                "avg_confidence": 0.0,
                "correction_patterns": {}
            }
        }
        
        if not completed_deposits:
            return metrics
            
        total_processing_time = 0
        total_confidence = 0
        confidence_count = 0
        correction_categories = {}
        
        for deposit in completed_deposits:
            alt_categories = deposit.alternative_categories
            
            if isinstance(alt_categories, dict):
                # Check for validation info
                if "validation_info" in alt_categories:
                    metrics["validation_stats"]["total_validations"] += 1
                    validation_info = alt_categories["validation_info"]
                    
                    # Track processing time
                    if "processing_time_ms" in validation_info:
                        total_processing_time += validation_info["processing_time_ms"]
                    
                    # Track confidence
                    confidence = validation_info.get("confidence_score", 0)
                    if confidence > 0:
                        total_confidence += confidence
                        confidence_count += 1
                        _update_confidence_distribution(metrics, confidence)
                
                # Check for correction info
                if "correction_info" in alt_categories:
                    metrics["validation_stats"]["total_corrections"] += 1
                    correction_info = alt_categories["correction_info"]
                    
                    # Track processing time
                    if "processing_time_ms" in correction_info:
                        total_processing_time += correction_info["processing_time_ms"]
                    
                    # Track correction patterns
                    ai_suggested = correction_info.get("ai_suggested", "unknown")
                    human_corrected = correction_info.get("human_corrected", "unknown")
                    
                    if ai_suggested not in correction_categories:
                        correction_categories[ai_suggested] = {}
                    if human_corrected not in correction_categories[ai_suggested]:
                        correction_categories[ai_suggested][human_corrected] = 0
                    correction_categories[ai_suggested][human_corrected] += 1
        
        # Calculate averages
        total_decisions = metrics["validation_stats"]["total_validations"] + metrics["validation_stats"]["total_corrections"]
        
        if total_decisions > 0:
            metrics["validation_stats"]["avg_processing_time_ms"] = total_processing_time / total_decisions
            metrics["ai_performance"]["accuracy_rate"] = (metrics["validation_stats"]["total_validations"] / total_decisions) * 100
            metrics["ai_performance"]["correction_patterns"] = correction_categories
        
        if confidence_count > 0:
            metrics["ai_performance"]["avg_confidence"] = total_confidence / confidence_count
        
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get validation metrics: {str(e)}")


def _update_confidence_distribution(metrics: Dict[str, Any], confidence: float) -> None:
    """Helper function to update confidence distribution."""
    if confidence > 0.8:
        metrics["validation_stats"]["confidence_distribution"]["high_confidence"] += 1
    elif confidence >= 0.5:
        metrics["validation_stats"]["confidence_distribution"]["medium_confidence"] += 1
    else:
        metrics["validation_stats"]["confidence_distribution"]["low_confidence"] += 1
