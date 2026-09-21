#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Journal metadata, watermark scan, and since-filter for QA telemetry JSONL."""

from __future__ import annotations

import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator


def parse_timestamp(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def scan_journal(path: Path) -> dict:
    """
    One pass: line counts + min/max event timestamps.

    Uses event['timestamp'] when present; skips invalid JSON lines.
    """
    meta: dict = {
        "events_path": str(path),
        "events_line_count": 0,
        "events_parsed_count": 0,
        "skipped_lines": 0,
        "events_watermark": None,
        "events_first_timestamp": None,
    }
    if not path.exists():
        meta["missing"] = True
        return meta

    stat = path.stat()
    meta["file_size_bytes"] = stat.st_size
    meta["file_mtime_utc"] = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    min_ts: datetime | None = None
    max_ts: datetime | None = None

    with path.open(encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue
            meta["events_line_count"] += 1
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                meta["skipped_lines"] += 1
                continue
            meta["events_parsed_count"] += 1
            ts = parse_timestamp(event.get("timestamp"))
            if ts is None:
                continue
            if min_ts is None or ts < min_ts:
                min_ts = ts
            if max_ts is None or ts > max_ts:
                max_ts = ts

    if min_ts is not None:
        meta["events_first_timestamp"] = min_ts.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if max_ts is not None:
        meta["events_watermark"] = max_ts.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return meta


def iter_events(path: Path, *, since: str | None = None, exclusive: bool = True) -> Iterator[dict]:
    """Yield parsed events; optional filter on timestamp strictly after `since`."""
    since_dt = parse_timestamp(since) if since else None
    if not path.exists():
        return
    with path.open(encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if since_dt is not None:
                ts = parse_timestamp(event.get("timestamp"))
                if ts is None:
                    continue
                if exclusive:
                    if ts <= since_dt:
                        continue
                elif ts < since_dt:
                    continue
            yield event


def write_filtered_journal(path: Path, *, since: str | None, dest: Path | None = None) -> Path:
    """Write events matching since-filter to dest (or temp file). Returns path used."""
    if dest is None:
        tmp = tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".jsonl",
            delete=False,
            prefix="qa3_events_since_",
        )
        out_path = Path(tmp.name)
        fh = tmp
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        fh = dest.open("w", encoding="utf-8")
        out_path = dest

    count = 0
    with fh:
        for event in iter_events(path, since=since, exclusive=True):
            fh.write(json.dumps(event, ensure_ascii=False) + "\n")
            count += 1

    return out_path


def event_count_since(path: Path, since: str | None) -> int:
    if since is None:
        return scan_journal(path).get("events_parsed_count", 0)
    return sum(1 for _ in iter_events(path, since=since, exclusive=True))
