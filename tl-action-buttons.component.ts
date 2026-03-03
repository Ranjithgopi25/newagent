from pathlib import Path
import csv
import logging


logger = logging.getLogger(__name__)

RISK_WORDS_CSV_FILENAME = "Unified_Risk_Words_Dictionary_exact_plus_inflections.csv"


def load_risk_words():
    csv_path = Path(__file__).with_name(RISK_WORDS_CSV_FILENAME)
    entries = []

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
    entries = load_risk_words()

    if max_items:
        entries = entries[:max_items]

    lines = [
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

