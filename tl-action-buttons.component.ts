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

.editor-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.editor-chips {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.editor-chip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 0px;
  background: var(--bg-secondary, #ffffff);
  cursor: pointer;
  text-align: left;
  width: 100%;
  opacity: 0;
  will-change: transform, opacity;
  transform-origin: left center;
  
  // Staggered slide-in animation
  animation: slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  
  // Store delay as CSS variable for use in selected state
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
    animation-delay: 0.2s;
    --animation-delay: 0.2s;
  }
  
  &:nth-child(5) {
    animation-delay: 0.2s;
    --animation-delay: 0.2s;
  }

  // Enhanced hover effects with scale, translateY, and enhanced shadow
  transition: all 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  &:hover {
    border-color: var(--pwc-orange, #FFAA72);
    background: var(--bg-hover, #fef3e2);
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 16px rgba(208, 74, 2, 0.15);
  }

  &.selected {
    border-color: var(--pwc-orange, #FFAA72);
    background: var(--pwc-orange-light, #fff4e6);
    box-shadow: 0 0 0 2px rgba(208, 74, 2, 0.1);
    // Apply glow animation after slide-in completes (animation-delay accounts for slide-in duration + delay)
    animation: slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                borderGlow 2s ease-in-out infinite;
    // Start borderGlow after slide-in completes
    animation-delay: calc(var(--animation-delay, 0s)), 
                     calc(var(--animation-delay, 0s) + 0.4s);
    
    .editor-number {
      animation: pulse 2s ease-in-out infinite;
      animation-delay: calc(var(--animation-delay, 0s) + 0.4s);
    }
    
    .check-mark {
      animation: checkmarkPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.8;
    background: var(--pwc-orange-light, #fff4e6);
    border-color: var(--pwc-orange, #FFAA72);

    &:hover {
      transform: none;
      box-shadow: 0 0 0 2px rgba(208, 74, 2, 0.1);
    }
  }

  // Shared styles for selected and disabled states
  &.selected,
  &.disabled {
    .editor-name {
      color: #000000;
      font-weight: 600;
    }
    
    .editor-description {
      color: #000000;
    }
  }
  
  // Respect reduced motion preference
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transition: none;
    
    &.selected {
      animation: none;
      
      .editor-number {
        animation: none;
      }
      
      .check-mark {
        animation: none;
      }
    }
  }

  .editor-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--pwc-orange, #FFAA72);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .editor-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .editor-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .editor-name {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--text-primary, #1a1a1a);
  }

  .editor-description {
    font-size: 0.8125rem;
    color: var(--text-secondary, #6b7280);
  }

  .check-mark {
    font-size: 1.25rem;
    color: var(--pwc-orange, #FFAA72);
    font-weight: bold;
    flex-shrink: 0;
    transform-origin: center;
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
