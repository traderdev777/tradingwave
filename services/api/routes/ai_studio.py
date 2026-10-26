"""AI Strategy Studio API endpoints for TradingWave.

Provides conversational strategy drafting, targeted clarification workflows,
deterministic pre-flight validation, and strategy persistence/lifecycle operations.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from packages.shared_types.errors import TradingWaveError
from packages.strategy_spec.schema import StrategyLifecycleState, StrategySpec
from services.api.database import get_db
from services.api.dependencies.auth import get_current_user, get_workspace_membership
from services.api.models.audit import AuditEvent
from services.api.models.strategy import (
    BacktestJob,
    PaperSession,
    Strategy,
    StrategyConversation,
    StrategyVersion,
)
from services.api.models.user import User
from services.api.services.ai_studio_service import AIStudioService
from services.api.services.validation_engine import StrategyValidationEngine

router = APIRouter(prefix="/workspaces/{workspace_id}/ai-studio", tags=["AI Strategy Studio"])


class AIChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None
    current_spec: dict[str, Any] | None = None


class ValidateSpecRequest(BaseModel):
    spec: dict[str, Any]


class SaveStrategyRequest(BaseModel):
    spec: dict[str, Any]
    strategy_id: str | None = None


class BacktestTriggerRequest(BaseModel):
    strategy_id: str
    version_id: str | None = None


class PaperTriggerRequest(BaseModel):
    strategy_id: str
    version_id: str | None = None


@router.post("/chat", response_model=dict)
def chat_with_strategy_assistant(
    workspace_id: uuid.UUID,
    payload: AIChatRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Submit a natural-language strategy concept or clarification to the AI Strategy Studio."""
    correlation_id = getattr(request.state, "correlation_id", "ai-chat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    # Parse existing spec if provided
    current_spec_obj: StrategySpec | None = None
    if payload.current_spec:
        try:
            current_spec_obj = StrategySpec.model_validate(payload.current_spec)
        except Exception:
            current_spec_obj = None

    # Process prompt via AIStudioService
    result = AIStudioService.process_prompt(
        prompt=payload.prompt,
        current_spec=current_spec_obj,
    )

    # Persist or update conversation
    conversation: StrategyConversation | None = None
    if payload.conversation_id:
        try:
            conv_id = uuid.UUID(payload.conversation_id)
            conversation = (
                db.query(StrategyConversation)
                .filter(
                    StrategyConversation.id == conv_id,
                    StrategyConversation.workspace_id == workspace_id,
                )
                .first()
            )
            if not conversation:
                raise TradingWaveError("Conversation not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)
        except ValueError:
            raise TradingWaveError("Invalid conversation ID format.", code="INVALID_CONVERSATION_ID", status_code=400)

    user_msg_dict = {
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "role": "user",
        "content": payload.prompt,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    asst_msg_dict = result.message.model_dump()
    asst_msg_dict["timestamp"] = datetime.now(UTC).isoformat()

    if not conversation:
        conv_title = result.spec.name or payload.prompt[:40]
        conversation = StrategyConversation(
            workspace_id=workspace_id,
            user_id=current_user.id,
            title=conv_title,
            messages=[user_msg_dict, asst_msg_dict],
        )
        db.add(conversation)
    else:
        existing_msgs = list(conversation.messages or [])
        existing_msgs.extend([user_msg_dict, asst_msg_dict])
        conversation.messages = existing_msgs
        conversation.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(conversation)

    return {
        "data": {
            "conversation_id": str(conversation.id),
            "message": asst_msg_dict,
            "spec": result.spec.model_dump(mode="json"),
            "validation": result.validation.model_dump(),
            "how_it_works": result.how_it_works,
            "failure_modes": result.failure_modes,
            "ai_provider": result.ai_provider,
        },
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.post("/validate", response_model=dict)
def validate_strategy_specification(
    workspace_id: uuid.UUID,
    payload: ValidateSpecRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Run deterministic static analysis and sanity checks on a strategy specification."""
    correlation_id = getattr(request.state, "correlation_id", "ai-validate")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    try:
        spec_obj = StrategySpec.model_validate(payload.spec)
    except Exception as e:
        raise TradingWaveError(
            f"Invalid strategy specification format: {str(e)}",
            code="MALFORMED_SPECIFICATION",
            status_code=422,
        )

    report = StrategyValidationEngine.validate(spec_obj)

    return {
        "data": report.model_dump(),
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.post("/save-strategy", response_model=dict)
def save_strategy_specification(
    workspace_id: uuid.UUID,
    payload: SaveStrategyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Persist a strategy and generate an immutable version record."""
    correlation_id = getattr(request.state, "correlation_id", "save-strat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    try:
        spec_obj = StrategySpec.model_validate(payload.spec)
    except Exception as e:
        raise TradingWaveError(
            f"Cannot save invalid strategy specification: {str(e)}",
            code="MALFORMED_SPECIFICATION",
            status_code=422,
        )

    # Validate before saving
    report = StrategyValidationEngine.validate(spec_obj)
    spec_hash = spec_obj.compute_canonical_hash()

    strategy: Strategy | None = None
    if payload.strategy_id:
        try:
            strat_uuid = uuid.UUID(payload.strategy_id)
            strategy = (
                db.query(Strategy)
                .filter(Strategy.id == strat_uuid, Strategy.workspace_id == workspace_id)
                .first()
            )
            if not strategy:
                raise TradingWaveError(
                    "Strategy not found in this workspace.",
                    code="RESOURCE_NOT_FOUND",
                    status_code=404,
                )
        except ValueError:
            raise TradingWaveError(
                "Invalid strategy ID format.",
                code="INVALID_STRATEGY_ID",
                status_code=400,
            )

    if not strategy:
        strategy = Strategy(
            workspace_id=workspace_id,
            owner_user_id=current_user.id,
            name=spec_obj.name,
            description=spec_obj.description,
            status="published" if report.can_backtest else "draft",
        )
        db.add(strategy)
        db.flush()
        version_num = 1
    else:
        strategy.name = spec_obj.name
        strategy.description = spec_obj.description
        strategy.status = "published" if report.can_backtest else "draft"
        strategy.updated_at = datetime.now(UTC)
        # Determine next version
        last_ver = (
            db.query(StrategyVersion)
            .filter(StrategyVersion.strategy_id == strategy.id)
            .order_by(StrategyVersion.version_number.desc())
            .first()
        )
        version_num = (last_ver.version_number + 1) if last_ver else 1

    # Create immutable strategy version
    version = StrategyVersion(
        strategy_id=strategy.id,
        version_number=version_num,
        specification=spec_obj.model_dump(mode="json"),
        specification_hash=spec_hash,
        compiler_version=spec_obj.compiler_version,
        created_by=current_user.id,
    )
    db.add(version)
    db.flush()

    strategy.current_version_id = version.id

    audit = AuditEvent(
        workspace_id=workspace_id,
        actor_user_id=current_user.id,
        event_type="STRATEGY_SAVED",
        resource_type="STRATEGY",
        resource_id=strategy.id,
        correlation_id=correlation_id,
        metadata_payload={
            "name": strategy.name,
            "version": version_num,
            "hash": spec_hash,
            "valid": report.is_valid,
        },
    )
    db.add(audit)
    db.commit()

    return {
        "data": {
            "strategy_id": str(strategy.id),
            "version_id": str(version.id),
            "version_number": version.version_number,
            "name": strategy.name,
            "specification_hash": spec_hash,
            "status": strategy.status,
            "validation": report.model_dump(),
        },
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.get("/strategies", response_model=dict)
def list_workspace_strategies(
    workspace_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List all saved strategies within this workspace."""
    correlation_id = getattr(request.state, "correlation_id", "list-strats")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strats = (
        db.query(Strategy)
        .filter(Strategy.workspace_id == workspace_id)
        .order_by(Strategy.updated_at.desc())
        .all()
    )

    data = []
    for s in strats:
        current_ver = None
        if s.current_version_id:
            current_ver = db.query(StrategyVersion).filter(StrategyVersion.id == s.current_version_id).first()
        data.append(
            {
                "id": str(s.id),
                "name": s.name,
                "description": s.description or "",
                "status": s.status,
                "current_version_id": str(s.current_version_id) if s.current_version_id else None,
                "current_version_number": current_ver.version_number if current_ver else 1,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
            }
        )

    return {
        "data": data,
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.get("/strategies/{strategy_id}", response_model=dict)
def get_strategy_details(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    version_id: uuid.UUID | None = None,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Retrieve full strategy detail with specification for a specific version or current version."""
    correlation_id = getattr(request.state, "correlation_id", "get-strat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = (
        db.query(Strategy)
        .filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id)
        .first()
    )
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    version: StrategyVersion | None = None
    if version_id:
        version = (
            db.query(StrategyVersion)
            .filter(StrategyVersion.id == version_id, StrategyVersion.strategy_id == strategy.id)
            .first()
        )
        if not version:
            raise TradingWaveError("Strategy version not found.", code="VERSION_NOT_FOUND", status_code=404)
    elif strategy.current_version_id:
        version = db.query(StrategyVersion).filter(StrategyVersion.id == strategy.current_version_id).first()

    if not version:
        version = (
            db.query(StrategyVersion)
            .filter(StrategyVersion.strategy_id == strategy.id)
            .order_by(StrategyVersion.version_number.desc())
            .first()
        )

    if not version:
        raise TradingWaveError("No versions found for this strategy.", code="NO_VERSIONS_AVAILABLE", status_code=404)

    return {
        "data": {
            "id": str(strategy.id),
            "strategy_id": str(strategy.id),
            "name": strategy.name,
            "description": strategy.description or "",
            "status": strategy.status,
            "version_id": str(version.id),
            "version_number": version.version_number,
            "specification_hash": version.specification_hash,
            "spec": version.specification,
            "compiler_version": version.compiler_version,
            "created_at": strategy.created_at.isoformat(),
            "updated_at": strategy.updated_at.isoformat(),
        },
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.get("/strategies/{strategy_id}/versions", response_model=dict)
def list_strategy_versions(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Retrieve all immutable versions for a strategy."""
    correlation_id = getattr(request.state, "correlation_id", "list-strat-vers")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = (
        db.query(Strategy)
        .filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id)
        .first()
    )
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    versions = (
        db.query(StrategyVersion)
        .filter(StrategyVersion.strategy_id == strategy.id)
        .order_by(StrategyVersion.version_number.desc())
        .all()
    )

    data = [
        {
            "version_id": str(v.id),
            "version_number": v.version_number,
            "specification_hash": v.specification_hash,
            "compiler_version": v.compiler_version,
            "created_at": v.created_at.isoformat(),
            "is_current": v.id == strategy.current_version_id,
        }
        for v in versions
    ]

    return {
        "data": data,
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.post("/strategies/{strategy_id}/duplicate", response_model=dict)
def duplicate_strategy(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Duplicate an existing strategy to create a new editable draft."""
    correlation_id = getattr(request.state, "correlation_id", "dup-strat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = (
        db.query(Strategy)
        .filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id)
        .first()
    )
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    source_ver = None
    if strategy.current_version_id:
        source_ver = db.query(StrategyVersion).filter(StrategyVersion.id == strategy.current_version_id).first()
    if not source_ver:
        source_ver = (
            db.query(StrategyVersion)
            .filter(StrategyVersion.strategy_id == strategy.id)
            .order_by(StrategyVersion.version_number.desc())
            .first()
        )
    if not source_ver:
        raise TradingWaveError("Cannot duplicate strategy with no versions.", code="CANNOT_DUPLICATE", status_code=400)

    new_name = f"{strategy.name} (Copy)"
    new_strategy = Strategy(
        workspace_id=workspace_id,
        owner_user_id=current_user.id,
        name=new_name,
        description=strategy.description,
        status="draft",
    )
    db.add(new_strategy)
    db.flush()

    new_spec = dict(source_ver.specification) if isinstance(source_ver.specification, dict) else {}
    new_spec["name"] = new_name

    new_version = StrategyVersion(
        strategy_id=new_strategy.id,
        version_number=1,
        specification=new_spec,
        specification_hash=source_ver.specification_hash,
        compiler_version=source_ver.compiler_version,
        created_by=current_user.id,
    )
    db.add(new_version)
    db.flush()

    new_strategy.current_version_id = new_version.id
    db.commit()

    return {
        "data": {
            "strategy_id": str(new_strategy.id),
            "version_id": str(new_version.id),
            "version_number": 1,
            "name": new_strategy.name,
            "status": new_strategy.status,
            "spec": new_version.specification,
        },
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.get("/conversations", response_model=dict)
def list_conversations(
    workspace_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Retrieve recent AI Strategy Studio conversations for this workspace."""
    correlation_id = getattr(request.state, "correlation_id", "ai-convs")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    convs = (
        db.query(StrategyConversation)
        .filter(StrategyConversation.workspace_id == workspace_id)
        .order_by(StrategyConversation.updated_at.desc())
        .limit(20)
        .all()
    )

    data = [
        {
            "id": str(c.id),
            "title": c.title,
            "messages_count": len(c.messages or []),
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        }
        for c in convs
    ]

    return {
        "data": data,
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.post("/backtest", response_model=dict)
def trigger_strategy_backtest(
    workspace_id: uuid.UUID,
    payload: BacktestTriggerRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Queue a deterministic backtest simulation job for a validated strategy version."""
    correlation_id = getattr(request.state, "correlation_id", "strat-backtest")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    try:
        strat_uuid = uuid.UUID(payload.strategy_id)
    except ValueError:
        raise TradingWaveError("Invalid strategy ID format.", code="INVALID_STRATEGY_ID", status_code=400)

    strategy = (
        db.query(Strategy)
        .filter(Strategy.id == strat_uuid, Strategy.workspace_id == workspace_id)
        .first()
    )
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    # Get version
    version: StrategyVersion | None = None
    if payload.version_id:
        try:
            ver_uuid = uuid.UUID(payload.version_id)
        except ValueError:
            raise TradingWaveError("Invalid version ID format.", code="INVALID_VERSION_ID", status_code=400)
        version = (
            db.query(StrategyVersion)
            .filter(StrategyVersion.id == ver_uuid, StrategyVersion.strategy_id == strategy.id)
            .first()
        )
        if not version:
            raise TradingWaveError("Strategy version not found for this strategy.", code="RESOURCE_NOT_FOUND", status_code=404)
    elif strategy.current_version_id:
        version = db.query(StrategyVersion).filter(StrategyVersion.id == strategy.current_version_id).first()
    else:
        version = (
            db.query(StrategyVersion)
            .filter(StrategyVersion.strategy_id == strategy.id)
            .order_by(StrategyVersion.version_number.desc())
            .first()
        )

    if not version:
        raise TradingWaveError(
            "Strategy has no published version to backtest.",
            code="NO_VERSION_AVAILABLE",
            status_code=400,
        )

    # Check for blocking errors
    spec_obj = StrategySpec.model_validate(version.specification)
    report = StrategyValidationEngine.validate(spec_obj)
    if not report.can_backtest:
        raise TradingWaveError(
            f"Strategy cannot be backtested due to {report.error_count} blocking validation error(s).",
            code="VALIDATION_ERRORS_BLOCK_TESTING",
            status_code=400,
        )

    # Queue backtest job
    job = BacktestJob(
        workspace_id=workspace_id,
        strategy_version_id=version.id,
        status="QUEUED",
    )
    db.add(job)

    audit = AuditEvent(
        workspace_id=workspace_id,
        actor_user_id=current_user.id,
        event_type="BACKTEST_QUEUED",
        resource_type="BACKTEST_JOB",
        resource_id=job.id,
        correlation_id=correlation_id,
        metadata_payload={
            "strategy_id": str(strategy.id),
            "version_number": version.version_number,
            "status": "QUEUED",
        },
    )
    db.add(audit)
    db.commit()

    return {
        "data": {
            "job_id": str(job.id),
            "strategy_id": str(strategy.id),
            "version_number": version.version_number,
            "status": "QUEUED",
            "message": f"Backtest simulation job queued for {strategy.name} (v{version.version_number}).",
        },
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.post("/paper-session", response_model=dict)
def trigger_paper_trading_session(
    workspace_id: uuid.UUID,
    payload: PaperTriggerRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Launch a virtual paper trading session with zero real capital risk."""
    correlation_id = getattr(request.state, "correlation_id", "strat-paper")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    try:
        strat_uuid = uuid.UUID(payload.strategy_id)
    except ValueError:
        raise TradingWaveError("Invalid strategy ID format.", code="INVALID_STRATEGY_ID", status_code=400)

    strategy = (
        db.query(Strategy)
        .filter(Strategy.id == strat_uuid, Strategy.workspace_id == workspace_id)
        .first()
    )
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    # Get version
    version: StrategyVersion | None = None
    if payload.version_id:
        try:
            ver_uuid = uuid.UUID(payload.version_id)
        except ValueError:
            raise TradingWaveError("Invalid version ID format.", code="INVALID_VERSION_ID", status_code=400)
        version = (
            db.query(StrategyVersion)
            .filter(StrategyVersion.id == ver_uuid, StrategyVersion.strategy_id == strategy.id)
            .first()
        )
        if not version:
            raise TradingWaveError("Strategy version not found for this strategy.", code="RESOURCE_NOT_FOUND", status_code=404)
    elif strategy.current_version_id:
        version = db.query(StrategyVersion).filter(StrategyVersion.id == strategy.current_version_id).first()
    else:
        version = (
            db.query(StrategyVersion)
            .filter(StrategyVersion.strategy_id == strategy.id)
            .order_by(StrategyVersion.version_number.desc())
            .first()
        )

    if not version:
        raise TradingWaveError(
            "Strategy has no published version to simulate.",
            code="NO_VERSION_AVAILABLE",
            status_code=400,
        )

    # Validate before launching paper trading
    spec_obj = StrategySpec.model_validate(version.specification)
    report = StrategyValidationEngine.validate(spec_obj)
    if not report.can_paper_trade:
        raise TradingWaveError(
            f"Strategy cannot be paper traded due to {report.error_count} blocking validation error(s).",
            code="VALIDATION_ERRORS_BLOCK_TESTING",
            status_code=400,
        )

    session = PaperSession(
        workspace_id=workspace_id,
        strategy_version_id=version.id,
        status="RUNNING",
    )
    db.add(session)

    audit = AuditEvent(
        workspace_id=workspace_id,
        actor_user_id=current_user.id,
        event_type="PAPER_SESSION_STARTED",
        resource_type="PAPER_SESSION",
        resource_id=session.id,
        correlation_id=correlation_id,
        metadata_payload={
            "strategy_id": str(strategy.id),
            "version_number": version.version_number,
            "status": "RUNNING",
        },
    )
    db.add(audit)
    db.commit()

    return {
        "data": {
            "session_id": str(session.id),
            "strategy_id": str(strategy.id),
            "status": "RUNNING",
            "message": f"Virtual paper trading session started for {strategy.name}.",
            "disclaimer": "SIMULATED EXECUTIONS ONLY — ZERO REAL BROKER CAPITAL AT RISK",
        },
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }
