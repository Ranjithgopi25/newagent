
@import '../../../shared/ui/styles/design-tokens';
@import '../../../shared/ui/styles/mixins';
@import '../../ddc/brand-format-flow/brand-format-flow.component.scss';

.upload-instructions {
  //margin-bottom: 16px;
  margin-top: 8px;

  .form-label {
    font-size: 11.5px;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .text-input {
    resize: vertical;
    min-height: 60px;
  }
}
 // Introduction text styling
.panel-title {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 24px;
  line-height: 1.5;
}

.conditional-field {
  margin-top: 12px;
  padding: 16px;
  background: #FFF5EB;
  border-radius: 0px;

  &.editor-options, &.research-options {
    padding: 16px;
  }

  // All sub-option text should be 11.5px
  .form-label,
  .text-input,
  .toggle-label,
  .checkbox-label,
  .source-section-title {
    font-size: 11.5px !important;
  }
}

// Services checklist and service cards (same as edit-content-flow)
.services-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.service-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #FFF5EB;
  border-radius: 0px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;

  input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  &.selected {
    background: #FFF5EB;
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.8;
  }

  &:hover:not(.disabled) {
    background: #FFEBD5;
  }
}

.service-indicator {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #ccc;
  background: transparent;
  position: relative;
  transition: all 0.2s ease;

  .service-card input[type="checkbox"]:checked ~ & {
    background: #fd5108;
    border-color: #fd5108;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 6px;
      background: white;
      border-radius: 50%;
    }
  }

  .service-card.disabled & {
    background: #fd5108;
    border-color: #fd5108;
    opacity: 0.6;
  }
}

.service-label {
  flex: 1;
  font-size: 11.5px;
  color: var(--text-primary);
  line-height: 1.4;

  strong {
    font-weight: 700;
  }

  .service-card.selected & {
    color: var(--text-primary);
  }
}

// Word limit input box styling
.word-limit-input-box {
  position: absolute;
  right: 0;
  top: 30%;
  transform: translateY(-50%);
  width: 80px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.word-limit-input {
  width: 112px;
  height: 30px;
  padding: 4px 8px;
  font-size: 16px;
  text-align: left;
  border: 1px solid #ccc;
  border-radius: 0px ;
  background: #fff;
  color: #222;
  box-sizing: border-box;
}

.text-input {
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

  &::placeholder {
    color: #aaa;
  }
}

.custom-select {
  width: 100%;
  display: block;
  
  // Remove Material underline and make it look like a regular input
  ::ng-deep {
    // Hide subscript area (removes space for hints/errors)
    .mat-mdc-form-field-subscript-wrapper {
      display: none !important;
    }
    
    // Remove bottom border line
    .mat-mdc-form-field-bottom-align {
      display: none !important;
    }
    
    // Remove underline/ripple
    .mdc-line-ripple {
      display: none !important;
    }
    
    .mat-mdc-text-field-wrapper {
      padding: 0 !important;
    }
    
    // Main container - 40px height to match text inputs
    .mat-mdc-form-field-flex {
      align-items: center;
      padding: 0 14px !important;
      height: 40px !important;
      border: 2px solid var(--border-color) !important;
      border-radius: 8px !important;
      background: var(--bg-primary) !important;
      transition: all 0.2s;
    }
    
    // Remove focus overlay
    .mat-mdc-form-field-focus-overlay {
      display: none !important;
    }
    
    // Remove infix padding
    .mat-mdc-form-field-infix {
      padding: 0 !important;
      border: none !important;
      min-height: auto !important;
    }
    
    .mat-mdc-select {
      font-size: 11.5px;
      color: var(--text-primary);
    }
    
    .mat-mdc-select-placeholder {
      color: #aaa;
      font-size: 11.5px;
    }
    
    .mat-mdc-select-value {
      font-size: 11.5px;
    }
    
    .mat-mdc-select-arrow {
      color: #FFAA72;
    }
    
    // Ensure trigger takes full height
    .mat-mdc-select-trigger {
      height: 100%;
      display: flex;
      align-items: center;
    }
  }
  
  // Focus state - orange border with subtle shadow
  &:hover ::ng-deep .mat-mdc-form-field-flex {
    border-color: #FFAA72 !important;
  }
  
  // When focused - orange border
  &.mat-focused ::ng-deep .mat-mdc-form-field-flex {
    border-color: #FFAA72 !important;
    outline: none !important;
    box-shadow: 0 0 0 2px rgba(208, 74, 2, 0.08) !important;
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}


// Research options styling
.research-sources-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.source-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.toggle-item.compact {
  .toggle-switch {
    padding: 10px 14px;
    min-height: 44px;
  }

  .toggle-label {
    font-size: 0.9rem;
  }
  
  input[type="checkbox"]:checked + .toggle-switch {
    background: #FFAA72;
    border-color: #FFAA72;
    
    .toggle-indicator {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .toggle-label {
      color: black;
    }
  }
}

// Checkbox styling
.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 8px;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #FFAA72;
  }

  .checkbox-label {
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
  }
}

.checkbox-label {
  font-size: 0.9rem;
  cursor: pointer;
}

.source-section {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.source-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.source-section-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  font-style: italic;
}

// Refined content output styling
.refined-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #FFAA72;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #E0E0E0;
}

.refined-content-body {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.toggle-label-sources {
  font-size: 9px !important;
  font-weight: 500;
  color: #333;
  transition: color 0.2s ease;
}

.source-toggle input[type="checkbox"]:checked ~ .toggle-switch .toggle-label-sources {
  color: white;
}

.source-toggle-switch {
  width: 40px;
  height: 20px;
  border-radius: 0px;
  background: #E0E0E0;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;

  &.active {
    background: #FFAA72;
  }

  .toggle-indicator {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #FFFFFF;
    position: absolute;
    top: 1px;
    left: 1px;
    transition: left 0.3s;

    .active & {
      left: 21px;
    }
  }
}

.source-grid-extended {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  
  // Custom scrollbar
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 0px ;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 0px ;
    
    &:hover {
      background: #555;
    }
  }
}

// Word Count Slider Styling
.word-limit-slider-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.word-count-slider {
  width: 100%;
  height: 6px;
  border-radius: 0px;
  background: var(--slider-fill, linear-gradient(to right, #FFAA72 0%, #FFAA72 50%, #E5E7EB 50%, #E5E7EB 100%));
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;

  // Chrome, Safari, Edge
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #FFAA72;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;

    &:hover {
      background: #FE7C39;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      transform: scale(1.1);
    }

    &:active {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }

  // Firefox
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #FFAA72;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;

    &:hover {
      background: #FE7C39;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      transform: scale(1.1);
    }

    &:active {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }

  // Firefox track
  &::-moz-range-track {
    background: transparent;
    border: none;
  }

  &::-moz-range-progress {
    background: #FFAA72;
    height: 6px;
    border-radius: 0px;
  }
}

.word-limit-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
  justify-content: center;

  .word-limit-value {
    font-size: 20px;
    font-weight: 600;
    color: #FFAA72;
  }

  .word-limit-label {
    font-size: 10px;
    color: var(--text-secondary);
    font-weight: 400;
  }
}

.slider-bounds {
  display: flex;
  justify-content: space-between;
  padding: 0 4px;

  .bound-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
  }
}

/* Ensure supporting upload banner matches Required Upload banner visuals exactly */
.required-upload-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 0px;
  border: 1px solid rgba(208, 74, 2, 0.08);
  background: rgba(208, 74, 2, 0.06);
  color: var(--text-primary);
  font-family: inherit;
  box-shadow: none;

  .uploaded-file-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .file-icon {
      color: #FFAA72;
      min-width: 20px;
    }

    .uploaded-file-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .uploaded-file-name {
      margin: 0;
      font-size: 11.5px; /* match Required Upload font-size */
      font-weight: 400;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .uploaded-file-size {
      margin: 0;
      font-size: 11px; /* subtle smaller text for file size */
      color: #6b6b6b;
    }
  }

  .remove-file-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    padding: 6px;
    margin-left: 12px;
    cursor: pointer;
    color: #6b6b6b;
    border-radius: 0px;
    min-width: 34px;
    min-height: 34px;

    svg {
      display: block;
    }

    &:hover {
      background: rgba(0,0,0,0.03);
      color: #000;
    }

    &:focus {
      outline: 2px solid rgba(208,74,2,0.16);
      outline-offset: 2px;
    }
  }
}
.helper-text {
  font-size: 12px;
  color: #6c757d;
  margin: 4px 0 8px;
}
// OR Divider styling
.or-divider {
  text-align: center;
  margin: 16px 0;
  font-size: 11.5px;
  font-weight: 600;
  color: #999;
  position: relative;
  
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 45%;
    height: 1px;
    background: #ddd;
  }
  
  &::before {
    left: 0;
  }
  
  &::after {
    right: 0;
  }
}
.error-msg {
    color: #FE7C39;
    font-size: 11px;
    font-weight: 600;
    margin-left: 4px;
}

.upload-error-message {
  color: #FE7C39;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 0;
}

// Multi-file upload button styling - matches file-upload component
.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 3px 10px;
  min-height: 36px;
  background: var(--bg-primary);
  border: 2px dashed var(--border-color);
  border-radius: 0px;
  color: #FE7C39;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 100%;
  text-align: center;
  box-sizing: border-box;

  svg {
    flex-shrink: 0;
    stroke: #FE7C39;
    min-width: 20px;
  }

  .upload-text {
    color: #FE7C39;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &:hover:not(:disabled) {
    background: rgba(208, 74, 2, 0.05);
    border-color: #FFAA72;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.uploaded-files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.services-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;

  .toggle-item {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;

    .toggle-switch {
      width: 100%;
      overflow: hidden;

      .toggle-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }
    }
  }
}

.uploaded-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 0px;
  background: var(--bg-primary);
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;

  svg {
    flex-shrink: 0;
    color: #FFAA72;
  }

  .file-name {
    flex: 1;
    font-size: 11.5px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .remove-file-btn {
    flex-shrink: 0;
    padding: 4px;
    border: none;
    background: none;
    color: #666;
    cursor: pointer;
    border-radius: 0px ;
    transition: all 0.2s;

    &:hover {
      color: #dc3545;
      background: rgba(220, 53, 69, 0.1);
    }

    svg {
      color: inherit;
    }
  }
}

.helper-info {
  font-size: 10px;
  color: #666;
  margin-top: 4px;
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
.section-label {
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
