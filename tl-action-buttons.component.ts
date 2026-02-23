// Match Edit Content (Guided Journey) service-card UI
.form-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
  margin-bottom: 8px;
  font-size: 11.5px;
}

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
  border-radius: 0;
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

// Checkbox-style toggle (same as edit-content-flow service-indicator)
.service-card-toggle {
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
  color: var(--text-primary, #1a1a1a);
  line-height: 1.4;

  strong {
    font-weight: 700;
  }

  .service-card.selected & {
    color: var(--text-primary, #1a1a1a);
  }
}

.editor-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.editor-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.cancel-button {
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--bg-hover, #f9fafb);
    border-color: var(--text-secondary, #6b7280);
    color: var(--text-primary, #1a1a1a);
  }
}

.submit-button {
  padding: 0.75rem 1.5rem;
  background: var(--pwc-orange, #fd5108);
  color: white;
  border: none;
  border-radius: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--pwc-orange-dark, #b03e02);
  }

  &:disabled {
    background: var(--border-color, #e5e7eb);
    color: var(--text-secondary, #6b7280);
    cursor: not-allowed;
  }
}
