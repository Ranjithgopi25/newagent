@import '../../../styles/variables';
@import '../../../styles/mixins';
@import '../../shared/ui/styles/paragraph-edits';

// Screen reader only
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

// App Container
.app-container {
  display: grid;
  grid-template-columns: 60px 1fr;
  grid-template-rows: var(--pwc-header-height) 1fr;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  height: 100vh;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  overflow: auto;

  transition: grid-template-columns 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  &.sidebar-expanded {
    grid-template-columns: 260px 1fr;
  }

  // Mobile: Remove sidebar from grid, make full-width layout
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main";
  }

}

// ============================================================================
// TOP HEADER BAR
// ============================================================================

.top-header {
  grid-area: header;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  gap: 2rem;
  z-index: 100;
  height: calc(var(--pwc-header-height) * 1.2);
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    padding: 0 0.5rem;
    gap: 0.5rem;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    padding: 0 0.25rem;
    gap: 0.25rem;
    width: 100%;
    height: auto;
    min-height: 56px;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    order: -1;
    flex-shrink: 0;
    
    .menu-toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0px;
      color: var(--text-primary);
      transition: background-color 0.2s;
      height: var(--pwc-header-height);
      margin: 0;
      margin-left: 0;
      position: relative;
      z-index: 101;
      
      &:hover {
        background-color: var(--bg-tertiary);
      }
      
      @media (min-width: 769px) {
        display: none;
      }
      
      @media (max-width: 768px) {
        padding: 0.35rem 0.5rem;
        height: 48px;
        margin-right: 0.25rem;
      }

      @media (max-width: 480px) {
        padding: 0.25rem 0.35rem;
        height: 48px;
        margin-right: 0.1rem;
      }
    }
    
    .pwc-header-logo {
      height: 120px;
      width: auto;
      
      @media (max-width: 768px) {
        height: 48px;
      }
      
      @media (max-width: 480px) {
        height: 42px;
      }
    }
    
    .business-services-text {
      font-family: 'Georgia', serif;
      font-size: 2rem;
      font-weight: 700;
      //font-style: italic;
      color: var(--text-primary);
      margin-left: 0.75rem;
      letter-spacing: 0.5px;
      
      @media (max-width: 768px) {
        font-size: 0.95rem;
      }
      
      @media (max-width: 480px) {
        font-size: 0.85rem;
      }
    }
    
    .mcx-ai-text {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
      margin-left: 0.5rem;
      
      @media (max-width: 768px) {
        font-size: 1.125rem;
      }
      
      @media (max-width: 480px) {
        font-size: 1rem;
      }
    }
  }
  
  .llm-container {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: var(--pwc-header-height);
    margin-right: auto;
    padding-left: 0;
    margin-left: -1rem;
    
    .llm-selector-container {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      height: 100%;
      padding: 0;

      .dropdown-wrapper {
        position: relative;
        flex: 0 1 auto;
        min-width: 160px;

        @media (max-width: 1024px) {
          min-width: 140px;
        }

        @media (max-width: 768px) {
          min-width: 120px;
        }
      }

      .dropdown-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        background-color: #ffffff;
        border: 1.5px solid #d1d5db;
        border-radius: 0px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--text-primary);
        font-size: 0.875rem;
        font-weight: 500;
        height: auto;
        min-height: 40px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

        &:hover {
          background-color: #f9fafb;
          border-color: #9ca3af;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
        }

        .dropdown-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          font-size: 0.9375rem;
        }

        svg {
          flex-shrink: 0;
          color: var(--text-secondary);
          transition: transform 0.2s ease;

          &.rotate {
            transform: rotate(180deg);
          }
        }

        &:hover {
          border-color: var(--pwc-orange);
          background-color: var(--bg-primary);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px var(--shadow);
        }

        &:focus {
          outline: 2px solid var(--pwc-orange);
          outline-offset: -2px;
        }
      }

      .dropdown-menu {
        position: absolute;
        top: calc(100% + 0.375rem);
        left: 0;
        min-width: 100%;
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 0px;
        box-shadow: 0 4px 12px var(--shadow-strong);
        z-index: 1000;
        overflow: hidden;
        animation: dropdownFadeIn 0.2s ease;

        .dropdown-item {
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: none;
          border: none;
          text-align: left;
          color: var(--text-primary);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s ease;
          border-bottom: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          &:last-child {
            border-bottom: none;
          }

          &:hover {
            background-color: var(--bg-secondary);
            color: var(--pwc-orange);
          }

          &.active {
            background-color: rgba(208, 74, 2, 0.1);
            color: var(--pwc-orange);
            font-weight: 600;
          }
        }
      }
    }
  }
  
  .header-center {
    flex: 1;
    max-width: 600px;
    
    @media (max-width: 768px) {
      max-width: 400px;
    }
    
    @media (max-width: 480px) {
      max-width: 200px;
    }
    
    .header-search-box {
      position: relative;
      width: 100%;
      
      .search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
        pointer-events: none;
      }
      
      .header-search-input {
        width: 100%;
        padding: 0.625rem 1rem 0.625rem 2.75rem;
        border: 1px solid var(--border-color);
        border-radius: 0px;
        background-color: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 0.9375rem;
        transition: all 0.2s;
        
        &::placeholder {
          color: var(--text-secondary);
        }
        
        &:focus {
          outline: none;
          border-color: var(--pwc-orange);
          background-color: var(--bg-primary);
        }
      }
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .theme-dropdown-wrapper {
      position: relative;
      
      .theme-dropdown-menu {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 0px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 140px;
        padding: 0.5rem;
        z-index: 1000;
        
        .theme-dropdown-item {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.625rem 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-radius: 0px;
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: background-color 0.2s;
          text-align: left;
          
          &:hover {
            background-color: var(--bg-tertiary);
          }
          
          &.active {
            background-color: rgba(208, 74, 2, 0.1);
            color: var(--pwc-orange);
            font-weight: 500;
          }
          
          svg {
            flex-shrink: 0;
          }
        }
      }
    }
    
    .header-icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 0px;
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.2s;
      position: relative;
      
      &:hover {
        background-color: var(--bg-tertiary);
      }
      
      &.notifications {
        .notification-badge {
          position: absolute;
          /* anchor to the top-right corner and push the badge outside the icon using transform */
          top: 0;
          right: 0;
          transform: translate(15%, -15%);
          z-index: 10;
          background-color: var(--pwc-orange);
          color: white;
          font-size: 0.625rem;
          font-weight: 600;
          padding: 0.125rem 0.35rem;
          border-radius: 999px;
          min-width: 18px;
          text-align: center;
          line-height: 1;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        }
      }
      
      &.profile-menu {
        padding: 0.375rem 0.75rem;
        
        .header-profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-secondary);
          border: 2px solid var(--border-color);
          flex-shrink: 0;

          .header-profile-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .header-profile-icon {
            width: 18px;
            height: 18px;
            color: var(--text-secondary);
          }
        }
        
        .username {
          font-weight: 600;
          
          @media (max-width: 768px) {
            display: none;
          }
        }
        
        .dropdown-arrow {
          width: 14px;
          height: 14px;
          color: var(--text-secondary);
          transition: transform 0.2s ease;
          
          &.rotate {
            transform: rotate(180deg);
          }
          
          @media (max-width: 768px) {
            display: none;
          }
        }
      }
    }
  }

  // Profile dropdown menu styling
  .profile-dropdown-wrapper {
    position: relative;

    .profile-dropdown-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      left: -100px;
      right: auto;
      min-width: 240px;
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 0px;
      box-shadow: 0 4px 16px var(--shadow-strong);
      z-index: 1000;
      overflow: hidden;
      animation: dropdownFadeIn 0.2s ease;

      .profile-info {
        padding: 1rem 1rem 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-family: Helvetica;

        .profile-avatar-large {
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #e5e7eb;
          background-color: var(--bg-secondary);

          .profile-image-large {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .avatar-icon-large {
            width: 1.5rem;
            height: 1.5rem;
            color: #6b7280;
          }
        }

        .profile-text {
          flex: 1;
          min-width: 0;

          .profile-name {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .profile-role {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.125rem;
          }

          .profile-location {
            font-size: 0.75rem;
            color: #9ca3af;
            margin-top: 0.125rem;
          }
        }
      }

      .dropdown-divider {
        height: 1px;
        background-color: var(--border-color);
        margin: 0;
      }

      .dropdown-item {
        width: 100%;
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        text-align: left;
        color: var(--text-primary);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 0.75rem;

        svg {
          flex-shrink: 0;
        }

        &:hover {
          background-color: var(--bg-secondary);
        }

        &.logout-item {
          color: #dc3545;

          &:hover {
            background-color: rgba(220, 53, 69, 0.1);
          }

          svg {
            stroke: #dc3545;
          }
        }
      }
    }
  }
}

// ============================================================================
// ICON-ONLY LEFT SIDEBAR
// ============================================================================

.icon-sidebar {
  grid-area: sidebar;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0;
  border-right: 1px solid var(--border-color);
  z-index: 90;
  width: 60px;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
  
  &.expanded {
    width: 260px;
  }
  
  // Mobile menu responsiveness
  @media (max-width: 768px) {
    position: fixed;
    left: -60px;
    top: var(--pwc-header-height);
    height: calc(100vh - var(--pwc-header-height));
    transition: left 0.3s ease, width 0.3s ease;
    
    &.mobile-open {
      left: 0;
    }
    
    &.expanded {
      left: 0;
      width: 260px;
    }
  }
  
  .sidebar-header {
    width: 60px;
    padding: 0.65rem;
    display: flex;
    justify-content: center;
    border-bottom: 1px solid var(--border-color);
    position: relative; // ← Add this
    z-index: 10; 

    // Create full-width border with pseudo-element
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: -100vw;
    right: -100vw;
    height: 1px;
    background-color: var(--border-color);
  }
    
    .sidebar-toggle-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0px;
      color: var(--text-secondary);
      transition: background-color 0.2s;
      
      &:hover {
        background-color: var(--bg-hover);
        color: var(--text-primary);
      }
    }
  }
  
  .icon-nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    padding: 1rem 0.5rem;
    flex: 1;
  }

  /* thin full-bleed separators used inside the icon-sidebar */
  .sidebar-separator {
    height: 1px;
    background-color: var(--border-color);
    width: 100vw;
    position: relative;
    left: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
    opacity: 0.9;
  }
  
  .icon-nav-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.75rem;
    border-radius: 0px;
    color: #374151;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    white-space: nowrap;
    width: 100%;
    
    &.hidden {
      display: none;
    }
    
    .nav-label {
      font-size: 14px;
      color: #374151;
      font-weight: 550;
      opacity: 0;
      width: 0;
      overflow: hidden;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    
    &:hover {
      background-color: var(--bg-hover);
      color: var(--text-primary);
    }
    
    &.active {
      //background-color: var(--pwc-orange);
      background-color: #FFF7ED;
      color: #FFFFFF;
      
      .nav-label {
        color: #C2410C;
      }
      
      .nav-label .label-line {
        color: #C2410C !important;
      }
      
      svg {
        color: #C2410C;
      }
      
      &::before {
        content: '';
        position: absolute;
        left: -0.5rem;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 24px;
        background-color: var(--pwc-orange);
        border-radius: 0 2px 2px 0;
      }
    }
  }

  
  
  &.expanded .icon-nav-btn .nav-label {
    opacity: 1;
  width: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  
  .label-line {
    text-align: left;
    width: 100%;
    font-size: 14px;
    color: #374151;
    font-weight: 550;
  }
  white-space: normal;
  word-break: break-word;
  text-align: center;
  line-height: 1.1;
  }
  
  .icon-nav-footer {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    padding: 0 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }
  
  .theme-toggle-mini {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .sidebar-copyright {
    margin-top: auto;
    padding: 1rem 0.75rem;
    text-align: center;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100vw;
    position: relative;
    left: 50%;
    right: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
    border-top: 1px solid var(--border-color);
    
    p {
      margin: 0;
      font-size: 0.625rem;
      color: var(--text-secondary);
      line-height: 1.2;
      font-weight: 400;
    }
  }
  
  &.expanded .sidebar-copyright {
    opacity: 1;
    max-height: 200px;
  }
}

// ============================================================================
// CHAT HISTORY PANEL
// ============================================================================

.history-panel {
  position: fixed;
  right: -350px;
  top: var(--pwc-header-height);
  width: 350px;
  height: calc(100vh - var(--pwc-header-height));
  background-color: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  box-shadow: -2px 0 8px var(--shadow);
  z-index: 95;
  transition: right 0.3s ease;
  display: flex;
  flex-direction: column;
  
  &.show {
    right: 0;
  }
  
  .history-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .close-history-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.375rem;
      border-radius: 0px;
      color: var(--text-secondary);
      transition: all 0.2s;
      
      &:hover {
        background-color: var(--bg-tertiary);
        color: var(--text-primary);
      }
    }
  }
  
  .history-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .history-search {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    position: relative;
    
    .search-icon {
      position: absolute;
      left: 2rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      pointer-events: none;
    }
    
    .history-search-input {
      width: 100%;
      padding: 0.625rem 0.875rem 0.625rem 2.25rem;
      border: 1px solid var(--border-color);
      border-radius: 0px;
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.875rem;
      
      &::placeholder {
        color: var(--text-secondary);
      }
      
      &:focus {
        outline: none;
        border-color: var(--pwc-orange);
      }
    }
  }
  
  .history-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }
  
  .history-item {
    width: 100%;
    background: none;
    border: none;
    padding: 0.875rem 1rem;
    border-radius: 0px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.375rem;
    
    &:hover {
      background-color: var(--bg-tertiary);
      
      .history-item-delete {
        opacity: 1;
      }
    }
    
    .history-item-content {
      flex: 1;
      min-width: 0;
    }
    
    .history-item-title {
      margin: 0 0 0.25rem 0;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .history-item-date {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    
    .history-item-delete {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.375rem;
      border-radius: 0px;
      color: var(--text-secondary);
      opacity: 0;
      transition: all 0.2s;
      flex-shrink: 0;
      
      &:hover {
        background-color: rgba(208, 74, 2, 0.1);
        color: var(--pwc-orange);
      }
    }
  }
  
  .history-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
    text-align: center;
    color: var(--text-secondary);
    
    svg {
      margin-bottom: 1rem;
      opacity: 0.5;
    }
    
    p {
      margin: 0 0 0.375rem 0;
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    span {
      font-size: 0.875rem;
    }
  }
  
  @media (max-width: 768px) {
    width: 100%;
    right: -100%;
  }
}

// ============================================================================
// MCX AI BANNER
// ============================================================================

.mcx-banner {
  background: linear-gradient(135deg, #FFE8DC 0%, #FFD4C4 100%);
  border-radius: 0px;
  margin: 1rem 1.5rem;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px var(--shadow);
  position: relative;
  overflow: hidden;
  min-height: 125px;
  
  @media (max-width: 768px) {
    margin: 0.5rem 1rem;
    padding: 0.75rem 1rem;
    min-height: 65px;
    top: 0.5vh;
  }

  @media (max-width: 480px) {
    margin: 0.5rem 0.75rem;
    padding: 0.65rem 0.85rem;
    min-height: 55px;
    top: 0.5vh;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    right: 0;
    width: 100%;
    height: 100%;
    transform: translateY(-50%);
    background-image: url('/assets/images/pwc-banner.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center right;
    z-index: 1;
    opacity: 1;
    
    @media (max-width: 768px) {
      background-size: contain;
      background-position: right center;
    }
    
    @media (max-width: 480px) {
      opacity: 0.6;
    }
  }
  
  .banner-content {
    position: relative;
    z-index: 2;
    
    .banner-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: black;
      margin: 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
      word-break: normal;
      overflow-wrap: break-word;
      word-wrap: break-word;
      max-width: 100%;
      
      @media (max-width: 1150px) {
        max-width: 60%;
        word-break: normal;
        overflow-wrap: normal;
      }
      
      @media (max-width: 768px) {
        font-size: 1.1rem;
        line-height: 1.4;
        max-width: 60%;
        word-break: normal;
        overflow-wrap: break-word;
      }
      
      @media (max-width: 480px) {
        font-size: 0.95rem;
        line-height: 1.4;
        max-width: 55%;
        word-break: normal;
        overflow-wrap: break-word;
      }
    }
    
    // Dark theme override
    :host-context(.dark) .banner-title {
      color: white;
    }
  }
  
  .banner-image {
    display: none;
  }
}

// ============================================================================
// MAIN CONTENT
// ============================================================================

.main-content {
  grid-area: main;
  background-color: var(--bg-secondary);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    width: 100%;
  }
}

// OLD SIDEBAR (HIDDEN - KEEPING FOR REFERENCE)
.sidebar {
  display: none; // Hidden - using new icon sidebar instead
  width: var(--sidebar-width);
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
  
  // Custom scrollbar
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
    
    &:hover {
      background: var(--text-secondary);
    }
  }
}

.sidebar-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  
  .logo-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    border-radius: 0px;
    transition: opacity 0.2s ease;
    
    &.inline {
      flex-direction: row;
      align-items: center;
      gap: 0.75rem;
    }
    
    &:hover {
      opacity: 0.8;
    }
    
    &:focus-visible {
      outline: 2px solid var(--pwc-orange);
      outline-offset: 2px;
    }
  }
  
  .pwc-logo {
    height: 75px;
    max-width: 100%;
    display: block;
    
    @media (max-width: 768px) {
      height: 60px;
    }
  }
  
  .ai-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--pwc-orange);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    
    &.inline {
      font-size: 1.125rem;
    }
  }
}

.sidebar-search {
  padding: 1rem 1.5rem;
  position: relative;
  
  input {
    width: 100%;
    padding: 0.625rem 2.5rem 0.625rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0px;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
    
    &:focus {
      outline: none;
      border-color: var(--pwc-orange);
    }
  }
  
  svg {
    position: absolute;
    right: 2.25rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    pointer-events: none;
  }
}

.sidebar-nav {
  padding: 0.5rem 0.75rem;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-radius: 0px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  text-align: left;
  
  &.hidden {
    display: none;
  }
  
  .nav-item-content {
    width: 100%;
  }
  
  .nav-item-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    svg {
      flex-shrink: 0;
      color: var(--text-secondary);
    }
    
    span {
      font-weight: 500;
    }
  }
  
  .nav-item-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0.375rem 0 0 2rem;
    line-height: 1.3;
  }
  
  &:hover {
    background-color: var(--bg-tertiary);
  }
  
  &.active {
    background-color: var(--pwc-orange);
    color: #ffffff;
    
    svg {
      color: #ffffff;
    }
    
    .nav-item-description {
      color: rgba(255, 255, 255, 0.9);
    }
  }
}

.sidebar-section {
  flex: 1;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.section-header {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: 0rem;
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background-color: var(--bg-tertiary);
    color: var(--pwc-orange);
    transform: translateX(2px);
    
    .delete-session-btn {
      opacity: 1;
    }
  }
  
  &.active {
    background-color: rgba(208, 74, 2, 0.1);
    color: var(--pwc-orange);
    font-weight: 500;
  }
  
  &:focus-visible {
    outline: 2px solid var(--pwc-orange);
    outline-offset: 2px;
  }
  
  .history-icon {
    color: var(--text-secondary);
    flex-shrink: 0;
    transition: color 0.2s ease;
  }
  
  .history-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.delete-session-btn {
  opacity: 0;
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    background-color: rgba(220, 53, 69, 0.1);
    color: #dc3545;
  }
  
  &:focus-visible {
    opacity: 1;
    outline: 2px solid var(--pwc-orange);
    outline-offset: 2px;
  }
}

.empty-history {
  padding: 1rem 0;
  text-align: center;
  
  p {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
  }
}

.sidebar-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.profile-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 0px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  
  svg {
    color: var(--text-secondary);
  }
  
  &:hover {
    border-color: var(--pwc-orange);
    background-color: rgba(208, 74, 2, 0.05);
  }
}

// Mobile Overlay
.mobile-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.2s ease;
  
  @media (max-width: 768px) {
    display: block;
  }
}

// Main Content
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  position: relative;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  flex-shrink: 0;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
    flex: 1;
    
    .mobile-menu-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: none;
      border: none;
      border-radius: 0px;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
      
      &:hover {
        background-color: var(--bg-secondary);
      }
      
      &:active {
        background-color: var(--bg-tertiary);
      }
      
      @media (max-width: 768px) {
        display: flex;
      }
    }
    
    .page-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
      
      .title-text {
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .title-description {
        font-size: 0.75rem;
        font-weight: 400;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
}

.theme-toggle-compact {
  display: flex;
  gap: 0.25rem;
  background-color: var(--bg-secondary);
  border-radius: 0px;
  padding: 0.25rem;
}

.theme-btn-compact {
  padding: 0.375rem 0.5rem;
  background: none;
  border: none;
  border-radius: 0px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
  
  &.active {
    background-color: var(--bg-primary);
    color: var(--pwc-orange);
    box-shadow: 0 1px 3px var(--shadow);
  }
}

// Content Area
.content-area {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-left: 24px;
  margin-right: 24px;
}

// Welcome Screen Layout
.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2rem 1.5rem 0.75rem;
  gap: 1rem;
  /* Prevent flex: 1 on mobile */
  @media (max-width: 768px) {
    flex: unset !important;
    padding: 1rem 1rem 0.5rem !important;
  }
  @media (max-width: 480px) {
    flex: unset !important;
    padding: 0.75rem 0.75rem 0.5rem !important;
  }
}

// Quick Action Dropdowns
.quick-action-dropdowns {
  display: flex;
  gap: 0.75rem;
  width: 100%;
  max-width: var(--chat-max-width);
  margin: 0 auto;
  justify-content: center;
  padding: 0 1rem;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.25rem;
    padding: 0 0.75rem;
    width: 100%;
    max-width: 100%;
    align-items: stretch;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.15rem;
    padding: 0 0.5rem;
    width: 100%;
    max-width: 100%;
    align-items: stretch;
  }

  &.ddc-actions {
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;

    @media (max-width: 768px) {
      gap: 0.4rem;
      align-items: stretch;
      padding: 0 0.75rem;
    }

    @media (max-width: 480px) {
      gap: 0.2rem;
      align-items: stretch;
      padding: 0 0.5rem;
    }
  }

  &.tl-actions {
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;

    @media (max-width: 768px) {
      gap: 0.4rem;
      align-items: stretch;
      padding: 0 0.75rem;
    }

    @media (max-width: 480px) {
      gap: 0.2rem;
      align-items: stretch;
      padding: 0 0.5rem;
    }
  }

  &.mi-actions {
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;

    @media (max-width: 768px) {
      gap: 0.4rem;
      align-items: stretch;
      padding: 0 0.75rem;
    }

    @media (max-width: 480px) {
      gap: 0.2rem;
      align-items: stretch;
      padding: 0 0.5rem;
    }
  }
}

.quick-action-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 0.5rem;
  width: 75%;

  @media (max-width: 1024px) {
    width: 85%;
    gap: 0.4rem;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    gap: 0.35rem;
    padding: 0;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
    gap: 0.3rem;
    padding: 0;
  }
}

.button-wrapper {
  flex: 0 0 325px;
  max-width: 325px;
  width: 325px;
  display: flex;
  justify-content: center;
  
  @media (max-width: 1600px) {
    flex: 1 1 220px;
    max-width: 100%;
    width: 100%;
  }

  @media (max-width: 768px) {
    flex: 1;
    max-width: 100%;
    width: 100%;
    min-height: 40px;
  }

  @media (max-width: 480px) {
    flex: 1;
    max-width: 100%;
    width: 100%;
    min-height: 38px;
  }
}

.button-wrapper-tl {
  flex: 0 0 225px;
  max-width: 225px;
  width: 225px;
  display: flex;
  justify-content: center;
  
  @media (max-width: 1100px) {
    flex: 1 1 200px;
    max-width: 100%;
    width: 100%;
  }

  @media (max-width: 768px) {
    flex: 1;
    max-width: 100%;
    width: 100%;
    min-height: 40px;
  }

  @media (max-width: 480px) {
    flex: 1;
    max-width: 100%;
    width: 100%;
    min-height: 38px;
  }
}

.button-wrapper-mi {
  flex: 0 0 275px;
  max-width: 275px;
  width: 275px;
  display: flex;
  justify-content: center;
  
  @media (max-width: 1100px) {
    flex: 1 1 220px;
    max-width: 100%;
    width: 100%;
  }

  @media (max-width: 768px) {
    flex: 1;
    max-width: 100%;
    width: 100%;
    min-height: 40px;
  }

  @media (max-width: 480px) {
    flex: 1;
    max-width: 100%;
    width: 100%;
    min-height: 38px;
  }
}

.dropdown-wrapper {
  position: relative;
  flex: 1;
  max-width: 280px;
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
}

.dropdown-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  background-color: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary);
  font-size: 0.9375rem;
  font-weight: 500;
  min-width: 0;
  height: 45px;
  
  .btn-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--pwc-orange);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
      color: #ffffff;
      width: 18px;
      height: 18px;
    }
  }
  
  .btn-label {
    flex: 1;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    
    .chevron {
      color: var(--text-secondary);
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }
    
    &.open {
      border-color: var(--pwc-orange);
      background-color: rgba(208, 74, 2, 0.05);
      
      .chevron {
        transform: rotate(180deg);
      }
    }
    
    &:hover {
      border-color: var(--pwc-orange);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px var(--shadow);
    }
    
    &:focus {
      outline: 2px solid var(--pwc-orange);
      outline-offset: 2px;
    }
    
    &:disabled,
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      
      &:hover {
        border-color: var(--border-color);
        transform: none;
        box-shadow: none;
      }
      
      &:focus {
        outline: none;
      }
    }
  }
  
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 0px;
    box-shadow: 0 4px 16px var(--shadow-strong);
    z-index: 100;
    overflow: hidden;
    animation: dropdownFadeIn 0.2s ease;
  }
  
  .dropdown-item {
    width: 100%;
    padding: 0.875rem 1.25rem;
    background: none;
    border: none;
    text-align: left;
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
    border-bottom: 1px solid var(--border-color);
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background-color: rgba(208, 74, 2, 0.08);
      color: var(--pwc-orange);
    }
    
    &:active {
      background-color: rgba(208, 74, 2, 0.12);
    }
  }

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Quick Action Cards (Legacy - keeping for backward compatibility)
.quick-action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  
  .action-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.5rem 1rem;
    background-color: var(--bg-primary);
    border: 1.5px solid var(--border-color);
    border-radius: 0px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 120px;
    
    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: var(--pwc-orange);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      
      svg {
        color: #ffffff;
      }
    }
    
    .card-title {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--text-primary);
      text-align: center;
    }
    
    &:hover {
      border-color: var(--pwc-orange);
      box-shadow: 0 4px 12px var(--shadow);
      transform: translateY(-2px);
      
      .card-icon {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(208, 74, 2, 0.3);
      }
    }
    
    &.compact {
      padding: 1rem 0.875rem;
      min-height: 100px;
      gap: 0.625rem;
      
      .card-icon {
        width: 40px;
        height: 40px;
      }
      
      .card-title {
        font-size: 0.8125rem;
      }
    }
  }
}


// Quick Action Buttons Grid for DDC Workflows
.quick-action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  width: 100%;
  max-width: var(--chat-max-width);
  margin: 0 auto;
  padding: 0 1rem;
 
  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
  }
 
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
 
  .workflow-action-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background-color: var(--bg-primary);
    border: 1.5px solid var(--border-color);
    border-radius: 0px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 500;
 
    .btn-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }
 
    .btn-label {
      flex: 1;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
 
    &:hover {
      border-color: var(--pwc-orange);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px var(--shadow);
      background-color: rgba(208, 74, 2, 0.03);
    }
 
    &:active {
      transform: translateY(0);
    }
 
    &:focus {
      outline: 2px solid var(--pwc-orange);
      outline-offset: 2px;
    }
  }
}

// Welcome Center (Centered Conversation Starter)
.welcome-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: var(--chat-max-width);
  margin: 0 auto;
  width: 100%;
  padding: 0.75rem 1rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.5rem 0.75rem;
  }
}

.welcome-message {
  text-align: center;
  margin-top: 3rem;
  padding-top: 1.5rem;
  
  h2 {
    font-size: 1.95rem;
    font-weight: 600;
    margin: 0 0 0.65rem 0;
    color: var(--text-primary);
  }
  
  p {
    font-size: 1.1375rem;
    color: var(--text-secondary);
    margin: 0;
  }
  
  @media (max-width: 768px) {
    margin-top: 2.5rem;
    padding-top: 1.25rem;
    
    h2 {
      font-size: 1.7875rem;
    }
    
    p {
      font-size: 1.05625rem;
    }
  }
  
  @media (max-width: 480px) {
    margin-top: 1.5rem;
    padding-top: 0.75rem;
    
    h2 {
      font-size: 1.25rem;
    }
    
    p {
      font-size: 0.75rem;
    }
  }
}

.top-action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  width: 100%;
  padding: 0 1rem;
  box-sizing: border-box;
  
  @include sm {
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 100%;
    padding: 0 1rem;
    margin-bottom: 1rem;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.4rem;
    width: 100%;
    max-width: 100%;
    padding: 0 0.75rem;
    margin-bottom: 0.75rem;
  }
}

.top-action-btn {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  min-height: 115px;
  min-width: 196px;
  background-color: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: 0px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  box-shadow: 0 2px 8px var(--shadow);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  
  @include sm {
    min-width: unset;
    width: 100%;
    padding: 0.85rem 1rem;
    min-height: 85px;
  }

  @media (max-width: 480px) {
    min-width: unset;
    width: 100%;
    padding: 0.75rem 0.85rem;
    min-height: 75px;
    gap: 0.6rem;
    border-radius: 0px;
  }
  
  // Quick Start - Orange Solid
  &.primary {
    width: 500px;
    background: linear-gradient(135deg, var(--pwc-orange) 0%, #E85C14 100%);
    border-color: var(--pwc-orange);
    color: white;
    box-shadow: 0 4px 12px rgba(208, 74, 2, 0.25);

    @media (max-width: 480px) {
      width: 100%;
    }
    
    .btn-heading,
    .btn-description {
      color: white;
    }
    
    .btn-icon-badge {
      background: rgba(255, 255, 255, 0.2);
      
      svg {
        color: white;
      }
    }
    
    &:hover {
      background: linear-gradient(135deg, #B63E00 0%, #fd5108 100%);
      box-shadow: 0 8px 24px rgba(208, 74, 2, 0.35);
      transform: translateY(-2px);
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: 0 4px 12px rgba(208, 74, 2, 0.25);
    }
    
    &:focus-visible {
      outline: 2px solid white;
      outline-offset: 2px;
      box-shadow: 0 4px 12px rgba(208, 74, 2, 0.25), 0 0 0 4px rgba(208, 74, 2, 0.3);
    }
  }
  
  // Guided Journey - Light Card with Orange Border
  &.guided {
    width: 500px;
    background-color: var(--card-bg);
    border-color: var(--pwc-orange);
    border-width: 2px;
     @media (max-width: 480px) {
      width: 100%;
    }
    .btn-icon-badge {
      background: rgba(208, 74, 2, 0.1);
      
      svg {
        color: var(--pwc-orange);
      }
    }
    
    .btn-heading {
      color: var(--text-primary);
    }
    
    .btn-description {
      color: var(--text-secondary);
    }
    
    &:hover {
      background: linear-gradient(135deg, rgba(208, 74, 2, 0.05) 0%, rgba(232, 92, 20, 0.08) 100%);
      border-color: #E85C14;
      box-shadow: 0 8px 20px var(--shadow-strong);
      transform: translateY(-2px);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    &:focus-visible {
      outline: 2px solid var(--pwc-orange);
      outline-offset: 2px;
      box-shadow: 0 2px 8px var(--shadow), 0 0 0 4px rgba(208, 74, 2, 0.2);
    }
  }
  
  .btn-icon-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    min-width: 48px;
    border-radius: 0px;
    background: rgba(208, 74, 2, 0.1);
    flex-shrink: 0;
    
    @include sm {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: 0px;
      
      svg {
        width: 20px;
        height: 20px;
      }
    }
    
    svg {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
  }
  
  .btn-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    min-width: 0;
  }
  
  .btn-heading {
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.3;
    margin: 0;
    color: var(--text-primary);
    
    @include sm {
      font-size: 1rem;
    }
  }
  
  .btn-description {
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
    
    @include sm {
      font-size: 0.875rem;
    }
  }
  
  &:hover {
    border-color: var(--pwc-orange);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--shadow);
  }
  
  &:focus {
    outline: 2px solid var(--pwc-orange);
    outline-offset: 2px;
  }
  
  @media (max-width: 768px) {
    min-width: unset;
    padding: 0.875rem 1.25rem;
    
    .btn-header span {
      font-size: 0.875rem;
    }
    
    .btn-description {
      font-size: 0.75rem;
    }
  }
}

// Prompt Shelf (replacing Popular Actions)
.prompt-shelf {
  padding: 2rem;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

.prompt-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  max-width: var(--chat-max-width);
  margin: 0 auto;
}

.prompt-category-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 0px;
  color: var(--text-primary);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  .category-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, var(--pwc-orange) 0%, var(--pwc-orange-light) 100%);
    border-radius: 0px;
    
    svg {
      color: #ffffff;
    }
  }
  
  &:hover {
    border-color: var(--pwc-orange);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px var(--shadow-strong);
  }
}

// Prompt Suggestions (Sub-prompts)
.prompt-suggestions {
  padding: 2rem;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: var(--chat-max-width);
  margin: 0 auto 1.5rem auto;
  
  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }
}

.close-suggestions {
  padding: 0.5rem;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 0px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--pwc-orange);
    color: var(--pwc-orange);
  }
}

.suggestion-list {
  display: grid;
  gap: 0.75rem;
  max-width: var(--chat-max-width);
  margin: 0 auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 0px;
  color: var(--text-primary);
  font-size: 0.9375rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  
  svg {
    flex-shrink: 0;
    color: var(--pwc-orange);
  }
  
  &:hover {
    border-color: var(--pwc-orange);
    background-color: rgba(208, 74, 2, 0.05);
    transform: translateX(4px);
  }
}

// Chat Area (Claude.ai-inspired)
.chat-area {
  background-color: var(--bg-primary);
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 2rem;
}

.messages-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  overflow-y: auto;
  padding: 2rem;
  scroll-behavior: smooth;
  
  // Custom scrollbar
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 0px;
    
    &:hover {
      background: var(--text-secondary);
    }
  }
}

.message {
  display: flex;
  animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  
  &.user-message {
    justify-content: flex-end;
    
    .message-content {
      display: flex;
      max-width: 75%;
      width: auto;
    }
    
    .message-bubble {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      width: 100%;
      max-width: 100%;
      transition: all 0.2s ease;
      word-wrap: break-word;
      overflow-wrap: break-word;
      
      &:hover {
        border-color: var(--pwc-orange);
        box-shadow: 0 2px 8px var(--shadow);
      }
    }
  }
  
  &.assistant-message {
    justify-content: flex-start;
    
    .message-content {
      display: flex;
      gap: 1rem;
      max-width: 100%;
      width: 100%;
    }
    
    .message-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--pwc-orange) 0%, var(--pwc-orange-light) 100%);
      color: #ffffff;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(208, 74, 2, 0.2);
      margin-right: -1.0rem; /* space between avatar and content for left-aligned assistant messages */
      margin-top: .65rem;
    }
    
    .message-bubble {
      flex: 1;
      min-width: 0;
    }
  }
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-bubble {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  box-sizing: border-box;
}

/* Typing dots - positioned at top-left inside message bubble */
.processing-container {
  display: flex !important;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.75rem;
  width: fit-content;
}

.processing-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.typing-dots {
  display: flex !important;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
  z-index: 100 !important;
  position: relative;
  width: fit-content;
  padding: 0.5rem 0.1rem;
  
  span {
    width: 10px;
    height: 10px;
    background: linear-gradient(135deg, var(--pwc-orange) 0%, var(--pwc-orange-light) 100%) !important;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
    flex-shrink: 0;
    display: inline-block;
    
    &:nth-child(1) {
      animation-delay: -0.32s;
    }
    
    // &:nth-child(2) {
    //   animation-delay: -0.16s;
    // }
    
    // &:nth-child(3) {
    //   animation-delay: 0s;
    // }
  }
}

.message-text {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: normal;
  hyphens: none;
  overflow-wrap: break-word;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  position: relative;

  
  // Heading styles - Helvetica Neue font family
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-weight: 600;
    color: var(--text-primary);
    margin: 1.5rem 0 0.75rem 0;
    line-height: 1.3;
  }
  
  h1 {
    font-size: 2rem;
    margin-top: 2rem;
  }
  
  h2 {
    font-size: 1.75rem;
  }
  
  h3 {
    font-size: 1.5rem;
  }
  
  h4 {
    font-size: 1.25rem;
  }
  
  h5 {
    font-size: 1.125rem;
  }
  
  h6 {
    font-size: 1rem;
  }
  
  // Paragraph and body text - Helvetica Neue font family
  // Use tight margins (match Word/PDF export) to avoid large gaps in citations/references
  p {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 1rem;
    line-height: 1.6;
    margin: 0.15em 0 0.5em 0;
    color: var(--text-primary);
  }

  // Long URLs (e.g. in citations) - wrap inside container to avoid overflow and awkward line breaks
  a {
    word-break: break-all;
    overflow-wrap: anywhere;
  }
  
  // Source citation links (like Perplexity style) - styled as badges
  .source-citation {
    display: inline-flex;
    align-items: center;
    position: relative;
    text-decoration: none !important;
    margin: 0 3px;
    vertical-align: middle;
    
    .source-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 8px;
      background: linear-gradient(135deg, var(--pwc-orange) 0%, var(--pwc-orange-light) 100%);
      color: white;
      border-radius: 0px;
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(208, 74, 2, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    // Hide the tooltip content initially (only show on hover)
    .source-title-tooltip {
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%) translateY(-4px);
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 0px;
      padding: 14px 16px;
      min-width: 300px;
      max-width: 420px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      opacity: 0;
      visibility: hidden;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1000;
      pointer-events: none;
      white-space: normal;
      backdrop-filter: blur(10px);
      
      .tooltip-title {
        display: block;
        font-weight: 600;
        color: var(--text-primary);
        font-size: 0.875rem;
        margin-bottom: 6px;
        line-height: 1.4;
        word-wrap: break-word;
      }
      
      .tooltip-url {
        display: block;
        color: var(--text-secondary);
        font-size: 0.75rem;
        word-break: break-all;
        line-height: 1.4;
        font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
        opacity: 0.8;
      }
      
      // Arrow pointing down
      &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 8px solid transparent;
        border-top-color: var(--card-bg);
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }
      
      &::before {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 9px solid transparent;
        border-top-color: var(--border-color);
        margin-top: -1px;
      }
    }
    
    &:hover {
      .source-number {
        background: linear-gradient(135deg, var(--pwc-orange-light) 0%, var(--pwc-orange) 100%);
        transform: translateY(-1px) scale(1.05);
        box-shadow: 0 4px 8px rgba(208, 74, 2, 0.3);
      }
      
      .source-title-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(0);
      }
    }
    
    &:active {
      .source-number {
        transform: translateY(0) scale(0.98);
        box-shadow: 0 1px 2px rgba(208, 74, 2, 0.2);
      }
    }
    
    // Accessibility
    &:focus {
      outline: 2px solid var(--pwc-orange);
      outline-offset: 3px;
      border-radius: 0px;
      
      .source-number {
        box-shadow: 0 0 0 2px rgba(208, 74, 2, 0.3);
      }
    }
  }
  
  // Better code block styling if any
  code {
    background-color: var(--bg-tertiary);
    padding: 0.125rem 0.375rem;
    border-radius: 0px;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    word-break: break-all;
  }
  
  // Code blocks (pre + code)
  pre {
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    background-color: var(--bg-tertiary);
    padding: 1rem;
    border-radius: 0px;
    overflow-x: auto;
    margin: 1rem 0;
    
    code {
      background-color: transparent;
      padding: 0;
      font-size: inherit;
    }
  }
  
  // Better list styling - Helvetica Neue font
  ul, ol {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 1rem;
    margin: 0.75rem 0;
    padding-left: 1.5rem;
    line-height: 1.6;
  }
  
  li {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 1rem;
    margin: 0.5rem 0;
    line-height: 1.6;
  }
  
  // Bold text
  strong {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  // Italic text
  em {
    font-style: italic;
  }
  
  // Blockquote
  blockquote {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 1rem;
    border-left: 4px solid var(--pwc-orange);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--text-secondary);
    font-style: italic;
  }
  
  // Links
  a {
    color: var(--pwc-orange);
    text-decoration: underline;
    
    &:hover {
      color: var(--pwc-orange-light);
    }
  }
  
  // Tables
  table {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 1rem;
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    
    th {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-weight: 600;
      background-color: var(--bg-tertiary);
      padding: 0.75rem;
      text-align: left;
      border: 1px solid var(--border-color);
    }
    
    td {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
    }
  }
  
  // Citations section - match edit-content.utils / PDF-Word export: 11pt, Helvetica/Arial, line-height 1.5
  .citations-section {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.5;

    h4 {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 11pt;
      font-weight: 600;
      color: var(--text-secondary);
      margin-top: 0;
      margin-bottom: 0.2em;
      line-height: 1.5;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .citation-item {
      margin-top: 0;
      margin-bottom: 0.5em;
      padding-left: 0.5rem;
      line-height: 1.5;
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 11pt;

      .citation-number {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-size: 11pt;
        font-weight: 600;
        color: var(--pwc-orange);
      }

      .citation-url {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: var(--text-secondary);
        word-break: break-all;
        display: block;
        margin-top: 0.15em;
      }
    }
  }
}

.action-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: rgba(208, 74, 2, 0.1);
  border-radius: 0px;
  margin-bottom: 1rem;
  
  .progress-icon {
    display: flex;
    align-items: center;
    
    .spinner {
      animation: spin 1s linear infinite;
      color: var(--pwc-orange);
    }
  }
  
  span {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
}

.message-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.action-buttons-container {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.action-option-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: 0px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid var(--pwc-orange);
  background-color: transparent;
  color: var(--pwc-orange);
  
  &:hover {
    background: linear-gradient(135deg, var(--pwc-orange) 0%, var(--pwc-orange-light) 100%);
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(208, 74, 2, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  svg {
    flex-shrink: 0;
  }
  
  &.download-btn {
    background: linear-gradient(135deg, var(--pwc-orange) 0%, var(--pwc-orange-light) 100%);
    color: #ffffff;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(208, 74, 2, 0.3);
    }
  }

  &.word-btn {
    background: linear-gradient(135deg, #2b579a 0%, #1e3f6b 100%);
    color: #ffffff;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(43, 87, 154, 0.3);
    }
  }

  &.pdf-btn {
    background: linear-gradient(135deg, #b23121 0%, #8b2418 100%);
    color: #ffffff;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(178, 49, 33, 0.3);
    }
  }

  &.copy-btn {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    
    &:hover {
      background-color: var(--bg-primary);
      border-color: var(--pwc-orange);
      color: var(--pwc-orange);
    }

    &.copied {
      background-color: #10b981;
      border-color: #059669;
      color: #ffffff;
      animation: copyPulse 0.5s ease-out;

      svg {
        animation: scaleIn 0.3s ease-out;
      }

      .check-icon {
        animation: checkMark 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
    }
  }

  &.regenerate-btn {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    
    &:hover {
      background-color: var(--bg-primary);
      border-color: var(--pwc-orange);
      color: var(--pwc-orange);
      animation: spin 0.6s linear;
    }
  }

  &.tl-final-output-btn {
    background: linear-gradient(135deg, var(--pwc-teal) 0%, #059669 100%);
    color: #ffffff;
    padding: 0.5rem 1rem;
    border-radius: 0px;
    font-weight: 700;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(5, 150, 105, 0.2);
    }
  }
  
  &.preview-btn {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    
    &:hover {
      background-color: var(--bg-primary);
      border-color: var(--pwc-orange);
      color: var(--pwc-orange);
    }
  }
  &.btn-canvas {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
   
    &:hover {
      background-color: var(--bg-primary);
      border-color: var(--pwc-orange);
      color: var(--pwc-orange);
    }
  }
  &.btn-export {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    
    &:hover:not(.exporting):not(.exported) {
      background-color: var(--bg-primary);
      border-color: var(--pwc-orange);
      color: var(--pwc-orange);
    }
    
    &.exporting {
      background-color: var(--bg-tertiary);
      color: var(--pwc-orange);
      border-color: var(--pwc-orange);
      cursor: not-allowed;
      opacity: 0.8;
      
      .export-spinner {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        
        svg {
          animation: spin 1s linear infinite;
        }
      }
    }
    
    &.exported {
      background-color: #10b981;
      border-color: #059669;
      color: white;
      
      svg {
        color: white;
      }
      
      &:hover {
        background-color: #059669;
      }
    }
  }
}

// Export Dropdown
.export-dropdown {
  position: relative;
  
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 160px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    overflow: hidden;
    
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.625rem 0.875rem;
      background: none;
      border: none;
      color: var(--text-primary);
      font-size: 0.8125rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      
      svg {
        flex-shrink: 0;
      }
      
      &:hover {
        background-color: var(--bg-hover);
        color: var(--pwc-orange);
      }
      
      &:not(:last-child) {
        border-bottom: 1px solid var(--border-color);
      }
    }
  }
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 0;
  margin-left: 100px;
  width: fit-content;
  
  .loading-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
}

// Chat Input
.chat-input-container {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  max-width: var(--chat-max-width);
  margin: 0 auto;
  width: 100%;
  
  textarea {
    flex: 1;
    padding: 1rem 1.25rem;
    border: 1px solid var(--border-color);
    border-radius: 0px;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-family: inherit;
    resize: none;
    max-height: 200px;
    min-height: 48px;
    
    &:focus {
      outline: none;
      border-color: var(--pwc-orange);
    }
    
    &::placeholder {
      color: var(--text-secondary);
    }
  }
  
  .send-btn {
    padding: 1rem;
    background: linear-gradient(135deg, var(--pwc-orange) 0%, var(--pwc-orange-light) 100%);
    border: none;
    border-radius: 0px;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(208, 74, 2, 0.3);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// Guided Journey Dialog
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.dialog-container {
  background-color: var(--card-bg);
  border-radius: 0px;
  max-width: 1200px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  
  @include sm {
    @include mobile-full-screen-dialog;
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  
  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }
}

.close-dialog-btn {
  padding: 0.5rem;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 0px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--pwc-orange);
    color: var(--pwc-orange);
  }
}

.dialog-content {
  padding: 1.5rem 2rem;
}

.tl-intro-text {
  margin-bottom: 1rem;
  font-size: 0.9375rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.mi-intro-text {
  margin-bottom: 0;
  margin-top: 0.5rem;
  font-size: 0.9375rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.tl-action-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.tl-action-card {
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: 0px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  
  &:hover {
    border-color: var(--pwc-orange);
    box-shadow: 0 4px 12px var(--shadow);
    transform: translateY(-2px);
  }
  
  .tl-card-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    display: block;
  }
  
  h3 {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.4rem 0;
  }
  
  p {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.3;
  }
}

.mi-action-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.mi-action-card {
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: 0px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  
  &:hover {
    border-color: var(--pwc-orange);
    box-shadow: 0 4px 12px var(--shadow);
    transform: translateY(-2px);
  }
  
  .mi-card-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    display: block;
  }
  
  h3 {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.4rem 0;
  }
  
  p {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.3;
  }
}

.form-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0;
}

.tab-btn {
  padding: 0.75rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--text-primary);
  }
  
  &.active {
    color: var(--pwc-orange);
    border-bottom-color: var(--pwc-orange);
  }
}

.form-content {
  animation: fadeIn 0.3s ease;
}

.form-field {
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }
  
  input[type="text"],
  input[type="url"],
  textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0px;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-family: inherit;
    transition: all 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: var(--pwc-orange);
      box-shadow: 0 0 0 3px rgba(208, 74, 2, 0.1);
    }
    
    &:hover:not(:focus) {
      border-color: var(--text-secondary);
    }
    
    &::placeholder {
      color: var(--text-secondary);
    }
    
    &.error {
      border-color: #dc3545;
      background-color: rgba(220, 53, 69, 0.05);
      
      &:focus {
        border-color: #dc3545;
        box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
      }
    }
  }
  
  textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  small {
    display: block;
    margin-top: 0.375rem;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    
    &.error-text {
      color: #dc3545;
      font-weight: 500;
      animation: fadeIn 0.2s ease;
    }
  }
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: 0px;
  border: 1px solid var(--border-color);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--bg-primary);
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--pwc-orange);
  }

  span {
    font-size: 0.875rem;
    color: var(--text-primary);
    user-select: none;
  }
}

.file-upload-area {
  .file-input-hidden {
    display: none;
  }
  
  .file-upload-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
    border: 2px dashed var(--border-color);
    border-radius: 0px;
    background-color: var(--bg-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    
    svg {
      color: var(--text-secondary);
    }
    
    span {
      font-size: 0.9375rem;
      color: var(--text-secondary);
      
      &.file-name {
        color: var(--pwc-orange);
        font-weight: 500;
      }
    }
    
    &:hover {
      border-color: var(--pwc-orange);
      background-color: rgba(208, 74, 2, 0.05);
    }
  }
}

.submit-btn {
  width: 100%;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--pwc-orange) 0%, var(--pwc-orange-light) 100%);
  color: #ffffff;
  border: none;
  border-radius: 0px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 0.5rem;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(208, 74, 2, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Animations
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
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes copyPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

@keyframes scaleIn {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes checkMark {
  0% {
    stroke-dasharray: 20;
    stroke-dashoffset: 20;
  }
  100% {
    stroke-dasharray: 20;
    stroke-dashoffset: 0;
  }
}

// Responsive
@media (max-width: 1024px) {
  :host {
    --sidebar-width: 240px;
  }
  
  .quick-action-dropdowns {
    gap: 0.75rem;
    
    .dropdown-wrapper {
      max-width: 280px;
    }
  }
  
  .top-action-buttons {
    flex-direction: column;
    width: 100%;
    max-width: 400px;
  }
  
  .top-action-btn {
    width: 100%;
  }
}

@media (max-width: 768px) {
  :host {
    --sidebar-width: 280px;
    --chat-max-width: 100%;
  }
  
  .sidebar {
    position: fixed;
    top: 0;
    left: -280px;
    bottom: 0;
    z-index: 1000;
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 2px 0 8px var(--shadow-strong);
    
    &.mobile-open {
      left: 0;
    }
  }
  
  .main-content {
    width: 100%;
  }
  
  .main-header {
    padding: 0.875rem 1rem;
    
    .header-left {
      gap: 0.75rem;
    }
    
    .page-title {
      font-size: 1rem !important;
      
      .title-text {
        max-width: 150px;
      }
      
      .title-description {
        font-size: 0.6875rem !important;
        display: none;
      }
    }
  }
  
  .main-content {
    height: 100vh;
    height: 100dvh; // Dynamic viewport height for mobile
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .content-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }
  
  .welcome-screen {
    flex: 1;
    padding: 1rem 1rem 0.5rem;
    gap: 1rem;
    justify-content: flex-start;
    overflow-y: auto;
    min-height: 0;
    -webkit-overflow-scrolling: touch;
  }
  
  .welcome-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    padding: 0.5rem;
  }
  
  .top-action-buttons {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 400px;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .top-action-btn {
    width: 100%;
    max-width: 400px;
    padding: 0.75rem 1rem;
  }
  
  .welcome-message {
    text-align: center;
    width: 100%;
    margin-bottom: 1rem;
    
    h2 {
      font-size: 1.95rem;
      margin-bottom: 0.65rem;
    }
    
    p {
      font-size: 1.1375rem;
    }
  }
  
  .quick-action-dropdowns {
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  .messages-wrapper {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem;
    gap: 1.5rem;
  }
  
  .message {
    &.user-message .message-content {
      max-width: 85%;
    }
  }
  
  .quick-action-cards {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .prompt-categories {
    grid-template-columns: 1fr;
  }
  
  .dialog-container {
    width: 95%;
    max-height: 95vh;
  }
  
  .chat-composer {
    margin-top: auto;
    padding: 0.5rem 0.875rem;
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    flex-shrink: 0;
    background-color: var(--bg-primary);
    border-top: 1px solid var(--border-color);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.2s ease;
    
    .composer-input-wrapper {
        @media (max-width: 480px) {
          .composer-textarea {
            margin-left: auto;
            margin-right: auto;
            display: block;
            margin-top: auto;
          }
        }
      padding: 0.5rem 0.75rem;
      border-radius: 0px;
    }
    
    &.expanded {
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
      
      .composer-input-wrapper {
        border: 1px solid var(--border-color-active, var(--border-color));
      }
    }
    @media (max-width: 768px) , (max-width: 480px) {
      position: static;
      left: unset;
      right: unset;
      bottom: unset;
      z-index: unset;
      margin-top: 0;
      width: 100%;
      background-color: var(--bg-secondary);
      border: none;
      box-shadow: none;
    }
  }
  
  .quick-action-dropdowns {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 1rem;
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
    margin-bottom: 8rem;
  }
  
  .dropdown-wrapper {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .main-header {
    padding: 0.75rem 0.875rem;
  }
  
  .welcome-screen {
    padding: 0.75rem 0.75rem 0.5rem;
    gap: 0.75rem;
  }
  
  .welcome-center {
    padding: 0.25rem;
  }
  
  .welcome-message {
    margin-bottom: 0.75rem;
    
    h2 {
      font-size: 1.625rem;
      margin-bottom: 0.325rem;
    }
    
    p {
      font-size: 1.05625rem;
    }
  }
  
  .top-action-buttons {
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  
  .top-action-btn {
    padding: 0.625rem 0.875rem;
  }
  
  .quick-action-dropdowns {
    padding: 0;
    max-width: 100%;
    gap: 0.5rem;
    margin-bottom: 10rem;
  }
  
  .dropdown-btn {
    padding: 0.625rem 0.875rem;
    font-size: 0.8125rem;
  }
  
  .messages-wrapper {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.75rem;
    gap: 1rem;
  }
  
  .message {
    &.user-message .message-content {
      max-width: 90%;
    }
  }
  
  .message-bubble {
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
  }
  
  .dialog-container {
    border-radius: 0px;
  }
  
  .dialog-content {
    padding: 1.5rem;
  }
  
  .form-field {
    margin-bottom: 1.25rem;
  }
  
  .top-action-buttons {
    gap: 0.75rem;
    width: 100%;
  }
  
  .top-action-btn {
    padding: 0.75rem 1rem;
    min-width: unset;
    width: 100%;
  }
  
  .welcome-message {
    h2 {
      font-size: 1.625rem;
    }
    
    p {
      font-size: 1.05625rem;
    }
  }
  
  .dropdown-btn {
    font-size: 0.875rem;
    padding: 0.75rem 1rem;
    
    .btn-icon {
      width: 32px;
      height: 32px;
      
      svg {
        width: 16px;
        height: 16px;
      }
    }
  }
  
  .theme-toggle-compact {
    scale: 0.9;
  }
  
  .chat-composer {
    padding: 0.75rem 1rem 0.75rem;
    width: 100%;
    position: static;
    left: unset;
    right: unset;
    bottom: unset;
    z-index: unset;
    box-shadow: none;
    border: none;
    transform: none;
    background-color: var(--bg-secondary);
  }
}


// Claude.ai-Inspired Chat Composer
.chat-composer {
  width: 100%;
  padding: 0.75rem 1.5rem 1rem;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0.75rem 1rem 0.75rem;
    width: 100%;
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0.75rem;
    width: 100%;
  }
  
  .composer-input-wrapper {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0px;
    transition: all 0.2s ease;
    box-sizing: border-box;
    width: 100%;

    @media (max-width: 768px) {
      padding: 0.425rem 0.75rem;
      border-radius: 0px;
      gap: 0.375rem;
    }

    @media (max-width: 480px) {
      padding: 0.35rem 0.625rem;
      border-radius: 0px;
      gap: 0.3rem;
    }
    
    &:focus-within {
      border-color: var(--pwc-orange);
      box-shadow: 0 0 0 2px rgba(208, 74, 2, 0.1);
    }
  }
  
  .composer-tools {
    display: flex;
    gap: 0.25rem;
    align-items: flex-start;
    padding-top: 0.125rem;

    @media (max-width: 480px) {
      gap: 0.125rem;
      padding-top: 0;
    }
  }
  
  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: none;
    border-radius: 0px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    
    @media (max-width: 480px) {
      width: 24px;
      height: 24px;
      border-radius: 0px;
    }
    
    &:hover {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
    }
    
    svg {
      flex-shrink: 0;
      width: 16px;
      height: 16px;

      @media (max-width: 480px) {
        width: 14px;
        height: 14px;
      }
    }
  }
  
  .collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: none;
    border-radius: 0px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    padding: 0;

    @media (max-width: 480px) {
      width: 24px;
      height: 24px;
      border-radius: 0px;
    }
    
    svg {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      transition: transform 0.2s ease;

      @media (max-width: 480px) {
        width: 14px;
        height: 14px;
      }
    }
    
    &:hover {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      
      svg {
        transform: rotate(-180deg);
      }
    }
  }
  
  .composer-textarea {
    flex: 1;
    min-height: 24px;
    max-height: 200px;
    padding: 0.375rem 0;
    background: var(--bg-primary);
    border: none;
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-family: inherit;
    resize: none;
    overflow-y: hidden;
    line-height: 1.4;
    transition: height 0.2s ease;
    vertical-align: top;
    box-sizing: border-box;
    margin: 0;
    
    &:focus {
      outline: none;
    }
    
    &::placeholder {
      color: var(--text-secondary);
    }
    
    // Show scrollbar only when content exceeds one line (scrollHeight > min-height)
    &.has-overflow {
      overflow-y: auto;
      
      &::-webkit-scrollbar {
        width: 4px;
      }
      
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      
      &::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 0px;
      }
    }
  }
  
  .send-btn-composer {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: var(--pwc-orange);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    padding: 0;
    margin-top: 0.125rem;

    @media (max-width: 480px) {
      width: 28px;
      height: 28px;
      margin-top: 0;
    }
    
    svg {
      width: 18px;
      height: 18px;

      @media (max-width: 480px) {
        width: 16px;
        height: 16px;
      }
    }
    
    &:hover:not(:disabled) {
      background-color: var(--pwc-orange-light);
      transform: scale(1.05);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .extraction-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-top: 0.5rem;
    background-color: var(--bg-tertiary);
    border-radius: 0px;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    
    .spinner {
      flex-shrink: 0;
      animation: spin 1s linear infinite;
      color: var(--pwc-orange);
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  .reference-doc-preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.625rem;
    margin-top: 0.5rem;
    background-color: var(--bg-tertiary);
    border-radius: 0px;
    font-size: 0.8125rem;
    color: var(--text-primary);
    
    svg {
      flex-shrink: 0;
      color: var(--text-secondary);
      width: 14px;
      height: 14px;
    }
    
    span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .remove-ref {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: none;
      border: none;
      border-radius: 0px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
      
      svg {
        width: 12px;
        height: 12px;
      }
      
      &:hover {
        background-color: var(--bg-primary);
        color: var(--text-primary);
      }
    }
    
    &.ppt-attachment {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.625rem;
      background-color: var(--bg-tertiary);
      border-radius: 0px;
      font-size: 0.8125rem;
      color: var(--text-primary);
    }
  }
}


// Form Helper Text
.help-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.file-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: var(--pwc-orange);
  }
}

// Download Format Selector
.download-format-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  
  .download-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .format-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0px;
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    
    svg {
      flex-shrink: 0;
      color: var(--text-secondary);
    }
    
    &:hover {
      background-color: var(--bg-tertiary);
      border-color: var(--pwc-orange);
      color: var(--pwc-orange);
      
      svg {
        color: var(--pwc-orange);
      }
    }
  }
}

// Podcast Download Container - Half-width buttons
.podcast-download-container {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
  
  .half-width {
    flex: 1;
    min-width: 0;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    
    .half-width {
      width: 100%;
    }
  }
}

// Radio Group Styling
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  
  .radio-option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background-color: var(--bg-secondary);
      border-color: var(--pwc-orange);
    }
    
    input[type="radio"] {
      margin-top: 0.25rem;
      cursor: pointer;
      accent-color: var(--pwc-orange);
    }
    
    .radio-label {
      flex: 1;
      color: var(--text-primary);
      font-size: 0.9rem;
      line-height: 1.4;
      
      strong {
        color: var(--text-primary);
        font-weight: 600;
      }
    }
  }
}

// Links Container for Research
.links-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  
  .link-input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    
    .link-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0px;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-size: 0.9rem;
      transition: all 0.2s ease;
      
      &:focus {
        outline: none;
        border-color: var(--pwc-orange);
        box-shadow: 0 0 0 3px rgba(208, 74, 2, 0.1);
      }
      
      &::placeholder {
        color: var(--text-secondary);
      }
    }
    
    .remove-link-btn {
      padding: 0.5rem;
      background-color: transparent;
      border: 1px solid var(--border-color);
      border-radius: 0px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover:not(:disabled) {
        background-color: #fee;
        border-color: #f44;
        color: #f44;
      }
      
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      svg {
        width: 16px;
        height: 16px;
      }
    }
  }
}

.add-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background-color: transparent;
  border: 1px dashed var(--border-color);
  border-radius: 0px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  svg {
    width: 16px;
    height: 16px;
  }
  
  &:hover {
    background-color: var(--bg-secondary);
    border-color: var(--pwc-orange);
    color: var(--pwc-orange);
  }
}

// Edit Workflow Cancel Button
.workflow-cancel-container {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.workflow-cancel-btn {
  padding: 0.625rem 1.25rem;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 0px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--bg-hover, #f9fafb);
    border-color: var(--text-secondary, #6b7280);
    color: var(--text-primary, #1a1a1a);
  }
}

// File Upload Error Message
.workflow-file-upload-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.upload-error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 0px;
  color: #dc3545;
  font-size: 0.875rem;
  animation: slideDown 0.3s ease;
  position: relative;
  
  svg:first-child {
    flex-shrink: 0;
    color: #dc3545;
  }
  
  span {
    flex: 1;
    line-height: 1.4;
  }
  
  .error-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    border-radius: 0px;
    color: #dc3545;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    padding: 0;
    
    &:hover {
      background-color: rgba(220, 53, 69, 0.2);
    }
    
    svg {
      width: 14px;
      height: 14px;
    }
  }
  
  // Composer error variant (for chat input area)
  &.composer-error {
    margin-top: 0.5rem;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.workflow-file-upload {
  width: 100%;
}

// ============================================================================
// TOAST NOTIFICATION STYLES
// ============================================================================

.toast-backdrop {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background-color: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(4px) !important;
  z-index: 9998 !important;
  animation: fadeIn 0.2s ease-out !important;
}

.toast-container {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 9999 !important;
  min-width: 320px !important;
  max-width: 600px !important;
  background-color: var(--card-bg, #ffffff) !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
  animation: slideInToast 0.3s ease-out !important;
  border: 1px solid var(--border-color, #E0E0E0) !important;

  &[data-type="error"] {
    border-left: 4px solid #dc3545 !important;

    .toast-content {
      color: #dc3545 !important;
    }
  }

  &[data-type="success"] {
    border-left: 4px solid #28a745 !important;

    .toast-content {
      color: #28a745 !important;
    }
  }
}

.toast-content {
  padding: 24px 32px !important;
  font-size: 15px !important;
  line-height: 1.6 !important;
  color: var(--text-primary, #1d1d1f) !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;

  span {
    display: block !important;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInToast {
  from {
    opacity: 0;
    transform: translate(-50%, -45%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

// ============================================================================
// LANDING PAGE STYLES
// ============================================================================

.landing-page-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%);
  flex: 1;
  /* reduced padding so content fits at 100% zoom */
  padding: 1.5rem 1rem;
  position: relative;
  overflow: visible;
  /* height should flow naturally based on content, not take full viewport */
  min-height: auto;

  /* Enable scrollbar on tablets and mobile (screens less than 770px) */
  @media (max-width: 769px) {
    overflow-y: auto;
    overflow-x: hidden;
    max-height: calc(100vh - var(--pwc-header-height, 80px));
  }
}

.landing-page-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  width: 100%;
  max-width: 1200px;
  position: relative;
  z-index: 1;
  margin-top: 0; /* removed negative margin that was causing overlap with banner */
}

.landing-header {
  text-align: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid var(--pwc-orange);

  h1 {
    /* responsive font sizing: min 1.5rem, preferred 6vw, max 2.8rem (larger when zoomed out) */
    font-size: clamp(1.5rem, 6vw, 2.8rem);
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.5px;
  }

  p {
    /* responsive font sizing: min 0.8rem, preferred 2.5vw, max 1.125rem (larger when zoomed out) */
    font-size: clamp(0.8rem, 2.5vw, 1.125rem);
    color: var(--pwc-orange);
    margin: 0;
    font-weight: 500;
  }
}

.landing-buttons-grid {
    &.two-cols {
      grid-template-columns: repeat(2, 1fr);
      @media (max-width: 480px) {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
    }
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  width: 100%;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

.landing-flow-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1rem;
  border: 1px solid #e6e6e9;
  border-radius: 0px;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 1rem;
  text-align: center;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);

  &:hover {
    border-color: var(--pwc-orange);
    border-width: 1px;
    background: linear-gradient(135deg, #ffffff 0%, rgba(194, 65, 12, 0.02) 100%);
    transform: translateY(-4px);
    box-shadow: 0 8px 18px rgba(194, 65, 12, 0.12);
  }

  .flow-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 0px;
    background: linear-gradient(135deg, rgba(194, 65, 12, 0.08) 0%, rgba(194, 65, 12, 0.03) 100%);
    transition: all 0.3s ease;
    
    svg {
      width: 40px;
      height: 40px;
      color: var(--pwc-orange);
      transition: transform 0.3s ease;
    }
  }

  h2 {
    /* responsive font sizing: min 0.85rem, preferred 1.5vw, max 1rem */
    font-size: clamp(0.85rem, 1.5vw, 1rem);
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }

  p {
    /* responsive font sizing: min 0.75rem, preferred 1vw, max 0.8125rem */
    font-size: clamp(0.75rem, 1vw, 0.8125rem);
    color: #666;
    margin: 0;
    line-height: 1.4;
  }

  &:hover {
    .flow-icon {
      background: linear-gradient(135deg, rgba(194, 65, 12, 0.12) 0%, rgba(194, 65, 12, 0.06) 100%);
    }

    .flow-icon svg {
      transform: scale(1.15);
      color: var(--pwc-orange);
    }

    h2 {
      color: var(--pwc-orange);
    }
  }
}

// Landing page fade-out animation
@keyframes landingPageFadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

.landing-page-view.fade-out {
  animation: landingPageFadeOut 0.5s ease forwards;
}
