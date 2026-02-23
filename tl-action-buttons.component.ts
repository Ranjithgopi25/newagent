
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Subject, Subscription, takeUntil, Observable } from 'rxjs';
import { TlFlowService } from '../../../core/services/tl-flow.service';
import { ChatService } from '../../../core/services/chat.service';
import { AuthFetchService } from '../../../core/services/auth-fetch.service';
import { FileUploadComponent } from '../../../shared/ui/components/file-upload/file-upload.component';
import { environment } from '../../../../environments/environment';
import { toSnakeCase } from '../../../core/utils/string.utils';
import { ThoughtLeadershipMetadata } from '../../../core/models';

type RefineEditorType = 'development+content' | 'line+copy' | 'brand-alignment';

const REFINE_EDITOR_ORDER: RefineEditorType[] = ['development+content', 'line+copy', 'brand-alignment'];

function normalizeRefineEditorOrder(editorIds: string[]): string[] {
  const normalized = [...editorIds];
  if (!normalized.includes('brand-alignment')) normalized.push('brand-alignment');
  return REFINE_EDITOR_ORDER.filter((id) => normalized.includes(id));
}

@Component({
    selector: 'app-refine-content-flow',
    imports: [FormsModule, FileUploadComponent, MatSelectModule, MatOptionModule, MatFormFieldModule],
    templateUrl: './refine-content-flow.component.html',
    styleUrls: ['./refine-content-flow.component.scss']
})
export class RefineContentFlowComponent implements OnInit, OnDestroy {
  @Output() contentGenerated = new EventEmitter<string>();
  @Output() streamToChat = new EventEmitter<{userMessage: string, streamObservable: any, fileName?: string, metadata?: ThoughtLeadershipMetadata}>();
  isGenerating = false;
  refinedContent = '';
  refinedTitle = '';
  refinedContentBody = '';
  
  // File upload
  uploadedFile: File | null = null;
  uploadedFileWordCount = 'uploaded content';
  documentUploadError = false;
  
  // Service toggles - all ON by default
  expandCompressContent = false;
  adjustAudienceTone = false;
  enhanceResearch = false;
  editContent = false;
  provideSuggestions = false;
  expandGuidelines = '';
  
  // Edit Content: 3-card UI (development+content, line+copy, brand-alignment)
  selectedEditorTypes: RefineEditorType[] = ['development+content', 'line+copy', 'brand-alignment'];
  editorTypes: { id: RefineEditorType; name: string; icon: string; description: string; details: string; disabled: boolean }[] = [
    {
      id: 'development+content',
      name: 'Strengthen content structure and key messaging (clarify positioning, flow, and key points)',
      icon: '🚀',
      description: 'Development and Content editors run together, then combined into one result',
      details: 'Development: structure, narrative, POV. Content: MECE, citations, logic. Same-sentence merge of rules and impact.',
      disabled: false
    },
    {
      id: 'line+copy',
      name: 'Copyedit (smooth phrasing, grammar, and consistency)',
      icon: '📝',
      description: 'Line and Copy editors run together, then combined into one result',
      details: 'Line: flow, readability, style. Copy: grammar, punctuation, typos. Same-sentence merge of rules and impact.',
      disabled: false
    },
    {
      id: 'brand-alignment',
      name: 'Align to PwC brand standards (tone, terminology, and formatting)',
      icon: '🎯',
      description: 'Aligns content writing standards with PwC brand',
      details: 'Checks: we/you language, contractions, active voice, prohibited words (catalyst, PwC Network), China references, brand messaging',
      disabled: true
    }
  ];

  // Enhance Research sub-options - sources ON by default
  researchTopics = '';
  researchGuidelines = '';
  pwcContentLink = true;
  pwcProprietaryResearch = true;
  pwcLicensedThirdParty = true;
  externalResearch = true;
  researchDocumentFile: File | null = null;
  researchDocInstructions = '';
  researchLinks = '';
  
  // Multi-file support for research documents
  researchDocumentFiles: File[] = [];
  readonly MAX_RESEARCH_DOCS = 5;
  readonly MAX_RESEARCH_TOKEN_LIMIT = 50000;
  researchDocsTokenError = false;
  researchDocsFileLimitError = false;
  selectSpecificPwcSources = false;
  allPwcProprietarySources = false;
  pwcSource1 = false;
  pwcSource2 = false;
  pwcSource3 = false;
  pwcSource4 = false;
  allPwcThirdPartySources = false;
  pwcThirdPartySource1 = false;
  pwcThirdPartySource2 = false;
  pwcThirdPartySource3 = false;
  pwcThirdPartySource4 = false;
  
pwcProprietarySources = [
    { name: 'PwC industry edge', selected: true },
    { name: 'PwC.com', selected: true },
    { name: 'PwC insights', selected: true },
    { name: 's+b journal', selected: true },
    { name: 'Executive leadership hub', selected: true },
    { name: 'The exchange', selected: true },
    { name: 'PwC connected source', selected: true },
    { name: 'PwC benchmarking', selected: true },
    //{ name: 'Insights Factory', selected: true },
    //{ name: 'PwC Intelligence', selected: true },
    //{ name: 'C-Suite Connection Program', selected: true },
    //{ name: 'Viewpoint', selected: true },
    //{ name: 'Analyst and Advisor Relations', selected: true },
    //{ name: 'Assurance Benchmarking Tools', selected: true },
    //{ name: 'Policy on Demand', selected: true },
    //{ name: 'Tax Source', selected: true },
    //{ name: 'FFG Benchmarking', selected: true },
    //{ name: 'Client Success Stories', selected: true },
    //{ name: 'Inside Industries', selected: true },
    //{ name: 'Value Store', selected: true }
  ];

  pwcThirdPartySources = [
  { name: 'Factiva, WSJ, Dow Jones', selected: true },
    { name: 'S&P Global- Capital IQ Xpressfeed', selected: true },
    { name: 'IBIS World', selected: true },
    { name: 'BoardEx', selected: true },
    // { name: 'S&P Global- Connect', selected: true },
    // { name: 'Audit Analytics', selected: true },
    // { name: 'S&P Global- SNL Insurance', selected: true },
    // { name: 'Claritas', selected: true },
    // { name: 'Equifax', selected: true },
    // { name: 'Equifax IXI', selected: true },
    // { name: 'Definitive Healthcare Provider Database', selected: true },
    // { name: 'Sg2 Health Care Intelligence', selected: true },
    // //{ name: 'Strata Market Insights', selected: true },
    // //{ name: 'CompanyIQ', selected: true },
    // { name: 'Global Data(Retail)', selected: true },
    // { name: 'Technology Business Review', selected: true },
    
    // //{ name: 'IDC', selected: true },
    // { name: 'CFRA Industry Surveys', selected: true }
];

  // Conditional fields
  wordLimitExpandCompress: number = 0;
  maxWordLimitExpandCompress: number = 0;
  // Inline background style for the slider to color the left side up to the thumb
  wordLimitSliderBackground = '';
  selectedAudienceTone = '';
  audienceToneInput = '';
  wordLimitResearch = '';

  // Audience/Tone dropdown options
  audienceToneOptions = [
    'Mediagenic',
    'Professional Tone - CEO',
    'Professional Tone - CTO',
    'Professional Tone - CFO',
    'Casual Tone',
    'Others'
  ];

  private destroy$ = new Subject<void>();
  private streamSubscription?: Subscription;

  // Document upload component reference
  @ViewChild('documentUpload') documentUploadRef?: FileUploadComponent;
  
  // Supporting document for Expand/Compress when slider exceeds uploaded file word count
  @ViewChild('expandSupportingUpload', { read: ElementRef, static: false }) expandSupportingUploadRef?: ElementRef;
  expandSupportingDocFile: File | null = null;
  expandSupportingDocError: string | null = null;
  
  // Multi-file support for supporting documents
  expandSupportingDocFiles: File[] = [];
  readonly MAX_SUPPORTING_DOCS = 5;
  readonly MAX_TOKEN_LIMIT = 50000;
  supportingDocsTokenError = false;
  supportingDocsFileLimitError = false;

  constructor(
    public tlFlowService: TlFlowService,
    private chatService: ChatService,
    private authFetchService: AuthFetchService
  ) {}

  ngOnInit(): void {
    this.tlFlowService.activeFlow$
      .pipe(takeUntil(this.destroy$))
      .subscribe((flow: any) => {
        if (flow === 'refine-content') {
          // Flow opened - reset to ensure fresh state
          this.resetForm();
        }
      });
  }

  ngOnDestroy(): void {
    this.cancelStream();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cancelStream(): void {
    if (this.streamSubscription) {
      console.log('[RefineContentFlow] Cancelling active stream');
      this.streamSubscription.unsubscribe();
      this.streamSubscription = undefined;
      this.isGenerating = false;
    }
  }

  get isOpen(): boolean {
    return this.tlFlowService.currentFlow === 'refine-content';
  }

  get isDocumentUploaded(): boolean {
    return this.uploadedFile !== null;
  }

  /** Selectable editors (exclude brand-alignment which is always on) */
  get selectableEditors(): { id: RefineEditorType; name: string; icon: string; description: string; details: string; disabled: boolean }[] {
    return this.editorTypes.filter(editor => editor.id !== 'brand-alignment');
  }

  get brandAlignmentEditor(): { id: RefineEditorType; name: string; icon: string; description: string; details: string; disabled: boolean } | undefined {
    return this.editorTypes.find(editor => editor.id === 'brand-alignment');
  }

  toggleEditor(type: RefineEditorType): void {
    if (type === 'brand-alignment') return;
    const index = this.selectedEditorTypes.indexOf(type);
    if (index > -1) {
      this.selectedEditorTypes.splice(index, 1);
    } else {
      this.selectedEditorTypes.push(type);
    }
    if (!this.selectedEditorTypes.includes('brand-alignment')) {
      this.selectedEditorTypes.push('brand-alignment');
    }
  }

  isEditorSelected(type: RefineEditorType): boolean {
    return this.selectedEditorTypes.includes(type);
  }

  getEditorNameHtml(name: string): string {
    if (!name) return '';
    return `<strong>${name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>`;
  }

  /** Map selected editor types to backend display names for refine_content API */
  private getEditorNamesForBackend(): string[] {
    const order = normalizeRefineEditorOrder([...this.selectedEditorTypes]);
    const names: string[] = [];
    for (const id of order) {
      if (id === 'development+content') {
        names.push('Development Editor', 'Content Editor');
      } else if (id === 'line+copy') {
        names.push('Line Editor', 'Copy Editor');
      } else if (id === 'brand-alignment') {
        names.push('PwC Brand Alignment Editor');
      }
    }
    return names;
  }

  onClose(): void {
    this.cancelStream();
    this.resetForm();
    this.tlFlowService.closeFlow();
  }

  back(): void{
    this.cancelStream();
    this.documentUploadError = false;
    this.tlFlowService.closeFlow();
    this.tlFlowService.openGuidedDialog();
  }

  // helper: convert uploadedFileWordCount (string) to number if possible
  private getUploadedFileWordCountNumber(): number | null {
    const n = Number(this.uploadedFileWordCount);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }

  // show banner when Expand/Compress is ON and slider value > uploaded file word count
  get showExpandSupportBanner(): boolean {
    if (!this.expandCompressContent) return false;
    const uploadedCount = this.getUploadedFileWordCountNumber();
    if (uploadedCount === null) return false;
    return !!(this.wordLimitExpandCompress && this.wordLimitExpandCompress > uploadedCount);
  }

  onExpandSupportingDocSelected(file: File | null): void {
    // Clear previous error
    this.expandSupportingDocError = null;

    if (!file) {
      this.expandSupportingDocFile = null;
      return;
    }

    // Prevent uploading the same file name as the required upload (name-only check)
    if (this.uploadedFile && file.name === this.uploadedFile.name) {
      this.expandSupportingDocFile = null;
      this.expandSupportingDocError = 'Supporting document must have a different file name than the required upload.';
      return;
    }

    this.expandSupportingDocFile = file;
  }

  removeExpandSupportingDoc(): void {
    this.expandSupportingDocFile = null;
    this.expandSupportingDocError = null;
    // Reset underlying input so same file can be re-uploaded
    try {
      if (this.expandSupportingUploadRef?.nativeElement) {
        const hostEl = this.expandSupportingUploadRef.nativeElement as HTMLElement;
        const fileInput = hostEl.querySelector('input[type="file"]') as HTMLInputElement | null;
        if (fileInput) {
          fileInput.value = '';
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          const nestedInput = hostEl.querySelector('input') as HTMLInputElement | null;
          if (nestedInput) {
            nestedInput.value = '';
            nestedInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    } catch {
      /* ignore errors - best effort reset */
    }
  }

  // Multi-file supporting documents handler
  onExpandSupportingDocsFilesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      
      // Check total file count limit
      const totalFiles = this.expandSupportingDocFiles.length + filesArray.length;
      if (totalFiles > this.MAX_SUPPORTING_DOCS) {
        this.supportingDocsFileLimitError = true;
        this.supportingDocsTokenError = false;
        input.value = ''; // Reset input
        return;
      }

      // Add files and validate
      this.expandSupportingDocFiles = [...this.expandSupportingDocFiles, ...filesArray];
      this.supportingDocsFileLimitError = false;
      this.validateSupportingDocsTokenCount();
      input.value = ''; // Reset to allow re-uploading same file
    }
  }

  removeExpandSupportingDocAtIndex(index: number): void {
    this.expandSupportingDocFiles = this.expandSupportingDocFiles.filter((_, i) => i !== index);
    this.supportingDocsTokenError = false;
    this.supportingDocsFileLimitError = false;
    
    // Revalidate remaining files
    if (this.expandSupportingDocFiles.length > 0) {
      this.validateSupportingDocsTokenCount();
    }
  }

  async validateSupportingDocsTokenCount(): Promise<void> {
    let totalTokens = 0;
    
    for (const file of this.expandSupportingDocFiles) {
      const text = await this.extractFileText(file);
      // Approximate: 1 token ≈ 4 characters
      const tokens = Math.ceil(text.length / 4);
      totalTokens += tokens;
    }

    if (totalTokens > this.MAX_TOKEN_LIMIT) {
      this.supportingDocsTokenError = true;
      // Auto-remove the last file added
      this.expandSupportingDocFiles = this.expandSupportingDocFiles.slice(0, -1);
    } else {
      this.supportingDocsTokenError = false;
    }
  }

  // ensure state cleared on reset/close
  resetForm(): void {
    this.uploadedFile = null;
    this.uploadedFileWordCount = 'uploaded content';
    this.documentUploadError = false;
    this.expandCompressContent = false;
    this.adjustAudienceTone = false;
    this.enhanceResearch = false;
    this.editContent = false;
    this.provideSuggestions = false;
    this.selectedEditorTypes = ['development+content', 'line+copy', 'brand-alignment'];
    this.researchTopics = '';
    this.pwcContentLink = false;
    this.pwcProprietaryResearch = true;
    this.pwcLicensedThirdParty = true;
    this.externalResearch = true;
    this.researchDocumentFile = null;
    this.researchLinks = '';
    this.selectSpecificPwcSources = false;
  this.allPwcProprietarySources = true;
  this.pwcSource1 = true;
  this.pwcSource2 = true;
  this.pwcSource3 = true;
  this.pwcSource4 = true;
  this.allPwcThirdPartySources = true;
  this.pwcThirdPartySource1 = true;
  this.pwcThirdPartySource2 = true;
  this.pwcThirdPartySource3 = true;
  this.pwcThirdPartySource4 = true;
    this.wordLimitExpandCompress = 0;
    this.maxWordLimitExpandCompress = 0;
    this.updateSliderBackground(this.wordLimitExpandCompress);
    this.selectedAudienceTone = '';
    this.audienceToneInput = '';
    this.wordLimitResearch = '';
    this.refinedContent = '';
    this.refinedTitle = '';
    this.refinedContentBody = '';
    this.isGenerating = false;
    this.expandSupportingDocFile = null;
    this.expandSupportingDocFiles = [];
    this.supportingDocsTokenError = false;
    this.supportingDocsFileLimitError = false;
    this.researchDocumentFiles = [];
    this.researchDocsTokenError = false;
    this.researchDocsFileLimitError = false;
    this.researchDocInstructions= '';
    this.researchGuidelines = '';
    this.expandGuidelines = '';

    // Ensure per-source selected flags are in sync with defaults
    try {
      this.pwcProprietarySources.forEach(s => s.selected = true);
      this.pwcThirdPartySources.forEach(s => s.selected = true);
    } catch (e) {
      // ignore if arrays not initialized yet
    }
  }

  private parseRefinedContent(): void {
    if (!this.refinedContent) {
      this.refinedTitle = '';
      this.refinedContentBody = '';
      return;
    }

    // Parse title from format: **Title**\n\nContent
    const titleMatch = this.refinedContent.match(/^\*\*(.+?)\*\*\s*\n\n/);
    if (titleMatch) {
      this.refinedTitle = titleMatch[1];
      // Extract content after title (skip title line and blank line)
      const contentStart = titleMatch[0].length;
      this.refinedContentBody = this.refinedContent.substring(contentStart).trim();
    } else {
      // Try alternative format: **Title**\nContent (single newline)
      const titleMatchAlt = this.refinedContent.match(/^\*\*(.+?)\*\*\s*\n/);
      if (titleMatchAlt) {
        this.refinedTitle = titleMatchAlt[1];
        const contentStart = titleMatchAlt[0].length;
        this.refinedContentBody = this.refinedContent.substring(contentStart).trim();
      } else {
        // No title found, use entire content as body
        this.refinedTitle = '';
        this.refinedContentBody = this.refinedContent;
      }
    }
  }

  onFileSelected(file: File): void {
    // Validate file format - reject PPTX files
    const acceptedFormats = ['.doc', '.docx', '.pdf', '.txt'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isValidFormat = acceptedFormats.includes(fileExtension);
    
    if (!isValidFormat) {
      console.warn(`[RefineContentFlow] Invalid file format: ${file.name}. Accepted formats: .doc, .docx, .pdf, .txt`);
      this.documentUploadError = true;
      // Reset the file upload component to prevent invalid file from being stored
      if (this.documentUploadRef) {
        this.documentUploadRef.reset();
      }
      return;
    }
    
    this.documentUploadError = false;
    this.uploadedFile = file;
    // Extract word count from file
    this.extractWordCount(file);
  }

  onDocumentRemoved(): void {
    // Clear the uploaded file
    this.uploadedFile = null;
    this.uploadedFileWordCount = 'uploaded content';
    this.documentUploadError = false;
    
    // Disable all service toggles by resetting them
    this.expandCompressContent = false;
    this.adjustAudienceTone = false;
    this.enhanceResearch = false;
    this.editContent = false;
    this.provideSuggestions = false;
    
    // Reset conditional fields
    this.wordLimitExpandCompress = 0;
    this.maxWordLimitExpandCompress = 0;
    this.updateSliderBackground(this.wordLimitExpandCompress);
    this.selectedAudienceTone = '';
    this.audienceToneInput = '';
    this.wordLimitResearch = '';
  }

  private async extractWordCount(file: File): Promise<void> {
    const fileExtension = file.name.toLowerCase().split('.').pop() || '';
    
    // Show processing state for PDF/DOCX files
    if (fileExtension === 'pdf' || fileExtension === 'docx' || fileExtension === 'doc' || fileExtension === 'pptx') {
      this.uploadedFileWordCount = 'processing...';
    }
    
    try {
      const text = await this.extractFileText(file);
      if (text && text.trim()) {
        const wordCount = text.trim().split(/\s+/).length;
        this.uploadedFileWordCount = `${wordCount}`;
        // Calculate max word limit and set initial slider value
        this.calculateMaxWordLimit(wordCount);
        this.wordLimitExpandCompress = wordCount;
        this.updateSliderBackground(this.wordLimitExpandCompress);
      } else {
        this.uploadedFileWordCount = 'uploaded content';
        this.calculateMaxWordLimit(100); // Default fallback
        this.wordLimitExpandCompress = 100;
        this.updateSliderBackground(this.wordLimitExpandCompress);
      }
    } catch (error) {
      console.error('Error reading file for word count:', error);
      this.uploadedFileWordCount = 'uploaded content';
      this.calculateMaxWordLimit(100); // Default fallback
      this.wordLimitExpandCompress = 100;
      this.updateSliderBackground(this.wordLimitExpandCompress);
    }
  }

  private calculateMaxWordLimit(wordCount: number): void {
    // Calculate max as 3x word count, rounded to nearest 100
    const maxLimit = Math.round((wordCount * 3) / 100) * 100;
    this.maxWordLimitExpandCompress = maxLimit;
  }

  private async extractFileText(file: File): Promise<string> {
    const fileExtension = file.name.toLowerCase().split('.').pop() || '';
    
    // For text-based files, read directly
    if (fileExtension === 'txt' || fileExtension === 'md') {
      return await file.text();
    }
    
    // For PDF, DOCX, DOC - use backend API
    if (fileExtension === 'pdf' || fileExtension === 'docx' || fileExtension === 'doc' || fileExtension === 'pptx') {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        // Get API URL from environment (supports runtime config via window._env)
        const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
        const response = await this.authFetchService.authenticatedFetchFormData(`${apiUrl}/api/v1/export/extract-text`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[RefineContentFlow] Extract text failed: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`Failed to extract text from ${fileExtension.toUpperCase()} file: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.text || !data.text.trim()) {
          throw new Error(`No text content extracted from ${fileExtension.toUpperCase()} file`);
        }
        
        return data.text;
      } catch (error) {
        console.error(`[RefineContentFlow] Error extracting text from ${fileExtension} file:`, error);
        throw error;
      }
    }
    
    // Fallback: try to read as text
    try {
      return await file.text();
    } catch (error) {
      console.error('[RefineContentFlow] Error reading file as text:', error);
      throw new Error('Unable to read file content. Please ensure the file is a supported format (PDF, DOCX, TXT, MD).');
    }
  }

  onServiceToggle(service: string): void {
    // Clear conditional fields when service is toggled off
    if (service === 'expand-compress' && !this.expandCompressContent) {
      this.wordLimitExpandCompress = this.uploadedFileWordCount ? parseInt(this.uploadedFileWordCount.toString()) : 0;
      this.updateSliderBackground(this.wordLimitExpandCompress);
    }
    if (service === 'audience-tone' && !this.adjustAudienceTone) {
      this.selectedAudienceTone = '';
      this.audienceToneInput = '';
    }
    if (service === 'research' && !this.enhanceResearch) {
      this.wordLimitResearch = '';
      this.researchTopics = '';
      this.pwcContentLink = false;
      this.pwcProprietaryResearch = true;
      this.pwcLicensedThirdParty = true;
      this.externalResearch = true;
      this.researchDocumentFile = null;
      this.researchLinks = '';
      this.selectSpecificPwcSources = false;
      this.allPwcProprietarySources = false;
      this.pwcSource1 = false;
      this.pwcSource2 = false;
      this.pwcSource3 = false;
      this.pwcSource4 = false;
      this.allPwcThirdPartySources = false;
      this.pwcThirdPartySource1 = false;
      this.pwcThirdPartySource2 = false;
      this.pwcThirdPartySource3 = false;
      this.pwcThirdPartySource4 = false;
    }
    if (service === 'edit-content' && !this.editContent) {
      this.selectedEditorTypes = ['development+content', 'line+copy', 'brand-alignment'];
    }
  }

  onWordLimitChange(): void {
    // Update the slider background to color the track to the left of the thumb
    this.updateSliderBackground(this.wordLimitExpandCompress);
  }

  private updateSliderBackground(value: number): void {
    const min = 50;
    const max = this.maxWordLimitExpandCompress || Math.max(value, min);
    // guard against division by zero
    const pct = max > min ? Math.round(((value - min) / (max - min)) * 100) : 0;
    const clamped = Math.max(0, Math.min(100, pct));
    this.wordLimitSliderBackground = `linear-gradient(to right, #FFAA72 0%, #FFAA72 ${clamped}%, #E5E7EB ${clamped}%, #E5E7EB 100%)`;
  }

    // Handle word count textbox change
  onWordLimitTextboxChange(value: string | number): void {
    let num = Number(value);
    if (isNaN(num)) return;
    if (num < 50) num = 50;
    if (this.maxWordLimitExpandCompress && num > this.maxWordLimitExpandCompress) {
      num = this.maxWordLimitExpandCompress;
      // Force the input value to max if exceeded
      setTimeout(() => {
        const input = document.querySelector('.word-limit-input') as HTMLInputElement;
        if (input) input.value = String(this.maxWordLimitExpandCompress);
      }, 0);
    }
    this.wordLimitExpandCompress = num;
    this.onWordLimitChange();
  }

  onResearchDocumentSelected(file: File): void {
    this.researchDocumentFile = file;
  }

  // Multi-file research documents handler
  onResearchDocumentsFilesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      
      // Check total file count limit
      const totalFiles = this.researchDocumentFiles.length + filesArray.length;
      if (totalFiles > this.MAX_RESEARCH_DOCS) {
        this.researchDocsFileLimitError = true;
        this.researchDocsTokenError = false;
        input.value = ''; // Reset input
        return;
      }

      // Add files and validate
      this.researchDocumentFiles = [...this.researchDocumentFiles, ...filesArray];
      this.researchDocsFileLimitError = false;
      input.value = ''; // Reset to allow re-uploading same file
    }
  }

  removeResearchDocAtIndex(index: number): void {
    this.researchDocumentFiles = this.researchDocumentFiles.filter((_, i) => i !== index);
    this.researchDocsFileLimitError = false;
  }

  async validateResearchDocsTokenCount(): Promise<void> {
    let totalTokens = 0;
    
    for (const file of this.researchDocumentFiles) {
      const text = await this.extractFileText(file);
      // Approximate: 1 token ≈ 4 characters
      const tokens = Math.ceil(text.length / 4);
      totalTokens += tokens;
    }

    if (totalTokens > this.MAX_RESEARCH_TOKEN_LIMIT) {
      this.researchDocsTokenError = true;
      // Auto-remove the last file added
      this.researchDocumentFiles = this.researchDocumentFiles.slice(0, -1);
    } else {
      this.researchDocsTokenError = false;
    }
  }

  onAllPwcProprietarySourcesChange(): void {
    const value = this.allPwcProprietarySources;
    this.pwcSource1 = value;
    this.pwcSource2 = value;
    this.pwcSource3 = value;
    this.pwcSource4 = value;
  }

  onAllPwcProprietaryToggle(value: boolean): void {
    this.pwcProprietarySources.forEach(source => source.selected = value);
  }

  onPwcProprietarySourceChange(): void {
    this.allPwcProprietarySources = this.pwcProprietarySources.every(s => s.selected);
  }

  onAllPwcThirdPartySourcesChange(): void {
    const value = this.allPwcThirdPartySources;
    this.pwcThirdPartySource1 = value;
    this.pwcThirdPartySource2 = value;
    this.pwcThirdPartySource3 = value;
    this.pwcThirdPartySource4 = value;
  }

  onAllPwcThirdPartyToggle(value: boolean): void {
  this.allPwcThirdPartySources = value;
  this.pwcThirdPartySources.forEach(source => source.selected = value);
}


onPwcThirdPartySourceChange(): void {
  this.allPwcThirdPartySources = this.pwcThirdPartySources.every(s => s.selected);
}

  get showPwcSourceSelection(): boolean {
    return this.enhanceResearch && (this.pwcProprietaryResearch || this.pwcLicensedThirdParty);
  }
  get invalidLinks(): boolean {
    if (!this.researchLinks) return false;

    return this.researchLinks
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .some(link => /^https?:\/\/.+/.test(link));
  }
  get canRefine(): boolean {
    if (!this.uploadedFile) return false;
    
    // At least one service must be selected
    if (!this.expandCompressContent && !this.adjustAudienceTone && 
        !this.enhanceResearch && !this.editContent && !this.provideSuggestions) {
      return false;
    }
    
    // Expand/Compress - require a word limit
    if (this.expandCompressContent && !this.wordLimitExpandCompress) {
      return false;
    }

    // Supporting documents are now optional - no longer required even when slider exceeds file word count
    
    // When PwC Content/Link is selected, require either document files or research links
    if (this.pwcContentLink) {
      const hasDocuments = this.researchDocumentFiles.length > 0 || this.researchDocumentFile !== null;
      const hasLinks = this.researchLinks && this.researchLinks.trim().length > 0;
      
      if (!hasDocuments && !hasLinks) {
        return false;
      }
    }
    
    if (this.adjustAudienceTone) {
      if (!this.audienceToneInput || !this.audienceToneInput.trim()) {
        return false;
      }
    }

    // Enhance Research - require research topics
    if (this.enhanceResearch) {
      if (!this.researchTopics || !this.researchTopics.trim()) {
        return false;
      }
    }
    
    return true;
  }

  async refineContent(): Promise<void> {
    if (!this.uploadedFile) {
      console.error('No file uploaded');
      return;
    }

    this.isGenerating = true;
    this.refinedContent = '';
    this.refinedTitle = '';
    this.refinedContentBody = '';

    try {
      // Extract text from uploaded file
      const contentText = await this.extractFileText(this.uploadedFile);
      
      // Get original word count
      const originalWordCount = contentText.trim().split(/\s+/).length;
      
      // Build services array in the required structured format
      // All services are included with isSelected flag based on toggle state
      const services: any[] = [];
      
      // 1. Expand/Compress Content - always include with isSelected flag
      const expandCompressService: any = {
        isSelected: this.expandCompressContent || (this.enhanceResearch && !this.expandCompressContent),
        type: this.expandCompressContent 
          ? (this.wordLimitExpandCompress >= originalWordCount ? 'expand' : 'compress')
          : 'expand',  // Default to expand when only enhanceResearch is ON
        original_word_count: originalWordCount,
        expected_word_count: this.expandCompressContent 
          ? (this.wordLimitExpandCompress || originalWordCount)
          : originalWordCount  // Default to original word count when only enhanceResearch is ON
      };
      
      // Add supporting document text - handle both single and multiple files
      if (this.expandCompressContent) {
        try {
          if (this.expandSupportingDocFiles.length > 0) {
            // Multiple files: combine with separators
            const extractedDocs = await Promise.all(
              this.expandSupportingDocFiles.map(async (file, index) => ({
                filename: file.name,
                text: await this.extractFileText(file),
                index: index + 1
              }))
            );
            const combinedSupportingDocs = extractedDocs
              .map(doc => `--- Supporting Document ${doc.index}: ${doc.filename} ---\n${doc.text}`)
              .join('\n\n');
            expandCompressService.supportingDoc = combinedSupportingDocs;
          } else if (this.expandSupportingDocFile) {
            // Single file (legacy support)
            const supportingText = await this.extractFileText(this.expandSupportingDocFile);
            expandCompressService.supportingDoc = supportingText;
          }
                  // Add expand guidelines if provided
             if (this.expandGuidelines) {
              expandCompressService.expand_guidelines = this.expandGuidelines;
          }
        } catch (error) {
          console.error('[RefineContentFlow] Error extracting supporting document:', error);
        }
      }
      
      services.push(expandCompressService);
      
      // 2. Adjust Audience/Tone - always include with isSelected flag
      const audienceToneService: any = {
        isSelected: this.adjustAudienceTone,
        type: 'adjust_audience_tone'
      };
      
      // Add audience_tone only if service is selected and value is provided
      if (this.adjustAudienceTone && this.audienceToneInput?.trim()) {
        audienceToneService.audience_tone = this.audienceToneInput.trim();
      }
      
      services.push(audienceToneService);
      
      // 3. Provide Suggestions - always include with isSelected flag
      services.push({
        isSelected: this.provideSuggestions,
        type: 'improvement_suggestions',
        suggestion_type: 'general'
      });
      
      // 4. Enhance Research - always include with isSelected flag
      const researchService: any = {
        isSelected: this.enhanceResearch,
        type: 'enhanced_with_research'
      };
      
      // Add research fields only if service is selected
      if (this.enhanceResearch) {
        // Add research topics if provided
        if (this.researchTopics.trim()) {
          researchService.research_topics = this.researchTopics;
        }
        
        // Add word limit if provided
        if (this.wordLimitResearch) {
          researchService.word_limit = this.wordLimitResearch;
        }
        
        // Add research guidelines if provided
        if (this.researchGuidelines) {
          researchService.research_guidelines = this.researchGuidelines;
        }
        
        // PwC Content - always include with isSelected flag
        researchService.pwc_content = {
          isSelected: this.pwcContentLink
        };
        
        // Add pwc_content fields only if toggle is ON
        if (this.pwcContentLink) {
          // Add research document text - handle both single and multiple files
          if (this.researchDocumentFiles.length > 0) {
            // Multiple files: combine with separators
            try {
              const extractedDocs = await Promise.all(
                this.researchDocumentFiles.map(async (file, index) => ({
                  filename: file.name,
                  text: await this.extractFileText(file),
                  index: index + 1
                }))
              );
              const combinedResearchDocs = extractedDocs
                .map(doc => `--- Research Document ${doc.index}: ${doc.filename} ---\n${doc.text}`)
                .join('\n\n');
              researchService.pwc_content.supportingDoc = combinedResearchDocs;
            } catch (error) {
              console.error('[RefineContentFlow] Error extracting research documents:', error);
            }
          } else if (this.researchDocumentFile) {
            // Single file (legacy support)
            try {
              const researchDocText = await this.extractFileText(this.researchDocumentFile);
              researchService.pwc_content.supportingDoc = researchDocText;
            } catch (error) {
              console.error('[RefineContentFlow] Error extracting research document:', error);
            }
          }
          
          // Add instructions if provided
          if (this.researchDocInstructions) {
            researchService.pwc_content.supportingDoc_instructions = this.researchDocInstructions;
          }
          
          // Add research links if provided
          if (this.researchLinks) {
            researchService.pwc_content.research_links = this.researchLinks;
          }
        }
        
        // Proprietary Sources - always include with isSelected flag
        researchService.proprietary = {
          isSelected: this.pwcProprietaryResearch,
          sources: []
        };
        
        // Add selected sources only if toggle is ON
        if (this.pwcProprietaryResearch) {
          researchService.proprietary.sources = this.pwcProprietarySources
            .filter(s => s.selected)
            .map(s => toSnakeCase(s.name));
        }
        
        // Third Party Sources - always include with isSelected flag
        researchService.thirdParty = {
          isSelected: this.pwcLicensedThirdParty,
          sources: []
        };
        
        // Add selected sources only if toggle is ON
        if (this.pwcLicensedThirdParty) {
          researchService.thirdParty.sources = this.pwcThirdPartySources
            .filter(s => s.selected)
            .map(s => toSnakeCase(s.name));
        }
        
        // External Research - always include with isSelected flag
        researchService.externalResearch = {
          isSelected: this.externalResearch
        };
        
        // Add research links only if toggle is ON and links are provided
        if (this.externalResearch && this.researchLinks) {
          researchService.externalResearch.research_links = this.researchLinks;
        }
      }
      
      services.push(researchService);
      
      // 5. Edit Content - always include with isSelected flag
      const editContentService: any = {
        isSelected: this.editContent,
        type: 'edit_content',
        editors: []
      };
      
      if (this.editContent) {
        editContentService.editors = this.getEditorNamesForBackend();
      }
      
      services.push(editContentService);
      
      // Build the original prompt text for the content field
      let prompt = 'Please refine the following content using these services:\n\n';
      
      // Build service descriptions for the prompt (original format)
      const serviceDescriptions: any[] = [];
      
      if (this.expandCompressContent && this.wordLimitExpandCompress) {
        serviceDescriptions.push({
          name: 'Expand or Compress Content',
          params: `Word limit: ${this.wordLimitExpandCompress}`
        });
      }
      
      if (this.adjustAudienceTone && this.audienceToneInput) {
        serviceDescriptions.push({
          name: 'Adjust for Audience / Tone',
          params: `Audience and tone: ${this.audienceToneInput}`
        });
      }
      
      if (this.provideSuggestions) {
        serviceDescriptions.push({
          name: 'Provide Suggestions on Improving Content',
          params: 'General improvement suggestions'
        });
      }
      
      if (this.enhanceResearch && this.researchTopics.trim()) {
        let researchParams = `Research Topics: ${this.researchTopics}\n`;
        
        if (this.wordLimitResearch) {
          researchParams += `   Word Limit: ${this.wordLimitResearch}\n`;
        }
        
        if (this.researchGuidelines) {
          researchParams += `   Research Guidelines: ${this.researchGuidelines}\n`;
        }
        
        const sourcesSelected = [];
        if (this.pwcContentLink) sourcesSelected.push('PwC Content or Link');
        if (this.pwcProprietaryResearch) sourcesSelected.push('PwC Proprietary Research');
        if (this.pwcLicensedThirdParty) sourcesSelected.push('PwC Licensed Third Party Tools');
        if (this.externalResearch) sourcesSelected.push('External Research');
        
        if (sourcesSelected.length > 0) {
          researchParams += `   Sources: ${sourcesSelected.join(', ')}\n`;
        }
        
        if (this.researchLinks) {
          researchParams += `   Research Links: ${this.researchLinks}\n`;
        }
        
        serviceDescriptions.push({
          name: 'Enhance with Additional Research',
          params: researchParams.trim()
        });
      }
      
      if (this.editContent) {
        const selectedEditors = this.getEditorNamesForBackend();
        serviceDescriptions.push({
          name: 'Edit Content',
          params: `Using: ${selectedEditors.join(', ')}`
        });
      }
      
      // Build prompt with service descriptions
      serviceDescriptions.forEach((service, index) => {
        prompt += `${index + 1}. ${service.name}\n   ${service.params}\n\n`;
      });
      
      // Add content section with supporting document handling
      let finalContent = contentText;
      if (this.expandCompressContent) {
        if (this.expandSupportingDocFiles.length > 0) {
          // Multiple files: combine with separators
          const extractedDocs = await Promise.all(
            this.expandSupportingDocFiles.map(async (file, index) => ({
              filename: file.name,
              text: await this.extractFileText(file),
              index: index + 1
            }))
          );
          const combinedSupportingDocs = extractedDocs
            .map(doc => `--- Supporting Document ${doc.index}: ${doc.filename} ---\n${doc.text}`)
            .join('\n\n');
          
          finalContent = `PRIMARY DOCUMENT (BASE CONTENT):
${contentText}

SUPPORTING DOCUMENTS (FOR EXPANSION ONLY):
${combinedSupportingDocs}

INSTRUCTION:
Use the supporting documents ONLY to add new substance where needed.
Do NOT invent facts.
Do NOT contradict the primary document.`;
        } else if (this.expandSupportingDocFile) {
          // Single file (legacy support)
          const supportingText = await this.extractFileText(this.expandSupportingDocFile);
          finalContent = `PRIMARY DOCUMENT (BASE CONTENT):
${contentText}

SUPPORTING DOCUMENT (FOR EXPANSION ONLY):
${supportingText}

INSTRUCTION:
Use the supporting document ONLY to add new substance where needed.
Do NOT invent facts.
Do NOT contradict the primary document.`;
        }
      }
      
      prompt += `\nContent to Refine:\n${finalContent}`;
      
      // Build the complete payload: keep messages (original prompt) but put original_content and services outside
      const messagePayload = {
        messages: [{ role: 'user' as const, content: prompt }],
        original_content: contentText,
        services: services,
        stream: true
      };

      console.log('[RefineContentFlow] Sending structured request:', {
        fileName: this.uploadedFile.name,
        servicesCount: services.length,
        services: services.map(s => s.type)
      });

      // Build user message for chat display
      const userMessageText = `Refine content: ${services.map(s => s.type.replace(/_/g, ' ')).join(', ')}`;
      
      // Create stream observable with structured message
  const streamObservable = this.chatService.streamRefineContent(messagePayload as any);
      
      // Build metadata for the refined content
      const metadata: ThoughtLeadershipMetadata = {
        contentType: 'refine-content',
        topic: this.uploadedFile.name || 'Refined Content',
        fullContent: '', // Will be populated by the chat component from streamed content
        showActions: true
      };
      
      // Close panel immediately
      this.tlFlowService.closeFlow();
      
      // Emit to chat component to handle streaming
      this.streamToChat.emit({
        userMessage: userMessageText,
        streamObservable: streamObservable,
        fileName: this.uploadedFile.name,
        metadata: metadata
      });
      
      // Reset state
      this.isGenerating = false;
      this.refinedContent = '';
      this.refinedTitle = '';
      this.refinedContentBody = '';
    } catch (error) {
      console.error('[RefineContentFlow] Exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Close panel
      this.tlFlowService.closeFlow();
      
      // Build error message for chat
      let chatErrorMessage = 'I apologize, but I encountered an error refining your content.';
      if (errorMessage.includes('extract text') || errorMessage.includes('read file')) {
        chatErrorMessage = `Error: ${errorMessage}\n\nPlease ensure your PDF file is not corrupted and try again.`;
      } else {
        chatErrorMessage = `Error: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`;
      }
      
      // Build error metadata
      const errorMetadata: ThoughtLeadershipMetadata = {
        contentType: 'refine-content',
        topic: 'Error',
        fullContent: chatErrorMessage,
        showActions: false
      };
      
      // Add error message to chat
      this.streamToChat.emit({
        userMessage: 'Refine content',
        streamObservable: new Observable(observer => {
          observer.next({ type: 'content', content: chatErrorMessage });
          observer.complete();
        }),
        metadata: errorMetadata
      });
      
      // Reset state
      this.isGenerating = false;
      this.refinedContent = '';
      this.refinedTitle = '';
      this.refinedContentBody = '';
    }
  }

  downloadContent(format: 'txt' | 'docx'): void {
    // Include title in download if present
    const contentToDownload = this.refinedTitle 
      ? `${this.refinedTitle}\n\n${this.refinedContentBody}`
      : this.refinedContent;
    const blob = new Blob([contentToDownload], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `refined-content.${format}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  copyToClipboard(): void {
    // Include title in copy if present
    const contentToCopy = this.refinedTitle 
      ? `${this.refinedTitle}\n\n${this.refinedContentBody}`
      : this.refinedContent;
    navigator.clipboard.writeText(contentToCopy);
  }

  // Return human friendly file size (e.g. "1.23 MB")
  formatFileSize(file: File | null): string {
    if (!file || typeof file.size !== 'number') return '';
    const bytes = file.size;
    if (bytes === 0) return '0 bytes';
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Number((bytes / Math.pow(1024, exponent)).toFixed(2));
    return `${size} ${units[exponent]}`;
  }

}
