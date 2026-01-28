elif match_type == 'url':
            # Get the full matched URL (may include trailing punctuation)
            full_match = match.group(0)
            # Strip trailing punctuation for the actual URL, but keep it for advancing position
            url = full_match.rstrip('.,;:)')
            add_hyperlink(paragraph, url, url)
            # Advance position by full match length (including punctuation) so it's not processed again
            pos = match_pos + len(full_match)
