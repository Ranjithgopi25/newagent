/**
 * Shared utility functions for Edit Content workflow
 * Ensures deterministic results across Quick Start and Guided Journey flows
 * 
 * NOTE: EDITOR_ORDER and EDITOR_NAME_MAP must match backend constants in
 * edit_content_service.py for consistent behavior between frontend and backend
 */
import { environment } from "../../../environments/environment";
// Editor processing order (must match backend EDITOR_ORDER in edit_content_service.py)
export const EDITOR_ORDER = ['development', 'content', 'line', 'copy', 'brand-alignment'] as const;

export type EditorType = 'development' | 'content' | 'line' | 'copy' | 'brand-alignment';

/**
 * Normalize editor IDs to ensure consistent ordering for deterministic results.
 * Ensures brand-alignment is always included and editors are in the correct order.
 * 
 * @param editorIds - Array of editor IDs to normalize
 * @returns Normalized array of editor IDs in EDITOR_ORDER sequence
 */
export function normalizeEditorOrder(editorIds: string[]): string[] {
  // Create a copy to avoid mutating the input
  let normalized = [...editorIds];
  
  // Ensure brand-alignment is always included
  if (!normalized.includes('brand-alignment')) {
    normalized.push('brand-alignment');
  }
  
  // Filter and order according to EDITOR_ORDER for deterministic results
  return EDITOR_ORDER.filter(editor => normalized.includes(editor));
}

/**
 * Normalize content text to ensure consistent processing.
 * Trims whitespace and normalizes line endings.
 * 
 * @param content - Content text to normalize
 * @returns Normalized content text
 */
export function normalizeContent(content: string): string {
  if (!content) {
    return '';
  }
  
  // Trim leading/trailing whitespace
  let normalized = content.trim();
  
  // Normalize line endings to \n (Unix-style)
  normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove trailing whitespace from each line (but preserve structure)
  // This ensures consistent processing without changing content meaning
  normalized = normalized.split('\n')
    .map(line => line.trimEnd())
    .join('\n');
  
  return normalized;
}

/**
 * Compute a simple hash of content for verification purposes.
 * Used to verify identical inputs are being processed.
 * 
 * @param content - Content to hash
 * @returns Hash string
 */
export function hashContent(content: string): string {
  if (!content) {
    return 'empty';
  }
  
  // Simple hash function for verification
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Extract document title from content.
 * Checks for H1 heading first, then first line if it looks like a title,
 * otherwise falls back to filename.
 * 
 * @param content - Document content text
 * @param filename - Optional filename to use as fallback
 * @returns Extracted title
 */
export function extractDocumentTitle(content: string, filename?: string): string {
  if (!content || !content.trim()) {
    // Fallback to filename if no content
    if (filename) {
      return filename.replace(/\.[^/.]+$/, '').trim();
    }
    return 'Revised Article';
  }

  const normalizedContent = normalizeContent(content);
  const lines = normalizedContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length === 0) {
    // Fallback to filename if no content lines
    if (filename) {
      return filename.replace(/\.[^/.]+$/, '').trim();
    }
    return 'Revised Article';
  }

  // Check for H1 heading at the start (# Title)
  const firstLine = lines[0];
  const h1Match = firstLine.match(/^#\s+(.+)$/);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim();
  }

  // Check if first line looks like a title
  // Criteria: short (less than 100 chars), starts with capital, no ending punctuation (except ? or !)
  if (firstLine.length > 0 && firstLine.length < 100) {
    const firstChar = firstLine[0];
    const lastChar = firstLine[firstLine.length - 1];
    
    // Check if starts with capital letter or number
    const startsWithCapital = /^[A-Z0-9]/.test(firstChar);
    
    // Check if doesn't end with period, comma, or semicolon (but allow ? or !)
    const endsWithPunctuation = /[.,;]$/.test(lastChar);
    
    // Check if it's not a list item or code block
    const isListItem = /^[-*+\d.]\s/.test(firstLine);
    const isCodeBlock = firstLine.startsWith('```') || firstLine.startsWith('`');
    
    if (startsWithCapital && !endsWithPunctuation && !isListItem && !isCodeBlock) {
      return firstLine;
    }
  }

  // Fallback to filename
  if (filename) {
    return filename.replace(/\.[^/.]+$/, '').trim();
  }

  return 'Revised Article';
}

/**
 * Extract title from block_types where type is "title".
 * This matches how guided journey handles titles (using block type "title" as page 1).
 * 
 * @param content - The article content (plain text with "\n\n" separators)
 * @param blockTypes - Array of block type information with index, type, and optional level
 * @param fallbackFilename - Optional filename to use as fallback if no title block found
 * @returns Extracted title from block_types, or fallback title
 */
export function extractTitleFromBlockTypes(
  content: string,
  blockTypes: BlockTypeInfo[],
  fallbackFilename?: string
): string {
  if (!blockTypes || blockTypes.length === 0) {
    // Fallback to extractDocumentTitle if no block_types
    return extractDocumentTitle(content, fallbackFilename);
  }

  // Split content into paragraphs (assuming double newline separation)
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  
  // Find the first block with type "title"
  for (let i = 0; i < blockTypes.length && i < paragraphs.length; i++) {
    const blockType = blockTypes[i];
    if (blockType.type === 'title') {
      // Extract title from the corresponding paragraph
      const titleText = paragraphs[i].trim();
      // Remove markdown formatting and number prefixes
      const cleanTitle = titleText
        .replace(/^#+\s*/, '')  // Remove markdown heading markers
        .replace(/^\d+[.)]\s*/, '')  // Remove number prefixes
        .replace(/\*+/g, '')  // Remove bold/italic markers
        .trim();
      
      if (cleanTitle) {
        return cleanTitle;
      }
    }
  }
  
  // Fallback to extractDocumentTitle if no title block found
  return extractDocumentTitle(content, fallbackFilename);
}

/** Editor name mapping (must match backend EDITOR_NAMES in edit_content_service.py) */
const EDITOR_NAME_MAP: { [key: string]: string } = {
  'development': 'Development Editor',
  'content': 'Content Editor',
  'line': 'Line Editor',
  'copy': 'Copy Editor',
  'brand-alignment': 'PwC Brand Alignment Editor'
};

/** Get editor display name by ID */
export function getEditorDisplayName(editorId: string): string {
  return EDITOR_NAME_MAP[editorId] || editorId;
}

/** Format markdown text to HTML for basic formatting (bold, italic, line breaks) */
export function formatMarkdown(text: string): string {
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

/** Convert markdown text to HTML with proper formatting for headings, lists, paragraphs, etc. */
export function convertMarkdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '';
  }

  let html = markdown;

  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    const unorderedMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);

    if (unorderedMatch) {
      if (!inUnorderedList) {
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        processedLines.push('<ul>');
        inUnorderedList = true;
      }
      processedLines.push(`<li>${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (!inOrderedList) {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        processedLines.push('<ol>');
        inOrderedList = true;
      }
      processedLines.push(`<li>${orderedMatch[1]}</li>`);
    } else {
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }

      if (trimmedLine) {
        if (trimmedLine.startsWith('<')) {
          processedLines.push(line);
        } else {
          processedLines.push(`<p>${trimmedLine}</p>`);
        }
      } else {
        processedLines.push('');
      }
    }
  }

  if (inUnorderedList) {
    processedLines.push('</ul>');
  }
  if (inOrderedList) {
    processedLines.push('</ol>');
  }

  html = processedLines.join('\n');
  html = html.replace(/(<p><\/p>\n?)+/g, '<p></p>');
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

/** 
 * Extract text from uploaded file
 * Note: This uses fetch() without auth headers. For authenticated requests,
 * callers should use their injected HttpClient or AuthFetchService instead.
 * This function is kept for backward compatibility but may not work if
 * backend requires authentication.
 * 
 * @deprecated Use HttpClient or AuthFetchService in components/services instead
 */
export async function extractFileText(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
  
  // Get auth token if available (for non-Angular contexts)
  const headers: HeadersInit = {};
  
  // Try to get token from sessionStorage (MSAL stores it there)
  // This is a workaround since we can't inject AuthService in a utility function
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.sessionStorage) {
      // Look for MSAL tokens in sessionStorage
      // MSAL stores tokens with keys like: "<clientId>.<tenantId>.<idtoken/accesstoken>"
      const keys = Object.keys(sessionStorage);
      const idTokenKey = keys.find(key => 
        key.includes('idtoken') && 
        key.includes(environment.clientId || '')
      );
      
      if (idTokenKey) {
        const tokenData = sessionStorage.getItem(idTokenKey);
        if (tokenData) {
          try {
            const parsed = JSON.parse(tokenData);
            const secret = parsed.secret;
            if (secret) {
              headers['Authorization'] = `Bearer ${secret}`;
              console.log('[extractFileText] Added auth token from sessionStorage');
            }
          } catch (e) {
            console.warn('[extractFileText] Failed to parse token from sessionStorage:', e);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[extractFileText] Failed to get auth token:', e);
  }
  
  const response = await fetch(`${apiUrl}/api/v1/export/extract-text`, {
    method: 'POST',
    headers: headers,
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Failed to extract text from file');
  }
  
  const data = await response.json();
  return data.text || '';
}

export interface EditorialFeedbackItem {
  issue: string;
  rule?: string;
  impact?: string;
  fix?: string;
  priority?: string;
}

/**
 * Parse editorial feedback text into structured items.
 * Handles lines that start with "- Issue:", "- Rule:", "- Impact:", "- Fix:", "- Priority:".
 */
export function parseEditorialFeedback(text: string): EditorialFeedbackItem[] {
  if (!text) return [];

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  const items: EditorialFeedbackItem[] = [];
  let current: EditorialFeedbackItem | null = null;

  const stripQuotes = (s: string) => s.trim().replace(/^["“]+|["”]+$/g, '').trim();

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const issueMatch = line.match(/^-+\s*\*{0,2}Issue\*{0,2}:\s*(.*)/i);
    const ruleMatch = line.match(/^-+\s*\*{0,2}Rule\*{0,2}:\s*(.*)/i);
    const impactMatch = line.match(/^-+\s*\*{0,2}Impact\*{0,2}:\s*(.*)/i);
    const fixMatch = line.match(/^-+\s*\*{0,2}Fix\*{0,2}:\s*(.*)/i);
    const priorityMatch = line.match(/^-+\s*\*{0,2}Priority\*{0,2}:\s*(.*)/i);

    if (issueMatch) {
      // push previous
      if (current) items.push(current);
      current = { issue: stripQuotes(issueMatch[1] || '') };
      continue;
    }

    if (!current) {
      // ignore lines outside an issue block
      continue;
    }

    if (ruleMatch) {
      current.rule = ruleMatch[1].trim();
      continue;
    }
    if (impactMatch) {
      current.impact = impactMatch[1].trim();
      continue;
    }
    if (fixMatch) {
      current.fix = fixMatch[1].trim();
      continue;
    }
    if (priorityMatch) {
      current.priority = priorityMatch[1].trim();
      continue;
    }

    // If line starts with '-' but no recognized label, try to append to last field (fix or impact)
    const dashContent = line.replace(/^-+\s*/, '');
    if (dashContent) {
      // prefer appending to fix > impact > rule
      if (current.fix) current.fix += ' ' + dashContent;
      else if (current.impact) current.impact += ' ' + dashContent;
      else if (current.rule) current.rule += ' ' + dashContent;
    }
  }

  if (current) items.push(current);
  return items;
}

/**
 * Render editorial feedback items into a simple HTML string (escaped).
 * Use ngFor in templates if possible instead of innerHTML.
 */
export function renderEditorialFeedbackHtml(items: EditorialFeedbackItem[]): string {
  if (!items || items.length === 0) return '';

  const esc = (s?: string) =>
    (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const cards = items.map(it => {
    const badge = it.priority ? `<span class="ef-priority">${esc(it.priority)}</span>` : '';
    return `
      <div class="ef-card">
        <div class="ef-header">
          <div class="ef-issue">${esc(it.issue)}</div>
          ${badge}
        </div>
        <div class="ef-body">
          ${it.rule ? `<div class="ef-row"><strong>Rule:</strong> ${esc(it.rule)}</div>` : ''}
          ${it.impact ? `<div class="ef-row"><strong>Impact:</strong> ${esc(it.impact)}</div>` : ''}
          ${it.fix ? `<div class="ef-row"><strong>Fix:</strong> ${esc(it.fix)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('\n');

  return `<div class="ef-container">${cards}</div>`;
}


/**
 * Block type information for formatting
 */
export interface BlockTypeInfo {
  index: number;
  type: string;
  level?: number;
}


/**
 * Format final article with block type information to produce semantic HTML.
 * Groups consecutive bullet_item blocks into proper <ul> or <ol> lists.
 * 
 * @param article - The article content (markdown or plain text)
 * @param blockTypes - Array of block type information with index, type, and optional level
 * @returns Formatted HTML with proper semantic structure
 */
export function formatFinalArticleWithBlockTypes(
  article: string, 
  blockTypes: BlockTypeInfo[]
): string {
  if (!blockTypes || blockTypes.length === 0) {
    // If no block types, just convert markdown to HTML
    return convertMarkdownToHtml(article);
  }

  // Split article into paragraphs (assuming double newline separation)
  const paragraphs = article.split(/\n\n+/);
  
  // Create a map of index to block type
  const blockTypeMap = new Map<number, {type: string, level?: number}>();
  blockTypes.forEach(bt => {
    blockTypeMap.set(bt.index, {type: bt.type, level: bt.level});
  });

  // First pass: format individual paragraphs
  interface ParagraphBlock {
    type: string;
    content: string;
    level: number;
    rawContent?: string;
    isNumberedList?: boolean; // Track if numbered list (for HTML tag selection)
    isBulletList?: boolean; // Track if bullet list (for HTML tag selection)
  }

  const formattedParagraphs = paragraphs
    .map((para, idx): ParagraphBlock | null => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null; // Filter out empty paragraphs

      const blockInfo = blockTypeMap.get(idx);
      if (!blockInfo) {
        // Default to paragraph if no block type info
        const formatted = convertMarkdownToHtml(trimmedPara);
        const content = formatted.startsWith('<') ? formatted : `<p>${formatted}</p>`;
        return {
          type: 'paragraph',
          content: content,
          level: 0
        };
      }

      // Convert markdown in the paragraph first
      let formatted = convertMarkdownToHtml(trimmedPara);
      
      // Remove wrapping <p> tags if they exist at the start/end (we'll add our own based on block type)
      // Only remove if the entire content is wrapped in a single <p> tag
      formatted = formatted.replace(/^<p>(.*)<\/p>$/s, '$1');

      // Apply block type formatting (matches backend export formatting)
      switch (blockInfo.type) {
        case 'title':
          // Title: 24pt font (matches PDF), bold, center aligned, spacing matches backend
          // Note: Title is typically on cover page in export, but for UI display we show it
          return {
            type: 'title',
            content: `<h1 style="font-size: 24pt; font-weight: 700; font-family: 'Helvetica', 'Arial', sans-serif; display: block; margin-top: 1.25em; margin-bottom: 0.35em; text-align: center; color: #D04A02;">${formatted}</h1>`,
            level: 0
          };
        
        case 'heading':
          // Heading: 14pt font, bold (Helvetica-Bold), black, spacing matches backend (0.9em top, 0.2em bottom)
          const headingLevel = blockInfo.level || 1;
          const headingTag = `h${Math.min(Math.max(headingLevel, 1), 6)}`;
          return {
            type: 'heading',
            content: `<${headingTag} style="font-size: 14pt; font-weight: 700; font-family: 'Helvetica-Bold', 'Arial Bold', sans-serif; display: block; margin-top: 0.9em; margin-bottom: 0.2em; color: #000000;">${formatted}</${headingTag}>`,
            level: headingLevel
          };
        
        case 'bullet_item':
          // Preserve backend content exactly - just convert markdown to HTML
          // Backend LLM already handles numbering order correctly (1, 2, 3, 4, 5)
          // Do NOT extract or modify prefixes - preserve backend formatting exactly
          
          // Simple detection for list type (for HTML tag selection only, not content modification)
          const isNumberedList = /^\d+[.)]\s/.test(trimmedPara);
          const isBulletList = /^[•\-\*]\s/.test(trimmedPara);
          
          // Convert markdown to HTML, preserving backend's exact formatting
          let processedContent = convertMarkdownToHtml(trimmedPara);
          
          // Remove wrapping <p> tags if present (we'll wrap in list structure)
          processedContent = processedContent.replace(/^<p>(.*)<\/p>$/s, '$1');
          
          // Format text before ":" as bold, after ":" as normal (if colon exists)
          // But preserve the entire content structure from backend
          const colonIndex = trimmedPara.indexOf(':');
          if (colonIndex > 0) {
            // Split at colon position in original text
            const beforeColon = trimmedPara.substring(0, colonIndex).trim();
            const afterColon = trimmedPara.substring(colonIndex + 1).trim();
            
            // Convert markdown in both parts
            let beforeFormatted = convertMarkdownToHtml(beforeColon);
            let afterFormatted = convertMarkdownToHtml(afterColon);
            
            // Remove any existing <p> tags
            beforeFormatted = beforeFormatted.replace(/^<p>(.*)<\/p>$/s, '$1');
            afterFormatted = afterFormatted.replace(/^<p>(.*)<\/p>$/s, '$1');
            
            // Reconstruct with bold formatting, preserving original prefix/numbering from backend
            // Extract just the prefix part (number/bullet) from beforeColon to preserve it
            const prefixMatch = beforeColon.match(/^(\d+[.)]\s*|[A-Za-z][.)]\s*|[ivxlcdmIVXLCDM]+[.)]\s*|[•\-\*]\s*)/i);
            const prefix = prefixMatch ? prefixMatch[1] : '';
            const labelText = prefixMatch ? beforeColon.substring(prefixMatch[0].length).trim() : beforeColon;
            
            const labelFormatted = convertMarkdownToHtml(labelText).replace(/^<p>(.*)<\/p>$/s, '$1');
            processedContent = `${prefix}<strong>${labelFormatted}</strong>: ${afterFormatted}`;
          }
          
          return {
            type: 'bullet_item',
            content: processedContent,
            level: blockInfo.level || 0,
            rawContent: trimmedPara, // Store raw content for tracking
            isNumberedList: isNumberedList, // Track if numbered for HTML tag selection
            isBulletList: isBulletList // Track if bullet for HTML tag selection
          };
        
        case 'paragraph':
        default:
          // Paragraph: 11pt font, line-height 1.5 (matches backend), justify alignment, reduced spacing for tighter layout
          // margin-top: 0.15em (2pt), margin-bottom: 0.4em (4-5pt) - reduced from 0.7em for tighter spacing
          return {
            type: 'paragraph',
            content: `<p style="font-size: 11pt; font-family: 'Helvetica', 'Arial', sans-serif; display: block; text-align: justify; margin-top: 0.15em; margin-bottom: 0.4em; line-height: 1.5;">${formatted}</p>`,
            level: 0
          };
      }
    })
    .filter((para): para is ParagraphBlock => para !== null);

  // Second pass: group consecutive bullet_item blocks into lists
  // Use <ol> for numbered lists, <ul> for bullet lists - preserve backend formatting exactly
  const finalOutput: string[] = [];
  let currentList: Array<{content: string, level: number, rawContent: string, isNumberedList?: boolean, isBulletList?: boolean}> = [];
  let prevBlockType: string | null = null;
  let prevBlockIndex: number = -1;

  for (let i = 0; i < formattedParagraphs.length; i++) {
    const para = formattedParagraphs[i];
    const nextPara = i < formattedParagraphs.length - 1 ? formattedParagraphs[i + 1] : null;
    
    if (para.type === 'bullet_item') {
      // Add to current list
      currentList.push({
        content: para.content,
        level: para.level,
        rawContent: para.rawContent || '',
        isNumberedList: para.isNumberedList,
        isBulletList: para.isBulletList
      });
      prevBlockType = 'bullet_item';
      prevBlockIndex = i;
    } else {
      // Close any open list before processing non-list item
      if (currentList.length > 0) {
        // Determine spacing: matches backend export (0.25em/3pt if following paragraph, 0.5em/6pt otherwise)
        const listMarginTop = prevBlockType === 'paragraph' ? '0.25em' : '0.5em';
        const listMarginBottom = nextPara && nextPara.type === 'paragraph' ? '0.25em' : '0.5em';
        
        // Determine list type from first item (numbered or bullet)
        // Backend already has correct numbering order - preserve it exactly
        const firstItem = currentList[0];
        const isNumbered = firstItem.isNumberedList === true;
        const listTag = isNumbered ? 'ol' : 'ul';
        
        // For numbered lists, use list-style-type: none since numbers are already in content from backend
        // For bullet lists, also use none since bullets are in content
        const listStyleType = 'none';
        
        // Font size: 11pt (matches paragraph font size), left indent: 12pt (0.5em)
        finalOutput.push(`<${listTag} style="font-size: 11pt; font-family: 'Helvetica', 'Arial', sans-serif; list-style-type: ${listStyleType}; padding-left: 1.5em; margin-top: ${listMarginTop}; margin-bottom: ${listMarginBottom}; line-height: 1.5;">`);
        currentList.forEach(item => {
          finalOutput.push(`<li style="display: list-item; margin: 0.375em 0;">${item.content}</li>`);
        });
        finalOutput.push(`</${listTag}>`);
        currentList = [];
      }

      // Adjust paragraph margins based on context (matches backend export)
      if (para.type === 'paragraph') {
        // Reduce bottom margin if followed by bullet list (0.25em/3pt matches backend)
        if (nextPara && nextPara.type === 'bullet_item') {
          para.content = para.content.replace(/margin-bottom:\s*[^;]+;?/g, 'margin-bottom: 0.25em;');
        }
        // Reduce top margin if following heading - decrease line spacing between heading and paragraph
        if (prevBlockType === 'heading') {
          para.content = para.content.replace(/margin-top:\s*[^;]+;?/g, 'margin-top: 0.05em;');
        }
      }

      // Add non-list paragraph
      finalOutput.push(para.content);
      prevBlockType = para.type;
      prevBlockIndex = i;
    }
  }

  // Close any remaining open list
  if (currentList.length > 0) {
    // Determine spacing: matches backend export
    const listMarginTop = prevBlockType === 'paragraph' ? '0.25em' : '0.5em';
    
    // Determine list type from first item (numbered or bullet)
    // Backend already has correct numbering order - preserve it exactly
    const firstItem = currentList[0];
    const isNumbered = firstItem.isNumberedList === true;
    const listTag = isNumbered ? 'ol' : 'ul';
    
    // For numbered lists, use list-style-type: none since numbers are already in content from backend
    // For bullet lists, also use none since bullets are in content
    const listStyleType = 'none';
    
    // Font size: 11pt (matches paragraph font size), left indent: 12pt (0.5em)
    finalOutput.push(`<${listTag} style="font-size: 11pt; font-family: 'Helvetica', 'Arial', sans-serif; list-style-type: ${listStyleType}; padding-left: 1.5em; margin-top: ${listMarginTop}; margin-bottom: 0.5em; line-height: 1.5;">`);
    currentList.forEach(item => {
      finalOutput.push(`<li style="display: list-item; margin: 0.375em 0;">${item.content}</li>`);
    });
    finalOutput.push(`</${listTag}>`);
  }

  return finalOutput.join('\n');
}
