from app.features.thought_leadership.services.edit_content.risk.risk_words_loader import (
    build_risk_words_instruction,
)


def get_brand_editor_prompt_rule(include_risk_words: bool = True) -> str:
    """
    Return the brand editor prompt rule. When brand editor is used, call this
    to get the rule with risk words dictionary injected (same loader as edit_content).
    """
    if include_risk_words:
        risk_instruction = build_risk_words_instruction()
        return BRAND_EDITOR_PROMPT_RULE.replace(
            "{risk_words_instruction}", f"{risk_instruction}\n"
        )
    return BRAND_EDITOR_PROMPT_RULE.replace("{risk_words_instruction}", "")
