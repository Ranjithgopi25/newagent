
// Keyframe Animations
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

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes checkmarkPop {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(0deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
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

// Orange bar + toggle (match guided journey / reference UI)
$service-bar-orange: #F97316;
$service-bar-orange-light: rgba(255, 255, 255, 0.35);
$service-bar-orange-dark: #ea580c;

.editor-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary, #1a1a1a);
  margin: 0 0 0.5rem 0;
}

.services-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.service-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  min-height: 48px;
  border-radius: 0;
  cursor: pointer;
  transition: background 0.2s ease;
  background: $service-bar-orange;

  input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  &.selected {
    background: $service-bar-orange;
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.85;
  }

  &:hover:not(.disabled) {
    background: $service-bar-orange-dark;
  }
}

// Sliding toggle: track (lighter orange when off), white circle handle (left = off, right = on)
.service-card-toggle {
  flex-shrink: 0;
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: $service-bar-orange-light;
  transition: background 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s ease;
  }

  .service-card input[type="checkbox"]:checked ~ &,
  .service-card.selected & {
    background: rgba(255, 255, 255, 0.5);

    &::after {
      transform: translateX(20px);
    }
  }

  .service-card.disabled & {
    background: rgba(255, 255, 255, 0.4);

    &::after {
      transform: translateX(20px);
    }
  }
}

.service-label {
  flex: 1;
  font-size: 11.5px;
  line-height: 1.4;
  color: #fff;

  strong {
    font-weight: 700;
    color: #fff;
  }
}

.editor-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  opacity: 0;
  animation: slideUpFadeIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.5s forwards;
  
  // Respect reduced motion preference
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
  border-radius: 0px;
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
  background: var(--pwc-orange, #FFAA72);
  color: white;
  border: none;
  border-radius: 0px;
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
