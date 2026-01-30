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

  // Links:
  // - Standard markdown: [text](https://example.com)
  // - Backend citation variant: [Title](URL: https://example.com)
  //   If we don't strip "URL:", the href becomes invalid ("URL: https://...").
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, rawHref) => {
    const textRaw = String(linkText ?? '');
    const hrefRaw = String(rawHref ?? '').trim();

    // Minimal escaping to avoid breaking attributes / HTML structure.
    // Note: this utility already does simplistic markdown->HTML transforms elsewhere.
    const escHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escAttr = (s: string) => escHtml(s).replace(/"/g, '&quot;');
    const text = escHtml(textRaw);

    // Citation-style link: add class for blue, underlined styling (PDF-like)
    const isCitationStyle = /^url:\s*https?:\/\//i.test(hrefRaw) || /^\d+$/.test(textRaw.trim());

    // Handle "(URL: https://...)" (case-insensitive)
    const citationUrlMatch = hrefRaw.match(/^url:\s*(https?:\/\/\S+)\s*$/i);
    if (citationUrlMatch && citationUrlMatch[1]) {
      const url = citationUrlMatch[1];
      const urlAttr = escAttr(url);
      const urlText = escHtml(url);
      const linkClass = ' class="citation-link"';
      return `<a href="${urlAttr}"${linkClass} target="_blank" rel="noopener noreferrer">${text}</a> <span class="citation-inline-url">(<a href="${urlAttr}"${linkClass} target="_blank" rel="noopener noreferrer">${urlText}</a>)</span>`;
    }

    // Standard markdown link (citation if link text is a digit, e.g. [1](url))
    const linkClass = isCitationStyle ? ' class="citation-link"' : '';
    return `<a href="${escAttr(hrefRaw)}"${linkClass} target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // Spacing: ensure one space before (https:// when preceded by ), ], or superscript (e.g. )²(https:// -> )² (https://)
  html = html.replace(/([)\]⁰¹²³⁴⁵⁶⁷⁸⁹])(\s*)(\()(https?:\/\/)/g, '$1 $3$4');

  // Plain URLs: in References "8. Title. https://...", in-paragraph "(https://...)" or "[https://...]" -> clickable links
  // Preceding char: start, whitespace, >, ., ), (, [ so (https:// and [https:// are matched; URL stops at whitespace, <, ", or ]
  const escAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/(^|[\s>.)(\[])(https?:\/\/[^\s<"\]]+)/g, (_match, before, url) => {
    return before + `<a href="${escAttr(url)}" target="_blank" rel="noopener noreferrer">${escHtml(url)}</a>`;
  });

  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;
  let lastOrderedNumber = 0; // Track last number to detect gaps

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
          lastOrderedNumber = 0; // Reset counter when closing ordered list
        }
        processedLines.push('<ul>');
        inUnorderedList = true;
      }
      processedLines.push(`<li>${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      const originalNumber = parseInt(orderedMatch[1], 10);
      const itemText = orderedMatch[2];
      
      // Check if this is a new ordered list (gap in numbering or first item)
      const isNewList = !inOrderedList || (lastOrderedNumber > 0 && originalNumber < lastOrderedNumber);
      
      if (isNewList) {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
        }
        processedLines.push('<ol>');
        inOrderedList = true;
        lastOrderedNumber = 0; // Reset counter for new list
      }
      
      // Preserve original number using value attribute to maintain correct citation order
      // This is critical for citations which must maintain their original numbering (1, 2, 3...)
      processedLines.push(`<li value="${originalNumber}">${itemText}</li>`);
      lastOrderedNumber = originalNumber;
    } else {
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
        lastOrderedNumber = 0; // Reset counter when closing ordered list
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
    lastOrderedNumber = 0; // Reset counter when closing ordered list
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


/** Escape HTML so raw text can be shown as-is safely. */
function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, ch => map[ch]);
}

/**
 * Format final article with block type information.
 * Block types are applied only for 'title' and 'heading'; all other content is shown as-is from backend (no markdown conversion).
 *
 * @param article - The article content (markdown or plain text)
 * @param blockTypes - Array of block type information with index, type, and optional level
 * @returns Formatted HTML (title/headings use block types; rest is backend content as-is)
 */
export function formatFinalArticleWithBlockTypes(
  article: string,
  blockTypes: BlockTypeInfo[]
): string {
  if (!blockTypes || blockTypes.length === 0) {
    return convertMarkdownToHtml(article);
  }

  const paragraphs = article.split(/\n\n+/);
  const blockTypeMap = new Map<number, { type: string; level?: number }>();
  blockTypes.forEach(bt => {
    blockTypeMap.set(bt.index, { type: bt.type, level: bt.level });
  });

  const output: string[] = [];

  for (let idx = 0; idx < paragraphs.length; idx++) {
    const trimmedPara = paragraphs[idx].trim();
    if (!trimmedPara) continue;

    const blockInfo = blockTypeMap.get(idx);

    // Only apply block type formatting for title and heading; everything else show as-is from backend
    if (blockInfo && (blockInfo.type === 'title' || blockInfo.type === 'heading')) {
      let formatted = convertMarkdownToHtml(trimmedPara);
      formatted = formatted.replace(/^<p>(.*)<\/p>$/s, '$1');

      if (blockInfo.type === 'title') {
        output.push(`<h1 style="font-size: 24pt; font-weight: 700; font-family: 'Helvetica', 'Arial', sans-serif; display: block; margin-top: 1.25em; margin-bottom: 0.35em; text-align: center; color: #D04A02;">${formatted}</h1>`);
      } else {
        const headingLevel = blockInfo.level || 1;
        const headingTag = `h${Math.min(Math.max(headingLevel, 1), 6)}`;
        output.push(`<${headingTag} style="font-size: 14pt; font-weight: 700; font-family: 'Helvetica-Bold', 'Arial Bold', sans-serif; display: block; margin-top: 0.9em; margin-bottom: 0.2em; color: #000000; text-align: left;">${formatted}</${headingTag}>`);
      }
    } else {
      // Remaining blocks: show as-is from backend (raw text, no markdown → HTML)
      const safe = escapeHtml(trimmedPara);
      const withBreaks = safe.replace(/\n/g, '<br>');
      output.push(`<p style="white-space: pre-wrap; font-weight: normal; text-align: left;">${withBreaks}</p>`);
    }
  }

  return output.join('\n');
}
