@if (isOpen) {
  <div class="flow-backdrop">
    <div class="flow-container" (click)="$event.stopPropagation()">
      <div class="flow-header">
        <h2 class="flow-title">Statement of Work (SOW)</h2>
        <div class="header-buttons">
          @if (!hideBackButton) {
            <button class="back-btn" (click)="back()" aria-label="Back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
            </button>
          }
          <button class="close-btn" (click)="close()" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div class="flow-content">
        <div class="flow-content-wrapper" [class.loading]="isGenerating">

          <!-- Step: required fields missing — show first; backend merges user_filled_fields on resume -->
          @if (showMissingFieldsStep && missingFields.length > 0) {
            <div #missingFieldsPanel class="missing-fields-panel missing-fields-panel--priority">
              <p class="missing-fields-kicker">Action required</p>
              <h3 class="missing-fields-title">Complete required fields</h3>
              @if (validationStepMessage) {
                <p class="missing-fields-api-message">{{ validationStepMessage }}</p>
              } @else {
                <p class="helper-text missing-fields-intro">
                  We could not read all required information from your document. Enter the values below; they are merged with what we already extracted, then your draft is generated.
                </p>
              }
              <div class="missing-step-summary">
                <span class="summary-item"><strong>Document:</strong> {{ lastScopeOfWorkFileName || '—' }}</span>
                <span class="summary-item"><strong>PRID:</strong> {{ prid }}</span>
                <span class="summary-item"><strong>Flex ID:</strong> {{ flexId }}</span>
              </div>
              <button type="button" class="link-back-to-form" (click)="backToDocumentForm()">
                ← Edit document and form above
              </button>

              @for (field of missingFields; track field.field_key) {
                <div class="missing-field-row">
                  <label class="form-label" [attr.for]="'mf-' + field.field_key">{{ field.label }}</label>
                  @if (field.prompt_hint) {
                    <p class="field-hint">{{ field.prompt_hint }}</p>
                  }
                  @switch (normalizedFieldType(field)) {
                    @case ('dropdown') {
                      <select
                        class="text-input"
                        [id]="'mf-' + field.field_key"
                        [(ngModel)]="userFilledFields[field.field_key]">
                        <option value="" disabled>Select…</option>
                        @for (opt of field.options || []; track opt) {
                          <option [value]="opt">{{ opt }}</option>
                        }
                      </select>
                    }
                    @case ('date') {
                      <input
                        type="date"
                        class="text-input"
                        [id]="'mf-' + field.field_key"
                        [(ngModel)]="userFilledFields[field.field_key]" />
                    }
                    @case ('boolean') {
                      <label class="checkbox-inline">
                        <input
                          type="checkbox"
                          [id]="'mf-' + field.field_key"
                          [(ngModel)]="userFilledFields[field.field_key]" />
                        <span>Yes</span>
                      </label>
                    }
                    @case ('number') {
                      <input
                        type="number"
                        class="text-input"
                        [id]="'mf-' + field.field_key"
                        [(ngModel)]="userFilledFields[field.field_key]" />
                    }
                    @default {
                      <input
                        type="text"
                        class="text-input"
                        [id]="'mf-' + field.field_key"
                        [placeholder]="field.prompt_hint || ''"
                        [(ngModel)]="userFilledFields[field.field_key]" />
                    }
                  }
                </div>
              }
              <button
                type="button"
                class="apply-btn"
                (click)="submitMissingFields()"
                [disabled]="!canSubmitMissingFields || isGenerating">
                {{ isGenerating ? 'Generating…' : 'Merge & generate draft' }}
              </button>
            </div>
          }

          @if (!showMissingFieldsStep) {
          <!-- Scope of Work Upload (Required) -->
          <div class="form-section">
            <label class="form-label">
              What are your objectives for this SOW? Share your scope of work <span class="required">(required)</span>
            </label>
            <p class="helper-text">
              Supported formats: .doc, .docx, .pdf, .pptx, .xlsx (max 1 file).
            </p>
            <app-file-upload
              #scopeOfWorkUpload
              [accept]="'.doc,.docx,.pdf,.pptx,.xlsx'"
              [label]="'Upload proposal or RFP workbook'"
              [required]="false"
              (fileSelected)="onScopeOfWorkSelected($event)"
              (fileRemoved)="onScopeOfWorkRemoved()">
            </app-file-upload>
            @if (scopeOfWorkUploadError) {
              <p class="upload-error-message">Unsupported file format. Please upload only: .doc, .docx, .pdf, .pptx, or .xlsx files.</p>
            }
          </div>

          <!-- Supporting Documents Upload (Optional) -->
          <div class="form-section">
            <label class="form-label">
              Do you have any supporting documents (e.g., previous SOWs)
            </label>
            <p class="helper-text">
              Supported formats: .doc, .docx, .pdf, .pptx
            </p>
            <app-file-upload
              #supportingDocUpload
              [accept]="'.doc,.docx,.pdf,.pptx'"
              [label]="'Upload supporting document'"
              [required]="false"
              (fileSelected)="onSupportingDocSelected($event)"
              (fileRemoved)="onSupportingDocRemoved()">
            </app-file-upload>
            @if (supportingDocUploadError) {
              <p class="upload-error-message">Unsupported file format. Please upload only: .doc, .docx, .pdf, or .pptx files.</p>
            }
          </div>

          <!-- PRID -->
          <div class="form-section">
            <label class="form-label">
              Provide your client's Party Reference ID (PRID) <span class="required">(required)</span>
            </label>
            <input type="text" class="text-input" [(ngModel)]="prid" placeholder="PRID" />
          </div>

          <!-- Flex ID -->
          <div class="form-section">
            <label class="form-label">
              Provide your Flex ID <span class="required">(required)</span>
            </label>
            <input type="text" class="text-input" [(ngModel)]="flexId" placeholder="Flex ID" />
          </div>

          <!-- Template Selection -->
          <div class="form-section">
            <label class="form-label">
              Select which template you would like to use
            </label>
            <p class="helper-text">
              Supported formats: .doc, .docx, .pdf, .pptx
            </p>
            <app-file-upload
              #sowTemplateUpload
              [accept]="'.doc,.docx,.pdf,.pptx'"
              [label]="'Upload SOW template'"
              [required]="false"
              (fileSelected)="onSowTemplateSelected($event)"
              (fileRemoved)="onSowTemplateRemoved()">
            </app-file-upload>
            @if (sowTemplateUploadError) {
              <p class="upload-error-message">Unsupported file format. Please upload only: .doc, .docx, .pdf, or .pptx files.</p>
            }
            <div class="or-divider">OR</div>
            <label class="toggle-item">
              <input type="checkbox" [(ngModel)]="lookupInIcertis" />
              <div class="toggle-switch">
                <span class="toggle-indicator"></span>
                <span class="toggle-label">Lookup in Icertis</span>
              </div>
            </label>
          </div>

            <button
              class="apply-btn"
              type="button"
              (click)="generate()"
              [disabled]="!canGenerate || isGenerating">
              @if (isGenerating) {
                <span class="generate-spinner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 7v5l3 3"></path>
                  </svg>
                </span>
              }
              <span>{{ isGenerating ? 'Generating...' : 'Generate draft contract' }}</span>
            </button>
          }

          <!-- Error / ticket message -->
          @if (generatedContent) {
            <div class="generation-output">
              <div class="assistant-message" [innerHTML]="generatedContent"></div>
            </div>
          }

          <!-- Draft result -->
          @if (sowDraftVersions.length > 0) {
            <div class="draft-result">
              @if (sowDraftVersions.length > 1) {
                <div class="sow-version-tabs" role="tablist" aria-label="Draft versions">
                  @for (_v of sowDraftVersions; track $index) {
                    <button
                      type="button"
                      class="sow-version-tab"
                      role="tab"
                      [attr.aria-selected]="selectedSowVersionIndex === $index"
                      [class.sow-version-tab--active]="selectedSowVersionIndex === $index"
                      (click)="selectSowVersion($index)">
                      Version {{ $index + 1 }}
                    </button>
                  }
                </div>
              }
              @if (!isViewingLatestSowVersion()) {
                <p class="sow-version-banner">
                  Viewing <strong>Version {{ selectedSowVersionIndex + 1 }}</strong>. Switch to the latest version to
                  edit fields or regenerate.
                </p>
              }
              <div class="draft-result-toolbar">
                <button
                  type="button"
                  class="apply-btn secondary-btn"
                  (click)="showExtractedSummary = !showExtractedSummary">
                  {{ showExtractedSummary ? 'Hide extracted fields' : 'Show extracted fields' }}
                </button>
                <button
                  type="button"
                  class="apply-btn"
                  (click)="generateSowInChat()"
                  [disabled]="!draftMarkdown?.trim()">
                  Generate SOW in chat
                </button>
              </div>
              <p class="draft-result-hint">
                After you regenerate, earlier drafts stay as Version 1, 2, … Use the tabs to compare. Edits apply to
                the latest version only. <strong>Generate SOW in chat</strong> sends the version you are viewing to the
                main chat (same bridge as guided Thought Leadership handoff).
              </p>
              @if (showExtractedSummary) {
                <div class="extracted-summary">
                  @if (extractedFieldEntries().length > 0) {
                    <div class="extracted-summary-actions">
                      @if (isViewingLatestSowVersion()) {
                        @if (!editingExtractedFields) {
                          <button type="button" class="link-edit-fields" (click)="startEditingExtractedFields()">
                            Edit extracted fields
                          </button>
                        } @else {
                          <button type="button" class="link-edit-fields" (click)="cancelEditingExtractedFields()">
                            Cancel edit
                          </button>
                          <button
                            type="button"
                            class="apply-btn apply-extracted-regenerate"
                            (click)="applyExtractedEditsAndRegenerate()"
                            [disabled]="isGenerating">
                            {{ isGenerating ? 'Regenerating…' : 'Apply changes & regenerate draft' }}
                          </button>
                        }
                      }
                    </div>
                  }
                  @if (!editingExtractedFields) {
                    @for (entry of extractedFieldEntries(); track entry.key) {
                      <div class="extracted-row">
                        <span class="extracted-key">{{ entry.key }}</span>
                        <span class="extracted-val">{{ entry.value | json }}</span>
                      </div>
                    }
                  } @else {
                    @for (entry of extractedFieldEntries(); track entry.key) {
                      <div class="extracted-row extracted-row--edit">
                        <label class="extracted-key" [attr.for]="'ext-' + entry.key">{{ entry.key }}</label>
                        <textarea
                          class="text-input extracted-edit-input"
                          rows="2"
                          [id]="'ext-' + entry.key"
                          [name]="'ext-' + entry.key"
                          [ngModel]="editableExtractedStrings[entry.key]"
                          (ngModelChange)="onEditableExtractedChange(entry.key, $event)"
                        ></textarea>
                      </div>
                    }
                  }
                </div>
              }
              @if (showRegeneratingPlaceholder()) {
                <div class="draft-regenerating-placeholder" aria-live="polite">
                  <p>Regenerating draft…</p>
                  <p class="draft-regenerating-sub">
                    Version {{ sowDraftVersions.length }} is kept above; the new response will open as Version
                    {{ sowDraftVersions.length + 1 }}.
                  </p>
                </div>
              } @else if (draftHtmlSafe) {
                <div class="draft-markdown-body" [innerHTML]="draftHtmlSafe"></div>
              }
              @if (showCreateRequestButton) {
                <div class="draft-followup-actions">
                  <button type="button" class="apply-btn secondary-btn" (click)="openRequestForm()">
                    Create Phoenix request
                  </button>
                </div>
              }
            </div>
          }

          @if (showRequestForm) {
            <app-ddc-request-form
              (ticketCreated)="onTicketCreated($event)"
              (close)="showRequestForm = false">
            </app-ddc-request-form>
          }
        </div>

        @if (isGenerating) {
          <div class="loading-overlay">
            <div class="loading-spinner">
              <div class="spinner-ring"></div>
              <p class="loading-text">Processing <span class="loading-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></p>
            </div>
          </div>
        }
      </div>
    </div>
  </div>
}
