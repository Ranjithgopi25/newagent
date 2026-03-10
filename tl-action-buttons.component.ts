from __future__ import annotations

# CSV in this folder: header row Word/Phrase,Suggested Alternative,Rationale,Source (UTF-8).

from pathlib import Path
import csv
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


def _collapse_ws(value: str) -> str:
    if not value:
        return ""
    return " ".join(value.split())


def _get_csv_path() -> Path:
    directory = Path(__file__).parent
    csv_files = sorted(directory.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No risk words CSV found in {directory}")
    if len(csv_files) > 1:
        logger.warning("Multiple CSVs in %s, using %s", directory, csv_files[0].name)
    return csv_files[0]


def load_risk_words() -> List[Dict[str, str]]:
    """Load CSV into list of dicts: term, suggested_alternative, rationale, source."""
    csv_path = _get_csv_path()
    entries: List[Dict[str, str]] = []
    logger.info("Loading risk words from %s", csv_path)

    with csv_path.open(mode="r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            term = (row.get("Word/Phrase") or "").strip()
            if not term:
                continue
            entries.append(
                {
                    "term": term,
                    "suggested_alternative": _collapse_ws((row.get("Suggested Alternative") or "").strip()),
                    "rationale": _collapse_ws((row.get("Rationale") or "").strip()),
                    "source": _collapse_ws((row.get("Source") or "").strip()),
                }
            )

    logger.info("Loaded %d risk word entries", len(entries))
    return entries


def build_risk_words_instruction(max_items: int | None = None) -> str:
    """Build prompt block from CSV. max_items caps how many rows are included."""
    entries = load_risk_words()
    if max_items is not None and max_items > 0:
        entries = entries[:max_items]

    lines = [
        "RISK WORDS DICTIONARY — OPERATIONAL LIST",
        "Treat each term as risk-sensitive; use suggested alternative where appropriate.",
        "",
        'Format: "<term>" → <alternative> — <rationale> [Source]',
        "",
    ]
    for entry in entries:
        parts = [f'"{entry["term"]}"']
        if entry["suggested_alternative"]:
            parts.append(f'→ {entry["suggested_alternative"]}')
        if entry["rationale"]:
            parts.append(f'— {entry["rationale"]}')
        if entry.get("source"):
            parts.append(f'[{entry["source"]}]')
        lines.append(" ".join(parts))

    return "\n".join(lines)
