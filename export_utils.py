@if (isOpen) {
  <div class="flow-backdrop">
    <div class="flow-container" (click)="$event.stopPropagation()">
      <div class="flow-header">
        <h2 class="flow-title">Edit Content</h2>
        <div class="header-buttons">
          <button class="back-btn" (click)="back()" aria-label="Back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" />
              </svg>
            </button>
            <button class="close-btn" (click)="onClose()" aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div class="flow-content">
          <h3 class="panel-title">Great! To get started, please upload your existing content and let me know which editorial services you need</h3>
          <div class="upload-item">
            <label class="form-label">
              Upload draft
              <span class="required">(required)</span>
            </label>
            <p class="helper-text">
            Supported formats: .pdf,.docx,.txt,.md,.doc
            </p>
            <app-file-upload
              accept=".pdf,.docx,.txt,.md,.doc"
              label="Upload Document"
              (fileSelected)="onFileSelect($event)">
            </app-file-upload>
          </div>
          <div class="form-section">
            <label class="form-label">
              Choose the editing service(s) to apply
            </label>
            <div class="services-checklist">
              @for (editor of selectableEditors; track editor) {
                <label class="toggle-item">
            <input 
              type="checkbox" 
              [checked]="isEditorSelected(editor.id)"
              (change)="toggleEditor(editor.id)"
              [id]="editor.id">
            <span class="toggle-switch">
              <span class="toggle-indicator"></span>
              <span class="toggle-label">{{editor.name}}</span>
            </span>
          </label>
                }
                @if (brandAlignmentEditor) {
                  <label class="toggle-item disabled">
            <input 
              type="checkbox" 
              [checked]="true"
              id="brand-alignment"
              disabled>
            <span class="toggle-switch disabled">
              <span class="toggle-indicator"></span>
              <span class="toggle-label">{{brandAlignmentEditor.name}}</span>
            </span>
          </label>
                  }
        </div>
      </div>

      <!-- Display upload error -->
              @if (fileUploadError) {
                <div class="error-message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{{ fileUploadError }}</span>
        <button class="error-close-btn" (click)="clearUploadError()" aria-label="Close error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
              }
      <!-- Display file read error -->
              @if (fileReadError) {
                <div class="error-message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{{ fileReadError }}</span>
        <button class="error-close-btn" (click)="clearReadError()" aria-label="Close error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
              }
      <button 
        class="apply-btn" 
        (click)="editContent()"
        [disabled]="!canEdit() || isGenerating">
                @if (isGenerating) {
                  <span class="spinner"></span>
                }
        <span>{{ isGenerating ? 'Editing...' : 'Edit Content' }}</span>
      </button>

      <!-- Per-paragraph feedback UI -->
              @if (paragraphFeedbackData && paragraphFeedbackData.length) {
                <div id="paragraph-feedback-section">
                  @if (paragraphFeedbackData && paragraphFeedbackData.length && !showFinalOutput && !hasNoParagraphFeedback) {
                    <div class="bulk-actions">
          <button class="ef-approve-btn" (click)="approveAllFeedback()">Approve All</button>
          <button class="ef-reject-btn" (click)="rejectAllFeedback()">Reject All</button>
        </div>
                  }

                  @if (hasNoParagraphFeedback) {
                    <div class="paragraph-no-feedback">
                      <p>There are no Feedback changes from the current editors.</p>
                    </div>
                  }
        <!-- <div *ngIf="autoApprovedFeedbackCount > 0" class="auto-approved-info">
          <span>{{ autoApprovedFeedbackText }}</span>
        </div> -->
                @for (para of getParagraphsForFeedbackReview; track para) {
                  <div
            class="paragraph-feedback-section">
          <div class="paragraph-row">
            <div class="paragraph-col">
              <h5>Original</h5>
                <div class="paragraph-text-box"
                    [innerHTML]="highlightAllFeedbacks(
                      para,
                      hoveredFeedback && hoveredFeedback.paraIndex === para.index ? hoveredFeedback : undefined
                    ).original">
                </div>
            </div>
            <div class="paragraph-col"
                [ngClass]="{
                  'approved-section': para.approved === true,
                  'rejected-section': para.approved === false
                }">
              <h5>Edited</h5>
              <div class="paragraph-text-box"
                  [innerHTML]="highlightAllFeedbacks(
                    para,
                    hoveredFeedback && hoveredFeedback.paraIndex === para.index ? hoveredFeedback : undefined
                  ).edited">
              </div>
            </div>
          </div>

          <div class="editorial-feedback-list">
            @for (editorType of objectKeys(para.editorial_feedback); track editorType) {
              @if ($any(para.editorial_feedback)[editorType]?.length) {
                <div class="editor-type-label">
                  {{ editorType | titlecase }} Editor Feedback
                </div>

                @for (
                  fb of $any(para.editorial_feedback)[editorType];
                  track fb;
                  let fbIndex = $index
                ) {
                  <div
                    class="ef-card"
                    [attr.id]="'fb-' + para.index + '-' + editorType + '-' + fbIndex"
                    (mouseenter)="onFeedbackHover(para.index, editorType, fbIndex)"
                    (mouseleave)="onFeedbackLeave()"
                  >
                    <div class="ef-header">
                      <span class="ef-issue">{{ fb.issue }}</span>
                      <span
                        class="ef-priority"
                        [ngClass]="{
                          'priority-critical': fb.priority === 'Critical',
                          'priority-important': fb.priority === 'Important',
                          'priority-enhancement': fb.priority === 'Enhancement'
                        }"
                      >
                        {{ fb.priority }}
                      </span>
                    </div>

                    <div class="ef-body">
                      <div class="ef-row ef-fix">
                        <span class="ef-label">Fix:</span>
                        <span class="ef-value">{{ fb.fix }}</span>
                      </div>

                      <div class="ef-row ef-rule">
                        <span class="ef-label-small">Rule:</span>
                        <span class="ef-value-small">{{ fb.rule_used || fb.rule }}</span>
                      </div>

                      <div class="ef-row ef-impact">
                        <span class="ef-label-small">Impact:</span>
                        <span class="ef-value-small">{{ fb.impact }}</span>
                      </div>

                      @if (!showFinalOutput) {
                        <div class="ef-actions">
                          <button
                            class="ef-approve-btn"
                            (click)="applyEditorialFix(para, editorType, fb)"
                            [disabled]="fb.approved || showFinalOutput"
                          >
                            ✓ Approve
                          </button>
                          <button
                            class="ef-reject-btn"
                            (click)="rejectEditorialFix(para, editorType, fb)"
                            [disabled]="fb.approved === false || showFinalOutput"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      }

                      @if (fb.approved === true) {
                        <div class="ef-status">
                          <span class="ef-approved">✓ Approved</span>
                        </div>
                      }

                      @if (fb.approved === false) {
                        <div class="ef-status">
                          <span class="ef-rejected">✗ Rejected</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              }
            }
          </div>


          <!-- <div *ngIf="para.tags?.length" class="paragraph-tags">
            <strong>Services Used:</strong>
            <span *ngFor="let tag of para.tags" class="tag-badge">{{ tag }}</span>
          </div> -->
        </div>
      }

        <!-- Sequential Workflow Progress Indicator -->
        @if (isSequentialMode && currentEditor) {
          <div class="sequential-progress">
            <div class="progress-header">
              <h4 class="progress-title">Editor Progress</h4>
              <span class="progress-badge">
                {{ currentEditorIndex + 1 }} of {{ totalEditors }}
              </span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" [style.width.%]="((currentEditorIndex + 1) / totalEditors) * 100"></div>
            </div>
            <p class="progress-text">
              Current Editor: <strong>{{ getEditorDisplayName(currentEditor) }}</strong>
            </p>

            <!-- Horizontal Editor Timeline -->
            @if (totalEditors > 0 && selectedEditorsForTimeline.length > 0) {
              <div class="editor-timeline horizontal">
                @for (editor of selectedEditorsForTimeline; track editor.id; let i = $index; let last = $last) {
                  <div
                    class="timeline-item"
                    [ngClass]="{
                      'completed': i < currentEditorIndex,
                      'active': i === currentEditorIndex,
                      'upcoming': i > currentEditorIndex
                    }"
                  >
                    <div class="timeline-marker">
                      @if (i < currentEditorIndex) {
                        ✓
                      } @else {
                        {{ i + 1 }}
                      }
                    </div>
                    <div class="timeline-editor-name">
                      {{ editor.name }}
                    </div>
                    <div class="timeline-status">
                      @if (i < currentEditorIndex) { Completed }
                      @if (i === currentEditorIndex) { In Progress }
                      @if (i > currentEditorIndex) { Pending }
                    </div>
                  </div>
                  
                  <!-- Connector line -->
                  @if (!last) {
                    <div 
                      class="timeline-connector"
                      [ngClass]="{ 'completed': i < currentEditorIndex }">
                    </div>
                  }
                }
              </div>
            }

            @if (paragraphFeedbackData && paragraphFeedbackData.length) {
              <div class="paragraph-status-summary">
                <h5 class="status-summary-title">Feedback Summary</h5>
                <div class="feedback-pills">
                  <button
                    type="button"
                    class="status-pill approved"
                    (click)="scrollToFirstFeedbackByStatus('approved')"
                    [disabled]="approvedFeedbackCount === 0">
                    Approved: <strong>{{ approvedFeedbackCount }}</strong>
                  </button>

                  <button
                    type="button"
                    class="status-pill rejected"
                    (click)="scrollToFirstFeedbackByStatus('rejected')"
                    [disabled]="rejectedFeedbackCount === 0">
                    Rejected: <strong>{{ rejectedFeedbackCount }}</strong>
                  </button>

                  <button
                    type="button"
                    class="status-pill pending"
                    (click)="scrollToFirstFeedbackByStatus('pending')"
                    [disabled]="pendingFeedbackCount === 0">
                    Pending: <strong>{{ pendingFeedbackCount }}</strong>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Sequential Workflow: Show both Next Editor and Generate Final Output options -->
        @if (isSequentialMode && paragraphFeedbackData.length > 0 && !showFinalOutput) {
          <div class="sequential-actions-container">
            <div class="final-output-actions">
              <button 
                type="button"
                class="final-output-btn"
                (click)="generateFinalOutput()"
                [disabled]="!allParagraphsDecided || isGeneratingFinal">
                @if (isGeneratingFinal) {
                  <span class="spinner"></span>
                }
                {{ isGeneratingFinal ? 'Generating Final Output...' : 'Generate Final Output' }}
              </button>
              @if (!allParagraphsDecided) {
                <p class="final-output-hint">
                  Please approve or reject all paragraph edits and feedback to generate the final article.
                </p>
              }
            </div>

            <!-- Next Editor Button (only if not last editor) -->
            @if (!isLastEditor) {
              <div class="next-editor-actions">
                <button 
                  type="button"
                  class="next-editor-btn"
                  (click)="nextEditor()"
                  [disabled]="!allParagraphsDecided || isGenerating">
                  @if (isGenerating) {
                    <span class="spinner"></span>
                  }
                  {{ isGenerating ? 'Loading Next Editor...' : 'Next Editor →' }}
                </button>
                @if (!allParagraphsDecided) {
                  <p class="next-editor-hint">
                    Please approve or reject all paragraph edits before proceeding to the next editor.
                  </p>
                }
              </div>
            }

            <!-- Generate Final Output Button (always available in sequential mode) -->
            <!-- <div class="final-output-actions">
              <button 
                type="button"
                class="final-output-btn"
                (click)="generateFinalOutput()"
                [disabled]="!allParagraphsDecided || isGeneratingFinal">
                @if (isGeneratingFinal) {
                  <span class="spinner"></span>
                }
                {{ isGeneratingFinal ? 'Generating Final Output...' : 'Generate Final Output' }}
              </button>
              @if (!allParagraphsDecided) {
                <p class="final-output-hint">
                  Please approve or reject all paragraph edits and feedback to generate the final article.
                </p>
              }
            </div> -->
          </div>
        }

        <!-- Non-sequential mode: Show only Generate Final Output -->
        @if (!isSequentialMode && !showFinalOutput && paragraphFeedbackData.length > 0) {
          <div class="final-output-actions">
            <button 
              type="button"
              class="final-output-btn"
              (click)="generateFinalOutput()"
              [disabled]="!allParagraphsDecided || isGeneratingFinal">
              @if (isGeneratingFinal) {
                <span class="spinner"></span>
              }
              {{ isGeneratingFinal ? 'Generating Final Output...' : 'Generate Final Output' }}
            </button>
            @if (!allParagraphsDecided) {
              <p class="final-output-hint">
                Please approve or reject all paragraph edits and feedback to generate the final article.
              </p>
            }
          </div>
        }

        <!-- Final Output Display -->
              @if (showFinalOutput && finalArticle) {
                <div class="final-output-section">
          <!-- <h3 class="final-output-title">Final Article</h3> -->
          <div class="final-output-content revised-content-formatted" [innerHTML]="finalArticle"></div>
          
          <!-- Export Actions -->
          <div class="export-actions">
            <button 
              type="button"
              class="export-btn pdf-btn"
              (click)="downloadRevised('pdf')"
              title="Export as PDF">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Export PDF
            </button>
            <button 
              type="button"
              class="export-btn docx-btn"
              (click)="downloadRevised('docx')"
              title="Export as DOCX">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Export DOCX
            </button>
            <button 
              type="button"
              class="export-btn copy-btn"
              (click)="copyToClipboard()"
              [title]="isCopied ? 'Copied!' : 'Copy to clipboard'">
              @if (isCopied) {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Copied !
              } @else {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              }
            </button>
          </div>
                  <!-- Satisfaction Prompt -->
                  <!-- @if (showSatisfactionPrompt) {
                    <div class="satisfaction-prompt">
            <p class="satisfaction-question">{{ getSatisfactionPromptText() }}</p>
            <div class="satisfaction-buttons">
              <button 
                class="satisfaction-btn satisfied-btn"
                (click)="onSatisfactionResponse(true)">
                ✓ Satisfied
              </button>
              <button 
                class="satisfaction-btn improve-btn"
                (click)="onSatisfactionResponse(false)">
                ✗ Need Improvement
              </button>
            </div>
          </div>
                  } -->
          <!-- Improvement Input -->
                  <!-- @if (showImprovementInput) {
                    <div class="improvement-input">
            <label class="improvement-label">What improvements would you like?</label>
            <textarea 
              class="improvement-textarea"
              [(ngModel)]="improvementRequestText"
              placeholder="Describe the improvements you'd like to see..."></textarea>
            <div class="improvement-actions">
              <button 
                class="improvement-submit-btn"
                (click)="submitImprovementRequest()"
                [disabled]="!isImprovementRequestValid || isGenerating">
                {{ isGenerating ? 'Processing...' : 'Submit' }}
              </button>
              <button 
                class="improvement-cancel-btn"
                (click)="cancelImprovementRequest()">
                Cancel
              </button>
            </div>
          </div>
                  } -->
        </div>
              }
            </div>
          }
    </div>
  </div>
  <!-- Notification Toast -->
@if (showNotification) {
  <div class="notification-toast" [attr.data-type]="notificationType">
    <div class="notification-content">
      @if (notificationType === 'success') {
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      }
      @if (notificationType === 'error') {
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      }
      <span>{{ notificationMessage }}</span>
    </div>
  </div>
}
</div>
}

