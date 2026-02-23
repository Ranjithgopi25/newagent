@if (isOpen) {
  <div class="flow-backdrop">
    <div class="flow-container" (click)="$event.stopPropagation()">
      <div class="flow-header">
        <h2 class="flow-title">Refine drafts</h2>
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
          <h3 class="panel-title">Great! To get started, can you help me understand your objectives?</h3>
          <!-- File Upload Section -->
          <div class="upload-item">
            <label class="form-label">
              What document would you like to refine?<span class="required">(required)</span>
            </label>
            <p class="helper-text">
              Supported formats: .doc, .docx, .pdf, .txt
            </p>
            <app-file-upload
              #documentUpload
              accept=".pdf,.docx,.txt,.doc"
              label="Upload document"
              (fileSelected)="onFileSelected($event)"
              (fileRemoved)="onDocumentRemoved()">
            </app-file-upload>
            @if (documentUploadError) {
              <p class="upload-error-message">Unsupported file format. Please upload only: .doc, .docx, .pdf, or .txt files.</p>
            }
          </div>
          <!-- Service Selection -->
          <div class="form-section" style="margin-top: 20px;">
            <label class="section-label">
              Please select the services I can help you with for refining content
            </label>
            <div class="services-checklist">
              <!-- Expand or Compress Content -->
              <label class="toggle-item">
                <input
                  type="checkbox"
                  [(ngModel)]="expandCompressContent"
                  (ngModelChange)="onServiceToggle('expand-compress')"
                  [disabled]="!isDocumentUploaded"
                  id="expandCompressContent">
                  <span class="toggle-switch">
                    <span class="toggle-indicator"></span>
                    <span class="toggle-label">Expand or compress content</span>
                  </span>
                </label>
                <!-- Conditional Word Limit for Expand/Compress -->
                @if (expandCompressContent) {
                  <div class="conditional-field">
                    <label class="form-label">
                      What's the word limit you'd like me to stay within<span class="required">(required)</span>
                    </label>
                    <div class="word-limit-slider-container" [style.--slider-fill]="wordLimitSliderBackground" style="position: relative;">
                      <input
                        type="range"
                        class="word-count-slider"
                        [(ngModel)]="wordLimitExpandCompress"
                        (ngModelChange)="onWordLimitChange()"
                        min="50"
                        [max]="maxWordLimitExpandCompress"
                        required>
                        <div class="word-limit-display" style="position: relative; text-align: center; width: 100%;">
                          <span class="word-limit-value">{{ wordLimitExpandCompress }}</span>
                          <span class="word-limit-label">words</span>
                          <div class="word-limit-input-box">
                            <input
                              type="number"
                              class="text-input word-limit-input"
                              min="50"
                              [max]="maxWordLimitExpandCompress"
                              [value]="wordLimitExpandCompress"
                              maxlength="4"
                              (change)="onWordLimitTextboxChange($event.target.value)"
                              placeholder="0000" />
                          </div>
                        </div>
                      </div>
                      <div class="slider-bounds">
                        <span class="bound-label">Min: 50</span>
                        <span class="bound-label">Max: {{ maxWordLimitExpandCompress }}</span>
                      </div>
                      
                      @if (showExpandSupportBanner) {
                        <div class="form-section required-section" style="margin-top:12px;">
                          <label class="form-label">
                            Upload supporting documents
                            <!-- @if (expandSupportingDocsVisible) {
                                <span class="required"></span>
                              } -->
                          </label>
                          <p class="helper-text">
                            Supported formats: .doc, .docx, .pdf, .pptx, .txt
                            <span class="helper-info">(Max {{MAX_SUPPORTING_DOCS}} files)</span>
                          </p>
                          
                          <!-- Hidden file input for multiple files -->
                          <input 
                            #expandSupportingDocsInput
                            type="file" 
                            multiple
                            accept=".txt,.doc,.docx,.pdf,.pptx"
                            (change)="onExpandSupportingDocsFilesChange($event)"
                            style="display: none;">
                          
                          <!-- Custom upload button -->
                          <button 
                            class="upload-btn"
                            (click)="expandSupportingDocsInput.click()"
                            [disabled]="expandSupportingDocFiles.length >= MAX_SUPPORTING_DOCS"
                            type="button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              <polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span class="upload-text">Upload supporting documents</span>
                          </button>
                          
                          <!-- Uploaded files list -->
                          @if (expandSupportingDocFiles.length > 0) {
                            <div class="uploaded-files-list">
                              @for (file of expandSupportingDocFiles; track file.name; let i = $index) {
                                <div class="uploaded-file-item">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="file-icon">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" stroke-width="1.25"/>
                                  </svg>
                                  <span class="file-name">{{ file.name }}</span>
                                  <button class="remove-file-btn" (click)="removeExpandSupportingDocAtIndex(i)" aria-label="Remove file">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                  </button>
                                </div>
                              }
                            </div>
                          }
                          
                          <!-- Error messages -->
                          @if (supportingDocsFileLimitError) {
                            <div class="error-msg" style="margin-top:8px;">
                              You can upload a maximum of {{ MAX_SUPPORTING_DOCS }} files.
                            </div>
                          }
                          @if (supportingDocsTokenError) {
                            <div class="error-msg" style="margin-top:8px;">
                              Total content exceeds {{ MAX_TOKEN_LIMIT }} tokens. Last file was removed.
                            </div>
                          }
                          @if (expandSupportingDocFiles.length > 0) {
                          <!-- Added: Specific instructions textbox -->
                              <br><div class="upload-instructions">
                              <label class="form-label">
                              What components of the uploaded document would you like to use?
                              </label>
                              <textarea
                              class="text-input"
                              rows="3"
                              [(ngModel)]="expandGuidelines"
                              name="expandGuidelines"
                              placeholder="e.g., focus on sections 2-4; prioritize figures; ignore appendix">
                            </textarea>
                           </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  <!-- Adjust for Audience / Tone -->
                  <label class="toggle-item">
                    <input
                      type="checkbox"
                      [(ngModel)]="adjustAudienceTone"
                      (ngModelChange)="onServiceToggle('audience-tone')"
                      [disabled]="!isDocumentUploaded"
                      id="adjustAudienceTone">
                      <span class="toggle-switch">
                        <span class="toggle-indicator"></span>
                        <span class="toggle-label">Adjust for audience / tone</span>
                      </span>
                    </label>
                    <!-- Conditional Audience/Tone Input -->
                    @if (adjustAudienceTone) {
                      <div class="conditional-field">
                        <label class="form-label">
                          Please let me know which audience / tone you want for this content<span class="required">(required)</span>
                        </label>
                        <input
                          type="text"
                          class="text-input"
                          [(ngModel)]="audienceToneInput"
                          required
                          placeholder="e.g. executive, technical, conversational">
                      </div>
                    }
                      <!-- Provide Suggestions on Improving Content -->
                      <label class="toggle-item">
                        <input
                          type="checkbox"
                          [(ngModel)]="provideSuggestions"
                          (ngModelChange)="onServiceToggle('suggestions')"
                          [disabled]="!isDocumentUploaded"
                          id="provideSuggestions">
                          <span class="toggle-switch">
                            <span class="toggle-indicator"></span>
                            <span class="toggle-label">Provide suggestions on improving content</span>
                          </span>
                        </label>
                        <!-- Enhance with Additional Research -->
                        <label class="toggle-item">
                          <input
                            type="checkbox"
                            [(ngModel)]="enhanceResearch"
                            (ngModelChange)="onServiceToggle('research')"
                            [disabled]="!isDocumentUploaded"
                            id="enhanceResearch">
                            <span class="toggle-switch">
                              <span class="toggle-indicator"></span>
                              <span class="toggle-label">Enhance with additional research</span>
                            </span>
                          </label>
                          <!-- Conditional Research Options -->
                          @if (enhanceResearch) {
                            <div class="conditional-field research-options">
                              <!-- Research Topics -->
                              <label class="form-label">
                                What research areas or topics would you like me to explore in depth?<span class="required">(required)</span>
                              </label>
                              <textarea
                                class="text-input textarea-input"
                                [(ngModel)]="researchTopics"
                                name="researchTopics"
                                required
                                rows="3"
                                placeholder="Required Text">
                              </textarea>
                                <!-- Word Limit (only show if Expand/Compress is not enabled) -->
                                <!-- @if (!expandCompressContent) {
                                  <div>
                                    <label class="form-label" style="margin-top: 16px;">
                                      What's the word limit you'd like me to stay within
                                    </label>
                                    <input
                                      type="text"
                                      class="text-input"
                                      [(ngModel)]="wordLimitResearch"
                                      [placeholder]="'Text (Default to ' + uploadedFileWordCount + ' word count here)'">
                                    </div>
                                  }
                                  Additional Guidelines
                                  <div style="margin-top: 16px;">
                                    <label class="form-label">
                                      Are there any additional guidelines you'd like me to keep in mind as I conduct this research?
                                    </label>
                                    <textarea
                                      class="text-input"
                                      rows="3"
                                      [(ngModel)]="researchGuidelines"
                                      name="researchGuidelines"
                                      placeholder="e.g., focus on recent trends; include statistical data; avoid technical jargon">
                                    </textarea>
                                  </div>
                                  <!-- Research Sources -->
                                  <label class="form-label" style="margin-top: 16px;">
                                    Which sources would you like me to leverage?
                                  </label>
                                  <div class="research-sources-grid">
                                    <!-- PwC Content or Link -->
                                    <label class="toggle-item compact">
                                      <input
                                        type="checkbox"
                                        [(ngModel)]="pwcContentLink"
                                        id="pwcContentLink">
                                        <span class="toggle-switch">
                                          <span class="toggle-indicator"></span>
                                          <span class="toggle-label">Uploaded content or link</span>
                                        </span>
                                      </label>
                                      <!-- PwC Proprietary Research -->
                                      <label class="toggle-item compact">
                                        <input
                                          type="checkbox"
                                          [(ngModel)]="pwcProprietaryResearch"
                                          id="pwcProprietaryResearch">
                                          <span class="toggle-switch">
                                            <span class="toggle-indicator"></span>
                                            <span class="toggle-label">PwC proprietary research</span>
                                          </span>
                                        </label>
                                        <!-- PwC Licensed Third Party Tools -->
                                        <label class="toggle-item compact">
                                          <input
                                            type="checkbox"
                                            [(ngModel)]="pwcLicensedThirdParty"
                                            id="pwcLicensedThirdParty">
                                            <span class="toggle-switch">
                                              <span class="toggle-indicator"></span>
                                              <span class="toggle-label">PwC licensed third party tools</span>
                                            </span>
                                          </label>
                                          <!-- External Research -->
                                          <label class="toggle-item compact">
                                            <input
                                              type="checkbox"
                                              [(ngModel)]="externalResearch"
                                              id="externalResearch">
                                              <span class="toggle-switch">
                                                <span class="toggle-indicator"></span>
                                                <span class="toggle-label">External research</span>
                                              </span>
                                            </label>
                                          </div>
                                          <!-- Upload Supporting Documents (appears when PwC Content/Link is selected) -->
                                          @if (pwcContentLink) {
                                            <div style="margin-top: 16px;">
                                              <label class="form-label">Upload supporting documents for research</label>
                                              <p class="helper-text">
                                Supported formats: .doc, .docx, .pdf, .pptx, .txt (Max 5 files)
                              </p>
                              
                              <!-- Hidden file input for multiple files -->
                              <input 
                                #researchDocsInput
                                type="file" 
                                multiple
                                accept=".pdf,.docx,.txt,.pptx,.doc"
                                (change)="onResearchDocumentsFilesChange($event)"
                                style="display: none;">
                              
                              <!-- Custom upload button -->
                              <button 
                                class="upload-btn"
                                type="button"
                                (click)="researchDocsInput.click()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="17 8 12 3 7 8"></polyline>
                                  <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Upload supporting document(s)
                              </button>
                                              
                                              <!-- Uploaded files list -->
                                              @if (researchDocumentFiles.length > 0) {
                                                <div class="uploaded-files-list">
                                                  @for (file of researchDocumentFiles; track file.name; let i = $index) {
                                                    <div class="uploaded-file-item">
                                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                        <polyline points="14 2 14 8 20 8"></polyline>
                                                      </svg>
                                                      <span class="file-name">{{ file.name }}</span>
                                                      <button 
                                                        type="button" 
                                                        class="remove-file-btn" 
                                                        (click)="removeResearchDocAtIndex(i)"
                                                        title="Remove file">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                          <path d="M18 6L6 18M6 6l12 12"></path>
                                                        </svg>
                                                      </button>
                                                    </div>
                                                  }
                                                </div>
                                              }
                                              
                                              <!-- Error messages -->
                                              @if (researchDocsFileLimitError) {
                                                <div class="error-msg" style="margin-top:8px;">
                                                  You can upload a maximum of {{ MAX_RESEARCH_DOCS }} files.
                                                </div>
                                              }
                                              @if (researchDocsTokenError) {
                                                <div class="error-msg" style="margin-top:8px;">
                                                  Total content exceeds {{ MAX_RESEARCH_TOKEN_LIMIT }} tokens. Last file was removed.
                                                </div>
                                              }
                                            </div>
                                            <!-- Added: Specific instructions textbox -->
                                              <div class="upload-instructions">
                                                <label class="form-label">
                                                  Are there any specific instructions to use this document?
                                                </label>
                                                <textarea
                                                  class="text-input"
                                                  rows="3"
                                                  [(ngModel)]="researchDocInstructions"
                                                  name="researchDocInstructions"
                                                  placeholder="e.g., focus on sections 2-4; prioritize figures; ignore appendix">
                                                </textarea>
                                              </div>
                                            <!-- OR Divider -->
                                            <div class="or-divider">OR</div>
                                            <!-- Research Links -->
                                            <div style="margin-top: 16px;">
                                              <label class="form-label">
                                                Are there specific links you'd like me to use for the research? (If providing multiple links, please separate them with commas)
                                              </label>
                                              <textarea
                                                type="text"
                                                class="text-input"
                                                [(ngModel)]="researchLinks"
                                                placeholder="https://example.com/article-1, https://example.com/article-2"
                                                #linkField="ngModel">
                                              </textarea>
                                                <!--@if (linkField.touched && invalidLinks) {-->
                                                  @if ((linkField.dirty || linkField.touched) && !!linkField.value?.trim()?.length && !invalidLinks) {
                                                    <div class="error-msg">
                                                      One or more links are invalid. Each link must start with http:// or https://
                                                    </div>
                                                  }
                                                  @if (pwcContentLink && researchTopics && !researchLinks) {
                                                    <div
                                                      class="error-msg">
                                                      Please upload a document or enter a research link to continue.
                                                    </div>
                                                  }
                                            </div>
                                          }
                                            <!-- PwC Source Selection (appears only if PwC sources are selected) -->
                                            @if (showPwcSourceSelection) {
                                              <div style="margin-top: 16px;">
                                                <!-- <label class="checkbox-item">
                                                  <input
                                                    type="checkbox"
                                                    [(ngModel)]="selectSpecificPwcSources"
                                                    id="selectSpecificPwcSources">
                                                    <span class="checkbox-label">Would you like to select specific PwC sources?</span>
                                                  </label> -->
                                                  <!-- PwC Source Selection (Conditional) -->
                                                  @if (showPwcSourceSelection) {
                                                  <div class="conditional-field pwc-sources">
                                                  <!-- PwC Proprietary Research Sources -->
                                                    @if (selectSpecificPwcSources && pwcProprietaryResearch) {
                                                      <div class="source-section">
                                                        <div class="source-title">PwC proprietary research</div>
                                                      <!-- All PwC Proprietary Checkbox -->
                                                      <label class="checkbox-item">
                                                        <input
                                                          type="checkbox"
                                                          [(ngModel)]="allPwcProprietarySources"
                                                          (ngModelChange)="onAllPwcProprietaryToggle($event)"
                                                          name="allPwcProprietarySources">
                                                          <span class="checkbox-label">All PwC proprietary sources</span>
                                                        </label>
                                                        <!-- Individual PwC Sources (3x6 Grid with scroll) -->
                                                        <div class="source-grid source-grid-extended">
                                                          @for (source of pwcProprietarySources; track source; let i = $index) {
                                                            <label class="toggle-item source-toggle">
                                                              <input
                                                                type="checkbox"
                                                                [(ngModel)]="source.selected"
                                                                (ngModelChange)="onPwcProprietarySourceChange()"
                                                                [name]="'pwcSource' + i">
                                                                <span class="toggle-switch">
                                                                  <span class="toggle-indicator"></span>
                                                                  <span class="toggle-label-sources">{{ source.name }}</span>
                                                                </span>
                                                              </label>
                                                            }
                                                          </div>
                                                        </div>
                                                      }
                                                      <!-- PwC Third Party Tools -->
                                                      @if (selectSpecificPwcSources && pwcLicensedThirdParty) {
                                                        <div class="source-section">
                                                          <div class="source-title">PwC third party tools</div>
                                                          <!-- All PwC Third Party Checkbox -->
                                                          <label class="checkbox-item">
                                                            <input
                                                              type="checkbox"
                                                              [(ngModel)]="allPwcThirdPartySources"
                                                              (ngModelChange)="onAllPwcThirdPartyToggle($event)"
                                                              name="allPwcThirdPartySources">
                                                              <span class="checkbox-label">All PwC third party sources</span>
                                                            </label>
                                                            <!-- Individual Third Party Sources (2x2 Grid) -->
                                                            <div class="source-grid source-grid-extended">
                                                              @for (source of pwcThirdPartySources; track source; let i = $index) {
                                                                <label class="toggle-item source-toggle">
                                                                  <input
                                                                    type="checkbox"
                                                                    [(ngModel)]="source.selected"
                                                                    (ngModelChange)="onPwcThirdPartySourceChange()"
                                                                    [name]="'pwcThirdPartySource' + i">
                                                                    <span class="toggle-switch">
                                                                      <span class="toggle-indicator"></span>
                                                                      <span class="toggle-label-sources">{{ source.name }}</span>
                                                                    </span>
                                                                  </label>
                                                                }
                                                              </div>
                                                            </div>
                                                          }
                                                        </div>
                                                      }
                                                      </div>
                                                      }
                                                    </div>
                                                  }
                                                  <!-- Edit Content -->
                                                  <label class="toggle-item">
                                                    <input
                                                      type="checkbox"
                                                      [(ngModel)]="editContent"
                                                      (ngModelChange)="onServiceToggle('edit-content')"
                                                      [disabled]="!isDocumentUploaded"
                                                      id="editContent">
                                                      <span class="toggle-switch">
                                                        <span class="toggle-indicator"></span>
                                                        <span class="toggle-label">Edit content</span>
                                                      </span>
                                                    </label>
                                                    <!-- Conditional Editor Type Selection -->
                                                    @if (editContent) {
                                                      <div class="conditional-field editor-options">
                                                        <label class="form-label">Choose the editing service(s) to apply</label>
                                                        <div class="editor-checklist">
                                                          <!-- Development Editor -->
                                                          <label class="editor-toggle-item">
                                                            <input
                                                              type="checkbox"
                                                              [(ngModel)]="developmentEditor"
                                                              id="developmentEditor">
                                                              <span class="editor-toggle-switch">
                                                                <span class="editor-toggle-indicator"></span>
                                                                <div class="editor-content">
                                                                  <span class="editor-title">Development editor</span>
                                                                  <span class="editor-description">Reviews and restructures content for alignment and coherence</span>
                                                                </div>
                                                              </span>
                                                            </label>
                                                            <!-- Content Editor -->
                                                            <label class="editor-toggle-item">
                                                              <input
                                                                type="checkbox"
                                                                [(ngModel)]="contentEditor"
                                                                id="contentEditor">
                                                                <span class="editor-toggle-switch">
                                                                  <span class="editor-toggle-indicator"></span>
                                                                  <div class="editor-content">
                                                                    <span class="editor-title">Content editor</span>
                                                                    <span class="editor-description">Refines language to align with author's key objectives</span>
                                                                  </div>
                                                                </span>
                                                              </label>
                                                              <!-- Line Editor -->
                                                              <label class="editor-toggle-item">
                                                                <input
                                                                  type="checkbox"
                                                                  [(ngModel)]="lineEditor"
                                                                  id="lineEditor">
                                                                  <span class="editor-toggle-switch">
                                                                    <span class="editor-toggle-indicator"></span>
                                                                    <div class="editor-content">
                                                                      <span class="editor-title">Line editor</span>
                                                                      <span class="editor-description">Improves sentence flow, readability and style preserving voice</span>
                                                                    </div>
                                                                  </span>
                                                                </label>
                                                                <!-- Copy Editor -->
                                                                <label class="editor-toggle-item">
                                                                  <input
                                                                    type="checkbox"
                                                                    [(ngModel)]="copyEditor"
                                                                    id="copyEditor">
                                                                    <span class="editor-toggle-switch">
                                                                      <span class="editor-toggle-indicator"></span>
                                                                      <div class="editor-content">
                                                                        <span class="editor-title">Copy editor</span>
                                                                        <span class="editor-description">Corrects grammar, punctuation and typos</span>
                                                                      </div>
                                                                    </span>
                                                                  </label>
                                                                  <!-- PwC Brand Alignment Editor (Disabled, Always ON) -->
                                                                  <label class="editor-toggle-item disabled">
                                                                    <input
                                                                      type="checkbox"
                                                                      [checked]="true"
                                                                      id="pwcBrandEditor"
                                                                      disabled>
                                                                      <span class="editor-toggle-switch disabled">
                                                                        <span class="editor-toggle-indicator"></span>
                                                                        <div class="editor-content">
                                                                          <span class="editor-title">PwC brand alignment editor</span>
                                                                          <span class="editor-description">Aligns content writing standards with PwC brand</span>
                                                                        </div>
                                                                      </span>
                                                                    </label>
                                                                  </div>
                                                                </div>
                                                              }
                                                            </div>
                                                          </div>
                                                          <!-- Generate Button -->
                                                          <button
                                                            class="apply-btn"
                                                            (click)="refineContent()"
                                                            [disabled]="!canRefine || isGenerating">
                                                            @if (isGenerating) {
                                                              <span class="generate-spinner">
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                                  <circle cx="12" cy="12" r="9"></circle>
                                                                  <path d="M12 7v5l3 3"></path>
                                                                </svg>
                                                              </span>
                                                            }
                                                            <span>{{ isGenerating ? 'Refining...' : 'Refine drafts' }}</span>
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  }
