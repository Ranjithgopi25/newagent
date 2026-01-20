import { Component, OnInit, ChangeDetectorRef  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TlFlowService } from '../../../core/services/tl-flow.service';
import { ChatService } from '../../../core/services/chat.service';
import { TlChatBridgeService } from '../../../core/services/tl-chat-bridge.service';
import { AuthFetchService } from '../../../core/services/auth-fetch.service';
import { ThoughtLeadershipMetadata } from '../../../core/models';
import { FileUploadComponent } from '../../../shared/ui/components/file-upload/file-upload.component';
import { EditorProgressItem } from '../../../shared/ui/components/editor-progress/editor-progress.component'; // EditorProgressComponent removed - not used in template
import { normalizeEditorOrder, normalizeContent, EditorType, extractDocumentTitle, getEditorDisplayName, formatMarkdown, convertMarkdownToHtml, extractFileText, parseEditorialFeedback, renderEditorialFeedbackHtml, EditorialFeedbackItem, formatFinalArticleWithBlockTypes, BlockTypeInfo } from '../../../core/utils/edit-content.utils';
import { 
  createParagraphEditsFromComparison, 
  allParagraphsDecided,
  validateStringEquality
} from '../../../core/utils/paragraph-edit.utils';
import { ParagraphEdit } from '../../../core/models/message.model';
import { environment } from '../../../../environments/environment';
interface EditForm {
  selectedEditors: EditorType[];
  uploadedFile: File | null;
}

interface ParagraphFeedback {
  index: number;
  original: string;
  edited: string;
  tags: string[];
  autoApproved: boolean;
  approved?: boolean | null;
  block_type?: string;
  level?: number;
  editorial_feedback: {
    development?: any[];
    content?: any[];
    copy?: any[];
    line?: any[];
    brand?: any[];
  };
  displayOriginal?: string;
  displayEdited?: string;
}

@Component({
  selector: 'app-edit-content-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent], // EditorProgressComponent removed - not used in template
  templateUrl: './edit-content-flow.component.html',
  styleUrls: ['./edit-content-flow.component.scss']
})
export class EditContentFlowComponent implements OnInit {
  isGenerating: boolean = false;
  editFeedback: string = '';
  feedbackItems: EditorialFeedbackItem[] = [];
  feedbackHtml: string = '';
  revisedContent: string = '';
  originalContent: string = '';
  iterationCount: number = 0;
  showSatisfactionPrompt: boolean = false;
  showImprovementInput: boolean = false;
  improvementRequestText: string = '';
  fileUploadError: string = '';
  uploadedFileSize: string = '';
  MAX_FILE_SIZE_MB: number = 5;
  editorProgressList: EditorProgressItem[] = [];
  currentEditorIndex: number = 0;
  totalEditors: number = 0;
  currentEditorId: string = '';
  
  // Sequential workflow properties
  threadId: string | null = null;
  currentEditor: string | null = null;
  isSequentialMode: boolean = false;
  isLastEditor: boolean = false;
  
  paragraphFeedbackData: ParagraphFeedback[] = [];
  paragraphEdits: ParagraphEdit[] = [];
  showFinalOutput: boolean = false;
  finalArticle: string = '';
  isGeneratingFinal: boolean = false;

  /** Paragraphs that require review (exclude autoApproved) */
  private get reviewParagraphs(): ParagraphFeedback[] {
    return (this.paragraphFeedbackData || [])
      .filter(p => p.autoApproved !== true)
      .sort((a, b) => a.index - b.index);
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

  
  formData: EditForm = {
    selectedEditors: ['development', 'content', 'line', 'copy', 'brand-alignment'],
    uploadedFile: null
  };
  
  fileReadError: string = '';

  // Notification properties
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';

  isCopied: boolean = false;


  editorTypes: { id: EditorType; name: string; icon: string; description: string; details: string; disabled: boolean }[] = [
    { 
      id: 'development' as EditorType, 
      name: 'Development Editor', 
      icon: '🚀', 
      description: 'Reviews and restructures content for alignment and coherence',
      details: 'Reviews: thought leadership quality, competitive differentiation, risk words (guarantee/promise/always), China terminology',
      disabled: false
    },
    { 
      id: 'content' as EditorType, 
      name: 'Content Editor', 
      icon: '📄', 
      description: "Refines language to align with author's key objectives",
      details: 'Validates: mutually exclusive/collectively exhaustive structure, source citations, evidence quality, argument logic',
      disabled: false
    },
    { 
      id: 'line' as EditorType, 
      name: 'Line Editor', 
      icon: '📝', 
      description: 'Improves sentence flow, readability, and style preserving voice',
      details: 'Improves: active voice throughout, sentence length, precise word choice, paragraph structure, transitional phrases',
      disabled: false
    },
    { 
      id: 'copy' as EditorType, 
      name: 'Copy Editor', 
      icon: '✏️', 
      description: 'Corrects grammar, punctuation, and typos',
      details: 'Enforces: Oxford commas, apostrophes, em dashes, sentence case headlines, date formats, abbreviations, active voice',
      disabled: false
    },
    { 
      id: 'brand-alignment' as EditorType, 
      name: 'PwC Brand Alignment Editor', 
      icon: '🎯', 
      description: 'Aligns content writing standards with PwC brand',
      details: 'Checks: we/you language, contractions, active voice, prohibited words (catalyst, PwC Network), China references, brand messaging',
      disabled: true
    }
  ];

  constructor(
    public tlFlowService: TlFlowService,
    private chatService: ChatService,
    private tlChatBridge: TlChatBridgeService,
    private cdr: ChangeDetectorRef,
    private authFetchService: AuthFetchService
  ) {}

  ngOnInit(): void {
    // this.paragraphFeedbackData.forEach(para => {
    //   // Add these properties so Angular/TypeScript knows they exist
    //   para.displayOriginal = para.original;
    //   para.displayEdited = para.edited;
    // });
  }

  get isOpen(): boolean {
    return this.tlFlowService.currentFlow === 'edit-content';
  }

  onClose(): void {
    this.resetForm();
    this.tlFlowService.closeFlow();
  }

  back(): void{
    this.resetForm();
    this.tlFlowService.closeFlow();
    this.tlFlowService.openGuidedDialog();
  }

  resetForm(): void {
    this.isGenerating = false;
    this.editFeedback = '';
    this.feedbackItems = [];
    this.feedbackHtml = '';
    this.revisedContent = '';
    this.originalContent = '';
    this.fileReadError = '';
    this.fileUploadError = '';
    this.uploadedFileSize = '';
    this.iterationCount = 0;
    this.showSatisfactionPrompt = false;
    this.showImprovementInput = false;
    this.improvementRequestText = '';
    this.paragraphEdits = [];
    this.paragraphFeedbackData = [];
    this.showFinalOutput = false;
    this.finalArticle = '';
    this.isGeneratingFinal = false;
    this.editorProgressList = [];
    this.currentEditorIndex = 0;
    this.totalEditors = 0;
    this.currentEditorId = '';
    this.isCopied = false;
    this.formData = {
      selectedEditors: ['development', 'content', 'line', 'copy', 'brand-alignment'],
      uploadedFile: null
    };
  }

  canEdit(): boolean {
    return this.formData.uploadedFile !== null && this.formData.selectedEditors.length > 0;
  }

  clearUploadError(): void {
    this.fileUploadError = '';
  }

  clearReadError(): void {
    this.fileReadError = '';
  }
  
  onFileSelect(file: File): void {
    if (file) {
      // Reset error states
      this.fileReadError = '';
      this.fileUploadError = '';
      
      // Calculate and display file size
      this.uploadedFileSize = this.formatFileSize(file.size);
      this.formData.uploadedFile = file;
    }
  }

  formatFileSize(bytes: number): string {
     if (bytes === 0) return '0 Bytes';
    
    // Show exact size in KB (no rounding)
    if (bytes < 1024) {
      return bytes + ' Bytes';
    } else if (bytes < 1024 * 1024) {
      // Exact KB with decimal precision
      const kb = bytes / 1024;
      return kb.toFixed(2) + ' KB';
    } else {
      // For MB and above, show with 2 decimal places
      const mb = bytes / (1024 * 1024);
      return mb.toFixed(2) + ' MB';
    }
  }

  /** Toggle editor selection, ensuring brand-alignment is always included */
  toggleEditor(type: EditorType): void {
    if (type === 'brand-alignment') {
      return;
    }
    
    const index = this.formData.selectedEditors.indexOf(type);
    if (index > -1) {
      this.formData.selectedEditors.splice(index, 1);
    } else {
      this.formData.selectedEditors.push(type);
    }
    
    if (!this.formData.selectedEditors.includes('brand-alignment')) {
      this.formData.selectedEditors.push('brand-alignment');
    }
  }

  isEditorSelected(type: EditorType): boolean {
    return this.formData.selectedEditors.includes(type);
  }

  /** Get selectable editors (excluding brand-alignment which is always enabled) */
  get selectableEditors(): { id: EditorType; name: string; icon: string; description: string; details: string; disabled: boolean }[] {
    return this.editorTypes.filter(editor => editor.id !== 'brand-alignment');
  }

  /** Get brand alignment editor info */
  get brandAlignmentEditor(): { id: EditorType; name: string; icon: string; description: string; details: string; disabled: boolean } | undefined {
    return this.editorTypes.find(editor => editor.id === 'brand-alignment');
  }

  /** Get selected editors in normalized order (for timeline display) */
  get selectedEditorsForTimeline(): { id: EditorType; name: string; icon: string; description: string; details: string; disabled: boolean }[] {
    if (!this.formData.selectedEditors || this.formData.selectedEditors.length === 0) {
      return [];
    }
    
    // Normalize order to match processing order
    const normalizedOrder = normalizeEditorOrder([...this.formData.selectedEditors]) as EditorType[];
    
    // Map to full editor info objects
    return normalizedOrder.map(editorId => {
      const editor = this.editorTypes.find(e => e.id === editorId);
      return editor || {
        id: editorId,
        name: getEditorDisplayName(editorId),
        icon: '',
        description: '',
        details: '',
        disabled: false
      };
    });
  }

  /** Steps array for editor timeline (0..totalEditors-1) */
  get editorSteps(): number[] {
    const total = this.totalEditors || 0;
    if (total <= 0) return [];
    return Array.from({ length: total }, (_, i) => i);
  }


  getEditorNames(): string {
    if (this.formData.selectedEditors.length === 0) return '';
    if (this.formData.selectedEditors.length === 1) {
      const editor = this.editorTypes.find(e => e.id === this.formData.selectedEditors[0]);
      return editor ? editor.name : '';
    }
    return `${this.formData.selectedEditors.length} editors`;
  }
  
  getSatisfactionPromptText(): string {
    if (this.iterationCount === 1) {
      return 'Are you satisfied with the edited document output, or do you need additional updates?';
    }
    return `Are you satisfied with this revision (Iteration ${this.iterationCount}), or do you need additional updates?`;
  }

  async editContent(): Promise<void> {
    this.isGenerating = true;
    this.fileReadError = '';
    this.fileUploadError = '';
    this.editFeedback = '';
    this.revisedContent = '';
    this.editorProgressList = [];
    this.currentEditorIndex = 0;
    this.totalEditors = 0;
    this.currentEditorId = '';
    
    let contentText = '';
    
    if (this.formData.uploadedFile) {
      // Validate file is not empty
      if (this.formData.uploadedFile.size === 0) {
        this.fileUploadError = 'The uploaded file is empty. Please upload a valid document with content.';
        this.isGenerating = false;
        return;
      }
      
      // Validate minimum file size (10 bytes)
      const MIN_FILE_SIZE = 10;
      if (this.formData.uploadedFile.size < MIN_FILE_SIZE) {
        this.fileUploadError = 'The uploaded file appears to be empty or corrupted. Please upload a valid document.';
        this.isGenerating = false;
        return;
      }
      
      // Validate maximum file size (5MB)
      const fileSizeMB = this.formData.uploadedFile.size / (1024 * 1024);
      if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
        this.fileUploadError = `File size exceeds the maximum limit of ${this.MAX_FILE_SIZE_MB}MB. Please upload a smaller file.`;
        this.isGenerating = false;
        return;
      }
      
      try {
        const extractedText = await extractFileText(this.formData.uploadedFile);
        contentText = normalizeContent(extractedText);
        
        // Validate extracted content is not empty
        if (!contentText || contentText.trim().length === 0) {
          this.fileUploadError = 'The uploaded document appears to be empty or contains no readable text. Please upload a document with content.';
          this.isGenerating = false;
          return;
        }
        
        // Validate minimum content length (50 characters for meaningful content)
        const MIN_CONTENT_LENGTH = 50;
        if (contentText.trim().length < MIN_CONTENT_LENGTH) {
          this.fileUploadError = `The uploaded document contains insufficient content (minimum ${MIN_CONTENT_LENGTH} characters required). Please upload a document with more text.`;
          this.isGenerating = false;
          return;
        }
        
        this.originalContent = contentText;
      } catch (error) {
        console.error('Error extracting file:', error);
        this.fileReadError = 'Error reading uploaded file. Please try again or upload a different format.';
        this.isGenerating = false;
        return;
      }
    }
    
    const messages = [{
      role: 'user' as const,
      content: contentText
    }];

    let fullResponse = '';
    const editorsToUse = normalizeEditorOrder(this.formData.selectedEditors) as EditorType[];

    this.editorProgressList = editorsToUse.map((id, index) => ({
      editorId: id,
      editorName: getEditorDisplayName(id),
      status: 'pending' as const,
      current: index + 1,
      total: editorsToUse.length
    }));
    this.totalEditors = editorsToUse.length;

    this.chatService.streamEditContent(messages, editorsToUse).subscribe({
      next: (data: any) => {
        if (data.type === 'editor_progress') {
          this.currentEditorIndex = data.current || 0;
          this.totalEditors = data.total || editorsToUse.length;
          this.currentEditorId = data.editor || '';
          
          this.editorProgressList.forEach((editor, index) => {
            const editorIndex = index + 1;
            if (editorIndex < this.currentEditorIndex) {
              editor.status = 'completed';
            } else if (editorIndex === this.currentEditorIndex) {
              editor.status = 'processing';
              editor.current = this.currentEditorIndex;
              editor.total = this.totalEditors;
            } else {
              editor.status = 'pending';
            }
          });

          this.cdr.detectChanges();
        } else if (data.type === 'editor_content') {
          if (data.content) {
            fullResponse += data.content;
          }
        } else if (data.type === 'editor_complete') {
          // Sequential workflow: Handle single editor completion
          console.log('[EditContentFlow] Editor complete:', data);
          
          // Store thread_id for sequential workflow
          if (data.thread_id) {
            this.threadId = data.thread_id;
            this.isSequentialMode = true;
          }
          
          // Store current editor info
          if (data.current_editor) {
            this.currentEditor = data.current_editor;
            this.currentEditorIndex = data.editor_index || 0;
            this.totalEditors = data.total_editors || this.totalEditors;
            this.isLastEditor = (data.editor_index || 0) >= (data.total_editors || 1) - 1;
          }
          
          // Update editor progress
          const completedEditor = this.editorProgressList.find(e => e.editorId === data.current_editor);
          if (completedEditor) {
            completedEditor.status = 'completed';
          }
          
          // Process paragraph edits (same structure as final_complete)
          if (data.paragraph_edits && Array.isArray(data.paragraph_edits)) {
            console.log('[EditContentFlow] Paragraph edits received:', data.paragraph_edits);
            this.paragraphFeedbackData = this.processParagraphEdits(data.paragraph_edits);
          }
          
          // Update content
          if (data.original_content) {
            this.originalContent = data.original_content;
          }
          
          if (data.final_revised) {
            const trimmedRevised = data.final_revised.trim();
            fullResponse = trimmedRevised;
            this.revisedContent = convertMarkdownToHtml(trimmedRevised);
          }
          
          // Process feedback (only current editor's feedback)
          if (data.combined_feedback) {
            const feedbackContent = data.combined_feedback.trim();
            this.feedbackItems = parseEditorialFeedback(feedbackContent);
            this.feedbackHtml = renderEditorialFeedbackHtml(this.feedbackItems);
            this.editFeedback = this.feedbackHtml;
          }
          
          this.isGenerating = false;
          this.cdr.detectChanges();
        } else if (data.type === 'editor_error') {
          console.error(`${data.editor} editor error:`, data.error);
        } else if (data.type === 'final_complete') {
          this.editorProgressList.forEach(editor => {
            if (editor.status !== 'error') {
              editor.status = 'completed';
            }
          });
          this.currentEditorId = 'completed';
          this.cdr.detectChanges();
          
          if (data.combined_feedback) {
            const feedbackContent = data.combined_feedback.trim();
            // parse and render structured feedback; keep legacy fallback in editFeedback
            this.feedbackItems = parseEditorialFeedback(feedbackContent);
            this.feedbackHtml = renderEditorialFeedbackHtml(this.feedbackItems);
            this.editFeedback = this.feedbackHtml;
          }
          
          if (data.paragraph_edits && Array.isArray(data.paragraph_edits)) {
            console.log('Paragraph edits received:', data.paragraph_edits);
            this.paragraphFeedbackData = this.processParagraphEdits(data.paragraph_edits);
          } else if (data.final_revised && data.original_content) {
            this.paragraphEdits = this.createParagraphEditsFromComparison(
              data.original_content,
              data.final_revised
            );
          }
          
          if (data.original_content) {
            this.originalContent = data.original_content;
          }
          
          if (data.final_revised) {
            const trimmedRevised = data.final_revised.trim();
            fullResponse = trimmedRevised;
            this.revisedContent = convertMarkdownToHtml(trimmedRevised);
          }
          
          this.isGenerating = false;
        } else if (data?.type === 'content' && data.content) {
          fullResponse += data.content;
        } else if (data?.type === 'done' || data?.done) {
          return;
        } else if (data?.error) {
          this.editFeedback = `❌ Error: ${data.error}`;
          this.isGenerating = false;
          return;
        } else if (typeof data === 'string') {
          fullResponse += data;
        }
      },
      error: (error: any) => {
        console.error('[EditContentFlow] Streaming error:', error);
        this.editFeedback = 'Sorry, there was an error editing your content. Please try again.';
        this.isGenerating = false;
      },
      complete: () => {
        this.iterationCount++;
        if (this.revisedContent && this.revisedContent.trim()) {
          this.showSatisfactionPrompt = true;
        }
      }
    });
  }

  /** Parse edit response (fallback method for old format or improvement requests) */
  private parseEditResponse(response: string): void {
    if (!response || !response.trim()) {
      return;
    }

    const feedbackMatch = response.match(/===\s*FEEDBACK\s*===\s*([\s\S]*?)(?====\s*REVISED ARTICLE\s*===|$)/i);
    const revisedMatch = response.match(/===\s*REVISED ARTICLE\s*===\s*([\s\S]*?)$/i);
    
    if (feedbackMatch && feedbackMatch[1]) {
      const feedbackContent = feedbackMatch[1].trim();
      this.feedbackItems = parseEditorialFeedback(feedbackContent);
      this.feedbackHtml = renderEditorialFeedbackHtml(this.feedbackItems);
      this.editFeedback = this.feedbackHtml;
    } else if (!revisedMatch && response.trim()) {
      const feedbackContent = response.trim();
      this.feedbackItems = parseEditorialFeedback(feedbackContent);
      this.feedbackHtml = renderEditorialFeedbackHtml(this.feedbackItems);
      this.editFeedback = this.feedbackHtml;
    }
    
    if (revisedMatch && revisedMatch[1]) {
      let revisedText = revisedMatch[1].trim();
      revisedText = revisedText
        .replace(/===\s*FEEDBACK\s*===/gi, '')
        .replace(/##\s*📝\s*Editorial\s*Feedback/gi, '')
        .trim();
      this.revisedContent = convertMarkdownToHtml(revisedText);
    }
  }

  /** Convert markdown to HTML (public method for template) */
  convertMarkdownToHtml(markdown: string): string {
    return convertMarkdownToHtml(markdown);
  }

  /** Copy content to clipboard */
  async copyToClipboard(): Promise<void>  {
    let content = '';
    if (this.showFinalOutput && this.finalArticle) {
      content = this.finalArticle;
    } else {
      content = this.revisedContent || this.editFeedback;
    }
    const plainText = content.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    try {
      await navigator.clipboard.writeText(plainText);
      
      this.isCopied = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.isCopied = false;
        this.cdr.detectChanges();
      },2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showNotificationMessage('Failed to copy ', 'error');
    }

  }

  /** Download revised content as DOCX or PDF */
  async downloadRevised(format: 'docx' | 'pdf'): Promise<void> {
    let contentToDownload = '';
    if (this.showFinalOutput && this.finalArticle) {
      contentToDownload = this.finalArticle;
    } else if (this.revisedContent) {
      contentToDownload = this.revisedContent.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    } else {
      this.showNotificationMessage('article is not available yet.', 'error');
      return;
    }

    const plainText = contentToDownload.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    const endpoint = format === 'docx' ? '/api/v1/export/word' : '/api/v1/export/pdf-pwc';
    const extension = format === 'docx' ? 'docx' : 'pdf';
    const title = 'revised-article';
    
    // Extract first line as subtitle
    const lines = plainText.split('\n').filter(line => line.trim());
    const subtitle = lines.length > 0 ? lines[0].substring(0, 150) : ''; // First line, max 150 chars

    // Get API URL from environment (supports runtime config via window._env)
    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    const fullEndpoint = `${apiUrl}${endpoint}`;

    try {
      const response = await this.authFetchService.authenticatedFetch(fullEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          content: plainText,
          title,
          subtitle
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate ${extension.toUpperCase()} document`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}.${extension}`;
      link.click();
      window.URL.revokeObjectURL(url);
      this.showNotificationMessage(`${extension.toUpperCase()} downloaded successfully!`, 'success');
    } catch (error) {
      console.error(`Error generating ${extension.toUpperCase()}:`, error);
      this.showNotificationMessage(`Failed to generate ${extension.toUpperCase()} file. Please try again.`, 'error');
    }
  }
  
  /** Handle satisfaction response - send to chat or show improvement input */
  // onSatisfactionResponse(isSatisfied: boolean): void {
  //   if (isSatisfied) {
  //     const contentToSend = (this.showFinalOutput && this.finalArticle) 
  //       ? this.finalArticle 
  //       : this.revisedContent;
      
  //     if (contentToSend && contentToSend.trim()) {
  //       let plainText = contentToSend;
  //       if (contentToSend.includes('<')) {
  //         const tempDiv = document.createElement('div');
  //         tempDiv.innerHTML = contentToSend;
  //         plainText = tempDiv.textContent || tempDiv.innerText || '';
  //       }
  //       plainText = plainText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
        
  //       const headerLines: string[] = ['### Guided Journey – Edit Content'];
  //       const uploadedFileName = this.formData.uploadedFile?.name;
  //       if (uploadedFileName) {
  //         headerLines.push(`_Source: ${uploadedFileName}_`);
  //       }
        
  //       const selectedEditorNames = this.formData.selectedEditors
  //         .map(id => {
  //           const editor = this.editorTypes.find(e => e.id === id);
  //           return editor ? editor.name : id;
  //         })
  //         .join(', ');
        
  //       if (selectedEditorNames) {
  //         headerLines.push(`_Editors Applied: ${selectedEditorNames}_`);
  //       }
        
  //       const articleTitle = this.showFinalOutput ? 'Final Revised Article' : 'Revised Article';
  //       headerLines.push('', `**${articleTitle}**`, '');
        
  //       const documentTitle = extractDocumentTitle(
  //         this.originalContent || '',
  //         uploadedFileName
  //       );
        
  //       if (documentTitle && documentTitle !== articleTitle) {
  //         headerLines.push(`**${documentTitle}**`, '');
  //       }
        
  //       const headerHtml = convertMarkdownToHtml(headerLines.join('\n'));
  //       const contentHtml = this.showFinalOutput && this.finalArticle
  //         ? convertMarkdownToHtml(this.finalArticle)
  //         : this.revisedContent;
  //       const combinedHtml = `${headerHtml}${contentHtml}`;
        
  //       const revisedMetadata: ThoughtLeadershipMetadata = {
  //         contentType: 'article',
  //         topic: documentTitle || articleTitle,
  //         fullContent: plainText,
  //         showActions: true
  //       };
        
  //       this.tlChatBridge.sendMessage({
  //         role: 'assistant',
  //         content: combinedHtml,
  //         timestamp: new Date(),
  //         isHtml: true,
  //         thoughtLeadership: revisedMetadata
  //       });
  //     }
      
  //     this.onClose();
  //   } else {
  //     this.showImprovementInput = true;
  //     this.showSatisfactionPrompt = false;
  //   }
  // }
  
  submitImprovementRequest(): void {
    if (!this.improvementRequestText?.trim()) {
      return;
    }
    
    const nextIteration = this.iterationCount + 1;
    if (nextIteration > 5) {
      alert('You have reached the maximum number of iterations (5). Please start a new edit workflow if you need further changes.');
      this.cancelImprovementRequest();
      return;
    }
    
    const revisedPlainText = this.revisedContent.replace(/<br>/g, '\n');
    const improvementMessage = `Please review the following revised article and apply these additional improvements:\n\n${this.improvementRequestText.trim()}\n\nRevised Article:\n${revisedPlainText}`;
    
    const messages = [{
      role: 'user' as const,
      content: improvementMessage
    }];
    
    this.isGenerating = true;
    this.showImprovementInput = false;
    this.improvementRequestText = '';
    this.editFeedback = '';
    this.revisedContent = '';
    
    let fullResponse = '';
    const editorsToUse = normalizeEditorOrder(this.formData.selectedEditors) as EditorType[];

    this.chatService.streamEditContent(messages, editorsToUse).subscribe({
      next: (data: any) => {
        if (data.type === 'editor_progress') {
        } else if (data.type === 'editor_content') {
          if (data.content) {
            fullResponse += data.content;
          }
        } else if (data.type === 'editor_complete') {
          if (data.revised_content) {
            fullResponse = data.revised_content;
            this.revisedContent = convertMarkdownToHtml(fullResponse);
          }
        } else if (data.type === 'editor_error') {
          console.error(`${data.editor} editor error:`, data.error);
        } else if (data.type === 'final_complete') {
          if (data.final_revised) {
            fullResponse = data.final_revised;
            this.revisedContent = convertMarkdownToHtml(fullResponse);
          }
          if (data.combined_feedback) {
            const feedbackContent = data.combined_feedback.trim();
            this.feedbackItems = parseEditorialFeedback(feedbackContent);
            this.feedbackHtml = renderEditorialFeedbackHtml(this.feedbackItems);
            this.editFeedback = this.feedbackHtml;
          }
        } else if (data.type === 'content' && data.content) {
          fullResponse += data.content;
        } else if (typeof data === 'string') {
          fullResponse += data;
        }
      },
      error: (error: any) => {
        console.error('Error improving content:', error);
        this.editFeedback = 'Sorry, there was an error processing your improvement request. Please try again.';
        this.isGenerating = false;
        this.revisedContent = revisedPlainText.replace(/\n/g, '<br>');
        this.showSatisfactionPrompt = true;
      },
      complete: () => {
        if (!this.revisedContent && fullResponse) {
          this.parseEditResponse(fullResponse);
        }
        this.isGenerating = false;
        this.iterationCount = nextIteration;
        if (!this.revisedContent || !this.revisedContent.trim()) {
          this.revisedContent = revisedPlainText.replace(/\n/g, '<br>');
        }
        this.showSatisfactionPrompt = true;
      }
    });
  }
  
  cancelImprovementRequest(): void {
    this.showImprovementInput = false;
    this.improvementRequestText = '';
    this.showSatisfactionPrompt = true;
  }
  
  /** Create paragraph edits by comparing original and edited content */
  private createParagraphEditsFromComparison(original: string, edited: string): ParagraphEdit[] {
    const allEditorNames = this.formData.selectedEditors.map(editorId => {
      const editor = this.editorTypes.find(e => e.id === editorId);
      return editor ? editor.name : editorId;
    });
    
    return createParagraphEditsFromComparison(original, edited, allEditorNames);
  }
  
  /** Approve a paragraph edit */
  approveParagraph(index: number): void {
    const paragraph = this.paragraphEdits.find(p => p.index === index);
    if (!paragraph) {
      return;
    }
    paragraph.approved = true; 
  }
  
  /** Decline a paragraph edit */
  declineParagraph(index: number): void {
    const paragraph = this.paragraphEdits.find(p => p.index === index);
    if (!paragraph) {
      return;
    }
    paragraph.approved = false;
  }

  /** Get paragraphs that require user review (excludes auto-approved), sorted by index */
  get getParagraphsForReview(): ParagraphEdit[] {
    return this.paragraphEdits
      .filter(p => p.autoApproved !== true)
      .sort((a, b) => a.index - b.index);
  }
  
  /** Get count of auto-approved paragraphs */
  get autoApprovedCount(): number {
    return this.paragraphEdits.filter(p => p.autoApproved === true).length;
  }
  
  /** Get auto-approved count text with proper pluralization */
  get autoApprovedText(): string {
    const count = this.autoApprovedCount;
    if (count === 0) {
      return '';
    }
    return `(${count} paragraph${count !== 1 ? 's' : ''} auto-approved)`;
  }

  /** Get paragraphs that require user review (excludes auto-approved), sorted by index */
  get getParagraphsForFeedbackReview(): ParagraphFeedback[] {
    return this.paragraphFeedbackData
      .filter(p => p.autoApproved !== true)
      .sort((a, b) => a.index - b.index);
  }

  /** Get count of auto-approved paragraphs in feedback data */
  get autoApprovedFeedbackCount(): number {
    return this.paragraphFeedbackData.filter(
      p => p.autoApproved === true
    ).length;
  }

  /** Get auto-approved count text for feedback data */
  get autoApprovedFeedbackText(): string {
    const count = this.autoApprovedFeedbackCount;

    if (count === 0) {
      return '';
    }

    return `(${count} paragraph${count !== 1 ? 's' : ''} auto-approved)`;
  }
  
  /** Check if all paragraphs have been decided */
  get allParagraphsDecided(): boolean {
    // Check both paragraphEdits and paragraphFeedbackData
    const editsDecided = this.paragraphEdits.length === 0 || allParagraphsDecided(this.paragraphEdits);
    const feedbackDecided = this.allParagraphFeedbackDecided;
    return editsDecided && feedbackDecided;
  }

  /** Check if all paragraph feedback items are decided */
  get allParagraphFeedbackDecided(): boolean {
    if (!this.paragraphFeedbackData || this.paragraphFeedbackData.length === 0) {
      return true; // No feedback to decide
    }
    
    return this.paragraphFeedbackData.every(para => {
      // Check if paragraph itself is decided
      if (para.approved === null || para.approved === undefined) {
        return false;
      }
      
      // Check if all editorial feedback items are decided
      const feedbackTypes = Object.keys(para.editorial_feedback || {});
      for (const editorType of feedbackTypes) {
        const feedbacks = (para.editorial_feedback as any)[editorType] || [];
        for (const fb of feedbacks) {
          if (fb.approved === null || fb.approved === undefined) {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  /** Check if all paragraphs are approved */
  get allParagraphsApproved(): boolean {
    return this.paragraphEdits.length > 0 && 
           this.paragraphEdits.every(p => p.approved === true);
  }
  
  /** Check if all paragraphs are declined */
  get allParagraphsDeclined(): boolean {
    return this.paragraphEdits.length > 0 && 
           this.paragraphEdits.every(p => p.approved === false);
  }

  get isImprovementRequestValid(): boolean {
    return !!this.improvementRequestText && this.improvementRequestText.trim().length > 0;
  }
  
  /** Approve all paragraph edits */
  approveAllParagraphs(): void {
    if (this.paragraphEdits.length === 0) {
      return;
    }
    
    this.paragraphEdits.forEach(paragraph => {
      paragraph.approved = true;
    });
  }
  
  /** Decline all paragraph edits */
  declineAllParagraphs(): void {
    if (this.paragraphEdits.length === 0) {
      return;
    }
    
    this.paragraphEdits.forEach(paragraph => {
      paragraph.approved = false;
    });
  }

  
  /** Generate final article using approved edits */
  async runFinalOutput(): Promise<void> {
    if (!this.allParagraphsDecided) {
      alert('Please approve or decline all paragraph edits before generating the final article.');
      return;
    }
    
    this.isGeneratingFinal = true;
    
    try {
      const decisions = this.paragraphEdits.map(p => ({
        index: p.index,
        approved: p.approved === true
      }));
      
      const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
      const response = await this.authFetchService.authenticatedFetch(`${apiUrl}/api/v1/tl/edit-content/final`, {
        method: 'POST',
        body: JSON.stringify({
          original_content: this.originalContent,
          paragraph_edits: this.paragraphEdits.map(p => ({
            index: p.index,
            original: p.original,
            edited: p.edited,
            tags: p.tags,
            autoApproved: p.autoApproved
          })),
          decisions: decisions
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to generate final article: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      const finalArticle = data.final_article || '';
      
      if (!finalArticle) {
        throw new Error('No final article returned from server');
      }
      
      // Collect block_type information from paragraphEdits
      const blockTypes: BlockTypeInfo[] = this.paragraphEdits.map(p => ({
        index: p.index,
        type: p.block_type || 'paragraph',
        level: p.level || 0
      }));
      
      // Apply block_type formatting to the final article
      this.finalArticle = formatFinalArticleWithBlockTypes(finalArticle, blockTypes);
      this.showFinalOutput = true;
      this.showSatisfactionPrompt = true;
    } catch (error) {
      console.error('Error generating final article:', error);
      const errorMessage = error instanceof Error 
        ? `Failed to generate final article: ${error.message}` 
        : 'Failed to generate final article. Please try again.';
      alert(errorMessage);
    } finally {
      this.isGeneratingFinal = false;
    }
  }

  /** Generate final article using approved edits and feedback */
  async generateFinalOutput(): Promise<void> {
    if (!this.allParagraphsDecided) {
      alert('Please approve or reject all paragraph edits and feedback before generating the final article.');
      return;
    }
    
    this.isGeneratingFinal = true;
    
    try {
      // Collect all approved/rejected decisions from paragraphFeedbackData
      const paragraphDecisions = this.paragraphFeedbackData.map(para => ({
        index: para.index,
        approved: para.approved === true,
        editorial_feedback_decisions: this.collectFeedbackDecisions(para)
      }));
      
      const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
      const response = await this.authFetchService.authenticatedFetch(`${apiUrl}/api/v1/tl/edit-content/final`, {
        method: 'POST',
        body: JSON.stringify({
          original_content: this.originalContent,
          paragraph_edits: this.paragraphFeedbackData.map(p => ({
            index: p.index,
            original: p.original,
            edited: p.edited,
            tags: p.tags,
            autoApproved: p.autoApproved,
            block_type: p.block_type || 'paragraph',
            level: p.level || 0,
            editorial_feedback: p.editorial_feedback
          })),
          decisions: paragraphDecisions,
          include_quality_checks: true,
          include_copy_check: true
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to generate final article: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      const finalArticle = data.final_article || '';
      
      if (!finalArticle) {
        throw new Error('No final article returned from server');
      }
      
      // Use backend's block_types (correctly aligned with final_article paragraph indices)
      // Backend constructs block_types as it builds final_article, ensuring 1:1 alignment
      let blockTypes: BlockTypeInfo[] = [];
      if (data.block_types && Array.isArray(data.block_types) && data.block_types.length > 0) {
        // Backend provides correctly aligned block_types with indices matching final_article split
        // IMPORTANT: Only default to 'paragraph' if type is truly missing (undefined/null), preserve actual values
        blockTypes = data.block_types.map((bt: any) => ({
          index: bt.index !== undefined && bt.index !== null ? bt.index : 0,
          type: (bt.type !== undefined && bt.type !== null && bt.type !== '') ? bt.type : 'paragraph',
          level: bt.level !== undefined && bt.level !== null ? bt.level : 0
        }));
        
        // Debug: Log block_types to verify they're not all 'paragraph'
        const typeCounts = blockTypes.reduce((acc, bt) => {
          acc[bt.type] = (acc[bt.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[EditContentFlow] Final article block_types distribution:', typeCounts);
        console.log('[EditContentFlow] Total block_types:', blockTypes.length, 'Sample:', blockTypes.slice(0, 5));
      } else {
        // Fallback: generate from paragraphFeedbackData (shouldn't happen if backend is working correctly)
        console.warn('[EditContentFlow] Backend did not provide block_types, falling back to paragraphFeedbackData');
        blockTypes = this.paragraphFeedbackData.map(p => ({
          index: p.index,
          type: p.block_type || 'paragraph',
          level: p.level || 0
        }));
      }
      
      // Apply block_type formatting to the final article
      const formattedContentHtml = formatFinalArticleWithBlockTypes(finalArticle.trim(), blockTypes);
      
      let plainText = finalArticle;
      if (finalArticle.includes('<')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = finalArticle;
        plainText = tempDiv.textContent || tempDiv.innerText || '';
      }
      plainText = plainText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
      
      // Build header with metadata
      const headerLines: string[] = ['### Guided Journey – Edit Content'];
      const uploadedFileName = this.formData.uploadedFile?.name;
      if (uploadedFileName) {
        headerLines.push(`_Source: ${uploadedFileName}_`);
      }
      
      headerLines.push('', '---', '');
      
      const documentTitle = extractDocumentTitle(
        this.originalContent || '',
        uploadedFileName
      );
      
      const headerHtml = convertMarkdownToHtml(headerLines.join('\n'));
      
      // // Use formatted content with block types
      const combinedHtml = `${headerHtml}${formattedContentHtml}`;
      
      const revisedMetadata: ThoughtLeadershipMetadata = {
        contentType: 'article',
        topic: documentTitle || 'Final Revised Article',
        fullContent: plainText,
        showActions: true,
        block_types: blockTypes  // Store block types for export formatting
      };
      
      // Send to chat
      this.tlChatBridge.sendMessage({
        role: 'assistant',
        content: combinedHtml,
        timestamp: new Date(),
        isHtml: true,
        thoughtLeadership: revisedMetadata
      });
      
      // Close the edit-content-flow component
      this.onClose();
    } catch (error) {
      console.error('Error generating final article:', error);
      const errorMessage = error instanceof Error 
        ? `Failed to generate final article: ${error.message}` 
        : 'Failed to generate final article. Please try again.';
      alert(errorMessage);
    } finally {
      this.isGeneratingFinal = false;
    }
  }



  /** Collect feedback decisions from a paragraph */
  private collectFeedbackDecisions(para: ParagraphFeedback): any {
    const decisions: any = {};
    const feedbackTypes = Object.keys(para.editorial_feedback || {});
    
    for (const editorType of feedbackTypes) {
      const feedbacks = (para.editorial_feedback as any)[editorType] || [];
      decisions[editorType] = feedbacks.map((fb: any) => ({
        issue: fb.issue,
        approved: fb.approved === true
      }));
    }
    
    return decisions;
  }

  /** Process paragraph edits from backend response (reusable helper) */
  private processParagraphEdits(paragraph_edits: any[]): ParagraphFeedback[] {
    // If API returned no paragraph edits at all, just clear the data array.
    // The template can show an inline "no feedback" message inside the paragraph box.
    if (!paragraph_edits || !Array.isArray(paragraph_edits) || paragraph_edits.length === 0) {
      return [];
    }

    const feedbackData: ParagraphFeedback[] = paragraph_edits.map((edit: any) => {
      const editorial_feedback = {
        development: edit.editorial_feedback?.development || [],
        content: edit.editorial_feedback?.content || [],
        copy: edit.editorial_feedback?.copy || [],
        line: edit.editorial_feedback?.line || [],
        brand: edit.editorial_feedback?.brand || []
      };

      return {
        index: edit.index || 0,
        original: edit.original || '',
        edited: edit.edited || '',
        tags: edit.tags || [],
        autoApproved: edit.autoApproved ?? false,
        approved: edit.approved ?? null,
        block_type: edit.block_type || 'paragraph',
        level: edit.level || 0,
        editorial_feedback
      };
    });

    return feedbackData;
  }

  /** True when there are no feedback items inside paragraphFeedbackData */
  get hasNoParagraphFeedback(): boolean {
    if (!this.paragraphFeedbackData || this.paragraphFeedbackData.length === 0) {
      return true;
    }

    // No editorial feedback items across all paragraphs
    return this.paragraphFeedbackData.every(para => {
      const types = Object.keys(para.editorial_feedback || {});
      return types.every(t => {
        const arr = (para.editorial_feedback as any)[t] || [];
        return !arr || arr.length === 0;
      });
    });
  }

  /** Move to next editor in sequential workflow */
  async nextEditor(): Promise<void> {
    if (!this.threadId) {
      console.error('[EditContentFlow] No thread_id available for next editor');
      return;
    }

    if (!this.allParagraphsDecided) {
      alert('Please approve or reject all paragraph edits before proceeding to the next editor.');
      return;
    }

    this.isGenerating = true;

    try {
      // Collect decisions from paragraphFeedbackData
      const decisions = this.paragraphFeedbackData.map(para => ({
        index: para.index,
        approved: para.approved === true
      }));

      // Prepare paragraph_edits
      const paragraph_edits = this.paragraphFeedbackData.map(para => ({
        index: para.index,
        original: para.original,
        edited: para.edited,
        tags: para.tags || [],
        autoApproved: para.autoApproved || false,
        approved: para.approved
      }));

      // Call /next endpoint via ChatService
      const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
      const response = await this.authFetchService.authenticatedFetch(`${apiUrl}/api/v1/tl/edit-content/next`, {
        method: 'POST',
        body: JSON.stringify({
          thread_id: this.threadId,
          paragraph_edits: paragraph_edits,
          decisions: decisions,
          accept_all: false,
          reject_all: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to proceed to next editor: ${response.status} ${errorText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr && dataStr !== '[DONE]') {
              try {
                const data = JSON.parse(dataStr);
                
                // Handle all_complete
                if (data.type === 'all_complete') {
                  this.isGenerating = false;
                  // Mark as last editor to show "Generate Final Output" button
                  this.isLastEditor = true;
                  this.currentEditorIndex = this.totalEditors;
                  this.cdr.detectChanges();
                  return;
                }

                // Handle editor_complete (same as initial flow)
                if (data.type === 'editor_complete') {
                  const scrollContainer = document.querySelector('.flow-content') || 
                                         document.querySelector('.flow-container') || 
                                         document.documentElement;
                  const scrollPosition = scrollContainer === document.documentElement
                    ? window.scrollY || window.pageYOffset 
                    : (scrollContainer as HTMLElement).scrollTop;

                  // Store thread_id
                  if (data.thread_id) {
                    this.threadId = data.thread_id;
                  }

                  // Store current editor info
                  if (data.current_editor) {
                    this.currentEditor = data.current_editor;
                    this.currentEditorIndex = data.editor_index || 0;
                    this.totalEditors = data.total_editors || this.totalEditors;
                    this.isLastEditor = (data.editor_index || 0) >= (data.total_editors || 1) - 1;
                  }

                  // Process paragraph edits
                  if (data.paragraph_edits && Array.isArray(data.paragraph_edits)) {
                    this.paragraphFeedbackData = this.processParagraphEdits(data.paragraph_edits);
                  }

                  // Update content
                  if (data.original_content) {
                    this.originalContent = data.original_content;
                  }

                  if (data.final_revised) {
                    this.revisedContent = convertMarkdownToHtml(data.final_revised.trim());
                  }

                  // Process feedback
                  if (data.combined_feedback) {
                    const feedbackContent = data.combined_feedback.trim();
                    this.feedbackItems = parseEditorialFeedback(feedbackContent);
                    this.feedbackHtml = renderEditorialFeedbackHtml(this.feedbackItems);
                    this.editFeedback = this.feedbackHtml;
                  }

                  this.isGenerating = false;
                  this.cdr.detectChanges();

                  setTimeout(() => {
                    const paragraphSection = document.getElementById('paragraph-feedback-section');
                    if (paragraphSection) {
                      paragraphSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start',
                        inline: 'nearest'
                      });
                    }
                  }, 100);


                }

                // Handle errors
                if (data.type === 'error') {
                  throw new Error(data.error || 'Unknown error');
                }
              } catch (e) {
                console.error('[EditContentFlow] Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[EditContentFlow] Error in nextEditor:', error);
      const errorMessage = error instanceof Error 
        ? `Failed to proceed to next editor: ${error.message}` 
        : 'Failed to proceed to next editor. Please try again.';
      alert(errorMessage);
      this.isGenerating = false;
    }
  }

  objectKeys = Object.keys;

  /** Get display name for editor */
  getEditorDisplayName(editorId: string | null): string {
    if (!editorId) return '';
    
    // Map editor IDs to display names
    const editorMap: { [key: string]: string } = {
      'development': 'Development Editor',
      'content': 'Content Editor',
      'line': 'Line Editor',
      'copy': 'Copy Editor',
      // 'brand': 'PwC Brand Alignment Editor',
      'brand-alignment': 'PwC Brand Alignment Editor'
    };
    
    return editorMap[editorId] || editorId;
  }

  /** Update paragraph's approved status based on its feedback items */
  private updateParagraphApprovedStatus(para: ParagraphFeedback): void {
    // Check if all feedback items in this paragraph are decided
    const feedbackTypes = Object.keys(para.editorial_feedback || {});
    let allDecided = true;
    let allApproved = true;
    let hasAnyFeedback = false;
    
    for (const editorType of feedbackTypes) {
      const feedbacks = (para.editorial_feedback as any)[editorType] || [];
      for (const fb of feedbacks) {
        hasAnyFeedback = true;
        if (fb.approved === null || fb.approved === undefined) {
          allDecided = false;
          break;
        } else if (fb.approved === false) {
          allApproved = false;
        }
      }
      if (!allDecided) break;
    }
    
    // If no feedback items exist, paragraph doesn't need approval
    if (!hasAnyFeedback) {
      para.approved = true; // No feedback means nothing to approve/reject
      return;
    }
    
    // If all feedback items are decided, set paragraph's approved status
    if (allDecided) {
      // Set to true if all are approved, false if any are rejected
      para.approved = allApproved;
    } else {
      // If not all feedback items are decided, reset paragraph approval to null
      // This ensures the getter properly reflects that decisions are incomplete
      para.approved = null;
    }
  }


  approveEditorialFeedback(para: any, editorType: string, fb: any) {
    // Prevent changes after final output is generated
    if (this.showFinalOutput) {
      return;
    }
    
    // Toggle: If already approved, uncheck it (set to null for unreviewed/yellow)
    if (fb.approved === true) {
      fb.approved = null; // Uncheck - back to unreviewed state (yellow)
    } else {
      fb.approved = true; // Approve (green/strikeout)
    }
    
    // Clear display properties so highlightAllFeedbacks() handles all highlighting
    para.displayOriginal = undefined;
    para.displayEdited = undefined;

    this.updateParagraphApprovedStatus(para);
    
    // Force change detection to update the view
    this.cdr.detectChanges();
  }

  rejectEditorialFeedback(para: any, editorType: string, fb: any) {
    // Prevent changes after final output is generated
    if (this.showFinalOutput) {
      return;
    }
    
    // Toggle: If already rejected, uncheck it (set to null for unreviewed/yellow)
    if (fb.approved === false) {
      fb.approved = null; // Uncheck - back to unreviewed state (yellow)
    } else {
      fb.approved = false; // Reject (green/strikeout opposite)
    }
    
    // Clear display properties so highlightAllFeedbacks() handles all highlighting
    para.displayOriginal = undefined;
    para.displayEdited = undefined;

    this.updateParagraphApprovedStatus(para);
    
    // Force change detection to update the view
    this.cdr.detectChanges();
  }

  applyEditorialFix(para: any, editorType: string, fb: any) {
    // Prevent changes after final output is generated
    if (this.showFinalOutput) {
      return;
    }
    
    // Toggle: If already approved, uncheck it (set to null for unreviewed/yellow)
    if (fb.approved === true) {
      fb.approved = null; // Uncheck - back to unreviewed state (yellow)
    } else {
      fb.approved = true; // Approve (green/strikeout)
    }
    
    // Clear display properties so highlightAllFeedbacks() handles all highlighting
    para.displayOriginal = undefined;
    para.displayEdited = undefined;

    this.updateParagraphApprovedStatus(para);
    
    // Force change detection to update the view
    this.cdr.detectChanges();
  }

  rejectEditorialFix(para: any, editorType: string, fb: any) {
    // Prevent changes after final output is generated
    if (this.showFinalOutput) {
      return;
    }
    
    // Toggle: If already rejected, uncheck it (set to null for unreviewed/yellow)
    if (fb.approved === false) {
      fb.approved = null; // Uncheck - back to unreviewed state (yellow)
    } else {
      fb.approved = false; // Reject (green/strikeout opposite)
    }
    
    // Clear display properties so highlightAllFeedbacks() handles all highlighting
    para.displayOriginal = undefined;
    para.displayEdited = undefined;

    this.updateParagraphApprovedStatus(para);
    
    // Force change detection to update the view
    this.cdr.detectChanges();
  }

  highlightAllFeedbacks(
    para: ParagraphFeedback,
    hovered?: { editorType: string; fbIndex: number }
  ): { original: string; edited: string } {

    let highlightedOriginal = para.original;
    let highlightedEdited = para.edited;

    type HighlightItem = {
      text: string;
      approved: boolean | null;
      start: number;
      end: number;
      hovered: boolean;
    };

    const originalItems: HighlightItem[] = [];
    const editedItems: HighlightItem[] = [];

    // ------------------------------------------------------------
    // STEP 1: Collect ALL highlight metadata (NO string mutation)
    // ------------------------------------------------------------
    Object.keys(para.editorial_feedback).forEach(editorType => {
      const feedbacks = (para.editorial_feedback as any)[editorType] || [];

      feedbacks.forEach((fb: any, idx: number) => {
        const issueText = fb.issue?.trim();
        const fixText = fb.fix?.trim();

        const isHovered =
          !!hovered &&
          hovered.editorType === editorType &&
          hovered.fbIndex === idx;

        const approved: boolean | null =
          fb.approved === true ? true : fb.approved === false ? false : null;

        // ---- ORIGINAL (issue) ----
        if (issueText) {
          const regex = new RegExp(this.escapeRegex(issueText), 'g');
          let match: RegExpExecArray | null;

          while ((match = regex.exec(highlightedOriginal)) !== null) {
            originalItems.push({
              text: issueText,
              approved,
              start: match.index,
              end: match.index + issueText.length,
              hovered: isHovered
            });
          }
        }

        // ---- EDITED (fix) ----
        if (fixText) {
          const regex = new RegExp(this.escapeRegex(fixText), 'g');
          let match: RegExpExecArray | null;

          while ((match = regex.exec(highlightedEdited)) !== null) {
            editedItems.push({
              text: fixText,
              approved,
              start: match.index,
              end: match.index + fixText.length,
              hovered: isHovered
            });
          }
        }
      });
    });

    // ------------------------------------------------------------
    // STEP 2: Apply highlights (END → START to keep indexes valid)
    // ------------------------------------------------------------
    const applyHighlights = (
      source: string,
      items: HighlightItem[],
      mode: 'original' | 'edited'
    ): string => {

      items
        .sort((a, b) => b.start - a.start)
        .forEach(item => {
          let cssClass = '';

          if (mode === 'original') {
            if (item.approved === true) {
              cssClass = 'strikeout highlight-yellow';
            } else if (item.approved === false) {
              cssClass = 'highlight-green';
            } else {
              cssClass = 'highlight-yellow';
            }
          } else {
            if (item.approved === true) {
              cssClass = 'highlight-green';
            } else if (item.approved === false) {
              cssClass = 'strikeout highlight-yellow';
            } else {
              cssClass = 'highlight-yellow';
            }
          }

          if (item.hovered) {
            cssClass += ' highlight-border';
          }

          const wrapped = `<span class="${cssClass}">${item.text}</span>`;

          source =
            source.substring(0, item.start) +
            wrapped +
            source.substring(item.end);
        });

      return source;
    };

    highlightedOriginal = applyHighlights(
      highlightedOriginal,
      originalItems,
      'original'
    );

    highlightedEdited = applyHighlights(
      highlightedEdited,
      editedItems,
      'edited'
    );

    return {
      original: highlightedOriginal,
      edited: highlightedEdited
    };
  }


  // Helper method to escape special regex characters
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  approveAllFeedback(): void {
    // Prevent changes after final output is generated
    if (this.showFinalOutput) {
      return;
    }
    this.paragraphFeedbackData.forEach(para => {

      para.approved = true;


      Object.keys(para.editorial_feedback).forEach(editorType => {
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
    this.paragraphFeedbackData.forEach(para => {
      para.approved = false;
      Object.keys(para.editorial_feedback).forEach(editorType => {
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

    /** Show notification message */
  private showNotificationMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.showNotification = false;
    }, 3000);
  }

  hoveredFeedback: { paraIndex: number, editorType: string, fbIndex: number } | null = null;

  onFeedbackHover(paraIndex: number, editorType: string, fbIndex: number) {
    this.hoveredFeedback = { paraIndex, editorType, fbIndex };
  }

  onFeedbackLeave() {
    this.hoveredFeedback = null;
  }
}

