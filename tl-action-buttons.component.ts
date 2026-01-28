import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';

import { ChatService, TlChatBridgeService, ChatEditWorkflowService, ChatDraftWorkflowService, ChatSessionSummary, ChatSessionDetail } from '../../core/services';
import { AuthService } from '../../auth/auth.service';
import { TlFlowService } from '../../core/services/tl-flow.service';
//import { MiFlowService } from '../../core/services/mi-flow.service';
import { MiFlowService } from '../../features/market-intelligence/mi-flow.service';
//import { InteractionStatus } from '@azure/msal-browser';
import { DdcFlowService } from '../../core/services/ddc-flow.service';
import { Message, ChatSession } from '../../core/models';
import { JourneyType, TL_WORKFLOWS, DDC_WORKFLOWS, MI_WORKFLOWS, WorkflowCard } from '../../core/models/guided-journey.models';
import { MessageListComponent } from './components/message-list/message-list.component';
import { ChatInputComponent } from './components/chat-input/chat-input.component';
import { ChatHistorySidebarComponent } from './components/chat-history-sidebar/chat-history-sidebar.component';
import { WelcomeScreenComponent, QuickAction } from './components/welcome-screen/welcome-screen.component';
import { GuidedDialogComponent } from '../../shared/components/guided-dialog/guided-dialog.component';
import { DraftContentFlowComponent } from '../thought-leadership/draft-content-flow/draft-content-flow.component';
import { ConductResearchFlowComponent } from '../thought-leadership/conduct-research-flow/conduct-research-flow.component';
import { EditContentFlowComponent } from '../thought-leadership/edit-content-flow/edit-content-flow.component';
import { RefineContentFlowComponent } from '../thought-leadership/refine-content-flow/refine-content-flow.component';
import { FormatTranslatorFlowComponent } from '../thought-leadership/format-translator-flow/format-translator-flow.component';
import { BrandFormatFlowComponent } from '../ddc/brand-format-flow/brand-format-flow.component';
import { ProfessionalPolishFlowComponent } from '../ddc/professional-polish/professional-polish-flow.component';
import { SanitizationFlowComponent } from '../ddc/sanitization/sanitization-flow.component';
import { ClientCustomizationFlowComponent } from '../ddc/client-customization/client-customization-flow.component';
import { RfpResponseFlowComponent } from '../ddc/rfp-response/rfp-response-flow.component';
import { FormatTranslatorFlowComponent as DdcFormatTranslatorFlowComponent } from '../ddc/format-translator/format-translator-flow.component';
import { SlideCreationFlowComponent } from '../ddc/slide-creation/slide-creation-flow.component';
import { SlideCreationPromptFlowComponent } from '../ddc/slide-creation-prompt/slide-creation-prompt-flow.component';
import { Subject, Observable } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { InteractionStatus } from '@azure/msal-browser';
import { MiCreatePOVFlowComponent } from '../../features/market-intelligence/create-pov-flow/create-pov-flow.component';
import { MiPrepareClientMeetingFlowComponent } from '../../features/market-intelligence/prepare-client-meeting-flow/prepare-client-meeting-flow.component';
import { MiGatherProposalInsightsFlowComponent } from '../../features/market-intelligence/gather-proposal-insights-flow/gather-proposal-insights-flow.component';
import { MiTargetIndustryInsightsFlowComponent } from '../../features/market-intelligence/target-industry-insights-flow/target-industry-insights-flow.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    MessageListComponent,
    ChatInputComponent,
    ChatHistorySidebarComponent,
    WelcomeScreenComponent,
    GuidedDialogComponent,
    DraftContentFlowComponent,
    ConductResearchFlowComponent,
    EditContentFlowComponent,
    RefineContentFlowComponent,
    FormatTranslatorFlowComponent,
    BrandFormatFlowComponent,
    ProfessionalPolishFlowComponent,
    SanitizationFlowComponent,
    ClientCustomizationFlowComponent,
    RfpResponseFlowComponent,
    DdcFormatTranslatorFlowComponent,
    SlideCreationFlowComponent,
    SlideCreationPromptFlowComponent,
    MiCreatePOVFlowComponent,
    MiPrepareClientMeetingFlowComponent,
    MiGatherProposalInsightsFlowComponent,
    MiTargetIndustryInsightsFlowComponent
],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild(MessageListComponent) messageList?: MessageListComponent;
  @ViewChild(ChatInputComponent) chatInput?: ChatInputComponent;

  messages: Message[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  uploadedFile: File | null = null;
  selectedFlow: 'ppt' | 'thought-leadership' | 'market-intelligence' = 'thought-leadership';
  
  // Chat history
  currentSessionId: string | null = null;
  savedSessions: ChatSession[] = [];
  showHistoryPanel: boolean = false;
  searchQuery: string = '';
  
  // Database chat history tracking
  private userId: string = 'anonymous@example.com'; // TODO: Get from auth service
  private dbSessionId: string = '';
  private dbThreadId: string | null = null;
  
  // Database-driven chat history (new)
  dbChatSessions: ChatSession[] = []; // Changed to ChatSession[] for compatibility
  isLoadingDbSessions: boolean = false;
  isLoadingDbConversation: boolean = false;
  selectedSourceFilter: string = ''; // NEW: Source filter for chat history
  
  // Guided dialogs
  showGuidedDialog: boolean = false;
  currentJourney: JourneyType | null = null;
  currentWorkflows: WorkflowCard[] = [];
  
  private readonly STORAGE_KEY = 'pwc_chat_sessions';
  private readonly MAX_SESSIONS = 20;
  private destroy$ = new Subject<void>();
  private currentStreamingSubscription: any = null;

  quickActions: QuickAction[] = [
    {
      title: 'Draft Presentation',
      description: 'AI-powered slide outline generation with PwC best practices',
      icon: 'draft',
      action: 'draft_ppt'
    },
    {
      title: 'Improve Formatting',
      description: 'Fix spelling, grammar, alignment, and color branding',
      icon: 'improve',
      action: 'improve_ppt'
    },
    {
      title: 'Sanitize Document',
      description: 'Remove client data with tier-based workflow',
      icon: 'sanitize',
      action: 'sanitize_ppt'
    },
    {
      title: 'Validate Best Practices',
      description: 'Check against PwC consulting standards',
      icon: 'validate',
      action: 'validate_ppt'
    }
  ];

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private tlChatBridge: TlChatBridgeService,
    private tlFlowService: TlFlowService,
    private ddcFlowService: DdcFlowService,
    private miFlowService: MiFlowService,
    public editWorkflowService: ChatEditWorkflowService,
    public draftWorkflowService: ChatDraftWorkflowService
  ) {
    console.log('[ChatComponent] Constructor called');
    console.log('[ChatComponent] TlChatBridge service:', this.tlChatBridge);
  }

  ngOnInit(): void {
    console.log('[ChatComponent] ngOnInit called - v1.1');
    console.log('[ChatComponent] EditWorkflowService injected:', this.editWorkflowService);
    
    // Initialize database session ID for chat history tracking
    this.dbSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log('[ChatComponent] Initialized database session:', this.dbSessionId);
    
    this.loadSessions();
    
    // Wait for authentication to complete before loading database sessions
    this.authService.getLoginStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        console.log('[ChatComponent] Login status:', status);
        
        // When not in the middle of interaction, try to get user info
        if (status === InteractionStatus.None) {
          // Get actual logged-in user email from auth service
          const userInfo = this.authService.getUserInfo();
          if (userInfo && userInfo.email) {
            this.userId = userInfo.email;
            console.log('[ChatComponent] ✅ Set userId from AuthService:', this.userId);
            // Now load database sessions with correct user
            this.loadDbSessions();
          } else {
            console.warn('[ChatComponent] ⚠️ Could not get user email from AuthService, using fallback');
            this.userId = 'anonymous@example.com';
            // Still try to load (might have mock data)
            this.loadDbSessions();
          }
        }
      });
    
    this.initializeChat();
    this.subscribeToThoughtLeadership();
    this.subscribeToEditWorkflow();
    this.subscribeToDraftWorkflow();
  }

  ngOnDestroy(): void {
    // Cleanup streaming subscription
    if (this.currentStreamingSubscription) {
      this.currentStreamingSubscription.unsubscribe();
      this.currentStreamingSubscription = null;
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToThoughtLeadership(): void {
    console.log('[ChatComponent] Subscribing to Thought Leadership messages');
    console.log('[ChatComponent] message$ observable:', this.tlChatBridge.message$);
    
    this.tlChatBridge.message$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          console.log('[ChatComponent] Received TL message:', message);
          console.log('[ChatComponent] Current messages count before push:', this.messages.length);
          this.messages.push(message);
          console.log('[ChatComponent] Current messages count after push:', this.messages.length);
          this.saveCurrentSession();
          setTimeout(() => {
            this.messageList?.triggerScrollToBottom();
          }, 100);
        },
        error: (err) => {
          console.error('[ChatComponent] Error in TL subscription:', err);
        },
        complete: () => {
          console.log('[ChatComponent] TL subscription completed');
        }
      });
    
    console.log('[ChatComponent] Subscription setup complete');
  }

  private subscribeToEditWorkflow(): void {
    console.log('[ChatComponent] Subscribing to Edit Workflow messages');
    
    this.editWorkflowService.message$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workflowMessage) => {
          console.log('[ChatComponent] Received Edit Workflow message:', workflowMessage);
          this.messages.push(workflowMessage.message);
          this.saveCurrentSession();
          this.isLoading=false;
          setTimeout(() => {
            this.messageList?.triggerScrollToBottom();
          }, 100);
        },
        error: (err) => {
          console.error('[ChatComponent] Error in Edit Workflow subscription:', err);
        }
      });
    
    // Subscribe to workflow completion to clear state
    this.editWorkflowService.workflowCompleted$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[ChatComponent] Workflow completed - clearing state');
          this.userInput = '';
          this.uploadedFile = null;
          // Clear file input element in chat input component
          if (this.chatInput) {
            this.chatInput.clearFileInput();
          }
          // Notify message list to reset file upload components
          if (this.messageList) {
            this.messageList.resetFileUploads();
          }
        }
      });
    
    console.log('[ChatComponent] Edit Workflow subscription setup complete');
  }

  private subscribeToDraftWorkflow(): void {
    console.log('[ChatComponent] Subscribing to Draft Workflow messages');

    this.draftWorkflowService.message$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workflowMessage) => {
          console.log('[ChatComponent] Received Draft Workflow message:', workflowMessage);
          this.messages.push(workflowMessage.message);
          this.saveCurrentSession();
          setTimeout(() => {
            this.messageList?.triggerScrollToBottom();
          }, 100);
        },
        error: (err) => {
          console.error('[ChatComponent] Error in Draft Workflow subscription:', err);
        }
      });

    this.draftWorkflowService.workflowCompleted$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[ChatComponent] Draft Workflow completed - clearing state');
          this.userInput = '';
        }
      });
  }

  initializeChat(): void {
    if (this.messages.length === 0) {
      this.messages.push({
        role: 'assistant',
        content: 'Hello! I\'m your MCX AI assistant. How can I help you today?',
        timestamp: new Date()
      });
    }
  }

  async sendMessage(): Promise<void> {
    // CRITICAL: Log to window object to ensure it's visible
    (window as any).LAST_SEND_MESSAGE_CALL = new Date().toISOString();
    
    if ((!this.userInput.trim() && !this.uploadedFile) || this.isLoading) {
      return;
    }

    const input = this.userInput.trim();
    const fileToUpload = this.uploadedFile;
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    this.userInput = '';
    
    this.messageList?.triggerScrollToBottom();

    // CHECK IF USER IS RESPONDING TO DRAFT SATISFACTION QUESTION - MUST BE FIRST!
    // This is the HIGHEST PRIORITY - must never reach edit intent if awaiting feedback
    const isAwaitingFeedback = this.tlChatBridge.isAwaitingDraftFeedback();
    const draftContext = this.tlChatBridge.getDraftContext();
    
    if (isAwaitingFeedback) {
      console.log('[ChatComponent] *** HANDLING DRAFT FEEDBACK - Input: "' + input + '" ***');
      console.log('[ChatComponent] Draft context available:', draftContext);
      
      // Use LLM to analyze satisfaction (with keyword fallback)
      const satisfactionResult = await this.analyzeDraftSatisfactionWithLLM(input, draftContext);
      
      // If analysis returned uncertainty (asking for clarification), don't proceed further
      if (!satisfactionResult.isPositive && !satisfactionResult.hasImprovementRequest) {
        this.messageList?.triggerScrollToBottom();
        this.saveCurrentSession();
        return;
      }
      
      if (satisfactionResult.isPositive) {
        // User is satisfied with the draft
        console.log('[ChatComponent] ✓ User SATISFIED with draft - ending draft flow');
        const acknowledgment: Message = {
          role: 'assistant',
          content: 'Great! I\'m glad you\'re satisfied with the content. You can now use it in your documents or make further edits as needed.',
          timestamp: new Date()
        };
        this.messages.push(acknowledgment);
        this.tlChatBridge.clearDraftContext();
        console.log('[ChatComponent] Context cleared after satisfaction');
        this.messageList?.triggerScrollToBottom();
        this.saveCurrentSession();
        return;
      } else if (satisfactionResult.hasImprovementRequest) {
        // User wants improvements
        console.log('[ChatComponent] ✗ User wants IMPROVEMENTS - Input:', satisfactionResult.improvementText);
        const draftContext = this.tlChatBridge.getDraftContext();
        console.log('[ChatComponent] Draft context available:', !!draftContext);
        
        if (draftContext) {
          console.log('[ChatComponent] Processing improvement request with context');
          this.isLoading = true;
          
          // Create improvement message for the backend
          const improvementMessage = `${input}`;
          
          const assistantMessage: Message = {
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
          };
          this.messages.push(assistantMessage);
          
          // Call the draft improvement endpoint
          const messages: Message[] = [{
            role: 'user' as const,
            content: improvementMessage,
            timestamp: new Date()
          }];
          
          const draftParams = {
            contentType: draftContext.contentType,
            topic: draftContext.topic,
            wordLimit: draftContext.wordLimit,
            audienceTone: draftContext.audienceTone,
            outlineDoc: draftContext.outlineDoc,
            supportingDoc: draftContext.supportingDoc,
            useFactivaResearch: draftContext.useFactivaResearch
          };

          this.chatService.streamDraftContent(messages, improvementMessage, draftParams).subscribe({
            next: (chunk: any) => {
              if (typeof chunk === 'string') {
                assistantMessage.content += chunk;
              } else if (chunk && chunk.type === 'content' && chunk.content) {
                assistantMessage.content += chunk.content;
              }
              this.messageList?.triggerScrollToBottom();
            },
            error: (error) => {
              console.error('[ChatComponent] Error processing draft improvement:', error);
              assistantMessage.isStreaming = false;
              assistantMessage.content = 'I apologize, but I encountered an error while processing your improvement request. Please try again.';
              this.isLoading = false;
              this.tlChatBridge.clearDraftContext();
            },
            complete: () => {
              console.log('[ChatComponent] Improvement streaming complete');
              assistantMessage.isStreaming = false;
              this.isLoading = false;
              
              // Ask for satisfaction again
              if (assistantMessage.content && assistantMessage.content.trim()) {
                const newSatisfactionMessage: Message = {
                  role: 'system',
                  content: 'Are you satisfied with this revised content? If not, let me know what else needs to be improved.',
                  timestamp: new Date()
                };
                this.messages.push(newSatisfactionMessage);
                
                // Update draft context with new content
                draftContext.generatedContent = assistantMessage.content;
                this.tlChatBridge.setDraftContext(draftContext);
                console.log('[ChatComponent] Context updated with new content, still awaiting feedback');
              }
              
              this.saveCurrentSession();
              this.messageList?.triggerScrollToBottom();
            }
          });
          
          // EXIT EARLY - don't process as edit intent or other workflows!
          console.log('[ChatComponent] Returning from draft improvement flow');
          return;
        } else {
          console.warn('[ChatComponent] Draft context not found, clearing and continuing');
          this.tlChatBridge.clearDraftContext();
          return;
        }
      }
      
      // If we get here, clear the draft context and continue to normal chat
      console.log('[ChatComponent] Unclear satisfaction response, clearing draft context');
      this.tlChatBridge.clearDraftContext();
      return;
    }
    
    // If we reach here, we are NOT awaiting draft feedback - safe to check other intents
    console.log('[ChatComponent] NOT awaiting draft feedback - proceeding to check other intents');

    // Handle Edit Content workflow integration
    // BUT: Don't even check edit intent if we're awaiting draft feedback!
    if (this.tlChatBridge.isAwaitingDraftFeedback()) {
      console.log('[ChatComponent] Still awaiting draft feedback, preventing edit intent check');
      // This shouldn't happen if draft check executed properly, but safety check
      return;
    }
    
    const workflowActive = this.editWorkflowService.isActive;
    const hasEditIntent = await this.editWorkflowService.detectEditIntent(input);
    
    if (workflowActive || hasEditIntent || (fileToUpload && workflowActive)) {
      // Use the workflow service's handleChatInput method
      this.editWorkflowService.handleChatInput(input, fileToUpload || undefined);
      this.uploadedFile = null;
      return;
    }

    // Handle Draft Content workflow integration
    const draftWorkflowActive = this.draftWorkflowService.isActive;
    if (draftWorkflowActive) {
      this.draftWorkflowService.handleChatInput(input);
      return;
    }

    // Check for intents if no workflow is active
    if (!workflowActive && !draftWorkflowActive) {
      // Check for Rewrite Intent first (before calling backend detection)
      if (this.isRewriteIntent(input)) {
        console.log('[ChatComponent] Rewrite intent detected, delegating to draft workflow service');
        // Add user message to chat first
        const userMessage: Message = {
          role: 'user',
          content: input,
          timestamp: new Date()
        };
        this.messages.push(userMessage);
        this.userInput = '';
        this.messageList?.triggerScrollToBottom();
        this.saveCurrentSession();
        
        this.draftWorkflowService.handleChatInput(input);
        return;
      }

      // Check for Edit Intent
      const editIntent = await this.editWorkflowService.detectEditIntent(input);
      if (editIntent.hasEditIntent) {
        if (editIntent.detectedEditors && editIntent.detectedEditors.length > 0) {
          this.editWorkflowService.beginWorkflowWithEditors(editIntent.detectedEditors);
        } else {
          this.editWorkflowService.beginWorkflow();
        }
        return;
      }

      // Check for Draft Intent

      const draftIntent = await this.draftWorkflowService.detectDraftIntent(input);
      console.log('[ChatComponent] Draft intent detected:', draftIntent);
      console.log('[ChatComponent] Content type array:', draftIntent.detectedContentType, 'Length:', draftIntent.detectedContentType?.length);
      
      if (draftIntent.hasDraftIntent) {
        console.log('[ChatComponent] Starting conversational quick draft with topic:', draftIntent.detectedTopic, 'contentType:', draftIntent.detectedContentType?.[0]);
        
        // Add user message to chat first
        const userMessage: Message = {
          role: 'user',
          content: input,
          timestamp: new Date()
        };
        this.messages.push(userMessage);
        this.userInput = '';
        this.messageList?.triggerScrollToBottom();
        this.saveCurrentSession();
        
        // If content type is missing, use beginWorkflow to start full input flow
        if (!draftIntent.detectedContentType || draftIntent.detectedContentType.length === 0) {
          console.log('[ChatComponent] Content type missing, starting full workflow with topic:', draftIntent.detectedTopic);
          this.draftWorkflowService.beginWorkflow(draftIntent.detectedTopic || '', '', draftIntent.wordLimit, draftIntent.audienceTone);
        } else {
          console.log('[ChatComponent] Content type found, using startQuickDraftConversation');
          // Start conversational flow with detected values
          const topic = draftIntent.detectedTopic || 'the given topic';
          const contentType = this.formatContentType(draftIntent.detectedContentType?.[0] || 'article');
          const wordLimit = draftIntent.wordLimit || undefined;
          const audienceTone = draftIntent.audienceTone || undefined;
          
          this.draftWorkflowService.startQuickDraftConversation(
            topic,
            contentType,
            undefined,
            wordLimit,
            audienceTone
          );
        }
        return;
      }
    }
 
    
    // Default chat flow - clear file only if not used by workflow
    this.uploadedFile = null;
    this.isLoading = true;

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    this.messages.push(assistantMessage);

    // Unsubscribe from any previous streaming if user switches tabs
    if (this.currentStreamingSubscription) {
      this.currentStreamingSubscription.unsubscribe();
    }

    this.currentStreamingSubscription = this.chatService.streamChat(
      this.messages.slice(0, -1),
      this.userId,
      this.dbSessionId,
      this.dbThreadId || undefined
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (chunk: string) => {
        assistantMessage.content += chunk;
        this.messageList?.triggerScrollToBottom();
      },
      error: (error) => {
        console.error('Error sending message:', error);
        assistantMessage.isStreaming = false;
        assistantMessage.content = 'I apologize, but I encountered an error. Please try again.';
        this.isLoading = false;
        this.currentStreamingSubscription = null;
      },
      complete: () => {
        assistantMessage.isStreaming = false;
        this.saveCurrentSession();
        this.isLoading = false;
        this.currentStreamingSubscription = null;
      }
    });
  }

  onFileSelected(file: File): void {
    this.uploadedFile = file;
  }

  onFileRemoved(): void {
    this.uploadedFile = null;
  }

  onEditorsSubmitted(selectedIds: string[]): void {
    this.editWorkflowService.handleEditorSelection(selectedIds);
  }

  onQuickActionClick(action: string): void {
    console.log('Quick action clicked:', action);
    // Handle quick action - can expand to show forms
  }

  onQuickStart(): void {
    // Initialize quick start flow
    this.userInput = 'I need help creating a presentation';
  }

  onGuidedJourney(): void {
    console.log('[ChatComponent] TL Guided journey initiated');
    this.currentJourney = 'thought-leadership';
    this.currentWorkflows = TL_WORKFLOWS;
    this.showGuidedDialog = true;
  }

  onDdcGuidedJourney(): void {
    console.log('[ChatComponent] DDC Guided journey initiated');
    this.currentJourney = 'ddc';
    this.currentWorkflows = DDC_WORKFLOWS;
    this.showGuidedDialog = true;
  }

  onMIGuidedJourney(): void {
    console.log('[ChatComponent] MI Guided journey initiated');
    this.currentJourney = 'market-intelligence';
    this.currentWorkflows = MI_WORKFLOWS;
    this.showGuidedDialog = true;
  }

  closeGuidedDialog(): void {
    this.showGuidedDialog = false;
    this.currentJourney = null;
    this.currentWorkflows = [];
  }

  onWorkflowSelected(workflowId: string): void {
    console.log(`[ChatComponent] Workflow selected: ${workflowId}, Journey: ${this.currentJourney}`);
    

    if (this.currentJourney === 'thought-leadership') {
      // If workflow is draft-content, try to use detected topic/contentType
      if (workflowId === 'draft-content') {
        // Use last detected topic/contentType if available
        const topic = this.tlFlowService.preselectedTopic;
        const contentType = this.tlFlowService.preselectedContentType;
        this.tlFlowService.openFlow(workflowId as any, contentType || undefined, topic || undefined);
      } else {
        this.tlFlowService.openFlow(workflowId as any);
      }
    } else if (this.currentJourney === 'ddc') {
      this.ddcFlowService.openFlow(workflowId as any);
    }
    
    this.closeGuidedDialog();
  }

  // Legacy method for backwards compatibility
  onTLActionCardClick(flowType: string): void {
    this.closeGuidedDialog();
    if (flowType === 'draft-content') {
      const topic = this.tlFlowService.preselectedTopic;
      const contentType = this.tlFlowService.preselectedContentType;
      this.tlFlowService.openFlow(flowType as any, contentType || undefined, topic || undefined);
    } else {
      this.tlFlowService.openFlow(flowType as 'draft-content' | 'conduct-research' | 'edit-content' | 'refine-content' | 'format-translator');
    }
  }

  onMIActionCardClick(flowType: string): void {
    this.closeGuidedDialog();
    this.miFlowService.openFlow(flowType as 'conduct-research' | 'create-pov' | 'prepare-client-meeting' | 'gather-proposal-insights' | 'target-industry-insights');
    }

  // Chat History Methods
  loadSessions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.savedSessions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.savedSessions = [];
    }
  }

  saveCurrentSession(): void {
    if (this.messages.length <= 1) return;

    const session: ChatSession = {
      id: this.currentSessionId || this.generateSessionId(),
      title: this.generateSessionTitle(),
      messages: [...this.messages],
      timestamp: new Date(),
      lastModified: new Date()
    };

    this.currentSessionId = session.id;

    const existingIndex = this.savedSessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      this.savedSessions[existingIndex] = session;
    } else {
      this.savedSessions.unshift(session);
      if (this.savedSessions.length > this.MAX_SESSIONS) {
        this.savedSessions = this.savedSessions.slice(0, this.MAX_SESSIONS);
      }
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedSessions));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  loadSession(sessionId: string): void {
    const session = this.savedSessions.find(s => s.id === sessionId);
    if (session) {
      this.messages = [...session.messages];
      this.currentSessionId = session.id;
      this.showHistoryPanel = false;
    }
  }

  deleteSession(sessionId: string): void {
    this.savedSessions = this.savedSessions.filter(s => s.id !== sessionId);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedSessions));
    } catch (error) {
      console.error('Error deleting session:', error);
    }

    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
      this.initializeChat();
    }
  }

  toggleHistoryPanel(): void {
    this.showHistoryPanel = !this.showHistoryPanel;
    // Load database sessions when opening history panel
    if (this.showHistoryPanel) {
      this.loadDbSessions();
    }
  }

  // ===== Database-Driven Chat History Methods =====
  // These methods load chat history from the database (lazy loading)

  /**
   * Load all chat session summaries from database for current user.
   * Only loads titles and metadata, NOT full conversations (lazy loading).
   * Called when user opens history panel or logs in.
   */
  loadDbSessions(): void {
    this.isLoadingDbSessions = true;
    
    console.log('[ChatComponent] Loading database sessions for user:', this.userId);
    
    this.chatService.getUserSessions(
      this.userId,
      this.selectedSourceFilter || undefined
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (sessions: ChatSessionSummary[]) => {
        // Convert ChatSessionSummary to ChatSession format for compatibility with sidebar
        this.dbChatSessions = (sessions || []).map(s => ({
          id: s.session_id,
          title: s.title || s.preview,
          messages: [], // Empty - full conversation loaded on-demand
          timestamp: new Date(s.created_at),
          lastModified: new Date(s.updated_at)
        }));
        
        this.isLoadingDbSessions = false;
        console.log(`[ChatComponent] ✅ Successfully loaded ${this.dbChatSessions.length} sessions from database`);
        console.log('[ChatComponent] Sessions:', this.dbChatSessions);
      },
      error: (error: any) => {
        console.error('[ChatComponent] ❌ Error loading sessions from database:', error);
        console.error('[ChatComponent] Error details:', error.message);
        this.isLoadingDbSessions = false;
        this.dbChatSessions = [];
      }
    });
  }

  /**
   * Load full conversation for a specific session from database.
   * Called only when user clicks on a session in history.
   * @param sessionId Session identifier
   */
  loadDbConversation(sessionId: string): void {
    this.isLoadingDbConversation = true;
    
    console.log('[ChatComponent] Loading conversation for session:', sessionId);
    
    this.chatService.getSessionConversation(sessionId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (sessionData: ChatSessionDetail) => {
        // Load messages from database session
        if (sessionData && sessionData.conversation && sessionData.conversation.messages) {
          this.messages = sessionData.conversation.messages;
          this.currentSessionId = sessionData.session_id;
          this.showHistoryPanel = false;
          this.isLoadingDbConversation = false;
          console.log(`[ChatComponent] ✅ Loaded conversation from database: ${sessionId}`);
          console.log(`[ChatComponent] Messages count: ${this.messages.length}`);
        }
      },
      error: (error: any) => {
        console.error(`[ChatComponent] ❌ Error loading conversation for session ${sessionId}:`, error);
        this.isLoadingDbConversation = false;
      }
    });
  }

  /**
   * Delete a chat session from database.
   * @param sessionId Session identifier
   */
  deleteDbSession(sessionId: string): void {
    this.chatService.deleteSession(sessionId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Remove from local list
        this.dbChatSessions = this.dbChatSessions.filter(
          (s: any) => s.session_id !== sessionId
        );
        
        if (this.currentSessionId === sessionId) {
          this.currentSessionId = null;
          this.initializeChat();
        }
        
        console.log(`[ChatComponent] Deleted session from database: ${sessionId}`);
      },
      error: (error: any) => {
        console.error(`[ChatComponent] Error deleting session ${sessionId}:`, error);
      }
    });
  }

  /**
   * Filter database chat sessions by source.
   * Called when user selects a source filter in history panel.
   * @param source Source filter (Chat, DDDC, Cortex, etc.)
   */
  filterDbSessionsBySource(source: string): void {
    this.selectedSourceFilter = source;
    this.loadDbSessions();
  }


  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionTitle(): string {
    const userMessages = this.messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0].content;
      return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
    }
    return 'New Chat';
  }

  get showWelcome(): boolean {
    return this.messages.length <= 1;
  }

  /**
   * Detect if user input is a rewrite/regenerate intent
   */
  private isRewriteIntent(input: string): boolean {
    const lowerInput = input.toLowerCase();
    const rewriteKeywords = ['rewrite', 'regenerate', 'again', 'try again', 'different', 'change it', 'redo', 'remake', 'rethink'];
    return rewriteKeywords.some(keyword => lowerInput.includes(keyword));
  }

  /**
   * Format content type to proper case (e.g., 'article' -> 'Article')
   */
  private formatContentType(type: string): string {
    if (!type) return 'Article';
    
    // Map lowercase to proper names
    const typeMap: { [key: string]: string } = {
      'article': 'Article',
      'blog': 'Blog',
      'white paper': 'White Paper',
      'white_paper': 'White Paper',
      'executive brief': 'Executive Brief',
      'executive_brief': 'Executive Brief'
    };

    return typeMap[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Analyze user response to draft satisfaction question
   * Returns: { isPositive: boolean, hasImprovementRequest: boolean, improvementText: string }
   */
  private async analyzeDraftSatisfactionWithLLM(
    input: string,
    draftContext: any
  ): Promise<{ isPositive: boolean, hasImprovementRequest: boolean, improvementText: string, confidence?: number }> {
    try {
      
      // Call backend endpoint to analyze satisfaction
      console.log('[ChatComponent] [LLM] Calling chatService.analyzeSatisfaction()...');
      const response = await this.chatService.analyzeSatisfaction({
        user_input: input,
        generated_content: draftContext.generatedContent || '',
        content_type: draftContext.contentType,
        topic: draftContext.topic
      }).toPromise();
      
      // Check if response exists
      if (!response) {
        console.error('[ChatComponent] [LLM] ❌ Response is null or undefined!');
        return this.analyzeDraftSatisfactionResponseKeywordFallback(input);
      }
      
      // If confidence is high enough, trust the LLM (> 0.6)
      if (response.confidence > 0.6) {
        console.log('[ChatComponent] [LLM] ✓ High confidence (' + response.confidence + ') - PROCEEDING');
        console.log('[ChatComponent] [LLM] Result: ' + (response.is_satisfied ? '✓ SATISFIED' : '✗ NEEDS IMPROVEMENT'));
        return {
          isPositive: response.is_satisfied,
          hasImprovementRequest: !response.is_satisfied,
          improvementText: input,
          confidence: response.confidence
        };
      }
      
      // If confidence is in middle range (0.3-0.6), show clarification request
      if (response.confidence >= 0.3 && response.confidence <= 0.6) {
        console.log('[ChatComponent] [LLM] ⚠ Medium confidence (' + response.confidence + '), asking for clarification');
        const clarification: Message = {
          role: 'assistant',
          content: `I want to make sure I understand correctly. You said: "${input}"\n\nAre you satisfied with the content and ready to use it, or would you like me to make improvements?`,
          timestamp: new Date()
        };
        this.messages.push(clarification);
        // Return false to indicate we're still waiting for clarity
        return { isPositive: false, hasImprovementRequest: false, improvementText: '' };
      }
      
      // Very low confidence - treat as improvement request to be safe
      console.log('[ChatComponent] [LLM] ⚠⚠ Very low confidence (' + response.confidence + '), treating as improvement request');
      return {
        isPositive: false,
        hasImprovementRequest: true,
        improvementText: input,
        confidence: response.confidence
      };
      
    } catch (error) {
    
      console.log('[ChatComponent] [LLM] Using keyword-based fallback analysis...');
      const result = this.analyzeDraftSatisfactionResponseKeywordFallback(input);
      console.log('[ChatComponent] [LLM] Fallback result:', result);
      return result;
    }
  }

  /**
   * Fallback keyword-based satisfaction analysis (used when LLM fails)
   */
  private analyzeDraftSatisfactionResponseKeywordFallback(input: string): { isPositive: boolean, hasImprovementRequest: boolean, improvementText: string } {
    const lowerInput = input.toLowerCase().trim();
    
    
    // EXPLICIT SATISFACTION - must be confident positive responses
    const satisfactionKeywords = [
      'yes', 'yeah', 'yep', 'looks good', 'looks perfect', 'perfect', 'great', 'exactly', 
      'excellent', 'love it', 'love this', 'satisfied', 'happy', 'approved', 'accepted'
    ];
    
    // EXPLICIT IMPROVEMENT INDICATORS - these are clear change requests
    const improvementIndicators = [
      // Pattern 1: "can you X" - explicit request for action
      /can you/i,
      // Pattern 2: Action verbs followed by object
      /make it/, /make them/, /make the/,
      /add /, /remove /, /change /, /update /,
      /shorten/, /shorter/, /concise/, /concisely/,
      /longer/, /expand/, /expand /, /enhance /,
      /simplify/, /simpler/, /clearer/, /clarity/,
      /improve/, /fix/, /revise/, /rewrite/, /regenerate/,
      /redo/, /try again/
    ];
    
    // Check for explicit satisfaction
    const hasSatisfactionKeyword = satisfactionKeywords.some(keyword => lowerInput.includes(keyword));
    
    // Check for improvement indicators
    const hasImprovementIndicator = improvementIndicators.some(pattern => pattern.test(lowerInput));
    
    // Check for explicit negatives
    const hasNegative = /\b(no|nope|don't|doesn't|not happy|not satisfied|hate|bad)\b/i.test(lowerInput);
    
    
    // If has improvement indicator (like "can you"), it's a clear improvement request
    if (hasImprovementIndicator) {
      console.log('[ChatComponent] [FALLBACK] ✗ Result: IMPROVEMENT REQUEST (matched indicator pattern)');
      return {
        isPositive: false,
        hasImprovementRequest: true,
        improvementText: input
      };
    }
    
    // If has explicit satisfaction keyword and no negative, it's satisfied
    if (hasSatisfactionKeyword && !hasNegative) {
      console.log('[ChatComponent] [FALLBACK] ✓ Result: SATISFIED (positive keyword match)');
      return {
        isPositive: true,
        hasImprovementRequest: false,
        improvementText: ''
      };
    }
    
    // If has negative indicator, it's an improvement request
    if (hasNegative) {
      console.log('[ChatComponent] [FALLBACK] ✗ Result: IMPROVEMENT REQUEST (negative indicator)');
      return {
        isPositive: false,
        hasImprovementRequest: true,
        improvementText: input
      };
    }
    
    // Ambiguous responses - treat as improvement request to be safe
    console.log('[ChatComponent] [FALLBACK] ⚠ Ambiguous response, treating as improvement request');
    return {
      isPositive: false,
      hasImprovementRequest: true,
      improvementText: input
    };
  }
}

