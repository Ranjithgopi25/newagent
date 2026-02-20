 # Take suggested_text from both: result1 first, then result2, else original
        suggested_text = (blk1.suggested_text if blk1 and blk1.suggested_text else "") or (
            blk2.suggested_text if blk2 and blk2.suggested_text else ""
        ) or original_text
