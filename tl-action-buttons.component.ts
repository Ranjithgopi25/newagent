// Keyframe Animations (keep as before)
@keyframes slideInLeft {
  0% {
    opacity: 0;
    transform: translateX(-30px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes slideUpFadeIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes borderGlow {
  0%, 100% {
    box-shadow: 0 0 0 2px rgba(208, 74, 2, 0.1);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(208, 74, 2, 0.2);
  }
}

.editor-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.section-label {
  display: block;
  font-size: 11.5px;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 4px;
}

.editor-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

// Card: label left, toggle right (like reference image)
.service-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f3f4f6;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
  opacity: 0;
  animation: slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;

  &:nth-child(1) {
    animation-delay: 0s;
    --animation-delay: 0s;
  }

  &:nth-child(2) {
    animation-delay: 0.1s;
    --animation-delay: 0.1s;
  }

  &:nth-child(3) {
    animation-delay: 0.2s;
    --animation-delay: 0.2s;
  }

  &:nth-child(4) {
    animation-delay: 0.3s;
    --animation-delay: 0.3s;
  }

  input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  &.selected {
    background: #f3f4f6;
    box-shadow: 0 0 0 2px rgba(208, 74, 2, 0.1);
    animation: slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
              borderGlow 2s ease-in-out infinite;
    animation-delay: calc(var(--animation-delay, 0s)),
                     calc(var(--animation-delay, 0s) + 0.4s);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.8;
  }

  &:hover:not(.disabled) {
    background: #e5e7eb;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
}

// Label on the left (takes remaining space)
.service-label {
  flex: 1;
  font-size: 11.5px;
  color: var(--text-primary, #1a1a1a);
  line-height: 1.4;
  text-align: left;

  strong {
    font-weight: 700;
  }

  .service-card.selected & {
    color: var(--text-primary, #1a1a1a);
  }
}

// Toggle on the right only (pill-style, orange when on)
.service-card-toggle {
  flex-shrink: 0;
  width: 48px;
  height: 24px;
  border-radius: 12px;
  background: #e0e0e0;
  position: relative;
  transition: background 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: transform 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .service-card input[type="checkbox"]:checked ~ & {
    background: var(--pwc-orange, #fd5108);

    &::after {
      transform: translateX(24px);
    }
  }

  .service-card.disabled & {
    background: var(--pwc-orange, #fd5108);
    opacity: 0.6;

    &::after {
      transform: translateX(24px);
    }
  }
}

.editor-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  opacity: 0;
  animation: slideUpFadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.5s forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
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
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    background: var(--bg-hover, #f9fafb);
    border-color: var(--text-secondary, #6b7280);
    color: var(--text-primary, #1a1a1a);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

    &:hover {
      transform: none;
    }
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
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;

  &:hover:not(:disabled) {
    background: var(--pwc-orange-dark, #b03e02);
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 12px rgba(208, 74, 2, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(1);
  }

  &:disabled {
    background: var(--border-color, #e5e7eb);
    color: var(--text-secondary, #6b7280);
    cursor: not-allowed;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: background 0.2s ease;

    &:hover:not(:disabled) {
      transform: none;
    }
  }
}
