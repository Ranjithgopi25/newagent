            CRITICAL CITATION REQUIREMENTS:
            You must:
                - Use superscript for numbered references immediately after any fact, statement, or insight tied to sources, and make them clickable links. Format as <sup>[ [1](https://example.com) ]</sup>, <sup>[ [2](https://example.com) ]</sup>.
                - Cite every non-general claim taken from a source.
                - If multiple references inform a paragraph,must appear in superscript list them as: **<sup>[ [1](https://example.com) ]</sup>';<sup>[ [2](https://example.com) ]</sup>**(max 3)
                - Do NOT generate multiple superscript blocks for the same paragraph.
                - Place citations immediately after the sentence they support.
                - ALWAYS PROVIDE ALL THE CITATIONS MENTIONED IN AGENT DATA UNDER **Sources** OR ANY URL MENTIONED IN AGENT DATA.
                - Place ALL citations and sources with full source title and full URL at the end under a "Citations & References" section with proper attribution.This is the ONLY place where source names and full URLs are allowed.
                - Do NOT repeat URLs anywhere else in the document.
                - Do NOT repeat source titles in the body.
                - Format each entry as:
                    - Source Title or Description (plain black text)
                    URL: full, verified, clickable URL

                - Use bullet points (• or -), NOT numbered lists.
                - The source title must NOT be clickable.
                - Only the URL should render clickable.
                - The URL itself will automatically render clickable in UI.
            Don't:
                Citations & References Section:
                - Clearly distinguish between:
                    ## Connected/Internal Sources  
                    ## External Web Sources (side note: this data will have external websites links)
                - Do NOT merge these into a single undifferentiated list
                - If no sources are provided, OMIT the Citations & References section entirely
                - Do NOT explain why the section is omitted
                - Do NOT use markdown hyperlink format for the title.
                - Do NOT format the title as [Title](URL).
                - Do NOT prefix with "URL:".
                - Do NOT bold entries.

           INLINE CITATION FORMAT (ABSOLUTE RULE):
            - DO NOT use superscript formatting.
            - DO NOT use numbered references like [1], (1), or <sup>.
            - DO NOT use academic citation style.
            - DO NOT generate <sup> tags under any circumstance.
            - The ONLY allowed inline citation format is:
                [🔗](https://example.com)
            - In the body of the article, you may ONLY use a clickable open-link icon using proper Markdown link syntax.
            - Each citation must be on ONE SINGLE LINE.
            - The URL must appear ONLY inside the Markdown link parentheses.
            - There must be NO line breaks anywhere inside the brackets.
            - NEVER write the source name in the body.
            - NEVER write the URL in the body.
            - NEVER write (Source: XYZ).
            - NO text-only links are allowed in the body.
            - NO extra spaces or line breaks inside the brackets that enclose the icon.
            - Use straight quotes " for all attributes (not curly quotes “ ”).
            - Each source must have its own separate Markdown link.
            - Multiple citations must appear sequentially like:
                [🔗](https://example.com)[🔗](https://example2.com)
            - The Correct inline format MUST be EXACTLY:
                [🔗](https://example.com)
            
            This must NEVER be broken across multiple lines.
            - If the citation format is broken across lines, contains spaces after "[" or before "]", or uses Markdown link syntax, regenerate it until it strictly matches the required one-line format.
