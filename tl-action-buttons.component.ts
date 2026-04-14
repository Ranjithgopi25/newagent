import { JsonPipe } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { DdcFlowService } from '../../../core/services/ddc-flow.service';
import { ChatEditWorkflowService } from '../../../core/services/chat-edit-workflow.service';
import {
  ChatService,
  ContractMissingField,
  ContractTypeFlags,
} from '../../../core/services/chat.service';
import { FileUploadComponent } from '../../../shared/ui/components/file-upload/file-upload.component';
import { renderMarkdownForDisplay } from '../../../core/utils/edit-content.utils';

/** One saved SOW draft response (user can switch between versions after regenerate). */
export interface SowDraftVersion {
  markdown: string;
  extractedFields: Record<string, unknown>;
}

@Component({
  selector: 'app-slide-creation-prompt-flow',
  imports: [FormsModule, JsonPipe, FileUploadComponent],
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

  scopeOfWorkFile: File | null = null;
  supportingDocFile: File | null = null;
  sowTemplateFile: File | null = null;

  scopeOfWorkUploadError = false;
  supportingDocUploadError = false;
  sowTemplateUploadError = false;

  prid = '';
  flexId = '';
  lookupInIcertis = false;

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

  /** Successful drafts in order; regenerating appends Version 2, 3, … */
  sowDraftVersions: SowDraftVersion[] = [];
  /** Index into `sowDraftVersions` for the body + extracted fields shown. */
  selectedSowVersionIndex = 0;
  /** Next successful `draft_generated` replaces all versions or appends (after regenerate). */
  private nextSowDraftMode: 'replace' | 'append' = 'replace';

  /** Snapshot when a draft succeeds — used to merge edits on resume/regenerate. */
  extractedFieldsBaselineSnapshot: Record<string, unknown> = {};
  /** Inline edit of extracted fields after draft (triggers resume → draft LLM again). */
  editingExtractedFields = false;
  editableExtractedStrings: Record<string, string> = {};

  /** Set when user runs Generate (shown during missing-fields step) */
  lastScopeOfWorkFileName = '';

  /** Show draft-result hint only after a successful "Apply changes & regenerate draft" from extracted fields. */
  showDraftResultHintAfterApplyRegenerate = false;

  private destroy$ = new Subject<void>();

  constructor(
    private ddcFlowService: DdcFlowService,
    private chatService: ChatService,
    private chatEditWorkflow: ChatEditWorkflowService,
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
    this.sowDraftVersions = [];
    this.selectedSowVersionIndex = 0;
    this.nextSowDraftMode = 'replace';
    this.extractedFieldsBaselineSnapshot = {};
    this.editingExtractedFields = false;
    this.editableExtractedStrings = {};
    this.lastScopeOfWorkFileName = '';
    this.showDraftResultHintAfterApplyRegenerate = false;
  }

  /** This flow is SOW-only; backend `contract_type` always has `statement_of_work: true`. */
  getContractTypeFlags(): ContractTypeFlags {
    return {
      statement_of_work: true,
      engagement_letter: false,
      master_services_agreement: false,
      non_disclosure_agreement: false,
      product_license_agreement: false,
    };
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

  /** True when the selected draft is the latest (edits / resume baseline apply here only). */
  isViewingLatestSowVersion(): boolean {
    return (
      this.sowDraftVersions.length > 0 &&
      this.selectedSowVersionIndex === this.sowDraftVersions.length - 1
    );
  }

  /** While a new version is being generated, keep prior version(s) in tabs but hide the body. */
  showRegeneratingPlaceholder(): boolean {
    return this.isGenerating && this.nextSowDraftMode === 'append';
  }

  selectSowVersion(index: number): void {
    if (index < 0 || index >= this.sowDraftVersions.length) {
      return;
    }
    this.selectedSowVersionIndex = index;
    const v = this.sowDraftVersions[index];
    this.extractedFieldsState = JSON.parse(JSON.stringify(v.extractedFields)) as Record<string, unknown>;
    this.setDraftHtmlFromMarkdown(v.markdown);
    this.cancelEditingExtractedFields();
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
      if (this.sowDraftVersions.length > 0) {
        const last = this.sowDraftVersions[this.sowDraftVersions.length - 1];
        this.selectedSowVersionIndex = this.sowDraftVersions.length - 1;
        this.setDraftHtmlFromMarkdown(last.markdown);
      } else {
        this.draftMarkdown = '';
        this.draftHtmlSafe = null;
      }
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
      const extracted = {
        ...((res['extracted_fields'] as Record<string, unknown>) || {}),
      };
      const content = (res['draft_content'] as string) || '';
      const entry: SowDraftVersion = {
        markdown: content,
        extractedFields: extracted,
      };

      if (this.nextSowDraftMode === 'append' && this.sowDraftVersions.length > 0) {
        this.sowDraftVersions = [...this.sowDraftVersions, entry];
      } else {
        this.sowDraftVersions = [entry];
      }
      this.selectedSowVersionIndex = this.sowDraftVersions.length - 1;
      this.nextSowDraftMode = 'replace';

      this.extractedFieldsState = JSON.parse(JSON.stringify(extracted)) as Record<string, unknown>;
      this.extractedFieldsBaselineSnapshot = JSON.parse(
        JSON.stringify(extracted)
      ) as Record<string, unknown>;
      this.editingExtractedFields = false;
      this.editableExtractedStrings = {};
      this.setDraftHtmlFromMarkdown(content);
      this.generatedContent = '';
      return;
    }
    this.generatedContent =
      'Unexpected response from contract draft service. Please try again or contact support.';
  }

  async generate(): Promise<void> {
    if (!this.canGenerate || !this.scopeOfWorkFile) {
      return;
    }

    this.nextSowDraftMode = 'replace';
    this.isGenerating = true;
    this.generatedContent = '';
    this.showMissingFieldsStep = false;
    this.showDraftResultHintAfterApplyRegenerate = false;

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
      this.sowDraftVersions = [];
      this.selectedSowVersionIndex = 0;
    } finally {
      this.isGenerating = false;
    }
  }

  async submitMissingFields(): Promise<void> {
    if (!this.canSubmitMissingFields) {
      return;
    }

    this.nextSowDraftMode = this.sowDraftVersions.length > 0 ? 'append' : 'replace';

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

  /**
   * Send the draft for the **currently selected version** to the main chat via TL chat bridge
   * (same path as guided TL content). Closes the SOW modal without prefilling the composer.
   */
  generateSowInChat(): void {
    const v = this.sowDraftVersions[this.selectedSowVersionIndex];
    const body = v?.markdown?.trim() || this.draftMarkdown?.trim();
    if (!body) {
      return;
    }
    const versionNumber = this.selectedSowVersionIndex + 1;
    this.chatEditWorkflow.pushSowDraftToChat(body, versionNumber);
    this.ddcFlowService.closeFlow();
  }

  startEditingExtractedFields(): void {
    if (!this.isViewingLatestSowVersion()) {
      return;
    }
    this.editingExtractedFields = true;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.extractedFieldsState)) {
      next[k] = this.formatFieldForInput(v);
    }
    this.editableExtractedStrings = next;
  }

  cancelEditingExtractedFields(): void {
    this.editingExtractedFields = false;
    this.editableExtractedStrings = {};
  }

  onEditableExtractedChange(key: string, value: string): void {
    this.editableExtractedStrings = { ...this.editableExtractedStrings, [key]: value };
  }

  async applyExtractedEditsAndRegenerate(): Promise<void> {
    if (!this.editingExtractedFields || !this.isViewingLatestSowVersion()) {
      return;
    }

    this.nextSowDraftMode = 'append';

    const user_filled_fields: Record<string, unknown> = {};
    for (const key of Object.keys(this.editableExtractedStrings)) {
      const orig = this.extractedFieldsBaselineSnapshot[key];
      user_filled_fields[key] = this.parseEditableFieldValue(this.editableExtractedStrings[key], orig);
    }

    this.isGenerating = true;
    try {
      const res = (await firstValueFrom(
        this.chatService.postContractDraftResume({
          contract_type: this.getContractTypeFlags(),
          prid: this.prid.trim(),
          flex_id: this.flexId.trim(),
          extracted_fields: JSON.parse(JSON.stringify(this.extractedFieldsBaselineSnapshot)) as Record<
            string,
            unknown
          >,
          user_filled_fields,
        })
      )) as Record<string, unknown>;

      this.handleDraftResponse(res);
      this.cancelEditingExtractedFields();
      if (String(res['status'] ?? '').trim() === 'draft_generated') {
        this.showDraftResultHintAfterApplyRegenerate = true;
      }
    } catch (e) {
      console.error('[SlideCreationPromptFlow] Regenerate from edited fields failed', e);
      this.generatedContent =
        'An error occurred while regenerating the draft. Please try again.';
    } finally {
      this.isGenerating = false;
    }
  }

  private formatFieldForInput(v: unknown): string {
    if (v === null || v === undefined) {
      return '';
    }
    if (typeof v === 'object') {
      return JSON.stringify(v);
    }
    return String(v);
  }

  private parseEditableFieldValue(raw: string, original: unknown): unknown {
    const s = raw.trim();
    if (original === undefined) {
      if (s === '') {
        return '';
      }
      try {
        return JSON.parse(s);
      } catch {
        return s;
      }
    }
    if (original === null && s === '') {
      return null;
    }
    if (typeof original === 'number') {
      const n = Number(s);
      return Number.isNaN(n) ? original : n;
    }
    if (typeof original === 'boolean') {
      const low = s.toLowerCase();
      return low === 'true' || low === '1' || low === 'yes';
    }
    if (original !== null && typeof original === 'object') {
      try {
        return JSON.parse(s || 'null');
      } catch {
        return raw;
      }
    }
    return s;
  }

  /** Entries for *ngFor over extracted_fields (object keys) */
  extractedFieldEntries(): { key: string; value: unknown }[] {
    return Object.entries(this.extractedFieldsState).map(([key, value]) => ({ key, value }));
  }
}
