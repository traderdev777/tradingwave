"""Strategy Library API routes for TradingWave.

Provides endpoints for:
- Discovering and instantiating strategy templates.
- Searching, filtering, and sorting saved strategies.
- Creating drafts, updating metadata, and duplicating strategies.
- Folders, collections, tags, and favorites organization.
- Version history inspection, version restoration, and side-by-side comparison.
- Backtest history inspection linked to specific strategy versions.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from packages.shared_types.errors import TradingWaveError
from packages.strategy_spec import (
    Exchange,
    StrategyCategory,
    StrategyDirection,
    StrategyLifecycleState,
    StrategySpec,
    Timeframe,
    TradingMode,
    get_template,
    list_templates,
)
from services.api.database import get_db
from services.api.dependencies.auth import get_current_user, get_workspace_membership
from services.api.models.audit import AuditEvent
from services.api.models.strategy import (
    BacktestJob,
    PaperSession,
    Strategy,
    StrategyCollection,
    StrategyFolder,
    StrategyVersion,
)
from services.api.models.user import User
from services.api.schemas.strategy_library import (
    CompareStrategiesRequest,
    CreateCollectionRequest,
    CreateFolderRequest,
    CreateFromTemplateRequest,
    CreateStrategyRequest,
    UpdateCollectionRequest,
    UpdateFolderRequest,
    UpdateStrategyMetadataRequest,
)
from services.api.services.validation_engine import StrategyValidationEngine

router = APIRouter(prefix="/workspaces/{workspace_id}/library", tags=["Strategy Library"])


# ----------------------------------------------------------------------------------
# STRATEGY LISTING, SEARCH & SUMMARY
# ----------------------------------------------------------------------------------
@router.get("/strategies", response_model=dict)
def list_library_strategies(
    workspace_id: uuid.UUID,
    request: Request,
    q: str | None = Query(default=None, description="Search term for name, description, symbol, category, tags"),
    status: str | None = Query(default=None, description="Filter by strategy status"),
    category: str | None = Query(default=None, description="Filter by strategy category"),
    exchange: str | None = Query(default=None, description="Filter by exchange (NSE, BSE, MCX)"),
    symbol: str | None = Query(default=None, description="Filter by instrument symbol"),
    trading_mode: str | None = Query(default=None, description="Filter by trading mode (INTRADAY, BTST)"),
    source: str | None = Query(default=None, description="Filter by source (AI_STUDIO, VISUAL_BUILDER, TEMPLATE, CUSTOM)"),
    folder_id: str | None = Query(default=None, description="Filter by folder UUID (or 'none' for unfiled)"),
    is_favorite: bool | None = Query(default=None, description="Filter favorites"),
    is_archived: bool = Query(default=False, description="Include or filter archived strategies"),
    tag: str | None = Query(default=None, description="Filter by specific tag"),
    sort_by: str = Query(default="recently_updated", description="Sorting field"),
    sort_dir: str = Query(default="desc", description="Sorting direction (asc/desc)"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    instrument: str | None = Query(default=None, description="Filter by instrument symbol (alias for symbol)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Retrieve filtered, sorted, and paginated strategies for the current workspace with real summary metrics."""
    correlation_id = getattr(request.state, "correlation_id", "lib-strats")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    # Base query for this tenant workspace with StrategyVersion join for specification filtering
    base_query = (
        db.query(Strategy)
        .outerjoin(StrategyVersion, Strategy.current_version_id == StrategyVersion.id)
        .filter(Strategy.workspace_id == workspace_id)
    )

    # 1. Archive filter
    if is_archived:
        base_query = base_query.filter(Strategy.status == "archived")
    else:
        base_query = base_query.filter(Strategy.status != "archived")

    # 2. Status filter
    if status:
        base_query = base_query.filter(Strategy.status == status.lower())

    # 3. Source filter
    if source:
        base_query = base_query.filter(Strategy.source == source.upper())

    # 4. Folder filter
    if folder_id:
        if folder_id.lower() == "none":
            base_query = base_query.filter(Strategy.folder_id.is_(None))
        else:
            try:
                f_uuid = uuid.UUID(folder_id)
                base_query = base_query.filter(Strategy.folder_id == f_uuid)
            except ValueError:
                pass

    # 5. Favorite filter
    if is_favorite is not None:
        base_query = base_query.filter(Strategy.is_favorite == is_favorite)

    # 6. Instrument / Symbol filter
    inst_filter = instrument or symbol
    if inst_filter and inst_filter.strip():
        inst_term = f"%{inst_filter.strip().lower()}%"
        base_query = base_query.filter(
            or_(
                func.lower(Strategy.name).like(inst_term),
                func.lower(Strategy.tags).like(inst_term),
                func.lower(StrategyVersion.specification).like(inst_term),
            )
        )

    # 7. Category filter
    if category and category.strip():
        cat_term = f"%{category.strip().lower()}%"
        base_query = base_query.filter(
            or_(
                func.lower(Strategy.tags).like(cat_term),
                func.lower(StrategyVersion.specification).like(cat_term),
                func.lower(Strategy.name).like(cat_term),
            )
        )

    # 8. Exchange filter
    if exchange and exchange.strip():
        exch_term = f"%{exchange.strip().lower()}%"
        base_query = base_query.filter(func.lower(StrategyVersion.specification).like(exch_term))

    # 9. Trading mode filter
    if trading_mode and trading_mode.strip():
        tm = trading_mode.strip()
        base_query = base_query.filter(
            or_(
                func.lower(StrategyVersion.specification).like(f'%"trading_mode": "{tm.lower()}"%'),
                func.lower(StrategyVersion.specification).like(f'%"trading_mode": "{tm.upper()}"%'),
                func.lower(StrategyVersion.specification).like(f'%"trading_mode":"{tm.lower()}"%'),
                func.lower(StrategyVersion.specification).like(f'%"trading_mode":"{tm.upper()}"%'),
            )
        )

    # 10. Tag filter
    if tag and tag.strip():
        tag_term = f"%{tag.strip().lower()}%"
        base_query = base_query.filter(func.lower(Strategy.tags).like(tag_term))

    # 11. Keyword Search
    if q and q.strip():
        search_term = f"%{q.strip().lower()}%"
        base_query = base_query.filter(
            or_(
                func.lower(Strategy.name).like(search_term),
                func.lower(Strategy.description).like(search_term),
                func.lower(Strategy.tags).like(search_term),
                func.lower(StrategyVersion.specification).like(search_term),
            )
        )

    # 12. Sorting
    if sort_by == "alphabetical":
        base_query = base_query.order_by(Strategy.name.asc() if sort_dir == "asc" else Strategy.name.desc())
    elif sort_by == "recently_created":
        base_query = base_query.order_by(Strategy.created_at.asc() if sort_dir == "asc" else Strategy.created_at.desc())
    else:  # default: recently_updated
        base_query = base_query.order_by(Strategy.updated_at.asc() if sort_dir == "asc" else Strategy.updated_at.desc())

    total = base_query.count()
    strategies = base_query.offset((page - 1) * page_size).limit(page_size).all()

    # Pre-fetch folders
    folders = {f.id: f.name for f in db.query(StrategyFolder).filter(StrategyFolder.workspace_id == workspace_id).all()}

    # Compute ribbon summary counts
    all_strats = db.query(Strategy).filter(Strategy.workspace_id == workspace_id).all()
    total_strategies = len(all_strats)
    archived_count = sum(1 for s in all_strats if s.status == "archived")
    favorites_count = sum(1 for s in all_strats if s.is_favorite)
    draft_count = sum(1 for s in all_strats if s.status == "draft")
    validated_count = sum(1 for s in all_strats if s.status in ("validated", "published"))

    # Backtested count (strategies with at least 1 backtest job)
    backtested_strat_ids = {
        row[0]
        for row in db.query(StrategyVersion.strategy_id)
        .join(BacktestJob, BacktestJob.strategy_version_id == StrategyVersion.id)
        .filter(BacktestJob.workspace_id == workspace_id, BacktestJob.status == "COMPLETED")
        .distinct()
        .all()
    }
    backtested_count = len(backtested_strat_ids)

    # Paper trading count
    paper_strat_ids = {
        row[0]
        for row in db.query(StrategyVersion.strategy_id)
        .join(PaperSession, PaperSession.strategy_version_id == StrategyVersion.id)
        .filter(PaperSession.workspace_id == workspace_id)
        .distinct()
        .all()
    }
    paper_count = len(paper_strat_ids)

    items = []
    for s in strategies:
        # Latest or current version
        version = None
        if s.current_version_id:
            version = db.query(StrategyVersion).filter(StrategyVersion.id == s.current_version_id).first()
        if not version:
            version = (
                db.query(StrategyVersion)
                .filter(StrategyVersion.strategy_id == s.id)
                .order_by(StrategyVersion.version_number.desc())
                .first()
            )

        spec = version.specification if version else {}

        # Apply secondary spec filters if specified
        if category and spec.get("category", "").upper() != category.upper():
            continue
        if exchange and spec.get("exchange", "").upper() != exchange.upper():
            continue
        if symbol and spec.get("symbol", "").upper() != symbol.upper():
            continue
        if trading_mode and spec.get("trading_mode", "").upper() != trading_mode.upper():
            continue
        if tag:
            strat_tags = [t.lower() for t in (s.tags or [])]
            if tag.lower() not in strat_tags:
                continue

        versions_count = db.query(StrategyVersion).filter(StrategyVersion.strategy_id == s.id).count()

        # Most recent backtest job
        latest_backtest = None
        if version:
            job = (
                db.query(BacktestJob)
                .filter(BacktestJob.strategy_version_id == version.id)
                .order_by(BacktestJob.created_at.desc())
                .first()
            )
            if job:
                latest_backtest = {
                    "id": str(job.id),
                    "status": job.status,
                    "created_at": job.created_at.isoformat(),
                    "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                    "metrics": job.metrics,
                }

        # Cached validation or fast eval
        validation_summary = {"is_valid": True, "error_count": 0, "warning_count": 0}
        if version and version.validation_report:
            validation_summary = {
                "is_valid": version.validation_report.get("is_valid", True),
                "error_count": version.validation_report.get("error_count", 0),
                "warning_count": version.validation_report.get("warning_count", 0),
            }

        sym = spec.get("symbol", "NIFTY50")
        exch = spec.get("exchange", "NSE")
        cat = spec.get("category", "ORB")
        mode = spec.get("trading_mode", "INTRADAY")

        items.append({
            "id": str(s.id),
            "name": s.name,
            "description": s.description or "",
            "category": cat,
            "symbol": sym,
            "exchange": exch,
            "trading_mode": mode,
            "status": s.status,
            "is_favorite": s.is_favorite,
            "folder_id": str(s.folder_id) if s.folder_id else None,
            "folder_name": folders.get(s.folder_id),
            "tags": s.tags or [],
            "source": s.source,
            "current_version_id": str(s.current_version_id) if s.current_version_id else None,
            "version_number": version.version_number if version else 1,
            "specification_hash": version.specification_hash if version else None,
            "spec": {
                "symbol": sym,
                "exchange": exch,
                "category": cat,
                "timeframe": spec.get("timeframe", "15m"),
                "entry_timeframe": spec.get("entry_timeframe", "5m"),
                "exit_timeframe": spec.get("exit_timeframe", "1m"),
                "trading_mode": spec.get("trading_mode", "INTRADAY"),
                "indicators_count": len(spec.get("indicators", [])),
                "has_tsl": bool(spec.get("tsl_settings", {}).get("enabled")),
                "has_orb": bool(spec.get("orb_settings", {}).get("enabled")),
            },
            "validation": validation_summary,
            "last_backtest": latest_backtest,
            "versions_count": versions_count,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        })

    return {
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
            "summary_counts": {
                "total_strategies": total_strategies,
                "draft_count": draft_count,
                "validated_count": validated_count,
                "backtested_count": backtested_count,
                "paper_count": paper_count,
                "favorites_count": favorites_count,
                "archived_count": archived_count,
            },
        },
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


# ----------------------------------------------------------------------------------
# STRATEGY CRUD & LIFECYCLE MUTATIONS
# ----------------------------------------------------------------------------------
def _normalize_category(cat: str | None) -> StrategyCategory:
    if not cat:
        return StrategyCategory.ORB
    raw = cat.lower().strip().replace("-", " ").replace("_", " ")
    mapping = {
        "opening range breakout": StrategyCategory.ORB,
        "orb": StrategyCategory.ORB,
        "trend following": StrategyCategory.TREND_FOLLOWING,
        "trend_following": StrategyCategory.TREND_FOLLOWING,
        "momentum": StrategyCategory.MOMENTUM,
        "mean reversion": StrategyCategory.MEAN_REVERSION,
        "mean_reversion": StrategyCategory.MEAN_REVERSION,
        "breakout": StrategyCategory.BREAKOUT,
        "scalping": StrategyCategory.SCALPING,
        "volatility": StrategyCategory.VOLATILITY,
        "price action": StrategyCategory.BREAKOUT,
        "indicator based": StrategyCategory.TREND_FOLLOWING,
        "multi condition": StrategyCategory.ORB,
        "custom": StrategyCategory.BREAKOUT,
    }
    return mapping.get(raw, StrategyCategory.ORB)


@router.post("/strategies", response_model=dict)
def create_strategy_draft(
    workspace_id: uuid.UUID,
    payload: CreateStrategyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a new strategy draft and initial version in the workspace."""
    correlation_id = getattr(request.state, "correlation_id", "create-strat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    f_id = None
    if payload.folder_id:
        try:
            f_id = uuid.UUID(payload.folder_id)
        except ValueError:
            pass

    # Build spec
    if payload.spec:
        spec_dict = payload.spec
    else:
        cat_enum = _normalize_category(payload.category)
        exch_enum = Exchange(payload.exchange.upper()) if payload.exchange and payload.exchange.upper() in Exchange.__members__ else Exchange.NSE
        mode_enum = TradingMode(payload.trading_mode.upper()) if payload.trading_mode and payload.trading_mode.upper() in TradingMode.__members__ else TradingMode.INTRADAY
        tf_enum = Timeframe(payload.timeframe.lower()) if payload.timeframe and payload.timeframe.lower() in [t.value for t in Timeframe] else Timeframe.M15

        spec_obj = StrategySpec(
            name=payload.name,
            description=payload.description or "",
            exchange=exch_enum,
            symbol=(payload.symbol or "NIFTY50").upper(),
            timeframe=tf_enum,
            category=cat_enum,
            trading_mode=mode_enum,
        )
        spec_dict = spec_obj.model_dump(mode="json")

    spec_obj = StrategySpec.model_validate(spec_dict)
    spec_hash = spec_obj.compute_canonical_hash()
    val_report = StrategyValidationEngine.validate(spec_obj)

    strategy = Strategy(
        workspace_id=workspace_id,
        owner_user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        status="validated" if val_report.is_valid else "draft",
        folder_id=f_id,
        tags=payload.tags or [payload.category, payload.symbol],
        source=payload.source or "CUSTOM",
    )
    db.add(strategy)
    db.flush()

    version = StrategyVersion(
        strategy_id=strategy.id,
        version_number=1,
        specification=spec_dict,
        specification_hash=spec_hash,
        compiler_version=spec_obj.compiler_version or "1.0.0",
        change_summary="Initial strategy creation",
        validation_report=val_report.model_dump(),
        created_by=current_user.id,
    )
    db.add(version)
    db.flush()

    strategy.current_version_id = version.id

    audit = AuditEvent(
        workspace_id=workspace_id,
        actor_user_id=current_user.id,
        event_type="STRATEGY_CREATED",
        resource_type="STRATEGY",
        resource_id=strategy.id,
        correlation_id=correlation_id,
        metadata_payload={"name": strategy.name, "source": strategy.source},
    )
    db.add(audit)
    db.commit()

    return {
        "data": {
            "strategy_id": str(strategy.id),
            "id": str(strategy.id),
            "version_id": str(version.id),
            "version_number": 1,
            "name": strategy.name,
            "spec": spec_dict,
            "validation": val_report.model_dump(),
        },
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
        folder_id=strategy.folder_id,
        tags=list(strategy.tags) if strategy.tags else [],
        source=strategy.source,
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
        change_summary=f"Duplicated from {strategy.name}",
        created_by=current_user.id,
    )
    db.add(new_version)
    db.flush()

    new_strategy.current_version_id = new_version.id

    audit = AuditEvent(
        workspace_id=workspace_id,
        actor_user_id=current_user.id,
        event_type="STRATEGY_DUPLICATED",
        resource_type="STRATEGY",
        resource_id=new_strategy.id,
        correlation_id=correlation_id,
        metadata_payload={"original_id": str(strategy.id), "new_id": str(new_strategy.id)},
    )
    db.add(audit)
    db.commit()

    return {
        "data": {
            "id": str(new_strategy.id),
            "strategy_id": str(new_strategy.id),
            "name": new_strategy.name,
            "version_number": 1,
            "status": "draft",
            "spec": new_spec,
        },
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.patch("/strategies/{strategy_id}", response_model=dict)
def update_strategy_metadata(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    payload: UpdateStrategyMetadataRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Update strategy metadata: name, description, folder, tags, status, or favorite state."""
    correlation_id = getattr(request.state, "correlation_id", "patch-strat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id).first()
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    if payload.name is not None:
        strategy.name = payload.name.strip()
    if payload.description is not None:
        strategy.description = payload.description.strip()
    if payload.status is not None:
        strategy.status = payload.status.lower()
    if payload.is_favorite is not None:
        strategy.is_favorite = payload.is_favorite
    if payload.tags is not None:
        strategy.tags = payload.tags
    if payload.folder_id is not None:
        if payload.folder_id == "" or payload.folder_id.lower() == "none":
            strategy.folder_id = None
        else:
            try:
                f_uuid = uuid.UUID(payload.folder_id)
                folder = db.query(StrategyFolder).filter(StrategyFolder.id == f_uuid, StrategyFolder.workspace_id == workspace_id).first()
                if not folder:
                    raise TradingWaveError("Target folder not found in this workspace.", code="FOLDER_NOT_FOUND", status_code=404)
                strategy.folder_id = f_uuid
            except ValueError:
                raise TradingWaveError("Invalid folder UUID.", code="INVALID_FOLDER_ID", status_code=400)

    strategy.updated_at = datetime.now(UTC)
    db.commit()

    return {
        "data": {
            "id": str(strategy.id),
            "strategy_id": str(strategy.id),
            "name": strategy.name,
            "description": strategy.description,
            "status": strategy.status,
            "is_favorite": strategy.is_favorite,
            "folder_id": str(strategy.folder_id) if strategy.folder_id else None,
            "tags": strategy.tags,
            "updated_at": strategy.updated_at.isoformat(),
        },
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.post("/strategies/{strategy_id}/favorite", response_model=dict)
def toggle_strategy_favorite(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Toggle favorite star state on a strategy."""
    correlation_id = getattr(request.state, "correlation_id", "fav-strat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id).first()
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    strategy.is_favorite = not strategy.is_favorite
    strategy.updated_at = datetime.now(UTC)
    db.commit()

    return {
        "data": {
            "strategy_id": str(strategy.id),
            "is_favorite": strategy.is_favorite,
        },
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.post("/strategies/{strategy_id}/archive", response_model=dict)
def archive_strategy(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Mark a strategy as archived."""
    correlation_id = getattr(request.state, "correlation_id", "arch-strat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id).first()
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    strategy.status = "archived"
    strategy.updated_at = datetime.now(UTC)
    db.commit()

    return {
        "data": {"strategy_id": str(strategy.id), "status": "archived"},
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.post("/strategies/{strategy_id}/restore", response_model=dict)
def restore_archived_strategy(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Restore an archived strategy back to draft."""
    correlation_id = getattr(request.state, "correlation_id", "rest-strat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id).first()
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    strategy.status = "draft"
    strategy.updated_at = datetime.now(UTC)
    db.commit()

    return {
        "data": {"strategy_id": str(strategy.id), "status": "draft"},
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.delete("/strategies/{strategy_id}", response_model=dict)
def delete_strategy(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Permanently delete a strategy and its historical versions."""
    correlation_id = getattr(request.state, "correlation_id", "del-strat")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id).first()
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    strat_name = strategy.name
    db.delete(strategy)

    audit = AuditEvent(
        workspace_id=workspace_id,
        actor_user_id=current_user.id,
        event_type="STRATEGY_DELETED",
        resource_type="STRATEGY",
        resource_id=strategy_id,
        correlation_id=correlation_id,
        metadata_payload={"name": strat_name},
    )
    db.add(audit)
    db.commit()

    return {
        "data": {"strategy_id": str(strategy_id), "deleted": True},
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


# ----------------------------------------------------------------------------------
# BACKTEST HISTORY FOR STRATEGY
# ----------------------------------------------------------------------------------
@router.get("/strategies/{strategy_id}/backtests", response_model=dict)
def get_strategy_backtest_history(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Retrieve all historical backtest execution jobs for this strategy across versions."""
    correlation_id = getattr(request.state, "correlation_id", "strat-backtests")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id).first()
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    # Fetch jobs joined with versions
    jobs = (
        db.query(BacktestJob, StrategyVersion.version_number)
        .join(StrategyVersion, StrategyVersion.id == BacktestJob.strategy_version_id)
        .filter(StrategyVersion.strategy_id == strategy.id, BacktestJob.workspace_id == workspace_id)
        .order_by(BacktestJob.created_at.desc())
        .all()
    )

    items = []
    for job, v_num in jobs:
        items.append({
            "job_id": str(job.id),
            "version_number": v_num,
            "status": job.status,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "configuration": job.configuration,
            "metrics": job.metrics,
            "error_message": job.error_message,
        })

    return {
        "data": {
            "strategy_id": str(strategy.id),
            "strategy_name": strategy.name,
            "backtests": items,
            "total_runs": len(items),
        },
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


# ----------------------------------------------------------------------------------
# RESTORE HISTORICAL VERSION AS EDITABLE DRAFT
# ----------------------------------------------------------------------------------
@router.post("/strategies/{strategy_id}/versions/{version_id}/restore", response_model=dict)
def restore_historical_version(
    workspace_id: uuid.UUID,
    strategy_id: uuid.UUID,
    version_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Restore a historical version specification as a new editable draft version."""
    correlation_id = getattr(request.state, "correlation_id", "restore-ver")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    strategy = db.query(Strategy).filter(Strategy.id == strategy_id, Strategy.workspace_id == workspace_id).first()
    if not strategy:
        raise TradingWaveError("Strategy not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    target_ver = db.query(StrategyVersion).filter(StrategyVersion.id == version_id, StrategyVersion.strategy_id == strategy.id).first()
    if not target_ver:
        raise TradingWaveError("Target version not found.", code="VERSION_NOT_FOUND", status_code=404)

    latest_ver_num = (
        db.query(func.max(StrategyVersion.version_number))
        .filter(StrategyVersion.strategy_id == strategy.id)
        .scalar()
        or 1
    )

    new_version_num = latest_ver_num + 1

    new_version = StrategyVersion(
        strategy_id=strategy.id,
        version_number=new_version_num,
        specification=target_ver.specification,
        specification_hash=target_ver.specification_hash,
        compiler_version=target_ver.compiler_version,
        change_summary=f"Restored from version {target_ver.version_number}",
        validation_report=target_ver.validation_report,
        created_by=current_user.id,
    )
    db.add(new_version)
    db.flush()

    strategy.current_version_id = new_version.id
    strategy.updated_at = datetime.now(UTC)

    audit = AuditEvent(
        workspace_id=workspace_id,
        actor_user_id=current_user.id,
        event_type="VERSION_RESTORED",
        resource_type="STRATEGY_VERSION",
        resource_id=new_version.id,
        correlation_id=correlation_id,
        metadata_payload={
            "strategy_id": str(strategy.id),
            "restored_from_version": target_ver.version_number,
            "new_version_number": new_version_num,
        },
    )
    db.add(audit)
    db.commit()

    return {
        "data": {
            "strategy_id": str(strategy.id),
            "version_id": str(new_version.id),
            "version_number": new_version_num,
            "change_summary": new_version.change_summary,
            "spec": new_version.specification,
        },
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


# ----------------------------------------------------------------------------------
# STRATEGY & VERSION COMPARISON ENGINE
# ----------------------------------------------------------------------------------
@router.post("/strategies/compare", response_model=dict)
def compare_strategies(
    workspace_id: uuid.UUID,
    payload: CompareStrategiesRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Perform side-by-side AST and configuration comparison of two strategies or versions."""
    correlation_id = getattr(request.state, "correlation_id", "cmp-strats")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    # Strategy 1
    s1_uuid = uuid.UUID(payload.strategy_id_1)
    strat1 = db.query(Strategy).filter(Strategy.id == s1_uuid, Strategy.workspace_id == workspace_id).first()
    if not strat1:
        raise TradingWaveError("Strategy 1 not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    if payload.version_id_1:
        v1_uuid = uuid.UUID(payload.version_id_1)
        ver1 = db.query(StrategyVersion).filter(StrategyVersion.id == v1_uuid, StrategyVersion.strategy_id == strat1.id).first()
    else:
        ver1 = db.query(StrategyVersion).filter(StrategyVersion.strategy_id == strat1.id).order_by(StrategyVersion.version_number.desc()).first()

    # Strategy 2
    s2_uuid = uuid.UUID(payload.strategy_id_2)
    strat2 = db.query(Strategy).filter(Strategy.id == s2_uuid, Strategy.workspace_id == workspace_id).first()
    if not strat2:
        raise TradingWaveError("Strategy 2 not found in this workspace.", code="RESOURCE_NOT_FOUND", status_code=404)

    if payload.version_id_2:
        v2_uuid = uuid.UUID(payload.version_id_2)
        ver2 = db.query(StrategyVersion).filter(StrategyVersion.id == v2_uuid, StrategyVersion.strategy_id == strat2.id).first()
    else:
        ver2 = db.query(StrategyVersion).filter(StrategyVersion.strategy_id == strat2.id).order_by(StrategyVersion.version_number.desc()).first()

    if not ver1 or not ver2:
        raise TradingWaveError("Cannot compare specifications without valid versions.", code="VERSIONS_NOT_FOUND", status_code=400)

    spec1 = ver1.specification
    spec2 = ver2.specification

    # Backtests for both
    job1 = db.query(BacktestJob).filter(BacktestJob.strategy_version_id == ver1.id, BacktestJob.status == "COMPLETED").order_by(BacktestJob.created_at.desc()).first()
    job2 = db.query(BacktestJob).filter(BacktestJob.strategy_version_id == ver2.id, BacktestJob.status == "COMPLETED").order_by(BacktestJob.created_at.desc()).first()

    comparison = {
        "item_1": {
            "strategy_id": str(strat1.id),
            "name": strat1.name,
            "version_number": ver1.version_number,
            "specification_hash": ver1.specification_hash,
            "symbol": spec1.get("symbol", "N/A"),
            "exchange": spec1.get("exchange", "N/A"),
            "timeframe": spec1.get("timeframe", "N/A"),
            "trading_mode": spec1.get("trading_mode", "INTRADAY"),
            "category": spec1.get("category", "N/A"),
            "indicators": [f"{i.get('type')}({i.get('period')})" for i in spec1.get("indicators", [])],
            "stop_loss": spec1.get("exit_rules", {}).get("stop_loss_points") or spec1.get("exit_rules", {}).get("stop_loss_pct"),
            "stop_loss_method": spec1.get("exit_rules", {}).get("stop_loss_method"),
            "profit_target": spec1.get("exit_rules", {}).get("target_profit_points") or spec1.get("exit_rules", {}).get("target_profit_pct"),
            "profit_target_method": spec1.get("exit_rules", {}).get("profit_target_method"),
            "tsl_enabled": bool(spec1.get("tsl_settings", {}).get("enabled")),
            "tsl_activation": spec1.get("tsl_settings", {}).get("activation_value"),
            "tsl_distance": spec1.get("tsl_settings", {}).get("distance_value"),
            "capital_allocation_inr": spec1.get("position_sizing", {}).get("allocation_capital_inr"),
            "daily_loss_limit_inr": spec1.get("risk_limits", {}).get("daily_loss_limit_inr"),
            "backtest_metrics": job1.metrics if job1 else None,
        },
        "item_2": {
            "strategy_id": str(strat2.id),
            "name": strat2.name,
            "version_number": ver2.version_number,
            "specification_hash": ver2.specification_hash,
            "symbol": spec2.get("symbol", "N/A"),
            "exchange": spec2.get("exchange", "N/A"),
            "timeframe": spec2.get("timeframe", "N/A"),
            "trading_mode": spec2.get("trading_mode", "INTRADAY"),
            "category": spec2.get("category", "N/A"),
            "indicators": [f"{i.get('type')}({i.get('period')})" for i in spec2.get("indicators", [])],
            "stop_loss": spec2.get("exit_rules", {}).get("stop_loss_points") or spec2.get("exit_rules", {}).get("stop_loss_pct"),
            "stop_loss_method": spec2.get("exit_rules", {}).get("stop_loss_method"),
            "profit_target": spec2.get("exit_rules", {}).get("target_profit_points") or spec2.get("exit_rules", {}).get("target_profit_pct"),
            "profit_target_method": spec2.get("exit_rules", {}).get("profit_target_method"),
            "tsl_enabled": bool(spec2.get("tsl_settings", {}).get("enabled")),
            "tsl_activation": spec2.get("tsl_settings", {}).get("activation_value"),
            "tsl_distance": spec2.get("tsl_settings", {}).get("distance_value"),
            "capital_allocation_inr": spec2.get("position_sizing", {}).get("allocation_capital_inr"),
            "daily_loss_limit_inr": spec2.get("risk_limits", {}).get("daily_loss_limit_inr"),
            "backtest_metrics": job2.metrics if job2 else None,
        },
        "differences": {
            "symbol_diff": spec1.get("symbol") != spec2.get("symbol"),
            "timeframe_diff": spec1.get("timeframe") != spec2.get("timeframe"),
            "indicators_diff": spec1.get("indicators") != spec2.get("indicators"),
            "exit_rules_diff": spec1.get("exit_rules") != spec2.get("exit_rules"),
            "tsl_diff": spec1.get("tsl_settings") != spec2.get("tsl_settings"),
            "risk_limits_diff": spec1.get("risk_limits") != spec2.get("risk_limits"),
        },
    }

    return {
        "data": comparison,
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


# ----------------------------------------------------------------------------------
# FOLDERS & COLLECTIONS MANAGEMENT
# ----------------------------------------------------------------------------------
@router.get("/folders", response_model=dict)
def list_folders(
    workspace_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List all strategy folders with strategy counts."""
    correlation_id = getattr(request.state, "correlation_id", "list-folders")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    folders = db.query(StrategyFolder).filter(StrategyFolder.workspace_id == workspace_id).order_by(StrategyFolder.name.asc()).all()

    items = []
    for f in folders:
        count = db.query(Strategy).filter(Strategy.folder_id == f.id, Strategy.workspace_id == workspace_id, Strategy.status != "archived").count()
        items.append({
            "id": str(f.id),
            "name": f.name,
            "color": f.color or "#FF7722",
            "description": f.description or "",
            "strategy_count": count,
            "created_at": f.created_at.isoformat(),
        })

    return {
        "data": items,
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.post("/folders", response_model=dict)
def create_folder(
    workspace_id: uuid.UUID,
    payload: CreateFolderRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a new strategy folder."""
    correlation_id = getattr(request.state, "correlation_id", "create-folder")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    folder = StrategyFolder(
        workspace_id=workspace_id,
        name=payload.name.strip(),
        color=payload.color or "#FF7722",
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(folder)
    db.commit()

    return {
        "data": {
            "id": str(folder.id),
            "name": folder.name,
            "color": folder.color,
            "description": folder.description,
            "strategy_count": 0,
        },
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.patch("/folders/{folder_id}", response_model=dict)
def update_folder(
    workspace_id: uuid.UUID,
    folder_id: uuid.UUID,
    payload: UpdateFolderRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Update a strategy folder's name, color, or description."""
    correlation_id = getattr(request.state, "correlation_id", "patch-folder")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    folder = db.query(StrategyFolder).filter(StrategyFolder.id == folder_id, StrategyFolder.workspace_id == workspace_id).first()
    if not folder:
        raise TradingWaveError("Folder not found in this workspace.", code="FOLDER_NOT_FOUND", status_code=404)

    if payload.name is not None:
        folder.name = payload.name.strip()
    if payload.color is not None:
        folder.color = payload.color
    if payload.description is not None:
        folder.description = payload.description.strip()

    folder.updated_at = datetime.now(UTC)
    db.commit()

    return {
        "data": {
            "id": str(folder.id),
            "name": folder.name,
            "color": folder.color,
            "description": folder.description,
        },
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.delete("/folders/{folder_id}", response_model=dict)
def delete_folder(
    workspace_id: uuid.UUID,
    folder_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete a strategy folder (unlinks contained strategies without deleting them)."""
    correlation_id = getattr(request.state, "correlation_id", "del-folder")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    folder = db.query(StrategyFolder).filter(StrategyFolder.id == folder_id, StrategyFolder.workspace_id == workspace_id).first()
    if not folder:
        raise TradingWaveError("Folder not found in this workspace.", code="FOLDER_NOT_FOUND", status_code=404)

    # Unlink contained strategies
    db.query(Strategy).filter(Strategy.folder_id == folder_id, Strategy.workspace_id == workspace_id).update({"folder_id": None})
    db.delete(folder)
    db.commit()

    return {
        "data": {"folder_id": str(folder_id), "deleted": True},
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


# ----------------------------------------------------------------------------------
# STRATEGY TEMPLATES DISCOVERY & INSTANTIATION
# ----------------------------------------------------------------------------------
@router.get("/templates", response_model=dict)
def list_library_templates(
    workspace_id: uuid.UUID,
    request: Request,
    category: str | None = Query(default=None, description="Filter by category"),
    instrument: str | None = Query(default=None, description="Filter by instrument"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Browse canonical, production-ready strategy templates across all asset classes."""
    correlation_id = getattr(request.state, "correlation_id", "list-tmpls")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    cat_enum = None
    if category:
        try:
            cat_enum = StrategyCategory(category.upper())
        except ValueError:
            pass

    templates = list_templates(category=cat_enum, instrument=instrument)

    data = []
    for t in templates:
        data.append({
            "template_id": t.template_id,
            "name": t.name,
            "description": t.description,
            "category": t.category.value if hasattr(t.category, "value") else str(t.category),
            "supported_instruments": t.supported_instruments,
            "supported_timeframes": t.supported_timeframes,
            "trading_mode": t.trading_mode.value if hasattr(t.trading_mode, "value") else str(t.trading_mode),
            "tags": t.tags,
            "entry_logic_summary": t.entry_logic_summary,
            "exit_logic_summary": t.exit_logic_summary,
            "risk_settings_summary": t.risk_settings_summary,
            "required_data": t.required_data,
            "known_limitations": t.known_limitations,
            "template_version": t.template_version,
            "backtest_disclaimer": t.backtest_disclaimer,
        })

    return {
        "data": data,
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.get("/templates/{template_id}", response_model=dict)
def get_library_template_detail(
    workspace_id: uuid.UUID,
    template_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Retrieve full template definition with rule preview and canonical specification."""
    correlation_id = getattr(request.state, "correlation_id", "get-tmpl")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    template = get_template(template_id)
    if not template:
        raise TradingWaveError("Template not found in catalog.", code="TEMPLATE_NOT_FOUND", status_code=404)

    return {
        "data": {
            "template_id": template.template_id,
            "name": template.name,
            "description": template.description,
            "category": template.category.value if hasattr(template.category, "value") else str(template.category),
            "supported_instruments": template.supported_instruments,
            "supported_timeframes": template.supported_timeframes,
            "trading_mode": template.trading_mode.value if hasattr(template.trading_mode, "value") else str(template.trading_mode),
            "tags": template.tags,
            "entry_logic_summary": template.entry_logic_summary,
            "exit_logic_summary": template.exit_logic_summary,
            "risk_settings_summary": template.risk_settings_summary,
            "required_data": template.required_data,
            "known_limitations": template.known_limitations,
            "template_version": template.template_version,
            "backtest_disclaimer": template.backtest_disclaimer,
            "spec": template.spec.model_dump(mode="json"),
        },
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }


@router.post("/templates/{template_id}/create", response_model=dict)
def create_strategy_from_template(
    workspace_id: uuid.UUID,
    template_id: str,
    payload: CreateFromTemplateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a new editable strategy draft in the workspace directly from a template."""
    correlation_id = getattr(request.state, "correlation_id", "create-from-tmpl")
    get_workspace_membership(workspace_id=workspace_id, current_user=current_user, db=db)

    template = get_template(template_id)
    if not template:
        raise TradingWaveError("Template not found in catalog.", code="TEMPLATE_NOT_FOUND", status_code=404)

    # Clone spec
    base_spec = template.spec.model_copy(deep=True)
    new_name = payload.name.strip() if payload.name else f"{template.name} Draft"
    base_spec.name = new_name
    base_spec.id = f"strat_{uuid.uuid4().hex[:12]}"

    if payload.exchange:
        try:
            base_spec.exchange = Exchange(payload.exchange.upper())
        except ValueError:
            pass
    if payload.symbol:
        base_spec.symbol = payload.symbol.upper()
    if payload.capital_inr and payload.capital_inr > 0:
        base_spec.position_sizing.allocation_capital_inr = payload.capital_inr
        base_spec.risk_limits.max_capital_allocation_inr = payload.capital_inr * 2

    spec_dict = base_spec.model_dump(mode="json")
    spec_hash = base_spec.compute_canonical_hash()
    val_report = StrategyValidationEngine.validate(base_spec)

    f_id = None
    if payload.folder_id:
        try:
            f_id = uuid.UUID(payload.folder_id)
        except ValueError:
            pass

    tags = payload.tags if payload.tags else list(template.tags)
    if "Template" not in tags:
        tags.append("Template")

    strategy = Strategy(
        workspace_id=workspace_id,
        owner_user_id=current_user.id,
        name=new_name,
        description=f"Instantiated from template: {template.name}. {template.description}",
        status="validated" if val_report.is_valid else "draft",
        folder_id=f_id,
        tags=tags,
        source="TEMPLATE",
    )
    db.add(strategy)
    db.flush()

    version = StrategyVersion(
        strategy_id=strategy.id,
        version_number=1,
        specification=spec_dict,
        specification_hash=spec_hash,
        compiler_version=base_spec.compiler_version or "1.0.0",
        change_summary=f"Created from template {template.template_id} ({template.name})",
        validation_report=val_report.model_dump(),
        created_by=current_user.id,
    )
    db.add(version)
    db.flush()

    strategy.current_version_id = version.id

    audit = AuditEvent(
        workspace_id=workspace_id,
        actor_user_id=current_user.id,
        event_type="STRATEGY_CREATED_FROM_TEMPLATE",
        resource_type="STRATEGY",
        resource_id=strategy.id,
        correlation_id=correlation_id,
        metadata_payload={"template_id": template.template_id, "name": strategy.name},
    )
    db.add(audit)
    db.commit()

    return {
        "data": {
            "strategy_id": str(strategy.id),
            "id": str(strategy.id),
            "version_id": str(version.id),
            "version_number": 1,
            "name": strategy.name,
            "spec": spec_dict,
            "validation": val_report.model_dump(),
            "open_in": payload.open_in or "visual_builder",
        },
        "meta": {"request_id": correlation_id, "timestamp": datetime.now(UTC).isoformat()},
    }
