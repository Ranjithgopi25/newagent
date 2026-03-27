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
        <!-- <span class="business-services-text">Business Services</span> -->
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
          <!-- <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg> -->
          <svg width="20.000000pt" height="20.000000pt" viewBox="0 0 90.000000 90.000000"  preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,90.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M234 681 l-211 -168 19 -23 19 -23 22 22 c13 11 25 21 28 21 2 0 3 -90 1 -200 l-3 -200 319 0 318 0 22 30 23 30 -101 0 -100 0 0 140 0 140 -140 0 -140 0 0 -140 0 -140 -70 0 -70 0 0 194 0 193 140 112 140 111 140 -112 140 -112 0 -168 0 -168 31 0 30 0 -3 150 -3 149 28 -26 c26 -26 27 -26 42 -7 8 10 15 22 15 26 0 3 -30 30 -67 59 -38 30 -132 104 -210 166 -77 62 -143 113 -145 112 -1 0 -98 -76 -214 -168z m-87 -130 c0 -11 -4 -18 -8 -15 -4 2 -10 0 -14 -6 -3 -5 -12 -10 -18 -10 -7 0 -6 4 3 10 8 5 11 10 6 10 -6 0 -1 7 10 15 24 18 23 18 21 -4z m386 -270 l2 -111 -85 0 -85 0 2 112 c2 62 3 113 3 113 0 0 36 -1 80 -2 l81 -1 2 -111z m-196 -133 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m243 1 c0 -13 -27 -11 -36 3 -4 7 -3 8 4 4 7 -4 12 -2 12 4 0 6 5 8 10 5 6 -3 10 -10 10 -16z"/> </g> </svg>
        </button>
        <!-- Notification Bell Button with Dropdown -->
        <div class="notification-dropdown-wrapper">
          <button
            class="header-icon-btn notifications"
            type="button"
            title="Notifications"
            (click)="toggleNotificationDropdown()"
            >
            <!-- <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg> -->
            <svg width="20.000000pt" height="20.000000pt" viewBox="0 0 90.000000 90.000000"  preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,90.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none"> <path d="M420 800 c0 -47 0 -48 -37 -54 -50 -8 -94 -36 -128 -80 -41 -54 -54 -102 -55 -202 l0 -90 -69 -102 -69 -102 353 0 353 0 16 25 c9 13 16 26 16 27 0 2 -142 2 -315 0 -173 -1 -315 0 -315 3 0 3 17 32 39 63 37 55 38 61 44 162 3 58 10 119 17 135 47 123 230 157 322 59 40 -43 55 -97 57 -202 2 -78 6 -100 24 -128 18 -27 29 -34 55 -34 17 0 32 3 32 6 0 3 -13 25 -30 49 -27 40 -30 51 -30 127 0 46 -5 100 -10 120 -23 80 -118 167 -182 168 -26 0 -28 3 -28 44 0 41 -2 44 -30 48 -30 4 -30 4 -30 -42z m40 -60 c0 -5 -7 -10 -16 -10 -8 0 -12 5 -9 10 3 6 10 10 16 10 5 0 9 -4 9 -10z m-308 -525 c16 -19 15 -20 -11 -20 -24 0 -26 2 -16 22 5 12 10 21 10 20 0 -1 8 -11 17 -22z"/> <path d="M280 83 l0 -28 170 0 170 0 0 28 0 27 -170 0 -170 0 0 -27z"/> </g> </svg>
            <!-- <span class="notification-badge">3</span> -->
          </button>
          <!-- @if (showNotificationDropdown) {
            <div class="notification-dropdown-menu">
            </div>
          } -->
        </div>
        <!-- Support Button -->
        <button
          class="header-icon-btn support-btn"
          type="button"
          title="Support"
          (click)="openSupport()"
          >
          Support
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
          *ngIf="docStudioAccessible"
          title="Doc studio"
          >
          <svg width="96.000000pt" height="96.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"> <path d="M545 941 c-3 -5 -2 -12 3 -15 5 -3 9 1 9 9 0 17 -3 19 -12 6z"/> <path d="M546 893 c-6 -14 -5 -15 5 -6 7 7 10 15 7 18 -3 3 -9 -2 -12 -12z"/> <path d="M150 480 l0 -420 214 0 c178 0 216 3 226 15 11 13 5 15 -49 15 l-61 0 0 75 c0 60 -3 75 -15 75 -12 0 -15 -15 -15 -75 l0 -75 -135 0 -135 0 0 390 0 390 150 0 150 0 0 -120 0 -120 120 0 120 0 0 -60 c0 -52 -2 -60 -19 -60 -10 0 -21 -7 -25 -15 -4 -12 5 -15 49 -15 l55 0 0 -90 c0 -73 3 -90 15 -90 12 0 15 18 15 105 l0 105 -30 0 -30 0 0 71 0 70 -124 125 -125 124 -175 0 -176 0 0 -420z m487 239 l68 -64 -97 3 -98 3 0 95 0 95 30 -34 c16 -19 60 -63 97 -98z"/> <path d="M785 710 c3 -5 8 -10 11 -10 2 0 4 5 4 10 0 6 -5 10 -11 10 -5 0 -7 -4 -4 -10z"/> <path d="M240 495 c0 -12 15 -15 75 -15 60 0 75 3 75 15 0 12 -15 15 -75 15 -60 0 -75 -3 -75 -15z"/> <path d="M450 405 c0 -87 3 -105 15 -105 12 0 15 17 15 90 l0 90 49 0 c31 0 53 5 61 15 11 13 3 15 -64 15 l-76 0 0 -105z"/> <path d="M240 405 c0 -12 15 -15 75 -15 60 0 75 3 75 15 0 12 -15 15 -75 15 -60 0 -75 -3 -75 -15z"/> <path d="M540 405 c0 -12 17 -15 90 -15 73 0 90 3 90 15 0 12 -17 15 -90 15 -73 0 -90 -3 -90 -15z"/> <path d="M240 315 c0 -12 15 -15 75 -15 60 0 75 3 75 15 0 12 -15 15 -75 15 -60 0 -75 -3 -75 -15z"/> <path d="M540 315 c0 -12 17 -15 90 -15 73 0 90 3 90 15 0 12 -17 15 -90 15 -73 0 -90 -3 -90 -15z"/> <path d="M240 225 c0 -12 15 -15 75 -15 60 0 75 3 75 15 0 12 -15 15 -75 15 -60 0 -75 -3 -75 -15z"/> <path d="M540 225 c0 -12 17 -15 90 -15 73 0 90 3 90 15 0 12 -17 15 -90 15 -73 0 -90 -3 -90 -15z"/> <path d="M780 165 l0 -75 -49 0 c-31 0 -53 -5 -61 -15 -11 -13 -3 -15 64 -15 l76 0 0 90 c0 73 -3 90 -15 90 -12 0 -15 -15 -15 -75z"/> </g> </svg>
          <span class="nav-label">Doc studio</span>
        </button>
        <button
          class="icon-nav-btn"
          [class.active]="selectedFlow === 'market-intelligence'"
          [class.hidden]="!offeringVisibility['market-intelligence']"
          (click)="selectFlow('market-intelligence')"
          type="button"
          *ngIf="marketIntelligenceAccessible"
          title="Market intelligence and insights"
          >
          <svg width="96.000000pt" height="96.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"> <path d="M750 836 c0 -8 9 -16 20 -18 15 -2 -13 -31 -117 -123 -203 -178 -174 -164 -233 -109 l-50 46 -27 -17 c-16 -10 -81 -56 -145 -102 -83 -59 -115 -88 -111 -99 3 -9 9 -11 17 -6 6 5 68 50 137 100 l127 90 48 -49 c26 -27 51 -49 54 -49 3 0 79 65 170 145 133 116 166 141 168 125 4 -25 32 -26 32 -1 0 10 3 33 6 50 l7 31 -52 0 c-38 0 -51 -4 -51 -14z"/> <path d="M705 380 l0 -271 84 3 c57 2 86 7 89 16 3 9 -15 12 -70 12 l-73 0 0 240 0 240 63 0 63 0 -1 -217 c-1 -191 0 -218 14 -221 14 -3 16 23 16 232 l0 236 -92 0 -93 0 0 -270z"/> <path d="M536 498 c3 -5 10 -6 15 -3 13 9 11 12 -6 12 -8 0 -12 -4 -9 -9z"/> <path d="M285 275 l0 -165 81 0 c60 0 85 4 94 15 11 13 2 15 -69 15 l-81 0 0 135 0 135 66 0 66 0 -4 -112 c-2 -90 0 -113 11 -113 10 0 14 27 15 127 l1 128 -90 0 -90 0 0 -165z"/> <path d="M495 260 l0 -150 92 0 92 0 -1 150 -1 150 -91 0 -91 0 0 -150z m155 0 l0 -120 -62 0 -63 0 0 120 0 120 63 0 62 0 0 -120z"/> <path d="M70 215 l0 -105 93 0 92 0 0 105 0 105 -92 0 -93 0 0 -105z m155 0 l0 -75 -62 0 -63 0 0 75 0 75 63 0 62 0 0 -75z"/> </g> </svg>
          <span class="nav-label">
            <span class="label-line">Market intelligence and insights</span>
          </span>
        </button>
        <button
          class="icon-nav-btn"
          [class.active]="selectedFlow === 'thought-leadership'"
          [class.hidden]="!offeringVisibility['thought-leadership']"
          (click)="selectFlow('thought-leadership')"
          type="button"
          *ngIf="isProfilePresent(profile) && cortexAccessible"
          title="Cortex content studio"
          >
          <svg width="96.000000pt" height="96.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"> <path d="M380 917 c-129 -37 -200 -132 -200 -269 0 -62 11 -91 76 -199 32 -53 34 -62 34 -148 l0 -91 162 2 c124 2 162 6 166 16 3 9 -3 13 -14 12 -11 -1 -80 -2 -154 -1 l-135 1 3 78 c3 77 3 79 -43 157 -60 100 -66 117 -66 180 -2 155 122 255 298 242 132 -10 209 -70 221 -172 3 -31 9 -45 20 -45 25 0 8 97 -25 144 -45 63 -115 96 -215 101 -52 3 -100 0 -128 -8z"/> <path d="M606 711 c-4 -5 -2 -12 3 -15 5 -4 12 -2 15 3 4 5 2 12 -3 15 -5 4 -12 2 -15 -3z"/> <path d="M350 650 c-15 -28 -4 -57 27 -73 l25 -14 -1 -156 c-2 -136 0 -157 14 -157 13 0 15 22 15 161 l0 160 33 -3 32 -3 3 -157 c2 -138 5 -158 19 -158 14 0 15 17 11 159 l-5 160 23 5 c58 15 53 96 -6 96 -35 0 -53 -30 -40 -65 7 -19 4 -20 -31 -17 -35 4 -39 7 -37 31 3 37 -9 51 -42 51 -19 0 -33 -7 -40 -20z m60 -37 c0 -25 0 -26 -20 -8 -11 10 -20 22 -20 27 0 4 9 8 20 8 15 0 20 -7 20 -27z m143 21 c9 -10 -4 -34 -19 -34 -8 0 -14 9 -14 20 0 19 19 27 33 14z"/> <path d="M747 638 c-2 -7 14 -41 35 -76 21 -34 38 -66 38 -70 0 -4 -13 -16 -30 -25 -27 -16 -30 -23 -30 -68 l0 -49 -85 0 -85 0 0 -35 c0 -24 5 -35 15 -35 8 0 15 9 15 20 0 18 7 20 73 20 43 0 78 5 85 12 7 7 12 33 12 58 0 42 3 47 35 64 19 11 35 22 35 26 0 13 -94 170 -102 170 -3 0 -8 -6 -11 -12z"/> <path d="M300 165 c-11 -13 6 -15 143 -15 125 0 157 3 167 15 11 13 -6 15 -143 15 -125 0 -157 -3 -167 -15z"/> <path d="M300 105 c-11 -13 6 -15 143 -15 125 0 157 3 167 15 11 13 -6 15 -143 15 -125 0 -157 -3 -167 -15z"/> <path d="M360 45 c-11 -13 -1 -15 83 -15 72 0 98 4 107 15 11 13 1 15 -83 15 -72 0 -98 -4 -107 -15z"/> </g> </svg>
          <span class="nav-label">
            <span class="label-line">Cortex content studio</span>
          </span>
        </button>
        <!-- separator below Cortex -->
        <div class="sidebar-separator" aria-hidden="true"></div>
        <button
          class="icon-nav-btn"
          (click)="toggleHistoryPanel()"
          [class.active]="showHistoryPanel"
          type="button"
          title="Research and request history"
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
            <span class="label-line">Research and request history</span>
          </span>
        </button>
        @if(true) {
        <button 
          class="icon-nav-btn" 
          type="button" 
          title="My requests" 
          (click)="onMyRequestsClick()"
          [class.active]="showMyRequestsPanelParent">
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
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
          </svg>
          <span class="nav-label">My requests</span>
        </button>
        }
        @if(!showLandingPage && !showMyRequestsPanelParent) {
        <button class="icon-nav-btn" type="button" title="New chat" (click)="startNewChat()">
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
          <span class="nav-label">New chat</span>
        </button>
      }
        <!-- separator below New Chat -->
        <div class="sidebar-separator" aria-hidden="true"></div>
        @if (selectedFlow === 'ppt') {
          <button
                class="icon-nav-btn"
                (click)="openRequestForm()"
                title="Request DDC support"
                 >
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
                  <span class="label-line">Request DDC support</span>
                </span>
            </button>
        }
        <!-- @if (selectedFlow === 'thought-leadership') {
         <button
                class="icon-nav-btn"
                (click)="onRaisePhoenix()"
                title="Request MCX Publication Support"
                [disabled]="true"
                *ngIf="isProfilePresent(profile)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2s-4 3-4 7c0 5 4 9 4 9s4-4 4-9c0-4-4-7-4-7z"></path>
                  <path d="M5 18c2 2 5 3 7 3s5-1 7-3"></path>
                </svg>
                <span class="nav-label">
                  <span class="label-line">Request MCX publication support</span>
                </span>
              </button>
        } -->
        @if (selectedFlow === 'thought-leadership') {
          <button
                class="icon-nav-btn"
                (click)="onTLActionCardClick('ready-to-publish')"
                title="Ready to publish"
                *ngIf="isProfilePresent(profile)"
                >
                <svg width="20" height="20" viewBox="0 0 96.000000 96.000000" preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"> <path d="M60 554 l0 -324 173 2 c220 4 229 22 12 26 l-155 3 0 292 0 292 390 0 390 0 0 -285 0 -285 -41 73 -40 73 -117 -3 -117 -3 -53 -92 -54 -92 43 -76 c34 -59 48 -75 66 -75 23 0 23 2 23 110 0 90 -3 110 -15 110 -11 0 -15 -19 -17 -90 l-3 -91 -31 58 -32 58 47 78 46 77 99 -2 99 -3 43 -70 c24 -38 43 -75 44 -81 0 -6 -15 -37 -32 -70 l-33 -59 -3 98 c-2 77 -6 97 -17 97 -12 0 -15 -20 -15 -110 l0 -110 28 0 c23 1 33 11 70 75 l42 75 0 324 0 325 -420 0 -420 0 0 -325z"/> <path d="M208 765 c-31 -17 -63 -67 -73 -112 -9 -44 24 -117 65 -142 52 -31 94 -35 145 -12 107 47 118 197 19 262 -35 23 -117 25 -156 4z m62 -72 c0 -62 -35 -166 -54 -160 -6 1 -22 24 -35 50 -28 57 -23 87 24 134 50 50 65 45 65 -24z m96 23 c50 -50 46 -66 -16 -66 l-50 0 0 50 c0 62 16 66 66 16z m34 -107 c0 -24 -35 -68 -67 -83 -35 -16 -87 -22 -81 -8 2 4 11 28 22 55 l19 47 53 0 c33 0 54 -4 54 -11z"/> <path d="M603 700 c-110 -67 -64 -240 64 -242 104 -1 170 96 127 187 -33 71 -123 97 -191 55z m140 -36 c63 -62 36 -149 -56 -178 -44 -14 -117 46 -117 96 0 63 44 107 106 108 31 0 48 -6 67 -26z"/> <path d="M150 441 c0 -13 15 -16 95 -16 78 0 95 3 95 15 0 12 -18 15 -95 16 -80 0 -95 -2 -95 -15z"/> <path d="M150 378 c0 -16 13 -18 130 -18 117 0 130 2 130 18 0 15 -13 17 -130 17 -117 0 -130 -2 -130 -17z"/> </g> </svg>
                <span class="nav-label">
                  <span class="label-line">Ready to publish</span>
                </span>
              </button>
        }
      </nav>
      
      <!-- Copyright Footer -->
      <!-- <div class="sidebar-copyright">
        <p>©2026 PwC. All rights reserved.</p>
      </div> -->
    </aside>    <!-- Chat History Panel -->
    <div class="history-panel" [class.show]="showHistoryPanel">
      <div class="history-header">
        <h3>Research and request history</h3>
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
            <h1 class="banner-title" [class.market-intelligence]="selectedFlow === 'market-intelligence'" [class.ppt]="selectedFlow === 'ppt'">
              @if (showMyRequestsPanelParent) {
                My Requests
              } @else {
                {{ getFeatureName() }}
              }
            </h1>
          </div>
          <div class="banner-image"></div>
        </div>

        <!-- Feature Name -->
        <!-- <h1 class="feature-name">{{ getFeatureName() }}</h1> -->

        <!-- Landing Page (First Time User) -->
        @if (showLandingPage && !showMyRequestsPanelParent) {
          <div class="content-area landing-page-view" [class.fade-out]="landingPageFadingOut">
            <div class="landing-page-content">
              <div class="landing-header">
                <h1>Welcome to Think Space</h1>
                <p>A space for bold thinking</p>
              </div>

              <div class="landing-buttons-grid" 
                   [ngClass]="{
                     'grid-cols-1': accessibleModuleCount === 1,
                     'grid-cols-2': accessibleModuleCount === 2,
                     'grid-cols-3': accessibleModuleCount === 3
                   }">
                <button
                  class="landing-flow-btn ddc-flow-btn"
                  (click)="selectFlow('ppt')"
                  type="button"
                  *ngIf="docStudioAccessible"
                >
                  <div class="flow-icon">
                  <!-- <svg width="96" height="96" xml:space="preserve" overflow="hidden"><defs><linearGradient x1="52.5" y1="231.5" x2="112.061" y2="171.939" gradientUnits="userSpaceOnUse" spreadMethod="pad" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs><g transform="translate(-42 -146)"><path d="M66 191 81 191 81 194 66 194 66 191ZM66 203 81 203 81 200 66 200 66 203ZM66 212 81 212 81 209 66 209 66 212ZM66 221 81 221 81 218 66 218 66 221ZM87 212 90 212 90 194 99.4125 194 101.513 191 87 191 87 212ZM120 218 120 233 110.587 233 108.487 236 123 236 123 218 120 218ZM99.4125 236 57 236 57 152 92.1211 152 117 176.879 117 191 123 191 123 212 120 212 120 194 108.487 194 110.587 191 114 191 114 179 90 179 90 155 60 155 60 233 87 233 87 218 90 218 90 233 101.513 233 99.4125 236ZM93 176 111.879 176 93 157.121 93 176ZM114 200 96 200 96 203 114 203 114 200ZM114 209 96 209 96 212 114 212 114 209ZM96 221 114 221 114 218 96 218 96 221Z" fill="url(#fill0)"/></g></svg> -->
                  <svg width="96.000000pt" height="96.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"> <defs><linearGradient x1="52.5" y1="231.5" x2="112.061" y2="171.939" gradientUnits="userSpaceOnUse" spreadMethod="pad" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs><g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0)" stroke="none"> <path d="M150 480 l0 -420 214 0 c178 0 216 3 226 15 11 13 5 15 -49 15 l-61 0 0 75 c0 60 -3 75 -15 75 -12 0 -15 -15 -15 -75 l0 -75 -135 0 -135 0 0 390 0 390 150 0 150 0 0 -120 0 -120 120 0 120 0 0 -59 c0 -54 -2 -60 -22 -63 -12 -2 -23 -9 -26 -15 -3 -9 12 -13 52 -13 l56 0 0 -90 c0 -73 3 -90 15 -90 12 0 15 18 15 105 l0 105 -30 0 -30 0 0 72 0 72 -123 123 -122 123 -177 0 -178 0 0 -420z m502 225 l50 -45 -96 0 -96 0 0 96 0 96 45 -50 c26 -28 69 -71 97 -97z"/> <path d="M240 495 c0 -12 15 -15 75 -15 60 0 75 3 75 15 0 12 -15 15 -75 15 -60 0 -75 -3 -75 -15z"/> <path d="M450 405 c0 -87 3 -105 15 -105 12 0 15 17 15 90 l0 90 49 0 c31 0 53 5 61 15 11 13 3 15 -64 15 l-76 0 0 -105z"/> <path d="M240 405 c0 -12 15 -15 75 -15 60 0 75 3 75 15 0 12 -15 15 -75 15 -60 0 -75 -3 -75 -15z"/> <path d="M540 405 c0 -12 17 -15 90 -15 73 0 90 3 90 15 0 12 -17 15 -90 15 -73 0 -90 -3 -90 -15z"/> <path d="M240 315 c0 -12 15 -15 75 -15 60 0 75 3 75 15 0 12 -15 15 -75 15 -60 0 -75 -3 -75 -15z"/> <path d="M540 315 c0 -12 17 -15 90 -15 73 0 90 3 90 15 0 12 -17 15 -90 15 -73 0 -90 -3 -90 -15z"/> <path d="M240 225 c0 -12 15 -15 75 -15 60 0 75 3 75 15 0 12 -15 15 -75 15 -60 0 -75 -3 -75 -15z"/> <path d="M540 225 c0 -12 17 -15 90 -15 73 0 90 3 90 15 0 12 -17 15 -90 15 -73 0 -90 -3 -90 -15z"/> <path d="M780 166 l0 -75 -52 -3 c-30 -2 -53 -8 -56 -15 -3 -10 15 -13 67 -13 l71 0 0 90 c0 73 -3 90 -15 90 -12 0 -15 -15 -15 -74z"/> </g> </svg>
                  </div>
                  <h2>Doc studio</h2>
                  <p>PwC quality PowerPoint presentations at the speed of thought</p>
                </button>

                <button
                  class="landing-flow-btn mi-flow-btn"
                  (click)="selectFlow('market-intelligence')"
                  type="button"
                  *ngIf="marketIntelligenceAccessible"
                >
                  <div class="flow-icon">
                  <svg width="96.000000pt" height="96.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"> <defs><linearGradient x1="246.432" y1="246.937" x2="321.973" y2="171.397" gradientUnits="userSpaceOnUse" spreadMethod="pad" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0)" stroke="none"> <path d="M750 836 c0 -8 9 -16 20 -18 15 -2 -13 -31 -117 -123 -203 -178 -174 -164 -231 -111 -27 25 -52 46 -55 46 -4 0 -70 -45 -147 -101 -124 -89 -152 -116 -128 -122 3 -1 67 41 141 94 l135 97 48 -49 c27 -27 51 -49 54 -49 3 0 80 65 170 145 133 116 166 140 168 125 4 -25 32 -26 32 -1 0 10 3 33 6 50 l7 31 -52 0 c-38 0 -51 -4 -51 -14z"/> <path d="M705 380 l0 -271 84 3 c57 2 86 7 89 16 3 9 -15 12 -70 12 l-73 0 0 240 0 240 63 0 63 0 -2 -217 c-1 -178 1 -218 12 -218 11 0 15 44 17 233 l2 232 -92 0 -93 0 0 -270z"/> <path d="M284 275 l1 -166 84 3 c57 2 86 7 89 16 3 9 -15 12 -70 12 l-73 0 0 135 0 135 62 0 62 0 -2 -112 c-2 -89 1 -113 11 -113 11 0 14 28 15 128 l2 127 -91 0 -91 0 1 -165z"/> <path d="M495 260 l0 -150 90 0 90 0 0 150 0 150 -90 0 -90 0 0 -150z m155 0 l0 -120 -62 0 -63 0 0 120 0 120 63 0 62 0 0 -120z"/> <path d="M70 215 l0 -105 93 0 92 0 0 105 0 105 -92 0 -93 0 0 -105z m155 0 l0 -75 -62 0 -63 0 0 75 0 75 63 0 62 0 0 -75z"/> </g> </svg>
                  </div>
                  <h2>Market intelligence and insights</h2>
                  <p>Structured preparation for confident client interactions</p>
                </button>

                <button
                  class="landing-flow-btn tl-flow-btn"
                  (click)="selectFlow('thought-leadership')"
                  type="button"
                  *ngIf="isProfilePresent(profile) && cortexAccessible"
                >
                  <div class="flow-icon">
                    <svg width="96.000000pt" height="96.000000pt" viewBox="0 0 96.000000 96.000000" preserveAspectRatio="xMidYMid meet"> <defs><linearGradient x1="596.87" y1="385.798" x2="655.621" y2="327.047" gradientUnits="userSpaceOnUse" spreadMethod="pad" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0)" stroke="none"> <path d="M363 912 c-117 -42 -174 -118 -181 -241 -5 -84 1 -100 74 -222 32 -53 34 -62 34 -148 l0 -91 162 2 c118 2 162 6 166 16 3 9 -31 12 -147 12 l-151 0 0 79 c0 77 -1 81 -52 168 -45 76 -53 97 -56 151 -7 105 37 185 131 235 35 18 58 22 137 22 80 0 103 -4 143 -24 58 -28 97 -83 105 -146 5 -50 32 -65 32 -17 0 128 -99 211 -260 219 -65 3 -97 -1 -137 -15z"/> <path d="M350 650 c-15 -28 -4 -57 27 -73 l25 -14 -1 -156 c-2 -134 0 -157 13 -157 13 0 16 25 18 158 l3 157 30 0 c34 0 32 16 34 -187 1 -111 3 -128 17 -128 15 0 16 17 12 159 -4 159 -4 160 19 166 32 8 48 41 34 72 -9 20 -17 24 -44 21 -29 -3 -32 -6 -35 -40 -3 -36 -5 -38 -37 -38 -32 0 -34 2 -37 38 -3 34 -6 37 -35 40 -24 2 -34 -2 -43 -18z m60 -30 c0 -23 -10 -26 -28 -8 -18 18 -15 28 8 28 13 0 20 -7 20 -20z m143 14 c9 -10 -4 -34 -19 -34 -8 0 -14 9 -14 20 0 19 19 27 33 14z"/> <path d="M747 638 c-2 -7 14 -41 35 -76 21 -34 38 -66 38 -70 0 -4 -13 -16 -30 -25 -27 -16 -30 -23 -30 -68 l0 -49 -85 0 -85 0 0 -35 c0 -24 5 -35 15 -35 8 0 15 9 15 20 0 18 7 20 73 20 43 0 78 5 85 12 7 7 12 33 12 58 0 42 3 47 35 64 19 11 35 22 35 26 0 13 -94 170 -102 170 -3 0 -8 -6 -11 -12z"/> <path d="M300 165 c-11 -13 6 -15 143 -15 125 0 157 3 167 15 11 13 -6 15 -143 15 -125 0 -157 -3 -167 -15z"/> <path d="M300 105 c-11 -13 6 -15 143 -15 125 0 157 3 167 15 11 13 -6 15 -143 15 -125 0 -157 -3 -167 -15z"/> <path d="M360 45 c-11 -13 -1 -15 83 -15 72 0 98 4 107 15 11 13 1 15 -83 15 -72 0 -98 -4 -107 -15z"/> </g> </svg>
                  </div>
                  <h2>Cortex content studio</h2>
                  <p>Where firm intelligence is created, curated, and deployed</p>
                </button>
              </div>

              <div class="landing-page-description">
                <p>A unified space to develop ideas, produce content in Doc studio, and power decisions with market intelligence</p>
              </div>

              <div class="explore-whats-next-box">
                <div class="explore-box-content">
                  <div class="explore-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 4L28 14H38L30 20L33 30L24 24L15 30L18 20L10 14H20L24 4Z" fill="url(#exploreGradient)" stroke="url(#exploreGradient)" stroke-width="1.5"/>
                      <defs>
                        <linearGradient id="exploreGradient" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
                          <stop offset="0" stop-color="#FF9F00"/>
                          <stop offset="1" stop-color="#FD5108"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div class="explore-text">
                    <h3 class="explore-title">Explore What's Next</h3>
                    <p class="explore-subtitle">Explore the next wave of AI-powered capabilities for strategy, delivery, and client impact</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Welcome/Quick Start Area -->
        @if (!showLandingPage && messages.length === 0 && !showDraftForm && !showMyRequestsPanelParent) {
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
                    <!-- <svg
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
                    </svg> -->
                    <svg width="96.000000pt" height="96.000000pt" viewBox="0 0 96.000000 96.000000" preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="#000" stroke="none"> <path d="M559 868 c-71 -104 -286 -397 -306 -419 -12 -14 -23 -29 -23 -33 0 -4 41 -6 90 -4 78 3 90 1 90 -13 0 -12 -19 -203 -32 -318 -2 -24 6 -19 30 20 16 24 79 114 142 199 62 85 128 177 147 203 l35 48 -98 -3 c-67 -2 -99 -7 -102 -15 -3 -10 15 -13 68 -13 70 0 72 -1 59 -19 -8 -11 -57 -79 -110 -153 -53 -73 -103 -143 -110 -155 -21 -35 -27 -28 -19 20 8 41 24 218 21 226 0 2 -35 3 -77 2 -42 -1 -75 1 -73 6 2 4 37 52 78 107 40 54 96 130 123 170 l50 71 -6 -70 c-4 -38 -10 -85 -13 -102 -4 -26 -2 -33 10 -33 18 0 22 15 37 173 6 59 13 114 17 122 9 25 -5 16 -28 -17z"/> </g> </svg>
                  </div>
                  <div class="btn-content">
                    <h3 class="btn-heading">Quick request</h3>
                    <p class="btn-description">
                      Engage with AI assistant
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
                    <!-- <svg
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
                    </svg> -->
                    <!-- <svg width="140.000000pt" height="140.000000pt" viewBox="0 0 96.000000 96.000000" preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="#FE7C39" stroke="none"> <path d="M262 830 c-3 -8 -50 -90 -104 -182 l-98 -167 92 -161 c70 -122 94 -157 101 -145 6 12 -14 54 -72 155 -45 76 -81 144 -81 150 0 6 31 64 68 128 38 64 79 136 92 160 13 23 28 42 34 42 6 1 80 1 164 0 144 -1 182 5 182 29 0 3 -84 6 -186 6 -155 0 -187 -2 -192 -15z"/> <path d="M677 827 c-2 -6 39 -88 93 -181 l98 -168 -89 -151 c-49 -84 -92 -158 -96 -166 -7 -11 -48 -13 -203 -12 -187 1 -209 -2 -210 -29 0 -3 95 -4 212 -3 l212 2 44 78 c24 43 53 93 63 110 11 18 28 50 40 71 12 20 30 51 40 69 l20 32 -103 180 c-57 99 -106 181 -109 181 -4 0 -9 -6 -12 -13z"/> <path d="M388 761 c-166 -53 -247 -250 -167 -409 87 -174 318 -216 457 -82 58 56 84 112 89 190 9 119 -57 234 -162 285 -44 21 -171 30 -217 16z m80 -53 c-2 -24 1 -33 12 -33 11 0 15 10 14 33 -2 29 1 32 25 32 45 0 130 -49 163 -94 34 -46 44 -69 53 -118 l7 -34 -36 4 c-28 3 -36 1 -36 -12 0 -12 9 -16 35 -16 30 0 35 -3 35 -22 -1 -35 -38 -109 -73 -146 -37 -39 -88 -68 -139 -77 -36 -7 -36 -7 -35 27 2 23 -2 33 -13 33 -11 0 -14 -9 -12 -33 3 -28 1 -32 -21 -32 -14 0 -53 15 -87 32 -72 38 -117 92 -135 165 l-12 48 38 3 c27 2 39 8 39 18 0 12 -9 15 -37 12 -35 -2 -38 -1 -35 22 5 38 36 101 66 137 32 38 118 83 159 83 26 0 28 -3 25 -32z"/> <path d="M604 621 c-5 -5 -43 -27 -84 -49 -73 -39 -76 -43 -128 -133 -58 -102 -58 -129 1 -94 17 11 58 34 91 51 54 29 62 38 107 122 38 72 46 92 35 101 -7 6 -16 7 -22 2z m-1 -39 c-6 -4 -27 -33 -46 -64 l-34 -57 -22 23 c-11 12 -21 25 -21 29 0 4 22 18 49 32 27 13 52 29 56 35 3 5 12 10 18 10 9 0 9 -2 0 -8z m-104 -145 c-11 -10 -102 -57 -104 -55 -2 2 11 27 28 56 l30 54 25 -26 c14 -14 24 -27 21 -29z"/> </g> </svg> -->
                    <svg width="48px" height="48px" viewBox="0 0 96 96" preserveAspectRatio="xMidYMid meet"> <defs><linearGradient x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0)" stroke="none"> <path d="M262 830 c-3 -8 -50 -90 -104 -182 l-98 -167 92 -161 c70 -122 94 -157 101 -145 6 12 -14 54 -72 155 -45 76 -81 144 -81 150 0 6 31 64 68 128 38 64 79 136 92 160 13 23 28 42 34 42 6 1 80 1 164 0 144 -1 182 5 182 29 0 3 -84 6 -186 6 -155 0 -187 -2 -192 -15z"/> <path d="M677 827 c-2 -6 39 -88 93 -181 l98 -168 -89 -151 c-49 -84 -92 -158 -96 -166 -7 -11 -48 -13 -203 -12 -187 1 -209 -2 -210 -29 0 -3 95 -4 212 -3 l212 2 44 78 c24 43 53 93 63 110 11 18 28 50 40 71 12 20 30 51 40 69 l20 32 -103 180 c-57 99 -106 181 -109 181 -4 0 -9 -6 -12 -13z"/> <path d="M388 761 c-166 -53 -247 -250 -167 -409 87 -174 318 -216 457 -82 58 56 84 112 89 190 9 119 -57 234 -162 285 -44 21 -171 30 -217 16z m80 -53 c-2 -24 1 -33 12 -33 11 0 15 10 14 33 -2 29 1 32 25 32 45 0 130 -49 163 -94 34 -46 44 -69 53 -118 l7 -34 -36 4 c-28 3 -36 1 -36 -12 0 -12 9 -16 35 -16 30 0 35 -3 35 -22 -1 -35 -38 -109 -73 -146 -37 -39 -88 -68 -139 -77 -36 -7 -36 -7 -35 27 2 23 -2 33 -13 33 -11 0 -14 -9 -12 -33 3 -28 1 -32 -21 -32 -14 0 -53 15 -87 32 -72 38 -117 92 -135 165 l-12 48 38 3 c27 2 39 8 39 18 0 12 -9 15 -37 12 -35 -2 -38 -1 -35 22 5 38 36 101 66 137 32 38 118 83 159 83 26 0 28 -3 25 -32z"/> <path d="M604 621 c-5 -5 -43 -27 -84 -49 -73 -39 -76 -43 -128 -133 -58 -102 -58 -129 1 -94 17 11 58 34 91 51 54 29 62 38 107 122 38 72 46 92 35 101 -7 6 -16 7 -22 2z m-1 -39 c-6 -4 -27 -33 -46 -64 l-34 -57 -22 23 c-11 12 -21 25 -21 29 0 4 22 18 49 32 27 13 52 29 56 35 3 5 12 10 18 10 9 0 9 -2 0 -8z m-104 -145 c-11 -10 -102 -57 -104 -55 -2 2 11 27 28 56 l30 54 25 -26 c14 -14 24 -27 21 -29z"/> </g> </svg>
                  </div>
                  <div class="btn-content">
                    <h3 class="btn-heading">Guided journey</h3>
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
                    <span>Start chatting or choose from the services below</span>
                  }
                  @if (selectedFlow === 'ppt') {
                    <span>Start chatting or choose from the services below</span>
                  }
                  @if (selectedFlow === 'market-intelligence') {
                    <span>Start chatting or choose from the services below</span>
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
                        <svg width="12pt" height="12pt" viewBox="0 0 96.000000 96.000000" preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs><g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0)" stroke="none"><path d="M90 785 c0 -102 2 -117 20 -135 11 -11 25 -20 30 -20 6 0 10 -27 10 -61 l0 -60 56 60 56 61 148 0 c122 0 149 3 154 15 5 13 -16 15 -151 15 l-157 0 -38 -37 -38 -37 0 36 c0 33 -3 37 -27 40 l-28 3 -3 103 -3 102 205 0 c234 0 216 8 216 -101 0 -55 3 -69 15 -69 12 0 15 16 15 80 0 124 8 120 -260 120 l-220 0 0 -115z"/><path d="M150 805 c0 -13 27 -15 180 -15 153 0 180 2 180 15 0 13 -27 15 -180 15 -153 0 -180 -2 -180 -15z"/><path d="M150 725 c0 -12 20 -15 120 -15 100 0 120 3 120 15 0 13 -20 15 -120 15 -100 0 -120 -2 -120 -15z"/><path d="M470 582 c-43 -14 -50 -32 -50 -137 l0 -103 219 2 c274 1 261 -6 261 143 l0 104 -207 -2 c-115 -1 -215 -4 -223 -7z m400 -107 c0 -57 -4 -86 -13 -94 -9 -7 -78 -10 -210 -8 l-197 2 0 82 c0 67 3 84 18 92 10 7 92 10 210 10 l192 -1 0 -83z"/><path d="M480 503 c0 -17 15 -18 180 -18 165 0 180 1 180 18 0 16 -15 17 -180 17 -165 0 -180 -1 -180 -17z"/><path d="M600 425 c0 -12 20 -15 120 -15 100 0 120 3 120 15 0 13 -20 15 -120 15 -100 0 -120 -2 -120 -15z"/><path d="M60 200 c0 -147 -12 -140 254 -140 181 0 215 2 220 15 5 13 -23 15 -213 15 -190 0 -220 2 -225 16 -3 9 -6 49 -6 90 l0 74 208 -2 207 -3 3 -67 c2 -52 6 -68 17 -68 12 0 15 15 15 65 0 106 3 105 -260 105 l-220 0 0 -100z"/><path d="M120 215 c0 -13 27 -15 180 -15 153 0 180 2 180 15 0 13 -27 15 -180 15 -153 0 -180 -2 -180 -15z"/><path d="M120 146 c0 -12 24 -15 120 -18 109 -3 120 -1 120 15 0 15 -12 17 -120 17 -98 0 -120 -3 -120 -14z"/></g></svg>
                      </div>
                      <span class="btn-label">Prompt starter decks</span>
                    </button>
                  </div>
                  <div class="button-wrapper">
                    <button class="dropdown-btn" (click)="openDdcWorkflow('slide-creation')" type="button">
                      <div class="btn-icon">
                        <svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0)" stroke="none"> <path d="M250 815 l0 -55 -57 0 -58 0 0 -335 0 -335 281 0 c241 0 283 2 288 15 5 13 -29 15 -267 15 l-272 0 0 305 0 305 43 0 42 0 0 -265 0 -265 215 0 c208 0 215 -1 215 -20 0 -12 7 -20 16 -20 11 0 15 6 11 20 -5 18 0 20 48 20 34 0 57 5 65 15 11 13 -19 15 -264 15 l-276 0 0 305 0 305 258 0 257 0 0 -282 c0 -229 3 -283 13 -283 11 0 14 57 15 297 l2 298 -287 0 -288 0 0 -55z"/> <path d="M360 680 l0 -110 85 0 85 0 0 110 0 110 -85 0 -85 0 0 -110z m140 0 l0 -80 -55 0 -55 0 0 80 0 80 55 0 55 0 0 -80z"/> <path d="M560 775 c0 -12 15 -15 78 -15 63 0 79 3 79 15 0 12 -16 15 -79 15 -63 0 -78 -3 -78 -15z"/> <path d="M560 680 c0 -19 5 -20 78 -18 61 2 77 6 77 18 0 12 -16 16 -77 18 -73 2 -78 1 -78 -18z"/> <path d="M560 585 c0 -12 15 -15 78 -15 63 0 79 3 79 15 0 12 -16 15 -79 15 -63 0 -78 -3 -78 -15z"/> <path d="M360 485 c0 -13 24 -15 177 -13 130 2 177 6 181 16 3 9 -37 12 -177 12 -155 0 -181 -2 -181 -15z"/> <path d="M360 395 c0 -12 16 -15 80 -15 64 0 80 3 80 15 0 12 -16 15 -80 15 -64 0 -80 -3 -80 -15z"/> <path d="M550 350 l0 -60 75 0 c41 0 78 0 81 0 3 0 7 27 8 60 l1 60 -82 0 -83 0 0 -60z m134 0 c0 -17 -4 -30 -7 -30 -4 0 -27 0 -52 0 -43 0 -45 1 -45 30 0 30 1 30 53 30 51 0 52 0 51 -30z"/> <path d="M364 311 c-2 -2 -4 -10 -4 -18 0 -10 20 -13 80 -13 70 0 80 2 80 18 0 15 -10 17 -76 17 -41 0 -77 -2 -80 -4z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Draft presentations</span>
                    </button>
                  </div>
                </div>
                <!-- Second Row: 3 Buttons -->
                <div class="quick-action-row">
                  <div class="button-wrapper">
                    <button class="dropdown-btn" (click)="openDdcWorkflow('sanitization')" type="button">
                      <div class="btn-icon">
                        <!-- simple filled broom icon (uses currentColor) -->
                        <svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0)" stroke="none"> <path d="M361 790 c-17 -28 -31 -52 -31 -55 0 -3 14 -27 31 -55 l31 -50 61 0 62 0 28 54 28 54 -31 51 -32 51 -58 0 -58 0 -31 -50z m155 -18 l22 -37 -22 -37 c-19 -35 -24 -38 -67 -38 -44 0 -47 2 -64 40 -18 39 -17 41 1 75 17 32 22 35 64 35 41 0 47 -3 66 -38z"/> <path d="M780 765 c0 -60 3 -75 15 -75 12 0 15 15 15 75 0 60 -3 75 -15 75 -12 0 -15 -15 -15 -75z"/> <path d="M60 735 c0 -13 17 -15 117 -13 82 2 118 7 121 16 3 9 -25 12 -117 12 -102 0 -121 -2 -121 -15z"/> <path d="M703 607 l-29 -54 29 -51 29 -52 62 0 62 0 30 53 30 52 -30 53 -30 52 -62 0 -62 0 -29 -53z m157 -14 l22 -37 -21 -35 c-18 -33 -24 -36 -66 -36 -43 0 -49 3 -68 36 l-21 36 23 36 c20 33 27 37 66 37 39 0 45 -3 65 -37z"/> <path d="M60 555 c0 -23 561 -23 580 0 11 13 -22 15 -284 15 -256 0 -296 -2 -296 -15z"/> <path d="M478 428 l-28 -52 29 -50 28 -51 60 -3 59 -3 33 53 33 52 -29 53 -28 53 -65 0 -65 0 -27 -52z m158 -15 l21 -36 -21 -38 c-19 -36 -25 -39 -63 -39 -38 0 -45 4 -67 38 l-24 37 21 38 c19 34 24 37 66 37 42 0 48 -3 67 -37z"/> <path d="M780 270 c0 -127 2 -150 15 -150 13 0 15 23 15 150 0 127 -2 150 -15 150 -13 0 -15 -23 -15 -150z"/> <path d="M60 378 c0 -16 15 -18 174 -18 143 0 175 3 179 15 5 12 -21 15 -173 17 -166 3 -180 2 -180 -14z"/> <path d="M263 288 c-5 -7 -20 -31 -32 -54 l-23 -40 29 -50 29 -49 65 -3 64 -3 28 54 29 53 -29 49 -29 50 -61 3 c-40 2 -63 -1 -70 -10z m133 -57 l21 -38 -21 -36 c-19 -34 -25 -37 -66 -37 -42 0 -47 3 -64 35 -18 34 -19 36 -1 75 17 38 20 40 64 40 43 0 47 -3 67 -39z"/> <path d="M60 195 c0 -13 11 -15 57 -13 81 4 85 28 4 28 -48 0 -61 -3 -61 -15z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Sanitize presentations</span>
                    </button>
                  </div>
                  <div class="button-wrapper">
                    <button class="dropdown-btn disabled" (click)="openDdcWorkflow('brand-format')" type="button" disabled>
                      <div class="btn-icon">
                        <svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0)" stroke="none"> <path d="M50 648 l0 -243 130 3 130 3 0 -30 c0 -31 -1 -31 -53 -31 -52 0 -54 -1 -72 -37 -11 -21 -21 -41 -23 -44 -1 -3 55 -6 124 -5 l128 1 -3 -68 -2 -68 27 3 c29 3 47 28 20 28 -15 0 -16 29 -14 276 l3 276 103 1 102 2 0 -87 0 -88 85 0 c69 0 85 -3 85 -15 0 -8 7 -15 15 -15 10 0 15 10 15 28 0 21 -15 43 -60 87 l-60 59 0 103 0 103 -302 -2 c-230 -2 -302 -6 -306 -15 -3 -10 59 -13 286 -13 l290 0 4 -75 c2 -41 1 -75 -1 -75 -2 0 -9 7 -15 15 -9 11 -40 15 -141 16 l-130 1 0 -196 0 -196 -42 0 c-40 0 -43 2 -41 27 2 15 10 28 20 31 10 2 18 11 18 18 0 11 -28 14 -145 14 l-145 0 0 40 0 40 145 0 c122 0 145 2 145 15 0 13 -23 15 -145 15 l-145 0 0 170 c0 144 -2 170 -15 170 -13 0 -15 -34 -15 -242z m721 -50 l33 -28 -62 0 -62 0 0 63 1 62 29 -35 c15 -19 43 -47 61 -62z m-353 -290 c-5 -15 -208 -24 -208 -10 0 19 17 22 113 22 74 0 98 -3 95 -12z"/> <path d="M480 445 c0 -12 13 -15 60 -15 47 0 60 3 60 15 0 12 -13 15 -60 15 -47 0 -60 -3 -60 -15z"/> <path d="M640 295 l0 -165 129 0 c105 0 130 3 135 15 5 13 -12 15 -114 15 l-120 0 0 135 0 135 105 0 105 0 0 -115 c0 -96 3 -115 15 -115 13 0 15 21 15 130 l0 130 -135 0 -135 0 0 -165z"/> <path d="M480 385 c0 -12 13 -15 60 -15 47 0 60 3 60 15 0 12 -13 15 -60 15 -47 0 -60 -3 -60 -15z"/> <path d="M710 385 c0 -12 14 -15 65 -15 51 0 65 3 65 15 0 12 -14 15 -65 15 -51 0 -65 -3 -65 -15z"/> <path d="M773 333 c-47 -3 -63 -8 -63 -18 0 -12 15 -15 65 -15 58 0 65 2 65 20 0 11 -1 19 -2 18 -2 -1 -31 -3 -65 -5z"/> <path d="M480 315 c0 -12 13 -15 60 -15 47 0 60 3 60 15 0 12 -13 15 -60 15 -47 0 -60 -3 -60 -15z"/> <path d="M710 255 c0 -12 14 -15 65 -15 51 0 65 3 65 15 0 12 -14 15 -65 15 -51 0 -65 -3 -65 -15z"/> <path d="M530 225 c-19 -7 -37 -21 -39 -30 -2 -13 1 -16 13 -11 9 3 24 9 33 13 17 7 10 -7 -44 -93 -12 -18 -12 -22 1 -27 10 -4 23 9 40 38 14 24 26 48 26 54 0 6 5 11 10 11 6 0 10 -11 10 -25 0 -16 6 -25 16 -25 13 0 15 7 10 38 -15 80 -14 79 -76 57z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Refine drafts</span>
                    </button>
                  </div>
                  <div class="button-wrapper">
                    <button class="dropdown-btn" (click)="openDdcWorkflow('event-branding')" type="button">
                      <div class="btn-icon">
                        <svg width="96.000000pt" height="96.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox" id="fill0"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.0509" stop-color="#FE9900"/><stop offset="0.4663" stop-color="#FD7204"/><stop offset="0.7971" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0)" stroke="none"> <path d="M450 690 l0 -210 -195 0 c-167 0 -195 -2 -195 -15 0 -13 28 -15 195 -15 l195 0 0 -195 c0 -167 2 -195 15 -195 13 0 15 28 15 195 l0 195 210 0 c180 0 210 2 210 15 0 13 -30 15 -210 15 l-210 0 0 210 c0 180 -2 210 -15 210 -13 0 -15 -30 -15 -210z"/> <path d="M710 880 c-11 -11 -20 -29 -20 -40 0 -11 9 -29 20 -40 11 -11 29 -20 40 -20 11 0 29 9 40 20 11 11 20 29 20 40 0 11 -9 29 -20 40 -11 11 -29 20 -40 20 -11 0 -29 -9 -40 -20z m65 -40 c0 -18 -6 -26 -23 -28 -24 -4 -38 18 -28 44 3 9 15 14 28 12 17 -2 23 -10 23 -28z"/> <path d="M150 825 c0 -12 20 -15 120 -15 100 0 120 3 120 15 0 13 -20 15 -120 15 -100 0 -120 -2 -120 -15z"/> <path d="M602 734 c-17 -27 -47 -74 -66 -104 -28 -43 -32 -56 -20 -58 9 -2 17 -2 18 0 2 1 28 43 59 91 43 66 55 92 48 104 -7 14 -14 8 -39 -33z"/> <path d="M150 705 c0 -12 20 -15 120 -15 100 0 120 3 120 15 0 13 -20 15 -120 15 -100 0 -120 -2 -120 -15z"/> <path d="M658 698 c-7 -20 65 -127 85 -128 15 0 16 3 7 20 -8 16 -7 26 7 45 10 13 20 25 23 25 3 0 18 -20 33 -45 18 -28 36 -45 48 -45 16 0 12 11 -27 70 -26 39 -50 70 -54 70 -5 0 -17 -16 -29 -35 -11 -19 -24 -35 -28 -35 -5 0 -17 16 -27 35 -20 37 -32 43 -38 23z"/> <path d="M150 585 c0 -12 20 -15 120 -15 100 0 120 3 120 15 0 13 -20 15 -120 15 -100 0 -120 -2 -120 -15z"/> <path d="M692 369 c-7 -29 -20 -78 -29 -108 l-17 -56 -21 89 -21 88 -21 -53 c-17 -45 -25 -55 -47 -57 -41 -5 -33 -32 9 -32 28 0 37 5 44 22 7 18 13 3 30 -75 13 -53 24 -97 26 -97 1 0 13 42 25 92 13 51 26 97 30 101 5 5 16 -36 26 -92 17 -94 33 -131 34 -78 1 12 9 56 19 97 15 59 21 70 26 53 6 -19 14 -23 51 -23 32 0 44 4 44 15 0 10 -10 15 -33 15 -33 0 -35 2 -52 61 -21 70 -27 64 -46 -39 -7 -40 -15 -69 -19 -65 -4 4 -13 42 -20 83 -19 113 -24 120 -38 59z"/> <path d="M150 257 l0 -136 63 38 c34 21 86 50 116 65 60 31 63 27 -41 84 -43 24 -59 28 -66 19 -8 -9 3 -20 44 -41 47 -25 63 -46 34 -46 -5 0 -32 -13 -60 -30 -28 -17 -53 -30 -55 -30 -3 0 -5 42 -5 94 0 71 -4 97 -15 106 -13 11 -15 -4 -15 -123z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Customize event templates</span>
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
                        <svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-draft-content"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-draft-content)" stroke="none"> <path d="M60 480 l0 -360 420 0 420 0 0 360 0 360 -420 0 -420 0 0 -360z m810 285 l0 -45 -390 0 -390 0 0 45 0 45 390 0 390 0 0 -45z m0 -345 l0 -270 -390 0 -390 0 0 270 0 270 390 0 390 0 0 -270z"/> <path d="M120 765 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M180 765 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M240 765 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M235 611 c-99 -46 -141 -158 -96 -256 70 -152 282 -152 352 0 22 48 24 65 5 65 -7 0 -21 -20 -31 -45 -14 -38 -67 -95 -88 -95 -3 0 5 19 18 43 14 23 25 54 25 70 0 20 5 27 19 27 10 0 24 7 31 15 7 8 19 15 27 15 21 0 9 44 -25 95 -52 76 -153 105 -237 66z m0 -64 c-14 -24 -25 -56 -25 -70 0 -23 -4 -27 -31 -27 -27 0 -30 3 -23 23 13 43 34 75 61 96 42 31 46 25 18 -22z m216 -22 c9 -17 20 -40 24 -52 6 -20 3 -23 -24 -23 -27 0 -31 4 -31 27 0 14 -12 47 -26 71 l-27 46 34 -20 c18 -11 41 -33 50 -49z m-151 -10 l0 -65 -34 0 -34 0 10 38 c9 34 43 92 54 92 2 0 4 -29 4 -65z m73 12 c33 -71 32 -77 -7 -77 l-36 0 0 66 c0 56 2 65 14 55 8 -7 21 -26 29 -44z m-163 -134 c0 -14 12 -47 26 -71 l27 -46 -34 20 c-33 19 -60 57 -74 102 -6 19 -3 22 24 22 27 0 31 -4 31 -27z m90 -40 l-1 -68 -24 29 c-13 16 -28 47 -33 68 l-10 38 34 0 34 0 0 -67z m94 45 c-14 -49 -32 -84 -47 -97 -16 -12 -17 -8 -17 53 l0 66 36 0 c32 0 35 -2 28 -22z"/> <path d="M570 585 c0 -13 22 -15 135 -15 113 0 135 2 135 15 0 13 -22 15 -135 15 -113 0 -135 -2 -135 -15z"/> <path d="M570 495 c0 -12 15 -15 79 -15 58 0 82 4 91 15 11 13 1 15 -79 15 -74 0 -91 -3 -91 -15z"/> <path d="M570 330 l0 -90 135 0 135 0 0 90 c0 73 -3 90 -15 90 -12 0 -15 -15 -15 -75 l0 -75 -105 0 -105 0 0 60 0 60 74 0 c53 0 77 4 86 15 11 13 0 15 -89 15 l-101 0 0 -90z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Draft content</span>
                    </button>
                  </div>
                  <div class="button-wrapper-tl">
                    <button
                      class="dropdown-btn"
                      (click)="onTLActionCardClick('conduct-research')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-tl-research"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-tl-research)" stroke="none"> <path d="M90 480 l0 -390 415 0 c362 0 415 2 415 15 0 13 -51 15 -400 15 l-400 0 0 375 c0 327 -2 375 -15 375 -13 0 -15 -50 -15 -390z"/> <path d="M446 805 c-49 -17 -113 -78 -137 -130 -22 -48 -25 -151 -5 -199 7 -18 28 -49 46 -69 l33 -38 -43 -62 c-24 -34 -51 -71 -60 -82 -30 -35 -32 -45 -12 -45 13 0 38 28 77 85 32 47 60 85 61 85 1 0 19 -7 39 -16 52 -21 145 -20 197 4 122 54 184 206 134 327 -31 73 -130 154 -188 155 -34 0 -18 -27 22 -39 121 -36 186 -184 132 -302 -98 -219 -423 -148 -422 93 1 97 62 183 150 209 50 15 74 39 39 39 -13 -1 -41 -7 -63 -15z"/> <path d="M480 565 c0 -158 2 -185 15 -185 13 0 15 27 15 185 0 158 -2 185 -15 185 -13 0 -15 -27 -15 -185z"/> <path d="M540 559 c0 -148 3 -190 13 -187 9 4 13 53 15 191 2 162 0 187 -13 187 -13 0 -15 -27 -15 -191z"/> <path d="M420 536 c0 -101 3 -125 15 -130 13 -5 15 13 15 124 0 109 -2 130 -15 130 -13 0 -15 -20 -15 -124z"/> <path d="M600 475 c0 -80 2 -93 15 -89 12 5 15 25 15 95 0 72 -3 89 -15 89 -12 0 -15 -17 -15 -95z"/> <path d="M360 512 c0 -16 7 -37 15 -48 13 -18 14 -15 15 29 0 35 -4 47 -15 47 -10 0 -15 -10 -15 -28z"/> <path d="M660 479 c0 -54 2 -60 15 -49 10 8 15 30 15 61 0 37 -4 49 -15 49 -12 0 -15 -13 -15 -61z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Conduct research</span>
                    </button>
                  </div>
                  <div class="button-wrapper-tl">
                    <button
                      class="dropdown-btn"
                      (click)="onTLActionCardClick('edit-content')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-edit-content"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-edit-content)" stroke="none"> <path d="M559 838 c-23 -40 -54 -93 -69 -118 -15 -25 -82 -140 -149 -257 l-121 -212 0 -105 0 -105 33 22 c18 13 58 36 88 51 61 32 46 11 237 341 185 320 205 356 201 359 -10 9 -167 96 -172 96 -3 0 -25 -33 -48 -72z m120 0 c31 -17 57 -32 59 -33 5 -4 -31 -75 -39 -75 -16 0 -124 72 -121 81 4 15 33 59 39 59 3 0 31 -14 62 -32z m-55 -100 c54 -31 67 -50 46 -63 -11 -7 -130 61 -130 74 0 10 11 21 21 21 4 0 32 -14 63 -32z m-15 -71 c20 -11 38 -22 40 -23 1 -2 -19 -40 -47 -86 -88 -148 -202 -350 -202 -359 0 -20 -17 -7 -33 26 -15 32 -20 35 -62 35 -25 0 -45 1 -45 3 0 2 31 55 68 118 38 63 97 165 132 227 l63 112 25 -16 c14 -9 41 -26 61 -37z m-301 -436 c14 -1 30 -13 42 -33 l19 -32 -31 -20 c-28 -18 -31 -18 -43 -3 -7 9 -20 17 -29 17 -12 0 -16 10 -16 39 0 32 3 39 18 36 9 -2 27 -4 40 -4z"/> <path d="M270 831 c0 -4 -43 -82 -95 -172 l-95 -163 24 -41 c13 -22 38 -66 56 -98 24 -42 36 -55 44 -47 8 8 3 25 -19 63 -16 29 -38 68 -48 87 l-20 35 89 157 89 157 96 1 c73 0 100 4 109 15 11 13 -2 15 -109 15 -66 0 -121 -4 -121 -9z"/> <path d="M754 676 c-3 -8 15 -50 40 -94 25 -43 46 -82 46 -86 0 -4 -39 -77 -87 -162 l-87 -154 -97 0 c-74 0 -100 -4 -109 -15 -11 -13 2 -15 106 -15 l119 0 65 117 c36 64 80 141 98 171 l32 55 -55 99 c-31 54 -58 98 -61 98 -2 0 -7 -6 -10 -14z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Edit content</span>
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
                        <svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-refine-content"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-refine-content)" stroke="none"> <path d="M164 668 c-54 -95 -102 -180 -107 -189 -7 -11 15 -58 88 -185 54 -93 103 -177 109 -186 10 -16 32 -18 227 -18 l216 0 108 186 c81 141 105 190 99 203 -27 54 -120 211 -125 211 -22 0 -10 -38 41 -125 32 -54 57 -102 56 -105 -2 -3 -47 -80 -100 -173 l-98 -167 -145 0 -144 0 21 30 21 30 108 0 107 0 24 43 c29 53 86 151 117 200 l23 37 -37 70 c-21 38 -42 70 -46 70 -20 0 -15 -32 12 -76 17 -26 31 -52 31 -57 0 -6 -32 -65 -71 -133 l-71 -124 -109 0 -109 0 -22 -45 c-21 -43 -24 -45 -64 -45 l-42 0 -82 143 c-46 78 -91 156 -101 172 l-17 30 98 170 98 170 200 3 200 2 22 -34 c20 -34 20 -36 4 -68 l-17 -32 -21 37 -21 37 -165 0 -165 0 -83 -144 -82 -143 53 -89 c29 -49 66 -112 82 -141 26 -48 45 -61 45 -29 0 7 -31 68 -70 134 -38 66 -70 124 -70 128 0 4 32 62 71 130 l71 124 148 0 148 0 20 -35 21 -34 -94 -163 c-52 -90 -98 -169 -103 -177 -6 -11 -19 6 -50 62 -30 54 -48 77 -61 77 -16 0 -11 -13 31 -85 70 -118 78 -117 161 28 36 61 95 163 131 226 36 62 66 117 66 121 0 4 -12 28 -26 54 l-26 46 -218 0 -218 0 -98 -172z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Refine drafts</span>
                    </button>
                  </div>
                  <div class="button-wrapper-tl">
                    <button
                      class="dropdown-btn"
                      (click)="onTLActionCardClick('format-translator')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-format-translator"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-format-translator)" stroke="none"> <path d="M60 480 l0 -420 414 0 c359 0 415 2 420 15 5 13 -44 15 -399 15 l-405 0 0 390 0 390 390 0 390 0 0 -370 c0 -322 2 -370 15 -370 13 0 15 49 15 385 l0 385 -420 0 -420 0 0 -420z"/> <path d="M150 825 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M210 825 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M270 825 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M450 690 c0 -127 2 -150 15 -150 13 0 15 23 15 150 0 127 -2 150 -15 150 -13 0 -15 -23 -15 -150z"/> <path d="M700 732 c0 -4 -24 -43 -53 -87 -29 -44 -56 -86 -61 -92 -6 -10 21 -13 123 -13 l130 0 -40 65 c-23 36 -45 62 -50 59 -14 -8 -10 -27 11 -54 11 -14 20 -28 20 -32 0 -5 -31 -8 -70 -8 -38 0 -70 2 -70 5 0 3 20 35 44 72 25 36 42 72 39 79 -5 15 -23 19 -23 6z"/> <path d="M330 635 c0 -78 3 -95 15 -95 12 0 15 17 15 95 0 78 -3 95 -15 95 -12 0 -15 -17 -15 -95z"/> <path d="M210 620 c0 -64 3 -80 15 -80 12 0 15 16 15 80 0 64 -3 80 -15 80 -12 0 -15 -16 -15 -80z"/> <path d="M270 620 c0 -64 3 -80 15 -80 12 0 15 16 15 80 0 64 -3 80 -15 80 -12 0 -15 -16 -15 -80z"/> <path d="M390 605 c0 -51 3 -65 15 -65 12 0 15 14 15 65 0 51 -3 65 -15 65 -12 0 -15 -14 -15 -65z"/> <path d="M150 580 c0 -29 4 -40 15 -40 11 0 15 11 15 40 0 29 -4 40 -15 40 -11 0 -15 -11 -15 -40z"/> <path d="M120 481 c0 -14 41 -16 360 -16 319 0 360 2 360 16 0 13 -41 15 -360 15 -319 0 -360 -2 -360 -15z"/> <path d="M350 405 c0 -12 -14 -15 -64 -15 l-65 0 -36 -60 -36 -60 34 -57 33 -58 70 -3 71 -3 36 61 c32 54 39 90 18 90 -4 0 -20 -27 -36 -60 l-30 -60 -55 0 c-55 0 -55 0 -80 45 l-25 45 25 45 c24 44 25 45 77 45 42 0 54 -4 63 -20 15 -29 32 -14 25 21 l-7 29 221 0 c190 0 221 2 221 15 0 13 -32 15 -230 15 -198 0 -230 -2 -230 -15z"/> <path d="M480 225 l0 -75 165 0 165 0 0 75 0 75 -165 0 -165 0 0 -75z m300 0 l0 -45 -135 0 -135 0 0 45 0 45 135 0 135 0 0 -45z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Adapt content</span>
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
                        <svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-mi-research"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-mi-research)" stroke="none"> <path d="M90 480 l0 -390 415 0 c362 0 415 2 415 15 0 13 -51 15 -400 15 l-400 0 0 375 c0 327 -2 375 -15 375 -13 0 -15 -50 -15 -390z"/> <path d="M446 805 c-49 -17 -113 -78 -137 -130 -22 -48 -25 -151 -5 -199 7 -18 28 -49 46 -69 l33 -38 -43 -62 c-24 -34 -51 -71 -60 -82 -30 -35 -32 -45 -12 -45 13 0 38 28 77 85 32 47 60 85 61 85 1 0 19 -7 39 -16 52 -21 145 -20 197 4 122 54 184 206 134 327 -31 73 -130 154 -188 155 -34 0 -18 -27 22 -39 121 -36 186 -184 132 -302 -98 -219 -423 -148 -422 93 1 97 62 183 150 209 50 15 74 39 39 39 -13 -1 -41 -7 -63 -15z"/> <path d="M480 565 c0 -158 2 -185 15 -185 13 0 15 27 15 185 0 158 -2 185 -15 185 -13 0 -15 -27 -15 -185z"/> <path d="M540 559 c0 -148 3 -190 13 -187 9 4 13 53 15 191 2 162 0 187 -13 187 -13 0 -15 -27 -15 -191z"/> <path d="M420 536 c0 -101 3 -125 15 -130 13 -5 15 13 15 124 0 109 -2 130 -15 130 -13 0 -15 -20 -15 -124z"/> <path d="M600 475 c0 -80 2 -93 15 -89 12 5 15 25 15 95 0 72 -3 89 -15 89 -12 0 -15 -17 -15 -95z"/> <path d="M360 512 c0 -16 7 -37 15 -48 13 -18 14 -15 15 29 0 35 -4 47 -15 47 -10 0 -15 -10 -15 -28z"/> <path d="M660 479 c0 -54 2 -60 15 -49 10 8 15 30 15 61 0 37 -4 49 -15 49 -12 0 -15 -13 -15 -61z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Conduct research</span>
                    </button>
                  </div>
                  <div class="button-wrapper-mi">
                    <button
                      class="dropdown-btn"
                      (click)="onMIActionCardClick('target-industry-insights')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-industry"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-industry)" stroke="none"> <path d="M75 786 c-27 -20 -26 -55 2 -73 22 -15 26 -14 54 6 l31 23 27 -26 c19 -18 38 -26 64 -26 41 0 45 -9 21 -45 -11 -17 -26 -25 -45 -25 -16 0 -29 3 -29 8 0 4 -9 13 -21 20 -28 18 -69 -8 -69 -43 0 -37 40 -54 74 -31 37 23 71 20 90 -9 22 -33 21 -35 -14 -35 -24 0 -35 -8 -56 -40 -24 -36 -54 -54 -54 -32 0 17 -44 29 -67 19 -32 -14 -32 -64 1 -78 25 -12 66 2 66 22 0 5 10 7 23 4 18 -5 27 3 50 40 23 36 34 45 58 45 23 0 32 -7 49 -39 22 -44 36 -56 45 -41 3 5 -16 47 -43 93 l-49 82 46 82 46 83 100 0 100 0 19 -33 c10 -17 31 -55 47 -82 l28 -50 -29 -47 c-17 -27 -30 -52 -30 -58 0 -16 27 -12 34 5 10 27 69 18 106 -15 19 -17 38 -29 44 -28 6 1 23 -6 37 -15 37 -24 79 -7 75 31 -4 35 -38 57 -65 42 -12 -6 -21 -15 -21 -20 0 -18 -25 -10 -52 15 -18 17 -39 25 -63 25 -38 0 -40 2 -25 31 13 23 52 25 86 3 21 -14 29 -15 49 -4 52 28 12 102 -41 78 -13 -6 -24 -15 -24 -20 0 -4 -13 -8 -28 -8 -20 0 -32 8 -45 29 -23 40 -22 43 16 36 27 -5 37 -1 61 24 29 30 56 41 56 21 0 -5 10 -14 21 -21 31 -16 69 6 69 41 0 35 -38 57 -69 41 -11 -7 -21 -16 -21 -22 0 -6 -8 -8 -18 -5 -12 4 -28 -4 -47 -24 -22 -23 -38 -30 -66 -30 -33 0 -40 4 -63 45 l-27 45 -113 0 -114 0 -26 -45 c-25 -41 -30 -45 -66 -45 -30 0 -43 6 -64 31 -14 17 -30 27 -36 24 -6 -3 -22 3 -36 14 -31 25 -35 25 -59 7z m41 -27 c10 -17 -13 -36 -27 -22 -12 12 -4 33 11 33 5 0 12 -5 16 -11z m750 0 c10 -17 -13 -36 -27 -22 -12 12 -4 33 11 33 5 0 12 -5 16 -11z m-56 -155 c0 -8 -7 -14 -15 -14 -15 0 -21 21 -9 33 10 9 24 -2 24 -19z m-632 4 c-3 -7 -11 -13 -18 -13 -7 0 -15 6 -17 13 -3 7 4 12 17 12 13 0 20 -5 18 -12z m694 -140 c-9 -9 -15 -9 -24 0 -10 10 -10 15 2 22 20 12 38 -6 22 -22z m-752 -34 c0 -8 -7 -14 -15 -14 -15 0 -21 21 -9 33 10 9 24 -2 24 -19z"/> <path d="M381 665 c-35 -61 -36 -70 -17 -104 15 -28 31 -13 21 20 -4 13 2 37 17 65 23 43 24 44 75 44 50 0 52 -1 78 -45 l26 -46 -20 -33 c-25 -39 -26 -46 -7 -46 8 0 24 17 36 38 l23 37 -34 63 -33 62 -67 0 -67 0 -31 -55z"/> <path d="M425 573 c-14 -14 -17 -31 -13 -100 4 -82 4 -82 -19 -77 -25 7 -53 -10 -53 -31 0 -7 23 -47 50 -89 28 -42 50 -85 50 -96 0 -19 7 -20 95 -20 79 0 95 3 95 16 0 13 -13 15 -82 13 -75 -2 -83 0 -87 17 -2 10 -23 50 -48 87 -42 63 -50 89 -23 72 6 -4 20 -21 31 -39 10 -17 19 -26 20 -21 0 6 0 65 -1 133 -1 114 0 123 17 120 16 -3 18 -14 18 -86 0 -66 3 -82 15 -82 12 0 14 10 11 46 -2 36 0 45 10 42 9 -3 15 -24 17 -57 2 -34 7 -51 15 -48 7 2 10 20 8 45 -2 33 1 42 13 42 12 0 16 -11 16 -45 0 -33 4 -45 15 -45 11 0 15 11 15 36 0 24 4 34 13 31 16 -5 17 -132 1 -175 -12 -29 -11 -32 5 -32 24 0 30 24 32 129 1 72 -1 86 -17 98 -10 7 -23 12 -29 10 -5 -2 -16 3 -24 10 -7 8 -19 12 -27 9 -7 -3 -18 2 -24 10 -7 8 -19 14 -26 14 -9 0 -14 11 -14 28 0 49 -42 69 -75 35z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Generate industry insights</span>
                    </button>
                  </div>
                  <div class="button-wrapper-mi">
                    <button
                      class="dropdown-btn"
                      (click)="onMIActionCardClick('prepare-client-meeting')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-client-meeting"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-client-meeting)" stroke="none"> <path d="M60 554 l0 -324 173 2 c220 4 229 22 12 26 l-155 3 0 292 0 292 390 0 390 0 0 -285 0 -285 -41 73 -40 73 -117 -3 -117 -3 -53 -92 -54 -92 43 -76 c34 -59 48 -75 66 -75 23 0 23 2 23 110 0 90 -3 110 -15 110 -11 0 -15 -19 -17 -90 l-3 -91 -31 58 -32 58 47 78 46 77 99 -2 99 -3 43 -70 c24 -38 43 -75 44 -81 0 -6 -15 -37 -32 -70 l-33 -59 -3 98 c-2 77 -6 97 -17 97 -12 0 -15 -20 -15 -110 l0 -110 28 0 c23 1 33 11 70 75 l42 75 0 324 0 325 -420 0 -420 0 0 -325z"/> <path d="M208 765 c-31 -17 -63 -67 -73 -112 -9 -44 24 -117 65 -142 52 -31 94 -35 145 -12 107 47 118 197 19 262 -35 23 -117 25 -156 4z m62 -72 c0 -62 -35 -166 -54 -160 -6 1 -22 24 -35 50 -28 57 -23 87 24 134 50 50 65 45 65 -24z m96 23 c50 -50 46 -66 -16 -66 l-50 0 0 50 c0 62 16 66 66 16z m34 -107 c0 -24 -35 -68 -67 -83 -35 -16 -87 -22 -81 -8 2 4 11 28 22 55 l19 47 53 0 c33 0 54 -4 54 -11z"/> <path d="M603 700 c-110 -67 -64 -240 64 -242 104 -1 170 96 127 187 -33 71 -123 97 -191 55z m140 -36 c63 -62 36 -149 -56 -178 -44 -14 -117 46 -117 96 0 63 44 107 106 108 31 0 48 -6 67 -26z"/> <path d="M150 441 c0 -13 15 -16 95 -16 78 0 95 3 95 15 0 12 -18 15 -95 16 -80 0 -95 -2 -95 -15z"/> <path d="M150 378 c0 -16 13 -18 130 -18 117 0 130 2 130 18 0 15 -13 17 -130 17 -117 0 -130 -2 -130 -17z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Prepare for client meeting</span>
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
                        <svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-pov"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-pov)" stroke="none"> <path d="M40 865 c-4 0 0 -769 4 -772 19 -19 27 74 25 306 l-1 256 216 3 c119 1 216 -1 216 -6 0 -4 -6 -17 -14 -27 -13 -18 -11 -26 16 -75 l31 -55 -26 -43 c-31 -48 -32 -52 -12 -52 8 0 28 21 44 47 l30 47 -31 56 -30 55 47 83 47 82 97 0 96 0 48 -85 48 -84 -47 -81 -47 -80 -107 0 c-89 0 -109 -3 -114 -16 -3 -9 -6 -16 -6 -17 0 -1 49 -1 110 1 l110 3 0 -120 c0 -101 2 -121 15 -121 13 0 15 21 15 126 l0 125 50 85 c28 47 50 89 50 95 0 6 -22 49 -50 96 -38 65 -50 95 -50 126 l0 42 -390 0 c-214 0 -390 0 -390 0z m750 -47 c0 -16 -12 -18 -103 -18 l-103 0 -29 -55 -30 -55 -222 0 c-123 0 -226 1 -230 3 -5 1 -8 142 -3 142 0 0 162 0 360 0 336 0 360 -1 360 -17z"/> <path d="M384 785 c-15 -23 -15 -27 0 -50 28 -42 96 -24 96 25 0 49 -68 67 -96 25z m64 -28 c2 -11 -3 -17 -17 -17 -23 0 -35 15 -26 31 10 15 39 6 43 -14z"/> <path d="M600 665 c0 -12 18 -15 100 -15 82 0 100 3 100 15 0 12 -18 15 -100 15 -82 0 -100 -3 -100 -15z"/> <path d="M600 605 c0 -12 18 -15 100 -15 82 0 100 3 100 15 0 12 -18 15 -100 15 -82 0 -100 -3 -100 -15z"/> <path d="M283 553 c-35 -7 -80 -58 -87 -98 -22 -114 123 -188 205 -106 37 37 46 75 28 124 -22 62 -81 94 -146 80z m93 -57 c19 -19 34 -44 34 -55 0 -53 -49 -101 -101 -101 -12 0 -37 16 -56 35 -30 30 -35 40 -29 67 10 50 51 86 100 87 10 1 33 -14 52 -33z"/> <path d="M600 545 c0 -12 18 -15 100 -15 82 0 100 3 100 15 0 12 -18 15 -100 15 -82 0 -100 -3 -100 -15z"/> <path d="M174 223 c-21 -37 -46 -80 -56 -95 -10 -14 -18 -28 -18 -30 0 -1 157 -4 350 -5 346 -3 350 -3 361 18 11 21 11 21 -143 18 l-154 -4 -46 80 -45 80 -106 3 -106 3 -37 -68z m266 -26 c19 -34 37 -66 39 -70 2 -5 -10 -7 -25 -5 -23 2 -29 8 -29 28 0 15 -6 25 -15 25 -9 0 -15 -10 -15 -24 0 -24 -2 -25 -77 -26 l-78 -2 0 29 c0 18 -5 28 -15 28 -9 0 -15 -9 -15 -25 0 -26 -17 -39 -44 -33 -11 2 -5 19 25 71 l40 67 87 0 87 0 35 -63z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Create point of view</span>
                    </button>
                  </div>
                  <div class="button-wrapper-mi">
                    <button
                      class="dropdown-btn"
                      (click)="onMIActionCardClick('gather-proposal-insights')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg  width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000" preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-proposal"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-proposal)" stroke="none"> <path d="M138 825 c-23 -38 -49 -83 -60 -98 l-19 -28 59 -102 60 -102 114 0 113 0 58 97 c58 100 64 113 48 122 -5 3 -33 -37 -63 -89 -29 -52 -55 -95 -58 -95 -3 0 -18 23 -33 50 l-28 50 -80 0 c-62 0 -79 -3 -79 -14 0 -33 -17 -22 -44 28 l-28 53 46 80 47 81 97 4 c98 4 111 1 126 -36 3 -7 8 -6 15 4 7 10 5 22 -5 40 -15 24 -18 25 -131 25 l-115 0 -40 -70z m193 -255 c10 -19 18 -38 19 -42 0 -5 -35 -8 -78 -8 -73 0 -80 2 -90 24 -18 41 5 61 73 61 55 0 58 -1 76 -35z"/> <path d="M480 829 c-12 -22 -29 -54 -39 -70 l-18 -30 -27 45 c-15 26 -34 46 -42 46 -18 0 -18 2 20 -68 18 -32 36 -52 47 -52 11 0 34 27 63 75 50 82 54 95 31 95 -8 0 -24 -18 -35 -41z"/> <path d="M221 809 c-35 -14 -50 -39 -51 -80 0 -73 92 -108 145 -54 63 62 -12 168 -94 134z m69 -39 c25 -25 25 -55 0 -80 -24 -24 -38 -25 -68 -4 -26 18 -29 60 -5 86 21 24 48 23 73 -2z"/> <path d="M490 580 c-30 -54 -54 -102 -53 -107 1 -4 25 -50 54 -101 l53 -93 119 3 119 3 55 94 c40 70 52 100 46 113 -7 15 -19 -1 -63 -81 -30 -55 -57 -101 -60 -101 -3 0 -19 24 -35 54 l-29 53 -72 -1 c-60 -1 -76 -5 -87 -20 -13 -18 -16 -17 -41 26 -14 24 -26 50 -26 57 0 6 17 40 38 74 21 35 41 71 45 80 5 14 21 17 106 17 99 0 101 0 115 -27 13 -25 15 -26 22 -10 3 10 1 29 -6 43 -13 23 -17 24 -129 24 l-116 -1 -55 -99z m209 -230 l22 -40 -80 0 c-89 0 -109 12 -88 57 9 20 17 23 67 23 55 0 57 -1 79 -40z"/> <path d="M837 592 c-19 -36 -39 -68 -43 -69 -5 -2 -19 15 -32 37 -12 22 -29 40 -37 40 -20 0 -18 -7 14 -60 43 -71 67 -67 116 21 50 88 49 85 32 92 -10 4 -26 -16 -50 -61z"/> <path d="M577 589 c-24 -14 -49 -73 -40 -96 13 -38 46 -63 82 -63 83 1 116 85 59 148 -23 24 -70 29 -101 11z m89 -44 c20 -31 12 -68 -18 -82 -48 -21 -97 23 -79 70 17 44 72 50 97 12z"/> <path d="M156 430 c-12 -19 -39 -65 -59 -101 l-37 -67 58 -98 59 -99 113 0 112 0 32 50 c69 108 91 154 79 166 -8 8 -25 -14 -64 -85 -30 -52 -57 -96 -60 -96 -3 0 -18 22 -33 49 l-26 49 -76 4 c-71 3 -77 2 -88 -20 -12 -23 -13 -23 -41 31 l-29 54 48 85 48 85 101 -1 c93 -1 101 -3 110 -24 12 -27 27 -29 27 -4 0 46 -20 53 -138 55 l-113 2 -23 -35z m172 -291 c12 -21 22 -40 22 -42 0 -2 -36 -3 -79 -3 -66 1 -81 4 -91 19 -9 15 -8 24 4 42 13 19 23 23 69 22 51 -1 55 -3 75 -38z"/> <path d="M209 375 c-29 -16 -52 -66 -42 -93 13 -38 46 -62 84 -62 54 0 84 28 84 80 0 34 -6 47 -28 66 -32 27 -60 30 -98 9z m81 -35 c25 -25 25 -55 0 -80 -23 -23 -33 -24 -60 -10 -31 17 -43 46 -29 73 23 42 57 49 89 17z"/> <path d="M340 385 c0 -3 14 -30 31 -60 23 -41 36 -54 50 -52 22 4 63 63 54 78 -11 16 -21 10 -37 -23 l-15 -32 -27 47 c-15 26 -34 47 -42 47 -8 0 -14 -2 -14 -5z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Gather proposal inputs</span>
                    </button>
                  </div>
                  <div class="button-wrapper-mi">
                    <button
                      class="dropdown-btn"
                      (click)="onMIActionCardClick('create-rfp-response')"
                      type="button"
                      >
                      <div class="btn-icon">
                        <svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-rfp"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-rfp)" stroke="none"> <path d="M770 793 c0 -4 -21 -19 -46 -32 -34 -19 -44 -29 -41 -43 4 -15 1 -18 -13 -13 -10 3 -48 14 -84 24 l-66 18 -48 -33 c-43 -31 -53 -34 -118 -34 -76 0 -90 5 -72 27 6 7 9 15 7 16 -22 14 -111 67 -114 67 -2 0 -21 -30 -41 -67 -21 -38 -55 -96 -77 -131 -22 -35 -37 -66 -34 -69 15 -14 37 12 96 116 l63 112 31 -18 c16 -10 30 -22 30 -26 0 -5 -26 -53 -58 -108 -47 -81 -62 -98 -77 -94 -25 9 -23 -17 3 -33 18 -11 23 -11 33 4 11 15 15 13 39 -17 14 -18 22 -36 18 -39 -4 -3 -14 -16 -20 -29 -12 -22 -8 -28 62 -97 42 -41 81 -74 87 -74 7 0 21 -12 33 -26 16 -20 26 -25 48 -20 16 3 31 1 34 -4 10 -17 44 -11 62 10 10 11 29 20 44 20 14 0 34 9 44 20 10 11 26 20 34 18 36 -5 69 12 76 39 3 15 17 37 31 50 25 23 32 57 14 68 -6 4 -3 17 10 33 49 66 50 67 59 54 6 -10 13 -11 34 -1 28 13 26 43 -3 34 -13 -4 -30 17 -78 99 -63 109 -63 110 -16 134 20 11 26 4 85 -99 58 -101 81 -130 94 -117 7 7 -141 262 -154 266 -6 2 -11 0 -11 -5z m-148 -104 l88 -21 41 -74 c43 -78 43 -79 -4 -133 l-27 -33 -105 91 -106 90 -63 -31 c-51 -25 -70 -29 -99 -24 -21 4 -37 10 -37 14 0 8 201 140 215 141 6 1 49 -9 97 -20z m-263 -45 c2 -2 -20 -18 -48 -35 -56 -35 -56 -46 0 -75 40 -20 74 -17 140 12 l58 26 78 -68 c43 -38 93 -81 111 -96 24 -20 32 -33 27 -47 -11 -34 -33 -31 -81 12 -26 23 -52 42 -57 42 -26 0 -12 -24 39 -65 56 -46 62 -58 42 -78 -19 -19 -30 -14 -81 33 -27 25 -52 45 -57 45 -24 0 -16 -22 20 -52 44 -36 47 -68 8 -68 -34 0 -103 70 -103 103 0 17 -7 32 -18 38 -12 7 -15 17 -11 34 8 31 -29 69 -59 61 -12 -3 -30 3 -45 15 -31 24 -34 24 -69 -5 l-29 -25 -27 34 -26 33 40 71 41 70 51 -6 c29 -3 54 -7 56 -9z m-79 -249 c-47 -48 -64 -55 -74 -29 -4 11 9 31 39 62 43 42 47 44 63 29 15 -16 13 -20 -28 -62z m117 29 c7 -19 -93 -124 -119 -124 -32 0 -19 33 34 87 54 55 74 64 85 37z m30 -80 c4 -11 -10 -31 -41 -62 -45 -45 -48 -46 -62 -27 -13 17 -11 23 28 62 45 46 65 53 75 27z m30 -80 c7 -19 -34 -64 -59 -64 -25 0 -23 29 4 57 25 27 46 30 55 7z m43 -49 c0 -14 -37 -31 -47 -21 -9 8 28 47 38 40 5 -3 9 -11 9 -19z"/> </g> </svg>
                      </div>
                      <span class="btn-label">Create RFP response</span>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- My Requests Panel - Using Separate Component -->
        @if (showMyRequestsPanelParent) {
          <div class="content-area">
            <app-my-requests-table #myRequestsTableRef></app-my-requests-table>
          </div>
        }
        <!-- Chat Messages Area -->
        @if ((messages.length > 0 || showDraftForm) && !showMyRequestsPanelParent) {
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
                        <svg width="72.000000pt" height="72.000000pt" viewBox="0 0 72.000000 75.000000" preserveAspectRatio="xMidYMid meet"> <g transform="translate(0.000000,75.000000) scale(0.100000,-0.100000)" fill="#fd5108" stroke="none"> <path d="M350 540 c0 -100 4 -112 34 -123 12 -5 17 -14 13 -27 -7 -26 1 -25 45 5 31 21 48 25 111 25 61 0 77 3 92 20 18 20 17 20 -79 20 -98 0 -138 -10 -132 -33 1 -6 1 -9 -1 -4 -3 4 -10 4 -16 0 -7 -3 -3 3 7 15 19 22 19 22 -7 22 -14 0 -27 -6 -30 -12 -2 -7 -3 -4 -1 7 2 11 4 46 4 78 l0 57 110 0 110 0 0 -45 c0 -40 2 -45 23 -45 21 0 22 4 20 56 -1 31 -6 61 -11 66 -5 5 -72 10 -150 11 l-142 2 0 -95z m31 57 c-10 -9 -11 -8 -5 6 3 10 9 15 12 12 3 -3 0 -11 -7 -18z"/> <path d="M410 553 c0 -16 11 -18 90 -18 79 0 90 2 90 18 0 15 -11 17 -90 17 -79 0 -90 -2 -90 -17z"/> <path d="M413 501 c-1 -17 5 -19 57 -20 52 0 59 2 57 20 -1 16 -9 19 -57 19 -48 0 -56 -3 -57 -19z"/> <path d="M225 492 c-5 -4 -16 -17 -22 -29 -11 -19 -10 -29 3 -57 9 -19 27 -40 40 -47 24 -13 32 -29 14 -29 -5 0 -10 5 -10 10 0 11 -130 14 -167 4 -32 -9 -43 -53 -43 -170 l0 -104 208 0 c196 0 208 1 220 20 12 20 10 20 -183 20 l-195 0 0 99 0 100 173 -2 172 -2 3 -77 c3 -70 5 -78 22 -78 18 0 20 7 20 83 0 67 -3 87 -17 100 -21 18 -13 17 -108 17 -59 0 -75 3 -75 15 0 8 6 12 13 9 7 -2 19 10 29 32 15 33 15 38 0 65 -14 23 -24 29 -52 29 -19 0 -39 -4 -45 -8z m39 -37 c26 0 32 -21 9 -33 -15 -9 -22 -5 -36 19 -9 17 -11 27 -4 22 6 -4 21 -7 31 -8z m9 -72 c-4 -10 -9 -11 -19 -2 -18 15 -18 15 5 15 11 0 17 -5 14 -13z"/> <path d="M146 244 c-21 -20 -20 -46 2 -71 31 -36 92 -11 92 37 0 42 -64 65 -94 34z m61 -30 c9 -23 -19 -38 -34 -17 -7 9 -10 20 -7 24 9 15 34 10 41 -7z"/> <path d="M298 238 c-29 -48 4 -95 58 -82 60 15 42 103 -22 104 -12 0 -28 -10 -36 -22z m59 -24 c7 -18 -17 -38 -31 -24 -11 11 -1 40 14 40 6 0 13 -7 17 -16z"/> </g> </svg>
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
                              <div class="processing-line last-line">
                                <span class="processing-text">Processing</span>
                                <div class="typing-dots" aria-hidden="true">
                                  <span></span>
                                  <span></span>
                                  <span></span>
                                </div>
                              </div>
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
                              Cancel workflow
                            </button>
                          </div>
                        }
                        <!-- Thought Leadership Action Buttons (Only for results: Editorial Feedback and Revised Article in Quick Start Edit) -->
                        @if (shouldShowTLActions(message) && isEditWorkflowResult(message)) {
                          @if (getTLMetadata(message); as metadata) {
                            <app-tl-action-buttons
                              [metadata]="metadata"
                              [messageId]="'msg_' + i"
                              [selectedFlow]="selectedFlow"
                              (exportRequested)="onExportRequested($event)"
                              (copyRequested)="onCopyRequested($event)"
                              #tlActionButtons>
                              
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
                                (click)="selectedFlow === 'thought-leadership' ? showCortexReminderForCopy(message.content, 'copy-' + $index) : copyToClipboard(message.content, 'copy-' + $index)"
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
                              @if (message.role === 'assistant' && selectedFlow !== 'ppt' && message.content && !message.editWorkflow && (getTLMetadata(message)?.contentType !== 'Phoenix_Request')  && (!message.content.toLowerCase().includes('placemat'))) {
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
                                      <button class="dropdown-item" (click)="exportSelected(i, 'ppt')">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                          <polyline points="14 2 14 8 20 8"></polyline>
                                        </svg>
                                        <span>PPT (.ppt)</span>
                                      </button>
                                    </div>
                                  }
                                </div>
                              }
                              <!-- Ready to Publish Button (for Cortex Content Studio quick start responses) -->
                              @if (message.role === 'assistant' && selectedFlow === 'thought-leadership' && message.content && !message.editWorkflow && (getTLMetadata(message)?.contentType !== 'Phoenix_Request')) {
                                <button
                                  class="action-btn btn-canvas"
                                  (click)="onCortexQuickStartReadyToPublish(message)"
                                  title="Ready to publish"
                                  [class.preparing]="isPreparingDocument[messages.indexOf(message)]"
                                  [class.prepared]="isDocumentPrepared[messages.indexOf(message)]"
                                  [disabled]="isPreparingDocument[messages.indexOf(message)]">
                                  @if (isPreparingDocument[messages.indexOf(message)]) {
                                    <span class="prepare-spinner">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="9"></circle>
                                        <path d="M12 7v5l3 3"></path>
                                      </svg>
                                    </span>
                                  }
                                  @if (!isPreparingDocument[messages.indexOf(message)] && !isDocumentPrepared[messages.indexOf(message)]) {
                                    <svg width="16" height="16" viewBox="0 0 96.000000 96.000000" preserveAspectRatio="xMidYMid meet" style="margin-right:6px;"> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"> <path d="M60 554 l0 -324 173 2 c220 4 229 22 12 26 l-155 3 0 292 0 292 390 0 390 0 0 -285 0 -285 -41 73 -40 73 -117 -3 -117 -3 -53 -92 -54 -92 43 -76 c34 -59 48 -75 66 -75 23 0 23 2 23 110 0 90 -3 110 -15 110 -11 0 -15 -19 -17 -90 l-3 -91 -31 58 -32 58 47 78 46 77 99 -2 99 -3 43 -70 c24 -38 43 -75 44 -81 0 -6 -15 -37 -32 -70 l-33 -59 -3 98 c-2 77 -6 97 -17 97 -12 0 -15 -20 -15 -110 l0 -110 28 0 c23 1 33 11 70 75 l42 75 0 324 0 325 -420 0 -420 0 0 -325z"/> <path d="M208 765 c-31 -17 -63 -67 -73 -112 -9 -44 24 -117 65 -142 52 -31 94 -35 145 -12 107 47 118 197 19 262 -35 23 -117 25 -156 4z m62 -72 c0 -62 -35 -166 -54 -160 -6 1 -22 24 -35 50 -28 57 -23 87 24 134 50 50 65 45 65 -24z m96 23 c50 -50 46 -66 -16 -66 l-50 0 0 50 c0 62 16 66 66 16z m34 -107 c0 -24 -35 -68 -67 -83 -35 -16 -87 -22 -81 -8 2 4 11 28 22 55 l19 47 53 0 c33 0 54 -4 54 -11z"/> <path d="M603 700 c-110 -67 -64 -240 64 -242 104 -1 170 96 127 187 -33 71 -123 97 -191 55z m140 -36 c63 -62 36 -149 -56 -178 -44 -14 -117 46 -117 96 0 63 44 107 106 108 31 0 48 -6 67 -26z"/> <path d="M150 441 c0 -13 15 -16 95 -16 78 0 95 3 95 15 0 12 -18 15 -95 16 -80 0 -95 -2 -95 -15z"/> <path d="M150 378 c0 -16 13 -18 130 -18 117 0 130 2 130 18 0 15 -13 17 -130 17 -117 0 -130 -2 -130 -17z"/> </g> </svg>
                                  }
                                  @if (isDocumentPrepared[messages.indexOf(message)]) {
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  }
                                  <span>{{ isPreparingDocument[messages.indexOf(message)] ? 'Preparing...' : isDocumentPrepared[messages.indexOf(message)] ? 'Ready!' : 'Ready to publish' }}</span>
                                </button>
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
                                  <span>Webpage ready</span>
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
                <span>Request DDC support</span>
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
                              Download placemat
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
                <!-- style="opacity: 0.5; cursor: not-allowed"
                [disabled] = 'true'-->
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
                <span>Request DDC support</span>
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
                                Copy script
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
        @if (!showLandingPage && !showMyRequestsPanelParent) {
          <div class="chat-composer" [class.expanded]="isComposerExpanded">
            <div class="composer-input-wrapper">
            <div class="composer-tools">
              <!-- Edit Content Document Upload (Thought Leadership mode) -->
              @if (selectedFlow === 'thought-leadership' || selectedFlow === 'market-intelligence') {
                <button
                  class="tool-btn"
                  (click)="editWorkflowService.isActive ? triggerEditDocumentUpload() : triggerDocumentAnalysisUpload()"
                  title="Upload documents(Word, PDF, Text)"
                  type="button"
                  [disabled]="isLoading || isExtractingText"
                  >
                  <!-- <svg
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
                  </svg> -->
                  <svg width="18" height="18" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                    <path d="M10.6875 35.625 L7.125 35.625 L7.125 49.875 L47.3805 49.875 L49.875 46.3125 L10.6875 46.3125 L10.6875 35.625Z" />
                    <path d="M46.3125 35.625 L49.875 35.625 L49.875 42.75 L46.3125 42.75Z" />
                    <path d="M26.7188 13.8248 L26.7188 42.75 L30.2812 42.75 L30.2812 13.8248 L43.2892 26.4717 L45.7733 23.9181 L28.5 7.125 L11.2267 23.9181 L13.7108 26.4717 L26.7188 13.8248Z" />
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
                  <!-- <svg
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
                  </svg> -->
                  <svg width="18" height="18" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                    <path d="M10.6875 35.625 L7.125 35.625 L7.125 49.875 L47.3805 49.875 L49.875 46.3125 L10.6875 46.3125 L10.6875 35.625Z" />
                    <path d="M46.3125 35.625 L49.875 35.625 L49.875 42.75 L46.3125 42.75Z" />
                    <path d="M26.7188 13.8248 L26.7188 42.75 L30.2812 42.75 L30.2812 13.8248 L43.2892 26.4717 L45.7733 23.9181 L28.5 7.125 L11.2267 23.9181 L13.7108 26.4717 L26.7188 13.8248Z" />
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
                <!-- <svg
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
                </svg> -->
                <svg width="18" height="18" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <g>
                    <path d="M32.0625 37.4062C35.9912 37.4062 39.1875 34.2109 39.1875 30.2812L39.1875 10.6875C39.1875 6.75788 35.9912 3.5625 32.0625 3.5625L24.9375 3.5625C21.0088 3.5625 17.8125 6.75788 17.8125 10.6875L17.8125 30.2812C17.8125 34.2109 21.0088 37.4062 24.9375 37.4062L32.0625 37.4062ZM21.375 30.2812 L21.375 17.8125 L29.9838 17.8125 L32.4782 14.25 L21.375 14.25 L21.375 10.6875C21.375 8.72367 22.9728 7.125 24.9375 7.125L32.0625 7.125C34.0272 7.125 35.625 8.72367 35.625 10.6875L35.625 30.2812C35.625 32.2451 34.0272 33.8438 32.0625 33.8438L24.9375 33.8438C22.9728 33.8438 21.375 32.2451 21.375 30.2812ZM42.75 26.7188 L46.3125 26.7188 L46.3125 32.0625C46.3125 38.9371 40.7192 44.5312 33.8438 44.5312L30.2812 44.5312 L30.2812 49.875 L39.1875 49.875 L39.1875 53.4375 L17.8125 53.4375 L17.8125 49.875 L26.7188 49.875 L26.7188 44.5312 L23.1562 44.5312C16.2808 44.5312 10.6875 38.9371 10.6875 32.0625L10.6875 26.7188 L14.25 26.7188 L14.25 32.0625C14.25 36.973 18.2457 40.9688 23.1562 40.9688L33.8438 40.9688C38.7543 40.9688 42.75 36.973 42.75 32.0625L42.75 26.7188Z"/>
                  </g>
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
                  stroke="#ffffff"
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
                  :selectedFlow === 'market-intelligence' ? 'Market intelligence and insights'
                  : "Cortex content studio"
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
                      Best practices
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
                            <label>Target audience *</label>
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
                                  >Target audience is required</small
                                  >
                              }
                            </div>
                            <div class="form-field">
                              <label>Additional context</label>
                              <textarea
                                [(ngModel)]="draftData.additional_context"
                                rows="3"
                                placeholder="Any specific requirements..."
                              ></textarea>
                            </div>
                            <div class="form-field">
                              <label>Reference document (optional)</label>
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
                                  <label>Reference link (optional)</label>
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
                                      Generate presentation
                                    </button>
                                  </div>
                                }
                                @if (selectedPPTOperation === 'improve') {
                                  <div class="form-content">
                                    <div class="form-field">
                                      <label>Original powerPoint *</label>
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
                                        <label>Reference powerPoint (optional)</label>
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
                                          Improve presentation
                                        </button>
                                      </div>
                                    }
                                    @if (selectedPPTOperation === 'sanitize') {
                                      <div class="form-content">
                                        <div class="form-field">
                                          <label>PowerPoint file *</label>
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
                                            <label>Client name (optional)</label>
                                            <input
                                              type="text"
                                              [(ngModel)]="sanitizeData.clientName"
                                              placeholder="e.g., Adobe Inc"
                                              />
                                            </div>
                                            <div class="form-field">
                                              <label>Product names (optional)</label>
                                              <input
                                                type="text"
                                                [(ngModel)]="sanitizeData.products"
                                                placeholder="e.g., Photoshop, Creative Cloud"
                                                />
                                              </div>
                                              <div class="form-field">
                                                <label style="margin-bottom: 12px; display: block"
                                                  >Sanitization options</label
                                                  >
                                                  <div class="checkbox-group">
                                                    <label class="checkbox-label">
                                                      <input
                                                        type="checkbox"
                                                        [(ngModel)]="sanitizeData.options.numericData"
                                                        />
                                                        <span>Numeric data (currency, percentages, FTEs)</span>
                                                      </label>
                                                      <label class="checkbox-label">
                                                        <input
                                                          type="checkbox"
                                                          [(ngModel)]="sanitizeData.options.personalInfo"
                                                          />
                                                          <span
                                                            >Personal information (emails, phones, SSN, IP
                                                            addresses)</span
                                                            >
                                                          </label>
                                                          <label class="checkbox-label">
                                                            <input
                                                              type="checkbox"
                                                              [(ngModel)]="sanitizeData.options.financialData"
                                                              />
                                                              <span
                                                                >Financial data (credit cards, bank accounts, tax IDs)</span
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
                                                                      >Business identifiers (project IDs, deal codes,
                                                                      invoices)</span
                                                                      >
                                                                    </label>
                                                                    <label class="checkbox-label">
                                                                      <input
                                                                        type="checkbox"
                                                                        [(ngModel)]="sanitizeData.options.names"
                                                                        />
                                                                        <span>Client & product names</span>
                                                                      </label>
                                                                      <label class="checkbox-label">
                                                                        <input
                                                                          type="checkbox"
                                                                          [(ngModel)]="sanitizeData.options.logos"
                                                                          />
                                                                          <span>Logos & watermarks</span>
                                                                        </label>
                                                                        <label class="checkbox-label">
                                                                          <input
                                                                            type="checkbox"
                                                                            [(ngModel)]="sanitizeData.options.metadata"
                                                                            />
                                                                            <span>Metadata & speaker notes</span>
                                                                          </label>
                                                                          <label class="checkbox-label">
                                                                            <input
                                                                              type="checkbox"
                                                                              [(ngModel)]="sanitizeData.options.llmDetection"
                                                                              />
                                                                              <span
                                                                                >AI-Powered detection (company names, person names,
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
                                                                                    <span>Embedded objects (Excel, Word, PDF files)</span>
                                                                                  </label>
                                                                                </div>
                                                                              </div>
                                                                              <button
                                                                                class="submit-btn"
                                                                                (click)="sanitizePPT(); closeGuidedDialog()"
                                                                                [disabled]="!sanitizePPTFile || isLoading"
                                                                                >
                                                                                Sanitize presentation
                                                                              </button>
                                                                            </div>
                                                                          }
                                                                          @if (selectedPPTOperation === 'bestPractices') {
                                                                            <div
                                                                              class="form-content"
                                                                              >
                                                                              <div class="form-field">
                                                                                <label>PowerPoint file *</label>
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
                                                                                    >Validation categories</label
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
                                                                                            <span>Visuals (image quality, relevance, placement)</span>
                                                                                          </label>
                                                                                          <label class="checkbox-label">
                                                                                            <input
                                                                                              type="checkbox"
                                                                                              [(ngModel)]="bestPracticesData.categories.design"
                                                                                              />
                                                                                              <span>Design (color scheme, fonts, spacing)</span>
                                                                                            </label>
                                                                                            <label class="checkbox-label">
                                                                                              <input
                                                                                                type="checkbox"
                                                                                                [(ngModel)]="bestPracticesData.categories.charts"
                                                                                                />
                                                                                                <span>Charts (data visualization, clarity, labels)</span>
                                                                                              </label>
                                                                                              <label class="checkbox-label">
                                                                                                <input
                                                                                                  type="checkbox"
                                                                                                  [(ngModel)]="bestPracticesData.categories.formatting"
                                                                                                  />
                                                                                                  <span>Formatting (consistency, alignment, text size)</span>
                                                                                                </label>
                                                                                                <label class="checkbox-label">
                                                                                                  <input
                                                                                                    type="checkbox"
                                                                                                    [(ngModel)]="bestPracticesData.categories.content"
                                                                                                    />
                                                                                                    <span>Content (clarity, conciseness, grammar)</span>
                                                                                                  </label>
                                                                                                </div>
                                                                                              </div>
                                                                                              <button
                                                                                                class="submit-btn"
                                                                                                (click)="submitBestPracticesForm()"
                                                                                                [disabled]="!bestPracticesPPTFile || isLoading"
                                                                                                >
                                                                                                Validate best practices
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
                                                                                              <div class="tl-card-icon"><svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-draft-content-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-draft-content-card)" stroke="none"> <path d="M60 480 l0 -360 420 0 420 0 0 360 0 360 -420 0 -420 0 0 -360z m810 285 l0 -45 -390 0 -390 0 0 45 0 45 390 0 390 0 0 -45z m0 -345 l0 -270 -390 0 -390 0 0 270 0 270 390 0 390 0 0 -270z"/> <path d="M120 765 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M180 765 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M240 765 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M235 611 c-99 -46 -141 -158 -96 -256 70 -152 282 -152 352 0 22 48 24 65 5 65 -7 0 -21 -20 -31 -45 -14 -38 -67 -95 -88 -95 -3 0 5 19 18 43 14 23 25 54 25 70 0 20 5 27 19 27 10 0 24 7 31 15 7 8 19 15 27 15 21 0 9 44 -25 95 -52 76 -153 105 -237 66z m0 -64 c-14 -24 -25 -56 -25 -70 0 -23 -4 -27 -31 -27 -27 0 -30 3 -23 23 13 43 34 75 61 96 42 31 46 25 18 -22z m216 -22 c9 -17 20 -40 24 -52 6 -20 3 -23 -24 -23 -27 0 -31 4 -31 27 0 14 -12 47 -26 71 l-27 46 34 -20 c18 -11 41 -33 50 -49z m-151 -10 l0 -65 -34 0 -34 0 10 38 c9 34 43 92 54 92 2 0 4 -29 4 -65z m73 12 c33 -71 32 -77 -7 -77 l-36 0 0 66 c0 56 2 65 14 55 8 -7 21 -26 29 -44z m-163 -134 c0 -14 12 -47 26 -71 l27 -46 -34 20 c-33 19 -60 57 -74 102 -6 19 -3 22 24 22 27 0 31 -4 31 -27z m90 -40 l-1 -68 -24 29 c-13 16 -28 47 -33 68 l-10 38 34 0 34 0 0 -67z m94 45 c-14 -49 -32 -84 -47 -97 -16 -12 -17 -8 -17 53 l0 66 36 0 c32 0 35 -2 28 -22z"/> <path d="M570 585 c0 -13 22 -15 135 -15 113 0 135 2 135 15 0 13 -22 15 -135 15 -113 0 -135 -2 -135 -15z"/> <path d="M570 495 c0 -12 15 -15 79 -15 58 0 82 4 91 15 11 13 1 15 -79 15 -74 0 -91 -3 -91 -15z"/> <path d="M570 330 l0 -90 135 0 135 0 0 90 c0 73 -3 90 -15 90 -12 0 -15 -15 -15 -75 l0 -75 -105 0 -105 0 0 60 0 60 74 0 c53 0 77 4 86 15 11 13 0 15 -89 15 l-101 0 0 -90z"/> </g> </svg></div>
                                                                                              <h3>Draft content</h3>
                                                                                              <p>Turn preliminary outlines into well researched drafts​</p>
                                                                                            </button>
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('conduct-research')">
                                                                                              <div class="tl-card-icon"><svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-tl-research-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-tl-research-card)" stroke="none"> <path d="M90 480 l0 -390 415 0 c362 0 415 2 415 15 0 13 -51 15 -400 15 l-400 0 0 375 c0 327 -2 375 -15 375 -13 0 -15 -50 -15 -390z"/> <path d="M446 805 c-49 -17 -113 -78 -137 -130 -22 -48 -25 -151 -5 -199 7 -18 28 -49 46 -69 l33 -38 -43 -62 c-24 -34 -51 -71 -60 -82 -30 -35 -32 -45 -12 -45 13 0 38 28 77 85 32 47 60 85 61 85 1 0 19 -7 39 -16 52 -21 145 -20 197 4 122 54 184 206 134 327 -31 73 -130 154 -188 155 -34 0 -18 -27 22 -39 121 -36 186 -184 132 -302 -98 -219 -423 -148 -422 93 1 97 62 183 150 209 50 15 74 39 39 39 -13 -1 -41 -7 -63 -15z"/> <path d="M480 565 c0 -158 2 -185 15 -185 13 0 15 27 15 185 0 158 -2 185 -15 185 -13 0 -15 -27 -15 -185z"/> <path d="M540 559 c0 -148 3 -190 13 -187 9 4 13 53 15 191 2 162 0 187 -13 187 -13 0 -15 -27 -15 -191z"/> <path d="M420 536 c0 -101 3 -125 15 -130 13 -5 15 13 15 124 0 109 -2 130 -15 130 -13 0 -15 -20 -15 -124z"/> <path d="M600 475 c0 -80 2 -93 15 -89 12 5 15 25 15 95 0 72 -3 89 -15 89 -12 0 -15 -17 -15 -95z"/> <path d="M360 512 c0 -16 7 -37 15 -48 13 -18 14 -15 15 29 0 35 -4 47 -15 47 -10 0 -15 -10 -15 -28z"/> <path d="M660 479 c0 -54 2 -60 15 -49 10 8 15 30 15 61 0 37 -4 49 -15 49 -12 0 -15 -13 -15 -61z"/> </g> </svg></div>
                                                                                              <h3>Conduct research</h3>
                                                                                              <p>Tap into PwC’s knowledge bank and third-party sources to execute targeted research in minutes​</p>
                                                                                            </button>
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('edit-content')">
                                                                                              <div class="tl-card-icon"><svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-edit-content-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-edit-content-card)" stroke="none"> <path d="M559 838 c-23 -40 -54 -93 -69 -118 -15 -25 -82 -140 -149 -257 l-121 -212 0 -105 0 -105 33 22 c18 13 58 36 88 51 61 32 46 11 237 341 185 320 205 356 201 359 -10 9 -167 96 -172 96 -3 0 -25 -33 -48 -72z m120 0 c31 -17 57 -32 59 -33 5 -4 -31 -75 -39 -75 -16 0 -124 72 -121 81 4 15 33 59 39 59 3 0 31 -14 62 -32z m-55 -100 c54 -31 67 -50 46 -63 -11 -7 -130 61 -130 74 0 10 11 21 21 21 4 0 32 -14 63 -32z m-15 -71 c20 -11 38 -22 40 -23 1 -2 -19 -40 -47 -86 -88 -148 -202 -350 -202 -359 0 -20 -17 -7 -33 26 -15 32 -20 35 -62 35 -25 0 -45 1 -45 3 0 2 31 55 68 118 38 63 97 165 132 227 l63 112 25 -16 c14 -9 41 -26 61 -37z m-301 -436 c14 -1 30 -13 42 -33 l19 -32 -31 -20 c-28 -18 -31 -18 -43 -3 -7 9 -20 17 -29 17 -12 0 -16 10 -16 39 0 32 3 39 18 36 9 -2 27 -4 40 -4z"/> <path d="M270 831 c0 -4 -43 -82 -95 -172 l-95 -163 24 -41 c13 -22 38 -66 56 -98 24 -42 36 -55 44 -47 8 8 3 25 -19 63 -16 29 -38 68 -48 87 l-20 35 89 157 89 157 96 1 c73 0 100 4 109 15 11 13 -2 15 -109 15 -66 0 -121 -4 -121 -9z"/> <path d="M754 676 c-3 -8 15 -50 40 -94 25 -43 46 -82 46 -86 0 -4 -39 -77 -87 -162 l-87 -154 -97 0 c-74 0 -100 -4 -109 -15 -11 -13 2 -15 106 -15 l119 0 65 117 c36 64 80 141 98 171 l32 55 -55 99 c-31 54 -58 98 -61 98 -2 0 -7 -6 -10 -14z"/> </g> </svg></div>
                                                                                              <h3>Edit content</h3>
                                                                                              <p>Deploy content, copy, and brand alignment editors</p>
                                                                                            </button>
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('refine-content')">
                                                                                              <div class="tl-card-icon"><svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-refine-content-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-refine-content-card)" stroke="none"> <path d="M164 668 c-54 -95 -102 -180 -107 -189 -7 -11 15 -58 88 -185 54 -93 103 -177 109 -186 10 -16 32 -18 227 -18 l216 0 108 186 c81 141 105 190 99 203 -27 54 -120 211 -125 211 -22 0 -10 -38 41 -125 32 -54 57 -102 56 -105 -2 -3 -47 -80 -100 -173 l-98 -167 -145 0 -144 0 21 30 21 30 108 0 107 0 24 43 c29 53 86 151 117 200 l23 37 -37 70 c-21 38 -42 70 -46 70 -20 0 -15 -32 12 -76 17 -26 31 -52 31 -57 0 -6 -32 -65 -71 -133 l-71 -124 -109 0 -109 0 -22 -45 c-21 -43 -24 -45 -64 -45 l-42 0 -82 143 c-46 78 -91 156 -101 172 l-17 30 98 170 98 170 200 3 200 2 22 -34 c20 -34 20 -36 4 -68 l-17 -32 -21 37 -21 37 -165 0 -165 0 -83 -144 -82 -143 53 -89 c29 -49 66 -112 82 -141 26 -48 45 -61 45 -29 0 7 -31 68 -70 134 -38 66 -70 124 -70 128 0 4 32 62 71 130 l71 124 148 0 148 0 20 -35 21 -34 -94 -163 c-52 -90 -98 -169 -103 -177 -6 -11 -19 6 -50 62 -30 54 -48 77 -61 77 -16 0 -11 -13 31 -85 70 -118 78 -117 161 28 36 61 95 163 131 226 36 62 66 117 66 121 0 4 -12 28 -26 54 l-26 46 -218 0 -218 0 -98 -172z"/> </g> </svg></div>
                                                                                              <h3>Refine drafts</h3>
                                                                                              <p>Change length or tone of content, or enhance with targeted research and insights​</p>
                                                                                            </button>
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('format-translator')">
                                                                                              <div class="tl-card-icon"><svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-format-translator-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-format-translator-card)" stroke="none"> <path d="M60 480 l0 -420 414 0 c359 0 415 2 420 15 5 13 -44 15 -399 15 l-405 0 0 390 0 390 390 0 390 0 0 -370 c0 -322 2 -370 15 -370 13 0 15 49 15 385 l0 385 -420 0 -420 0 0 -420z"/> <path d="M150 825 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M210 825 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M270 825 c0 -8 7 -15 15 -15 8 0 15 7 15 15 0 8 -7 15 -15 15 -8 0 -15 -7 -15 -15z"/> <path d="M450 690 c0 -127 2 -150 15 -150 13 0 15 23 15 150 0 127 -2 150 -15 150 -13 0 -15 -23 -15 -150z"/> <path d="M700 732 c0 -4 -24 -43 -53 -87 -29 -44 -56 -86 -61 -92 -6 -10 21 -13 123 -13 l130 0 -40 65 c-23 36 -45 62 -50 59 -14 -8 -10 -27 11 -54 11 -14 20 -28 20 -32 0 -5 -31 -8 -70 -8 -38 0 -70 2 -70 5 0 3 20 35 44 72 25 36 42 72 39 79 -5 15 -23 19 -23 6z"/> <path d="M330 635 c0 -78 3 -95 15 -95 12 0 15 17 15 95 0 78 -3 95 -15 95 -12 0 -15 -17 -15 -95z"/> <path d="M210 620 c0 -64 3 -80 15 -80 12 0 15 16 15 80 0 64 -3 80 -15 80 -12 0 -15 -16 -15 -80z"/> <path d="M270 620 c0 -64 3 -80 15 -80 12 0 15 16 15 80 0 64 -3 80 -15 80 -12 0 -15 -16 -15 -80z"/> <path d="M390 605 c0 -51 3 -65 15 -65 12 0 15 14 15 65 0 51 -3 65 -15 65 -12 0 -15 -14 -15 -65z"/> <path d="M150 580 c0 -29 4 -40 15 -40 11 0 15 11 15 40 0 29 -4 40 -15 40 -11 0 -15 -11 -15 -40z"/> <path d="M120 481 c0 -14 41 -16 360 -16 319 0 360 2 360 16 0 13 -41 15 -360 15 -319 0 -360 -2 -360 -15z"/> <path d="M350 405 c0 -12 -14 -15 -64 -15 l-65 0 -36 -60 -36 -60 34 -57 33 -58 70 -3 71 -3 36 61 c32 54 39 90 18 90 -4 0 -20 -27 -36 -60 l-30 -60 -55 0 c-55 0 -55 0 -80 45 l-25 45 25 45 c24 44 25 45 77 45 42 0 54 -4 63 -20 15 -29 32 -14 25 21 l-7 29 221 0 c190 0 221 2 221 15 0 13 -32 15 -230 15 -198 0 -230 -2 -230 -15z"/> <path d="M480 225 l0 -75 165 0 165 0 0 75 0 75 -165 0 -165 0 0 -75z m300 0 l0 -45 -135 0 -135 0 0 45 0 45 135 0 135 0 0 -45z"/> </g> </svg></div>
                                                                                              <h3>Adapt content</h3>
                                                                                              <p>Repurpose final outputs into podcasts, social media posts or placemats</p>
                                                                                            </button>
                                                                                            <button class="tl-action-card" (click)="onTLActionCardClick('ready-to-publish')">
                                                                                              <div class="tl-card-icon"><svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-ready-to-publish-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-ready-to-publish-card)" stroke="none"> <path d="M60 554 l0 -324 173 2 c220 4 229 22 12 26 l-155 3 0 292 0 292 390 0 390 0 0 -285 0 -285 -41 73 -40 73 -117 -3 -117 -3 -53 -92 -54 -92 43 -76 c34 -59 48 -75 66 -75 23 0 23 2 23 110 0 90 -3 110 -15 110 -11 0 -15 -19 -17 -90 l-3 -91 -31 58 -32 58 47 78 46 77 99 -2 99 -3 43 -70 c24 -38 43 -75 44 -81 0 -6 -15 -37 -32 -70 l-33 -59 -3 98 c-2 77 -6 97 -17 97 -12 0 -15 -20 -15 -110 l0 -110 28 0 c23 1 33 11 70 75 l42 75 0 324 0 325 -420 0 -420 0 0 -325z"/> <path d="M208 765 c-31 -17 -63 -67 -73 -112 -9 -44 24 -117 65 -142 52 -31 94 -35 145 -12 107 47 118 197 19 262 -35 23 -117 25 -156 4z m62 -72 c0 -62 -35 -166 -54 -160 -6 1 -22 24 -35 50 -28 57 -23 87 24 134 50 50 65 45 65 -24z m96 23 c50 -50 46 -66 -16 -66 l-50 0 0 50 c0 62 16 66 66 16z m34 -107 c0 -24 -35 -68 -67 -83 -35 -16 -87 -22 -81 -8 2 4 11 28 22 55 l19 47 53 0 c33 0 54 -4 54 -11z"/> <path d="M603 700 c-110 -67 -64 -240 64 -242 104 -1 170 96 127 187 -33 71 -123 97 -191 55z m140 -36 c63 -62 36 -149 -56 -178 -44 -14 -117 46 -117 96 0 63 44 107 106 108 31 0 48 -6 67 -26z"/> <path d="M150 441 c0 -13 15 -16 95 -16 78 0 95 3 95 15 0 12 -18 15 -95 16 -80 0 -95 -2 -95 -15z"/> <path d="M150 378 c0 -16 13 -18 130 -18 117 0 130 2 130 18 0 15 -13 17 -130 17 -117 0 -130 -2 -130 -17z"/> </g> </svg></div>
                                                                                              <h3>Ready to publish</h3>
                                                                                              <p>Verify publication readiness and identify platform-specific requirements</p>
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
                                                                                              <div class="mi-card-icon"><svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-mi-research-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-mi-research-card)" stroke="none"> <path d="M90 480 l0 -390 415 0 c362 0 415 2 415 15 0 13 -51 15 -400 15 l-400 0 0 375 c0 327 -2 375 -15 375 -13 0 -15 -50 -15 -390z"/> <path d="M446 805 c-49 -17 -113 -78 -137 -130 -22 -48 -25 -151 -5 -199 7 -18 28 -49 46 -69 l33 -38 -43 -62 c-24 -34 -51 -71 -60 -82 -30 -35 -32 -45 -12 -45 13 0 38 28 77 85 32 47 60 85 61 85 1 0 19 -7 39 -16 52 -21 145 -20 197 4 122 54 184 206 134 327 -31 73 -130 154 -188 155 -34 0 -18 -27 22 -39 121 -36 186 -184 132 -302 -98 -219 -423 -148 -422 93 1 97 62 183 150 209 50 15 74 39 39 39 -13 -1 -41 -7 -63 -15z"/> <path d="M480 565 c0 -158 2 -185 15 -185 13 0 15 27 15 185 0 158 -2 185 -15 185 -13 0 -15 -27 -15 -185z"/> <path d="M540 559 c0 -148 3 -190 13 -187 9 4 13 53 15 191 2 162 0 187 -13 187 -13 0 -15 -27 -15 -191z"/> <path d="M420 536 c0 -101 3 -125 15 -130 13 -5 15 13 15 124 0 109 -2 130 -15 130 -13 0 -15 -20 -15 -124z"/> <path d="M600 475 c0 -80 2 -93 15 -89 12 5 15 25 15 95 0 72 -3 89 -15 89 -12 0 -15 -17 -15 -95z"/> <path d="M360 512 c0 -16 7 -37 15 -48 13 -18 14 -15 15 29 0 35 -4 47 -15 47 -10 0 -15 -10 -15 -28z"/> <path d="M660 479 c0 -54 2 -60 15 -49 10 8 15 30 15 61 0 37 -4 49 -15 49 -12 0 -15 -13 -15 -61z"/> </g> </svg></div>
                                                                                              <h3>Conduct research</h3>
                                                                                              <p>Tap into PwC’s knowledge bank and third-party sources to execute targeted research in minutes ​</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('target-industry-insights')">
                                                                                              <div class="mi-card-icon"><svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-industry-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-industry-card)" stroke="none"> <path d="M75 786 c-27 -20 -26 -55 2 -73 22 -15 26 -14 54 6 l31 23 27 -26 c19 -18 38 -26 64 -26 41 0 45 -9 21 -45 -11 -17 -26 -25 -45 -25 -16 0 -29 3 -29 8 0 4 -9 13 -21 20 -28 18 -69 -8 -69 -43 0 -37 40 -54 74 -31 37 23 71 20 90 -9 22 -33 21 -35 -14 -35 -24 0 -35 -8 -56 -40 -24 -36 -54 -54 -54 -32 0 17 -44 29 -67 19 -32 -14 -32 -64 1 -78 25 -12 66 2 66 22 0 5 10 7 23 4 18 -5 27 3 50 40 23 36 34 45 58 45 23 0 32 -7 49 -39 22 -44 36 -56 45 -41 3 5 -16 47 -43 93 l-49 82 46 82 46 83 100 0 100 0 19 -33 c10 -17 31 -55 47 -82 l28 -50 -29 -47 c-17 -27 -30 -52 -30 -58 0 -16 27 -12 34 5 10 27 69 18 106 -15 19 -17 38 -29 44 -28 6 1 23 -6 37 -15 37 -24 79 -7 75 31 -4 35 -38 57 -65 42 -12 -6 -21 -15 -21 -20 0 -18 -25 -10 -52 15 -18 17 -39 25 -63 25 -38 0 -40 2 -25 31 13 23 52 25 86 3 21 -14 29 -15 49 -4 52 28 12 102 -41 78 -13 -6 -24 -15 -24 -20 0 -4 -13 -8 -28 -8 -20 0 -32 8 -45 29 -23 40 -22 43 16 36 27 -5 37 -1 61 24 29 30 56 41 56 21 0 -5 10 -14 21 -21 31 -16 69 6 69 41 0 35 -38 57 -69 41 -11 -7 -21 -16 -21 -22 0 -6 -8 -8 -18 -5 -12 4 -28 -4 -47 -24 -22 -23 -38 -30 -66 -30 -33 0 -40 4 -63 45 l-27 45 -113 0 -114 0 -26 -45 c-25 -41 -30 -45 -66 -45 -30 0 -43 6 -64 31 -14 17 -30 27 -36 24 -6 -3 -22 3 -36 14 -31 25 -35 25 -59 7z m41 -27 c10 -17 -13 -36 -27 -22 -12 12 -4 33 11 33 5 0 12 -5 16 -11z m750 0 c10 -17 -13 -36 -27 -22 -12 12 -4 33 11 33 5 0 12 -5 16 -11z m-56 -155 c0 -8 -7 -14 -15 -14 -15 0 -21 21 -9 33 10 9 24 -2 24 -19z m-632 4 c-3 -7 -11 -13 -18 -13 -7 0 -15 6 -17 13 -3 7 4 12 17 12 13 0 20 -5 18 -12z m694 -140 c-9 -9 -15 -9 -24 0 -10 10 -10 15 2 22 20 12 38 -6 22 -22z m-752 -34 c0 -8 -7 -14 -15 -14 -15 0 -21 21 -9 33 10 9 24 -2 24 -19z"/> <path d="M381 665 c-35 -61 -36 -70 -17 -104 15 -28 31 -13 21 20 -4 13 2 37 17 65 23 43 24 44 75 44 50 0 52 -1 78 -45 l26 -46 -20 -33 c-25 -39 -26 -46 -7 -46 8 0 24 17 36 38 l23 37 -34 63 -33 62 -67 0 -67 0 -31 -55z"/> <path d="M425 573 c-14 -14 -17 -31 -13 -100 4 -82 4 -82 -19 -77 -25 7 -53 -10 -53 -31 0 -7 23 -47 50 -89 28 -42 50 -85 50 -96 0 -19 7 -20 95 -20 79 0 95 3 95 16 0 13 -13 15 -82 13 -75 -2 -83 0 -87 17 -2 10 -23 50 -48 87 -42 63 -50 89 -23 72 6 -4 20 -21 31 -39 10 -17 19 -26 20 -21 0 6 0 65 -1 133 -1 114 0 123 17 120 16 -3 18 -14 18 -86 0 -66 3 -82 15 -82 12 0 14 10 11 46 -2 36 0 45 10 42 9 -3 15 -24 17 -57 2 -34 7 -51 15 -48 7 2 10 20 8 45 -2 33 1 42 13 42 12 0 16 -11 16 -45 0 -33 4 -45 15 -45 11 0 15 11 15 36 0 24 4 34 13 31 16 -5 17 -132 1 -175 -12 -29 -11 -32 5 -32 24 0 30 24 32 129 1 72 -1 86 -17 98 -10 7 -23 12 -29 10 -5 -2 -16 3 -24 10 -7 8 -19 12 -27 9 -7 -3 -18 2 -24 10 -7 8 -19 14 -26 14 -9 0 -14 11 -14 28 0 49 -42 69 -75 35z"/> </g> </svg></div>
                                                                                              <h3>Generate industry insights</h3>
                                                                                              <p>Synthesize PwC experience and market data to deliver structured industry intelligence​</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('prepare-client-meeting')">
                                                                                              <div class="mi-card-icon"><svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-client-meeting-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-client-meeting-card)" stroke="none"> <path d="M60 554 l0 -324 173 2 c220 4 229 22 12 26 l-155 3 0 292 0 292 390 0 390 0 0 -285 0 -285 -41 73 -40 73 -117 -3 -117 -3 -53 -92 -54 -92 43 -76 c34 -59 48 -75 66 -75 23 0 23 2 23 110 0 90 -3 110 -15 110 -11 0 -15 -19 -17 -90 l-3 -91 -31 58 -32 58 47 78 46 77 99 -2 99 -3 43 -70 c24 -38 43 -75 44 -81 0 -6 -15 -37 -32 -70 l-33 -59 -3 98 c-2 77 -6 97 -17 97 -12 0 -15 -20 -15 -110 l0 -110 28 0 c23 1 33 11 70 75 l42 75 0 324 0 325 -420 0 -420 0 0 -325z"/> <path d="M208 765 c-31 -17 -63 -67 -73 -112 -9 -44 24 -117 65 -142 52 -31 94 -35 145 -12 107 47 118 197 19 262 -35 23 -117 25 -156 4z m62 -72 c0 -62 -35 -166 -54 -160 -6 1 -22 24 -35 50 -28 57 -23 87 24 134 50 50 65 45 65 -24z m96 23 c50 -50 46 -66 -16 -66 l-50 0 0 50 c0 62 16 66 66 16z m34 -107 c0 -24 -35 -68 -67 -83 -35 -16 -87 -22 -81 -8 2 4 11 28 22 55 l19 47 53 0 c33 0 54 -4 54 -11z"/> <path d="M603 700 c-110 -67 -64 -240 64 -242 104 -1 170 96 127 187 -33 71 -123 97 -191 55z m140 -36 c63 -62 36 -149 -56 -178 -44 -14 -117 46 -117 96 0 63 44 107 106 108 31 0 48 -6 67 -26z"/> <path d="M150 441 c0 -13 15 -16 95 -16 78 0 95 3 95 15 0 12 -18 15 -95 16 -80 0 -95 -2 -95 -15z"/> <path d="M150 378 c0 -16 13 -18 130 -18 117 0 130 2 130 18 0 15 -13 17 -130 17 -117 0 -130 -2 -130 -17z"/> </g> </svg></div>
                                                                                              <h3>Prepare for client meeting</h3>
                                                                                              <p>Rapidly ramp-up for client discussions with insights and research​</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('create-pov')">
                                                                                              <div class="mi-card-icon"><svg width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-pov-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-pov-card)" stroke="none"> <path d="M40 865 c-4 0 0 -769 4 -772 19 -19 27 74 25 306 l-1 256 216 3 c119 1 216 -1 216 -6 0 -4 -6 -17 -14 -27 -13 -18 -11 -26 16 -75 l31 -55 -26 -43 c-31 -48 -32 -52 -12 -52 8 0 28 21 44 47 l30 47 -31 56 -30 55 47 83 47 82 97 0 96 0 48 -85 48 -84 -47 -81 -47 -80 -107 0 c-89 0 -109 -3 -114 -16 -3 -9 -6 -16 -6 -17 0 -1 49 -1 110 1 l110 3 0 -120 c0 -101 2 -121 15 -121 13 0 15 21 15 126 l0 125 50 85 c28 47 50 89 50 95 0 6 -22 49 -50 96 -38 65 -50 95 -50 126 l0 42 -390 0 c-214 0 -390 0 -390 0z m750 -47 c0 -16 -12 -18 -103 -18 l-103 0 -29 -55 -30 -55 -222 0 c-123 0 -226 1 -230 3 -5 1 -8 142 -3 142 0 0 162 0 360 0 336 0 360 -1 360 -17z"/> <path d="M384 785 c-15 -23 -15 -27 0 -50 28 -42 96 -24 96 25 0 49 -68 67 -96 25z m64 -28 c2 -11 -3 -17 -17 -17 -23 0 -35 15 -26 31 10 15 39 6 43 -14z"/> <path d="M600 665 c0 -12 18 -15 100 -15 82 0 100 3 100 15 0 12 -18 15 -100 15 -82 0 -100 -3 -100 -15z"/> <path d="M600 605 c0 -12 18 -15 100 -15 82 0 100 3 100 15 0 12 -18 15 -100 15 -82 0 -100 -3 -100 -15z"/> <path d="M283 553 c-35 -7 -80 -58 -87 -98 -22 -114 123 -188 205 -106 37 37 46 75 28 124 -22 62 -81 94 -146 80z m93 -57 c19 -19 34 -44 34 -55 0 -53 -49 -101 -101 -101 -12 0 -37 16 -56 35 -30 30 -35 40 -29 67 10 50 51 86 100 87 10 1 33 -14 52 -33z"/> <path d="M600 545 c0 -12 18 -15 100 -15 82 0 100 3 100 15 0 12 -18 15 -100 15 -82 0 -100 -3 -100 -15z"/> <path d="M174 223 c-21 -37 -46 -80 -56 -95 -10 -14 -18 -28 -18 -30 0 -1 157 -4 350 -5 346 -3 350 -3 361 18 11 21 11 21 -143 18 l-154 -4 -46 80 -45 80 -106 3 -106 3 -37 -68z m266 -26 c19 -34 37 -66 39 -70 2 -5 -10 -7 -25 -5 -23 2 -29 8 -29 28 0 15 -6 25 -15 25 -9 0 -15 -10 -15 -24 0 -24 -2 -25 -77 -26 l-78 -2 0 29 c0 18 -5 28 -15 28 -9 0 -15 -9 -15 -25 0 -26 -17 -39 -44 -33 -11 2 -5 19 25 71 l40 67 87 0 87 0 35 -63z"/> </g> </svg></div>
                                                                                              <h3>Create point of view</h3>
                                                                                              <p>Turn research into draft perspectives​</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('gather-proposal-insights')">
                                                                                              <div class="mi-card-icon"><svg  width="48pt" height="48pt" viewBox="0 0 96.000000 96.000000" preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-proposal-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-proposal-card)" stroke="none"> <path d="M138 825 c-23 -38 -49 -83 -60 -98 l-19 -28 59 -102 60 -102 114 0 113 0 58 97 c58 100 64 113 48 122 -5 3 -33 -37 -63 -89 -29 -52 -55 -95 -58 -95 -3 0 -18 23 -33 50 l-28 50 -80 0 c-62 0 -79 -3 -79 -14 0 -33 -17 -22 -44 28 l-28 53 46 80 47 81 97 4 c98 4 111 1 126 -36 3 -7 8 -6 15 4 7 10 5 22 -5 40 -15 24 -18 25 -131 25 l-115 0 -40 -70z m193 -255 c10 -19 18 -38 19 -42 0 -5 -35 -8 -78 -8 -73 0 -80 2 -90 24 -18 41 5 61 73 61 55 0 58 -1 76 -35z"/> <path d="M480 829 c-12 -22 -29 -54 -39 -70 l-18 -30 -27 45 c-15 26 -34 46 -42 46 -18 0 -18 2 20 -68 18 -32 36 -52 47 -52 11 0 34 27 63 75 50 82 54 95 31 95 -8 0 -24 -18 -35 -41z"/> <path d="M221 809 c-35 -14 -50 -39 -51 -80 0 -73 92 -108 145 -54 63 62 -12 168 -94 134z m69 -39 c25 -25 25 -55 0 -80 -24 -24 -38 -25 -68 -4 -26 18 -29 60 -5 86 21 24 48 23 73 -2z"/> <path d="M490 580 c-30 -54 -54 -102 -53 -107 1 -4 25 -50 54 -101 l53 -93 119 3 119 3 55 94 c40 70 52 100 46 113 -7 15 -19 -1 -63 -81 -30 -55 -57 -101 -60 -101 -3 0 -19 24 -35 54 l-29 53 -72 -1 c-60 -1 -76 -5 -87 -20 -13 -18 -16 -17 -41 26 -14 24 -26 50 -26 57 0 6 17 40 38 74 21 35 41 71 45 80 5 14 21 17 106 17 99 0 101 0 115 -27 13 -25 15 -26 22 -10 3 10 1 29 -6 43 -13 23 -17 24 -129 24 l-116 -1 -55 -99z m209 -230 l22 -40 -80 0 c-89 0 -109 12 -88 57 9 20 17 23 67 23 55 0 57 -1 79 -40z"/> <path d="M837 592 c-19 -36 -39 -68 -43 -69 -5 -2 -19 15 -32 37 -12 22 -29 40 -37 40 -20 0 -18 -7 14 -60 43 -71 67 -67 116 21 50 88 49 85 32 92 -10 4 -26 -16 -50 -61z"/> <path d="M577 589 c-24 -14 -49 -73 -40 -96 13 -38 46 -63 82 -63 83 1 116 85 59 148 -23 24 -70 29 -101 11z m89 -44 c20 -31 12 -68 -18 -82 -48 -21 -97 23 -79 70 17 44 72 50 97 12z"/> <path d="M156 430 c-12 -19 -39 -65 -59 -101 l-37 -67 58 -98 59 -99 113 0 112 0 32 50 c69 108 91 154 79 166 -8 8 -25 -14 -64 -85 -30 -52 -57 -96 -60 -96 -3 0 -18 22 -33 49 l-26 49 -76 4 c-71 3 -77 2 -88 -20 -12 -23 -13 -23 -41 31 l-29 54 48 85 48 85 101 -1 c93 -1 101 -3 110 -24 12 -27 27 -29 27 -4 0 46 -20 53 -138 55 l-113 2 -23 -35z m172 -291 c12 -21 22 -40 22 -42 0 -2 -36 -3 -79 -3 -66 1 -81 4 -91 19 -9 15 -8 24 4 42 13 19 23 23 69 22 51 -1 55 -3 75 -38z"/> <path d="M209 375 c-29 -16 -52 -66 -42 -93 13 -38 46 -62 84 -62 54 0 84 28 84 80 0 34 -6 47 -28 66 -32 27 -60 30 -98 9z m81 -35 c25 -25 25 -55 0 -80 -23 -23 -33 -24 -60 -10 -31 17 -43 46 -29 73 23 42 57 49 89 17z"/> <path d="M340 385 c0 -3 14 -30 31 -60 23 -41 36 -54 50 -52 22 4 63 63 54 78 -11 16 -21 10 -37 -23 l-15 -32 -27 47 c-15 26 -34 47 -42 47 -8 0 -14 -2 -14 -5z"/> </g> </svg></div>
                                                                                              <h3>Gather proposal inputs</h3>
                                                                                              <p>Develop a proposal outline and pull sample frameworks, approaches, and quals​</p>
                                                                                            </button>
                                                                                            <button class="mi-action-card" (click)="onMIActionCardClick('create-rfp-response')">
                                                                                              <div class="mi-card-icon"><svg width="48.000000pt" height="48.000000pt" viewBox="0 0 96.000000 96.000000"  preserveAspectRatio="xMidYMid meet"><defs><linearGradient x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox" id="fill0-rfp-card"><stop offset="0" stop-color="#FF9F00"/><stop offset="0.05089" stop-color="#FE9900"/><stop offset="0.466323" stop-color="#FD7204"/><stop offset="0.797112" stop-color="#FD5907"/><stop offset="1" stop-color="#FD5108"/></linearGradient></defs> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="url(#fill0-rfp-card)" stroke="none"> <path d="M770 793 c0 -4 -21 -19 -46 -32 -34 -19 -44 -29 -41 -43 4 -15 1 -18 -13 -13 -10 3 -48 14 -84 24 l-66 18 -48 -33 c-43 -31 -53 -34 -118 -34 -76 0 -90 5 -72 27 6 7 9 15 7 16 -22 14 -111 67 -114 67 -2 0 -21 -30 -41 -67 -21 -38 -55 -96 -77 -131 -22 -35 -37 -66 -34 -69 15 -14 37 12 96 116 l63 112 31 -18 c16 -10 30 -22 30 -26 0 -5 -26 -53 -58 -108 -47 -81 -62 -98 -77 -94 -25 9 -23 -17 3 -33 18 -11 23 -11 33 4 11 15 15 13 39 -17 14 -18 22 -36 18 -39 -4 -3 -14 -16 -20 -29 -12 -22 -8 -28 62 -97 42 -41 81 -74 87 -74 7 0 21 -12 33 -26 16 -20 26 -25 48 -20 16 3 31 1 34 -4 10 -17 44 -11 62 10 10 11 29 20 44 20 14 0 34 9 44 20 10 11 26 20 34 18 36 -5 69 12 76 39 3 15 17 37 31 50 25 23 32 57 14 68 -6 4 -3 17 10 33 49 66 50 67 59 54 6 -10 13 -11 34 -1 28 13 26 43 -3 34 -13 -4 -30 17 -78 99 -63 109 -63 110 -16 134 20 11 26 4 85 -99 58 -101 81 -130 94 -117 7 7 -141 262 -154 266 -6 2 -11 0 -11 -5z m-148 -104 l88 -21 41 -74 c43 -78 43 -79 -4 -133 l-27 -33 -105 91 -106 90 -63 -31 c-51 -25 -70 -29 -99 -24 -21 4 -37 10 -37 14 0 8 201 140 215 141 6 1 49 -9 97 -20z m-263 -45 c2 -2 -20 -18 -48 -35 -56 -35 -56 -46 0 -75 40 -20 74 -17 140 12 l58 26 78 -68 c43 -38 93 -81 111 -96 24 -20 32 -33 27 -47 -11 -34 -33 -31 -81 12 -26 23 -52 42 -57 42 -26 0 -12 -24 39 -65 56 -46 62 -58 42 -78 -19 -19 -30 -14 -81 33 -27 25 -52 45 -57 45 -24 0 -16 -22 20 -52 44 -36 47 -68 8 -68 -34 0 -103 70 -103 103 0 17 -7 32 -18 38 -12 7 -15 17 -11 34 8 31 -29 69 -59 61 -12 -3 -30 3 -45 15 -31 24 -34 24 -69 -5 l-29 -25 -27 34 -26 33 40 71 41 70 51 -6 c29 -3 54 -7 56 -9z m-79 -249 c-47 -48 -64 -55 -74 -29 -4 11 9 31 39 62 43 42 47 44 63 29 15 -16 13 -20 -28 -62z m117 29 c7 -19 -93 -124 -119 -124 -32 0 -19 33 34 87 54 55 74 64 85 37z m30 -80 c4 -11 -10 -31 -41 -62 -45 -45 -48 -46 -62 -27 -13 17 -11 23 28 62 45 46 65 53 75 27z m30 -80 c7 -19 -34 -64 -59 -64 -25 0 -23 29 4 57 25 27 46 30 55 7z m43 -49 c0 -14 -37 -31 -47 -21 -9 8 28 47 38 40 5 -3 9 -11 9 -19z"/> </g> </svg></div>
                                                                                              <h3>Create RFP response</h3>
                                                                                              <p>Gather inputs to jumpstart your RFP response ​</p>
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
                                                                            <app-ready-to-publish-flow></app-ready-to-publish-flow>

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
                                                                            <app-mi-create-rfp-response-flow></app-mi-create-rfp-response-flow>

                                                                            <!-- DDC Guided Dialog and Flow Components -->
                                                                            <app-guided-dialog
                                                                              [isOpen]="showDdcGuidedDialog"
                                                                              journeyType="ddc"
                                                                              [title]="'Doc studio'"
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
                                                                            <app-event-branding-flow
                                                                              [hideBackButton]="workflowOpenedFrom === 'quick-action'"
                                                                              [openedFrom]="workflowOpenedFrom">
                                                                            </app-event-branding-flow>
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
                                                                          }

        <!-- Copyright Footer -->
        <div class="copyright-footer">
          <p>© 2026 PwC. All rights reserved. PwC refers to the PwC network and/or one or more of its member firms, each of which is a separate legal entity. Please see <a href="https://www.pwc.com/structure" target="_blank" rel="noopener noreferrer">www.pwc.com/structure</a> for further details.</p>
        </div>
      </main>
                                                                     
  <!-- DDC Request Form (Modal) - Root Level for Accessibility from Home Page -->
  @if (showRequestForm) {
    <app-ddc-request-form
      (ticketCreated)="onTicketCreated($event)"
      (close)="showRequestForm = false">
    </app-ddc-request-form>
  }
  
  <!-- TL Request Form (Modal) - Root Level for Accessibility from Home Page -->
  @if (showTLRequestForm) {
    <app-tl-request-form
      (ticketCreated)="onTicketCreated($event)"
      (close)="showTLRequestForm = false">
    </app-tl-request-form>
  }

  <!-- Cortex Reminder Dialog -->
  @if (showCortexReminder) {
    <div class="reminder-overlay">
      <div class="reminder-dialog">
        <div class="reminder-header">
          <h2>Reminder</h2>
          <button 
            class="close-btn" 
            (click)="closeCortexReminderWithoutAction()" 
            type="button"
            aria-label="Close reminder"
            title="Close">
            ✕
          </button>
        </div>
        <div class="reminder-content">
          <p>Remember to complete the <a href="javascript:void(0)" (click)="onTLActionCardClick('ready-to-publish'); closeCortexReminder()" class="reminder-link">Ready to Publish Review Process</a> once your content is complete.</p>
          <div class="reminder-checkbox">
            <input 
              type="checkbox" 
              id="cortex-reminder-confirm" 
              [(ngModel)]="cortexReminderConfirmed"
              class="checkbox-input">
            <label for="cortex-reminder-confirm" class="checkbox-label">Yes, I confirm</label>
          </div>
        </div>
        <div class="reminder-footer">
          <button 
            class="confirm-btn" 
            (click)="closeCortexReminder()" 
            type="button"
            [disabled]="!cortexReminderConfirmed">Confirm</button>
        </div>
      </div>
    </div>
  }
