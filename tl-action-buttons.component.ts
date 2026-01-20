import { Component, Input, Output, EventEmitter, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParagraphEdit } from '../../../../core/models/message.model';
import { allParagraphsDecided } from '../../../../core/utils/paragraph-edit.utils';
import { EditorialFeedbackItem } from '../../../../core/utils/edit-content.utils';
import { EditorProgressItem } from '../../editor-progress/editor-progress.component';

type ParagraphFeedback = ParagraphEdit & {
  original: string;
  edited: string;
  displayOriginal?: string;
  displayEdited?: string;
  editorial_feedback?: { [key: string]: EditorialFeedbackItem[] };
  approved?: boolean | null;
  autoApproved?: boolean;
  index?: number;
};

@Component({
    selector: 'app-paragraph-edits',
    imports: [CommonModule],
    template: `
    <div class="result-section">
      <h4 class="result-title">Paragraph Edits</h4>
      @if (!showFinalOutput) {
        <p class="paragraph-instructions">
          @if (autoApprovedCount > 0) {
            Review each paragraph edit below. Click the buttons to approve (✓) or reject (✗) each edit.
            <span class="auto-approved-hint">({{ autoApprovedCount }} paragraph{{ autoApprovedCount !== 1 ? 's' : '' }} auto-approved)</span>
          } @else {
            Review each paragraph edit below. Click the buttons to approve (✓) or reject (✗) each edit.
          }
        </p>
      }
      @if (showFinalOutput) {
        <p class="paragraph-instructions">
          Below are the paragraph-by-paragraph edits. The revised article is shown below.
        </p>
      }
    
      <!-- Single Approve All / Reject All buttons (applies to feedback and paragraphs) -->
      @if (paragraphFeedbackData &&paragraphFeedbackData.length > 0 &&!showFinalOutput &&!hasNoParagraphFeedback) {
        <div class="bulk-actions">
          <button
            type="button"
            class="bulk-action-btn ef-approve-btn"
            (click)="approveAll(); $event.stopPropagation()"
            [disabled]="allParagraphsApproved && allFeedbackApproved"
            title="Approve all feedback and paragraph edits">
            ✓ Approve All
          </button>
          <button
            type="button"
            class="bulk-action-btn ef-reject-btn"
            (click)="declineAll(); $event.stopPropagation()"
            [disabled]="allParagraphsDeclined && allFeedbackRejected"
            title="Reject all feedback and paragraph edits">
            ✗ Reject All
          </button>
        </div>
      }
      
    
      <div class="paragraph-edits-container">
        @if (hasNoParagraphFeedback && !showFinalOutput) {
          <div class="paragraph-no-feedback">
            <p>
              There are no feedback changes from
              <strong>{{ getEditorDisplayName(currentEditor) }}</strong>.
            </p>
          </div>
        }
        <!-- Show paragraph edits (previous editor stays visible while loading next editor) -->
        @if (paragraphsForReview.length > 0 && !hasNoParagraphFeedback) {
          @for (paragraph of paragraphsForReview; track paragraph) {
            <div class="paragraph-edit-item"
              [ngClass]="{ 'approved': paragraph.approved === true, 'declined': paragraph.approved === false }">
              <div class="paragraph-header">
                <!-- Paragraph-level approve/reject removed; use the bulk actions or editorial feedback actions -->
                @if (showFinalOutput) {
                  <div class="approval-status">
                    @if (paragraph.approved === true) {
                      <span class="status-badge approved-badge">✓ Approved</span>
                    }
                    @if (paragraph.approved === false) {
                      <span class="status-badge declined-badge">✗ Rejected</span>
                    }
                  </div>
                }
              </div>
              <div class="paragraph-comparison-boxes">
                <div class="paragraph-box paragraph-box-original">
                  <h5>Original</h5>
                  <div class="paragraph-text-box"
                    [innerHTML]="paragraph.displayOriginal ? paragraph.displayOriginal : highlightAllFeedbacks(paragraph).original">
                  </div>
                </div>
                <div class="paragraph-box paragraph-box-edited"
                  [class.approved-box]="paragraph.approved === true"
                  [class.declined-box]="paragraph.approved === false">
                  <h5>Edited</h5>
                  <div class="paragraph-text-box"
                    [innerHTML]="paragraph.displayEdited ? paragraph.displayEdited : highlightAllFeedbacks(paragraph).edited"
                    [class.declined-text]="paragraph.approved === false">
                  </div>
                </div>
              </div>
              <!-- Editorial Feedback List (same as guided journey) -->
              @if (paragraph.editorial_feedback) {
                <div class="editorial-feedback-list">
                  <div class="ef-cards">
                    @for (editorType of objectKeys(paragraph.editorial_feedback); track editorType) {
                      @if (paragraph.editorial_feedback![editorType]?.length) {
                        <div class="editor-type-label">{{ editorType | titlecase }} Editor Feedback</div>
                        @for (fb of paragraph.editorial_feedback![editorType]; track fb; let fbIndex = $index) {
                          <div class="ef-card"
                            [id]="'fb-' + paragraph.index + '-' + editorType + '-' + fbIndex"
                            (mouseenter)="onFeedbackHover(paragraph, editorType, fb, fbIndex)"
                            (mouseleave)="onFeedbackLeave(paragraph)">
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
                              @if (fb.rule || fb.rule_used) {
                                <div class="ef-row ef-rule">
                                  <span class="ef-label-small">Rule:</span>
                                  <span class="ef-value-small">{{ fb.rule || fb.rule_used }}</span>
                                </div>
                              }
                              @if (fb.impact) {
                                <div class="ef-row ef-impact">
                                  <span class="ef-label-small">Impact:</span>
                                  <span class="ef-value-small">{{ fb.impact }}</span>
                                </div>
                              }
                              @if (!showFinalOutput) {
                                <div class="ef-actions">
                                  <button class="ef-approve-btn"
                                    (click)="applyEditorialFix(paragraph, editorType, fb); $event.stopPropagation()"
                                  [disabled]="fb.approved === true || showFinalOutput">✓ Approve</button>
                                  <button class="ef-reject-btn"
                                    (click)="rejectEditorialFeedback(paragraph, editorType, fb); $event.stopPropagation()"
                                  [disabled]="fb.approved === false || showFinalOutput">✗ Reject</button>
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
                </div>
              }
            </div>
          }
        } @else {
          <div class="paragraph-no-feedback">
            <p>
              There are no paragraphs to review from
              <strong>{{ getEditorDisplayName(currentEditor) }}</strong>.
            </p>
          </div>
        }
    
      </div>

      <!-- Sequential Workflow Progress Indicator -->
      @if (isSequentialMode && currentEditor) {
        <div class="sequential-progress">
          <div class="progress-header">
            <h4 class="progress-title">Editor Progress</h4>
            <span class="progress-badge">
              {{ (currentEditorIndex ?? 0) + 1 }} of {{ totalEditors ?? 0 }}
            </span>
          </div>
          <!-- Horizontal Editor Timeline -->
          @if ((totalEditors ?? 0) > 0) {
            <div class="editor-timeline horizontal">
              @for (step of editorSteps; track step; let i = $index; let last = $last) {
                @if (editorProgressList[i]) {
                  <div
                    class="timeline-item"
                    [ngClass]="{
                      'completed': editorProgressList[i].status === 'completed',
                      'active': editorProgressList[i].status === 'processing' || editorProgressList[i].status === 'review-pending',
                      'upcoming': editorProgressList[i].status === 'pending'
                    }"
                  >
                    <div class="timeline-marker" [ngClass]="{ 'blink-marker': editorProgressList[i].status === 'processing' }">
                      @if (editorProgressList[i].status === 'completed') {
                        ✓
                      } @else {
                        <span [ngClass]="{ 'blink-number': editorProgressList[i].status === 'processing' }">{{ i + 1 }}</span>
                      }
                    </div>
                    <div class="timeline-editor-name" [ngClass]="{ 'blink-name': editorProgressList[i].status === 'processing' }">
                      @if (editorOrder && editorOrder.length > 0 && editorOrder[i]) {
                        {{ getEditorDisplayName(editorOrder[i]) }}
                      } @else if (i === (currentEditorIndex ?? 0)) {
                        {{ getEditorDisplayName(currentEditor) || ('Editor ' + (i + 1)) }}
                      } @else {
                        Editor {{ i + 1 }}
                      }
                    </div>
                    <div class="timeline-status" [ngClass]="{ 'loading-status': editorProgressList[i].status === 'processing' }">
                      @if (editorProgressList[i].status === 'completed') { Completed }
                      @if (editorProgressList[i].status === 'processing') {
                        <span class="blink-animation">In Progress</span>
                      }
                      @if (editorProgressList[i].status === 'review-pending') {
                        Review Pending
                      }
                      @if (editorProgressList[i].status === 'pending') { Not Started }
                    </div>
                  </div>
                  <!-- Connector line between steps -->
                  @if (!last) {
                    <div 
                      class="timeline-connector"
                      [ngClass]="{ 'completed': editorProgressList[i].status === 'completed' }">
                    </div>
                  }
                }
              }
            </div>
          }

          <!-- Status Summary Pills -->
          @if (paragraphEdits && paragraphEdits.length > 0) {
            <div class="status-summary">
              <h5 class="status-summary-title">Feedback Summary</h5>
              <div class="status-pills-container">
                <button
                  type="button"
                  class="status-pill status-pill-approved"
                  (click)="scrollToFirstFeedbackByStatus('approved')"
                  [disabled]="approvedFeedbackCount === 0"
                  title="Scroll to first approved feedback">
                  <span class="pill-label">Approved</span>
                  <span class="pill-count">{{ approvedFeedbackCount }}</span>
                </button>
                <button
                  type="button"
                  class="status-pill status-pill-rejected"
                  (click)="scrollToFirstFeedbackByStatus('rejected')"
                  [disabled]="rejectedFeedbackCount === 0"
                  title="Scroll to first rejected feedback">
                  <span class="pill-label">Rejected</span>
                  <span class="pill-count">{{ rejectedFeedbackCount }}</span>
                </button>
                <button
                  type="button"
                  class="status-pill status-pill-pending"
                  (click)="scrollToFirstFeedbackByStatus('pending')"
                  [disabled]="pendingFeedbackCount === 0"
                  title="Scroll to first pending feedback">
                  <span class="pill-label">Pending</span>
                  <span class="pill-count">{{ pendingFeedbackCount }}</span>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Sequential Workflow: Show both Next Editor and Generate Final Output options -->
      @if (isSequentialMode && paragraphEdits.length > 0 && !showFinalOutput) {
        <div class="sequential-actions-container">
          <div class="final-output-actions">
            <button 
              type="button"
              class="final-output-btn"
              (click)="onGenerateFinal(); $event.stopPropagation()"
              [disabled]="!allParagraphsDecided || isGeneratingFinal || isNextEditorClicked">
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
          @if (!isLastEditor && !showFinalOutput) {
            <div class="next-editor-actions">
              <button 
                type="button"
                class="next-editor-btn"
                (click)="onNextEditor(); $event.stopPropagation()"
                [disabled]="!allParagraphsDecided || isGenerating || showFinalOutput">
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
        </div>
      }

      <!-- Non-sequential mode: Show only Generate Final Output -->
      @if (!isSequentialMode && !showFinalOutput && paragraphEdits.length > 0) {
        <div class="final-output-actions">
          <button
            type="button"
            class="final-output-btn"
            (click)="onGenerateFinal(); $event.stopPropagation()"
            [disabled]="!allParagraphsDecided || isGeneratingFinal || isNextEditorClicked">
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
    </div>
    `,
    styles: [`
    :host {
      display: block;
      position: relative;
      pointer-events: auto;
    }

    .result-section {
      margin-top: 16px;
      position: relative;
      pointer-events: auto;
    }

    .result-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary, #1F2937);
      margin-bottom: 8px;
    }

    .paragraph-instructions {
      font-size: 13px;
      color: #6B7280;
      margin-bottom: 16px;
    }

    .bulk-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 16px;
      padding: 8px 12px;
      background: var(--bg-secondary, #F9FAFB);
      border-radius: 8px;
      border: 1px solid var(--border-color, #E5E7EB);
      width: fit-content;
      margin-left: auto;
    }

    .bulk-action-btn {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      display: inline-block;
      text-align: center;
      text-decoration: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      user-select: none;
      margin: 0;
      font-family: inherit;
      position: relative;
      pointer-events: auto;
      touch-action: manipulation;
    }

    .bulk-action-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .bulk-action-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .bulk-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .bulk-action-btn:focus:not(:disabled) {
      outline: 2px solid #fd5108;
      outline-offset: 2px;
    }

    .approve-all-btn {
      background-color: #F0FDF4;
      color: #059669;
      border-color: #10b981;
    }

    .approve-all-btn:hover:not(:disabled) {
      background-color: #D1FAE5;
      border-color: #059669;
    }

    .decline-all-btn {
      background-color: #FEF2F2;
      color: #DC2626;
      border-color: #EF4444;
    }

    .decline-all-btn:hover:not(:disabled) {
      background-color: #FEE2E2;
      border-color: #DC2626;
    }

    @media (max-width: 768px) {
      .bulk-actions {
        flex-direction: row;
        width: 100%;
        justify-content: flex-end;
      }
      
      .bulk-action-btn {
        flex: 0 0 auto;
      }
    }

    .paragraph-edits-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 16px;
    }

    .paragraph-edit-item {
      border: 1px solid var(--border-color, #E5E7EB);
      border-radius: 8px;
      padding: 16px;
      background: var(--bg-primary, #FFFFFF);
      position: relative;
      pointer-events: auto;
    }

    .paragraph-edit-item.approved {
      border-color: #10b981;
      background: #F0FDF4;
    }

    .paragraph-edit-item.declined {
      border-color: #EF4444;
      background: #FEF2F2;
    }

    .paragraph-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color, #E5E7EB);
    }

    .paragraph-number {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary, #1F2937);
    }

    .approval-buttons {
      display: flex;
      gap: 8px;
      position: relative;
      z-index: 20;
      pointer-events: auto;
    }

    .approve-btn,
    .decline-btn {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      display: inline-block;
      text-align: center;
      text-decoration: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      user-select: none;
      margin: 0;
      font-family: inherit;
      position: relative;
      z-index: 25;
      pointer-events: auto;
      touch-action: manipulation;
    }

    .approve-btn:hover:not(:disabled),
    .decline-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .approve-btn:active:not(:disabled),
    .decline-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .approve-btn:disabled,
    .decline-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
    }

    .approve-btn:focus,
    .decline-btn:focus {
      outline: 2px solid #fd5108;
      outline-offset: 2px;
    }

    .approve-btn {
      background-color: #F0FDF4;
      color: #059669;
      border-color: #10b981;
    }

    .approve-btn:hover:not(:disabled) {
      background-color: #D1FAE5;
      border-color: #059669;
    }

    .approve-btn.active {
      background-color: #10b981;
      color: white;
      border-color: #10b981;
    }

    .decline-btn {
      background-color: #FEF2F2;
      color: #DC2626;
      border-color: #EF4444;
    }

    .decline-btn:hover:not(:disabled) {
      background-color: #FEE2E2;
      border-color: #DC2626;
    }

    .decline-btn.active {
      background-color: #EF4444;
      color: white;
      border-color: #EF4444;
    }

    .approval-status {
      display: flex;
      align-items: center;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .approved-badge {
      background-color: #F0FDF4;
      color: #059669;
      border: 1px solid #10b981;
    }

    .declined-badge {
      background-color: #FEF2F2;
      color: #DC2626;
      border: 1px solid #EF4444;
    }

    .undecided-badge {
      background-color: #F5F5F5;
      color: #6B7280;
      border: 1px solid #E5E7EB;
    }

    .paragraph-comparison-boxes {
      display: flex;
      flex-direction: row;
      gap: 16px;
      margin-bottom: 12px;
      width: 100%;
    }

    @media (max-width: 768px) {
      .paragraph-comparison-boxes {
        flex-direction: column;
      }
    }

    .paragraph-box {
      flex: 1 1 0;
      min-width: 0;
      border: 2px solid var(--border-color, #E5E7EB);
      border-radius: 8px;
      padding: 16px;
      background: white;
      min-height: 150px;
      display: flex;
      flex-direction: column;
    }

    .paragraph-box h5 {
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .paragraph-box-original {
      border-color: #E5E7EB;
    }

    .paragraph-box-original h5 {
      color: #6B7280;
    }

    .paragraph-box-edited {
      border-color: #D1D5DB;
      transition: border-color 0.2s ease, background-color 0.2s ease;
    }

    .paragraph-box-edited.approved-box {
      border-color: #10b981 !important;
      background: #F0FDF4 !important;
    }

    .paragraph-box-edited.declined-box {
      border-color: #EF4444 !important;
      background: #FEF2F2 !important;
    }

    .paragraph-box-edited h5 {
      color: #1F2937;
    }

    .paragraph-text-box {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary, #1F2937);
      white-space: pre-wrap;
      word-wrap: break-word;
      flex: 1;
      min-height: 50px;
    }

    .paragraph-text-box:empty::before {
      content: '(No content)';
      color: #9CA3AF;
      font-style: italic;
    }

    .no-content-placeholder {
      color: #9CA3AF;
      font-style: italic;
      display: block;
    }

    .paragraph-text-box.declined-text {
      text-decoration: line-through;
      opacity: 0.7;
    }

    .paragraph-tags {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color, #E5E7EB);
      font-size: 12px;
    }

    .paragraph-tags strong {
      color: #6B7280;
      margin-right: 8px;
    }

    .tag-badge {
      display: inline-block;
      padding: 4px 10px;
      margin: 4px 4px 4px 0;
      background: #E0E7FF;
      color: #4338CA;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .final-output-actions {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 2px solid var(--border-color, #E5E7EB);
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.6s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Editorial feedback styles (same as guided journey) */
    .editorial-feedback-list {
      margin-top: 16px;
      margin-bottom: 12px;
      /* Keep feedback lists usable when very long */
      max-height: 280px;
      overflow: auto;
      padding-right: 8px;
    }

    .editor-type-label {
      font-weight: 600;
      margin: 12px 0 6px 0;
      color: #0369a1;
      font-size: 13px;
    }

    .ef-cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }

    .ef-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      background: #fff;
      margin-bottom: 8px;
    }

    .ef-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .ef-issue {
      font-weight: 600;
      font-size: 13px;
      color: #111827;
      flex: 1;
    }

    .ef-priority {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }

    .priority-critical {
      background: #fee2e2;
      color: #991b1b;
    }

    .priority-important {
      background: #fef3c7;
      color: #92400e;
    }

    .priority-enhancement {
      background: #dbeafe;
      color: #1e40af;
    }

    .ef-body {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ef-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .ef-label {
      font-weight: 600;
      min-width: 40px;
      color: #374151;
      background: #dcfce7;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 12px;
    }

    .ef-value {
      flex: 1;
      color: #1f2937;
      font-size: 13px;
      line-height: 1.5;
    }

    .ef-label-small {
      font-weight: 500;
      min-width: 50px;
      color: #6b7280;
      font-size: 11px;
    }

    .ef-value-small {
      flex: 1;
      color: #6b7280;
      font-size: 11px;
      line-height: 1.4;
    }

    .ef-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .ef-approve-btn, .ef-reject-btn {
      padding: 4px 12px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .ef-approve-btn {
      background: #d1fae5;
      color: #059669;
    }

    .ef-approve-btn:hover:not(:disabled) {
      background: #10b981;
      color: #fff;
    }

    .ef-approve-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .ef-reject-btn {
      background: #fee2e2;
      color: #dc2626;
    }

    .ef-reject-btn:hover:not(:disabled) {
      background: #dc2626;
      color: #fff;
    }

    .ef-reject-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .ef-status {
      margin-top: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .ef-approved {
      color: #059669;
    }

    .ef-rejected {
      color: #dc2626;
    }

    :host ::ng-deep .highlight-yellow {
      background: #fef08a;
      color: #92400e;
      font-weight: 700;
      padding: 2px 4px;
      border-radius: 3px;
    }

    :host ::ng-deep .highlight-hover {
      // Enhance existing highlight colors with hover effect instead of replacing with yellow
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
      transform: scale(1.02);
      transition: all 0.2s ease;
      // Darken existing background slightly
      filter: brightness(0.95);
    }
    
    // Specific hover enhancements for different highlight types
    :host ::ng-deep .highlight-yellow.highlight-hover {
      background: #fde047 !important; // Slightly brighter yellow
      box-shadow: 0 0 0 2px #facc15;
    }
    
    :host ::ng-deep .highlight-green.highlight-hover {
      background: #4ade80 !important; // Slightly brighter green
      box-shadow: 0 0 0 2px #22c55e;
    }
    
    :host ::ng-deep .strikeout.highlight-hover {
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
    }

    :host ::ng-deep .strikeout {
      text-decoration: line-through;
    }

    :host ::ng-deep .highlight-fix {
      color: #0c9500;
      font-weight: 700;
      padding: 2px 4px;
      border-radius: 3px;
    }

    :host ::ng-deep .highlight-green {
      background: #86efac;
      color: #166534;
      font-weight: 700;
      padding: 2px 4px;
      border-radius: 3px;
    }

    // Strikeout with yellow background (for approved issues in original)
    :host ::ng-deep .strikeout.highlight-yellow {
      background: #fef08a;
      color: #92400e;
      text-decoration: line-through;
      font-weight: 700;
      padding: 2px 4px;
      border-radius: 3px;
    }

    /* Update bulk-actions to support ef-approve-btn and ef-reject-btn */
    .bulk-actions .ef-approve-btn,
    .bulk-actions .ef-reject-btn {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      display: inline-block;
      text-align: center;
    }

    .bulk-actions .ef-approve-btn {
      background: #F0FDF4;
      color: #059669;
      border-color: #10b981;
    }

    .bulk-actions .ef-approve-btn:hover:not(:disabled) {
      background: #D1FAE5;
      border-color: #059669;
    }

    .bulk-actions .ef-reject-btn {
      background: #FEF2F2;
      color: #DC2626;
      border-color: #EF4444;
    }

    .bulk-actions .ef-reject-btn:hover:not(:disabled) {
      background: #FEE2E2;
      border-color: #DC2626;
    }

    .bulk-actions .ef-approve-btn:disabled,
    .bulk-actions .ef-reject-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    // Sequential Workflow Progress Indicator
    .sequential-progress {
      margin: 24px 0;
      padding: 16px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .progress-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary, #1F2937);
      margin: 0;
    }

    .progress-badge {
      padding: 4px 12px;
      background: #3B82F6;
      color: white;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: #E5E7EB;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #3B82F6, #60A5FA);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 14px;
      color: var(--text-secondary, #6B7280);
      margin: 0;
      
      strong {
        color: var(--text-primary, #1F2937);
        font-weight: 600;
      }
    }

    /* Horizontal Editor Timeline */
    .editor-timeline.horizontal {
      display: flex;
      align-items: flex-start;
      gap: 0;
      margin: 16px 0 12px;
      padding: 12px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow-x: auto;
      overflow-y: visible;
    }

    .timeline-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 120px;
      max-width: 160px;
      text-align: center;
      position: relative;
      flex-shrink: 0;
    }

    .timeline-marker {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #d0d0d0;
      color: #333;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .timeline-item.completed .timeline-marker {
      background: #2e7d32;
      color: #FFFFFF;
      border-color: #2e7d32;
    }

    .timeline-item.active .timeline-marker {
      background: #1976d2;
      color: #FFFFFF;
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.2);
    }

    .timeline-item.upcoming .timeline-marker {
      background: #d0d0d0;
      color: #666;
      border-color: #d0d0d0;
    }

    /* Blinking animation for "In Progress" status */
    .blink-animation {
      animation: blink 1.5s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }

    /* Blinking animation for timeline marker */
    .blink-marker {
      animation: blink-marker 1.2s ease-in-out infinite !important;
    }

    /* Blinking animation for timeline marker numbers */
    .blink-number {
      animation: blink-number 1.2s ease-in-out infinite !important;
      display: inline-block;
    }

    /* Blinking animation for editor name */
    .blink-name {
      animation: blink-name 1.2s ease-in-out infinite !important;
    }

    @keyframes blink-marker {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
        box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.4);
      }
      50% {
        opacity: 0.6;
        transform: scale(1.15);
        box-shadow: 0 0 0 5px rgba(25, 118, 210, 0.6);
      }
    }

    @keyframes blink-number {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.3;
        transform: scale(1.2);
      }
    }

    @keyframes blink-name {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .timeline-editor-name {
      margin-top: 8px;
      font-weight: 600;
      font-size: 12px;
      color: #1F2937;
      line-height: 1.3;
      word-wrap: break-word;
      width: 100%;
    }

    .timeline-status {
      margin-top: 4px;
      font-size: 11px;
      color: #6B7280;
      font-weight: 500;
    }

    .timeline-item.completed .timeline-status {
      color: #2e7d32;
    }

    .timeline-item.active .timeline-status {
      color: #1976d2;
      font-weight: 600;
    }

    .timeline-item.active .timeline-status.loading-status {
      color: #1976d2;
    }

    .timeline-connector {
      flex: 1;
      height: 2px;
      background: #d0d0d0;
      margin-top: 15px;
      min-width: 40px;
      max-width: 80px;
      transition: background 0.3s ease;
      position: relative;
      align-self: flex-start;
    }

    .timeline-connector.completed {
      background: #2e7d32;
    }

    .status-summary {
      margin-top: 16px;
    }

    .status-summary-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #1F2937);
      margin: 0 0 8px 0;
    }

    // Status Pills Container
    .status-pills-container {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      flex-wrap: wrap;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      background: #F3F4F6;
      color: #6B7280;
      
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      &:active:not(:disabled) {
        transform: translateY(0);
      }
      
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }
      
      .pill-label {
        font-weight: 500;
      }
      
      .pill-count {
        background: rgba(255, 255, 255, 0.8);
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
        min-width: 20px;
        text-align: center;
      }
    }

    .status-pill-approved {
      background: #D1FAE5;
      color: #059669;
      border-color: #10B981;
      
      &:hover:not(:disabled) {
        background: #A7F3D0;
        border-color: #059669;
      }
      
      .pill-count {
        background: #10B981;
        color: white;
      }
    }

    .status-pill-rejected {
      background: #FEE2E2;
      color: #DC2626;
      border-color: #EF4444;
      
      &:hover:not(:disabled) {
        background: #FECACA;
        border-color: #DC2626;
      }
      
      .pill-count {
        background: #EF4444;
        color: white;
      }
    }

    .status-pill-pending {
      background: #FEF3C7;
      color: #D97706;
      border-color: #FBBF24;
      
      &:hover:not(:disabled) {
        background: #FDE68A;
        border-color: #D97706;
      }
      
      .pill-count {
        background: #F59E0B;
        color: white;
      }
    }

    // Sequential Actions Container (holds both Next Editor and Generate Final Output)
    .sequential-actions-container {
      margin: 24px 0;
      display: flex;
      flex-direction: row;
      gap: 16px;
      align-items: flex-start;

      .final-output-actions,
      .next-editor-actions {
        flex: 1;
        padding: 20px;
        background: #F0F7FF;
        border: 1px solid #BFDBFE;
        border-radius: 8px;
        text-align: center;
      }
    }

    .next-editor-btn {
      padding: 12px 24px;
      background: #3B82F6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      
      &:hover:not(:disabled) {
        background: #2563EB;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
      }
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    .next-editor-hint {
      margin-top: 12px;
      font-size: 13px;
      color: #6B7280;
      margin-bottom: 0;
    }

    // Final Output Actions (updated for sequential mode)
    .final-output-actions {
      margin: 24px 0;
      padding: 20px;
      background: #F0F7FF;
      border: 1px solid #BFDBFE;
      border-radius: 8px;
      text-align: center;

      .sequential-actions-container & {
        margin: 0;
      }
    }

    .final-output-btn {
      padding: 12px 24px;
      background: #10B981;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      
      &:hover:not(:disabled) {
        background: #059669;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
      }
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    .final-output-hint {
      margin-top: 12px;
      font-size: 13px;
      color: #6B7280;
      margin-bottom: 0;
    }

    // Loading state styles
    .loading-state {
      padding: 40px 20px;
      text-align: center;
      background: #F9FAFB;
      border: 2px dashed #E5E7EB;
      border-radius: 8px;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .loading-text {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .loading-subtext {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
    }

    .loading-state .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* No feedback message styling (same as guided journey) */
    .paragraph-no-feedback {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.2rem;
      margin-top: 5rem;
      border-radius: 0.5rem;
      border: 1px dashed rgba(0, 0, 0, 0.12);
      background-color: #fd5108;
      text-align: center;
      font-size: 0.95rem;
      color: rgba(0, 0, 0, 0.7);
    }

    .paragraph-no-feedback p {
      margin: 0;
      font-size: 1.12rem;
    }
    
  `]
})
export class ParagraphEditsConsolidatedComponent implements OnChanges {
  @Input() paragraphEdits: ParagraphEdit[] = [];
  @Input() showFinalOutput: boolean = false;
  @Input() isGeneratingFinal: boolean = false;
    hasNoParagraphFeedback: boolean = false;
  // Sequential workflow inputs
  @Input() threadId?: string | null;
  @Input() currentEditor?: string | null;
  @Input() editorOrder: string[] = []; // Normalized editor order from source of truth (ChatEditWorkflowService)
  @Input() isSequentialMode?: boolean;
  @Input() isLastEditor?: boolean;
  @Input() currentEditorIndex?: number;
  @Input() totalEditors?: number;
  @Input() isGenerating?: boolean;
  @Output('paragraphApproved') paragraphApproved = new EventEmitter<number>();
  @Output('paragraphDeclined') paragraphDeclined = new EventEmitter<number>();
  @Output('generateFinal') generateFinal = new EventEmitter<void>();
  @Output('nextEditor') nextEditor = new EventEmitter<void>();

  // Hover state tracking
  private hoveredFeedback: { paragraphIndex: number, editorType: string, feedbackIndex: number } | null = null;

  // Track when next editor is clicked to disable generate final output
  isNextEditorClicked: boolean = false;

  // Editor progress list for status-based timeline (matching guided journey)
  editorProgressList: EditorProgressItem[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  get allParagraphsDecided(): boolean {
    // If all feedback is decided, buttons should enable (even if paragraphs aren't explicitly approved)
    // This allows "Approve All" / "Reject All" to enable buttons when they only affect feedback items
    const feedbackDecided = this.allParagraphFeedbackDecided;
    if (feedbackDecided) {
      return true; // Enable buttons when all feedback is decided
    }
    // Otherwise, check both paragraph-level and feedback decisions
    const paragraphsDecided = allParagraphsDecided(this.paragraphEdits);
    return paragraphsDecided && feedbackDecided;
  }

  /** Check if all paragraph feedback items are decided */
  get allParagraphFeedbackDecided(): boolean {
    if (!this.paragraphEdits || this.paragraphEdits.length === 0) {
      return true; // No feedback to decide
    }
    
    return this.paragraphEdits.every(para => {
      // Only check if all editorial feedback items are decided (not paragraph approval)
      // This allows Next Editor to enable when all feedback is approved/rejected
      if (!para.editorial_feedback) {
        return true; // No feedback means nothing to decide
      }
      
      const feedbackTypes = Object.keys(para.editorial_feedback);
      // If there are no feedback types, consider it decided
      if (feedbackTypes.length === 0) {
        return true;
      }
      
      for (const editorType of feedbackTypes) {
        const feedbacks = (para.editorial_feedback as any)[editorType] || [];
        // If there are no feedbacks for this editor type, skip it
        if (feedbacks.length === 0) {
          continue;
        }
        for (const fb of feedbacks) {
          // Feedback is decided if approved is true or false (not null/undefined)
          if (fb.approved === null || fb.approved === undefined) {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  get allParagraphsApproved(): boolean {
    return this.paragraphEdits.length > 0 && 
           this.paragraphEdits.every(p => p.approved === true);
  }
  
  get allParagraphsDeclined(): boolean {
    return this.paragraphEdits.length > 0 && 
           this.paragraphEdits.every(p => p.approved === false);
  }
  
  onApproveAll(): void {
    if (this.paragraphEdits.length === 0) {
      return;
    }
    
    // Emit approval event for each paragraph
    this.paragraphEdits.forEach(paragraph => {
      if (paragraph.index !== undefined && paragraph.index !== null) {
        this.paragraphApproved.emit(paragraph.index);
      }
    });
  }
  
  onDeclineAll(): void {
    if (this.paragraphEdits.length === 0) {
      return;
    }
    
    // Emit decline event for each paragraph
    this.paragraphEdits.forEach(paragraph => {
      if (paragraph.index !== undefined && paragraph.index !== null) {
        this.paragraphDeclined.emit(paragraph.index);
      }
    });
  }


  // Paragraph-level approve/reject buttons were removed from the UI.
  // Individual paragraph approval/decline is handled via bulk actions
  // or via editorial feedback approvals. Keep the outputs for
  // backward compatibility but they are not emitted from per-paragraph UI here.

  onGenerateFinal() {
    this.generateFinal.emit();
  }

  /** Number of paragraphs auto-approved by the service or by identical content */
  get autoApprovedCount(): number {
    return this.paragraphEdits.filter(p => p.autoApproved === true).length;
  }

  /** Paragraphs that require user review (excludes auto-approved) */
  get paragraphsForReview(): ParagraphEdit[] {
    return this.paragraphEdits
      .filter(p => p.autoApproved !== true)
      .sort((a, b) => a.index - b.index);
  }

  // Initialize displayOriginal/displayEdited with highlights when input changes
  // Use a lifecycle hook to prepare initial highlighted views so UI shows yellow highlights by default
  ngOnChanges(): void {
    this.initializeHighlights();
    this.initializeEditorProgressList();
    this.updateEditorStatus();
  }

  private initializeHighlights(): void {
    if (!this.paragraphEdits || this.paragraphEdits.length === 0) return;
    this.paragraphEdits.forEach((p: any, idx: number) => {
      // ensure index is set
      if (p.index === undefined || p.index === null) p.index = idx;
      // Always clear display properties when new data arrives to ensure default highlighting works
      // This ensures highlightAllFeedbacks() always generates fresh highlights with yellow for unreviewed
      // Only preserve display properties if they were set by user hover actions (handled separately)
      if (!p._hoverActive) {
        // When not in hover state, clear display properties to show fresh highlights
        // This ensures default yellow highlighting shows for unreviewed feedback
        p.displayOriginal = undefined;
        p.displayEdited = undefined;
      }
    });
  }

  /** Check if any paragraph has editorial feedback */
  get hasEditorialFeedback(): boolean {
    return this.paragraphEdits.some(p => 
      p.editorial_feedback && 
      Object.values(p.editorial_feedback).some(feedbacks => 
        Array.isArray(feedbacks) && feedbacks.length > 0
      )
    );
  }

  /** Check if all feedback items are approved */
  get allFeedbackApproved(): boolean {
    return this.paragraphEdits.every(p => {
      if (!p.editorial_feedback) return true;
      return Object.values(p.editorial_feedback).every(feedbacks => {
        if (!Array.isArray(feedbacks)) return true;
        return feedbacks.length === 0 || feedbacks.every((fb: any) => fb.approved === true);
      });
    });
  }

  /** Check if all feedback items are rejected */
  get allFeedbackRejected(): boolean {
    return this.paragraphEdits.every(p => {
      if (!p.editorial_feedback) return true;
      return Object.values(p.editorial_feedback).every(feedbacks => {
        if (!Array.isArray(feedbacks)) return true;
        return feedbacks.length > 0 && feedbacks.every((fb: any) => fb.approved === false);
      });
    });
  }

  // expose Object.keys for template usage
  objectKeys = Object.keys;

  /** Apply editorial fix (apply highlight/strikeout and mark the feedback approved) */
  applyEditorialFix(para: any, editorType: string, fb: any): void {
    if (this.showFinalOutput) return;
    
    // Toggle: If already approved, uncheck it (set to null for unreviewed/yellow)
    if (fb.approved === true) {
      fb.approved = null; // Uncheck - back to unreviewed state (yellow)
    } else {
      fb.approved = true; // Approve (green/strikeout)
    }
    
    // Clear display properties so highlightAllFeedbacks() handles all highlighting
    para.displayOriginal = undefined;
    para.displayEdited = undefined;
    
    // Force change detection to update button states (enable/disable Next Editor and Generate Final Output)
    this.cdr.detectChanges();
  }

  /** Remove any existing HTML tags from text so we highlight against raw text */
  private stripHtmlSpans(html: string): string {
    if (!html) return '';
    // Remove all HTML tags to get plain text for highlighting
    return html.replace(/<[^>]*>/g, '');
  }

  /** Reject editorial feedback (mark feedback rejected and clear any per-feedback highlights) */
  rejectEditorialFeedback(para: any, editorType: string, fb: any): void {
    if (this.showFinalOutput) return;
    
    // Toggle: If already rejected, uncheck it (set to null for unreviewed/yellow)
    if (fb.approved === false) {
      fb.approved = null; // Uncheck - back to unreviewed state (yellow)
    } else {
      fb.approved = false; // Reject (green/strikeout opposite)
    }
    
    // Clear display properties so highlightAllFeedbacks() handles all highlighting
    para.displayOriginal = undefined;
    para.displayEdited = undefined;
    
    // Force change detection to update button states (enable/disable Next Editor and Generate Final Output)
    this.cdr.detectChanges();
  }

  highlightAllFeedbacks(para: ParagraphEdit | ParagraphFeedback | null | undefined): { original: string, edited: string } {
    const originalText = this.stripHtmlSpans((para as any)?.original ?? '');
    const editedText = this.stripHtmlSpans((para as any)?.edited ?? '');

    let highlightedOriginal = originalText;
    let highlightedEdited = editedText;

    // Step 1: Collect all feedback items with their approval status and positions
    // Search in ORIGINAL plain text to get correct positions (avoid HTML corruption)
    const originalItems: Array<{text: string, approved: boolean | null, start: number, end: number}> = [];
    const editedItems: Array<{text: string, approved: boolean | null, start: number, end: number}> = [];

    // Use original plain text for searching positions (avoid HTML interference)
    const plainOriginal = originalText; // Use plain text for searching
    const plainEdited = editedText; // Use plain text for searching

    const editorial = (para as any)?.editorial_feedback || {};

    // Collect all issues from original text (search in plain text, not HTML)
    Object.keys(editorial).forEach(editorType => {
      const feedbacks = (editorial as any)[editorType] || [];
      feedbacks.forEach((fb: any) => {
        const issueText = fb.issue?.trim();
        if (issueText && plainOriginal.includes(issueText)) {
          // Find all occurrences in plain text
          const escaped = this.escapeRegex(issueText);
          const regex = new RegExp(escaped, 'g');
          let match;
          // Reset regex lastIndex to ensure we find all matches
          regex.lastIndex = 0;
          while ((match = regex.exec(plainOriginal)) !== null) {
            originalItems.push({
              text: issueText,
              approved: fb.approved === true ? true : (fb.approved === false ? false : null),
              start: match.index,
              end: match.index + issueText.length
            });
          }
        }

        const fixText = fb.fix?.trim();
        if (fixText && plainEdited.includes(fixText)) {
          // Find all occurrences in plain text
          const escaped = this.escapeRegex(fixText);
          const regex = new RegExp(escaped, 'g');
          let match;
          // Reset regex lastIndex to ensure we find all matches
          regex.lastIndex = 0;
          while ((match = regex.exec(plainEdited)) !== null) {
            editedItems.push({
              text: fixText,
              approved: fb.approved === true ? true : (fb.approved === false ? false : null),
              start: match.index,
              end: match.index + fixText.length
            });
          }
        }
      });
    });

    // Step 2: Process original text - apply highlights from end to start to avoid index shifting
    originalItems.sort((a, b) => b.start - a.start); // Sort descending by start position
    
    originalItems.forEach(item => {
      const before = highlightedOriginal.substring(0, item.start);
      let highlighted: string;
      if (item.approved === true) {
        // Approved: strikeout + yellow
        highlighted = `<span class="strikeout highlight-yellow">${item.text}</span>`;
      } else if (item.approved === false) {
        // Rejected: green (opposite of approve)
        highlighted = `<span class="highlight-green">${item.text}</span>`;
      } else {
        // Unreviewed: yellow
        highlighted = `<span class="highlight-yellow">${item.text}</span>`;
      }
      const after = highlightedOriginal.substring(item.end);
      highlightedOriginal = before + highlighted + after;
    });

    // Step 3: Process edited text - apply highlights from end to start to avoid index shifting
    editedItems.sort((a, b) => b.start - a.start); // Sort descending by start position
    
    editedItems.forEach(item => {
      const before = highlightedEdited.substring(0, item.start);
      let highlighted: string;
      if (item.approved === true) {
        // Approved: green
        highlighted = `<span class="highlight-green">${item.text}</span>`;
      } else if (item.approved === false) {
        // Rejected: strikeout + yellow (opposite of approve)
        highlighted = `<span class="strikeout highlight-yellow">${item.text}</span>`;
      } else {
        // Unreviewed: yellow
        highlighted = `<span class="highlight-yellow">${item.text}</span>`;
      }
      const after = highlightedEdited.substring(item.end);
      highlightedEdited = before + highlighted + after;
    });

    return { original: highlightedOriginal, edited: highlightedEdited };
  }

  // Helper method to escape special regex characters
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Check if text is a single word (no spaces) */
  private isSingleWord(text: string): boolean {
    return text.trim().split(/\s+/).length === 1;
  }

  approveAllFeedback(): void {
    // Prevent changes after final output is generated
    if (this.showFinalOutput) {
      return;
    }
    // Only approve feedback items, NOT paragraphs (no paragraph text box highlighting)
    this.paragraphEdits.forEach((para: any) => {
      // Approve all feedback items
      Object.keys(para.editorial_feedback || {}).forEach(editorType => {
        const feedbacks = (para.editorial_feedback as any)[editorType] || [];
        feedbacks.forEach((fb: any) => {
          // Set all to approved (don't toggle)
          fb.approved = true;
        });
      });
      // Clear display properties so highlightAllFeedbacks() handles all highlighting
      para.displayOriginal = undefined;
      para.displayEdited = undefined;
    });
    // Force change detection to update the view
    this.cdr.detectChanges();
  }

  rejectAllFeedback(): void {
    // Prevent changes after final output is generated
    if (this.showFinalOutput) {
      return;
    }
    // Only reject feedback items, NOT paragraphs (no paragraph text box highlighting)
    this.paragraphEdits.forEach((para: any) => {
      // Reject all feedback items
      Object.keys(para.editorial_feedback || {}).forEach(editorType => {
        const feedbacks = (para.editorial_feedback as any)[editorType] || [];
        feedbacks.forEach((fb: any) => {
          // Set all to rejected (don't toggle)
          fb.approved = false;
        });
      });
      // Clear display properties so highlightAllFeedbacks() handles all highlighting
      para.displayOriginal = undefined;
      para.displayEdited = undefined;
    });
    // Force change detection to update the view
    this.cdr.detectChanges();
  }

  /** Approve All: approve all feedback items only (NOT paragraphs) */
  approveAll(): void {
    if (this.showFinalOutput) return;
    
    // Only approve feedback items, NOT paragraphs (matching guided journey behavior)
    this.approveAllFeedback();
    
    // Clear hover state and display properties to force re-highlighting
    this.hoveredFeedback = null;
    this.paragraphEdits.forEach((para: any) => {
      para._hoverActive = false;
      para.displayOriginal = undefined;
      para.displayEdited = undefined;
    });
    
    // Force change detection to update highlights
    this.cdr.detectChanges();
  }

  /** Reject All: reject all feedback items only (NOT paragraphs) */
  declineAll(): void {
    if (this.showFinalOutput) return;
    
    // Only reject feedback items, NOT paragraphs (matching guided journey behavior)
    this.rejectAllFeedback();
    
    // Clear hover state and display properties to force re-highlighting
    this.hoveredFeedback = null;
    this.paragraphEdits.forEach((para: any) => {
      para._hoverActive = false;
      para.displayOriginal = undefined;
      para.displayEdited = undefined;
    });
    
    // Force change detection to update highlights
    this.cdr.detectChanges();
  }

  // derived minimal shape used for bulk operations
  get paragraphFeedbackData(): ParagraphFeedback[] {
    return (this.paragraphEdits || []).map((p: any, idx: number) => ({
      ...p,
      original: (p.displayOriginal ?? p.original) ?? '',
      edited: (p.displayEdited ?? p.edited) ?? '',
      editorial_feedback: p.editorial_feedback || {},
      displayOriginal: p.displayOriginal,
      displayEdited: p.displayEdited,
      approved: p.approved,
      autoApproved: p.autoApproved,
      index: p.index ?? idx
    }));
  }

  // Approve a feedback item (mark approved; do not toggle paragraph-level approval)
  approveEditorialFeedback(para: any, editorType: string, fb: any) {
    if (this.showFinalOutput) return;
    
    // Toggle: If already approved, uncheck it (set to null for unreviewed/yellow)
    if (fb.approved === true) {
      fb.approved = null; // Uncheck - back to unreviewed state (yellow)
    } else {
      fb.approved = true; // Approve (green/strikeout)
    }
    
    // Clear display properties so highlightAllFeedbacks() handles all highlighting
    para.displayOriginal = undefined;
    para.displayEdited = undefined;
  }

  /** Get display name for editor */
  getEditorDisplayName(editorId: string | null | undefined): string {
    if (!editorId) return '';
    
    // Map editor IDs to display names
    const editorMap: { [key: string]: string } = {
      'development': 'Development Editor',
      'content': 'Content Editor',
      'line': 'Line Editor',
      'copy': 'Copy Editor',
      'brand-alignment': 'PwC Brand Alignment Editor'
    };
    
    return editorMap[editorId] || editorId;
  }

  /** Paragraphs that require review (exclude autoApproved) */
  private get reviewParagraphs(): ParagraphFeedback[] {
    return (this.paragraphFeedbackData || [])
      .filter(p => p.autoApproved !== true)
      .sort((a, b) => a.index - b.index);
  }

  /** Steps array for editor timeline (0..totalEditors-1) */
  get editorSteps(): number[] {
    const total = this.totalEditors ?? 0;
    if (total <= 0) return [];
    return Array.from({ length: total }, (_, i) => i);
  }

  /** Initialize editor progress list from editorOrder (matching guided journey) */
  private initializeEditorProgressList(): void {
    if (!this.isSequentialMode || !this.totalEditors || this.totalEditors === 0) {
      this.editorProgressList = [];
      return;
    }

    const editorsToUse = this.editorOrder && this.editorOrder.length > 0 
      ? this.editorOrder 
      : Array.from({ length: this.totalEditors }, (_, i) => `editor-${i + 1}`);

    this.editorProgressList = editorsToUse.slice(0, this.totalEditors).map((editorId, index) => {
      const editorName = this.getEditorDisplayName(editorId);
      return {
        editorId: editorId,
        editorName: editorName,
        status: 'pending' as const,
        current: index + 1,
        total: this.totalEditors
      };
    });

    // Update statuses based on current state
    this.updateEditorStatus();
  }

  /** Update editor status based on isGenerating and currentEditorIndex (matching guided journey) */
  private updateEditorStatus(): void {
    if (!this.editorProgressList || this.editorProgressList.length === 0) {
      return;
    }

    const currentIndex = this.currentEditorIndex ?? 0;

    this.editorProgressList.forEach((editor, index) => {
      if (index < currentIndex) {
        editor.status = 'completed';
      } else if (index === currentIndex) {
        // Current editor: processing when loading, review-pending when not loading
        if (this.isGenerating === true) {
          editor.status = 'processing';
        } else {
          editor.status = 'review-pending';
        }
      } else {
        editor.status = 'pending';
      }
    });

    this.cdr.detectChanges();
  }

  /** Flatten all editorial feedback items across paragraphs */
  private getAllFeedbackItems(): Array<{
    paraIndex: number;
    editorType: string;
    fbIndex: number;
    fb: any;
  }> {
    const items: Array<{ paraIndex: number; editorType: string; fbIndex: number; fb: any }> = [];

    for (const para of this.reviewParagraphs) {
      const types = Object.keys(para.editorial_feedback || {});
      for (const editorType of types) {
        const arr = (para.editorial_feedback as any)[editorType] || [];
        arr.forEach((fb: any, fbIndex: number) => {
          items.push({ paraIndex: para.index, editorType, fbIndex, fb });
        });
      }
    }

    return items;
  }

  /** Count of feedback items approved (fb.approved === true) */
  get approvedFeedbackCount(): number {
    return this.getAllFeedbackItems().filter(x => x.fb?.approved === true).length;
  }

  /** Count of feedback items rejected (fb.approved === false) */
  get rejectedFeedbackCount(): number {
    return this.getAllFeedbackItems().filter(x => x.fb?.approved === false).length;
  }

  /** Count of feedback items pending (fb.approved is null/undefined) */
  get pendingFeedbackCount(): number {
    return this.getAllFeedbackItems().filter(
      x => x.fb?.approved === null || x.fb?.approved === undefined
    ).length;
  }

  /** Scroll to the first feedback card with the requested status */
  scrollToFirstFeedbackByStatus(status: 'pending' | 'approved' | 'rejected'): void {
    const match = this.getAllFeedbackItems().find(x => {
      if (status === 'approved') return x.fb?.approved === true;
      if (status === 'rejected') return x.fb?.approved === false;
      return x.fb?.approved === null || x.fb?.approved === undefined;
    });

    if (!match) return;

    const el = document.getElementById(`fb-${match.paraIndex}-${match.editorType}-${match.fbIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }

  /** Handle next editor button click */
  onNextEditor(): void {
    this.isNextEditorClicked = true;

    // Mark current editor as completed when moving to next (matching guided journey)
    const currentIndex = this.currentEditorIndex ?? 0;
    const currentEditorItem = this.editorProgressList[currentIndex];
    if (currentEditorItem && currentEditorItem.status === 'review-pending') {
      currentEditorItem.status = 'completed';
    }

    // Immediately update next editor to 'processing' status for visual feedback
    const nextEditorIndex = currentIndex + 1;
    if (nextEditorIndex < this.editorProgressList.length) {
      const nextEditorItem = this.editorProgressList[nextEditorIndex];
      if (nextEditorItem && (nextEditorItem.status === 'pending' || nextEditorItem.status === 'review-pending')) {
        nextEditorItem.status = 'processing';
        this.cdr.detectChanges();
      }
    }

    this.nextEditor.emit();
  }

  /** Handle feedback card hover - highlight corresponding issue/fix in paragraph text */
  onFeedbackHover(para: any, editorType: string, fb: any, fbIndex: number): void {
    if (this.showFinalOutput) return;
    
    // Mark paragraph as in hover state
    para._hoverActive = true;
    this.hoveredFeedback = {
      paragraphIndex: para.index,
      editorType: editorType,
      feedbackIndex: fbIndex
    };
    
    // First generate normal highlights for all feedback items (preserves other feedback highlights)
    const normalHighlights = this.highlightAllFeedbacks(para);
    
    // Then add hover highlight on top for the specific feedback item
    const highlighted = this.addHoverHighlight(normalHighlights, para, editorType, fb);
    para.displayOriginal = highlighted.original;
    para.displayEdited = highlighted.edited;
    
    this.cdr.detectChanges();
  }

  /** Handle feedback card mouse leave - restore normal highlighting */
  onFeedbackLeave(para: any): void {
    if (this.showFinalOutput) return;
    
    // Clear hover state
    para._hoverActive = false;
    this.hoveredFeedback = null;
    
    // Clear display properties to restore default highlighting
    para.displayOriginal = undefined;
    para.displayEdited = undefined;
    
    this.cdr.detectChanges();
  }

  /** Add hover highlight on top of existing highlights for a specific feedback item */
  private addHoverHighlight(existingHighlights: { original: string, edited: string }, para: ParagraphEdit | ParagraphFeedback, editorType: string, fb: any): { original: string, edited: string } {
    let highlightedOriginal = existingHighlights.original;
    let highlightedEdited = existingHighlights.edited;

    // Add hover highlight for issue text in original
    const issueText = fb.issue?.trim();
    if (issueText) {
      const escaped = this.escapeRegex(issueText);
      // Find spans that contain this exact text and add hover class
      // Match spans that contain the issue text (handles nested spans)
      const spanRegex = new RegExp(`(<span[^>]*class="[^"]*"[^>]*>([^<]*${escaped}[^<]*)</span>)`, 'g');
      highlightedOriginal = highlightedOriginal.replace(spanRegex, (match) => {
        // Add highlight-hover class to existing span if not already present
        if (!match.includes('highlight-hover')) {
          return match.replace(/class="([^"]*)"/, `class="$1 highlight-hover"`);
        }
        return match;
      });
    }

    // Add hover highlight for fix text in edited
    const fixText = fb.fix?.trim();
    if (fixText) {
      const escaped = this.escapeRegex(fixText);
      // Find spans that contain this exact text and add hover class
      const spanRegex = new RegExp(`(<span[^>]*class="[^"]*"[^>]*>([^<]*${escaped}[^<]*)</span>)`, 'g');
      highlightedEdited = highlightedEdited.replace(spanRegex, (match) => {
        // Add highlight-hover class to existing span if not already present
        if (!match.includes('highlight-hover')) {
          return match.replace(/class="([^"]*)"/, `class="$1 highlight-hover"`);
        }
        return match;
      });
    }

    return { original: highlightedOriginal, edited: highlightedEdited };
  }
  
}
