from __future__ import annotations

from pathlib import Path
import csv
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


def _get_csv_path() -> Path:
    """
    Locate the risk words CSV in this directory without hard-coding its name.

    Assumes one primary CSV file lives next to this module. If multiple CSV files
    exist, the first in sorted order is used and a warning is logged.
    """
    directory = Path(__file__).parent
    csv_files = sorted(directory.glob("*.csv"))

    if not csv_files:
        msg = f"No risk words CSV found in {directory}"
        logger.error(msg)
        raise FileNotFoundError(msg)

    if len(csv_files) > 1:
        logger.warning("Multiple CSV files found in %s, using %s",directory,csv_files[0].name,)
    return csv_files[0]


def load_risk_words() -> List[Dict[str, str]]:
    """
    Load risk words from the CSV into a list of dicts:

    {
        "term": str,
        "suggested_alternative": str,
        "rationale": str,
    }
    """
    csv_path = _get_csv_path()
    entries: List[Dict[str, str]] = []

    logger.info("Loading risk words from %s", csv_path)

    with csv_path.open(mode="r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            term = (row.get("Word/Phrase") or "").strip()
            if not term:
                continue

            alt = (row.get("Suggested Alternative") or "").strip()
            rationale = (row.get("Rationale") or "").strip()

            entries.append(
                {
                    "term": term,
                    "suggested_alternative": " ".join(alt.split()) if alt else "",
                    "rationale": " ".join(rationale.split()) if rationale else "",
                }
            )

    logger.info("Loaded %d risk word entries", len(entries))
    return entries


def build_risk_words_instruction(max_items: int = 80) -> str:
    """
    Build the text block injected into the brand prompt from the loaded entries.
    """
    entries = load_risk_words()

    if max_items:
        entries = entries[:max_items]

    lines: List[str] = [
        "RISK WORDS DICTIONARY — OPERATIONAL LIST",
        (
            "You MUST treat the following terms as risk-sensitive. When you "
            "encounter them, prefer the suggested alternative phrasing where it "
            "does not change meaning or introduce guarantees."
        ),
        "",
        'Format: "<term>" → <suggested alternative> — <rationale (if provided)>',
        "",
    ]

    for entry in entries:
        parts = [f'"{entry["term"]}"']
        if entry["suggested_alternative"]:
            parts.append(f'→ {entry["suggested_alternative"]}')
        if entry["rationale"]:
            parts.append(f'— {entry["rationale"]}')
        lines.append(" ".join(parts))

    return "\n".join(lines)
