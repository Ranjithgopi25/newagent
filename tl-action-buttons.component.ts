@import '../../../shared/ui/styles/design-tokens';
@import '../../../shared/ui/styles/mixins';
@import '../../../shared/ui/styles/paragraph-edits';
@import '../../ddc/brand-format-flow/brand-format-flow.component.scss';


// Introduction text styling
.panel-title {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 24px;
  line-height: 1.5;
}
// Form label with required indicator
.form-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 11.5px;

  .required {
    color: #fd5108;
    margin-left: 4px;
    font-weight: normal;
  }
}

// Upload item container
.upload-item {
  margin-bottom: 16px;
}

// File size info display
.file-size-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 12px;
  background: #F0F7FF;
  border: 1px solid #BFDBFE;
  border-radius: 6px;
  font-size: 13px;
  color: #1F2937;
  
  svg {
    flex-shrink: 0;
    color: #3B82F6;
  }
  
  span {
    font-weight: 500;
    word-break: break-all;
  }
}

// Error message display
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 14px 16px;
  background: #FEF2F2;
  border-left: 4px solid #DC2626;
  border-radius: 8px;
  font-size: 13.5px;
  line-height: 1.6;
  color: #991B1B;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
  position: relative;
  
  svg {
    flex-shrink: 0;
    margin-top: 2px;
    stroke: #DC2626;
  }
  
  span {
    flex: 1;
    font-weight: 500;
  }
}

.error-close-btn {
  flex-shrink: 0;
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #c90c0c;
  margin-left: 8px;
  
  svg {
    stroke: #b70f0f;
    transition: stroke 0.2s ease;
  }
  
  &:hover {
    background: rgba(220, 38, 38, 0.1);
    
    svg {
      stroke: #ba1f1f;
    }
  }
  
  &:active {
    background: rgba(220, 38, 38, 0.2);
  }
  
  &:focus {
    outline: 2px solid #DC2626;
    outline-offset: 2px;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.uploaded-file-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #F0F7FF;
  border: 1px solid #BFDBFE;
  border-radius: 8px;
  margin-top: 12px;

  .file-icon {
    flex-shrink: 0;
    color: #fd5108;
  }

  .file-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .file-name {
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
    }

    .file-size {
      font-size: 12px;
      color: #6B7280;
    }
  }

  .remove-file-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: #6B7280;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background: #FEE2E2;
      color: #DC2626;
    }

    svg {
      width: 16px;
      height: 16px;
    }
  }
}

.editor-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.editor-toggle-item {
  position: relative;
  cursor: pointer;
  display: block;

  &.disabled {
    cursor: not-allowed;
    opacity: 1;
  }

  input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + .editor-toggle-switch {
    background: #fd5108;
    color: white;

    .editor-toggle-indicator {
      background: rgba(255, 255, 255, 0.3);
      
      &::before {
        transform: translateX(24px);
      }
    }
  }

  &:disabled + .editor-toggle-switch {
    background: #fd5108;  // Exact same color as checked state
    color: white;
    cursor: not-allowed;
    opacity: 1;  // Remove opacity to match exactly

    .editor-toggle-indicator {
      background: rgb(202, 198, 198);  // Changed to solid white
      
      &::before {
        background: rgb(126, 123, 123);  // Changed to orange
        transform: translateX(24px);
      }
    }
  }
}
}

.editor-toggle-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #F5F5F5;
  border-radius: 8px;
  transition: all 0.1s ease;
  min-height: 48px;

  &.disabled {
    cursor: not-allowed;
  }
}

.editor-toggle-indicator {
  flex-shrink: 0;
  width: 48px;
  height: 24px;
  background: #E0E0E0;
  border-radius: 12px;
  position: relative;
  transition: all 0.1s ease;

  &::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    background: var(--bg-primary);
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 0.1s ease;
  }
}

.editor-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.editor-title {
  font-weight: 600;
  font-size: 11.5px;
}

.editor-description {
  font-size: 11.5px;
  opacity: 0.85;
  font-style: italic;
}

.result-section {
  margin-top: 16px;
}

.result-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.bulk-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: var(--bg-secondary, #F9FAFB);
  border-radius: 8px;
  border: 1px solid var(--border-color, #E5E7EB);
  width: fit-content;
  margin-left: auto;
  
  // Style buttons inside bulk-actions with borders
  .ef-approve-btn,
  .ef-reject-btn {
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
  }
  
  .ef-approve-btn {
    background: #F0FDF4;
    color: #059669;
    border-color: #10b981;
  }
  
  .ef-approve-btn:hover:not(:disabled) {
    background: #D1FAE5;
    border-color: #059669;
  }
  
  .ef-reject-btn {
    background: #FEF2F2;
    color: #DC2626;
    border-color: #EF4444;
  }
  
  .ef-reject-btn:hover:not(:disabled) {
    background: #FEE2E2;
    border-color: #DC2626;
  }
  
  .ef-approve-btn:disabled,
  .ef-reject-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.bulk-action-btn {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  display: inline-block;
  text-align: center;
  text-decoration: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  user-select: none;
  margin: 0;
  font-family: inherit;
  position: relative;
  pointer-events: auto;
  touch-action: manipulation;
}

.bulk-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.bulk-action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.bulk-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.bulk-action-btn:focus:not(:disabled) {
  outline: 2px solid #fd5108;
  outline-offset: 2px;
}

.approve-all-btn {
  background-color: #F0FDF4;
  color: #059669;
  border-color: #10b981;
}

.approve-all-btn:hover:not(:disabled) {
  background-color: #D1FAE5;
  border-color: #059669;
}

.decline-all-btn {
  background-color: #FEF2F2;
  color: #DC2626;
  border-color: #EF4444;
}

.decline-all-btn:hover:not(:disabled) {
  background-color: #FEE2E2;
  border-color: #DC2626;
}

@media (max-width: 768px) {
  .bulk-actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
  
  .bulk-action-btn {
    flex: 0 0 auto;
  }
}

.generation-output {
  margin-top: 24px;
}

.assistant-message {
  background: var(--bg-primary);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--text-primary);
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.revised-content-formatted {
  white-space: normal;
  
  h1 {
    font-size: 2em;
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.75em;
    color: var(--text-primary);
    line-height: 1.2;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 0.5em;
  }

  h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin-top: 1.25em;
    margin-bottom: 0.625em;
    color: var(--text-primary);
    line-height: 1.3;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.375em;
  }

  h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin-top: 1em;
    margin-bottom: 0.5em;
    color: var(--text-primary);
    line-height: 1.4;
  }

  h4 {
    font-size: 1.1em;
    font-weight: 600;
    margin-top: 0.875em;
    margin-bottom: 0.5em;
    color: var(--text-primary);
    line-height: 1.4;
  }

  h5 {
    font-size: 1em;
    font-weight: 600;
    margin-top: 0.75em;
    margin-bottom: 0.5em;
    color: var(--text-primary);
    line-height: 1.5;
  }

  h6 {
    font-size: 0.9em;
    font-weight: 600;
    margin-top: 0.75em;
    margin-bottom: 0.5em;
    color: var(--text-primary);
    line-height: 1.5;
  }

  p {
    margin-top: 0.75em;
    margin-bottom: 0.75em;
    line-height: 1.7;
    color: var(--text-primary);
    
    &:first-child {
      margin-top: 0;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
  }

  ul, ol {
    margin-top: 0.75em;
    margin-bottom: 0.75em;
    padding-left: 2em;
    line-height: 1.7;
    color: var(--text-primary);
  }

  ul {
    list-style-type: disc;
    
    ul {
      list-style-type: circle;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
      
      ul {
        list-style-type: square;
      }
    }
  }

  ol {
    list-style-type: decimal;
    
    ol {
      list-style-type: lower-alpha;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
      
      ol {
        list-style-type: lower-roman;
      }
    }
  }

  li {
    margin-top: 0.375em;
    margin-bottom: 0.375em;
    line-height: 1.7;
    
    p {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }
  }

  strong {
    font-weight: 700;
    color: var(--text-primary);
  }

  em {
    font-style: italic;
    color: var(--text-primary);
  }

  pre {
    background: #F5F5F5;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 1em;
    margin-top: 1em;
    margin-bottom: 1em;
    overflow-x: auto;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9em;
    line-height: 1.5;
  }

  code {
    background: #F5F5F5;
    border: 1px solid var(--border-color);
    border-radius: 3px;
    padding: 0.2em 0.4em;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9em;
  }

  pre code {
    background: transparent;
    border: none;
    padding: 0;
  }

  // Links
  a {
    color: #fd5108;
    text-decoration: underline;
    transition: color 0.2s ease;
    
    &:hover {
      color: #b83d01;
    }
  }

  // Horizontal rules
  hr {
    border: none;
    border-top: 2px solid var(--border-color);
    margin: 2em 0;
  }

  // Blockquotes (if needed in future)
  blockquote {
    border-left: 4px solid #fd5108;
    padding-left: 1em;
    margin-left: 0;
    margin-top: 1em;
    margin-bottom: 1em;
    color: #6B7280;
    font-style: italic;
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

// Satisfaction Prompt Styles
.satisfaction-prompt {
  margin-top: 24px;
  padding: 16px;
  background-color: #F0F7FF;
  border-radius: 8px;
  border: 1px solid #BFDBFE;
}

.satisfaction-question {
  font-size: 14px;
  font-weight: 500;
  color: #1F2937;
  margin-bottom: 12px;
}

.satisfaction-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.satisfaction-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.satisfied-btn {
  background-color: #10b981;
  color: white;
  border-color: #10b981;
  
  &:hover:not(:disabled) {
    background-color: #059669;
    border-color: #059669;
  }
}

.improve-btn {
  background-color: #f59e0b;
  color: white;
  border-color: #f59e0b;
  
  &:hover:not(:disabled) {
    background-color: #d97706;
    border-color: #d97706;
  }
}

// Improvement Input Styles
.improvement-input {
  margin-top: 24px;
  padding: 16px;
  background-color: #F0F7FF;
  border-radius: 8px;
  border: 1px solid #BFDBFE;
}

.improvement-textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  border: 1px solid #BFDBFE;
  border-radius: 6px;
  background-color: white;
  color: #1F2937;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #fd5108;
    box-shadow: 0 0 0 3px rgba(208, 74, 2, 0.1);
  }
  
  &::placeholder {
    color: #6B7280;
  }
}

.improvement-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  justify-content: flex-end;
}

.improvement-submit-btn,
.improvement-cancel-btn {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.improvement-submit-btn {
  background-color: #fd5108;
  color: white;
  border-color: #fd5108;
  
  &:hover:not(:disabled) {
    background-color: #b83d01;
    border-color: #b83d01;
  }
}

.improvement-cancel-btn {
  background-color: transparent;
  color: #6B7280;
  border-color: #E5E7EB;
  
  &:hover:not(:disabled) {
    background-color: #F9FAFB;
    border-color: #6B7280;
    color: #1F2937;
  }
}

/* Editorial feedback card styles */
.ef-container,
.ef-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.ef-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #fff;
  margin-bottom: 8px;
}

.ef-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.ef-issue {
  font-weight: 600;
  font-size: 13px;
  color: #111827;
  flex: 1;
}

.ef-priority {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.priority-critical {
  background: #fee2e2;
  color: #991b1b;
}

.priority-important {
  background: #fef3c7;
  color: #92400e;
}

.priority-enhancement {
  background: #dbeafe;
  color: #1e40af;
}

.ef-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ef-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.ef-label {
  font-weight: 600;
  min-width: 40px;
  color: #374151;
  background: #dcfce7;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
}

.ef-value {
  flex: 1;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.5;
}

.ef-label-small {
  font-weight: 500;
  min-width: 50px;
  color: #6b7280;
  font-size: 11px;
}

.ef-value-small {
  flex: 1;
  color: #6b7280;
  font-size: 11px;
  line-height: 1.4;
}

.ef-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.ef-approve-btn, .ef-reject-btn {
  padding: 4px 12px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.ef-approve-btn {
  background: #d1fae5;
  color: #059669;
}

.ef-approve-btn:hover:not(:disabled) {
  background: #10b981;
  color: #fff;
}

.ef-approve-btn.active {
  background: #10b981;
  color: #fff;
  font-weight: 600;
}

.ef-approve-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ef-reject-btn {
  background: #fee2e2;
  color: #dc2626;
}

.ef-reject-btn:hover:not(:disabled) {
  background: #dc2626;
  color: #fff;
}

.ef-reject-btn.active {
  background: #dc2626;
  color: #fff;
  font-weight: 600;
}

.ef-reject-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ef-status {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
}

.ef-approved {
  color: #059669;
}

.ef-rejected {
  color: #dc2626;
}

/* Inline message when there is no paragraph-level feedback */
.paragraph-no-feedback {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
  margin-top: 5rem;
  border-radius: 0.5rem;
  border: 1px dashed rgba(0, 0, 0, 0.12);
  background-color: #fd5108;
  text-align: center;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
}

.paragraph-no-feedback p {
  margin: 0;
  font-size: 1.12rem;
}

.paragraph-feedback-section {
  margin-bottom: 32px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.paragraph-row {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.paragraph-col {
  flex: 1;
}

.paragraph-col h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.paragraph-text-box {
  height: auto;
  overflow: hidden;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  padding: 12px;
  min-height: 60px;
  font-size: 14px;
  color: #1f2937;
  line-height: 1.6;
  word-break: break-word;
}

:host ::ng-deep .highlight-border {
  border: 2px solid #fa1515;
  border-radius: 4px;
  box-shadow: 0 0 2px #ffdd00;
  padding: 1px 3px;
}

:host ::ng-deep .highlight-yellow {
  background: #fef08a;
  color: #92400e;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 3px;
}

:host ::ng-deep .highlight-green {
  background: #86efac;
  color: #166534;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 3px;
}

:host ::ng-deep .strikeout {
  text-decoration: line-through;
}

// Strikeout with yellow background (for approved issues in original)
:host ::ng-deep .strikeout.highlight-yellow {
  background: #fef08a;
  color: #92400e;
  text-decoration: line-through;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 3px;
}

:host ::ng-deep .highlight-fix {
  color: #0c9500;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 3px;
}

// .editorial-feedback-list {
//   margin-bottom: 12px;
// }

.editorial-feedback-list {
  max-height: 300px;   /* adjust height as you prefer */
  overflow-y: auto;
  padding-right: 8px;  /* optional: avoids content flush against scrollbar */
}

.editor-type-label {
  font-weight: 600;
  margin: 12px 0 6px 0;
  color: #0369a1;
  font-size: 13px;
}

.flow-container {
  width: 110%;  // Increase from default (usually 80%)
  max-width: 1200px;  // Adjust max-width as needed
  max-height: 98vh;
  background: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

// .approved-section {
//   background: #e6fbe6;
//   border: 1px solid #34d399;
// }

// .rejected-section {
//   background: #fee2e2;
//   border: 1px solid #f87171;
//   text-decoration: line-through;
//   color: #dc2626;
  
//   // Apply strikethrough and red color to all nested elements
//   * {
//     text-decoration: line-through;
//     color: #dc2626;
//   }
// }

// Final Output Section
.final-output-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid var(--border-color, #E5E7EB);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.final-output-btn {
  padding: 12px 24px;
  background-color: #fd5108;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  &:hover:not(:disabled) {
    background-color: #b83d01;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(208, 74, 2, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.final-output-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #6B7280;
  font-style: italic;
  text-align: center;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.final-output-section {
  margin-top: 32px;
  padding: 24px;
  background: #F9FAFB;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
}

.final-output-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 16px;
}

.final-output-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
  margin-bottom: 20px;
  max-height: 600px;
  overflow-y: auto;

  // Style for title blocks (h1 with bold)
  h1 {
    font-weight: 700 !important; // Bold title
    display: block;
    font-size: 2em;
    margin-top: 1.5em;
    margin-bottom: 0.75em;
    color: var(--text-primary);
    line-height: 1.2;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 0.5em;
    text-align: left;
  }

  // Style for headings (h2-h6, bold but less than title)
  h2, h3, h4, h5, h6 {
    font-weight: 600 !important; // Bold but less than title
    display: block;
    margin-top: 1em;
    margin-bottom: 0.5em;
    color: var(--text-primary);
    text-align: left;
  }

  h2 {
    font-size: 1.5em;
    line-height: 1.3;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.375em;
  }

  h3 {
    font-size: 1.25em;
    line-height: 1.4;
  }

  h4 {
    font-size: 1.1em;
    line-height: 1.4;
  }

  h5 {
    font-size: 1em;
    line-height: 1.5;
  }

  h6 {
    font-size: 0.9em;
    line-height: 1.5;
  }

  // Style for paragraphs (proper alignment)
  p {
    display: block;
    text-align: left;
    margin: 0.75em 0;
    line-height: 1.7;
    color: var(--text-primary);
    
    &:first-child {
      margin-top: 0;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
  }

  // Style for lists (proper ordering)
  ul, ol {
    display: block;
    margin: 0.75em 0;
    padding-left: 2em;
    line-height: 1.7;
    color: var(--text-primary);
    text-align: left;
  }

  ul {
    list-style-type: disc;
    list-style-position: outside;
    
    ul {
      list-style-type: circle;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
      
      ul {
        list-style-type: square;
      }
    }
  }

  ol {
    list-style-type: decimal;
    list-style-position: outside;
    
    ol {
      list-style-type: lower-alpha;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
      
      ol {
        list-style-type: lower-roman;
      }
    }
  }

  li {
    display: list-item;
    margin: 0.375em 0;
    line-height: 1.7;
    padding-left: 0.5em;
    
    p {
      margin: 0.5em 0;
      display: block;
    }
  }
}

.export-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.export-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
}

.pdf-btn {
  background-color: #DC2626;
  color: white;
  border-color: #DC2626;
  
  &:hover {
    background-color: #B91C1C;
    border-color: #B91C1C;
  }
}

.docx-btn {
  background-color: #2563EB;
  color: white;
  border-color: #2563EB;
  
  &:hover {
    background-color: #1D4ED8;
    border-color: #1D4ED8;
  }
}

.copy-btn {
  background-color: #6B7280;
  color: white;
  border-color: #6B7280;
  
  &:hover {
    background-color: #4B5563;
    border-color: #4B5563;
  }
}
.helper-text {
  font-size: 12px;
  color: #6c757d;
  margin: 4px 0 8px;
}

// Sequential Workflow Progress Indicator
.sequential-progress {
  margin: 24px 0;
  padding: 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.progress-badge {
  padding: 4px 12px;
  background: #3B82F6;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #60A5FA);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  
  strong {
    color: var(--text-primary);
    font-weight: 600;
  }
}

// Horizontal Editor Timeline
.editor-timeline.horizontal {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 16px 0 20px;
  padding: 16px 0;
  overflow-x: auto;
  overflow-y: hidden;
  
  // Hide scrollbar but keep functionality
  scrollbar-width: thin;
  scrollbar-color: #E5E7EB transparent;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #E5E7EB;
    border-radius: 3px;
    
    &:hover {
      background: #D1D5DB;
    }
  }
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
  text-align: center;
  flex-shrink: 0;
}

.timeline-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #d0d0d0;
  color: #333;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.2s ease;
}

.timeline-item.completed .timeline-marker {
  background: #2e7d32;
  color: #fff;
}

.timeline-item.active .timeline-marker {
  background: #1976d2;
  color: #fff;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.2);
  
  &.blink-marker {
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.4);
    animation: blink-marker 1.2s ease-in-out infinite;
  }
}

.timeline-item.upcoming .timeline-marker {
  background: #d0d0d0;
  color: #666;
}

.timeline-editor-name {
  margin-top: 6px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.3;
  max-width: 120px;
  word-wrap: break-word;
}

.timeline-item.completed .timeline-editor-name {
  color: #2e7d32;
}

.timeline-item.active .timeline-editor-name {
  color: #1976d2;
  font-weight: 700;
}

.timeline-item.upcoming .timeline-editor-name {
  color: #666;
}

.timeline-status {
  margin-top: 2px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.timeline-item.completed .timeline-status {
  color: #2e7d32;
}

.timeline-item.active .timeline-status {
  color: #1976d2;
  font-weight: 600;
  
  &.loading-status {
    color: #1976d2;
  }
}

// Blinking animation for "In Progress" status
.blink-animation {
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

// Blinking animation for timeline marker numbers
.blink-marker {
  animation: blink-marker 1.2s ease-in-out infinite !important;
}

.blink-number {
  animation: blink-number 1.2s ease-in-out infinite !important;
  display: inline-block;
}

@keyframes blink-marker {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.4);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.15);
    box-shadow: 0 0 0 5px rgba(25, 118, 210, 0.6);
  }
}

@keyframes blink-number {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.2);
  }
}

.timeline-connector {
  flex: 1;
  height: 2px;
  background: #d0d0d0;
  margin-top: 13px;
  min-width: 20px;
  transition: background 0.2s ease;
}

.timeline-connector.completed {
  background: #2e7d32;
}

// Feedback decision summary inside sequential progress card
.paragraph-status-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.status-summary-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.feedback-pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.status-pill {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  &:focus {
    outline: 2px solid #fd5108;
    outline-offset: 2px;
  }

  strong {
    font-weight: 700;
  }

  &.approved {
    border-color: #10b981;
    color: #059669;
    background: #f0fdf4;
  }

  &.rejected {
    border-color: #ef4444;
    color: #dc2626;
    background: #fef2f2;
  }

  &.pending {
    border-color: #f59e0b;
    color: #92400e;
    background: #fffbeb;
  }
}

// Sequential Actions Container (holds both Next Editor and Generate Final Output)
.sequential-actions-container {
  margin: 24px 0;
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: flex-start;

  .final-output-actions,
  .next-editor-actions {
    flex: 1;
    padding: 20px;
    background: #F0F7FF;
    border: 1px solid #BFDBFE;
    border-radius: 8px;
    text-align: center;
  }

}

// // Next Editor Button
// .next-editor-actions {
//   padding: 20px;
//   background: #F0F7FF;
//   border: 1px solid #BFDBFE;
//   border-radius: 8px;
//   text-align: center;
// }

.next-editor-btn {
  padding: 12px 24px;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  &:hover:not(:disabled) {
    background: #2563EB;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

.next-editor-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 0;
}

// Final Output Actions (updated for sequential mode)
.final-output-actions {
  margin: 24px 0;
  padding: 20px;
  background: #F0F7FF;
  border: 1px solid #BFDBFE;
  border-radius: 8px;
  text-align: center;

  .sequential-actions-container & {
    margin: 0;
  }

}

.final-output-btn {
  padding: 12px 24px;
  background: #10B981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  
  &:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

.final-output-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// Notification Toast Styles
.notification-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  min-width: 300px;
  max-width: 500px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #E5E7EB;
  animation: slideInRight 0.3s ease-out;
  
  &[data-type="success"] {
    border-left: 4px solid #10B981;
  }
  
  &[data-type="error"] {
    border-left: 4px solid #DC2626;
  }
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  
  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
  
  span {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: #1F2937;
  }
  
  // Success notification
  .notification-toast[data-type="success"] & svg {
    color: #10B981;
    stroke: #10B981;
  }
  
  // Error notification
  .notification-toast[data-type="error"] & svg {
    color: #DC2626;
    stroke: #DC2626;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

// Responsive: Adjust notification position on mobile
@media (max-width: 768px) {
  .notification-toast {
    right: 10px;
    left: 10px;
    min-width: auto;
    max-width: none;
  }
}
