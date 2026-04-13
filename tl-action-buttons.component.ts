@import '../../../shared/ui/styles/design-tokens';
@import '../../../shared/ui/styles/mixins';

.flow-backdrop {
  @include modal-backdrop;
}

.flow-container {
  @include modal-container;
  max-width: 560px;
  border-radius: 0px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.flow-header {
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  border-radius: 0px;
}

.flow-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-semibold;
  color: var(--text-primary);
  margin: 0;
}

.back-btn,
.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: $spacing-md;
  border-radius: $radius-lg;
  transition: all $transition-fast;

  &:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  svg {
    display: block;
  }
}

.flow-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  max-width: 100%;
  margin: 0;
  position: relative;
}

.panel-title {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 24px;
  line-height: 1.5;
}

.form-section {
  margin-bottom: 20px;

  &.required-section {
    background: #FFF5EB;
    padding: 16px;
    border-radius: 0px;
  }
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-size: 11.5px;

  .required {
    color: #FE7C39;
    margin-left: 4px;
  }
}
.required {
    color: #FE7C39;
    margin-left: 4px;
  }
// File upload handled by shared component

.form-select {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid var(--border-color);
  border-radius: 0px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #FFAA72;
  }
}
.template-select {
    width: 100%;
    padding: 6px 26px 6px 8px;
    border: 1px solid var(--border-color);
    border-radius: 0px;
    font-size: 12px;
    line-height: 1.15;
    background: var(--bg-primary);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fd5108' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    appearance: none;
    cursor: pointer;
    transition: border-color 0.2s;

    &:hover {
      border-color: #FFAA72;
    }

    &:focus {
      outline: none;
      border-color: #FFAA72;
      box-shadow: 0 0 0 3px rgba(208, 74, 2, 0.1);
    }
  }

.helper-text {
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

.services-checklist {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin-top: 6px;
}

.toggle-item {
  position: relative;
  display: block;
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;

    &:focus + .toggle-switch {
      outline: 2px solid #FFAA72;
      outline-offset: 2px;
    }
  }

  .toggle-switch {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: #f5f5f5;
    border: 1.5px solid #ddd;
    border-radius: 0px;
    transition: all 0.2s;
    min-height: 34px;

    &:hover {
      border-color: #ccc;
    }

    .toggle-indicator {
      position: relative;
      width: 32px;
      height: 18px;
      background: #ccc;
      border-radius: 9px;
      transition: background 0.2s;
      flex-shrink: 0;

      &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        background: var(--bg-primary);
        border-radius: 50%;
        transition: transform 0.2s;
      }
    }

    .toggle-label {
      flex: 1;
      font-size: 11.5px;
      color: #666;
      font-weight: 500;
      text-align: left;
      line-height: 1.2;
      max-width: 100%;
      word-wrap: break-word;
    }
  }

  input[type="checkbox"]:checked + .toggle-switch {
    background: #FFAA72;
    border-color: #FFAA72;

    .toggle-indicator {
      background: rgba(255, 255, 255, 0.3);

      &::after {
        transform: translateX(14px);
      }
    }

    .toggle-label {
      color: #fff;
    }
  }
}

.checkbox-item {
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: 0px;
  margin-top: 6px;

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    margin: 0;

    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #FFAA72;
    }

    span {
      font-size: 12px;
      color: #333;
      font-weight: 500;
    }
  }
}

.sub-services {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin-top: 6px;
  padding-left: 24px;
}

.section-label {
  font-size: 11.5px;
  color: #333;
  margin-bottom: 4px;
  display: block;
  font-weight: 500;

  &.required-label::after {
    content: '(required)';
    color: #FE7C39;
    margin-left: 4px;
  }
}

.text-area {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 0px;
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  min-height: 44px;
  line-height: 1.3;
  background: #fef6f1;
  transition: border-color 0.2s;

  &::placeholder {
    color: #aaa;
  }

  &:hover {
    border-color: #ccc;
  }

  &:focus {
    outline: none;
    border-color: #FFAA72;
    box-shadow: 0 0 0 3px rgba(208, 74, 2, 0.1);
    background: var(--bg-primary);
  }
}

.text-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 0px;
  font-size: 12px;
  font-family: inherit;
  line-height: 1.3;
  background: #fef6f1;
  transition: border-color 0.2s;

  &::placeholder {
    color: #aaa;
  }

  &:hover {
    border-color: #ccc;
  }

  &:focus {
    outline: none;
    border-color: #FFAA72;
    box-shadow: 0 0 0 3px rgba(208, 74, 2, 0.1);
    background: var(--bg-primary);
  }
}

.or-divider {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 12px 0;
}

.apply-btn {
  width: 100%;
  padding: 14px 20px;
  background: #FFAA72;
  color: white;
  border: none;
  border-radius: 0px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: #FE7C39;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(208, 74, 2, 0.3);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .generate-spinner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    
    svg {
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      display: block;
    }
  }
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.generation-output {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid var(--border-color);
}

.flow-content-wrapper {
  position: relative;
}

// Loading state for flow-content-wrapper (blurs only content, not overlay)
.flow-content-wrapper.loading {
  filter: blur(0.20px);
  pointer-events: none;
}

// Loading overlay with spinner
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 0px;
  z-index: 112000;
  overflow: hidden;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner-ring {
  width: 60px;
  height: 60px;
  border: 6px solid rgba(255, 170, 114, 0.2);
  border-top-color: #FE7C39;
  border-radius: 50%;
  animation: spin-rotation 1s linear infinite;
}

.loading-text {
  font-size: 16px;
  font-weight: 550;
  color: #FE7C39;
  margin: 0;
}

.loading-dots {
  display: inline;
}

.loading-dots .dot {
  display: inline;
  font-size: 22px;
  opacity: 0;
  animation: pulse-dot 1.5s infinite;
  
  &:nth-child(1) {
    animation-delay: 0s;
  }
  
  &:nth-child(2) {
    animation-delay: 0.3s;
  }
  
  &:nth-child(3) {
    animation-delay: 0.6s;
  }

  &::after {
    content: '.';
  }
}

@keyframes pulse-dot {
  0%, 20%, 100% {
    opacity: 0;
  }
  40%, 80% {
    opacity: 1;
  }
}

@keyframes spin-rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.assistant-message {
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 0px;
  margin-bottom: 16px;
  line-height: 1.6;
  color: var(--text-primary);
}

.upload-error-message {
  color: #FE7C39;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 0;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #FFAA72;
  color: white;
  border: none;
  border-radius: 0px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;

  &:hover {
    background: #FE7C39;
    transform: translateY(-1px);
  }

  svg {
    display: block;
  }
}

/* Make prepare and download buttons share the same look and equal width */
.download-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.prepare-btn,
.download-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: #FFAA72;
  color: white;
  border: none;
  border-radius: 0px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  flex: 1; /* ensure both buttons take equal width */
  text-align: center;
}

.prepare-btn:hover:not(:disabled),
.download-btn:hover:not(:disabled) {
  background: #FE7C39;
  transform: translateY(-1px);
}

.prepare-btn:disabled,
.download-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .flow-container {
    width: 95%;
    max-height: 95vh;
  }

  .sub-services-grid {
    grid-template-columns: 1fr;
  }
}

.helper-text {
  font-size: 12px;
  color: #6c757d;
  margin: 4px 0 8px;
}
.apply-btn {
  width: 100%;
  padding: 14px 20px;
  background: #FFAA72;
  color: black;
  border: none;
  border-radius: 0px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: #FE7C39;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(208, 74, 2, 0.3);
  }

  &:disabled {
    background: #ccc;
    color: white;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.generation-output {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid var(--border-color);
}

.contract-type-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.contract-type-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  line-height: 1.4;

  input[type='radio'] {
    margin-top: 2px;
    accent-color: #ffaa72;
  }
}

.missing-fields-panel {
  margin-top: 0;
  margin-bottom: 20px;
  padding: 16px;
  background: #fff8f3;
  border: 1px solid #ffd8c2;
  border-radius: 0;
}

.missing-fields-panel--priority {
  border-width: 2px;
  border-color: #fe7c39;
}

.missing-fields-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #c2410c;
}

.missing-fields-api-message {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.45;
}

.missing-fields-intro {
  margin-bottom: 12px;
}

.missing-step-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #eee;
  font-size: 12px;
  color: #444;

  .summary-item {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
}

.link-back-to-form {
  display: block;
  margin: 0 0 16px;
  padding: 0;
  border: none;
  background: none;
  color: #c2410c;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: #9a3412;
  }
}

.missing-fields-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.missing-field-row {
  margin-bottom: 16px;
}

.field-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0 0 6px;
  font-style: italic;
}

.checkbox-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;

  input {
    accent-color: #ffaa72;
  }
}

.draft-result {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 2px solid var(--border-color);
}

.draft-result-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;

  .apply-btn {
    width: auto;
    flex: 1 1 auto;
    min-width: min(160px, 100%);
  }
}

.apply-btn.secondary-btn {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);

  &:hover:not(:disabled) {
    background: var(--hover-bg);
    box-shadow: none;
  }
}

.extracted-summary {
  max-height: 200px;
  overflow: auto;
  margin-bottom: 12px;
  padding: 10px;
  background: #f8f9fa;
  border: 1px solid var(--border-color);
  font-size: 11px;
}

.extracted-row {
  display: grid;
  grid-template-columns: minmax(100px, 1fr) 2fr;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #e9ecef;

  &:last-child {
    border-bottom: none;
  }
}

.extracted-key {
  font-weight: 600;
  color: #495057;
  word-break: break-all;
}

.extracted-val {
  color: #212529;
  word-break: break-word;
  font-family: ui-monospace, monospace;
}

.draft-markdown-body {
  max-height: 55vh;
  overflow: auto;
  padding: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  font-size: 13px;
  line-height: 1.5;

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  :deep(p) {
    margin: 0.5em 0;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 1.25rem;
  }
}

.draft-followup-actions {
  margin-top: 12px;
}
