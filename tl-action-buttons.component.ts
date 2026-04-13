import { JsonPipe } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { DdcFlowService } from '../../../core/services/ddc-flow.service';
import {
  ChatService,
  ContractMissingField,
  ContractTypeFlags,
} from '../../../core/services/chat.service';
import { FileUploadComponent } from '../../../shared/ui/components/file-upload/file-upload.component';
import { DDCRequestFormComponent } from '../../phoenix/ddc/request-form-ddc';
import { renderMarkdownForDisplay } from '../../../core/utils/edit-content.utils';

@Component({
  selector: 'app-slide-creation-prompt-flow',
  imports: [FormsModule, JsonPipe, FileUploadComponent, DDCRequestFormComponent],
  templateUrl: './slide-creation-prompt-flow.component.html',
  styleUrls: ['./slide-creation-prompt-flow.component.scss'],
})
export class SlideCreationPromptFlowComponent implements OnInit, OnDestroy {
  @Input() hideBackButton = false;
  @Input() openedFrom: 'quick-action' | 'guided-dialog' | null = null;
  @ViewChild('scopeOfWorkUpload') scopeOfWorkUpload?: FileUploadComponent;
  @ViewChild('supportingDocUpload') supportingDocUpload?: FileUploadComponent;
  @ViewChild('sowTemplateUpload') sowTemplateUpload?: FileUploadComponent;
  @ViewChild('missingFieldsPanel') missingFieldsPanel?: ElementRef<HTMLElement>;

  isOpen = false;
  isGenerating = false;
  /** Legacy HTML banner (errors, ticket success) */
  generatedContent = '';
  showCreateRequestButton = false;
  showRequestForm = false;

  scopeOfWorkFile: File | null = null;
  supportingDocFile: File | null = null;
  sowTemplateFile: File | null = null;

  scopeOfWorkUploadError = false;
  supportingDocUploadError = false;
  sowTemplateUploadError = false;

  prid = '';
  flexId = '';
  lookupInIcertis = false;

  /** Exactly one contract type flag is true — driven by `selectedContractTypeKey` */
  selectedContractTypeKey: keyof ContractTypeFlags = 'statement_of_work';

  readonly contractTypeOptions: { key: keyof ContractTypeFlags; label: string }[] = [
    { key: 'statement_of_work', label: 'Statement of Work' },
    { key: 'engagement_letter', label: 'Engagement Letter' },
    { key: 'master_services_agreement', label: 'Master Services Agreement' },
    { key: 'non_disclosure_agreement', label: 'Non-Disclosure Agreement' },
    { key: 'product_license_agreement', label: 'Product License Agreement' },
  ];

  showMissingFieldsStep = false;
  /** API message when validation fails (optional) */
  validationStepMessage = '';
  missingFields: ContractMissingField[] = [];
  /** Latest merged extracted fields from the API (for resume + display) */
  extractedFieldsState: Record<string, unknown> = {};
  userFilledFields: Record<string, unknown> = {};

  draftMarkdown = '';
  draftHtmlSafe: SafeHtml | null = null;
  showExtractedSummary = false;
  isExportingWord = false;

  /** Set when user runs Generate (shown during missing-fields step) */
  lastScopeOfWorkFileName = '';

  private destroy$ = new Subject<void>();

  constructor(
    private ddcFlowService: DdcFlowService,
    private chatService: ChatService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.ddcFlowService.activeFlow$
      .pipe(takeUntil(this.destroy$))
      .subscribe(flow => {
        this.isOpen = flow === 'slide-creation-prompt';
        if (this.isOpen) {
          this.resetForm();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  resetForm(): void {
    this.scopeOfWorkFile = null;
    this.supportingDocFile = null;
    this.sowTemplateFile = null;
    this.prid = '';
    this.flexId = '';
    this.lookupInIcertis = false;
    this.selectedContractTypeKey = 'statement_of_work';
    this.generatedContent = '';
    this.isGenerating = false;
    this.scopeOfWorkUploadError = false;
    this.supportingDocUploadError = false;
    this.sowTemplateUploadError = false;
    this.showMissingFieldsStep = false;
    this.validationStepMessage = '';
    this.missingFields = [];
    this.extractedFieldsState = {};
    this.userFilledFields = {};
    this.draftMarkdown = '';
    this.draftHtmlSafe = null;
    this.showExtractedSummary = false;
    this.showCreateRequestButton = false;
    this.lastScopeOfWorkFileName = '';
  }

  getContractTypeFlags(): ContractTypeFlags {
    const keys: (keyof ContractTypeFlags)[] = [
      'statement_of_work',
      'engagement_letter',
      'master_services_agreement',
      'non_disclosure_agreement',
      'product_license_agreement',
    ];
    const out: ContractTypeFlags = {
      statement_of_work: false,
      engagement_letter: false,
      master_services_agreement: false,
      non_disclosure_agreement: false,
      product_license_agreement: false,
    };
    if (keys.includes(this.selectedContractTypeKey)) {
      out[this.selectedContractTypeKey] = true;
    } else {
      out.statement_of_work = true;
    }
    return out;
  }

  onScopeOfWorkSelected(file: File): void {
    const acceptedFormats = ['.doc', '.docx', '.pdf', '.pptx', '.xlsx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!acceptedFormats.includes(fileExtension)) {
      this.scopeOfWorkUploadError = true;
      this.scopeOfWorkUpload?.reset();
      return;
    }

    this.scopeOfWorkUploadError = false;
    this.scopeOfWorkFile = file;
  }

  onScopeOfWorkRemoved(): void {
    this.scopeOfWorkFile = null;
    this.scopeOfWorkUploadError = false;
  }

  onSupportingDocSelected(file: File): void {
    const acceptedFormats = ['.doc', '.docx', '.pdf', '.pptx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!acceptedFormats.includes(fileExtension)) {
      this.supportingDocUploadError = true;
      this.supportingDocUpload?.reset();
      return;
    }

    this.supportingDocUploadError = false;
    this.supportingDocFile = file;
  }

  onSupportingDocRemoved(): void {
    this.supportingDocFile = null;
    this.supportingDocUploadError = false;
  }

  onSowTemplateSelected(file: File): void {
    const acceptedFormats = ['.doc', '.docx', '.pdf', '.pptx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!acceptedFormats.includes(fileExtension)) {
      this.sowTemplateUploadError = true;
      this.sowTemplateUpload?.reset();
      return;
    }

    this.sowTemplateUploadError = false;
    this.sowTemplateFile = file;
  }

  onSowTemplateRemoved(): void {
    this.sowTemplateFile = null;
    this.sowTemplateUploadError = false;
  }

  get canGenerate(): boolean {
    return !!(
      this.scopeOfWorkFile &&
      this.prid.trim() &&
      this.flexId.trim() &&
      !this.isGenerating
    );
  }

  get canSubmitMissingFields(): boolean {
    if (this.missingFields.length === 0) {
      return false;
    }
    for (const f of this.missingFields) {
      const v = this.userFilledFields[f.field_key];
      const t = (f.type || 'text').toLowerCase();
      switch (t) {
        case 'boolean':
          break;
        case 'number':
          if (v === '' || v === undefined || v === null || Number.isNaN(Number(v))) {
            return false;
          }
          break;
        case 'dropdown':
          if (v === undefined || v === null || (typeof v === 'string' && !String(v).trim())) {
            return false;
          }
          break;
        default:
          if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
            return false;
          }
      }
    }
    return true;
  }

  close(): void {
    this.ddcFlowService.closeFlow();
  }

  back(): void {
    this.ddcFlowService.closeFlow();
    this.ddcFlowService.openGuidedDialog();
  }

  private buildMultipartFormData(): FormData {
    const fd = new FormData();
    fd.append('document_file', this.scopeOfWorkFile!);
    fd.append('contract_type', JSON.stringify(this.getContractTypeFlags()));
    fd.append('prid', this.prid.trim());
    fd.append('flex_id', this.flexId.trim());
    fd.append('lookup_in_icertis', String(this.lookupInIcertis));
    if (this.supportingDocFile) {
      fd.append('supporting_document_file', this.supportingDocFile);
    }
    if (this.sowTemplateFile) {
      fd.append('template_file', this.sowTemplateFile);
    }
    return fd;
  }

  /**
   * Initialize controls for each missing field. Prefill from `extractedFieldsState`
   * when the API returned a partial value (backend still lists field as missing if empty).
   */
  private fieldHasUsableInput(f: ContractMissingField, v: unknown): boolean {
    const t = (f.type || 'text').toLowerCase();
    if (v === undefined) {
      return false;
    }
    if (t === 'boolean') {
      return true;
    }
    if (t === 'number') {
      return v !== null && v !== '' && !Number.isNaN(Number(v));
    }
    if (v === null) {
      return false;
    }
    if (typeof v === 'string') {
      return v.trim().length > 0;
    }
    return true;
  }

  private initUserFilledFromMissing(missing: ContractMissingField[]): void {
    const next: Record<string, unknown> = { ...this.userFilledFields };
    for (const f of missing) {
      const key = f.field_key;
      const fromApi = this.extractedFieldsState[key];
      const t = (f.type || 'text').toLowerCase();

      if (this.fieldHasUsableInput(f, next[key])) {
        continue;
      }

      if (fromApi !== undefined && fromApi !== null) {
        if (typeof fromApi === 'string' && fromApi.trim()) {
          next[key] = t === 'date' ? this.normalizeDateForInput(fromApi) : fromApi;
          continue;
        }
        if (typeof fromApi === 'number' && !Number.isNaN(fromApi)) {
          next[key] = fromApi;
          continue;
        }
        if (typeof fromApi === 'boolean') {
          next[key] = fromApi;
          continue;
        }
      }

      if (next[key] === undefined) {
        if (t === 'boolean') {
          next[key] = false;
        } else if (t === 'number') {
          next[key] = null;
        } else {
          next[key] = '';
        }
      }
    }
    this.userFilledFields = { ...next };
  }

  /** Normalize ISO or loose date strings to yyyy-mm-dd for input[type=date] */
  private normalizeDateForInput(value: string): string {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return s;
    }
    const d = Date.parse(s);
    if (!Number.isNaN(d)) {
      const x = new Date(d);
      const y = x.getFullYear();
      const m = String(x.getMonth() + 1).padStart(2, '0');
      const day = String(x.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return '';
  }

  /** Coerce value for resume payload to match backend / field_mapping types */
  private coerceUserValue(field: ContractMissingField, raw: unknown): unknown {
    const t = (field.type || 'text').toLowerCase();
    switch (t) {
      case 'number': {
        const n = typeof raw === 'number' ? raw : Number(raw);
        return Number.isNaN(n) ? null : n;
      }
      case 'boolean':
        return Boolean(raw);
      case 'date':
        if (typeof raw === 'string' && raw.trim()) {
          return raw.trim();
        }
        return raw ?? '';
      default:
        return raw;
    }
  }

  /** Return to full form without losing files; user can click Generate again */
  backToDocumentForm(): void {
    this.showMissingFieldsStep = false;
    this.validationStepMessage = '';
    this.missingFields = [];
    this.userFilledFields = {};
    this.generatedContent = '';
  }

  /** Lowercase type for @switch in template (backend may vary casing). */
  normalizedFieldType(field: ContractMissingField): string {
    return (field.type || 'text').toLowerCase();
  }

  private setDraftHtmlFromMarkdown(md: string): void {
    this.draftMarkdown = md;
    if (!md?.trim()) {
      this.draftHtmlSafe = null;
      return;
    }
    this.draftHtmlSafe = this.sanitizer.bypassSecurityTrustHtml(renderMarkdownForDisplay(md));
  }

  private handleDraftResponse(res: Record<string, unknown>): void {
    const status = String(res['status'] ?? '').trim();
    if (status === 'validation_requirement_to_fulfill') {
      this.showMissingFieldsStep = true;
      this.validationStepMessage =
        typeof res['message'] === 'string' ? res['message'] : '';
      this.missingFields = Array.isArray(res['missing_fields'])
        ? (res['missing_fields'] as ContractMissingField[])
        : [];
      this.extractedFieldsState = {
        ...((res['extracted_fields'] as Record<string, unknown>) || {}),
      };
      this.initUserFilledFromMissing(this.missingFields);
      this.draftMarkdown = '';
      this.draftHtmlSafe = null;
      this.generatedContent = '';
      if (this.missingFields.length > 0) {
        setTimeout(() => {
          this.missingFieldsPanel?.nativeElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 100);
      }
      return;
    }
    if (status === 'draft_generated') {
      this.showMissingFieldsStep = false;
      this.validationStepMessage = '';
      this.missingFields = [];
      this.extractedFieldsState = {
        ...((res['extracted_fields'] as Record<string, unknown>) || {}),
      };
      const content = (res['draft_content'] as string) || '';
      this.setDraftHtmlFromMarkdown(content);
      this.generatedContent = '';
      this.showCreateRequestButton = true;
      return;
    }
    this.generatedContent =
      'Unexpected response from contract draft service. Please try again or contact support.';
  }

  async generate(): Promise<void> {
    if (!this.canGenerate || !this.scopeOfWorkFile) {
      return;
    }

    this.isGenerating = true;
    this.generatedContent = '';
    this.showMissingFieldsStep = false;

    try {
      this.lastScopeOfWorkFileName = this.scopeOfWorkFile?.name || '';
      const formData = this.buildMultipartFormData();
      const res = (await firstValueFrom(
        this.chatService.postContractDraftMultipart(formData)
      )) as Record<string, unknown>;

      this.handleDraftResponse(res);
    } catch (e) {
      console.error('[SlideCreationPromptFlow] Contract draft failed', e);
      this.generatedContent =
        'An error occurred while generating the draft contract. Please try again.';
      this.draftHtmlSafe = null;
      this.draftMarkdown = '';
    } finally {
      this.isGenerating = false;
    }
  }

  async submitMissingFields(): Promise<void> {
    if (!this.canSubmitMissingFields) {
      return;
    }

    const user_filled_fields: Record<string, unknown> = {};
    for (const f of this.missingFields) {
      const raw = this.userFilledFields[f.field_key];
      user_filled_fields[f.field_key] = this.coerceUserValue(f, raw);
    }

    this.isGenerating = true;
    try {
      const res = (await firstValueFrom(
        this.chatService.postContractDraftResume({
          contract_type: this.getContractTypeFlags(),
          prid: this.prid.trim(),
          flex_id: this.flexId.trim(),
          extracted_fields: JSON.parse(JSON.stringify(this.extractedFieldsState)) as Record<string, unknown>,
          user_filled_fields,
        })
      )) as Record<string, unknown>;

      this.handleDraftResponse(res);
    } catch (e) {
      console.error('[SlideCreationPromptFlow] Resume draft failed', e);
      this.generatedContent =
        'An error occurred while submitting required fields. Please try again.';
    } finally {
      this.isGenerating = false;
    }
  }

  exportDraftWord(): void {
    if (!this.draftMarkdown?.trim()) {
      return;
    }
    this.isExportingWord = true;
    this.chatService
      .exportWordStandalone({
        content: this.draftMarkdown,
        title: 'Contract draft',
        content_type: 'Contract',
      })
      .subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'contract-draft.docx';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: err => {
          console.error('[SlideCreationPromptFlow] Word export failed', err);
          this.isExportingWord = false;
        },
        complete: () => {
          this.isExportingWord = false;
        },
      });
  }

  phoenixRdpLink = '';

  onTicketCreated(event: { requestNumber: string; phoenixRdpLink: string }): void {
    try {
      this.validateAndEscapeUrl(event.phoenixRdpLink);
      const escapedRequestNumber = this.escapeHtmlSpecialChars(event.requestNumber);
      const escapedLink = this.escapeHtmlAttribute(event.phoenixRdpLink);
      this.phoenixRdpLink = event.phoenixRdpLink;
      this.generatedContent = `Request created successfully! Your request number is: <a href="${escapedLink}" target="_blank" rel="noopener noreferrer">${escapedRequestNumber}</a>`;
    } catch {
      this.generatedContent = 'Error processing request. Please try again.';
    }
    this.showRequestForm = false;
    this.showCreateRequestButton = false;
  }

  openRequestForm(): void {
    this.showRequestForm = true;
  }

  private escapeHtmlSpecialChars(untrustedData: string): string {
    if (!untrustedData) return '';
    const div = document.createElement('div');
    div.textContent = untrustedData;
    return div.innerHTML;
  }

  private escapeHtmlAttribute(untrustedData: string): string {
    if (!untrustedData) return '';
    return untrustedData
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private validateAndEscapeUrl(urlString: string): void {
    if (!urlString) throw new Error('URL is empty');
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Invalid protocol: ${url.protocol}`);
    }
  }

  /** Entries for *ngFor over extracted_fields (object keys) */
  extractedFieldEntries(): { key: string; value: unknown }[] {
    return Object.entries(this.extractedFieldsState).map(([key, value]) => ({ key, value }));
  }
}
