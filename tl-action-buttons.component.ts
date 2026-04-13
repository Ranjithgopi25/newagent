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
          <!-- Contract type -->
          <div class="form-section">
            <label class="form-label">Contract type <span class="required">(required)</span></label>
            <div class="contract-type-group" role="radiogroup" aria-label="Contract type">
              @for (opt of contractTypeOptions; track opt.key) {
                <label class="contract-type-option">
                  <input
                    type="radio"
                    name="contractType"
                    [(ngModel)]="selectedContractTypeKey"
                    [value]="opt.key" />
                  <span>{{ opt.label }}</span>
                </label>
              }
            </div>
          </div>

          <!-- Scope of Work Upload (Required) -->
          <div class="form-section">
            <label class="form-label">
              Could you share your scope of work? <span class="required">(required)</span>
            </label>
            <p class="helper-text">
              Supported formats: .doc, .docx, .pdf, .pptx, .xlsx (Max 1 file)
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
          @if (draftHtmlSafe) {
            <div class="draft-result">
              <div class="draft-result-toolbar">
                <button
                  type="button"
                  class="apply-btn secondary-btn"
                  (click)="showExtractedSummary = !showExtractedSummary">
                  {{ showExtractedSummary ? 'Hide' : 'Show' }} extracted fields summary
                </button>
                <button
                  type="button"
                  class="apply-btn"
                  (click)="exportDraftWord()"
                  [disabled]="isExportingWord || !draftMarkdown">
                  {{ isExportingWord ? 'Exporting…' : 'Export to Word' }}
                </button>
              </div>
              @if (showExtractedSummary) {
                <div class="extracted-summary">
                  @for (entry of extractedFieldEntries(); track entry.key) {
                    <div class="extracted-row">
                      <span class="extracted-key">{{ entry.key }}</span>
                      <span class="extracted-val">{{ entry.value | json }}</span>
                    </div>
                  }
                </div>
              }
              <div class="draft-markdown-body" [innerHTML]="draftHtmlSafe"></div>
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
