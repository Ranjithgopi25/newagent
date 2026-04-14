<div class="tl-action-buttons">
  <!-- Podcast Audio Player (if podcast) -->
  <!-- @if (isPodcast && metadata.podcastAudioUrl) {
    <div class="podcast-player">
      <audio controls [src]="metadata.podcastAudioUrl"></audio>
    </div>
  } -->

  <!-- Compact Action Buttons -->
  <div class="action-bar">
    <!-- Primary Actions Group -->
    <div class="primary-actions">
      <!-- Canvas Button -->
      <!-- <button
        class="action-btn btn-canvas"
        (click)="openInCanvas()"
        title="Open in Canvas">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <path d="M9 9h6v6H9z"></path>
        </svg>
        <span>Canvas</span>
      </button> -->

      <!-- Copy to Clipboard -->
      <button
        class="action-btn btn-icon"
        (click)="copyToClipboard()"
        [class.copied]="isCopied"
        title="Copy to clipboard">
        @if (!isCopied) {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        }
        @if (isCopied) {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        }
        <span>{{ isCopied ? 'Copied!' : 'Copy' }}</span>
      </button>

      <!-- Export Dropdown (for non-podcast content) -->
      @if (metadata.contentType !== 'podcast') {
        <div class="export-buttons">
          <div class="dropdown export-dropdown">
            <button
              class="action-btn btn-export"
              (click)="toggleExportDropdown()"
              #exportButton
              title="Export document"
              [class.exporting]="isExporting"
              [class.exported]="isExported"
              [disabled]="isExporting">
              @if (isExporting) {
                <span class="export-spinner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 7v5l3 3"></path>
                  </svg>
                </span>
              }
              @if (!isExporting && !isExported) {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14"></path>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
              }
              @if (isExported) {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              }
              <span>{{ isExporting ? 'Exporting...' : isExported ? 'Exported!' : 'Export' }}</span>
              @if (!isExporting) {
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:4px;">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              }
            </button>
            <!-- Raise Phoenix Request button - same styling as Canvas button -->             
            <!-- @if (selectedFlow !== 'market-intelligence') {
              <button
                class="action-btn btn-canvas raise-btn"
                (click)="onRaisePhoenix()"
                title="Request MCX Publication Support"
                [disabled]="true"
                style="opacity: 0.5; cursor: not-allowed">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;">
                  <path d="M12 2s-4 3-4 7c0 5 4 9 4 9s4-4 4-9c0-4-4-7-4-7z"></path>
                  <path d="M5 18c2 2 5 3 7 3s5-1 7-3"></path>
                </svg>
                <span>Request MCX publication support</span>
              </button>
            } -->
            @if (showExportDropdown && !isExporting) {
              <div class="dropdown-menu">
                <button class="dropdown-item" (click)="exportSelected('word')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Word (.docx)
                </button>
                @if (metadata.contentType !== 'socialMedia') {
                  <button class="dropdown-item" (click)="exportSelected('pdf')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    PDF (.pdf)
                  </button>
                }
                @if (metadata.contentType !== 'socialMedia') {
                  <button class="dropdown-item" (click)="exportSelected('ppt')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <rect x="8" y="12" width="8" height="6" rx="1"></rect>
                      <line x1="10" y1="14" x2="14" y2="14"></line>
                      <line x1="10" y1="16" x2="14" y2="16"></line>
                    </svg>
                    PPT (.ppt)
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Draft content response: quick jump to Redline Contract -->
      @if (isSowDraftResponse && metadata.contentType !== 'podcast') {
        <button
          class="action-btn btn-canvas"
          (click)="openRedlineContractFlow()"
          title="Open Redline contract">
          <span>Readline contract</span>
        </button>
      }

      <!-- Ready to publish button -->             
      @if (selectedFlow !== 'market-intelligence' && metadata.contentType !== 'podcast' && metadata.contentType !== 'sow') {
        <button
          class="action-btn btn-canvas"
          (click)="onReadyToPublish()"
          [title]="isRedlineResponse ? 'Support for approval' : 'Ready to publish'"
          [class.preparing]="isPreparingDocument"
          [class.prepared]="isDocumentPrepared"
          [disabled]="isPreparingDocument">
          @if (isPreparingDocument) {
            <span class="prepare-spinner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 7v5l3 3"></path>
              </svg>
            </span>
          }
          @if (!isPreparingDocument && !isDocumentPrepared) {
            <svg width="16" height="16" viewBox="0 0 96.000000 96.000000" preserveAspectRatio="xMidYMid meet" style="margin-right:6px;"> <g transform="translate(0.000000,96.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"> <path d="M60 554 l0 -324 173 2 c220 4 229 22 12 26 l-155 3 0 292 0 292 390 0 390 0 0 -285 0 -285 -41 73 -40 73 -117 -3 -117 -3 -53 -92 -54 -92 43 -76 c34 -59 48 -75 66 -75 23 0 23 2 23 110 0 90 -3 110 -15 110 -11 0 -15 -19 -17 -90 l-3 -91 -31 58 -32 58 47 78 46 77 99 -2 99 -3 43 -70 c24 -38 43 -75 44 -81 0 -6 -15 -37 -32 -70 l-33 -59 -3 98 c-2 77 -6 97 -17 97 -12 0 -15 -20 -15 -110 l0 -110 28 0 c23 1 33 11 70 75 l42 75 0 324 0 325 -420 0 -420 0 0 -325z"/> <path d="M208 765 c-31 -17 -63 -67 -73 -112 -9 -44 24 -117 65 -142 52 -31 94 -35 145 -12 107 47 118 197 19 262 -35 23 -117 25 -156 4z m62 -72 c0 -62 -35 -166 -54 -160 -6 1 -22 24 -35 50 -28 57 -23 87 24 134 50 50 65 45 65 -24z m96 23 c50 -50 46 -66 -16 -66 l-50 0 0 50 c0 62 16 66 66 16z m34 -107 c0 -24 -35 -68 -67 -83 -35 -16 -87 -22 -81 -8 2 4 11 28 22 55 l19 47 53 0 c33 0 54 -4 54 -11z"/> <path d="M603 700 c-110 -67 -64 -240 64 -242 104 -1 170 96 127 187 -33 71 -123 97 -191 55z m140 -36 c63 -62 36 -149 -56 -178 -44 -14 -117 46 -117 96 0 63 44 107 106 108 31 0 48 -6 67 -26z"/> <path d="M150 441 c0 -13 15 -16 95 -16 78 0 95 3 95 15 0 12 -18 15 -95 16 -80 0 -95 -2 -95 -15z"/> <path d="M150 378 c0 -16 13 -18 130 -18 117 0 130 2 130 18 0 15 -13 17 -130 17 -117 0 -130 -2 -130 -17z"/> </g> </svg>
          }
          @if (isDocumentPrepared) {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          }
          <span>{{ isPreparingDocument ? 'Preparing...' : isDocumentPrepared ? 'Ready!' : (isRedlineResponse ? 'Support for approval' : 'Ready to publish') }}</span>
        </button>
      }

      <!-- Podcast Download -->
      @if (isPodcast) {
        <button
          class="action-btn btn-icon"
          (click)="downloadPodcast()"
          title="Download podcast MP3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Download MP3</span>
        </button>
      }
    </div>

    <!-- Secondary Action -->
    <div class="secondary-actions">
      <!-- Convert to Podcast (for non-podcast content) -->
      <!-- @if (metadata.contentType !== 'podcast') {
        <button
          class="action-btn btn-podcast"
          (click)="convertToPodcast()"
          [disabled]="true"
          title="Convert content to podcast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
          <span>{{ isConvertingToPodcast ? 'Converting...' : 'Podcast' }}</span>
        </button>
      } -->
    </div>
  </div>
  
  @if (showRequestForm) {
  <app-tl-request-form
    [documentText]="cleanedDocumentText"
    [documentTitle]="documentTitle"
    (ticketCreated)="onTicketCreated($event)"
    (close)="showRequestForm = false">
  </app-tl-request-form>
}
</div>
