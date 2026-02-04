<div
  class="app-container"
  [class.sidebar-expanded]="sidebarExpanded"
  >
  <!-- Top Header Bar -->
  <header class="top-header">
    <div class="header-left">
      <button
          class="menu-toggle"
          (click)="toggleMobileMenu()"
          type="button"
          aria-label="Toggle menu"
          >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
      </button>
      <img
        src="assets/images/pwc-logo-2025.png"
        alt="PwC"
        (click)="goHome()"
        class="pwc-header-logo"
        />
        <span class="business-services-text">Business Services</span>
        <span class="mcx-ai-text"></span>
      </div>

      <div class="llm-container">
        <div class="llm-selector-container">
          <!-- Service Provider Dropdown -->
          <!-- <div class="dropdown-wrapper">
            <button
              class="dropdown-btn"
              (click)="toggleDropdown('service-provider', $event)"
              type="button"
              title="Select Service Provider"
              >
             <span class="dropdown-label">{{ selectedServiceProvider === 'openai' ? 'OpenAI' : 'Anthropic' }}</span> 
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                [class.rotate]="openDropdown === 'service-provider'"
                >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button> 
            @if (openDropdown === 'service-provider') {
              <div
                class="dropdown-menu"
                (click)="$event.stopPropagation()"
                >
                <button
                  class="dropdown-item"
                  [class.active]="selectedServiceProvider === 'openai'"
                  (click)="selectServiceProvider('openai', $event)"
                  type="button"
                  >
                  OpenAI
                </button>
                <button
                  class="dropdown-item"
                  [class.active]="selectedServiceProvider === 'anthropic'"
                  (click)="selectServiceProvider('anthropic', $event)"
                  type="button"
                  >
                  Anthropic
                </button>
              </div>
            }
          </div> -->

          <!-- Model Dropdown -->
          <!-- <div class="dropdown-wrapper">
            <button
              class="dropdown-btn"
              (click)="toggleDropdown('model-select', $event)"
              type="button"
              title="Select LLM Model"
              >
              <span class="dropdown-label">{{ selectedModel }}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                [class.rotate]="openDropdown === 'model-select'"
                >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            @if (openDropdown === 'model-select') {
              <div
                class="dropdown-menu"
                (click)="$event.stopPropagation()"
                >
                @for (model of availableModels; track model) {
                  <button
                    class="dropdown-item"
                    [class.active]="selectedModel === model"
                    (click)="selectModel(model, $event)"
                    type="button"
                    >
                    {{ model }}
                  </button>
                }
              </div>
            } 
          </div>-->
        </div>
      </div>

      <div class="header-center">
      </div>
      <!-- Home Button -->
      <div class="header-right">
        <button
          class="header-icon-btn"
          (click)="goHome()"
          type="button"
          title="Home"
          >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>

        <button
          class="header-icon-btn notifications"
          type="button"
          title="Notifications"
          >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span class="notification-badge">3</span>
        </button>
        @if (user$ | async; as user) {
          <div class="dropdown-wrapper profile-dropdown-wrapper">
            <button
              class="header-icon-btn profile-menu"
              type="button"
              title="User profile"
              (click)="toggleDropdown('profile-menu', $event)"
              >
              <div class="header-profile-avatar">
                @if (profileImageUrl) {
                  <img 
                    [src]="profileImageUrl" 
                    [alt]="displayName"
                    class="header-profile-image"
                    (error)="$event.target.style.display='none'">
                }
                @if (!profileImageUrl) {
                  <svg 
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="header-profile-icon"
                    >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                }
              </div>
              <span class="username">{{ user.name }}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="dropdown-arrow"
                [class.rotate]="openDropdown === 'profile-menu'"
                >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            @if (openDropdown === 'profile-menu') {
              <div
                class="dropdown-menu profile-dropdown-menu"
                (click)="$event.stopPropagation()"
                >
                <div class="profile-info">
                  @if (userProfile) {
                    <div class="profile-avatar-large">
                      @if (profileImageUrl) {
                        <img 
                          [src]="profileImageUrl" 
                          [alt]="displayName"
                          class="profile-image-large"
                          (error)="$event.target.style.display='none'">
                      }
                      @if (!profileImageUrl) {
                        <svg 
                          class="avatar-icon-large" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          stroke-width="2">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                        </svg>
                      }
                    </div>
                  }
                  <div class="profile-text">
                    <div class="profile-name">
                      {{ displayName.includes('(') ? displayName.split('(')[0] : displayName }}
                    </div>
                    @if (userProfile) {
                      <div class="profile-role">
                        {{ userProfile.jobTitle }}
                      </div>
                    }
                    @if (userProfile) {
                      <div class="profile-location">
                        {{ userProfile.location }}
                      </div>
                    }
                  </div>
                </div>
                <div class="dropdown-divider"></div>
                <button
                  class="dropdown-item logout-item"
                  (click)="logout()"
                  type="button"
                  >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </button>
              </div>
            }
          </div>
        }
      </div>
    </header>

    <!-- Collapsible Left Sidebar -->
    <aside
      class="icon-sidebar"
      [class.mobile-open]="mobileMenuOpen"
      [class.expanded]="sidebarExpanded"
      >
      <div class="sidebar-header">
        <button
          class="sidebar-toggle-btn"
          (click)="toggleSidebar()"
          type="button"
        [attr.aria-label]="
          sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'
        "
          >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="icon-nav" role="navigation" aria-label="Main navigation">
        <button
          class="icon-nav-btn"
          [class.active]="selectedFlow === 'ppt'"
          [class.hidden]="!offeringVisibility['ppt']"
          (click)="selectFlow('ppt')"
          type="button"
          title="Doc Studio"
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
            <path d="M7 7h5v5H7z"></path>
            <path d="M14 7h3"></path>
            <path d="M14 10h3"></path>
          </svg>
          <span class="nav-label">Doc Studio</span>
        </button>
        <button
          class="icon-nav-btn"
          [class.active]="selectedFlow === 'market-intelligence'"
          [class.hidden]="!offeringVisibility['market-intelligence']"
          (click)="selectFlow('market-intelligence')"
          type="button"
          title="Market Intelligence & Insights"
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
            <polyline points="4 14 8 10 12 15 16 8 20 12" />
            <line x1="4" y1="19" x2="20" y2="19" />
            <line x1="4" y1="4" x2="4" y2="19" />
          </svg>
          <span class="nav-label">
            <span class="label-line">Market Intelligence & Insights</span>
          </span>
        </button>
        <button
          class="icon-nav-btn"
          [class.active]="selectedFlow === 'thought-leadership'"
          [class.hidden]="!offeringVisibility['thought-leadership']"
          (click)="selectFlow('thought-leadership')"
          type="button"
          *ngIf="isProfilePresent(profile)"
          title="Cortex"
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v2"></path>
            <path d="M12 18v2"></path>
            <path d="M4.93 4.93l1.41 1.41"></path>
            <path d="M17.66 17.66l1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="M6.34 17.66l-1.41 1.41"></path>
            <path d="M19.07 4.93l-1.41 1.41"></path>
            <circle cx="12" cy="12" r="5"></circle>
            <path d="M12 12v-5"></path>
          </svg>
          <span class="nav-label">
            <span class="label-line">Cortex</span>
          </span>
        </button>
        <!-- separator below Cortex -->
        <div class="sidebar-separator" aria-hidden="true"></div>
        <button
          class="icon-nav-btn"
          (click)="toggleHistoryPanel()"
          [class.active]="showHistoryPanel"
          type="button"
          title="Research & Request History"
          >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M12 7v5l4 2"></path>
          </svg>
          <span class="nav-label">
            <span class="label-line">Research & Request History</span>
          </span>
        </button>
        @if(!showLandingPage) {
        <button class="icon-nav-btn" type="button" title="New Chat" (click)="startNewChat()">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span class="nav-label">New Chat</span>
        </button>
      }
        <!-- separator below New Chat -->
        <div class="sidebar-separator" aria-hidden="true"></div>
        <button
              class="icon-nav-btn"
              (click)="openRequestForm()"
              title="Request DDC Support">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <!-- Headband -->
                  <path d="M4 12a8 8 0 0 1 16 0" />
                  <!-- Left earcup -->
                  <rect x="2" y="12" width="4" height="6" rx="1" />
                  <!-- Right earcup -->
                  <rect x="18" y="12" width="4" height="6" rx="1" />
                  <!-- Mic boom -->
                <path d="M18 18v2a2 2 0 0 1-2 2h-4" />
              </svg>
               <span class="nav-label">
                <span class="label-line">Request DDC Support</span>
              </span>
            </button>
            <button
              class="icon-nav-btn"
              (click)="onRaisePhoenix()"
              title="Request MCX Publication Support"
              *ngIf="isProfilePresent(profile)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2s-4 3-4 7c0 5 4 9 4 9s4-4 4-9c0-4-4-7-4-7z"></path>
                <path d="M5 18c2 2 5 3 7 3s5-1 7-3"></path>
              </svg>
              <span class="nav-label">
                <span class="label-line">Request MCX Publication Support</span>
              </span>
            </button>
      </nav>
      
      <!-- Copyright Footer -->
      <div class="sidebar-copyright">
        <p>©2026 PwC. All rights reserved.</p>
      </div>
    </aside>    <!-- Chat History Panel -->
    <div class="history-panel" [class.show]="showHistoryPanel">
      <div class="history-header">
        <h3>Research and Request History</h3>
        <button
          class="close-history-btn"
          (click)="showHistoryPanel = false"
          type="button"
          aria-label="Close history"
          >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="history-content">
        <div class="history-search">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="search-icon"
            >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search history..."
            class="history-search-input"
            [(ngModel)]="searchQuery"
            />
          </div>
          @if (filteredChatSessions.length > 0) {
            <div class="history-list">
              @for (session of filteredChatSessions; track session.id) {
                <button
                  class="history-item"
                  (click)="loadDbConversation(session.id); showHistoryPanel = false"
                  type="button"
                  >
                  <div class="history-item-content">
                    <h4 class="history-item-title">{{ session.title }}</h4>
                    <p class="history-item-date">
                      {{ session.lastModified | date: "MMM d, h:mm a" }}
                    </p>
                  </div>
                  <button
                    class="history-item-delete"
                    (click)="deleteDbSession(session.id, $event)"
                    type="button"
                    aria-label="Delete chat"
                    >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      ></path>
                    </svg>
                  </button>
                </button>
              }
            </div>
          }
          @if (filteredChatSessions.length === 0) {
            <div class="history-empty">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M12 7v5l4 2"></path>
              </svg>
              @if (searchQuery.trim()) {
                <p>No matching history</p>
                <span>Try different keywords</span>
              } @else {
                <p>No chat history yet</p>
                <span>Your conversations will appear here</span>
              }
            </div>
          }
        </div>
      </div>
      <!-- Main Content -->
      <main class="main-content">
        <!-- Global toast notification (centered with backdrop) -->
        @if (showNotification) {
          <!-- Backdrop overlay with blur -->
          <div class="toast-backdrop"></div>
          
          <!-- Toast notification -->
          <div class="toast-container" [attr.data-type]="notificationType">
            <div class="toast-content">
              <span>{{ notificationMessage }}</span>
            </div>
          </div>
        }

        <!-- MCX AI Banner -->
        <div class="mcx-banner">
          <div class="banner-content">
            <h1 class="banner-title">{{ getFeatureName() }}</h1>
          </div>
          <div class="banner-image"></div>
        </div>

        <!-- Landing Page (First Time User) -->
        @if (showLandingPage) {
          <div class="content-area landing-page-view" [class.fade-out]="landingPageFadingOut">
            <div class="landing-page-content">
              <div class="landing-header">
                <h1>Welcome to ThinkSpace</h1>
                <p>A space for bold thinking</p>
              </div>

              <div class="landing-buttons-grid" [class.two-cols]="!isProfilePresent(profile)">
                <button
                  class="landing-flow-btn ddc-flow-btn"
                  (click)="selectFlow('ppt')"
                  type="button"
                >
                  <div class="flow-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                      <path d="M7 7h5v5H7z"></path>
                      <path d="M14 7h3"></path>
                      <path d="M14 10h3"></path>
                    </svg>
                  </div>
                  <h2>Doc Studio</h2>
                  <p>PwC quality presentations at the speed of thought</p>
                </button>

                <button
                  class="landing-flow-btn mi-flow-btn"
                  (click)="selectFlow('market-intelligence')"
                  type="button"
                >
                  <div class="flow-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
                      <polyline points="4 14 8 10 12 15 16 8 20 12" />
                      <line x1="4" y1="19" x2="20" y2="19" />
                      <line x1="4" y1="4" x2="4" y2="19" />
                    </svg>
                  </div>
                  <h2>Market Intelligence & Insights</h2>
                  <p>Structured preparation for confident client interactions</p>
                </button>

                <button
                  class="landing-flow-btn tl-flow-btn"
                  (click)="selectFlow('thought-leadership')"
                  type="button"
                  *ngIf="isProfilePresent(profile)"
                >
                  <div class="flow-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2v2"></path>
                      <path d="M12 18v2"></path>
                      <path d="M4.93 4.93l1.41 1.41"></path>
                      <path d="M17.66 17.66l1.41 1.41"></path>
                      <path d="M2 12h2"></path>
                      <path d="M20 12h2"></path>
                      <path d="M6.34 17.66l-1.41 1.41"></path>
                      <path d="M19.07 4.93l-1.41 1.41"></path>
                      <circle cx="12" cy="12" r="5"></circle>
                      <path d="M12 12v-5"></path>
                    </svg>
                  </div>
                  <h2>Cortex</h2>
                  <p>Where all firm intelligence is created, curated, and deployed</p>
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Welcome/Quick Start Area -->
        @if (!showLandingPage && messages.length === 0 && !showDraftForm) {
          <div
            class="content-area welcome-screen"
            >
            <!-- Centered Conversation Starter -->
            <div class="welcome-center">
              <!-- Quick Start and Guided Journey buttons -->
              <div class="top-action-buttons">
                <button
                  #quickStartBtn
                  class="top-action-btn primary"
                  (click)="quickStart()"
                  type="button"
                  aria-label="Start quick conversation - Begin chatting immediately with AI assistance"
                  >
                  <div class="btn-icon-badge">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      >
                      <polygon
                        points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                      ></polygon>
                    </svg>
                  </div>
                  <div class="btn-content">
                    <h3 class="btn-heading">Quick Request</h3>
                    <p class="btn-description">
                      Engage with the AI assistant
                    </p>
                  </div>
                </button>
                <button
                  class="top-action-btn guided"
                  (click)="openGuidedDialog()"
                  type="button"
                  aria-label="Guided Journey - Step-by-step form for structured workflows"
                  >
                  <div class="btn-icon-badge">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      >
                      <path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                      ></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <div class="btn-content">
                    <h3 class="btn-heading">Guided Journey</h3>
                    <p class="btn-description">
                      Launch step-by-step wizard
                    </p>
                  </div>
                </button>
              </div>
              <div class="welcome-message">
                <h2>How can I help you today?</h2>
                <p>
                  @if (selectedFlow === 'thought-leadership') {
                    <span>Start chatting or choose from the below services</span>
                  }
                  @if (selectedFlow === 'ppt') {
                    <span>Start chatting or choose from the below services</span>
                  }
                  @if (selectedFlow === 'market-intelligence') {
                    <span>Start chatting or choose from the below services</span>
                  }
                </p>
              </div>
            </div>
            <!-- Quick Action Dropdown Buttons - DDC Feature -->
            @if (selectedFlow === 'ppt') {
              <div class="quick-action-dropdowns ddc-actions">
                <!-- First Row: 2 Buttons -->
                <div class="quick-action-row">
                  <div class="button-wrapper">
                    <button class="dropdown-btn" (click)="openDdcWorkflow('slide-creation-prompt')" type="button">
                      <div class="btn-icon">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round">
                            <!-- Document -->
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <polyline points="9 13 11 15 15 11"></polyline>
                          </svg>
                      </div>
                      <span class="btn-label">Prompt to Draft</span>
                    </button>
                  </div>
                  <div class="button-wrapper">
                    <button class="dropdown-btn" (click)="openDdcWorkflow('slide-creation')" type="button">
                      <div class="btn-icon">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round">
                          <!-- Book spine -->
                            <rect x="3" y="4" width="6" height="16" rx="1"></rect>
                              
                          <!-- Middle book -->
                            <rect x="9" y="4" width="6" height="16" rx="1"></rect>
                              
                          <!-- Right book -->
                            <rect x="15" y="4" width="6" height="16" rx="1"></rect>
                              
                          <!-- Decorative lines for pages -->
                            <line x1="3" y1="8" x2="9" y2="8"></line>
                            <line x1="9" y1="12" x2="15" y2="12"></line>
                            <line x1="15" y1="16" x2="21" y2="16"></line>
                            </svg>
                          </div>
                        <span class="btn-label">Outline to Deck</span>
                      </button>
                    </div>
                  <!-- </div> -->
                <!-- Second Row: 2 Button -->
                  <!-- <div class="quick-action-row"> -->
                  <div class="button-wrapper">
                    <button class="dropdown-btn" (click)="openDdcWorkflow('sanitization')" type="button">
                      <div class="btn-icon">
                        <!-- simple filled broom icon (uses currentColor) -->
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <!-- bristles -->
                          <rect x="2" y="15" width="12" height="5" rx="1.5" fill="currentColor" />
                          <!-- handle (rotated thin rect) -->
                          <rect x="12.5" y="2" width="2" height="14" rx="1" fill="currentColor" transform="rotate(28 12.5 2)" />
                          <!-- small accent detail -->
                          <circle cx="4.5" cy="17" r="1" fill="currentColor" opacity="0.9" />
                        </svg>
                      </div>
                      <span class="btn-label">Doc Sanitization</span>
                    </button>
                  </div>
                  <div class="button-wrapper">
                    <button class="dropdown-btn disabled" (click)="openDdcWorkflow('brand-format')" type="button" disabled>
                      <div class="btn-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.93 0 1.5-.65 1.5-1.5 0-.44-.15-.84-.4-1.13-.24-.29-.4-.69-.4-1.12 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.97-4.48-9-10-9z"></path>
                          <circle cx="6.5" cy="11.5" r="1.5"></circle>
                          <circle cx="9.5" cy="7.5" r="1.5"></circle>
                          <circle cx="14.5" cy="7.5" r="1.5"></circle>
                          <circle cx="17.5" cy="11.5" r="1.5"></circle>
                        </svg>
                      </div>
                      <span class="btn-label">Draft Refinement</span>
                    </button>
                  </div>
                </div>
              </div>
            }
            <!-- Quick Action Dropdown Buttons - Thought Leadership Feature -->
            @if (selectedFlow === 'thought-leadership') {
              <div
                class="quick-action-dropdowns tl-actions"
                >
                <!-- First Row: 3 Buttons -->
                <div class="quick-action-row">
                  <div class="button-wrapper-tl">
                    <button
                      class="dropdown-btn"
                      (click)="onTLActionCardClick('draft-content')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          >
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                      </div>
                      <span class="btn-label">Draft Content</span>
                    </button>
                  </div>
                  <div class="button-wrapper-tl">
                    <button
                      class="dropdown-btn"
                      (click)="onTLActionCardClick('conduct-research')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          >
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="m21 21-4.35-4.35"></path>
                        </svg>
                      </div>
                      <span class="btn-label">Conduct Research</span>
                    </button>
                  </div>
                  <div class="button-wrapper-tl">
                    <button
                      class="dropdown-btn"
                      (click)="onTLActionCardClick('edit-content')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </div>
                      <span class="btn-label">Edit Content</span>
                    </button>
                  </div>
                </div>
                <!-- Second Row: 2 Buttons -->
                <div class="quick-action-row">
                  <div class="button-wrapper-tl">
                    <button
                      class="dropdown-btn"
                      (click)="onTLActionCardClick('refine-content')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <polyline points="9 13 11 15 15 11"></polyline>
                        </svg>
                      </div>
                      <span class="btn-label">Refine Drafts</span>
                    </button>
                  </div>
                  <div class="button-wrapper-tl">
                    <button
                      class="dropdown-btn"
                      (click)="onTLActionCardClick('format-translator')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          >
                          <polyline points="16 3 21 3 21 8"></polyline>
                          <line x1="4" y1="20" x2="21" y2="3"></line>
                          <polyline points="21 16 21 21 16 21"></polyline>
                          <line x1="15" y1="15" x2="21" y2="21"></line>
                          <line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                      </div>
                      <span class="btn-label">Adapt Content</span>
                    </button>
                  </div>
                </div>
              </div>
            }
            <!-- Quick Action Dropdown Buttons - Market Intelligence Feature -->
            @if (selectedFlow === 'market-intelligence') {
              <div
                class="quick-action-dropdowns mi-actions"
                >
                <!-- First Row: 3 Buttons -->
                <div class="quick-action-row">
                  <div class="button-wrapper-mi">
                    <button
                      class="dropdown-btn"
                      (click)="onMIActionCardClick('conduct-research')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="m21 21-4.35-4.35"></path>
                        </svg>
                      </div>
                      <span class="btn-label">Conduct Research</span>
                    </button>
                  </div>
                  <div class="button-wrapper-mi">
                    <button
                      class="dropdown-btn"
                      (click)="onMIActionCardClick('target-industry-insights')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <path d="M20.49 15a9 9 0 1 1 .64-8.5"></path>
                        </svg>
                      </div>
                      <span class="btn-label">Generate Industry Insights</span>
                    </button>
                  </div>
                  <div class="button-wrapper-mi">
                    <button
                      class="dropdown-btn"
                      (click)="onMIActionCardClick('prepare-client-meeting')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2a10 10 0 1 0 10 10M12 6v6l4 2"></path>
                        </svg>
                      </div>
                      <span class="btn-label">Prepare for Client Meeting</span>
                    </button>
                  </div>
                </div>
                <!-- Second Row: 2 Buttons -->
                <div class="quick-action-row">
                  <div class="button-wrapper-mi">
                    <button
                      class="dropdown-btn"
                      (click)="onMIActionCardClick('create-pov')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="12" y1="13" x2="8" y2="13"></line>
                          <line x1="12" y1="17" x2="8" y2="17"></line>
                        </svg>
                      </div>
                      <span class="btn-label">Create Point of View</span>
                    </button>
                  </div>
                  <div class="button-wrapper-mi">
                    <button
                      class="dropdown-btn"
                      (click)="onMIActionCardClick('gather-proposal-insights')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 8h12M3 8l3-3M3 8l3 3M21 16H9M21 16l-3-3M21 16l-3 3"></path>
                        </svg>
                      </div>
                      <span class="btn-label">Gather Proposal Inputs</span>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Chat Messages Area -->
        @if (messages.length > 0 || showDraftForm) {
          <div
            class="content-area chat-area"
            >
            <div class="messages-wrapper" #messagesContainer>
              @for (message of messages; track message; let i = $index) {
                <div
                  class="message"
                  [class.user-message]="message.role === 'user'"
                  [class.assistant-message]="message.role === 'assistant'"
                  >
                  <div class="message-content">
                    @if (message.role === 'assistant') {
                      <div class="message-avatar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="5" y="7" width="14" height="12" rx="2"></rect>
                          <path d="M12 7V4"></path>
                          <circle cx="9" cy="12" r="1" fill="currentColor"></circle>
                          <circle cx="15" cy="12" r="1" fill="currentColor"></circle>
                          <path d="M9 16h6"></path>
                        </svg>
                      </div>
                    }
                    <div class="message-bubble">
                      <!-- Action in Progress Indicator -->
                      @if (message.actionInProgress) {
                        <div class="action-progress">
                          <div class="progress-icon">
                            <svg
                              class="spinner"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              >
                              <path
                                d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                                />
                              </svg>
                            </div>
                            <span>{{ message.actionInProgress }}</span>
                          </div>
                        }
                        <!-- Edit Content Workflow: Editor Progress Indicator -->
                        @if (message.editWorkflow?.editorProgressList && message.editWorkflow?.step === 'processing') {
                          <app-editor-progress
                            [editors]="message.editWorkflow?.editorProgressList || []"
                            [currentEditor]="message.editWorkflow?.editorProgress?.currentEditor || ''"
                            [currentIndex]="message.editWorkflow?.editorProgress?.current || 0"
                            [totalEditors]="message.editWorkflow?.editorProgress?.total || (message.editWorkflow?.editorProgressList?.length ?? 0)">
                          </app-editor-progress>
                          
                        }
                        <!-- Edit Content Workflow: Paragraph Edits Component -->
                        @if ((message.editWorkflow?.paragraphEdits?.length ?? 0) > 0) {
                          <app-paragraph-edits
                            [paragraphEdits]="message.editWorkflow!.paragraphEdits!"
                            [showFinalOutput]="hasFinalOutputBeenGenerated(message, i)"
                            [isGeneratingFinal]="getParagraphEditsGeneratingState(message)"
                            [threadId]="message.editWorkflow?.threadId"
                            [currentEditor]="message.editWorkflow?.currentEditor"
                            [editorOrder]="$any(message.editWorkflow).editorOrder"
                            [isSequentialMode]="message.editWorkflow?.isSequentialMode"
                            [isLastEditor]="message.editWorkflow?.isLastEditor"
                            [currentEditorIndex]="message.editWorkflow?.currentEditorIndex"
                            [totalEditors]="message.editWorkflow?.totalEditors"
                            [isGenerating]="getParagraphEditsNextEditorGeneratingState(message)"
                            (paragraphApproved)="onParagraphApproved(message, $event)"
                            (paragraphDeclined)="onParagraphDeclined(message, $event)"
                            (generateFinal)="onGenerateFinalArticle(message)"
                            (nextEditor)="onNextEditor(message)">
                          </app-paragraph-edits>
                        }
                        <!-- Typing dots indicator - positioned above message text -->
                        @if (message.isStreaming || (message.role === 'assistant' && !message.content && !message.editWorkflow)) {
                          <div class="processing-container">
                            <div class="processing-lines">
                              @for (line of getProcessingMessageLines(i); track $index) {
                                <div class="processing-line" [class.last-line]="$index === getProcessingMessageLines(i).length - 1" [class.remove-animate]="isLineAnimatingOut(i, $index)">
                                  @if (isProcessingMessageCompleted(i, $index)) {
                                    <svg class="processing-checkmark" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                                    </svg>
                                  }
                                  <span class="processing-text">{{ line }}</span>
                                  @if ($index === getProcessingMessageLines(i).length - 1) {
                                    <div class="typing-dots" aria-hidden="true">
                                      <span></span>
                                      <span></span>
                                      <span></span>
                                    </div>
                                  }
                                </div>
                              }
                            </div>
                          </div>
                        }
                        @if ((message.thoughtLeadership?.topic === 'Editorial Feedback' || ((!message.editWorkflow?.editorProgressList || message.editWorkflow?.step !== 'processing') && (!message.editWorkflow?.paragraphEdits || message.editWorkflow?.paragraphEdits?.length === 0))) && !shouldHideEditorialFeedback(message, i)) {
                          <div
                            class="message-text"
                            [class.revised-content-formatted]="message.thoughtLeadership?.contentType === 'edit-article' || message.thoughtLeadership?.topic === 'Final Revised Article'"
                            [innerHTML]="message.role === 'assistant' && message.sources ? (message.content | sourceCitation:message.sources) : getFormattedContent(message)"
                          ></div>
                        }
                        <!-- Edit Content Workflow: Editor Selection -->
                        @if (message.editWorkflow?.showEditorSelection && message.editWorkflow?.editorOptions && message.editWorkflow?.step === 'awaiting_editors') {
                          <app-editor-selection
                            [editors]="message.editWorkflow?.editorOptions || []"
                            (selectionChanged)="onWorkflowEditorsSelectionChanged(message, $event)"
                            (submitted)="onWorkflowEditorsSubmitted($event)"
                            (cancelled)="onWorkflowCancelled()">
                          </app-editor-selection>
                        }
                        <!-- Edit Content Workflow: File Upload (Step 2 - awaiting_content) -->
                        @if (message.editWorkflow?.showFileUpload && editWorkflowService.isActive) {
                          <div class="workflow-file-upload-wrapper">
                            <app-file-upload
                              accept=".docx,.pdf,.txt,.md"
                              label="Upload Documents"
                              [uploadedFile]="getUploadedFileForMessage(message)"
                              (fileSelected)="onWorkflowFileSelected($event)"
                              (fileRemoved)="onWorkflowFileRemoved()"
                              class="workflow-file-upload">
                            </app-file-upload>
                            
                            <!-- Error message display -->
                            <!-- @if (editDocumentUploadError) {
                              <div class="upload-error-message">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="8" x2="12" y2="12"></line>
                                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span>{{ editDocumentUploadError }}</span>
                                <button 
                                  class="error-close-btn" 
                                  (click)="editDocumentUploadError = ''"
                                  type="button"
                                  aria-label="Close error message">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </div>
                            } -->
                          </div>
                        }

                        <!-- Edit Content Workflow: Simple Cancel Button (Step 2 - awaiting_content) -->
                        @if (message.editWorkflow?.showSimpleCancelButton && editWorkflowService.isActive) {
                          <div class="workflow-cancel-container">
                            <button
                              class="workflow-cancel-btn simple-cancel-btn"
                              (click)="onWorkflowCancelled()"
                              type="button">
                              Cancel
                            </button>
                          </div>
                        }
                        <!-- Edit Content Workflow: Cancel Workflow Button (Step 3+ - processing, disabled) -->
                        @if (message.editWorkflow?.showCancelButton && !message.editWorkflow?.showEditorSelection && !message.editWorkflow?.showSimpleCancelButton && editWorkflowService.isActive) {
                          <div class="workflow-cancel-container">
                            <button
                              class="workflow-cancel-btn"
                              (click)="onWorkflowCancelled()"
                              [disabled]="message.editWorkflow?.cancelButtonDisabled"
                              type="button">
                              Cancel Workflow
                            </button>
                          </div>
                        }
                        <!-- Thought Leadership Action Buttons (Only for results: Editorial Feedback and Revised Article in Quick Start Edit) -->
                        @if (shouldShowTLActions(message) && isEditWorkflowResult(message)) {
                          @if (getTLMetadata(message); as metadata) {
                            <app-tl-action-buttons
                              [metadata]="metadata"
                              [messageId]="'msg_' + i"
                              [selectedFlow]="selectedFlow">
                              
                            </app-tl-action-buttons>
                          }
                          <!-- Quick Start Edit Content: Run Final Output button (visible and accessible) -->
                          @if ((message.editWorkflow?.paragraphEdits?.length ?? 0) > 0) {
                            <div class="tl-final-output-container">
                              <button
                                class="tl-final-output-btn"
                                type="button"
                                [disabled]="getParagraphEditsGeneratingState(message)"
                                (click)="onGenerateFinalArticle(message)">
                                @if (getParagraphEditsGeneratingState(message)) {
                                  <span class="spinner small"></span>
                                }
                                {{ getParagraphEditsGeneratingState(message) ? 'Generating...' : 'Run Final Output' }}
                              </button>
                            </div>
                          }
                        }
                        <!-- Action Buttons (for interactive options like content type selection) -->
                        @if (message.actionButtons && message.actionButtons.length > 0) {
                          <div class="action-buttons-container">
                            @for (button of message.actionButtons; track button) {
                              <button
                                class="action-option-btn"
                                (click)="onActionButtonClick(button.action)"
                                type="button">
                                {{ button.label }}
                              </button>
                            }
                          </div>
                        }
                        <!-- Download and Preview Actions (for non-TL messages) -->
                        @if (
                          !shouldShowTLActions(message) && (
                          message.downloadUrl ||
                          message.previewUrl ||
                          (message.role === 'assistant' && message.content && !draftWorkflowService.isActive) ||
                          (draftWorkflowService.isActive && isDraftWorkflowFileUploadVisible())
                          )
                          ) {
                          <div
                            class="message-actions"
                            >
                            <!-- Copy to Clipboard Button (for all assistant messages, but not for edit workflow steps) -->
                            @if (message.role === 'assistant' && message.content && !message.editWorkflow) {
                              <button
                                class="action-btn copy-btn"
                                [class.copied]="copiedButtonId === 'copy-' + $index"
                                (click)="copyToClipboard(message.content, 'copy-' + $index)"
                                [title]="copiedButtonId === 'copy-' + $index ? 'Copied!' : 'Copy to clipboard'"
                                >
                                @if (copiedButtonId === 'copy-' + $index) {
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    class="check-icon"
                                    >
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                } @else {
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    >
                                    <rect
                                      x="9"
                                      y="9"
                                      width="13"
                                      height="13"
                                      rx="2"
                                      ry="2"
                                    ></rect>
                                    <path
                                      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                    ></path>
                                  </svg>
                                }
                              </button>
                            }
                            <!-- Draft Workflow Upload Button (appears when outline/supporting doc steps are active) -->
                            @if (draftWorkflowService.isActive && isDraftWorkflowFileUploadVisible(message)) {
                              <input
                                #draftUploadInput
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.md"
                                style="display: none"
                                (change)="onDraftUploadSelected(draftUploadInput.files)"
                                />
                                <button
                                  class="action-btn upload-btn"
                                  type="button"
                                  (click)="draftUploadInput.click()"
                                  title="Upload document"
                                  >
                                  Upload
                                </button>
                              }
                              <!-- Regenerate Button (for all assistant messages, but not for edit workflow steps). Hidden when TL/MI metadata contentType === 'Phoenix_Request' -->
                              <!-- @if (message.role === 'assistant' && selectedFlow !== 'ppt' && message.content && !message.editWorkflow && (getTLMetadata(message)?.contentType !== 'Phoenix_Request')) {
                                <button
                                  class="action-btn regenerate-btn"
                                  (click)="regenerateMessage(i)"
                                  title="Regenerate response"
                                  >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    >
                                    <path d="M23 4v6h-6"></path>
                                    <path d="M1 20v-6h6"></path>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>
                                  </svg>
                                </button>
                              } -->
                              
                              <!-- Export Dropdown (for all assistant messages, but not for edit workflow steps) -->
                              @if (message.role === 'assistant' && selectedFlow !== 'ppt' && message.content && !message.editWorkflow && (getTLMetadata(message)?.contentType !== 'Phoenix_Request')) {
                                <div class="export-dropdown">
                                  <button 
                                    class="action-btn btn-export"
                                    [class.exporting]="isExporting[i]"
                                    [class.exported]="isExported[i]"
                                    (click)="toggleExportDropdown(i)"
                                    title="Export"
                                  >
                                    @if (isExporting[i]) {
                                      <div class="export-spinner">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                                          <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
                                        </svg>
                                        <span>{{ exportFormat[i] }}</span>
                                      </div>
                                    } @else if (isExported[i]) {
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                      <span>{{ exportFormat[i] }}</span>
                                    } @else {
                                      <span>Export</span>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                      </svg>
                                    }
                                  </button>
                                  
                                  @if (showExportDropdown[i]) {
                                    <div class="dropdown-menu">
                                      <button class="dropdown-item" (click)="exportSelected(i, 'word')">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                          <polyline points="14 2 14 8 20 8"></polyline>
                                        </svg>
                                        <span>Word (.docx)</span>
                                      </button>
                                      <button class="dropdown-item" (click)="exportSelected(i, 'pdf')">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                          <polyline points="14 2 14 8 20 8"></polyline>
                                        </svg>
                                        <span>PDF (.pdf)</span>
                                      </button>
                                      <!-- <button class="dropdown-item" (click)="exportSelected(i, 'ppt')">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                          <polyline points="14 2 14 8 20 8"></polyline>
                                        </svg>
                                        <span>PPT (.ppt)</span>
                                      </button> -->
                                    </div>
                                  }
                                </div>
                              }
                              <!-- Webpage Ready Button (appears when webpage is ready to open) -->
                              @if (message.webpageReadyCompleted) {
                                <button
                                  class="action-btn btn-export"
                                  (click)="openWebpageReady(message)"
                                  title="Webpage Ready"
                                  >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    >
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                  </svg>
                                  <span>Webpage Ready</span>
                                </button>
                              }
                              <!-- Word Export Button (for all assistant messages, but not for edit workflow steps) -->
                              <!-- Commenting out Word button, To use for your particular feature put conditional checks in place -->
                              <!-- <button
                              class="action-btn word-btn"
                              *ngIf="message.role === 'assistant' && message.content && !message.editWorkflow"
                              (click)="downloadAsWord(message.content)"
                              title="Download as Word document"
                              >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                              Word
                            </button> -->
                            <!-- PDF Export Button (for all assistant messages, but not for edit workflow steps) -->
                            <!-- Commenting out pdf button, To use for your particular feature put conditional checks in place -->
                            <!-- <button
                            class="action-btn pdf-btn"
                            *ngIf="message.role === 'assistant' && message.content && !message.editWorkflow"
                            (click)="downloadAsPDF(message.content)"
                            title="Download as PDF"
                            >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            PDF
                          </button> -->
                          <!-- PPTX Downloads (Doc Studio Quick Start only) -->
                          @if (
                            selectedFlow === 'ppt' &&
                            message.downloadUrl &&
                            message.downloadFilename?.endsWith('.pptx')
                            ) {
                            <button
                              class="action-btn download-btn"
                  (click)="
                    downloadFile(
                      message.downloadUrl!,
                      message.downloadFilename!
                    )
                  "
                              >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                              Download PPTX
                            </button>
                            <button
                class="action-btn btn-canvas raise-btn"
                (click)="openRequestForm()"
                title="Request DDC Support">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <!-- Headband -->
                  <path d="M4 12a8 8 0 0 1 16 0" />
                  <!-- Left earcup -->
                  <rect x="2" y="12" width="4" height="6" rx="1" />
                  <!-- Right earcup -->
                  <rect x="18" y="12" width="4" height="6" rx="1" />
                  <!-- Mic boom -->
                <path d="M18 18v2a2 2 0 0 1-2 2h-4" />
              </svg>
                <span>Request DDC Support</span>
              </button>
                          }
                          <!-- Download Placemat (Cortex Quick Start) -->
                          @if (
                            message.downloadUrl &&
                            message.content &&
                            message.content.toLowerCase().includes('placemat')
                            ) {
                            <button
                              class="action-btn download-btn"
                  (click)="
                    downloadFile(
                      message.downloadUrl!,
                      message.downloadFilename!
                    )
                  "
                              >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                              Download Placemat
                            </button>
                          }
                          <!-- Request DDC Support for Doc Studio Quickstart -->
                          @if (
                            message.role === 'assistant' && 
                            selectedFlow === 'ppt' && 
                            message.content && 
                            !message.downloadUrl &&
                            message.content.toLowerCase().includes('download')
                            ) {
                            <button
                class="action-btn btn-canvas raise-btn"
                (click)="openRequestForm()"
                title="Request DDC Support">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <!-- Headband -->
                  <path d="M4 12a8 8 0 0 1 16 0" />
                  <!-- Left earcup -->
                  <rect x="2" y="12" width="4" height="6" rx="1" />
                  <!-- Right earcup -->
                  <rect x="18" y="12" width="4" height="6" rx="1" />
                  <!-- Mic boom -->
                <path d="M18 18v2a2 2 0 0 1-2 2h-4" />
              </svg>
                <span>Request DDC Support</span>
              </button>
                          }
                          <!-- Podcast Download - Half Width Buttons -->
                          @if (
                            message.downloadUrl &&
                            message.downloadFilename?.endsWith('.mp3')
                            ) {
                            <div
                              class="podcast-download-container"
                              >
                              <button
                                class="action-btn copy-btn half-width"
                                [class.copied]="copiedButtonId === 'copy-podcast-' + $index"
                                (click)="copyToClipboard(message.content, 'copy-podcast-' + $index)"
                                [title]="copiedButtonId === 'copy-podcast-' + $index ? 'Copied!' : 'Copy podcast script'"
                                >
                                @if (copiedButtonId === 'copy-podcast-' + $index) {
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    class="check-icon"
                                    >
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                } @else {
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    >
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                }
                                Copy Script
                              </button>
                              <button
                                class="action-btn download-btn half-width"
                    (click)="
                      downloadFile(
                        message.downloadUrl!,
                        message.downloadFilename!
                      )
                    "
                                title="Download podcast audio"
                                >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                  >
                                  <path
                                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                                  ></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Download MP3
                              </button>
                            </div>
                          }
                          <!-- Podcast Download from Blob URL (when contentType is podcast) -->
                          @if (message.thoughtLeadership?.contentType === 'podcast' && message.thoughtLeadership?.podcastAudioUrl) {
                            <button
                              class="action-btn btn-icon"
                              (click)="downloadPodcastFromBlob(message)"
                              title="Download podcast MP3">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                              <span>Download MP3</span>
                            </button>
                          }
                          <!-- Generated Content Downloads with Format Options -->
                          @if (
                            message.downloadUrl &&
                            !message.downloadFilename?.endsWith('.pptx') &&
                            !message.downloadFilename?.endsWith('.mp3')
                            ) {
                            <div
                              class="download-format-group"
                              >
                              <span class="download-label">Download as:</span>
                              <button
                                class="format-btn"
                    (click)="
                      downloadGeneratedDocument(
                        'word',
                        message.content,
                        'document'
                      )
                    "
                                title="Download as Word document"
                                >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                  >
                                  <path
                                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                  ></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                Word
                              </button>
                              <button
                                class="format-btn"
                    (click)="
                      downloadGeneratedDocument(
                        'txt',
                        message.content,
                        'document'
                      )
                    "
                                title="Download as Text file"
                                >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                  >
                                  <path
                                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                  ></path>
                                </svg>
                                Text
                              </button>
                              <button
                                class="format-btn"
                    (click)="
                      downloadGeneratedDocument(
                        'pdf',
                        message.content,
                        'document'
                      )
                    "
                                title="Download as PDF"
                                >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                  >
                                  <path
                                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                  ></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                  <line x1="9" y1="15" x2="15" y2="15"></line>
                                </svg>
                                PDF
                              </button>
                            </div>
                          }
                          @if (message.previewUrl) {
                            <button
                              class="action-btn preview-btn"
                              (click)="previewFile(message.previewUrl!)"
                              >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                >
                                <path
                                  d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                ></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              Preview
                            </button>
                          }
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
            <!-- Loading Indicator -->
            @if (isLoading) {
              <div
                class="loading-indicator"
                role="status"
                aria-live="polite"
                >
                @if (currentAction) {
                  <span class="loading-text">{{
                    currentAction
                  }}</span>
                }
                @if (!currentAction) {
                  <span class="sr-only">Loading response...</span>
                }
              </div>
            }
            <!-- Canvas Editor (side-by-side within chat area) -->
            <app-canvas-editor></app-canvas-editor>
          </div>
        }

        <!-- Chat Input - Claude.ai Inspired (Always Visible except on landing page) -->
        @if (!showLandingPage) {
          <div class="chat-composer" [class.expanded]="isComposerExpanded">
            <div class="composer-input-wrapper">
            <div class="composer-tools">
              <!-- Edit Content Document Upload (Thought Leadership mode) -->
              @if (selectedFlow === 'thought-leadership' || selectedFlow === 'market-intelligence') {
                <button
                  class="tool-btn"
                  (click)="editWorkflowService.isActive ? triggerEditDocumentUpload() : triggerDocumentAnalysisUpload()"
                  title="Upload documents(Word, PDF, Text, Markdown)"
                  type="button"
                  [disabled]="isLoading || isExtractingText"
                  >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </button>
              }
              <!-- PPT Upload (DDC mode) -->
              @if (selectedFlow === 'ppt') {
                <button
                  class="tool-btn"
                  (click)="triggerReferenceUpload()"
                  title="Upload documents(PPT,Word, PDF, Text, Images)"
                  type="button"
                  >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </button>
              }
              <button
                class="tool-btn mic-btn"
                (click)="startVoiceInput()"
                title="Voice input"
                type="button"
                [disabled]="isLoading"
                >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </button>
              @if (false) {
                <button class="tool-btn" title="Add link" type="button">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    >
                    <path
                      d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                    ></path>
                    <path
                      d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                    ></path>
                  </svg>
                </button>
              }
              <!-- Collapse Button (visible when expanded) -->
              @if (isComposerExpanded) {
                <button
                  class="tool-btn collapse-btn"
                  (click)="collapseComposer()"
                  title="Collapse input"
                  type="button"
                  >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    >
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </button>
              }
            </div>
            <textarea
              #composerTextarea
              [(ngModel)]="userInput"
              (keydown.enter)="onEnterPress($event)"
              (input)="onComposerInput($event)"
              (focus)="onComposerFocus()"
              placeholder="How can I help you today?"
              rows="1"
              class="composer-textarea"
              aria-label="Message input"
              [attr.aria-disabled]="isLoading || isAwaitingContent || isExtractingText"
              [disabled]="isAwaitingContent || isExtractingText"
              [readonly]="isAwaitingContent || isExtractingText"
              >
            </textarea>
            <button
              class="send-btn-composer"
              (click)="sendMessage()"
              [disabled]="!isSendButtonEnabled"
              type="button"
              aria-label="Send message"
              [attr.aria-busy]="isLoading"
              >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                >
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>

          <!-- Extraction Loading Indicator -->
          @if (isExtractingText) {
            <div class="extraction-loading">
              <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <span>{{ currentAction }}</span>
            </div>
          }

          <!-- Uploaded Edit Document Display (Thought Leadership & Market Intelligence) -->
          @if ((extractedDocuments && extractedDocuments.length > 0) && (selectedFlow === 'thought-leadership' || selectedFlow === 'market-intelligence')) {
            @for (doc of extractedDocuments; track doc.fileName) {
              <div class="reference-doc-preview ppt-attachment">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  >
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  ></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span>{{ doc.fileName }}</span>
                <button class="remove-ref" (click)="removeExtractedDocument(doc.fileName)" type="button" aria-label="Remove document">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            }
          } @else if (uploadedEditDocumentFile && (selectedFlow === 'thought-leadership' || selectedFlow === 'market-intelligence')) {
            <div class="reference-doc-preview ppt-attachment">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                ></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>{{ uploadedEditDocumentFile.name }}</span>
              <button class="remove-ref" (click)="removeUploadedEditDocument()" type="button" aria-label="Remove document">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          }

          <!-- Uploaded PPT Display -->
          @if (uploadedPPTFile && selectedFlow === 'ppt') {
            <div class="reference-doc-preview ppt-attachment">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                >
                <path
                  d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
                ></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              <span>{{ uploadedPPTFile.name }}</span>
              <button class="remove-ref" (click)="removeUploadedPPT()" type="button">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          }

          <!-- Extracted Documents Display (Word, PDF, TXT) -->
          @if (extractedDocuments && extractedDocuments.length > 0 && selectedFlow === 'ppt') {
            @for (doc of extractedDocuments; track doc.fileName) {
              <div class="reference-doc-preview ppt-attachment">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  >
                  <path
                    d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
                  ></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <span>{{ doc.fileName }}</span>
                <button class="remove-ref" (click)="removeExtractedDocument(doc.fileName)" type="button">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            }
          }

          <!-- Inline Error Message (for document upload validation) -->
          @if (editDocumentUploadError) {
            <div class="upload-error-message composer-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ editDocumentUploadError }}</span>
              <button 
                class="error-close-btn" 
                (click)="editDocumentUploadError = ''"
                type="button"
                aria-label="Close error message">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          }
        </div>

        <!-- AI Disclaimer Message -->
        @if (!showLandingPage) {
          <div class="ai-disclaimer">
            <p>This response is AI‑generated and may require human validation.</p>
          </div>
        }
      

      <!-- Guided Journey Dialog -->
      @if (showGuidedDialog) {
        <div
          class="dialog-overlay"
          >
          <div class="dialog-container" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <div>
                <h2>
                  {{
                  selectedFlow === "ppt" ? 'Create Presentation'
                  :selectedFlow === 'market-intelligence' ? 'Market Intelligence & Insights'
                  : "Cortex"
                  }}
                </h2>
                <!-- @if (selectedFlow === 'ppt') {
                  <p class="mi-intro-text">Where all firm intelligence is created, curated, and deployed</p>
                } -->
                @if (selectedFlow === 'market-intelligence') {
                  <p class="mi-intro-text">Structured preparation for confident client interactions</p>
                }
                @if (selectedFlow !== 'ppt' && selectedFlow !== 'market-intelligence') {
                  <p class="mi-intro-text">Where all firm intelligence is created, curated, and deployed</p>
                }
              </div>
              <button
                class="close-dialog-btn"
                (click)="closeGuidedDialog()"
                type="button"
                >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="dialog-content">
              <!-- PPT Forms -->
              @if (selectedFlow === 'ppt') {
                <div>
                  <div class="form-tabs">
                    <button
                      class="tab-btn"
                      [class.active]="selectedPPTOperation === 'draft'"
                      (click)="selectedPPTOperation = 'draft'"
                      >
                      Draft
                    </button>
                    <button
                      class="tab-btn"
                      [class.active]="selectedPPTOperation === 'improve'"
                      (click)="selectedPPTOperation = 'improve'"
                      >
                      Improve
                    </button>
                    <button
                      class="tab-btn"
                      [class.active]="selectedPPTOperation === 'sanitize'"
                      (click)="selectedPPTOperation = 'sanitize'"
                      >
                      Sanitize
                    </button>
                    <button
                      class="tab-btn"
                      [class.active]="selectedPPTOperation === 'bestPractices'"
                      (click)="selectedPPTOperation = 'bestPractices'"
                      >
                      Best Practices
                    </button>
                  </div>
                  @if (selectedPPTOperation === 'draft') {
                    <div class="form-content">
                      <div class="form-field">
                        <label>Topic *</label>
                        <input
                          type="text"
                          [(ngModel)]="draftData.topic"
                          placeholder="e.g., Digital Transformation Strategy"
                          aria-required="true"
                          [class.error]="!draftData.topic && draftData.topic !== ''"
                          />
                          @if (!draftData.topic && draftData.topic !== '') {
                            <small
                              class="error-text"
                              >Topic is required</small
                              >
                          }
                        </div>
                        <div class="form-field">
                          <label>Objective *</label>
                          <input
                            type="text"
                            [(ngModel)]="draftData.objective"
                            placeholder="e.g., Secure board approval"
                            aria-required="true"
                [class.error]="
                  !draftData.objective && draftData.objective !== ''
                "
                            />
                            @if (!draftData.objective && draftData.objective !== '') {
                              <small
                                class="error-text"
                                >Objective is required</small
                                >
                            }
                          </div>
                          <div class="form-field">
                            <label>Target Audience *</label>
                            <input
                              type="text"
                              [(ngModel)]="draftData.audience"
                              placeholder="e.g., C-Suite executives"
                              aria-required="true"
                              [class.error]="!draftData.audience && draftData.audience !== ''"
                              />
                              @if (!draftData.audience && draftData.audience !== '') {
                                <small
                                  class="error-text"
                                  >Target Audience is required</small
                                  >
                              }
                            </div>
                            <div class="form-field">
                              <label>Additional Context</label>
                              <textarea
                                [(ngModel)]="draftData.additional_context"
                                rows="3"
                                placeholder="Any specific requirements..."
                              ></textarea>
                            </div>
                            <div class="form-field">
                              <label>Reference Document (Optional)</label>
                              <input
                                type="file"
                                accept=".pdf,.docx,.pptx,.txt"
                                (change)="onReferenceDocumentSelected($event)"
                                class="file-input"
                                />
                                <small class="help-text"
                                  >Upload a reference document to include its content in the final
                                  output</small
                                  >
                                </div>
                                <div class="form-field">
                                  <label>Reference Link (Optional)</label>
                                  <input
                                    type="url"
                                    [(ngModel)]="draftData.reference_link"
                                    placeholder="https://example.com/reference"
                                    />
                                    <small class="help-text"
                                      >Provide a link to reference content</small
                                      >
                                    </div>
                                    <button
                                      class="submit-btn"
                                      (click)="createDraft(); closeGuidedDialog()"
              [disabled]="
                !draftData.topic ||
                !draftData.objective ||
                !draftData.audience ||
                isLoading
              "
                                      >
                                      Generate Presentation
                                    </button>
                                  </div>
                                }
                                @if (selectedPPTOperation === 'improve') {
                                  <div class="form-content">
                                    <div class="form-field">
                                      <label>Original PowerPoint *</label>
                                      <div class="file-upload-area">
                                        <input
                                          type="file"
                                          accept=".pptx"
                                          (change)="onOriginalFileSelected($event)"
                                          id="original-file"
                                          class="file-input-hidden"
                                          />
                                          <label for="original-file" class="file-upload-label">
                                            <svg
                                              width="24"
                                              height="24"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              stroke-width="2"
                                              >
                                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                              <polyline points="17 8 12 3 7 8"></polyline>
                                              <line x1="12" y1="3" x2="12" y2="15"></line>
                                            </svg>
                                            @if (!originalPPTFile) {
                                              <span>Upload file</span>
                                            }
                                            @if (originalPPTFile) {
                                              <span class="file-name"
                                                >✓ {{ originalPPTFile.name }}</span
                                                >
                                            }
                                          </label>
                                        </div>
                                      </div>
                                      <div class="form-field">
                                        <label>Reference PowerPoint (optional)</label>
                                        <div class="file-upload-area">
                                          <input
                                            type="file"
                                            accept=".pptx"
                                            (change)="onReferenceFileSelected($event)"
                                            id="reference-file"
                                            class="file-input-hidden"
                                            />
                                            <label for="reference-file" class="file-upload-label">
                                              <svg
                                                width="24"
                                                height="24"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                >
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="17 8 12 3 7 8"></polyline>
                                                <line x1="12" y1="3" x2="12" y2="15"></line>
                                              </svg>
                                              @if (!referencePPTFile) {
                                                <span>Upload file</span>
                                              }
                                              @if (referencePPTFile) {
                                                <span class="file-name"
                                                  >✓ {{ referencePPTFile.name }}</span
                                                  >
                                              }
                                            </label>
                                          </div>
                                        </div>
                                        <button
                                          class="submit-btn"
                                          (click)="improvePPT(); closeGuidedDialog()"
                                          [disabled]="!originalPPTFile || isLoading"
                                          >
                                          Improve Presentation
                                        </button>
                                      </div>
                                    }
                                    @if (selectedPPTOperation === 'sanitize') {
                                      <div class="form-content">
                                        <div class="form-field">
                                          <label>PowerPoint File *</label>
                                          <div class="file-upload-area">
                                            <input
                                              type="file"
                                              accept=".pptx"
                                              (change)="onSanitizeFileSelected($event)"
                                              id="sanitize-file"
                                              class="file-input-hidden"
                                              />
                                              <label for="sanitize-file" class="file-upload-label">
                                                <svg
                                                  width="24"
                                                  height="24"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  stroke-width="2"
                                                  >
                                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                  <polyline points="17 8 12 3 7 8"></polyline>
                                                  <line x1="12" y1="3" x2="12" y2="15"></line>
                                                </svg>
                                                @if (!sanitizePPTFile) {
                                                  <span>Upload file</span>
                                                }
                                                @if (sanitizePPTFile) {
                                                  <span class="file-name"
                                                    >✓ {{ sanitizePPTFile.name }}</span
                                                    >
                                                }
                                              </label>
                                            </div>
                                          </div>
                                          <div class="form-field">
                                            <label>Client Name (optional)</label>
                                            <input
                                              type="text"
                                              [(ngModel)]="sanitizeData.clientName"
                                              placeholder="e.g., Adobe Inc"
                                              />
                                            </div>
                                            <div class="form-field">
                                              <label>Product Names (optional)</label>
                                              <input
                                                type="text"
                                                [(ngModel)]="sanitizeData.products"
                                                placeholder="e.g., Photoshop, Creative Cloud"
                                                />
                                              </div>
                                              <div class="form-field">
                                                <label style="margin-bottom: 12px; display: block"
                                                  >Sanitization Options</label
                                                  >
                                                  <div class="checkbox-group">
                                                    <label class="checkbox-label">
                                                      <input
                                                        type="checkbox"
                                                        [(ngModel)]="sanitizeData.options.numericData"
                                                        />
                                                        <span>Numeric Data (currency, percentages, FTEs)</span>
                                                      </label>
                                                      <label class="checkbox-label">
                                                        <input
                                                          type="checkbox"
                                                          [(ngModel)]="sanitizeData.options.personalInfo"
                                                          />
                                                          <span
                                                            >Personal Information (emails, phones, SSN, IP
                                                            addresses)</span
                                                            >
                                                          </label>
                                                          <label class="checkbox-label">
                                                            <input
                                                              type="checkbox"
                                                              [(ngModel)]="sanitizeData.options.financialData"
                                                              />
                                                              <span
                                                                >Financial Data (credit cards, bank accounts, tax IDs)</span
                                                                >
                                                              </label>
                                                              <label class="checkbox-label">
                                                                <input
                                                                  type="checkbox"
                                                                  [(ngModel)]="sanitizeData.options.locations"
                                                                  />
                                                                  <span>Locations (addresses, cities, states, zip codes)</span>
                                                                </label>
                                                                <label class="checkbox-label">
                                                                  <input
                                                                    type="checkbox"
                                                                    [(ngModel)]="sanitizeData.options.identifiers"
                                                                    />
                                                                    <span
                                                                      >Business Identifiers (project IDs, deal codes,
                                                                      invoices)</span
                                                                      >
                                                                    </label>
                                                                    <label class="checkbox-label">
                                                                      <input
                                                                        type="checkbox"
                                                                        [(ngModel)]="sanitizeData.options.names"
                                                                        />
                                                                        <span>Client & Product Names</span>
                                                                      </label>
                                                                      <label class="checkbox-label">
                                                                        <input
                                                                          type="checkbox"
                                                                          [(ngModel)]="sanitizeData.options.logos"
                                                                          />
                                                                          <span>Logos & Watermarks</span>
                                                                        </label>
                                                                        <label class="checkbox-label">
                                                                          <input
                                                                            type="checkbox"
                                                                            [(ngModel)]="sanitizeData.options.metadata"
                                                                            />
                                                                            <span>Metadata & Speaker Notes</span>
                                                                          </label>
                                                                          <label class="checkbox-label">
                                                                            <input
                                                                              type="checkbox"
                                                                              [(ngModel)]="sanitizeData.options.llmDetection"
                                                                              />
                                                                              <span
                                                                                >AI-Powered Detection (company names, person names,
                                                                                cities)</span
                                                                                >
                                                                              </label>
                                                                              <label class="checkbox-label">
                                                                                <input
                                                                                  type="checkbox"
                                                                                  [(ngModel)]="sanitizeData.options.hyperlinks"
                                                                                  />
                                                                                  <span>Hyperlinks (remove all hyperlinks from shapes)</span>
                                                                                </label>
                                                                                <label class="checkbox-label">
                                                                                  <input
                                                                                    type="checkbox"
                                                                                    [(ngModel)]="sanitizeData.options.embeddedObjects"
                                                                                    />
                                                                                    <span>Embedded Objects (Excel, Word, PDF files)</span>
                                                                                  </label>
                                                                                </div>
                                                                              </div>
                                                                              <button
                                                                                class="submit-btn"
                                                                                (click)="sanitizePPT(); closeGuidedDialog()"
                                                                                [disabled]="!sanitizePPTFile || isLoading"
                                                                                >
                                                                                Sanitize Presentation
                                                                              </button>
                                                                            </div>
                                                                          }
                                                                          @if (selectedPPTOperation === 'bestPractices') {
                                                                            <div
                                                                              class="form-content"
                                                                              >
                                                                              <div class="form-field">
                                                                                <label>PowerPoint File *</label>
                                                                                <div class="file-upload-area">
                                                                                  <input
                                                                                    type="file"
                                                                                    accept=".pptx"
                                                                                    (change)="onBestPracticesFileSelected($event)"
                                                                                    id="best-practices-file"
                                                                                    class="file-input-hidden"
                                                                                    />
                                                                                    <label for="best-practices-file" class="file-upload-label">
                                                                                      <svg
                                                                                        width="24"
                                                                                        height="24"
                                                                                        viewBox="0 0 24 24"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        stroke-width="2"
                                                                                        >
                                                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                                                        <polyline points="17 8 12 3 7 8"></polyline>
                                                                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                                                                      </svg>
                                                                                      @if (!bestPracticesPPTFile) {
                                                                                        <span>Upload file</span>
                                                                                      }
                                                                                      @if (bestPracticesPPTFile) {
                                                                                        <span class="file-name"
                                                                                          >✓ {{ bestPracticesPPTFile.name }}</span
                                                                                          >
                                                                                      }
                                                                                    </label>
                                                                                  </div>
                                                                                </div>
                                                                                <div class="form-field">
                                                                                  <label style="margin-bottom: 12px; display: block"
                                                                                    >Validation Categories</label
                                                                                    >
                                                                                    <div class="checkbox-group">
                                                                                      <label class="checkbox-label">
                                                                                        <input
                                                                                          type="checkbox"
                                                                                          [(ngModel)]="bestPracticesData.categories.structure"
                                                                                          />
                                                                                          <span>Structure (MECE framework, logical flow)</span>
                                                                                        </label>
                                                                                        <label class="checkbox-label">
                                                                                          <input
                                                                                            type="checkbox"
                                                                                            [(ngModel)]="bestPracticesData.categories.visuals"
                                                                                            />
                                                                                            <span>Visuals (Image quality, relevance, placement)</span>
                                                                                          </label>
                                                                                          <label class="checkbox-label">
                                                                                            <input
                                                                                              type="checkbox"
                                                                                              [(ngModel)]="bestPracticesData.categories.design"
                                                                                              />
                                                                                              <span>Design (Color scheme, fonts, spacing)</span>
                                                                                            </label>
                                                                                            <label class="checkbox-label">
                                                                                              <input
                                                                                                type="checkbox"
                                                                                                [(ngModel)]="bestPracticesData.categories.charts"
                                                                                                />
                                                                                                <span>Charts (Data visualization, clarity, labels)</span>
                                                                                              </label>
                                                                                              <label class="checkbox-label">
                                                                                                <input
                                                                                                  type="checkbox"
                                                                                                  [(ngModel)]="bestPracticesData.categories.formatting"
                                                                                                  />
                                                                                                  <span>Formatting (Consistency, alignment, text size)</span>
                                                                                                </label>
                                                                                                <label class="checkbox-label">
                                                                                                  <input
                                                                                                    type="checkbox"
                                                                                                    [(ngModel)]="bestPracticesData.categories.content"
                                                                                                    />
                                                                                                    <span>Content (Clarity, conciseness, grammar)</span>
                                                                                                  </label>
                                                                                                </div>
                                                                                              </div>
                                                                                              <button
                                                                                                class="submit-btn"
                                                                                                (click)="submitBestPracticesForm()"
                                                                                                [disabled]="!bestPracticesPPTFile || isLoading"
                                                                                                >
                                                                                                Validate Best Practices
                                                                                              </button>
                                                                                            </div>
                                                                                          }
                                                                                        </div>
                                                                                      }
                                                                                      <!-- Thought Leadership Action Cards -->
                                                                                      @if (selectedFlow === 'thought-leadership') {
                                                                                        <div>
                                                                                          <!-- <p class="tl-intro-text">Where all firm intelligence is created, curated, and deployed</p> -->
                                                                                          <div class="tl-action-cards-grid">
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('draft-content')">
                                                                                              <div class="tl-card-icon">✍️</div>
                                                                                              <h3>Draft Content</h3>
                                                                                              <p>Turn preliminary concepts or outlines into well-research, written, and edited drafts​</p>
                                                                                            </button>
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('conduct-research')">
                                                                                              <div class="tl-card-icon">🔍</div>
                                                                                              <h3>Conduct Research</h3>
                                                                                              <p>Tap into PwC’s full knowledge bank and third-party sources to execute targeted research in minutes​</p>
                                                                                            </button>
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('edit-content')">
                                                                                              <div class="tl-card-icon">✏️</div>
                                                                                              <h3>Edit Content</h3>
                                                                                              <p>Deploy development, content, line, copy, and PwC brand alignment editors​</p>
                                                                                            </button>
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('refine-content')">
                                                                                              <div class="tl-card-icon">⚡</div>
                                                                                              <h3>Refine Drafts</h3>
                                                                                              <p>Expand or compress content, change tone, or enhance with targeted research & insights​</p>
                                                                                            </button>
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('format-translator')">
                                                                                              <div class="tl-card-icon">🔄</div>
                                                                                              <h3>Adapt Content</h3>
                                                                                              <p>Transform final outputs into podcasts, social media posts or placemats</p>
                                                                                            </button>
                                                                                          </div>
                                                                                        </div>
                                                                                      }
                                                                                      <!-- Market Intelligence Action Cards -->
                                                                                      @if (selectedFlow === 'market-intelligence') {
                                                                                        <div>
                                                                                          <!-- <p class="mi-intro-text">Where data and research are transformed into decision-ready analysis and action​</p> -->
                                                                                          <div class="mi-action-cards-grid">
                                                                                            <!-- <button class="mi-action-card" (click)="onMIActionCardClick('draft-content')">
                                                                                              <div class="mi-card-icon">📝</div>
                                                                                              <h3>Draft Content</h3>
                                                                                              <p>Generate market research articles, reports, and briefs powered by AI strategic analysis.</p>
                                                                                            </button> -->
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('conduct-research')">
                                                                                              <div class="mi-card-icon">🔍</div>
                                                                                              <h3>Conduct Research</h3>
                                                                                              <p>Tap into PwC’s full knowledge bank and third-party sources to execute targeted research in minutes ​</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('target-industry-insights')">
                                                                                              <div class="mi-card-icon">🔄</div>
                                                                                              <h3>Generate Industry Insights</h3>
                                                                                              <p>Synthesize PwC expertise and market data to deliver structured industry intelligence​</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('prepare-client-meeting')">
                                                                                              <div class="mi-card-icon">✨</div>
                                                                                              <h3>Prepare for Client Meeting</h3>
                                                                                              <p> Rapidly ramp-up for senior discussions with structured insights informed by years of experience ​</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('create-pov')">
                                                                                              <div class="mi-card-icon">📋</div>
                                                                                              <h3>Create Point of View</h3>
                                                                                              <p>Quickly convert targeted research into well-written, edited, and refined perspectives​</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('gather-proposal-insights')">
                                                                                              <div class="mi-card-icon">🔀</div>
                                                                                              <h3>Gather Proposal Inputs</h3>
                                                                                              <p>Develop a proposal outline and pull sample frameworks, approaches, and quals with one click ​</p>
                                                                                            </button>
                                                                                            
                                                                                            <!-- <button class="mi-action-card" (click)="onMIActionCardClick('generate-podcast')">
                                                                                              <div class="mi-card-icon">🎙️</div>
                                                                                              <h3>Generate Podcast</h3>
                                                                                              <p>Transform market research into engaging podcast scripts for audio distribution.</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('brand-format')">
                                                                                              <div class="mi-card-icon">🎨</div>
                                                                                              <h3>Brand Format</h3>
                                                                                              <p>Apply PwC branding standards and visual formatting to your market analysis.</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('professional-polish')">
                                                                                              <div class="mi-card-icon">⭐</div>
                                                                                              <h3>Professional Polish</h3>
                                                                                              <p>Apply premium editing and refinement for executive-level market intelligence.</p>
                                                                                            </button>  -->
                                                                                          </div>
                                                                                        </div>
                                                                                      }
                                                                                    </div>
                                                                                  </div>
                                                                                </div>
                                                                              }
                                                                            

                                                                            <!-- Thought Leadership Guided Flow Components -->
                                                                            <app-draft-content-flow></app-draft-content-flow>
                                                                            <app-conduct-research-flow></app-conduct-research-flow>
                                                                            <app-edit-content-flow></app-edit-content-flow>
                                                                            <app-refine-content-flow
                                                                              (contentGenerated)="onRefinedContentGenerated($event)"
                                                                              (streamToChat)="onRefineContentStreamToChat($event)">
                                                                            </app-refine-content-flow>
                                                                            <app-format-translator-flow></app-format-translator-flow>

                                                                            <!-- Market Intelligence Guided Flow Components -->
                                                                            <app-mi-draft-content-flow></app-mi-draft-content-flow>
                                                                            <app-mi-conduct-research-flow></app-mi-conduct-research-flow>
                                                                            <app-mi-edit-content-flow></app-mi-edit-content-flow>
                                                                            <app-mi-refine-content-flow></app-mi-refine-content-flow>
                                                                            <app-mi-format-translator-flow></app-mi-format-translator-flow>
                                                                            <app-mi-generate-podcast-flow></app-mi-generate-podcast-flow>
                                                                            <app-mi-brand-format-flow></app-mi-brand-format-flow>
                                                                            <app-mi-professional-polish-flow></app-mi-professional-polish-flow>
                                                                            <app-mi-create-pov-flow></app-mi-create-pov-flow>
                                                                            <app-mi-prepare-client-meeting-flow></app-mi-prepare-client-meeting-flow>
                                                                            <app-mi-gather-proposal-insights-flow></app-mi-gather-proposal-insights-flow>
                                                                            <app-mi-target-industry-insights-flow></app-mi-target-industry-insights-flow>

                                                                            <!-- DDC Guided Dialog and Flow Components -->
                                                                            <app-guided-dialog
                                                                              [isOpen]="showDdcGuidedDialog"
                                                                              journeyType="ddc"
                                                                              [title]="'Doc Studio'"
                                                                              [introText]="ddcIntroText"
                                                                              [subIntroText]="ddcSubIntroText"
                                                                              [workflows]="ddcWorkflows"
                                                                              (workflowSelected)="onWorkflowSelected($event)"
                                                                              (close)="closeDdcGuidedDialog()">
                                                                            </app-guided-dialog>

                                                                            <!-- MI Guided Dialog and Flow Components -->
                                                                            <app-guided-dialog
                                                                              [isOpen]="showMiGuidedDialog"
                                                                              journeyType="market-intelligence"
                                                                              [workflows]="miWorkflows"
                                                                              (workflowSelected)="onWorkflowSelected($event)"
                                                                              (close)="closeGuidedDialog()">
                                                                            </app-guided-dialog>

                                                                            <!-- Quick Draft Dialog -->
                                                                            <app-quick-draft-dialog
                                                                              [isOpen]="showQuickDraftDialog"
                                                                              [topic]="quickDraftTopic"
                                                                              [contentType]="quickDraftContentType"
                                                                              (close)="closeQuickDraftDialog()"
                                                                              (submit)="onQuickDraftSubmit($event)">
                                                                            </app-quick-draft-dialog>

                                                                            <app-brand-format-flow></app-brand-format-flow>
                                                                            <app-professional-polish-flow></app-professional-polish-flow>
                                                                            <app-sanitization-flow
                                                                              [hideBackButton]="workflowOpenedFrom === 'quick-action'"
                                                                              [openedFrom]="workflowOpenedFrom">
                                                                            </app-sanitization-flow>
                                                                            <app-client-customization-flow></app-client-customization-flow>
                                                                            <app-rfp-response-flow></app-rfp-response-flow>
                                                                            <app-ddc-format-translator-flow></app-ddc-format-translator-flow>
                                                                            <app-slide-creation-flow
                                                                              [hideBackButton]="workflowOpenedFrom === 'quick-action'"
                                                                              [openedFrom]="workflowOpenedFrom">
                                                                            </app-slide-creation-flow>
                                                                            <app-slide-creation-prompt-flow
                                                                              [hideBackButton]="workflowOpenedFrom === 'quick-action'"
                                                                              [openedFrom]="workflowOpenedFrom">
                                                                            </app-slide-creation-prompt-flow>

                                                                            <!-- Voice Input Modal -->
                                                                            <app-voice-input
                                                                              (transcriptChange)="onVoiceTranscriptChange($event)"
                                                                              (listeningChange)="onVoiceListeningChange($event)"
                                                                            ></app-voice-input>

                                                                            <!-- DDC Request Form -->
                                                                            @if (showRequestForm) {
                                                                              <app-ddc-request-form
                                                                                (ticketCreated)="onTicketCreated($event)"
                                                                                (close)="showRequestForm = false">
                                                                              </app-ddc-request-form>
                                                                            }
                                                                            
                                                                            <!-- TL Request Form (MCX Publication Support) -->
                                                                            @if (showTLRequestForm) {
                                                                              <app-tl-request-form
                                                                                (ticketCreated)="onTicketCreated($event)"
                                                                                (close)="showTLRequestForm = false">
                                                                              </app-tl-request-form>
                                                                            }
                                                                          }
                                                                     
