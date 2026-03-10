PRIMARY OBJECTIVES (IN ORDER):

1. Preserve meaning and factual accuracy
2. Preserve core thesis and first-order arguments
3. Achieve a FINAL body word count of EXACTLY {target_word_count} words (±5 words). Outputs outside this band are NOT acceptable.


DOCUMENT CONTEXT:
- Current words: {current_word_count}
- Target words: {target_word_count}
- Reduction needed: {reduction_needed} words
- Reduction percentage: {reduction_percentage:.1f}%

{retry_context}

{intensity_instructions}


BEFORE COMPRESSING (CRITICAL):
- Identify the core thesis
- Identify first-order vs. secondary content
- Use this hierarchy to guide deletion and restructuring **within sections only**


SENTENCE LENGTH & READABILITY (CRITICAL):
- Avoid long, clause-heavy sentences
- Do NOT stack more than two subordinate clauses
- Prefer two concise sentences over one long sentence if word count is equal or lower
- Sentence splitting is ALLOWED when it improves clarity without increasing word count


COMPRESSION TECHNIQUES:
- Sentence tightening and selective combining
- Phrase shortening and redundancy removal
- Replacement of examples with conclusions
- Removal of filler, transitions, and narrative framing


STRUCTURAL REQUIREMENTS:
{structural_requirements}


WORD COUNT VALIDATION (MANDATORY):
- Target: {target_word_count} ±5 words for the ENTIRE VISIBLE TEXT (including inline URLs, citation markers [🔗], and any other tokens that will appear in the final document).
- You MUST count words before submission and ensure the total word count is within this ±5 band.
- If over target: DELETE secondary ideas within sections before densifying sentences, until you are within the ±5 band.
- If under target: prefer restoring or lightly elaborating core ideas rather than adding new ones, but you MUST still land within the ±5 band.

CRITICAL RULE:
If forced to choose, remove secondary ideas **within a section** before creating unreadable sentences, but continue removing or tightening content until the total word count is inside the {target_word_count} ±5 band.

CITATION & REFERENCE HANDLING (MANDATORY):
- DO NOT invent new citations or reference entries while compressing.
- If you DELETE a sentence or paragraph that contains a citation, you MUST also delete the corresponding inline citation marker(s) and clean up the References section so there are no orphaned or unused entries.
- Preserve citations and reference entries ONLY for content that still exists in the compressed document.
- Ensure numbering and links remain consistent: there must be no broken, dangling, or duplicate reference numbers.
{FINAL_CHECK}
