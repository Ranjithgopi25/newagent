import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BehaviorSubject, Observable, Subject, firstValueFrom } from 'rxjs';
import { Message, EditWorkflowMetadata, ParagraphEdit, EditorialFeedbackItem } from '../models';
import { ChatService } from './chat.service';
import { normalizeEditorOrder, normalizeContent, extractDocumentTitle, getEditorDisplayName, formatMarkdown, convertMarkdownToHtml, extractFileText, formatFinalArticleWithBlockTypes, BlockTypeInfo } from '../utils/edit-content.utils';
import { 
  splitIntoParagraphs, 
  createParagraphEditsFromComparison, 
  allParagraphsDecided,
  validateStringEquality
} from '../utils/paragraph-edit.utils';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

export type EditWorkflowStep = 'idle' | 'awaiting_editors' | 'awaiting_content' | 'processing' | 'awaiting_approval';

export interface EditWorkflowState {
  step: EditWorkflowStep;
  uploadedFile: File | null;
  selectedEditors: string[];
  originalContent: string;
  paragraphEdits: ParagraphEdit[];
}

export interface EditWorkflowMessage {
  type: 'prompt' | 'result' | 'update';
  message: Message;
  metadata?: any;
}

export interface EditorOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  alwaysSelected?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatEditWorkflowService {
  private chatService = inject(ChatService);
  private sanitizer = inject(DomSanitizer);
  private msalService = inject(MsalService);

  private stateSubject = new BehaviorSubject<EditWorkflowState>({
    step: 'idle',
    uploadedFile: null,
    selectedEditors: ['brand-alignment'],
    originalContent: '',
    paragraphEdits: []
  });

  public state$: Observable<EditWorkflowState> = this.stateSubject.asObservable();

  private messageSubject = new Subject<EditWorkflowMessage>();
  public message$: Observable<EditWorkflowMessage> = this.messageSubject.asObservable();

  private workflowCompletedSubject = new Subject<void>();
  public workflowCompleted$: Observable<void> = this.workflowCompletedSubject.asObservable();

  private workflowStartedSubject = new Subject<void>();
  public workflowStarted$: Observable<void> = this.workflowStartedSubject.asObservable();

  // Track final article generation state
  private isGeneratingFinalSubject = new BehaviorSubject<boolean>(false);
  public isGeneratingFinal$: Observable<boolean> = this.isGeneratingFinalSubject.asObservable();
  public get isGeneratingFinal(): boolean {
    return this.isGeneratingFinalSubject.value;
  }

  // Track next editor generation state
  private isGeneratingNextEditorSubject = new BehaviorSubject<boolean>(false);
  public isGeneratingNextEditor$: Observable<boolean> = this.isGeneratingNextEditorSubject.asObservable();
  public get isGeneratingNextEditor(): boolean {
    return this.isGeneratingNextEditorSubject.value;
  }

  // Sequential workflow state tracking
  private threadId: string | null = null;
  private currentEditor: string | null = null;
  private isSequentialMode: boolean = false;
  private isLastEditor: boolean = false;
  private currentEditorIndex: number = 0;
  private totalEditors: number = 0;
  private editorOrder: string[] = []; // Normalized editor order (source of truth)

  private readonly MAX_FILE_SIZE_MB = 5;

  readonly editorOptions: EditorOption[] = [
    { 
      id: 'development', 
      name: 'Development Editor', 
      icon: '🚀', 
      description: 'Reviews and restructures content for alignment and coherence',
      selected: false
    },
    { 
      id: 'content', 
      name: 'Content Editor', 
      icon: '📄', 
      description: "Refines language to align with the author's objectives",
      selected: false
    },
    { 
      id: 'line', 
      name: 'Line Editor', 
      icon: '📝', 
      description: 'Improves sentence flow, readability and style preserving voice',
      selected: false
    },
    { 
      id: 'copy', 
      name: 'Copy Editor', 
      icon: '✏️', 
      description: 'Corrects grammar, punctuation and typos',
      selected: false
    },
    { 
      id: 'brand-alignment', 
      name: 'PwC Brand Alignment Editor', 
      icon: '🎯', 
      description: 'Aligns content writing standards with PwC brand',
      selected: true
    }
  ];

  get currentState(): EditWorkflowState {
    return this.stateSubject.value;
  }

  get isActive(): boolean {
    return this.currentState.step !== 'idle';
  }

  /**
   * Get authentication headers for fetch() requests
   * MSAL interceptor only works with HttpClient, so we need to manually add headers for fetch()
   */
  public async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (environment.useAuth) {
      try {
        const account = this.msalService.instance.getActiveAccount();
        if (account) {
          const response = await this.msalService.instance.acquireTokenSilent({
            scopes: ['User.Read'],
            account: account
          });
          
          if (response.idToken) {
            headers['Authorization'] = `Bearer ${response.idToken}`;
            console.log('[ChatEditWorkflowService] Added auth header (ID token) to fetch() call');
          }
        }
      } catch (error) {
        console.error('[ChatEditWorkflowService] Failed to acquire token for fetch():', error);
      }
    }

    return headers;
  }

  /** Detect edit intent using LLM agent via backend API */
  async detectEditIntent(input: string): Promise<{hasEditIntent: boolean, detectedEditors?: string[]}> {
    if (!input || !input.trim()) {
      return { hasEditIntent: false };
    }

    try {
      const result = await firstValueFrom(
        this.chatService.detectEditIntent(input.trim())
      );
      
      const hasEditIntent = result.is_edit_intent && result.confidence >= 0.7;
      const detectedEditors = result.detected_editors && result.detected_editors.length > 0 
        ? result.detected_editors 
        : undefined;
      
      return { 
        hasEditIntent, 
        detectedEditors 
      };
    } catch (error) {
      console.error('Error in LLM intent detection:', error);
      return { hasEditIntent: false };
    }
  }

  beginWorkflow(file?: File): void {
    if (file && this.isValidEditWorkflowFile(file)) {
      const defaultState = this.getDefaultState();
      this.updateState({
        ...defaultState,
        uploadedFile: file,
        selectedEditors: ['brand-alignment'],
        step: 'awaiting_content'
      });
      this.workflowStartedSubject.next();
      void this.processWithContent();
      return;
    }

    const defaultState = this.getDefaultState();
    this.updateState({
      ...defaultState,
      step: 'awaiting_editors'
    });

    this.workflowStartedSubject.next();

    const promptMessage = this.createEditorSelectionMessage(
      `I'll help you edit your content! 📝\n\n**Select the editing services you'd like to use:**`
    );

    this.messageSubject.next({
      type: 'prompt',
      message: promptMessage
    });
  }

  /** Begin workflow with pre-selected editors (Path 1: Direct Editor Detection) */
  beginWorkflowWithEditors(editorIds: string[], file?: File): void {
    if (!editorIds || editorIds.length === 0) {
      this.beginWorkflow(file);
      return;
    }

    const validEditorIds = this.editorOptions.map(e => e.id);
    const validatedEditors = editorIds.filter(id => validEditorIds.includes(id));

    if (validatedEditors.length === 0) {
      this.beginWorkflow(file);
      return;
    }

    const editorsWithBrand = [...validatedEditors];
    if (!editorsWithBrand.includes('brand-alignment')) {
      editorsWithBrand.push('brand-alignment');
    }

    if (file && this.isValidEditWorkflowFile(file)) {
      const defaultState = this.getDefaultState();
      this.updateState({
        ...defaultState,
        step: 'awaiting_content',
        selectedEditors: editorsWithBrand,
        uploadedFile: file
      });
      this.workflowStartedSubject.next();
      void this.processWithContent();
      return;
    }

    const defaultState = this.getDefaultState();
    this.updateState({
      ...defaultState,
      step: 'awaiting_content',
      selectedEditors: editorsWithBrand
    });

    this.workflowStartedSubject.next();

    const editorNamesText = this.getSelectedEditorNames(validatedEditors);

    const editWorkflowMetadata: EditWorkflowMetadata = {
      step: 'awaiting_content',
      showFileUpload: true,
      showCancelButton: false,
      showSimpleCancelButton: true
    };

    const contentRequestMessage: Message = {
      role: 'assistant',
      content: `✅ **Using ${editorNamesText} to edit your content**\n\n**Now, please upload your document:**`,
      timestamp: new Date(),
      editWorkflow: editWorkflowMetadata
    };

    this.messageSubject.next({
      type: 'prompt',
      message: contentRequestMessage
    });
  }

  /** Get editor names from editor IDs */
  private getEditorNamesFromIds(editorIds: string[]): string[] {
    return editorIds
      .map(id => this.editorOptions.find(e => e.id === id)?.name)
      .filter((name): name is string => !!name);
  }

  /** Get selected editor names as a formatted string */
  private getSelectedEditorNames(editorIds: string[]): string {
    const names = this.getEditorNamesFromIds(editorIds);
    if (names.length === 0) {
      return '';
    }
    if (names.length === 1) {
      return names[0];
    }
    if (names.length === 2) {
      return names.join(' and ');
    }
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  private getNumberedEditorList(editorOptions?: EditorOption[]): string {
    const editors = editorOptions || this.editorOptions;
    const currentSelectedIds = this.currentState.selectedEditors;
    
    return editors.map((editor, index) => {
      const num = index + 1;
      const isSelected = currentSelectedIds.includes(editor.id);
      const selected = isSelected ? ' ✓' : '';
      return `${num}. **${editor.name}** — ${editor.description}${selected}`;
    }).join('\n');
  }

  handleFileUpload(file: File): void {
    if (this.currentState.step !== 'awaiting_content') {
      return;
    }

    this.updateState({
      ...this.currentState,
      uploadedFile: file
    });
    
    this.processWithContent();
  }

  async handleChatInput(input: string, file?: File): Promise<void> {
    const trimmedInput = input.trim();
    const workflowActive = this.isActive;

    if (!workflowActive) {
      const intentResult = await this.detectEditIntent(trimmedInput);
      if (intentResult.hasEditIntent) {
        // Path 1: Direct Editor Detection - editors detected
        if (intentResult.detectedEditors && intentResult.detectedEditors.length > 0) {
          this.beginWorkflowWithEditors(intentResult.detectedEditors, file);
        } else {
          // Path 2: Standard Flow - show editor selection
          this.beginWorkflow(file);
        }
        return;
      }
    }

    if (!workflowActive) {
      return;
    }

    if (this.currentState.step === 'awaiting_editors') {
      if (trimmedInput) {
        const lowerInput = trimmedInput.toLowerCase();
        
        // Check for "proceed" keywords
        if (lowerInput.includes('proceed') || lowerInput.includes('continue') || lowerInput.includes('yes') || lowerInput === 'ok' || lowerInput === 'done') {
          console.log('[ChatEditWorkflow] User requested to proceed with current selection');
          this.proceedToContentStep();
          return;
        }
        
        // Check for "cancel" keywords
        if (lowerInput.includes('cancel')) {
          console.log('[ChatEditWorkflow] User requested to cancel workflow');
          this.cancelWorkflow();
          return;
        }
        
        // Parse numeric selection (e.g., "1", "1,3", "1-3")
        console.log('[ChatEditWorkflow] Attempting to parse numeric selection from input');
        const selectionResult = this.parseNumericSelection(trimmedInput);
        
        if (selectionResult.selectedIndices.length > 0 || selectionResult.hasInput) {
          console.log('[ChatEditWorkflow] Valid numeric input detected, handling selection');
          this.handleNumericSelection(selectionResult);
          return;
        }
        
        // If no valid input pattern matched, show error
        if (trimmedInput.trim().length > 0) {
          this.showInvalidSelectionError();
          return;
        }
      }
      return;
    }

    if (this.currentState.step === 'awaiting_content') {
      if (file) {
        this.handleFileUpload(file);
        return;
      }
      
      if (trimmedInput) {
        const errorMessage: Message = {
          role: 'assistant',
          content: '⚠️ **Please upload a document file** (Word, PDF, Text, or Markdown). Text pasting is not available in this workflow.',
          timestamp: new Date(),
          editWorkflow: {
            step: 'awaiting_content',
            showCancelButton: false,
            showSimpleCancelButton: true
          }
        };
        this.messageSubject.next({ type: 'prompt', message: errorMessage });
        return;
      }
    }
  }

  private parseNumericSelection(input: string): { selectedIndices: number[], invalidIndices: number[], hasInput: boolean } {
    const selectedIndices: number[] = [];
    const invalidIndices: number[] = [];
    let hasInput = false;
    
    const cleanedInput = input.replace(/(?:select|choose|pick|use|want|need|editor|editors)/gi, '').trim();
    
    if (!/\d/.test(cleanedInput)) {
      return { selectedIndices: [], invalidIndices: [], hasInput: cleanedInput.length > 0 };
    }
    
    hasInput = true;
    const parts = cleanedInput.split(/[,;\s]+/).filter(part => part.trim().length > 0);
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;
      
      const rangeMatch = trimmedPart.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        
        if (start > end) {
          continue;
        }
        
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= 5) {
            if (!selectedIndices.includes(i)) {
              selectedIndices.push(i);
            }
          } else {
            if (!invalidIndices.includes(i)) {
              invalidIndices.push(i);
            }
          }
        }
        continue;
      }
      
      const numberMatch = trimmedPart.match(/^(\d+)$/);
      if (numberMatch) {
        const num = parseInt(numberMatch[1]);
        if (num >= 1 && num <= 5) {
          if (!selectedIndices.includes(num)) {
            selectedIndices.push(num);
          }
        } else {
          if (!invalidIndices.includes(num)) {
            invalidIndices.push(num);
          }
        }
        continue;
      }
    }
    
    selectedIndices.sort((a, b) => a - b);
    invalidIndices.sort((a, b) => a - b);
    
    return { selectedIndices, invalidIndices, hasInput };
  }

  private handleNumericSelection(result: { selectedIndices: number[], invalidIndices: number[], hasInput: boolean }): void {
    if (result.invalidIndices.length > 0) {
      const editorList = this.getNumberedEditorList();
      const errorMessage = this.createEditorSelectionMessage(
        `⚠️ **Invalid editor number(s):** ${result.invalidIndices.join(', ')}\n\n**Valid editor numbers are 1-5.**\n\n**Editor List:**\n\n${editorList}\n\nPlease provide valid editor numbers (1-5) or type "proceed" to continue with defaults.`
      );
      this.messageSubject.next({ type: 'prompt', message: errorMessage });
      return;
    }
    
    if (result.selectedIndices.length === 0 && result.hasInput) {
      this.showInvalidSelectionError();
      return;
    }
    
    if (result.selectedIndices.length > 0) {
      const updatedEditors = this.editorOptions.map((editor, index) => {
        const editorNum = index + 1;
        return {
          ...editor,
          selected: result.selectedIndices.includes(editorNum)
        };
      });
      
      const selectedIds = updatedEditors.filter(e => e.selected).map(e => e.id);
      
      // Ensure brand-alignment is always included
      if (!selectedIds.includes('brand-alignment')) {
        selectedIds.push('brand-alignment');
      }
      
      this.updateState({
        ...this.currentState,
        selectedEditors: selectedIds
      });
      
      const selectedNames = updatedEditors
        .filter(e => e.selected)
        .map((e, idx) => {
          const num = this.editorOptions.findIndex(opt => opt.id === e.id) + 1;
          return `${num}. ${e.name}`;
        })
        .join(', ');
      
      console.log('[ChatEditWorkflow] Selected editor names:', selectedNames);
      
      // Auto-proceed to content upload step after confirming selection
      const confirmMessage: Message = {
        role: 'assistant',
        content: `✅ **Selected editors:** ${selectedNames}\n\nProceeding to content upload...`,
        timestamp: new Date()
      };
      
      console.log('[ChatEditWorkflow] Sending confirmation message and auto-proceeding to content step');
      this.messageSubject.next({ type: 'prompt', message: confirmMessage });
      
      // Automatically proceed to content step after brief delay (for UX smoothness)
      setTimeout(() => {
        console.log('[ChatEditWorkflow] Auto-advancing to content upload step');
        this.proceedToContentStep();
      }, 500);
    }
  }

  private showInvalidSelectionError(): void {
    const editorList = this.getNumberedEditorList();
    const errorMessage = this.createEditorSelectionMessage(
      `⚠️ **Please provide valid editor numbers (1-5).**\n\n**Editor List:**\n\n${editorList}\n\nOr type "proceed" to continue with defaults.`
    );
    this.messageSubject.next({ type: 'prompt', message: errorMessage });
  }

  private parseOptOutInput(input: string): { optedOut: number[], sections: string[] } {
    const lowerInput = input.toLowerCase();
    const optedOut: number[] = [];
    const sections: string[] = [];
    
    const optOutPattern = /(?:remove|skip|exclude|without|opt\s*out|deselect|don't\s*use|do\s*not\s*use)\s+(\d+(?:\s*[,\s]?\s*(?:and\s*)?\d+)*)/gi;
    
    let match;
    while ((match = optOutPattern.exec(lowerInput)) !== null) {
      const numbersStr = match[1];
      const numberMatches = numbersStr.match(/\d+/g);
      if (numberMatches) {
        numberMatches.forEach(numStr => {
          const num = parseInt(numStr);
          if (num >= 1 && num <= 5 && !optedOut.includes(num)) {
            optedOut.push(num);
          }
        });
      }
    }
    
    const sectionPatterns = [
      /(?:edit|review|focus\s*on)\s+(?:pages?|sections?)\s+(\d+(?:\s*-\s*\d+)?)/gi,
      /(?:edit|review)\s+(?:the\s+)?(introduction|conclusion|summary|abstract|body|content)/gi
    ];
    
    sectionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        if (match[1] && !sections.includes(match[1])) {
          sections.push(match[1]);
        }
      }
    });
    
    return { optedOut, sections };
  }

  private handleOptOutAndProceed(result: { optedOut: number[], sections: string[] }): void {
    const currentEditors = [...this.editorOptions];
    // Find brand-alignment editor index to prevent it from being opted out
    const brandAlignmentIndex = currentEditors.findIndex(e => e.id === 'brand-alignment');
    const brandAlignmentNum = brandAlignmentIndex >= 0 ? brandAlignmentIndex + 1 : -1;
    
    const selectedEditors = currentEditors.map((editor, index) => {
      const editorNum = index + 1;
      // Brand alignment is always selected, cannot be opted out
      if (editor.id === 'brand-alignment') {
        return {
          ...editor,
          selected: true
        };
      }
      return {
        ...editor,
        selected: !result.optedOut.includes(editorNum)
      };
    });
    
    const selectedIds = selectedEditors.filter(e => e.selected).map(e => e.id);
    
    // Ensure brand-alignment is always included
    if (!selectedIds.includes('brand-alignment')) {
      selectedIds.push('brand-alignment');
    }
    
    this.updateState({
      ...this.currentState,
      selectedEditors: selectedIds
    });
    
    let responseMessage = '';
    if (result.optedOut.length > 0) {
      const optedOutNames = result.optedOut.map(num => {
        const editor = this.editorOptions[num - 1];
        return `${num}. ${editor.name}`;
      }).join(', ');
      responseMessage += `✅ **Opted out:** ${optedOutNames}\n\n`;
    }
    
    if (result.sections.length > 0) {
      responseMessage += `📄 **Sections to edit:** ${result.sections.join(', ')}\n\n`;
    }
    
    const remainingEditors = selectedEditors.filter(e => e.selected);
    if (remainingEditors.length === 0) {
      responseMessage += `⚠️ **No editors selected.** Please keep at least one editor active.`;
      const errorMessage = this.createEditorSelectionMessage(responseMessage, selectedEditors);
      this.messageSubject.next({ type: 'prompt', message: errorMessage });
      return;
    }
    
    responseMessage += `**Selected ${remainingEditors.length} editor${remainingEditors.length > 1 ? 's' : ''}:** ${remainingEditors.map(e => e.name).join(', ')}\n\nWhen you're ready, click "Continue" or type "proceed" to move to the next step.`;
    
    const confirmMessage = this.createEditorSelectionMessage(responseMessage, selectedEditors);
    
    this.messageSubject.next({
      type: 'prompt',
      message: confirmMessage
    });
  }

  private proceedToContentStep(): void {
    // Ensure brand-alignment is always included
    const selectedIds = [...this.currentState.selectedEditors];
    if (!selectedIds.includes('brand-alignment')) {
      selectedIds.push('brand-alignment');
    }
    
    if (selectedIds.length === 0) {
      this.createNoEditorsErrorMessage();
      return;
    }
    
    // Update state to ensure brand-alignment is included
    this.updateState({
      ...this.currentState,
      selectedEditors: selectedIds
    });

    this.updateState({
      ...this.currentState,
      step: 'awaiting_content'
    });

    const editorNamesText = this.getSelectedEditorNames(selectedIds);

    const editWorkflowMetadata: EditWorkflowMetadata = {
      step: 'awaiting_content',
      showFileUpload: true,  // Show file upload component
      showCancelButton: false,
      showSimpleCancelButton: true
    };

    const contentRequestMessage: Message = {
      role: 'assistant',
      content: `✅ **Using ${editorNamesText} to edit your content**\n\n**Now, please upload your document:**`,
      timestamp: new Date(),
      editWorkflow: editWorkflowMetadata
    };

    this.messageSubject.next({
      type: 'prompt',
      message: contentRequestMessage
    });
  }

  private async processWithContent(): Promise<void> {
    // Ensure brand-alignment is always included
    const selectedIds = [...this.currentState.selectedEditors];
    if (!selectedIds.includes('brand-alignment')) {
      selectedIds.push('brand-alignment');
    }
    const selectedNames = this.getSelectedEditorNames(selectedIds);

    try {
      let contentText = this.currentState.originalContent;
      
      if (this.currentState.uploadedFile && !contentText) {
        contentText = await extractFileText(this.currentState.uploadedFile);
        contentText = normalizeContent(contentText);
        this.updateState({
          ...this.currentState,
          originalContent: contentText
        });
      }

      if (!contentText || !contentText.trim()) {
        throw new Error('No content to process');
      }

      this.updateState({
        ...this.currentState,
        step: 'processing'
      });

      const processingMessage: Message = {
        role: 'assistant',
        content: `Processing your content with: **${selectedNames}**\n\nPlease wait while I analyze and edit your content...`,
        timestamp: new Date(),
      editWorkflow: {
        step: 'processing',
        showCancelButton: false
      }
      };

      this.messageSubject.next({
        type: 'prompt',
        message: processingMessage
      });

      await this.processContent(contentText, selectedIds, selectedNames);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your content. Please try again.',
        timestamp: new Date()
      };
      this.messageSubject.next({ type: 'result', message: errorMessage });
      this.completeWorkflow();
    }
  }

  handleEditorSelection(selectedIds: string[]): void {
    if (this.currentState.step !== 'awaiting_editors') {
      return;
    }

    // Ensure brand-alignment is always included
    const editorsWithBrand = [...selectedIds];
    if (!editorsWithBrand.includes('brand-alignment')) {
      editorsWithBrand.push('brand-alignment');
    }

    if (editorsWithBrand.length === 0) {
      this.createNoEditorsErrorMessage();
      return;
    }

    this.updateState({
      ...this.currentState,
      selectedEditors: editorsWithBrand
    });

    this.proceedToContentStep();
  }

  private async processContent(contentText: string, selectedIds: string[], selectedNames: string): Promise<void> {
    const messages = [{
      role: 'user' as const,
      content: contentText
    }];

    const normalizedEditorIds = normalizeEditorOrder(selectedIds);

    let fullResponse = '';
    let combinedFeedback = '';
    let finalRevisedContent = '';
    let currentEditorProgress: {current: number, total: number, currentEditor: string} | null = null;
    let editorErrors: Array<{editor: string, error: string}> = [];
    
    const editorProgressList: Array<{editorId: string, editorName: string, status: 'pending' | 'processing' | 'completed' | 'error', current?: number, total?: number}> = normalizedEditorIds.map((id, index) => ({
      editorId: id,
      editorName: getEditorDisplayName(id),
      status: 'pending' as const,
      current: index + 1,
      total: normalizedEditorIds.length
    }));
    // 🔒 LOCK totalEditors ONCE - NEVER UPDATE FROM BACKEND
    // This represents the original editor count and must remain constant throughout the workflow
    this.totalEditors = normalizedEditorIds.length;
    this.editorOrder = normalizedEditorIds; // Store normalized editor order (source of truth)

    // Use default temperature (0.15) - optimal for editing: allows minor improvements while staying deterministic
    this.chatService.streamEditContent(messages, normalizedEditorIds).subscribe({
      next: (data: any) => {
        if (data.type === 'editor_progress') {
          currentEditorProgress = {
            current: data.current || 0,
            total: data.total || 0,
            currentEditor: data.editor || ''
          };
          
          const currentIndex = data.current || 0;
          editorProgressList.forEach((editor, index) => {
            const editorIndex = index + 1;
            if (editorIndex < currentIndex) {
              editor.status = 'completed';
            } else if (editorIndex === currentIndex) {
              editor.status = 'processing';
              editor.current = currentIndex;
              editor.total = data.total || selectedIds.length;
            } else {
              editor.status = 'pending';
            }
          });
          
          const progressMessage: Message = {
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            editWorkflow: {
              step: 'processing',
              showCancelButton: false,
              editorProgress: currentEditorProgress || undefined,
              editorProgressList: [...editorProgressList]
            }
          };
          this.messageSubject.next({ type: 'prompt', message: progressMessage });
        } else if (data.type === 'editor_content') {
          if (data.content) {
            fullResponse += data.content;
          }
        } else if (data.type === 'editor_complete') {
          console.log('[ChatEditWorkflowService] Editor complete:', data);
          
          if (data.thread_id) {
            this.threadId = data.thread_id;
            this.isSequentialMode = true;
          }
          
          if (data.current_editor) {
            this.currentEditor = data.current_editor;
            this.currentEditorIndex = data.editor_index || 0;
            this.totalEditors = data.total_editors || this.totalEditors;
            this.isLastEditor = (data.editor_index || 0) >= (data.total_editors || this.totalEditors || 1) - 1;
          }
          
          const completedEditor = editorProgressList.find(e => e.editorId === data.current_editor || e.editorId === data.editor);
          if (completedEditor) {
            completedEditor.status = 'completed';
          }
          
          if (data.revised_content || data.final_revised) {
            fullResponse = data.revised_content || data.final_revised || '';
          }
          
          let paragraphEdits: ParagraphEdit[] = [];
          if (data.paragraph_edits && Array.isArray(data.paragraph_edits)) {
            console.log('[ChatEditWorkflowService] Paragraph edits received:', data.paragraph_edits);
            const allEditorNames = selectedIds.map(editorId => {
              return getEditorDisplayName(editorId);
            });
            
            // Get original content - prioritize data.original_content, then currentState
            const originalContent = data.original_content || this.currentState.originalContent || '';
            const originalParagraphs = originalContent ? splitIntoParagraphs(originalContent) : [];
            
            paragraphEdits = data.paragraph_edits.map((edit: any, arrayIndex: number) => {
              const existingTags = edit.tags || [];
              
              const existingEditorNames = new Set<string>(
                existingTags.map((tag: string) => {
                  const match = tag.match(/^(.+?)\s*\(/);
                  return match ? match[1].trim() : tag;
                })
              );
              
              const allTags = [...existingTags];
              allEditorNames.forEach(editorName => {
                const existingNamesArray = Array.from(existingEditorNames) as string[];
                if (!existingNamesArray.some((existing: string) => 
                  existing.toLowerCase().includes(editorName.toLowerCase()) || 
                  editorName.toLowerCase().includes(existing.toLowerCase())
                )) {
                  allTags.push(`${editorName} (Reviewed)`);
                }
              });
              
              const paragraphIndex = (edit.index !== undefined && edit.index !== null) ? edit.index : arrayIndex;
              const originalText = (edit.original && edit.original.trim()) || (originalParagraphs.length > paragraphIndex && paragraphIndex >= 0 ? (originalParagraphs[paragraphIndex] && originalParagraphs[paragraphIndex].trim()) || '' : '');
              const editedText = (edit.edited && edit.edited.trim()) || '';
              const isIdentical = validateStringEquality(originalText, editedText);
              const autoApproved = edit.autoApproved !== undefined ? edit.autoApproved : isIdentical;
              const approved = autoApproved ? true : (edit.approved !== undefined ? edit.approved : null);

              const editorial_feedback = edit.editorial_feedback ? {
                development: edit.editorial_feedback.development || [],
                content: edit.editorial_feedback.content || [],
                copy: edit.editorial_feedback.copy || [],
                line: edit.editorial_feedback.line || [],
                brand: edit.editorial_feedback.brand || []
              } : undefined;

              // Preserve block_type from backend - only default if truly missing (undefined/null/empty)
              // Backend sends block_type from DocumentBlock.type (title, heading, paragraph, bullet_item)
              const blockType = (edit.block_type !== undefined && edit.block_type !== null && edit.block_type !== '') 
                ? edit.block_type 
                : 'paragraph';
              
              return {
                index: paragraphIndex,
                original: originalText,
                edited: editedText,
                tags: allTags,
                autoApproved: autoApproved,
                approved: approved,
                block_type: blockType,
                level: edit.level || 0,
                editorial_feedback: editorial_feedback,
                displayOriginal: originalText,
                displayEdited: editedText
              } as ParagraphEdit;
            });
            
            // Debug: Log block_type distribution from backend
            const blockTypeCounts = paragraphEdits.reduce((acc, p) => {
              const bt = p.block_type || 'undefined';
              acc[bt] = (acc[bt] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            console.log('[ChatEditWorkflowService] Received paragraph_edits block_type distribution:', blockTypeCounts);
            
            // Update state with paragraph edits
            const preservedOriginalContent = data.original_content || this.currentState.originalContent || '';
            this.updateState({
              ...this.currentState,
              paragraphEdits: paragraphEdits,
              originalContent: preservedOriginalContent
            });
            
            const paragraphMessage: Message = {
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              isHtml: false,
              editWorkflow: {
                step: 'awaiting_approval',
                paragraphEdits: paragraphEdits,
                showCancelButton: false,
                showSimpleCancelButton: true,
                threadId: this.threadId,
                currentEditor: this.currentEditor,
                isSequentialMode: this.isSequentialMode,
                isLastEditor: this.isLastEditor,
                currentEditorIndex: this.currentEditorIndex,
                totalEditors: this.totalEditors,
                editorOrder: this.editorOrder // ✅ Send normalized editor order (source of truth)
              }
            };
            this.messageSubject.next({ type: 'result', message: paragraphMessage });
          }
          
          if (data.original_content) {
            this.updateState({
              ...this.currentState,
              originalContent: data.original_content
            });
          }
          
          const progressMessage: Message = {
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            editWorkflow: {
              step: 'processing',
              showCancelButton: false,
              editorProgress: currentEditorProgress || undefined,
              editorProgressList: [...editorProgressList]
            }
          };
          this.messageSubject.next({ type: 'prompt', message: progressMessage });
        } else if (data.type === 'editor_error') {
          const errorEditor = editorProgressList.find(e => e.editorId === data.editor);
          if (errorEditor) {
            errorEditor.status = 'error';
          }
          
          editorErrors.push({
            editor: data.editor || 'Unknown',
            error: data.error || 'Unknown error'
          });
          
          const editorName = getEditorDisplayName(data.editor);
          const errorMessage: Message = {
            role: 'assistant',
            content: `⚠️ **${editorName} encountered an error:** ${data.error}\n\nContinuing with remaining editors...`,
            timestamp: new Date(),
            editWorkflow: {
              step: 'processing',
              showCancelButton: false,
              editorProgress: currentEditorProgress || undefined,
              editorProgressList: [...editorProgressList]
            }
          };
          this.messageSubject.next({ type: 'prompt', message: errorMessage });
        } else if (data.type === 'final_complete') {
          // Defensive: Ensure isLastEditor is set even if all_complete was missed
          // This hardens against backend event reordering or missing events
          this.isLastEditor = true;
          this.currentEditorIndex = this.totalEditors;
          
          combinedFeedback = data.combined_feedback || '';
          finalRevisedContent = data.final_revised || '';
          
          let paragraphEdits: ParagraphEdit[] = [];
          if (data.paragraph_edits && Array.isArray(data.paragraph_edits)) {
            const allEditorNames = selectedIds.map(editorId => {
              return getEditorDisplayName(editorId);
            });
            
            // Get original content - prioritize data.original_content, then currentState
            const originalContent = data.original_content || this.currentState.originalContent || '';
            const originalParagraphs = originalContent ? splitIntoParagraphs(originalContent) : [];
            
            paragraphEdits = data.paragraph_edits.map((edit: any, arrayIndex: number) => {
              const existingTags = edit.tags || [];
              
              const existingEditorNames = new Set<string>(
                existingTags.map((tag: string) => {
                  const match = tag.match(/^(.+?)\s*\(/);
                  return match ? match[1].trim() : tag;
                })
              );
              
              const allTags = [...existingTags];
              allEditorNames.forEach(editorName => {
                const existingNamesArray = Array.from(existingEditorNames) as string[];
                if (!existingNamesArray.some((existing: string) => 
                  existing.toLowerCase().includes(editorName.toLowerCase()) || 
                  editorName.toLowerCase().includes(existing.toLowerCase())
                )) {
                  allTags.push(`${editorName} (Reviewed)`);
                }
              });
              
              // Use edit.index if provided, otherwise use array index
              // This ensures each paragraph has a unique index
              const paragraphIndex = (edit.index !== undefined && edit.index !== null) ? edit.index : arrayIndex;

              // Get original text - prioritize edit.original, then try to get from original content by index
              const originalText = (edit.original && edit.original.trim()) || (originalParagraphs.length > paragraphIndex && paragraphIndex >= 0 ? (originalParagraphs[paragraphIndex] && originalParagraphs[paragraphIndex].trim()) || '' : '');

              // Ensure edited text is available
              const editedText = (edit.edited && edit.edited.trim()) || '';

              // Determine whether original and edited are identical (helper function imported)
              const isIdentical = validateStringEquality(originalText, editedText);

              // If the backend provided autoApproved flag, respect it; otherwise auto-approve when texts are identical
              const autoApproved = edit.autoApproved !== undefined ? edit.autoApproved : isIdentical;
              const approved = autoApproved ? true : (edit.approved !== undefined ? edit.approved : null);

              // Preserve editorial_feedback from backend (same structure as guided journey)
              const editorial_feedback = edit.editorial_feedback ? {
                development: edit.editorial_feedback.development || [],
                content: edit.editorial_feedback.content || [],
                copy: edit.editorial_feedback.copy || [],
                line: edit.editorial_feedback.line || [],
                brand: edit.editorial_feedback.brand || []
              } : undefined;

              return {
                index: paragraphIndex,
                original: originalText,
                edited: editedText,
                tags: allTags,
                autoApproved: autoApproved,
                approved: approved,
                block_type: (edit.block_type !== undefined && edit.block_type !== null && edit.block_type !== '') ? edit.block_type : 'paragraph',
                level: edit.level || 0,
                editorial_feedback: editorial_feedback,
                displayOriginal: originalText,
                displayEdited: editedText
              } as ParagraphEdit;
            });
          } else if (data.final_revised && data.original_content) {
            paragraphEdits = this.createParagraphEditsFromComparison(
              data.original_content,
              data.final_revised,
              selectedIds
            );
          }
          
          // Ensure originalContent is preserved - prioritize data.original_content, but keep existing if not provided
          const preservedOriginalContent = data.original_content || this.currentState.originalContent || '';
          
          this.updateState({
            ...this.currentState,
            paragraphEdits: paragraphEdits,
            originalContent: preservedOriginalContent
          });
          
          editorProgressList.forEach(editor => {
            if (editor.status !== 'error') {
              editor.status = 'completed';
            }
          });
          
          const completedProgress: {current: number, total: number, currentEditor: string} = {
            current: currentEditorProgress?.total || editorProgressList.length,
            total: currentEditorProgress?.total || editorProgressList.length,
            currentEditor: 'completed'
          };
          
          const completionMessage: Message = {
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            editWorkflow: {
              step: 'processing',
              showCancelButton: false,
              editorProgress: completedProgress,
              editorProgressList: [...editorProgressList]
            }
          };
          this.messageSubject.next({ type: 'prompt', message: completionMessage });
          
          if (editorErrors.length > 0) {
            const errorSummary = editorErrors.map(e => {
              const editorName = getEditorDisplayName(e.editor);
              return `⚠️ ${editorName} encountered an error: ${e.error}. Processing continued with previous editor's output.`;
            }).join('\n\n');
            
            if (combinedFeedback) {
              combinedFeedback = errorSummary + '\n\n' + combinedFeedback;
            } else {
              combinedFeedback = errorSummary;
            }
          }
          
          this.dispatchResultsToChat('', selectedIds, selectedNames, combinedFeedback, finalRevisedContent, paragraphEdits);
        } else if (data.type === 'content' && data.content) {
          fullResponse += data.content;
        } else if (typeof data === 'string') {
          fullResponse += data;
        }
      },
      error: (error: any) => {
        const errorMsg: Message = {
          role: 'assistant',
          content: 'Sorry, there was an error editing your content. Please try again.',
          timestamp: new Date()
        };
        this.messageSubject.next({ type: 'result', message: errorMsg });
        this.completeWorkflow();
      },
      complete: () => {
        this.completeWorkflow();
      }
    });
  }

  /** Create paragraph edits by comparing original and edited content */
  private createParagraphEditsFromComparison(original: string, edited: string, editorIds?: string[]): ParagraphEdit[] {
    const editorIdsToUse = editorIds || this.currentState.selectedEditors;
    const allEditorNames = editorIdsToUse.map(editorId => {
      return getEditorDisplayName(editorId);
    });
    
    return createParagraphEditsFromComparison(original, edited, allEditorNames);
  }
  
  private dispatchResultsToChat(
    rawResponse: string,
    selectedEditorIds: string[],
    selectedEditorNames: string,
    combinedFeedback?: string,
    finalRevisedContent?: string,
    paragraphEdits?: ParagraphEdit[],
    extractedTitle?: string
  ): void {
    let feedbackMatch: RegExpMatchArray | null = null;
    if (combinedFeedback) {
      feedbackMatch = [null, combinedFeedback] as any;
    } else {
      feedbackMatch = rawResponse.match(/===\s*FEEDBACK\s*===\s*([\s\S]*?)(?====\s*REVISED ARTICLE\s*===|$)/i);
    }
    
    let revisedContent = '';
    if (finalRevisedContent && finalRevisedContent.trim()) {
      revisedContent = finalRevisedContent.trim();
    }
    const uploadedFileName = this.currentState.uploadedFile?.name;
    
    // Extract title from original content (use provided extractedTitle or extract from content)
    const documentTitle = extractedTitle || extractDocumentTitle(
      this.currentState.originalContent || '',
      uploadedFileName
    );
    const cleanTopic = documentTitle.trim() || 'Revised Article';
    
    let cleanFullContent = revisedContent || 'No revised article returned.';
    cleanFullContent = cleanFullContent.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim();
    
    const metadata = {
      contentType: 'article' as const,
      topic: cleanTopic,
      fullContent: cleanFullContent,
      showActions: !!revisedContent && cleanFullContent.length > 0
    };
    
    // Send editorial feedback FIRST (matches Guided Journey display order)
    if (feedbackMatch && feedbackMatch[1]) {
      const feedbackPlainText = feedbackMatch[1].trim();
      const feedbackTitle = '**📝 Editorial Feedback**';
      const feedbackContent = feedbackPlainText;
      const combinedFeedback = `${feedbackTitle}\n\n${feedbackContent}`;
      const feedbackHtml = formatMarkdown(combinedFeedback);
      
      const feedbackMessage: Message = {
        role: 'assistant',
        content: feedbackHtml,
        timestamp: new Date(),
        isHtml: true, // Flag to indicate content is already HTML
        thoughtLeadership: {
          contentType: 'edit-article',
          topic: 'Editorial Feedback',
          fullContent: feedbackPlainText,
          showActions: true
        }
      };
      this.messageSubject.next({ type: 'result', message: feedbackMessage });
    }
    
    // Send paragraph-by-paragraph comparison AFTER editorial feedback (matches Guided Journey display order)
    if (paragraphEdits && paragraphEdits.length > 0) {
      const paragraphMessage: Message = {
        role: 'assistant',
        content: '', // Content will be rendered by Angular component
        timestamp: new Date(),
        isHtml: false,
      editWorkflow: {
        step: 'awaiting_approval',
        paragraphEdits: paragraphEdits,
        showCancelButton: false,
        showSimpleCancelButton: true,
        threadId: this.threadId,
        currentEditor: this.currentEditor,
        isSequentialMode: this.isSequentialMode,
        // ⚠️ UI MUST use isLastEditor flag - DO NOT infer from currentEditorIndex/totalEditors
        isLastEditor: this.isLastEditor,
        currentEditorIndex: this.currentEditorIndex,
        totalEditors: this.totalEditors
      }
      };
      this.messageSubject.next({ type: 'result', message: paragraphMessage });
    } else if (revisedContent && !paragraphEdits) {
      const headerLines: string[] = [
        '### Quick Start Thought Leadership – Edit Content'
      ];
      
      if (uploadedFileName) {
        headerLines.push(`_Source: ${uploadedFileName}_`);
      }
      
      if (selectedEditorNames) {
        headerLines.push(`_Editors Applied: ${selectedEditorNames}_`);
      }
      
      headerLines.push('', '**Revised Article**', '');
      
      // If we have an extracted title, add it in bold before the content
      if (extractedTitle && extractedTitle !== 'Revised Article') {
        headerLines.push(`**${extractedTitle}**`, '');
      }
      
      const headerHtml = convertMarkdownToHtml(headerLines.join('\n'));
      const revisedHtml = convertMarkdownToHtml(revisedContent);
      const combinedHtml = `${headerHtml}${revisedHtml}`;
      
      const revisedMessage: Message = {
        role: 'assistant',
        content: combinedHtml,
        timestamp: new Date(),
        isHtml: true,
        thoughtLeadership: metadata
      };
      
      this.messageSubject.next({ type: 'result', message: revisedMessage });
    } else {
      const errorContent = '### Quick Start Thought Leadership – Edit Content\n\n**Revised Article**\n\n_No revised article was returned. Please try again._';
      const errorMessage: Message = {
        role: 'assistant',
        content: convertMarkdownToHtml(errorContent),
        timestamp: new Date(),
        isHtml: true,
        thoughtLeadership: metadata
      };
      this.messageSubject.next({ type: 'result', message: errorMessage });
    }
  }

  cancelWorkflow(): void {
    if (this.currentState.step === 'idle') {
      return;
    }

    if (this.currentState.step === 'processing') {
      return;
    }

    this.updateState(this.getDefaultState());
    this.workflowCompletedSubject.next();

    const cancelMessage: Message = {
      role: 'assistant',
      content: 'Edit workflow cancelled. How else can I help you?',
      timestamp: new Date()
    };

    this.messageSubject.next({
      type: 'prompt',
      message: cancelMessage
    });
  }

  completeWorkflow(): void {
    // Reset sequential workflow state
    this.threadId = null;
    this.currentEditor = null;
    this.isSequentialMode = false;
    this.isLastEditor = false;
    this.currentEditorIndex = 0;
    this.totalEditors = 0;
    
    this.updateState(this.getDefaultState());
    this.workflowCompletedSubject.next();
  }

  private updateState(newState: EditWorkflowState): void {
    this.stateSubject.next(newState);
  }

  
  /** Sanitize HTML content using Angular's DomSanitizer */
  private sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
  
  private getDefaultState(): EditWorkflowState {
    return {
      step: 'idle',
      uploadedFile: null,
      selectedEditors: ['brand-alignment'],
      originalContent: '',
      paragraphEdits: []
    };
  }

  /** Validate file for edit workflow: .doc, .docx, .pdf, .txt, .md, .markdown; max 5MB. */
  private isValidEditWorkflowFile(file: File): boolean {
    const validExtensions = ['.doc', '.docx', '.pdf', '.txt', '.md', '.markdown'];
    const fileName = file.name.toLowerCase();
    const isValidFormat = validExtensions.some(ext => fileName.endsWith(ext));
    if (!isValidFormat) return false;
    const fileSizeMB = file.size / (1024 * 1024);
    return fileSizeMB <= this.MAX_FILE_SIZE_MB;
  }

  private cloneEditorOptions(): EditorOption[] {
    return this.editorOptions.map(opt => ({ ...opt }));
  }

  private createEditorSelectionMessage(content: string, editorOptions?: EditorOption[]): Message {
    const editors = editorOptions || this.cloneEditorOptions();
    // Set default selection state (only brand-alignment selected by default, and always selected)
    const defaultSelectedIds = ['brand-alignment'];
    const editorsWithSelection = editors.map(editor => ({
      ...editor,
      selected: defaultSelectedIds.includes(editor.id),
      // Mark brand-alignment as always selected and disabled
      disabled: editor.id === 'brand-alignment',
      alwaysSelected: editor.id === 'brand-alignment'
    }));

    return {
      role: 'assistant',
      content,
      timestamp: new Date(),
      editWorkflow: {
        step: 'awaiting_editors',
        showEditorSelection: true, // Enable visual UI component
        showCancelButton: false,
        showSimpleCancelButton: false,
        editorOptions: editorsWithSelection
      }
    };
  }

  private createNoEditorsErrorMessage(editorOptions?: EditorOption[]): void {
    const errorMessage = this.createEditorSelectionMessage(
      `⚠️ **Please select at least one editing service** before proceeding.`,
      editorOptions
    );
    this.messageSubject.next({ type: 'prompt', message: errorMessage });
  }
  
  /** Approve a paragraph edit */
  approveParagraph(index: number): void {
    const paragraphIndex = this.currentState.paragraphEdits.findIndex(p => p.index === index);
    
    if (paragraphIndex === -1) {
      return;
    }
    
    // Create new array with updated paragraph (new object reference for Angular change detection)
    const updatedParagraphEdits = this.currentState.paragraphEdits.map((p, i) => 
      i === paragraphIndex 
        ? { ...p, approved: true as boolean | null }
        : p
    );
    
    this.updateState({
      ...this.currentState,
      paragraphEdits: updatedParagraphEdits
    });
    
    // Emit update message to notify chat component
    this.emitParagraphUpdateMessage();
  }
  
  /** Decline a paragraph edit */
  declineParagraph(index: number): void {
    const paragraphIndex = this.currentState.paragraphEdits.findIndex(p => p.index === index);
    
    if (paragraphIndex === -1) {
      return;
    }
    
    // Create new array with updated paragraph (new object reference for Angular change detection)
    const updatedParagraphEdits = this.currentState.paragraphEdits.map((p, i) => 
      i === paragraphIndex 
        ? { ...p, approved: false as boolean | null }
        : p
    );
    
    this.updateState({
      ...this.currentState,
      paragraphEdits: updatedParagraphEdits
    });
    
    // Emit update message to notify chat component
    this.emitParagraphUpdateMessage();
  }
  
  /** Emit update message for paragraph edits */
  private emitParagraphUpdateMessage(): void {
    const updateMessage: Message = {
      role: 'assistant',
      content: '', // Content rendered by Angular component
      timestamp: new Date(),
      isHtml: false,
      editWorkflow: {
        step: 'awaiting_approval',
        paragraphEdits: [...this.currentState.paragraphEdits],
        showCancelButton: false,
        showSimpleCancelButton: true,
        threadId: this.threadId,
        currentEditor: this.currentEditor,
        isSequentialMode: this.isSequentialMode,
        // ⚠️ UI MUST use isLastEditor flag - DO NOT infer from currentEditorIndex/totalEditors
        isLastEditor: this.isLastEditor,
        currentEditorIndex: this.currentEditorIndex,
        totalEditors: this.totalEditors
      }
    };
    
    this.messageSubject.next({ type: 'update', message: updateMessage });
  }
  
  /** Sync paragraph edits from message to service state (for final article generation) */
  syncParagraphEditsFromMessage(paragraphEdits: ParagraphEdit[]): void {
    if (paragraphEdits && paragraphEdits.length > 0) {
      // Reconstruct originalContent from paragraphEdits if service state doesn't have it
      let originalContent = this.currentState.originalContent;
      if (!originalContent || !originalContent.trim()) {
        originalContent = this.reconstructOriginalContent(paragraphEdits);
      }
      
      this.updateState({
        ...this.currentState,
        paragraphEdits: [...paragraphEdits],
        originalContent: originalContent || this.currentState.originalContent
      });
    }
  }

  /** Sync threadId from message to service state (same as Guided Journey stores it in component) */
  syncThreadIdFromMessage(threadId: string | null | undefined): void {
    if (threadId && !this.threadId) {
      this.threadId = threadId;
    }
  }
  
  /** Check if all paragraphs have been decided */
  get allParagraphsDecided(): boolean {
    const paragraphEdits = this.currentState.paragraphEdits;
    
    // First check if all feedback is decided (matches component logic)
    // This allows "Approve All" / "Reject All" to enable buttons when they only affect feedback items
    const feedbackDecided = this.allParagraphFeedbackDecided(paragraphEdits);
    if (feedbackDecided) {
      return true; // Enable buttons when all feedback is decided
    }
    
    // Otherwise, check both paragraph-level and feedback decisions
    const paragraphsDecided = allParagraphsDecided(paragraphEdits);
    return paragraphsDecided && feedbackDecided;
  }

  /** Check if all paragraph feedback items are decided */
  private allParagraphFeedbackDecided(paragraphEdits: ParagraphEdit[]): boolean {
    if (!paragraphEdits || paragraphEdits.length === 0) {
      return true; // No feedback to decide
    }
    
    return paragraphEdits.every(para => {
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

  /** Get paragraphs that require user review (excludes auto-approved) */
  get getParagraphsForReview(): ParagraphEdit[] {
    return this.currentState.paragraphEdits.filter(p => p.autoApproved !== true).sort((a, b) => a.index - b.index);
  }
  
  /** Reconstruct original content from paragraph edits (like Guided Journey) */
  public reconstructOriginalContent(paragraphEdits: ParagraphEdit[]): string {
    if (!paragraphEdits || paragraphEdits.length === 0) {
      return '';
    }
    
    // Sort by index to ensure correct order
    const sortedEdits = [...paragraphEdits].sort((a, b) => a.index - b.index);
    
    // Combine all original paragraphs
    return sortedEdits.map(p => p.original).filter(p => p && p.trim()).join('\n\n');
  }

  /** Collect editorial feedback decisions for a paragraph (matches guided journey) */
  public collectFeedbackDecisions(para: ParagraphEdit): any {
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

  /** Check if a paragraph has any approved editorial feedback items */
  private hasApprovedEditorialFeedback(para: ParagraphEdit): boolean {
    if (!para.editorial_feedback) {
      return false;
    }
    
    const feedbackTypes = Object.keys(para.editorial_feedback);
    for (const editorType of feedbackTypes) {
      const feedbacks = (para.editorial_feedback as any)[editorType] || [];
      if (feedbacks.some((fb: any) => fb.approved === true)) {
        return true;
      }
    }
    
    return false;
  }
  
  /** Move to next editor in sequential workflow */
  async nextEditor(paragraphEdits: ParagraphEdit[], threadIdFromMessage?: string | null): Promise<void> {
    const effectiveThreadId = this.threadId || threadIdFromMessage;
    
    if (!effectiveThreadId) {
      console.error('[ChatEditWorkflowService] No thread_id available for next editor');
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ **No thread ID available.** Cannot proceed to next editor.',
        timestamp: new Date()
      };
      this.messageSubject.next({ type: 'prompt', message: errorMessage });
      return;
    }

    // Update service's threadId if it was null and we got it from message
    if (!this.threadId && threadIdFromMessage) {
      this.threadId = threadIdFromMessage;
    }

    // 🔒 totalEditors is locked at initialization - DO NOT recalculate here
    // If it's 0, that means processContent() was never called, which is an error state
    if (!this.totalEditors || this.totalEditors === 0) {
      console.error('[ChatEditWorkflowService] totalEditors is 0 - processContent() should have initialized it');
    }

    if (paragraphEdits && paragraphEdits.length > 0) {
      this.syncParagraphEditsFromMessage(paragraphEdits);
    }

    // Use synced paragraph edits from state (ensures we have the latest state)
    const currentParagraphEdits = this.currentState.paragraphEdits.length > 0 
      ? this.currentState.paragraphEdits 
      : paragraphEdits;

    if (!this.allParagraphsDecided) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ **Please approve or reject all paragraph edits** before proceeding to the next editor.',
        timestamp: new Date()
      };
      this.messageSubject.next({ type: 'prompt', message: errorMessage });
      return;
    }

    this.isGeneratingNextEditorSubject.next(true);

    try {
      // Collect decisions - check for approved editorial feedback (same logic as generateFinalArticle)
      // IMPORTANT: If paragraph has approved editorial feedback, set approved=true even if paragraph-level approved is null
      // This ensures backend uses edited content when moving to next editor
      const decisions = currentParagraphEdits.map(para => {
        // Check if paragraph has any approved editorial feedback
        const hasApprovedFeedback = this.hasApprovedEditorialFeedback(para);
        // Paragraph is approved if: explicitly approved OR has approved feedback items
        // This matches generateFinalArticle() logic and ensures backend uses edited content
        const isApproved = para.approved === true || (para.approved !== false && hasApprovedFeedback);
        
        return {
          index: para.index,
          approved: isApproved
        };
      });

      const paragraph_edits_data = currentParagraphEdits.map(para => ({
        index: para.index,
        original: para.original,
        edited: para.edited,
        tags: para.tags || [],
        autoApproved: para.autoApproved || false,
        approved: para.approved,
        editorial_feedback: para.editorial_feedback || {}
      }));

      // const apiUrl = (window as any)._env?.apiUrl || '';
      const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${apiUrl}/api/v1/tl/edit-content/next`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          thread_id: effectiveThreadId,
          paragraph_edits: paragraph_edits_data,
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
                
                if (data.type === 'all_complete') {
                  this.isGeneratingNextEditorSubject.next(false);
                  this.isLastEditor = true;
                  this.currentEditorIndex = this.totalEditors;
                  
                  // Use the most recent paragraph edits from state (should be updated by last editor_complete)
                  // If all_complete includes paragraph_edits, process them; otherwise use current state
                  let paragraphEditsToUse = [...this.currentState.paragraphEdits];
                  
                  if (data.paragraph_edits && Array.isArray(data.paragraph_edits) && data.paragraph_edits.length > 0) {
                    // Process paragraph edits from all_complete if provided
                    const allEditorNames = this.currentState.selectedEditors.map(editorId => {
                      return getEditorDisplayName(editorId);
                    });
                    
                    const originalContent = data.original_content || this.currentState.originalContent || '';
                    const originalParagraphs = originalContent ? splitIntoParagraphs(originalContent) : [];
                    
                    paragraphEditsToUse = data.paragraph_edits.map((edit: any, arrayIndex: number) => {
                      const existingTags = edit.tags || [];
                      const existingEditorNames = new Set<string>(
                        existingTags.map((tag: string) => {
                          const match = tag.match(/^(.+?)\s*\(/);
                          return match ? match[1].trim() : tag;
                        })
                      );
                      
                      const allTags = [...existingTags];
                      allEditorNames.forEach(editorName => {
                        const existingNamesArray = Array.from(existingEditorNames) as string[];
                        if (!existingNamesArray.some((existing: string) => 
                          existing.toLowerCase().includes(editorName.toLowerCase()) || 
                          editorName.toLowerCase().includes(existing.toLowerCase())
                        )) {
                          allTags.push(`${editorName} (Reviewed)`);
                        }
                      });
                      
                      const paragraphIndex = (edit.index !== undefined && edit.index !== null) ? edit.index : arrayIndex;
                      const originalText = (edit.original && edit.original.trim()) || (originalParagraphs.length > paragraphIndex && paragraphIndex >= 0 ? (originalParagraphs[paragraphIndex] && originalParagraphs[paragraphIndex].trim()) || '' : '');
                      const editedText = (edit.edited && edit.edited.trim()) || '';
                      const isIdentical = validateStringEquality(originalText, editedText);
                      const autoApproved = edit.autoApproved !== undefined ? edit.autoApproved : isIdentical;
                      const approved = autoApproved ? true : (edit.approved !== undefined ? edit.approved : null);

                      const editorial_feedback = edit.editorial_feedback ? {
                        development: edit.editorial_feedback.development || [],
                        content: edit.editorial_feedback.content || [],
                        copy: edit.editorial_feedback.copy || [],
                        line: edit.editorial_feedback.line || [],
                        brand: edit.editorial_feedback.brand || []
                      } : undefined;

                      return {
                        index: paragraphIndex,
                        original: originalText,
                        edited: editedText,
                        tags: allTags,
                        autoApproved: autoApproved,
                        approved: approved,
                        block_type: (edit.block_type !== undefined && edit.block_type !== null && edit.block_type !== '') ? edit.block_type : 'paragraph',
                        level: edit.level || 0,
                        editorial_feedback: editorial_feedback,
                        displayOriginal: undefined,
                        displayEdited: undefined
                      } as ParagraphEdit;
                    });
                    
                    // Update state with processed paragraph edits
                    this.updateState({
                      ...this.currentState,
                      paragraphEdits: paragraphEditsToUse
                    });
                  }
                  
                  const updateMessage: Message = {
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                    isHtml: false,
                    editWorkflow: {
                      step: 'awaiting_approval',
                      paragraphEdits: paragraphEditsToUse,
                      showCancelButton: false,
                      showSimpleCancelButton: true,
                      threadId: this.threadId,
                      currentEditor: this.currentEditor,
                      isSequentialMode: this.isSequentialMode,
                      isLastEditor: true,
                      currentEditorIndex: this.currentEditorIndex,
                      totalEditors: this.totalEditors,
                      isGeneratingNextEditor: false
                    }
                  };
                  this.messageSubject.next({ type: 'update', message: updateMessage });
                  return;
                }

                if (data.type === 'editor_complete') {
                  if (data.thread_id) {
                    this.threadId = data.thread_id;
                    this.isSequentialMode = true;
                  }

                  if (data.current_editor) {
                    this.currentEditor = data.current_editor;
                    this.currentEditorIndex = data.editor_index || 0;
                    this.totalEditors = data.total_editors || this.totalEditors;
                    this.isLastEditor = (data.editor_index || 0) >= (data.total_editors || this.totalEditors || 1) - 1;
                  }

                  let newParagraphEdits: ParagraphEdit[] = [];
                  if (data.paragraph_edits && Array.isArray(data.paragraph_edits)) {
                    const allEditorNames = this.currentState.selectedEditors.map(editorId => {
                      return getEditorDisplayName(editorId);
                    });
                    
                    const originalContent = data.original_content || this.currentState.originalContent || '';
                    const originalParagraphs = originalContent ? splitIntoParagraphs(originalContent) : [];
                    
                    newParagraphEdits = data.paragraph_edits.map((edit: any, arrayIndex: number) => {
                      const existingTags = edit.tags || [];
                      const existingEditorNames = new Set<string>(
                        existingTags.map((tag: string) => {
                          const match = tag.match(/^(.+?)\s*\(/);
                          return match ? match[1].trim() : tag;
                        })
                      );
                      
                      const allTags = [...existingTags];
                      allEditorNames.forEach(editorName => {
                        const existingNamesArray = Array.from(existingEditorNames) as string[];
                        if (!existingNamesArray.some((existing: string) => 
                          existing.toLowerCase().includes(editorName.toLowerCase()) || 
                          editorName.toLowerCase().includes(existing.toLowerCase())
                        )) {
                          allTags.push(`${editorName} (Reviewed)`);
                        }
                      });
                      
                      const paragraphIndex = (edit.index !== undefined && edit.index !== null) ? edit.index : arrayIndex;
                      const originalText = (edit.original && edit.original.trim()) || (originalParagraphs.length > paragraphIndex && paragraphIndex >= 0 ? (originalParagraphs[paragraphIndex] && originalParagraphs[paragraphIndex].trim()) || '' : '');
                      const editedText = (edit.edited && edit.edited.trim()) || '';
                      const isIdentical = validateStringEquality(originalText, editedText);
                      const autoApproved = edit.autoApproved !== undefined ? edit.autoApproved : isIdentical;
                      const approved = autoApproved ? true : (edit.approved !== undefined ? edit.approved : null);

                      const editorial_feedback = edit.editorial_feedback ? {
                        development: edit.editorial_feedback.development || [],
                        content: edit.editorial_feedback.content || [],
                        copy: edit.editorial_feedback.copy || [],
                        line: edit.editorial_feedback.line || [],
                        brand: edit.editorial_feedback.brand || []
                      } : undefined;

                      return {
                        index: paragraphIndex,
                        original: originalText,
                        edited: editedText,
                        tags: allTags,
                        autoApproved: autoApproved,
                        approved: approved,
                        block_type: (edit.block_type !== undefined && edit.block_type !== null && edit.block_type !== '') ? edit.block_type : 'paragraph',
                        level: edit.level || 0,
                        editorial_feedback: editorial_feedback,
                        displayOriginal: undefined,
                        displayEdited: undefined
                      } as ParagraphEdit;
                    });
                  }

                  // Update content
                  if (data.original_content) {
                    this.updateState({
                      ...this.currentState,
                      originalContent: data.original_content
                    });
                  }

                  this.updateState({
                    ...this.currentState,
                    paragraphEdits: newParagraphEdits
                  });

                  this.isGeneratingNextEditorSubject.next(false);

                  const paragraphMessage: Message = {
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                    isHtml: false,
                    editWorkflow: {
                      step: 'awaiting_approval',
                      paragraphEdits: newParagraphEdits,
                      showCancelButton: false,
                      showSimpleCancelButton: true,
                      threadId: this.threadId,
                      currentEditor: this.currentEditor,
                      isSequentialMode: this.isSequentialMode,
                      // ⚠️ UI MUST use isLastEditor flag - DO NOT infer from currentEditorIndex/totalEditors
                      isLastEditor: this.isLastEditor,
                      currentEditorIndex: this.currentEditorIndex,
                      totalEditors: this.totalEditors,
                      isGeneratingNextEditor: false
                    }
                  };
                  this.messageSubject.next({ type: 'update', message: paragraphMessage });
                }

                if (data.type === 'error') {
                  throw new Error(data.error || 'Unknown error');
                }
              } catch (e) {
                console.error('[ChatEditWorkflowService] Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[ChatEditWorkflowService] Error in nextEditor:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `⚠️ **Failed to proceed to next editor.** ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date()
      };
      this.messageSubject.next({ type: 'prompt', message: errorMessage });
    } finally {
      // Reset generating state
      this.isGeneratingNextEditorSubject.next(false);
    }
  }
  
  /** Generate final article using approved edits */
  async generateFinalArticle(): Promise<void> {
    if (!this.allParagraphsDecided) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ **Please approve or decline all paragraph edits** before generating the final article.',
        timestamp: new Date()
      };
      this.messageSubject.next({ type: 'prompt', message: errorMessage });
      return;
    }
    
    this.isGeneratingFinalSubject.next(true);
    
    try {
      // Collect decisions with feedback decisions (matches guided journey)
      // IMPORTANT: If paragraph has approved editorial feedback, set approved=true even if paragraph-level approved is null
      // This matches guided journey's updateParagraphApprovedStatus() logic and ensures backend uses edited content
      const decisions = this.currentState.paragraphEdits.map(p => {
        // Check if paragraph has any approved editorial feedback
        const hasApprovedFeedback = this.hasApprovedEditorialFeedback(p);
        // Paragraph is approved if: explicitly approved OR has approved feedback items
        // This matches guided journey's updateParagraphApprovedStatus() logic
        const isApproved = p.approved === true || (p.approved !== false && hasApprovedFeedback);
        
        return {
          index: p.index,
          approved: isApproved,
          editorial_feedback_decisions: this.collectFeedbackDecisions(p)
        };
      });
      
      // Get originalContent - use service state if available, otherwise reconstruct from paragraphEdits
      let originalContent = this.currentState.originalContent;
      
      if (!originalContent || !originalContent.trim()) {
        originalContent = this.reconstructOriginalContent(this.currentState.paragraphEdits);
      }
      
      if (!originalContent || !originalContent.trim()) {
        throw new Error('Original content cannot be empty. Unable to reconstruct from paragraph edits.');
      }
      
      const authHeaders = await this.getAuthHeaders();
      const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
      
      const response = await fetch(`${apiUrl}/api/v1/tl/edit-content/final`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          original_content: originalContent,
          paragraph_edits: this.currentState.paragraphEdits.map(p => ({
            index: p.index,
            original: p.original,
            edited: p.edited,
            tags: p.tags,
            autoApproved: p.autoApproved || false,
            block_type: p.block_type || 'paragraph',
            level: p.level || 0,
            editorial_feedback: p.editorial_feedback || {}
          })),
          decisions: decisions,
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
      
      // Update paragraph message to show final output (component will handle display)
      const updatedParagraphEdits = [...this.currentState.paragraphEdits];

      // const uploadedFileName = this.currentState.uploadedFile?.name;
      const selectedEditorNames = this.getSelectedEditorNames(this.currentState.selectedEditors);
      
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
        console.log('[ChatEditWorkflowService] Final article block_types distribution:', typeCounts);
        console.log('[ChatEditWorkflowService] Total block_types:', blockTypes.length, 'Sample:', blockTypes.slice(0, 5));
      } else {
        // Fallback: generate from paragraphEdits (shouldn't happen if backend is working correctly)
        console.warn('[ChatEditWorkflowService] Backend did not provide block_types, falling back to paragraphEdits');
        blockTypes = this.currentState.paragraphEdits.map(p => ({
          index: p.index,
          type: p.block_type || 'paragraph',
          level: p.level || 0
        }));
      }
      
      // Apply block_type formatting to the final article
      const formattedFinalHtml = formatFinalArticleWithBlockTypes(finalArticle, blockTypes);
      // const finalArticleHtml = `<div class="result-section"><div class="assistant-message revised-content-formatted">${formattedFinalHtml}</div></div>`;
      const uploadedFileName = this.currentState.uploadedFile?.name;
      const headerLines: string[] = ['### Quick Start Thought Leadership – Edit Content'];
      if (uploadedFileName) {
        headerLines.push(`_Source: ${uploadedFileName}_`);
      }
      headerLines.push('');
      
      const headerHtml = convertMarkdownToHtml(headerLines.join('\n'));
      
      // Combine header and formatted content
      const combinedHtml = `${headerHtml}${formattedFinalHtml}`;
      const finalArticleHtml = `<div class="result-section"><div class="assistant-message revised-content-formatted">${combinedHtml}</div></div>`;

      

      // Update paragraph edits message to indicate final output has been generated
      const updateMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isHtml: false,
        editWorkflow: {
          step: 'awaiting_approval',
          paragraphEdits: [...this.currentState.paragraphEdits],
          showCancelButton: false,
          showSimpleCancelButton: true,
          threadId: this.threadId,
          currentEditor: this.currentEditor,
          isSequentialMode: this.isSequentialMode,
          isLastEditor: this.isLastEditor,
          currentEditorIndex: this.currentEditorIndex,
          totalEditors: this.totalEditors,
          finalOutputGenerated: true
        }
      };
      this.messageSubject.next({ type: 'update', message: updateMessage });
      
      const finalMessage: Message = {
        role: 'assistant',
        content: finalArticleHtml,
        timestamp: new Date(),
        isHtml: true,
        thoughtLeadership: {
          contentType: 'edit-article',
          topic: 'Final Revised Article',
          fullContent: finalArticle,
          showActions: true,
          block_types: blockTypes  // Store block types for export formatting
        }
      };
      
      // Send final article message (paragraph edits remain visible in previous message)
      this.messageSubject.next({ type: 'result', message: finalMessage });
      
      // Add small delay before resetting workflow state to prevent race conditions with UI rendering
      // This ensures the final message is fully rendered before state is cleared
      setTimeout(() => {
        this.completeWorkflow();
      }, 150);
      
    } catch (error) {
      console.error('Error generating final article:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `⚠️ **Failed to generate final article.** ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date()
      };
      this.messageSubject.next({ type: 'prompt', message: errorMessage });
    } finally {
      this.isGeneratingFinalSubject.next(false);
    }
  }
}
