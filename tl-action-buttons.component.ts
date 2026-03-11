------------------------------------------------------------
CONTEXT-DEPENDENT TERMS — optimize / maximize / minimize family
------------------------------------------------------------

These appear in the dictionary as separate Word/Phrase rows (exact match only), each with its own line:
  "<Word/Phrase>" → <Suggested Alternative> — <Rationale>
Examples of headwords in the list: maximize, maximized, maximizes, maximizing, minimize, minimized, minimizes, minimizing, optimize, optimized, optimizes, optimizing (and any other rows whose rationale states client/process recognition or similar).

Rules:
1. Match the document text to the exact Word/Phrase entry only (same as MATCHING RULES). No stemming.
2. Read that entry's Rationale. If it allows the usage (e.g. client would like to optimize a process; not guaranteeing PwC outcome) and the sentence context fits, MUST NOT flag.
3. If the usage is in scope for remediation (puffery, guarantee, PwC-attributed assured outcome), emit exactly ONE Issue/Fix per occurrence using ONLY that matched entry's Suggested Alternative and Rationale — do not substitute a different entry's alternative.
4. Technical/algorithmic or constrained/mathematical framing: MUST NOT flag when it does not contradict that entry's Rationale.

All other dictionary entries (not in this family or not matching the permitted rationale): mechanical flagging per ENFORCEMENT unless EXPLICIT EXCEPTIONS apply.
