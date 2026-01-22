Copy

Copy

        words_still_over = previous_word_count - target_word_count if previous_word_count else reduction_needed

        intensity_instructions = f"""

COMPRESSION INTENSITY: RETRY #{retry_count} - MAXIMUM COMPRESSION - CRITICAL FAILURE

- Previous attempts were insufficient - you MUST be DRAMATICALLY more aggressive

- Current result: {previous_word_count} words, Target: {target_word_count} words

- You need to remove {words_still_over} MORE words - this is CRITICAL

- Apply MAXIMUM sentence deletion and compression (WITHIN paragraphs only):

  * DELETE 60-80% of sentences from each paragraph - keep only 1-2 core sentences per paragraph

  * DELETE ALL example sentences, case study sentences, supporting detail sentences

  * DELETE ALL transitional sentences, introductory sentences, concluding sentences

  * DELETE ALL sentences that repeat or restate main points

  * Combine remaining 1-2 sentences per paragraph into single ultra-dense sentences

  * Compress every remaining word to absolute minimum

  * Remove ALL qualifiers, modifiers, adjectives, adverbs that aren't essential

  * Compress lists to 1-2 items maximum or remove entirely

  * Use telegraphic style - maximum information density per word

- Do NOT delete entire paragraphs - but DELETE most sentences within them

- Each paragraph should have 1-2 sentences maximum after compression

- Word count target is MANDATORY - you MUST achieve {target_word_count} words

""".format(retry_count=retry_count)

    

    # Build structural requirements - paragraph deletion is NEVER allowed

    structural_requirements = """- Keep ALL paragraphs in their original order

- Do NOT delete entire sections or paragraphs

- Do NOT add new content

- Maintain logical flow and coherence

- Preserve paragraph structure (compress content WITHIN paragraphs only)"""

    

    return [

        {

            "role": "system",

            "content": f"""

You are a senior PwC editorial consultant specializing in content compression.



PRIMARY OBJECTIVES (IN ORDER):

1. Preserve meaning and factual accuracy

2. Preserve structure and paragraph order

3. Achieve EXACTLY {target_word_count} words (NON-NEGOTIABLE)



DOCUMENT CONTEXT:

- Current words: {current_word_count}

- Target words: {target_word_count}

- Reduction needed: {reduction_needed} words

- Reduction percentage: {reduction_percentage:.1f}%

{retry_context}

{intensity_instructions}



COMPRESSION TECHNIQUES (APPLY AS NEEDED):



1. SENTENCE COMBINING & RESTRUCTURING:

   - Combine two or more related sentences into one

   - Merge parallel ideas using semicolons, colons, or conjunctions

   - Convert compound sentences to simple sentences where meaning is preserved

   - Eliminate sentence fragments that repeat information



2. PHRASE TIGHTENING:

   - Replace wordy phrases with concise alternatives:

     * "in order to" → "to"

     * "due to the fact that" → "because"

     * "at this point in time" → "now"

     * "in the event that" → "if"

     * "with regard to" → "regarding" or "about"

   - Remove unnecessary qualifiers: "very", "quite", "rather", "somewhat", "fairly"

   - Eliminate redundant adjectives and adverbs

   - Use active voice instead of passive voice (saves words)



3. ELIMINATE REDUNDANCY:

   - Remove repeated concepts expressed in different words

   - Eliminate restatements of the same idea

   - Remove redundant explanations that don't add new information

   - Cut duplicate examples or similar case studies



4. REMOVE FILLER & TRANSITIONAL PHRASES:

   - Eliminate unnecessary transitions: "furthermore", "moreover", "in addition" (if redundant)

   - Remove hedging language where certainty is appropriate: "may", "might", "could" (when facts are certain)

   - Cut introductory phrases that don't add value: "It is important to note that", "It should be mentioned that"



5. COMPRESS LISTS & ENUMERATIONS:

   - Combine list items where possible

   - Use parallel structure to reduce word count

   - Remove less critical items from lists if needed

   - Convert long lists to concise summaries



6. SUPPORTING DETAIL COMPRESSION:

   - Compress examples to their essential points

   - Remove non-critical background information

   - Tighten case study descriptions to key facts only

   - Eliminate extended explanations of obvious points



7. PARAGRAPH-LEVEL COMPRESSION:

   - Compress WITHIN each paragraph (do NOT delete entire paragraphs)

Copy

Copy

   - For very large reductions (>45%): DELETE 30-50% of sentences from each paragraph

   - For extreme reductions (>55%): DELETE 50-70% of sentences from each paragraph

   - For retries: DELETE 60-80% of sentences from each paragraph

   - Keep only 1-3 core sentences per paragraph that contain essential arguments

   - DELETE entire sentences that are: examples, case studies, supporting details, transitions, repetitions

   - Combine remaining sentences into single dense sentences

   - Tighten every remaining sentence to absolute minimum

   - Maximum compression within each paragraph while preserving all paragraphs (but not all sentences)



PRIORITY GUIDELINES:

- PRESERVE: Core arguments, key facts, main conclusions, essential data points

- COMPRESS AGGRESSIVELY: Supporting examples, background context, transitional phrases, redundant explanations

- REMOVE: Filler words, unnecessary qualifiers, repeated concepts, non-essential details



STRUCTURAL REQUIREMENTS:

{structural_requirements}



WORD COUNT VALIDATION:

Copy

Copy

- You MUST count words in your output BEFORE submitting

- Target is EXACTLY {target_word_count} words (CRITICAL - NOT OPTIONAL)

- Acceptable range: {target_word_count - 5} to {target_word_count + 5} words

Copy

Copy

- Current: {current_word_count} words → Target: {target_word_count} words

- Reduction needed: {reduction_needed} words ({reduction_percentage:.1f}% reduction)

- If current > target: You MUST DELETE more sentences and compress more aggressively

- For {reduction_percentage:.1f}% reduction: You need to remove approximately {int(reduction_percentage * 0.6)}% of sentences

- Count your output words - if over target, compress MORE before finalizing



CRITICAL: Word count is the HIGHEST PRIORITY after preserving meaning. 

- Compress WITHIN paragraphs using all available techniques

- Do NOT delete entire paragraphs or sections - compress content within them

- If you are not meeting the target, you MUST apply more aggressive word-level compression

- Every sentence, phrase, and word must be compressed to maximum efficiency

"""

        },

        {

            "role": "user",

            "content": content,

        },

    ]





# ------------------------------------------------------------

# RESEARCH ENRICHMENT

# ------------------------------------------------------------



def build_research_enrich_prompt(

    content: str,

    pwc_doc: Optional[str],

    market_insights: Optional[str],

) -> List[Dict[str, str]]:

    user_prompt = content



    if pwc_doc:

        user_prompt += f"""



MAIN INSTRUCTIONS:

- Use 80% of content from the market insights when expanding the document.

- Example 1000 words to 1500 then 500 words to be added or expanded. then 80% 500 means 400 words should come from research content.



PWC RESEARCH (PRIMARY SOURCE):

{pwc_doc}

"""



    if market_insights:

        user_prompt += f"""



MARKET INSIGHTS (SECONDARY):

{market_insights}

"""



    return [

        {

            "role": "system",

            "content": """

You are a PwC research-grounded editorial expert.



RULES:

- Strengthen existing arguments ONLY

- Use PwC content FIRST

- Use market insights only to support existing points

- Do NOT add sections

- Do NOT invent facts

"""

        },

        {

            "role": "user",

            "content": user_prompt.strip(),

        },

    ]



