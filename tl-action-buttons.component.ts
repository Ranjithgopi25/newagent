============================================================
CITATION LINK FORMAT CONVERSION — MANDATORY
============================================================

CRITICAL: You MUST convert ALL markdown links to the required format: Title as plain text (NO brackets), URL in square brackets ONLY.

CONVERSION RULES — ABSOLUTE:
- Convert markdown links `[Title](URL)` to format: `Title [URL]`
- Convert backend format `[Title](URL: https://...)` to format: `Title [https://...]`
- Extract the URL from parentheses and place it in square brackets `[URL]` after the title
- Keep the title as plain text with NO brackets (remove all square brackets from title)
- Square brackets `[]` are ONLY for URLs (https://... or url), NEVER for titles
- Preserve the full URL exactly as written
- Links can appear ANYWHERE: in citation sections, inline in paragraphs, in lists, etc.

Examples of CORRECT conversion:
- Citation section: `1. [PwC Global CEO Survey](https://www.pwc.com/ceosurvey)` → `1. PwC Global CEO Survey [https://www.pwc.com/ceosurvey]`
- Inline in paragraph: `According to [PwC research](https://www.pwc.com/research), the findings show...` → `According to PwC research [https://www.pwc.com/research], the findings show...`
- Backend format: `[Title](URL: https://example.com)` → `Title [https://example.com]`
- Numbered citation: `1. [Report Title](https://example.com/report)` → `1. Report Title [https://example.com/report]`

Examples of INCORRECT conversion (DO NOT DO THIS):
- `1. PwC Global CEO Survey` (URL removed)
- `According to PwC research, the findings show...` (link removed from paragraph)
- `[https://www.pwc.com/research]` (title removed, only URL remains)
- `1. <a href="https://www.pwc.com/ceosurvey">PwC Global CEO Survey</a>` (converted to HTML)
- `1. PwC Global CEO Survey (https://www.pwc.com/ceosurvey)` (URL in parentheses instead of brackets)
- `1. [PwC Global CEO Survey](https://www.pwc.com/ceosurvey)` (keeping markdown format unchanged)
- `1. [PwC Global CEO Survey] [https://www.pwc.com/ceosurvey]` (title has brackets - WRONG! Titles must be plain text)
- `[Title] [URL]` (both title and URL in brackets - WRONG! Only URL should have brackets)

APPLIES TO ALL LINKS IN THE DOCUMENT:
- Citation sections with headers like "Sources:", "References:", "Bibliography:"
- Numbered citation lists MUST be in order: 1., 2., 3., etc. (sequential; correct format always; number start correct)
- Links inline in paragraphs (middle of sentences)
- Links in headings
- Links in bullet points or lists
- Links anywhere else in the document
- Both standard format `[Title](URL)` and backend format `[Title](URL: https://...)`
