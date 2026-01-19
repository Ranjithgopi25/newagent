import { Component, EventEmitter, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatService, ThemeService, ThemeMode, TlChatBridgeService, ToastService } from '../../core/services';
import { ChatEditWorkflowService } from '../../core/services/chat-edit-workflow.service';
import { ChatDraftWorkflowService } from '../../core/services/chat-draft-workflow.service';
import { Message, ChatSession, ThoughtLeadershipRequest, ThoughtLeadershipMetadata, MarketIntelligenceMetadata, EditorOption } from '../../core/models';
import { SourceCitationPipe } from '../../core/pipes';
import { TlFlowService } from '../../core/services/tl-flow.service';
import { DdcFlowService } from '../../core/services/ddc-flow.service';
import { AuthService } from '../../auth/auth.service';
import { AuthFetchService } from '../../core/services/auth-fetch.service';
import { MiFlowService } from '../../features/market-intelligence/mi-flow.service';
import { MiChatBridgeService } from '../../features/market-intelligence/mi-chat-bridge.service';
import { DDC_WORKFLOWS, MI_WORKFLOWS, DDC_INTRO_TEXT, DDC_SUB_INTRO_TEXT } from '../../core/models/guided-journey.models';
import { DraftContentFlowComponent } from '../../features/thought-leadership/draft-content-flow/draft-content-flow.component';
import { ConductResearchFlowComponent } from '../../features/thought-leadership/conduct-research-flow/conduct-research-flow.component';
import { EditContentFlowComponent } from '../../features/thought-leadership/edit-content-flow/edit-content-flow.component';
import { RefineContentFlowComponent } from '../../features/thought-leadership/refine-content-flow/refine-content-flow.component';
import { FormatTranslatorFlowComponent } from '../../features/thought-leadership/format-translator-flow/format-translator-flow.component';
import { GeneratePodcastFlowComponent } from '../../features/thought-leadership/generate-podcast-flow/generate-podcast-flow.component';
import { BrandFormatFlowComponent } from '../../features/ddc/brand-format-flow/brand-format-flow.component';
import { ProfessionalPolishFlowComponent } from '../../features/ddc/professional-polish/professional-polish-flow.component';
import { SanitizationFlowComponent } from '../../features/ddc/sanitization/sanitization-flow.component';
import { ClientCustomizationFlowComponent } from '../../features/ddc/client-customization/client-customization-flow.component';
import { RfpResponseFlowComponent } from '../../features/ddc/rfp-response/rfp-response-flow.component';
import { FormatTranslatorFlowComponent as DdcFormatTranslatorFlowComponent } from '../../features/ddc/format-translator/format-translator-flow.component';
import { SlideCreationFlowComponent } from '../../features/ddc/slide-creation/slide-creation-flow.component';
import { SlideCreationPromptFlowComponent } from '../../features/ddc/slide-creation-prompt/slide-creation-prompt-flow.component';
import { GuidedDialogComponent } from '../../shared/components/guided-dialog/guided-dialog.component';
import { QuickDraftDialogComponent, QuickDraftInputs } from '../../shared/components/quick-draft-dialog/quick-draft-dialog.component';
import { TlActionButtonsComponent } from '../../features/chat/components/message-list/tl-action-buttons/tl-action-buttons.component';
import { TlRequestFormComponent } from '../../features/phoenix/TL/request-form';
import { DDCRequestFormComponent } from '../../features/phoenix/ddc/request-form-ddc';
import { EditorSelectionComponent } from '../../features/chat/components/editor-selection/editor-selection.component';
import { EditorProgressComponent } from '../../shared/ui/components/editor-progress/editor-progress.component';
import { ParagraphEditsConsolidatedComponent } from '../../shared/ui/components/paragraph-edits/paragraph-edits-consolidated.component';
import { CanvasEditorComponent } from '../../features/thought-leadership/canvas-editor/canvas-editor.component';
import { CanvasStateService } from '../../core/services/canvas-state.service';
import { VoiceInputComponent } from '../../shared/components/voice-input/voice-input.component';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import { Observable, Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators';
import { marked } from 'marked';
import { CurrentUserService } from '../../core/services/current-user.service';
import { User } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';
import { extractDocumentTitle, convertMarkdownToHtml, BlockTypeInfo } from '../../core/utils/edit-content.utils';
import { formatFinalArticleWithBlockTypes } from '../../core/utils/edit-content.utils';

// Market Intelligence imports
import { MiDraftContentFlowComponent } from '../../features/market-intelligence/draft-content-flow/draft-content-flow.component';
import { MiConductResearchFlowComponent } from '../../features/market-intelligence/conduct-research-flow/conduct-research-flow.component';
import { MiEditContentFlowComponent } from '../../features/market-intelligence/edit-content-flow/edit-content-flow.component';
import { MiFormatTranslatorFlowComponent } from '../../features/market-intelligence/format-translator-flow/format-translator-flow.component';
import { MiGeneratePodcastFlowComponent } from '../../features/market-intelligence/generate-podcast-flow/generate-podcast-flow.component';
import { MiRefineContentFlowComponent } from '../../features/market-intelligence/refine-content-flow/refine-content-flow.component';
import { MiBrandFormatFlowComponent } from '../../features/market-intelligence/brand-format-flow/brand-format-flow.component';
import { MiProfessionalPolishFlowComponent } from '../../features/market-intelligence/professional-polish-flow/professional-polish-flow.component';
import { MiActionButtonsComponent } from '../../features/market-intelligence/mi-action-buttons/mi-action-buttons.component';
import { MiCreatePOVFlowComponent } from '../../features/market-intelligence/create-pov-flow/create-pov-flow.component';
import { MiPrepareClientMeetingFlowComponent } from '../../features/market-intelligence/prepare-client-meeting-flow/prepare-client-meeting-flow.component';
import { MiGatherProposalInsightsFlowComponent } from '../../features/market-intelligence/gather-proposal-insights-flow/gather-proposal-insights-flow.component';
import { MiTargetIndustryInsightsFlowComponent } from '../../features/market-intelligence/target-industry-insights-flow/target-industry-insights-flow.component';

@Component({
    selector: 'app-chat',
    imports: [
        CommonModule,
        FormsModule,
        SourceCitationPipe,
        DraftContentFlowComponent,
        ConductResearchFlowComponent,
        EditContentFlowComponent,
        RefineContentFlowComponent,
        FormatTranslatorFlowComponent,
        GeneratePodcastFlowComponent,
        BrandFormatFlowComponent,
        ProfessionalPolishFlowComponent,
        SanitizationFlowComponent,
        ClientCustomizationFlowComponent,
        RfpResponseFlowComponent,
        DdcFormatTranslatorFlowComponent,
        SlideCreationFlowComponent,
        SlideCreationPromptFlowComponent,
        GuidedDialogComponent,
        QuickDraftDialogComponent,
        TlActionButtonsComponent,
        TlRequestFormComponent,
        DDCRequestFormComponent,
        EditorSelectionComponent,
        CanvasEditorComponent,
        VoiceInputComponent,
        FileUploadComponent,
        EditorProgressComponent,
        ParagraphEditsConsolidatedComponent,
        MarkdownPipe,
        // Market Intelligence components
        MiDraftContentFlowComponent,
        MiConductResearchFlowComponent,
        MiEditContentFlowComponent,
        MiFormatTranslatorFlowComponent,
        MiGeneratePodcastFlowComponent,
        MiRefineContentFlowComponent,
        MiBrandFormatFlowComponent,
        MiProfessionalPolishFlowComponent,
        MiActionButtonsComponent,
        MiCreatePOVFlowComponent,
        MiPrepareClientMeetingFlowComponent,
        MiGatherProposalInsightsFlowComponent,
        MiTargetIndustryInsightsFlowComponent
    ],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;
  @ViewChild('quickStartBtn') private quickStartBtn?: ElementRef;
  @ViewChild('composerTextarea') private composerTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild(VoiceInputComponent) voiceInput?: VoiceInputComponent;
  @ViewChild(RefineContentFlowComponent) refineContentFlow?: RefineContentFlowComponent;
  @Output() raisePhoenix = new EventEmitter<void>();
  private shouldScrollToBottom = false;
  private destroy$ = new Subject<void>();
  private sanitizer = inject(DomSanitizer);
  messages: Message[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  isComposerExpanded: boolean = false;
  showDraftForm: boolean = false;
  showGuidedDialog: boolean = false;
  showPromptSuggestions: boolean = false;
  showLandingPage: boolean = true;
  landingPageFadingOut: boolean = false;
  // Simple in-component notification (toast)
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';
  showQuickDraftDialog: boolean = false;
  quickDraftTopic: string = '';
  quickDraftContentType: string = '';
  selectedActionCategory: string = '';
  selectedFlow: 'ppt' | 'thought-leadership' | 'market-intelligence' | undefined = undefined;
  selectedTLOperation: string = 'generate';
  selectedPPTOperation: string = 'draft';
  originalPPTFile: File | null = null;
  referencePPTFile: File | null = null;
  sanitizePPTFile: File | null = null;
  uploadedPPTFile: File | null = null;
  uploadedEditDocumentFile: File | null = null; // For Edit Content workflow
  editDocumentUploadError: string = ''; // Error message for file upload validation
  MAX_FILE_SIZE_MB = 5; 
  referenceDocument: File | null = null;
  editorialDocumentFile: File | null = null;
  referenceLink: string = '';
  currentAction: string = '';
  selectedDownloadFormat: string = 'word';
  showAttachmentArea: boolean = false;
  showRequestForm = false; // For DDC Request Form
  showTLRequestForm = false; // For TL Request Form (MCX Publication Support)
  // Store extracted text from uploaded documents (for non-workflow analysis) - supports multiple files
  extractedDocuments: Array<{ fileName: string; extractedText: string }> = [];
  isExtractingText: boolean = false;
  
  // Market Intelligence flow visibility
  showMIFlow: boolean = false;
  showTLFlow: boolean = false;
  showDDCFlow: boolean = false;

  //user details
  private currentUserService = inject(CurrentUserService);
  // expose user observable to template
  user$ = this.currentUserService.user$;
  // Dropdown state
  openDropdown: string | null = null;
  
  // LLM Service Provider and Model Selection
  selectedServiceProvider: 'openai' | 'anthropic' = 'openai';
  selectedModel: string = 'gpt-5.2';
  
  // LLM models by service provider
  llmModelsByProvider: { [key: string]: string[] } = {
    openai: ['gpt-5.2', 'gpt-5.1', 'gpt-5'],
    anthropic: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-2.1']
  };
  
  get availableModels(): string[] {
    return this.llmModelsByProvider[this.selectedServiceProvider] || [];
  }
  
  // Chat history persistence
  currentSessionId: string | null = null;
  savedSessions: ChatSession[] = [];
  private readonly STORAGE_KEY = 'pwc_chat_sessions';
  private readonly MAX_SESSIONS = 20;
  
  // Database-driven chat history (new approach)
  dbChatSessions: ChatSession[] = [];
  isLoadingDbSessions: boolean = false;
  isLoadingDbConversation: boolean = false;
  selectedSourceFilter: string = '';
  
  // Search functionality
  searchQuery: string = '';
  offeringVisibility = {
    'ppt': true,
    'thought-leadership': true,
    'market-intelligence': true
  };
  

  // Mobile menu state
  mobileMenuOpen: boolean = false;
  
  // Pending draft topic (for when user needs to select content type)
  private pendingDraftTopic: string | null = null;

  // Export dropdown state (per message)
  showExportDropdown: { [messageIndex: number]: boolean } = {};
  isExporting: { [messageIndex: number]: boolean } = {};
  isExported: { [messageIndex: number]: boolean } = {};
  exportFormat: { [messageIndex: number]: string } = {};
  
  // Sidebar collapse state (expanded by default)
  sidebarExpanded: boolean = true;
  
  // Theme dropdown state
  showThemeDropdown: boolean = false;
  prefersDark: boolean = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // History panel state
  showHistoryPanel: boolean = false;

  
  // PPT Quick Actions
  pptQuickActions: string[] = ['Doc Studio', 'Fix Formatting', 'Sanitize Documents', 'Validate Best Practices'];
  
  // NEW: Thought Leadership Quick Actions (5 Sections)
  tlQuickActions: string[] = ['Draft Content', 'Conduct Research', 'Edit Content', 'Refine Content', 'Format Translator'];
  
  // Dynamic quick actions based on selected flow
  get quickActions(): string[] {
    return this.selectedFlow === 'ppt' ? this.pptQuickActions : this.tlQuickActions;
  }
  
  promptCategories: any = {
    // PPT Categories
    draft: {
      title: 'Create Draft',
      prompts: [
        'Create a presentation on digital transformation strategy',
        'Draft slides about cloud migration benefits',
        'Build a deck on AI implementation roadmap',
        'Create an executive summary presentation'
      ]
    },
    improve: {
      title: 'Fix Formatting',
      prompts: [
        'Fix spelling and grammar in my presentation',
        'Align all shapes and text boxes',
        'Rebrand my deck with new colors',
        'Clean up slide formatting'
      ]
    },
    sanitize: {
      title: 'Sanitize Documents',
      prompts: [
        'Remove all client-specific data from my deck',
        'Sanitize numbers and metrics',
        'Clear all metadata and notes',
        'Remove logos and branding'
      ]
    },
    bestPractices: {
      title: 'Validate Best Practices',
      prompts: [
        'Validate my presentation against PwC best practices',
        'Check slide design and formatting standards',
        'Review chart and visual guidelines',
        'Ensure MECE framework compliance'
      ]
    },
    
    // NEW: Thought Leadership Categories (5 Sections)
    draftContent: {
      title: 'Draft Content',
      prompts: [
        'Draft an article on digital transformation trends',
        'Create a white paper on AI in business',
        'Write an executive brief on market insights',
        'Draft a blog post about future of work'
      ]
    },
    conductResearch: {
      title: 'Conduct Research',
      prompts: [
        'Research industry trends with multiple sources',
        'Analyze competitive landscape with citations',
        'Gather insights from PwC resources and external data',
        'Synthesize findings across documents and web sources'
      ]
    },
    editContent: {
      title: 'Edit Content',
      prompts: [
        'Apply brand alignment review to my article',
        'Perform copy editing on my white paper',
        'Get line editing suggestions for clarity',
        'Request content editor feedback on structure'
      ]
    },
    refineContent: {
      title: 'Refine Content',
      prompts: [
        'Expand my article to 2500 words with research',
        'Compress my white paper to executive brief format',
        'Adjust tone for C-suite audience',
        'Get suggestions to improve my content'
      ]
    },
    formatTranslator: {
      title: 'Format Translator',
      prompts: [
        'Convert my article to a blog post',
        'Transform this white paper into an executive brief',
        'Translate blog content to formal article',
        'Convert executive brief to comprehensive white paper'
      ]
    },
    generatePodcast: {
      title: 'Generate Podcast',
      prompts: [
        'Create a podcast episode about digital transformation',
        'Generate a podcast discussing industry trends',
        'Convert my article into a podcast script',
        'Create an audio version of my thought leadership content'
      ]
    },
    
    // Legacy TL Categories (kept for compatibility)
    generate: {
      title: 'Generate Article',
      prompts: [
        'Write an article on future of work',
        'Create thought leadership on sustainability',
        'Draft insights on digital innovation',
        'Generate content on industry trends'
      ]
    },
    research: {
      title: 'Research Assistant',
      prompts: [
        'Research trends in digital transformation',
        'Find competitive insights in my industry',
        'Analyze market opportunities and challenges',
        'Gather data on innovation best practices'
      ]
    },
    draftArticle: {
      title: 'Draft Article',
      prompts: [
        'Draft a case study on successful transformation',
        'Create an executive brief on industry trends',
        'Write a blog post about innovation',
        'Generate a white paper on technology adoption'
      ]
    },
    editorial: {
      title: 'Editorial Support',
      prompts: [
        'Review and improve my article structure',
        'Enhance clarity and readability',
        'Add professional touches to my draft',
        'Provide editorial feedback'
      ]
    }
  };

  draftData = {
    topic: '',
    objective: '',
    audience: '',
    additional_context: '',
    reference_document: '',
    reference_link: ''
  };

  sanitizeData = {
    clientName: '',
    products: '',
    options: {
      numericData: true,
      personalInfo: true,
      financialData: true,
      locations: true,
      identifiers: true,
      names: true,
      logos: true,
      metadata: true,
      llmDetection: true,
      hyperlinks: true,
      embeddedObjects: true
    }
  };

  thoughtLeadershipData = {
    topic: '',
    perspective: '',
    target_audience: '',
    document_text: '',
    target_format: '',
    additional_context: '',
    reference_document: '',
    reference_link: ''
  };

  researchData = {
    query: '',
    focus_areas: '',
    additional_context: '',
    links: ['']
  };
  researchFiles: File[] = [];

  articleData = {
    topic: '',
    content_type: 'Article',
    desired_length: 1000,
    tone: 'Professional',
    outline_text: '',
    additional_context: ''
  };

  bestPracticesData = {
    categories: {
      structure: true,
      visuals: true,
      design: true,
      charts: true,
      formatting: true,
      content: true
    }
  };

  outlineFile: File | null = null;
  supportingDocFiles: File[] = [];
  bestPracticesPPTFile: File | null = null;

  podcastData = {
    contentText: '',
    customization: '',
    podcastStyle: 'dialogue'
  };
  podcastFiles: File[] = [];

  // DDC Guided Journey support
  ddcWorkflows = DDC_WORKFLOWS;
  ddcIntroText = DDC_INTRO_TEXT;
  ddcSubIntroText = DDC_SUB_INTRO_TEXT;
  showDdcGuidedDialog: boolean = false;

   // MI Guided Journey support
  miWorkflows = MI_WORKFLOWS;
  showMiGuidedDialog: boolean = false;

  // Track where the workflow was opened from (quick-action or guided-dialog)
  workflowOpenedFrom: 'quick-action' | 'guided-dialog' | null = null;
  
  // Database chat history tracking
  private userId: string = '';
  private dbThreadId: string | null = null;
  private currentDdcConversationId: string | null = null;

  constructor(
    private chatService: ChatService,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    public tlFlowService: TlFlowService,
    public ddcFlowService: DdcFlowService,
    public miFlowService: MiFlowService,
    private tlChatBridge: TlChatBridgeService,
    private miChatBridge: MiChatBridgeService,
    private canvasStateService: CanvasStateService,
    public editWorkflowService: ChatEditWorkflowService,
    public draftWorkflowService: ChatDraftWorkflowService,
    private authService: AuthService,
    private authFetchService: AuthFetchService,
    private toastService: ToastService
  ) {}

  /**
   * Sanitize SVG content to prevent XSS attacks via SVG script elements
   * Uses DOMPurify to remove dangerous attributes and protocols
   * @param content SVG content string to sanitize
   * @returns Sanitized SVG string
   */
  sanitizeSvgContent(content: string): string {
    if (!content) return '';
    
    // DOMPurify is already configured globally in main.ts
    // This function provides an additional layer of sanitization
    import('dompurify').then((module) => {
      const DOMPurify = module.default;
      const config = {
        ALLOWED_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'g', 'polyline', 'polygon', 'ellipse', 'text', 'tspan', 'use', 'defs', 'clipPath'],
        ALLOWED_ATTR: [
          'viewBox', 'width', 'height', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
          'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'class',
          'transform', 'points', 'rx', 'ry', 'text-anchor', 'font-size', 'font-family',
          'font-weight', 'opacity', 'href', 'id', 'clip-path', 'preserveAspectRatio'
        ],
        KEEP_CONTENT: true,
        RETURN_DOM: false
      };
      return DOMPurify.sanitize(content, config);
    });

    // Synchronous fallback: remove dangerous protocols and event handlers
    let sanitized = content
      .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onload, etc.)
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/xlink:href\s*=\s*["']javascript:/gi, ''); // Remove javascript in xlink:href

    return sanitized;
  }

  /**
   * Get safe HTML for rendering dynamic SVG content
   * Use this when displaying SVG from external or user sources
   * @param svgContent SVG content to render safely
   * @returns SafeHtml that can be used with [innerHTML]
   */
  getSafeSvg(svgContent: string): SafeHtml {
    const sanitized = this.sanitizeSvgContent(svgContent);
    return this.sanitizer.sanitize(4, sanitized) || ''; // SecurityContext.HTML = 4
  }

  
  onRaisePhoenix(): void {
    this.showTLRequestForm = true;
    this.raisePhoenix.emit();
  }

  openRequestForm() {
    this.showRequestForm = true;
  }

  phoenixRdpLink = '';
  ticketNumber = '';
  translatedContent = '';

  onTicketCreated(event: {
    requestNumber: string;
    phoenixRdpLink: string;
  }): void {
    this.phoenixRdpLink = event.phoenixRdpLink;
    this.ticketNumber = event.requestNumber;
    console.log('Ticket created:', event.requestNumber);
    this.translatedContent = `✅ Request created successfully! Your request number is: <a href="${event.phoenixRdpLink}" target="_blank" rel="noopener noreferrer">${event.requestNumber}</a>`.trim();
    this.showRequestForm = false;
    this.showTLRequestForm = false;
    this.sendPhoenixRequestToChat();
  }

  sendPhoenixRequestToChat(): void {
    const topic = `Phoenix Request - ${this.ticketNumber}`;
    
    // Create metadata for the message
    const metadata: ThoughtLeadershipMetadata = {
      contentType: 'Phoenix_Request',
      topic: topic,
      fullContent: this.translatedContent,
      showActions: false
    };
    const chatMessage = this.translatedContent;
    
    // Send to chat via bridge
    console.log('[ChatComponent] Sending Phoenix request to chat with metadata:', metadata);
    this.tlChatBridge.sendToChat(chatMessage, metadata);
  }
  ngOnInit(): void {
    console.log('[ChatComponent-OLD] ngOnInit() called');
    
    // ✅ Wait for Azure AD authentication to complete before loading user
    console.log('[ChatComponent-OLD] Subscribing to authService.getLoginStatus()...');
    
    this.authService.getLoginStatus()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(
        (status: any) => {
          console.log('[ChatComponent-OLD] ✅ LOGIN STATUS EMITTED:', status, 'Type:', typeof status);
          
          // When not in the middle of interaction, try to get user info
          // InteractionStatus can be 'startup', 'none', or other values (case-sensitive!)
          const isAuthComplete = status === 'none' || status === 'None' || !status;
          console.log('[ChatComponent-OLD] Is auth complete (status === "none" || status === "None" || !status)?', isAuthComplete, '| Condition check:', { status, isNone: status === 'none', isNoneCapital: status === 'None', isFalsy: !status });
          
          if (isAuthComplete) {
            console.log('[ChatComponent-OLD] Auth complete, calling getUserInfo()...');
            const userInfo = this.authService.getUserInfo();
            console.log('[ChatComponent-OLD] getUserInfo() returned:', userInfo);
            
            if (userInfo && userInfo.email) {
              this.userId = userInfo.email;
              console.log('✅ [ChatComponent-OLD] Set userId from AuthService:', this.userId);
              // Now load sessions from database
              console.log('[ChatComponent-OLD] Calling loadDbSessions()...');
              this.loadDbSessions();
            } else {
              this.userId = 'anonymous@example.com';
              console.warn('⚠️ [ChatComponent-OLD] No user logged in from AuthService, using anonymous');
              this.loadSavedSessions(); // Fall back to localStorage
            }
          } else {
            console.log('[ChatComponent-OLD] Auth NOT complete yet, status:', status, '- waiting for next emission...');
          }
        },
        (error) => {
          console.error('[ChatComponent-OLD] ❌ Error in authService.getLoginStatus():', error);
        },
        () => {
          console.log('[ChatComponent-OLD] authService.getLoginStatus() completed');
        }
      );
    
    // Keep existing subscriptions for other features
    this.subscribeToThoughtLeadership();
    this.subscribeToMarketIntelligence();
    this.subscribeToCanvasUpdates();
    this.subscribeToEditWorkflow();
    this.subscribeToDdcGuidedDialog();
    this.subscribeToMiGuidedDialog();
    this.subscribeToTLGuidedDialog();
    this.subscribeToDraftWorkflow();
    let welcomeMessage = '';
    // this.messages.push({
    //   role: 'assistant',
    //   content: "Welcome to PwC Presentation Assistant!",
    //   timestamp: new Date()
    // });

    // Initialize sidebar / mobile menu state based on current viewport
    try {
      const w = window.innerWidth || 0;
      // On desktop widths keep sidebar expanded; on mobile (<=768px) keep it closed
      this.sidebarExpanded = w >= 769;
      this.mobileMenuOpen = false;
      console.log('[ChatComponent] Initial sidebarExpanded=', this.sidebarExpanded, 'mobileMenuOpen=', this.mobileMenuOpen);
    } catch (e) {
      // ignore in non-browser environments
    }

    // Focus quick start button after view init
    setTimeout(() => {
      this.quickStartBtn?.nativeElement?.focus();
    }, 100);
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }
  
  private subscribeToThoughtLeadership(): void {
    this.tlChatBridge.message$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          console.log('[ChatComponent] Received message from TL bridge:', message);
          console.log('[ChatComponent] Message has thoughtLeadership metadata:', !!message.thoughtLeadership);
          if (message.thoughtLeadership) {
            console.log('[ChatComponent] TL metadata:', message.thoughtLeadership);
            console.log('[ChatComponent] Content type:', message.thoughtLeadership.contentType);
            console.log('[ChatComponent] Has podcast audio URL:', !!message.thoughtLeadership.podcastAudioUrl);
          }
          console.log('Pushing message to chat');
          this.messages.push(message);
          this.saveCurrentSession();
          this.triggerScrollToBottom();
        },
        error: (err) => {
          console.error('[ChatComponent] Error in TL subscription:', err);
        }
      });
  }

  private subscribeToMarketIntelligence(): void {
    console.log('[ChatComponent] Subscribing to Market Intelligence messages');
    
    this.miChatBridge.messageToChat$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data) {
            console.log('[ChatComponent] Received message from MI bridge:', data);
            
            const assistantMessage: Message = {
              role: 'assistant',
              content: data.content,
              timestamp: new Date(),
              sources: undefined,
              flowType: 'market-intelligence',
              marketIntelligence: data.metadata  // Store MI metadata on the message
            };

            this.messages.push(assistantMessage);
            this.saveCurrentSession();
            this.triggerScrollToBottom();
          }
        },
        error: (err) => {
          console.error('[ChatComponent] Error in MI subscription:', err);
        }
      });
  }
  
  private subscribeToEditWorkflow(): void {
    console.log('[ChatComponent] Subscribing to Edit Workflow messages');
    
    this.editWorkflowService.message$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workflowMessage) => {
          console.log('[ChatComponent] Received Edit Workflow message:', workflowMessage);
          
          // Handle message updates (e.g., paragraph approval state changes, loading states, next editor content)
          if (workflowMessage.type === 'update') {
            // Find existing paragraph edit message to update
            // Look for message with awaiting_approval step (with or without paragraph edits)
            const existingIndex = this.messages.findIndex(m => 
              m.editWorkflow?.step === 'awaiting_approval' && 
              m.editWorkflow?.threadId === workflowMessage.message.editWorkflow?.threadId
            );
            
            if (existingIndex !== -1) {
              // Update existing paragraph edit message with new state (create new array reference for change detection)
              const existingMessage = this.messages[existingIndex];
              if (workflowMessage.message.editWorkflow && existingMessage.editWorkflow) {
                // Check if this is a next editor update (new paragraph edits from next editor)
                const hasNewParagraphEdits = workflowMessage.message.editWorkflow.paragraphEdits && 
                  workflowMessage.message.editWorkflow.paragraphEdits.length > 0;
                
                existingMessage.editWorkflow = {
                  ...existingMessage.editWorkflow,
                  ...workflowMessage.message.editWorkflow,
                  threadId: workflowMessage.message.editWorkflow.threadId ?? existingMessage.editWorkflow.threadId,
                  currentEditor: workflowMessage.message.editWorkflow.currentEditor ?? existingMessage.editWorkflow.currentEditor,
                  isSequentialMode: workflowMessage.message.editWorkflow.isSequentialMode ?? existingMessage.editWorkflow.isSequentialMode,
                  isLastEditor: workflowMessage.message.editWorkflow.isLastEditor ?? existingMessage.editWorkflow.isLastEditor,
                  currentEditorIndex: workflowMessage.message.editWorkflow.currentEditorIndex ?? existingMessage.editWorkflow.currentEditorIndex,
                  totalEditors: workflowMessage.message.editWorkflow.totalEditors ?? existingMessage.editWorkflow.totalEditors,
                  paragraphEdits: workflowMessage.message.editWorkflow.paragraphEdits 
                    ? [...workflowMessage.message.editWorkflow.paragraphEdits]
                    : existingMessage.editWorkflow.paragraphEdits
                };
                
                this.saveCurrentSession();
                this.cdr.detectChanges();
                
                // Scroll to paragraph edits after update (especially when next editor content arrives)
                // Use longer timeout for next editor to ensure DOM is fully updated
                if (hasNewParagraphEdits && !workflowMessage.message.editWorkflow?.finalOutputGenerated) {
                  setTimeout(() => {
                    this.scrollToParagraphEdits(existingIndex);
                  }, 300); // Longer timeout for next editor to ensure DOM is fully updated
                }
              } else {
                this.saveCurrentSession();
                this.cdr.detectChanges();
              }
              return;
            }
          }
          
          // If this is a progress message, update the existing one instead of creating new ones
          if (workflowMessage.message.editWorkflow?.step === 'processing' && 
              workflowMessage.message.editWorkflow?.editorProgress) {
            // Find and update existing progress message
            const existingIndex = this.messages.findIndex(m => 
              m.editWorkflow?.step === 'processing' && 
              m.editWorkflow?.editorProgress &&
              m.content === '' // Progress messages have empty content
            );
            
            if (existingIndex !== -1) {
              // Update existing progress message
              this.messages[existingIndex] = workflowMessage.message;
            } else {
              // First progress message, add it
              console.log('[ChatComponent] Adding first progress message');
              this.messages.push(workflowMessage.message);
              this.isLoading=false;
            }
          } else {
            // Regular message, add it
            console.log('[ChatComponent] Adding regular workflow message');
            this.messages.push(workflowMessage.message);
            this.isLoading= false;
            
            // If this message has paragraph edits, scroll to top of paragraph edits section (instructions area)
            if (workflowMessage.message.editWorkflow?.paragraphEdits && 
                workflowMessage.message.editWorkflow.paragraphEdits.length > 0) {
              this.saveCurrentSession();
              this.cdr.detectChanges();
              // Use longer timeout to ensure DOM is fully rendered, then scroll to top of paragraph edits
              setTimeout(() => {
                const messageIndex = this.messages.length - 1;
                this.scrollToParagraphEdits(messageIndex);
              }, 200);
              return;
            }
            
            // If this is a final output message (has thoughtLeadership with topic 'Final Revised Article'),
            // don't scroll - keep user at paragraph edits section
            if (workflowMessage.message.thoughtLeadership?.topic === 'Final Revised Article') {
              this.saveCurrentSession();
              this.cdr.detectChanges();
              // Don't scroll - keep user's current position at paragraph edits
              return;
            }
          }
          
          this.saveCurrentSession();
          setTimeout(() => {
            this.triggerScrollToBottom();
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
          this.clearWorkflowState();
        }
      });
    
    // Subscribe to workflow started to clear previous state when new workflow begins
    this.editWorkflowService.workflowStarted$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('[ChatComponent] Workflow started - clearing previous state');
          this.clearWorkflowState();
        }
      });
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
            this.scrollToBottom();
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
  
  private subscribeToCanvasUpdates(): void {
    this.canvasStateService.contentUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (update) => {
          // Find the message by extracting index from messageId
          const messageIndex = parseInt(update.messageId.replace('msg_', ''));
          if (messageIndex >= 0 && messageIndex < this.messages.length) {
            const message = this.messages[messageIndex];
            // Update message content
            message.content = update.updatedContent;
            // Update thoughtLeadership metadata if it exists
            if (message.thoughtLeadership) {
              message.thoughtLeadership.fullContent = update.updatedContent;
            }
            this.saveCurrentSession();
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('[ChatComponent] Error in Canvas update subscription:', err);
        }
      });
  }
  

  private subscribeToDdcGuidedDialog(): void {
    this.ddcFlowService.guidedDialog$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isOpen) => {
          this.showDdcGuidedDialog = isOpen;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[ChatComponent] Error in DDC Guided Dialog subscription:', err);
        }
      });
  }

    private subscribeToMiGuidedDialog(): void {
    this.miFlowService.guidedDialog$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isOpen) => {
          this.showGuidedDialog = isOpen;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[ChatComponent] Error in MI Guided Dialog subscription:', err);
        }
      });
  }

  private subscribeToTLGuidedDialog(): void {
    this.tlFlowService.guidedDialog$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isOpen) => {
          this.showGuidedDialog = isOpen;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[ChatComponent] Error in TL Guided Dialog subscription:', err);
        }
      });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  private scrollToParagraphEdits(messageIndex: number): void {
    // Scroll to paragraph edits instructions section (top of paragraph edits, not bottom buttons)
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const element = this.messagesContainer?.nativeElement;
          if (element && messageIndex >= 0 && messageIndex < this.messages.length) {
            // Find the paragraph edits component in the message
            const messageElements = element.querySelectorAll('.message');
            if (messageElements[messageIndex]) {
              const messageElement = messageElements[messageIndex];
              const paragraphEditsElement = messageElement.querySelector('app-paragraph-edits');
              if (paragraphEditsElement) {
                // Prioritize finding result-title first (topmost element), then paragraph-instructions
                // This ensures we scroll to the very top of paragraph edits section
                const titleElement = paragraphEditsElement.querySelector('.result-title');
                const instructionsElement = paragraphEditsElement.querySelector('.paragraph-instructions');
                const sectionElement = paragraphEditsElement.querySelector('.result-section');
                
                // Use title element if available (topmost), otherwise instructions, then section
                const targetElement = titleElement || instructionsElement || sectionElement || paragraphEditsElement;
                
                // Calculate position relative to scroll container
                const containerRect = element.getBoundingClientRect();
                const elementRect = targetElement.getBoundingClientRect();
                const relativeTop = elementRect.top - containerRect.top + element.scrollTop;
                
                // Scroll container to show the top of paragraph edits with small offset
                // This ensures the title/instructions are visible at the top
                element.scrollTo({
                  top: Math.max(0, relativeTop), // Small offset from top
                  behavior: 'smooth'
                });
              } else {
                // Fallback to scrolling to the message top
                const containerRect = element.getBoundingClientRect();
                const elementRect = messageElement.getBoundingClientRect();
                const relativeTop = elementRect.top - containerRect.top + element.scrollTop;
                
                element.scrollTo({
                  top: Math.max(0, relativeTop - 20),
                  behavior: 'smooth'
                });
              }
            }
          }
        } catch (err) {
          console.error('Error scrolling to paragraph edits:', err);
        }
      }, 150); // Slightly longer delay to ensure DOM is fully ready
    });
  }
  
  private triggerScrollToBottom(): void {
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();
  }
  
  /** Scroll to the top of a specific message (used for final output to stay at top) */
  private scrollToMessageTop(messageIndex: number): void {
    // Scroll to message element (stay at top of the message)
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const element = this.messagesContainer?.nativeElement;
          if (element && messageIndex >= 0 && messageIndex < this.messages.length) {
            // Find the message element
            const messageElements = element.querySelectorAll('.message');
            if (messageElements[messageIndex]) {
              const messageElement = messageElements[messageIndex];
              
              // Scroll to the message element (top of message)
              const containerRect = element.getBoundingClientRect();
              const elementRect = messageElement.getBoundingClientRect();
              const relativeTop = elementRect.top - containerRect.top + element.scrollTop;
              
              // Scroll container to show the top of message
              element.scrollTo({
                top: relativeTop - 20, // Add small offset from top
                behavior: 'smooth'
              });
            }
          }
        } catch (err) {
          console.error('Error scrolling to message top:', err);
        }
      }, 100); // Delay to ensure DOM is fully ready
    });
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdown if click is outside
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-wrapper')) {
      this.openDropdown = null;
    }
    // Close export dropdown if click is outside
    if (!target.closest('.export-dropdown')) {
      Object.keys(this.showExportDropdown).forEach(key => {
        this.showExportDropdown[parseInt(key)] = false;
      });
    }
  }
  
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Keyboard shortcuts
    if (event.metaKey || event.ctrlKey) {
      switch (event.key) {
        case 'k':
          event.preventDefault();
          this.focusInput();
          break;
        case 'n':
          event.preventDefault();
          this.goHome();
          break;
      }
    }
    
    // Escape to close dialogs
    if (event.key === 'Escape') {
      if (this.showGuidedDialog) {
        this.closeGuidedDialog();
      }
      if (this.openDropdown) {
        this.openDropdown = null;
      }
    }

    
  }
  
  private focusInput(): void {
    setTimeout(() => {
      const inputElement = document.querySelector('.composer-textarea') as HTMLTextAreaElement;
      if (inputElement) {
        inputElement.focus();
      }
    }, 50);
  }

  private handleEditWorkflowFlow(trimmedInput: string): void {
    // Add user message to chat
    const messageContent = trimmedInput || (this.uploadedEditDocumentFile ? `Uploaded document: ${this.uploadedEditDocumentFile.name}` : '');
    if (messageContent) {
      const workflowUserMessage: Message = {
        role: 'user',
        content: messageContent,
        timestamp: new Date()
      };
      this.messages.push(workflowUserMessage);
      this.triggerScrollToBottom();
    }

    const fileToUpload = this.uploadedEditDocumentFile || undefined;
    
    // Let handleChatInput manage the workflow - it will detect intent and start workflow if needed
    // This prevents double-triggering and ensures proper flow
    this.editWorkflowService.handleChatInput(trimmedInput, fileToUpload).catch(error => {
      console.error('Error in edit workflow:', error);
    });

    this.userInput = '';
    // Collapse composer after clearing input when delegating to edit workflow
    this.resetComposerHeight();
    if (fileToUpload) {
      this.uploadedEditDocumentFile = null;
    }
    this.saveCurrentSession();
  }

  async sendMessage(): Promise<void> {
    const trimmedInput = this.userInput.trim();

    if ((!trimmedInput && !this.uploadedPPTFile && !this.uploadedEditDocumentFile) || this.isLoading) {
      return;
    }

    // ====== HIGHEST PRIORITY: CHECK IF USER IS RESPONDING TO DRAFT SATISFACTION QUESTION ======
    const isAwaitingFeedback = this.tlChatBridge.isAwaitingDraftFeedback();
    const draftContext = this.tlChatBridge.getDraftContext();
    console.log('[ChatComponent] PRIORITY CHECK - isAwaitingDraftFeedback:', isAwaitingFeedback);
    console.log('[ChatComponent] PRIORITY CHECK - draftContext:', draftContext);
    console.log('[ChatComponent] PRIORITY CHECK - User input:', trimmedInput);
    
    // Check if quick start draft workflow is awaiting satisfaction feedback
    const quickStartAwaitingFeedback = this.draftWorkflowService.isAwaitingSatisfactionFeedback;
    if (quickStartAwaitingFeedback) {
      console.log('[ChatComponent] *** HANDLING QUICK START DRAFT SATISFACTION FEEDBACK ***');
      
      // Add user message first
      const userMessage: Message = {
        role: 'user',
        content: trimmedInput,
        timestamp: new Date()
      };
      this.messages.push(userMessage);
      this.userInput = '';
      this.resetComposerHeight();
      this.triggerScrollToBottom();
      this.saveCurrentSession();
      
      // Route to draft workflow service for satisfaction handling (now async with LLM)
      await this.draftWorkflowService.handleDraftSatisfaction(trimmedInput);
      return;
    }
    
    if (isAwaitingFeedback) {
      console.log('[ChatComponent] *** HANDLING DRAFT FEEDBACK - Input: "' + trimmedInput + '" ***');
      const satisfactionResult = await this.analyzeDraftSatisfactionWithLLM(trimmedInput, draftContext);
      console.log('[ChatComponent] Satisfaction analysis result:', satisfactionResult);
      
      // Add user message first
      const userMessage: Message = {
        role: 'user',
        content: trimmedInput,
        timestamp: new Date()
      };
      this.messages.push(userMessage);
      this.userInput = '';
      this.resetComposerHeight();
      this.triggerScrollToBottom();
      
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
        this.saveCurrentSession();
        this.triggerScrollToBottom();
        return;
      } else if (satisfactionResult.hasImprovementRequest) {
        // User wants improvements
        console.log('[ChatComponent] ✗ User wants IMPROVEMENTS - Input:', satisfactionResult.improvementText);
        
        if (draftContext) {
          console.log('[ChatComponent] Processing improvement request with context');
          this.isLoading = true;
          
          const assistantMessage: Message = {
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
          };
          this.messages.push(assistantMessage);
          
          // Prepare improvement message for backend
          const improvementMessage = satisfactionResult.improvementText;
          
          // Send to backend with all preserved parameters
          const draftParams = {
            contentType: draftContext.contentType,
            topic: draftContext.topic,
            wordLimit: draftContext.wordLimit,
            audienceTone: draftContext.audienceTone,
            outlineDoc: draftContext.outlineDoc,
            supportingDoc: draftContext.supportingDoc,
            useFactivaResearch: draftContext.useFactivaResearch
          };

          const messages: Message[] = [{
            role: 'user' as const,
            content: improvementMessage,
            timestamp: new Date()
          }];
          
          this.chatService.streamDraftContent(messages, improvementMessage, draftParams).subscribe({
            next: (chunk: any) => {
              if (typeof chunk === 'string') {
                assistantMessage.content += chunk;
              } else if (chunk && chunk.type === 'content' && chunk.content) {
                assistantMessage.content += chunk.content;
              }
              this.triggerScrollToBottom();
            },
            error: (error) => {
              console.error('[ChatComponent] Error processing draft improvement:', error);
              assistantMessage.isStreaming = false;
              assistantMessage.content = 'I apologize, but I encountered an error while processing your improvement request. Please try again.';
              this.isLoading = false;
              this.tlChatBridge.clearDraftContext();
              this.saveCurrentSession();
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
              this.triggerScrollToBottom();
            }
          });
          
          this.saveCurrentSession();
          return;
        } else {
          console.warn('[ChatComponent] Draft context not found, clearing and continuing');
          this.tlChatBridge.clearDraftContext();
          return;
        }
      }
      
      // If we get here, unclear response, just continue
      console.log('[ChatComponent] Unclear satisfaction response, clearing draft context');
      this.tlChatBridge.clearDraftContext();
      this.saveCurrentSession();
      return;
    }

    // ====== END OF DRAFT FEEDBACK HANDLING ======

    // If draft workflow already active, route input directly and avoid duplicate user messages
    if (this.draftWorkflowService.isActive) {
      const userMessage: Message = {
        role: 'user',
        content: trimmedInput,
        timestamp: new Date()
      };
      this.messages.push(userMessage);
      this.userInput = '';
      this.triggerScrollToBottom();
      this.saveCurrentSession();

      this.draftWorkflowService.handleChatInput(trimmedInput);
      return;
    }

    const isThoughtLeadershipFlow = this.selectedFlow === 'thought-leadership';

    // Quick Start Thought Leadership - Edit Content workflow
    const workflowActive = this.editWorkflowService.isActive;
    const hasEditWorkflowFile = !!this.uploadedEditDocumentFile;
    const hasExtractedDocuments = this.extractedDocuments.length > 0; // Document analysis mode

    // If there are extracted documents, skip edit workflow and go to normal chat
    if (hasExtractedDocuments) {
      console.log('[ChatComponent] Has extracted documents, proceeding with normal chat (document analysis)');
      await this.proceedWithNormalChat(trimmedInput);
      return;
    }

    // Check for edit intent asynchronously (hybrid approach: keyword + LLM)
    if (isThoughtLeadershipFlow && (workflowActive || hasEditWorkflowFile)) {
      // Workflow already active or file uploaded - proceed
      this.editWorkflowService.handleChatInput(trimmedInput);
      return;
    }

    // Check for edit intent if not already in workflow
    if (isThoughtLeadershipFlow && !workflowActive && trimmedInput) {
      // Quick check for draft intent keywords to avoid unnecessary edit detection
      const tlDraftKeywords = ['create', 'draft', 'write', 'generate content', 'draft content', 'create content', 'article', 'whitepaper', 'white paper', 'blog', 'executive brief'];
      const userInputLower = trimmedInput.toLowerCase();
      const isDraftRequest = tlDraftKeywords.some(keyword => userInputLower.includes(keyword));
      
      // If it's clearly a draft request, skip edit detection and go to draft flow
      if (isDraftRequest) {
        console.log('[ChatComponent] Draft keywords detected, skipping edit intent check');
        await this.proceedWithNormalChat(trimmedInput);
        return;
      }
      
      // Add user message first
      const userMessage: Message = {
        role: 'user',
        content: trimmedInput,
        timestamp: new Date()
      };
      console.log(`[ChatComponent] Adding user message for edit intent detection ${userMessage.content}`);
      this.messages.push(userMessage);
      this.userInput = '';
      this.resetComposerHeight();
      this.triggerScrollToBottom();

      // Show typing-dots while analyzing request
      const loadingMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      };
      console.log(`[ChatComponent] Showing typing-dots for intent detection`);
      this.messages.push(loadingMessage);
      this.triggerScrollToBottom();

      // Use async intent detection (LLM-based)
      try {
        const intentResult = await this.editWorkflowService.detectEditIntent(trimmedInput);
        // Remove loading message
        const loadingIndex = this.messages.indexOf(loadingMessage);
        if (loadingIndex !== -1) {
          this.messages.splice(loadingIndex, 1);
        }

        if (intentResult.hasEditIntent) {
          // Start workflow - workflow service handles Path 1 (direct editor) vs Path 2 (selection)
          this.editWorkflowService.handleChatInput(trimmedInput);
        } else {
          // No edit intent - continue with normal chat flow
          await this.proceedWithNormalChat(trimmedInput);
        }
      } catch (error) {
        console.error('Error detecting edit intent:', error);
        // Remove loading message
        const loadingIndex = this.messages.indexOf(loadingMessage);
        if (loadingIndex !== -1) {
          this.messages.splice(loadingIndex, 1);
        }
        // Fallback to normal chat flow on error
        await this.proceedWithNormalChat(trimmedInput);
      }
      return;
    }

    // No edit intent detected or not in TL flow - continue with normal chat
    await this.proceedWithNormalChat(trimmedInput);
  }

  private async proceedWithNormalChat(trimmedInput: string): Promise<void> {
    const userInputLower = trimmedInput.toLowerCase();
    const isThoughtLeadershipFlow = this.selectedFlow === 'thought-leadership';
    
    // If draft workflow is active, route input to workflow service
    if (this.draftWorkflowService.isActive) {
      // Add user message to chat first
      const userMessage: Message = {
        role: 'user',
        content: trimmedInput,
        timestamp: new Date()
      };
      this.messages.push(userMessage);
      this.userInput = '';
      this.triggerScrollToBottom();
      this.saveCurrentSession();
      
      // Handle the input in the workflow
      this.draftWorkflowService.handleChatInput(trimmedInput);
      return;
    }
    
    // Check if user is requesting sanitization
    const sanitizationKeywords = ['sanitize', 'sanitise', 'sanitization', 'sanitation', 'remove sensitive', 'clean up', 'strip data', 'anonymize', 'anonymise'];
    const isSanitizationRequest = sanitizationKeywords.some(keyword => userInputLower.includes(keyword));

    // Check if user is requesting draft/create presentation
    //const draftKeywords = ['create presentation', 'draft presentation', 'create a deck', 'draft a deck', 'build presentation', 'make presentation', 'new presentation', 'create slides'];
    
    //const isDraftRequest = draftKeywords.some(keyword => userInputLower.includes(keyword));
    
    // Check if user is requesting podcast generation (ONLY in TL mode)
    // const podcastKeywords = ['podcast', 'generate podcast', 'create podcast', 'make podcast', 'convert to podcast', 'audio version', 'turn into podcast', 'audio narration'];
    // const isPodcastRequest = isThoughtLeadershipFlow && podcastKeywords.some(keyword => userInputLower.includes(keyword));

    // Check for Rewrite Intent first (before checking draft keywords)
    if (this.isRewriteIntent(trimmedInput)) {
      console.log('[ChatComponent-Old] Rewrite intent detected, delegating to draft workflow service');
      // Add user message to chat first
      const userMessage: Message = {
        role: 'user',
        content: trimmedInput,
        timestamp: new Date()
      };
      this.messages.push(userMessage);
      this.userInput = '';
      this.triggerScrollToBottom();
      this.saveCurrentSession();
      
      this.draftWorkflowService.handleChatInput(trimmedInput);
      return;
    }

    // Check if user is requesting draft content creation in TL mode
    const tlDraftKeywords = ['draft', 'write', 'generate content', 'draft content', 'create content', 'article', 'whitepaper', 'white paper', 'blog', 'executive brief'];
    const isTLDraftRequest = isThoughtLeadershipFlow && tlDraftKeywords.some(keyword => userInputLower.includes(keyword));

    console.log('[ChatComponent-Old] selectedFlow:', this.selectedFlow, 'isThoughtLeadershipFlow:', isThoughtLeadershipFlow, 'isTLDraftRequest:', isTLDraftRequest);
    console.log('[ChatComponent-Old] Input contains draft keywords:', tlDraftKeywords.some(keyword => userInputLower.includes(keyword)));

    // If there's an uploaded PPT file and NOT a sanitization request, process it
    // if (this.uploadedPPTFile && !isSanitizationRequest) {
    //   this.processPPTUpload();
    //   return;
    // }
    
    // If user asks to create/draft content in TL mode, use LLM to detect topic and content type
    if (isTLDraftRequest) {
      // Add user message to chat immediately
      const userMessage: Message = {
        role: 'user',
        content: trimmedInput,
        timestamp: new Date()
      };
      this.messages.push(userMessage);
      this.userInput = '';
      this.triggerScrollToBottom();
      this.saveCurrentSession();
      
      try {
        const draftIntent = await this.draftWorkflowService.detectDraftIntent(trimmedInput);
        console.log('[ChatComponent-Old] Draft intent detected:', draftIntent);
        console.log('[ChatComponent-Old] Content type array:', draftIntent.detectedContentType, 'Length:', draftIntent.detectedContentType?.length);
        
        if (draftIntent.hasDraftIntent) {
          console.log('[ChatComponent-Old] Starting conversational quick draft with topic:', draftIntent.detectedTopic, 'contentType:', draftIntent.detectedContentType?.[0]);
          
          // If content type is missing, use beginWorkflow to start full input flow
          if (!draftIntent.detectedContentType || draftIntent.detectedContentType.length === 0) {
            console.log('[ChatComponent-Old] Content type missing, starting full workflow with topic:', draftIntent.detectedTopic);
            this.draftWorkflowService.beginWorkflow(draftIntent.detectedTopic || '', '', draftIntent.wordLimit, draftIntent.audienceTone);
          } else {
            console.log('[ChatComponent-Old] Content type found, using startQuickDraftConversation');
            // Start conversational flow with detected content type
            const topic = draftIntent.detectedTopic || '';
            const contentType = this.formatContentType(draftIntent.detectedContentType?.[0] || 'article');
            const wordLimit = draftIntent.wordLimit || undefined;
            const audienceTone = draftIntent.audienceTone || undefined;
            this.draftWorkflowService.startQuickDraftConversation(topic, contentType, trimmedInput, wordLimit, audienceTone);
          }
          return;
        }
      } catch (error) {
        console.error('[ChatComponent-Old] Error detecting draft intent:', error);
      }
      // Fallback: show options without topic if detection fails
      this.showDraftContentTypeOptions(trimmedInput);
      return;
    }
    
    // If user asks for podcast generation in TL mode, open podcast flow
    // if (isPodcastRequest) {
    //   this.openPodcastFlow(trimmedInput);
    //   return;
    // }

    // If user asks to sanitize, start conversational workflow
    // if (isSanitizationRequest) {
    //   this.startSanitizationConversation();
    //   return;
    // }

    // If user asks to create/draft presentation
    // if (isDraftRequest) {
    //   const userMessage: Message = {
    //     role: 'user',
    //     content: trimmedInput,
    //     timestamp: new Date()
    //   };
    //   console.log(`[ChatComponent] Adding user message for draft request ${userMessage.content}`);
    //   this.messages.push(userMessage);

    //   const assistantMessage: Message = {
    //     role: 'assistant',
    //     content: '📝 I\'d be happy to help you create a presentation! To provide the best draft, please tell me:\n\n1. **Topic**: What is the main subject?\n2. **Objective**: What do you want to achieve?\n3. **Audience**: Who will view this presentation?\n\nYou can describe these in your next message, or click the "Guided Journey" button above for a structured form.',
    //     timestamp: new Date()
    //   };
    //   this.messages.push(assistantMessage);
    //   this.userInput = '';
    //   // Collapse composer immediately after clearing input for draft request path
    //   this.resetComposerHeight();
    //   this.saveCurrentSession();
    //   return;
    // }

    // Prepare user message content with multiple documents support
    const hasExtractedDocuments = this.extractedDocuments.length > 0;
    
    let userMessageContent = this.userInput.trim();
    
    // Store extracted text from all documents permanently in message content for context preservation
    // This ensures follow-up questions maintain document context
    if (hasExtractedDocuments) {
      // Build document summary for UI display
      const documentNames = this.extractedDocuments.map(doc => doc.fileName).join(', ');
      userMessageContent += `\n\n[${this.extractedDocuments.length} document(s) uploaded: ${documentNames}]`;
      
      // Append all extracted texts
      for (const doc of this.extractedDocuments) {
        userMessageContent += `\n\nExtracted Text From Document (${doc.fileName}):\n${doc.extractedText}`;
      }
    }
    
    const userMessage: Message = {
      role: 'user',
      content: userMessageContent || this.userInput,
      timestamp: new Date()
    };
    
    const totalExtractedLength = this.extractedDocuments.reduce((sum, doc) => sum + doc.extractedText.length, 0);
    const estimatedTokens = hasExtractedDocuments ? this.estimateTotalTokens() : 0;
    console.log(`[ChatComponent] Adding user message with ${hasExtractedDocuments ? `${this.extractedDocuments.length} document(s), total chars: ${totalExtractedLength}, estimated tokens: ${estimatedTokens}` : 'regular input'}`);
    
    if (userMessage.content) {
      this.messages.push(userMessage);
    }
    this.triggerScrollToBottom();
    
    this.userInput = '';
    this.resetComposerHeight();
    this.isLoading = true;

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    this.messages.push(assistantMessage);
    this.triggerScrollToBottom();

    const messagesToSend = this.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    // Ensure we have a session ID before sending
    if (!this.currentSessionId) {
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[ChatComponent] Generated new session ID:', this.currentSessionId);
    }
    if (this.selectedFlow === 'ppt') {
      console.log("step 1:",this.extractedDocuments);
      const appendedText = this.extractedDocuments?.map(d => d.extractedText).join("\n\n") || '';
      const ddcMessage = trimmedInput + (appendedText ? `\n\nSupporting docs:\n${appendedText}` : '');

      // Build FormData path: include PPT file when available
      const pptFile = this.uploadedPPTFile || undefined;
      this.uploadedPPTFile = null; // consume file so it isn't reused

      this.chatService.ddcChatAgent(ddcMessage, this.currentDdcConversationId || undefined, pptFile).subscribe({
        next: (result: any) => {
          // result may be { blob, conversation_id, summary } or JSON { message, conversation_id }
          if (result && result.blob) {
            assistantMessage.content = `I've processed your presentation${pptFile ? ` "${pptFile.name}"` : ''}. You can download it below.`;
            const url = window.URL.createObjectURL(result.blob);
            const filename = (pptFile && pptFile.name) ? pptFile.name.replace(/\.pptx?$/, '_ddc_processed.pptx') : 'ddc_processed.pptx';
            assistantMessage.downloadUrl = url;
            assistantMessage.downloadFilename = filename;
            if (result.summary) {
              try {
                assistantMessage.content += `\n\nSanitization Summary:\n${JSON.stringify(result.summary, null, 2)}`;
              } catch (e) {
                assistantMessage.content += `\n\nSanitization Summary: ${result.summary}`;
              }
            }
          } else if (result && result.message) {
            assistantMessage.content += result.message;
          } else if (typeof result === 'string') {
            assistantMessage.content += result;
          } else if (result && result.content) {
            assistantMessage.content += result.content;
          } else {
            assistantMessage.content += 'The DDC service responded.';
          }

          if (result && result.conversation_id) {
            this.currentDdcConversationId = result.conversation_id;
          }

          this.triggerScrollToBottom();
        },
        error: (error: any) => {
          console.error('DDC Chat Agent Error:', error);
          assistantMessage.content = 'Sorry, I encountered an error while processing your presentation via the DDC service.';
          this.isLoading = false;
          this.currentAction = '';
          this.triggerScrollToBottom();
        },
        complete: () => {
          this.isLoading = false;
          this.extractedDocuments = [];
          this.uploadedEditDocumentFile = null;
          this.saveCurrentSession();
          this.loadDbSessions();
          this.triggerScrollToBottom();
        }
      });

      // Prevent falling through to the generic chat path
      return;
    }

    this.chatService.streamChat(
      messagesToSend,
      this.userId,
      this.currentSessionId,
      this.dbThreadId || undefined,
      this.getSourceFromFlow()
    ).subscribe({
      next: (content: string) => {
        assistantMessage.content += content;
        this.triggerScrollToBottom();
      },
      error: (error: any) => {
        console.error('Error:', error);
        assistantMessage.content = 'Sorry, I encountered an error. Please make sure the AI service is configured correctly.';
        this.isLoading = false;
        
        // Clear extracted documents and file on error
        this.extractedDocuments = [];
        this.uploadedEditDocumentFile = null;
        
        this.triggerScrollToBottom();
      },
      complete: () => {
        this.isLoading = false;
        
        // Clear extracted documents and file after successful send
        this.extractedDocuments = [];
        this.uploadedEditDocumentFile = null;
        
        this.saveCurrentSession();
        // Refresh database sessions list to show the new/updated session
        this.loadDbSessions();
        this.triggerScrollToBottom();
      }
    });
  }
  
  processPPTUpload(): void {
    if (!this.uploadedPPTFile) return;
    
    const userPrompt = this.userInput.trim() || 'Improve my presentation';
    const userMessage: Message = {
      role: 'user',
      content: `${userPrompt}: ${this.uploadedPPTFile.name}`,
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    this.triggerScrollToBottom();

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actionInProgress: 'Improving presentation...'
    };
    this.messages.push(assistantMessage);
    this.triggerScrollToBottom();
  this.userInput = '';
  // Collapse composer after sending PPT upload prompt
  this.resetComposerHeight();
  this.isLoading = true;
    this.currentAction = 'Improving presentation...';

    const pptFile = this.uploadedPPTFile;
    this.uploadedPPTFile = null;

    this.chatService.improvePPT(pptFile, null).subscribe({
      next: (blob) => {
        assistantMessage.actionInProgress = undefined;
        assistantMessage.content = `I've successfully improved your presentation "${pptFile.name}". Here's what was done:\n\n• Fixed spelling and grammar errors\n• Aligned text and shapes\n• Applied consistent formatting\n\nYou can download the improved version below.`;
        
        // Create download URL from blob
        const url = window.URL.createObjectURL(blob);
        const filename = pptFile.name.replace('.pptx', '_improved.pptx');
        assistantMessage.downloadUrl = url;
        assistantMessage.downloadFilename = filename;
      },
      error: (error) => {
        console.error('Error improving PPT:', error);
        assistantMessage.actionInProgress = undefined;
        assistantMessage.content = 'Sorry, I encountered an error while improving the presentation. Please try again.';
        this.isLoading = false;
        this.currentAction = '';
      },
      complete: () => {
        this.isLoading = false;
        this.currentAction = '';
        this.saveCurrentSession();
        // Refresh database sessions list to show the new/updated session
        this.loadDbSessions();
        this.triggerScrollToBottom();
      }
    });
  }

  startSanitizationConversation(): void {
    const userMessage: Message = {
      role: 'user',
      content: this.userInput,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    this.messages.push(assistantMessage);

  this.userInput = '';
  // Collapse composer after starting sanitization conversation
  this.resetComposerHeight();
  this.isLoading = true;
  this.triggerScrollToBottom();

    // Include file name if uploaded
    const fileName = this.uploadedPPTFile ? this.uploadedPPTFile.name : undefined;

    this.chatService.streamSanitizationConversation(
      this.messages.filter(m => !m.isStreaming),
      fileName
    ).subscribe({
      next: (chunk: string) => {
        assistantMessage.content += chunk;
        this.triggerScrollToBottom();
      },
      error: (error: any) => {
        console.error('Error:', error);
        assistantMessage.content = 'Sorry, I encountered an error. Please try again.';
        assistantMessage.isStreaming = false;
        this.isLoading = false;
      },
      complete: () => {
        assistantMessage.isStreaming = false;
        this.isLoading = false;
        this.saveCurrentSession();
      }
    });
  }

  processSanitizePPT(): void {
    if (!this.uploadedPPTFile) return;
    
    const userPrompt = this.userInput.trim() || 'Sanitize my presentation';
    const userMessage: Message = {
      role: 'user',
      content: `${userPrompt}: ${this.uploadedPPTFile.name}`,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actionInProgress: 'Sanitizing presentation...'
    };
    this.messages.push(assistantMessage);
  this.messages.push(assistantMessage);

  this.userInput = '';
  // Collapse composer after initiating PPT sanitization
  this.resetComposerHeight();
  this.isLoading = true;
    this.currentAction = 'Sanitizing presentation: removing sensitive data, client names, numbers, and metadata...';

    const pptFile = this.uploadedPPTFile;
    this.uploadedPPTFile = null;

    // Use empty strings for client name and products since we're in free text mode
    this.chatService.sanitizePPT(pptFile, '', '').subscribe({
      next: (response) => {
        const url = window.URL.createObjectURL(response.blob);

        let statsMessage = '';
        if (response.stats) {
          statsMessage = `\n\nSanitization Statistics:\n• Numeric replacements: ${response.stats.numeric_replacements}\n• Name replacements: ${response.stats.name_replacements}\n• Hyperlinks removed: ${response.stats.hyperlinks_removed}\n• Notes removed: ${response.stats.notes_removed}\n• Logos removed: ${response.stats.logos_removed}\n• Slides processed: ${response.stats.slides_processed}`;
          
          if (response.stats.llm_replacements) {
            statsMessage += `\n• LLM-detected items: ${response.stats.llm_replacements}`;
          }
        }

        assistantMessage.content = `✅ Your presentation has been sanitized!\n\nSanitization complete:\n• All numeric data replaced with X patterns\n• Personal information removed\n• Client/product names replaced with placeholders\n• Logos and watermarks removed\n• Speaker notes cleared\n• Metadata sanitized` + statsMessage + '\n\nYou can download your sanitized presentation below.';
        assistantMessage.downloadUrl = url;
        assistantMessage.downloadFilename = 'sanitized_presentation.pptx';
        assistantMessage.previewUrl = url;
        assistantMessage.actionInProgress = undefined;
        this.isLoading = false;
        this.currentAction = '';
      },
      error: (error: any) => {
        console.error('Error:', error);
        assistantMessage.content = 'Sorry, I encountered an error while sanitizing your presentation. Please make sure the file is a valid PowerPoint file (.pptx).';
        assistantMessage.actionInProgress = undefined;
        this.isLoading = false;
        this.currentAction = '';
      },
      complete: () => {
        this.saveCurrentSession();
      }
    });
  }

  toggleDraftForm(): void {
    this.showDraftForm = !this.showDraftForm;
  }

  selectFlow(flow: 'ppt' | 'thought-leadership' | 'market-intelligence'): void {
    // Save current session before switching flows to prevent data loss
    this.saveCurrentSession();
    
    this.selectedFlow = flow;
    
    // Trigger fade-out animation if on landing page
    if (this.showLandingPage) {
      this.landingPageFadingOut = true;
      // Hide landing page after animation completes (500ms)
      setTimeout(() => {
        this.showLandingPage = false;
        this.landingPageFadingOut = false;
      }, 500);
    }
    
    // Reset all flow states
    this.showDraftForm = false;
    this.showGuidedDialog = false;
    this.showPromptSuggestions = false;
    this.closeMobileSidebar();
    
    // Clear uploaded files and composer input when switching flows
    this.uploadedEditDocumentFile = null;
    this.uploadedPPTFile = null;
    this.extractedDocuments = []; // Clear extracted documents from triggerDocumentAnalysisUpload
    this.editDocumentUploadError = ''; // Clear any upload error messages
    this.userInput = ''; // Clear composer textarea text
    this.messages = [];
    
    // Reset session ID for new flow to ensure fresh session tracking
    this.currentSessionId = null;
    
    // Update visibility flags based on selected flow
    this.showMIFlow = flow === 'market-intelligence';
    this.showTLFlow = flow === 'thought-leadership';
    this.showDDCFlow = flow === 'ppt';
    
    // Reset edit workflow if active
    if (this.editWorkflowService.isActive) {
      this.editWorkflowService.cancelWorkflow();
    }
    
    // Reset to initial state - just show welcome with only the initial assistant message
    if (this.messages.length > 1) {
      this.messages = this.messages.slice(0, 1);
    }
    
    console.log('[ChatComponent] Flow changed to:', flow);
  }
  
  goHome(): void {
    // Reset to home state (landing page)
    this.showLandingPage = true;
    this.selectedFlow = undefined;
    this.showDraftForm = false;
    this.showGuidedDialog = false;
    this.showPromptSuggestions = false;
    this.showAttachmentArea = false;
    this.userInput = '';
    this.resetComposerHeight();
    this.referenceDocument = null;
    this.closeMobileSidebar();
    
    // Clear chat history and reset to initial assistant message
    if (this.messages.length > 1) {
      this.messages = this.messages.slice(0, 1);
    }
    
    // Reset all form data
    this.draftData = {
      topic: '',
      objective: '',
      audience: '',
      additional_context: '',
      reference_document: '',
      reference_link: ''
    };
    
    this.thoughtLeadershipData = {
      topic: '',
      perspective: '',
      target_audience: '',
      document_text: '',
      target_format: '',
      additional_context: '',
      reference_document: '',
      reference_link: ''
    };
    
    this.originalPPTFile = null;
    this.referencePPTFile = null;
    this.sanitizePPTFile = null;
    this.uploadedPPTFile = null;
    this.uploadedEditDocumentFile = null;
    this.editorialDocumentFile = null;
    this.extractedDocuments = []; // Clear extracted documents when going home
    this.editDocumentUploadError = ''; // Clear any upload error messages
    // Reset edit workflow if active
    if (this.editWorkflowService.isActive) {
      this.editWorkflowService.cancelWorkflow();
    }
    this.currentSessionId = null;
    this.isLoading = false;
  }

  private getSourceFromFlow(): string {
    switch (this.selectedFlow) {
      case 'ppt':
        return 'DDDC';
      case 'thought-leadership':
        return 'Thought_Leadership';
      case 'market-intelligence':
        return 'Market_Intelligence';
      default:
        return 'Chat';
    }
  }

  startNewChat(): void {
    // Reset chat while preserving the current flow selection
    this.showDraftForm = false;
    this.showGuidedDialog = false;
    this.showPromptSuggestions = false;
    this.showAttachmentArea = false;
    this.userInput = '';
    this.resetComposerHeight();
    this.referenceDocument = null;
    this.closeMobileSidebar();
    
    // Clear chat history but keep the current flow
    this.messages = [];
    
    // Reset all form data
    this.draftData = {
      topic: '',
      objective: '',
      audience: '',
      additional_context: '',
      reference_document: '',
      reference_link: ''
    };
    
    this.thoughtLeadershipData = {
      topic: '',
      perspective: '',
      target_audience: '',
      document_text: '',
      target_format: '',
      additional_context: '',
      reference_document: '',
      reference_link: ''
    };
    
    this.originalPPTFile = null;
    this.referencePPTFile = null;
    this.sanitizePPTFile = null;
    this.uploadedPPTFile = null;
    this.uploadedEditDocumentFile = null;
    this.editorialDocumentFile = null;
    this.extractedDocuments = []; // Clear extracted documents when starting new chat
    this.editDocumentUploadError = ''; // Clear any upload error messages
    
    // Reset edit workflow if active
    if (this.editWorkflowService.isActive) {
      this.editWorkflowService.cancelWorkflow();
    }
    
    this.currentSessionId = null;
    this.isLoading = false;
    
    // Keep the current flow - DO NOT call selectFlow()
  }
  

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
  
  closeMobileSidebar(): void {
    this.mobileMenuOpen = false;
  }
  
  toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
  }
  
  toggleThemeDropdown(): void {
    this.showThemeDropdown = !this.showThemeDropdown;
  }
  
  getFeatureName(): string {
    if (this.selectedFlow === 'ppt') {
      return 'Edge Doc Studio';
    } else if (this.selectedFlow === 'thought-leadership') {
      return 'Edge Cortex';
    } else if (this.selectedFlow === 'market-intelligence') {
      return 'Edge Market Intelligence & Insights';
    }
    return 'PwC ThinkSpace';

  }
  
  openGuidedDialog(): void {
    // Context-aware: Show DDC workflows for ppt flow, TL workflows for thought-leadership flow
    // For MI, opening Guided Journey directly opens conduct-research-flow
    if (this.selectedFlow === 'ppt') {
      this.showDdcGuidedDialog = true;
    } else if (this.selectedFlow === 'thought-leadership') {
      this.showGuidedDialog = true;
    } else if (this.selectedFlow === 'market-intelligence') {
      // For Market Intelligence, Guided Journey opens the conduct-research-flow directly
      //this.miFlowService.openFlow('conduct-research');
      this.showGuidedDialog = true;
    }
  }
  
  onWorkflowSelected(workflowId: string): void {
    console.log('[ChatComponent] DDC Workflow selected:', workflowId);
    // Set context: opened from guided dialog
    this.workflowOpenedFrom = 'guided-dialog';
    this.showDdcGuidedDialog = false;
    this.ddcFlowService.openFlow(workflowId as any);
  }
  
  closeDdcGuidedDialog(): void {
    this.showDdcGuidedDialog = false;
    // Reset workflow context when guided dialog closes
    this.workflowOpenedFrom = null;
  }
  
  // Chat history methods
  loadSavedSessions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const sessions = JSON.parse(stored);
        // Convert string dates back to Date objects
        this.savedSessions = sessions.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp),
          lastModified: new Date(s.lastModified),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : undefined
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading saved sessions:', error);
      this.savedSessions = [];
    }
  }
  
  saveCurrentSession(): void {
    // Don't save if we only have the welcome message
    if (this.messages.length <= 1) {
      return;
    }
    
    // Generate title from first user message or use default
    let title = 'New Chat';
    const firstUserMessage = this.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      title = firstUserMessage.content.slice(0, 50);
      if (firstUserMessage.content.length > 50) {
        title += '...';
      }
    }
    
    const now = new Date();
    
    if (this.currentSessionId) {
      // Check if session exists in array
      const index = this.savedSessions.findIndex(s => s.id === this.currentSessionId);
      if (index !== -1) {
        // Update existing session
        this.savedSessions[index] = {
          ...this.savedSessions[index],
          messages: [...this.messages],
          lastModified: now
        };
      } else {
        // Session ID exists but not in array - create new session
        const newSession: ChatSession = {
          id: this.currentSessionId,
          title: title,
          messages: [...this.messages],
          timestamp: now,
          lastModified: now
        };
        
        this.savedSessions.unshift(newSession);
        
        // Limit number of saved sessions
        if (this.savedSessions.length > this.MAX_SESSIONS) {
          this.savedSessions = this.savedSessions.slice(0, this.MAX_SESSIONS);
        }
      }
    } else {
      // Create new session when no session ID exists
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newSession: ChatSession = {
        id: this.currentSessionId,
        title: title,
        messages: [...this.messages],
        timestamp: now,
        lastModified: now
      };
      
      this.savedSessions.unshift(newSession);
      
      // Limit number of saved sessions
      if (this.savedSessions.length > this.MAX_SESSIONS) {
        this.savedSessions = this.savedSessions.slice(0, this.MAX_SESSIONS);
      }
    }
    
    // Save to localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedSessions));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }
  
  loadSession(sessionId: string): void {
    const session = this.savedSessions.find(s => s.id === sessionId);
    if (session) {
      this.currentSessionId = sessionId;
      this.messages = [...session.messages];
      this.showGuidedDialog = false;
      this.showDraftForm = false;
      this.showPromptSuggestions = false;
    }
  }
  
  deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    this.savedSessions = this.savedSessions.filter(s => s.id !== sessionId);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedSessions));
    } catch (error) {
      console.error('Error deleting session:', error);
    }
    
    // If we deleted the current session, go home
    if (this.currentSessionId === sessionId) {
      this.goHome();
    }
  }
  
  // ============ NEW: Database-driven chat history methods ============
  
  /**
   * Load chat sessions from database (lazy loading - titles only)
   * Titles load instantly on login, full conversations load on-click
   */
  loadDbSessions(): void {
    console.log('[ChatComponent-OLD] loadDbSessions() CALLED');
    
    if (!this.userId || this.userId === 'anonymous@example.com') {
      console.warn('⚠️ [ChatComponent-OLD] Cannot load DB sessions: no valid user ID, userId:', this.userId);
      return;
    }
    
    this.isLoadingDbSessions = true;
    console.log('⏳ [ChatComponent-OLD] Loading database sessions for user:', this.userId);
    
    console.log('[ChatComponent-OLD] Calling chatService.getUserSessions() with userId:', this.userId, 'and source:', this.selectedSourceFilter || 'undefined');
    
    this.chatService.getUserSessions(this.userId, this.selectedSourceFilter || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessions: any[]) => {
          console.log('[ChatComponent-OLD] ✅ getUserSessions() returned:', sessions?.length || 0, 'sessions');
          
          if (!sessions || sessions.length === 0) {
            console.log('[ChatComponent-OLD] ℹ️ No sessions found for user');
            this.dbChatSessions = [];
            this.isLoadingDbSessions = false;
            return;
          }
          
          // Convert API response to ChatSession format
          this.dbChatSessions = (sessions || []).map(s => ({
            id: s.session_id,
            title: s.title || s.preview || 'Untitled',
            messages: [], // Don't load full messages yet (lazy loading)
            timestamp: new Date(s.created_at),
            lastModified: new Date(s.updated_at),
            source: s.source // Track source for filtering
          }));
          
          console.log('✅ [ChatComponent-OLD] Successfully loaded', this.dbChatSessions.length, 'sessions from database');
          this.isLoadingDbSessions = false;
        },
        error: (error) => {
          console.error('❌ [ChatComponent-OLD] Error loading sessions from database:', error);
          this.isLoadingDbSessions = false;
          // Fall back to localStorage if database fails
          console.log('[ChatComponent-OLD] Falling back to localStorage...');
          this.loadSavedSessions();
        }
      });
  }
  
  /**
   * Load full conversation for a specific session (on-demand, lazy loading)
   */
  loadDbConversation(sessionId: string): void {
    if (!sessionId) {
      console.warn('⚠️ Cannot load conversation: no session ID provided');
      return;
    }
    
    this.isLoadingDbConversation = true;
    console.log('⏳ Loading conversation for session:', sessionId);
    
    this.chatService.getSessionConversation(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessionDetail: any) => {
          if (!sessionDetail) {
            console.error('❌ No conversation data received');
            this.isLoadingDbConversation = false;
            return;
          }
          
          console.log('📦 Raw session detail received:', sessionDetail);
          
          // Extract messages from the conversation data
          let messagesArray: Message[] = [];
          
          // Handle different possible response formats
          if (sessionDetail.conversation) {
            if (Array.isArray(sessionDetail.conversation)) {
              // Format 1: conversation is directly an array of messages
              messagesArray = sessionDetail.conversation as Message[];
            } else if (sessionDetail.conversation.messages && Array.isArray(sessionDetail.conversation.messages)) {
              // Format 2: conversation is an object with messages property
              messagesArray = sessionDetail.conversation.messages as Message[];
            } else if (typeof sessionDetail.conversation === 'object') {
              // Format 3: conversation is an object - try to extract messages if available
              messagesArray = Object.values(sessionDetail.conversation).flat() as Message[];
            }
          }
          
          console.log('📨 Extracted', messagesArray.length, 'messages from conversation');
          console.log('Messages:', messagesArray);
          
          // Update the messages for the session
          const sessionIndex = this.dbChatSessions.findIndex(s => s.id === sessionId);
          if (sessionIndex !== -1) {
            this.dbChatSessions[sessionIndex].messages = messagesArray;
            console.log('✅ Loaded', messagesArray.length, 'messages for session:', sessionId);
          }
          
          // Load this conversation into the main messages display
          this.currentSessionId = sessionId;
          this.messages = messagesArray;
          this.showGuidedDialog = false;
          this.showDraftForm = false;
          this.showPromptSuggestions = false;
          
          // Force change detection
          this.cdr.markForCheck();
          
          this.isLoadingDbConversation = false;
        },
        error: (error) => {
          console.error('❌ Error loading conversation from database:', error);
          console.error('Error details:', error);
          this.isLoadingDbConversation = false;
        }
      });
  }
  
  /**
   * Delete a session from the database
   */
  deleteDbSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    
    console.log('⏳ Deleting session from database:', sessionId);
    
    this.chatService.deleteSession(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove from local array
          this.dbChatSessions = this.dbChatSessions.filter(s => s.id !== sessionId);
          console.log('✅ Session deleted successfully:', sessionId);
          
          // If we deleted the current session, go home
          if (this.currentSessionId === sessionId) {
            this.goHome();
          }
        },
        error: (error) => {
          console.error('❌ Error deleting session from database:', error);
        }
      });
  }
  
  /**
   * Filter database sessions by source (PPT, TL, MI, DDC)
   */
  filterDbSessionsBySource(source: string): void {
    this.selectedSourceFilter = source;
    console.log('🔍 Filtering sessions by source:', source);
    this.loadDbSessions(); // Reload with filter
  }
  
  // ============ END: Database-driven chat history methods ============
  
  
  // Search/filter methods
  filterOfferings(): void {
    const query = this.searchQuery.toLowerCase().trim();
    
    if (!query) {
      this.offeringVisibility['ppt'] = true;
      this.offeringVisibility['thought-leadership'] = true;
      return;
    }
    
    // Check if "presentation drafting" or related keywords match
    const pptKeywords = ['presentation', 'drafting', 'ppt', 'slides', 'deck', 'powerpoint', 'improve', 'sanitize', 'create'];
    const tlKeywords = ['thought', 'leadership', 'article', 'research', 'insights', 'editorial', 'review', 'generate'];
    
    this.offeringVisibility['ppt'] = pptKeywords.some(keyword => keyword.includes(query) || query.includes(keyword));
    this.offeringVisibility['thought-leadership'] = tlKeywords.some(keyword => keyword.includes(query) || query.includes(keyword));
  }
  
  isOfferingVisible(offering: string): boolean {
    return this.offeringVisibility[offering as keyof typeof this.offeringVisibility];
  }
  
  getFilteredSessions(): ChatSession[] {
    const query = this.searchQuery.toLowerCase().trim();
    
    if (!query) {
      return this.savedSessions;
    }
    
    return this.savedSessions.filter(session => 
      session.title.toLowerCase().includes(query)
    );
  }
  
  closeGuidedDialog(): void {
    this.showGuidedDialog = false;
  }
  
  onTLActionCardClick(flowType: string): void {
    //from Guided journey
    this.closeGuidedDialog();
    this.tlFlowService.openFlow(flowType as 'draft-content' | 'conduct-research' | 'edit-content' | 'refine-content' | 'format-translator' | 'generate-podcast');
  }
  
  onMIActionCardClick(flowType: string): void {
    //console.log("Inside onclickMIAction");
    this.closeGuidedDialog();
    this.miFlowService.openFlow(flowType as  'conduct-research' | 'create-pov' | 'prepare-client-meeting' | 'gather-proposal-insights' | 'target-industry-insights');
  }
  
  showActionPrompts(category: string): void {
    this.selectedActionCategory = category;
    this.showPromptSuggestions = true;
  }
  
  usePrompt(prompt: string): void {
    this.showPromptSuggestions = false;
    this.userInput = prompt;
    // Auto-send the message
    this.sendMessage();
  }
  
  triggerFileUpload(type: 'improve' | 'sanitize'): void {
    // Create a file input element dynamically
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pptx';
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        if (type === 'improve') {
          this.originalPPTFile = file;
          this.selectedPPTOperation = 'improve';
          this.userInput = `Improve my presentation: ${file.name}`;
        } else {
          this.sanitizePPTFile = file;
          this.selectedPPTOperation = 'sanitize';
          this.userInput = `Sanitize my presentation: ${file.name}`;
        }
        // Let the user review and send
      }
    };
    fileInput.click();
  }

  createThoughtLeadership(): void {
    this.isLoading = true;
    this.showDraftForm = false;

    let userMessageContent = '';
    const tlData = this.thoughtLeadershipData;

    switch (this.selectedTLOperation) {
      case 'generate':
        userMessageContent = `Generate thought leadership article:\n\nTopic: ${tlData.topic}\nPerspective: ${tlData.perspective}\nTarget Audience: ${tlData.target_audience}${tlData.additional_context ? '\nAdditional Context: ' + tlData.additional_context : ''}`;
        if (this.referenceDocument) {
          userMessageContent += `\n\nReference Document: ${this.referenceDocument.name} (Note: File content integration requires backend support)`;
        }
        if (tlData.reference_link) {
          userMessageContent += `\nReference Link: ${tlData.reference_link}`;
        }
        break;
      case 'research':
        userMessageContent = `Research additional insights:\n\nTopic: ${tlData.topic}\nCurrent Perspective: ${tlData.perspective}${tlData.additional_context ? '\nAdditional Context: ' + tlData.additional_context : ''}`;
        break;
      case 'editorial':
        if (this.editorialDocumentFile) {
          userMessageContent = `Provide editorial support:\n\nDocument File: ${this.editorialDocumentFile.name} (Note: File content integration requires backend support)${tlData.additional_context ? '\n\nAdditional Instructions: ' + tlData.additional_context : ''}`;
        } else if (tlData.document_text) {
          userMessageContent = `Provide editorial support:\n\nDocument:\n${tlData.document_text}${tlData.additional_context ? '\n\nAdditional Instructions: ' + tlData.additional_context : ''}`;
        }
        break;
      case 'improve':
        userMessageContent = `Recommend improvements:\n\nDocument:\n${tlData.document_text}${tlData.additional_context ? '\n\nFocus Areas: ' + tlData.additional_context : ''}`;
        break;
      case 'translate':
        userMessageContent = `Translate document format:\n\nOriginal Document:\n${tlData.document_text}\n\nTarget Format: ${tlData.target_format}${tlData.additional_context ? '\nAdditional Requirements: ' + tlData.additional_context : ''}`;
        break;
    }

    const userMessage: Message = {
      role: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };
    // Only push message if it has content or attached files
      this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    this.messages.push(assistantMessage);

    // Convert reference_link to reference_urls array for backend
    const requestPayload: ThoughtLeadershipRequest = {
      operation: this.selectedTLOperation,
      topic: tlData.topic,
      perspective: tlData.perspective,
      target_audience: tlData.target_audience,
      document_text: tlData.document_text,
      target_format: tlData.target_format,
      additional_context: tlData.additional_context,
      reference_urls: tlData.reference_link ? [tlData.reference_link] : undefined
    };

    this.chatService.streamThoughtLeadership(requestPayload).subscribe({
      next: (content: string) => {
        assistantMessage.content += content;
      },
      error: (error: any) => {
        console.error('Error:', error);
        assistantMessage.content = 'Sorry, I encountered an error. Please make sure the AI service is configured correctly.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
        this.thoughtLeadershipData = {
          topic: '',
          perspective: '',
          target_audience: '',
          document_text: '',
          target_format: '',
          additional_context: '',
          reference_document: '',
          reference_link: ''
        };
        this.referenceDocument = null;
        this.editorialDocumentFile = null;
      }
    });
  }

  createDraft(): void {
    if (!this.draftData.topic || !this.draftData.objective || !this.draftData.audience) {
      return;
    }

    this.isLoading = true;
    this.showDraftForm = false;

    // Prepare user message with reference information
    let messageContent = `Create a presentation draft:\n\nTopic: ${this.draftData.topic}\nObjective: ${this.draftData.objective}\nAudience: ${this.draftData.audience}`;
    if (this.draftData.additional_context) {
      messageContent += `\nAdditional Context: ${this.draftData.additional_context}`;
    }
    if (this.referenceDocument) {
      messageContent += `\n\nReference Document: ${this.referenceDocument.name} (Note: File content integration requires backend support)`;
    }
    if (this.draftData.reference_link) {
      messageContent += `\nReference Link: ${this.draftData.reference_link}`;
    }
    
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };
    
    this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    this.messages.push(assistantMessage);

    // TODO: For file upload support, convert to FormData and update backend endpoint
    this.chatService.streamDraft(this.draftData).subscribe({
      next: (content: string) => {
        assistantMessage.content += content;
      },
      error: (error) => {
        console.error('Error:', error);
        assistantMessage.content = 'Sorry, I encountered an error while creating the draft. Please make sure the LLM is configured correctly.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
        this.draftData = {
          topic: '',
          objective: '',
          audience: '',
          additional_context: '',
          reference_document: '',
          reference_link: ''
        };
        this.referenceDocument = null;
      }
    });
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onOriginalFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.pptx')) {
      this.originalPPTFile = file;
    }
  }

  onReferenceFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.pptx')) {
      this.referencePPTFile = file;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  improvePPT(): void {
    if (!this.originalPPTFile) {
      return;
    }

    this.isLoading = true;
    this.showDraftForm = false;
    this.currentAction = 'Improving presentation: correcting spelling, aligning shapes, rebranding colors...';

    const userMessage: Message = {
      role: 'user',
      content: `Improve PowerPoint presentation:\n\nOriginal File: ${this.originalPPTFile.name}${this.referencePPTFile ? '\nReference File: ' + this.referencePPTFile.name : ''}\n\nOperations: Correct spelling/grammar, align shapes, rebrand colors${this.referencePPTFile ? ' (using reference PPT)' : ''}`,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actionInProgress: 'Processing your presentation...'
    };
    this.messages.push(assistantMessage);

    this.chatService.improvePPT(this.originalPPTFile, this.referencePPTFile).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        
        assistantMessage.content = '✅ Your presentation has been improved!\n\nChanges made:\n• Spelling and grammar corrections\n• Text and shape alignment\n' + (this.referencePPTFile ? '• Color rebranding applied\n' : '') + '\nYou can download your presentation below.';
        assistantMessage.downloadUrl = url;
        assistantMessage.downloadFilename = 'improved_presentation.pptx';
        assistantMessage.previewUrl = url; // Preview will trigger download for PPTX files
        assistantMessage.actionInProgress = undefined;
        this.isLoading = false;
        this.currentAction = '';
        this.originalPPTFile = null;
        this.referencePPTFile = null;
      },
      error: (error) => {
        console.error('Error:', error);
        assistantMessage.content = 'Sorry, I encountered an error while improving your presentation. Please make sure both files are valid PowerPoint files (.pptx).';
        assistantMessage.actionInProgress = undefined;
        this.isLoading = false;
        this.currentAction = '';
      }
    });
  }

  onSanitizeFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.pptx')) {
      this.sanitizePPTFile = file;
    }
  }

  sanitizePPT(): void {
    if (!this.sanitizePPTFile) {
      return;
    }

    this.isLoading = true;
    this.showDraftForm = false;
    this.currentAction = 'Sanitizing presentation: removing sensitive data, client names, numbers, and metadata...';

    const userMessage: Message = {
      role: 'user',
      content: `Sanitize PowerPoint presentation:\n\nFile: ${this.sanitizePPTFile.name}${this.sanitizeData.clientName ? '\nClient Name: ' + this.sanitizeData.clientName : ''}${this.sanitizeData.products ? '\nProducts: ' + this.sanitizeData.products : ''}\n\nRemoving: All sensitive data, numbers, client names, personal info, logos, and metadata`,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actionInProgress: 'Sanitizing your presentation...'
    };
    this.messages.push(assistantMessage);

    this.chatService.sanitizePPT(this.sanitizePPTFile, this.sanitizeData.clientName, this.sanitizeData.products, this.sanitizeData.options).subscribe({
      next: (response) => {
        const url = window.URL.createObjectURL(response.blob);

        let statsMessage = '';
        if (response.stats) {
          statsMessage = `\n\nSanitization Statistics:\n• Numeric replacements: ${response.stats.numeric_replacements}\n• Name replacements: ${response.stats.name_replacements}\n• Hyperlinks removed: ${response.stats.hyperlinks_removed}\n• Notes removed: ${response.stats.notes_removed}\n• Logos removed: ${response.stats.logos_removed}\n• Slides processed: ${response.stats.slides_processed}`;
          if (response.stats.llm_replacements) {
            statsMessage += `\n• LLM-detected items: ${response.stats.llm_replacements}`;
          }
        }

        assistantMessage.content = '✅ Your presentation has been sanitized!\n\nSanitization complete:\n• All numeric data replaced with X patterns\n• Personal information removed\n• Client/product names replaced with placeholders\n• Logos and watermarks removed\n• Speaker notes cleared\n• Metadata sanitized' + statsMessage + '\n\nYou can download your sanitized presentation below.';
        assistantMessage.downloadUrl = url;
        assistantMessage.downloadFilename = 'sanitized_presentation.pptx';
        assistantMessage.previewUrl = url; // Preview will trigger download for PPTX files
        assistantMessage.actionInProgress = undefined;
        this.isLoading = false;
        this.currentAction = '';
        this.sanitizePPTFile = null;
        this.sanitizeData = { 
          clientName: '', 
          products: '',
          options: {
            numericData: true,
            personalInfo: true,
            financialData: true,
            locations: true,
            identifiers: true,
            names: true,
            logos: true,
            metadata: true,
            llmDetection: true,
            hyperlinks: true,
            embeddedObjects: true
          }
        };
      },
      error: (error: any) => {
        console.error('Error:', error);
        assistantMessage.content = 'Sorry, I encountered an error while sanitizing your presentation. Please make sure the file is a valid PowerPoint file (.pptx).';
        assistantMessage.actionInProgress = undefined;
        this.isLoading = false;
        this.currentAction = '';
      }
    });
  }

  setTheme(theme: ThemeMode): void {
    this.themeService.setTheme(theme);
  }

  showChat(): void {
    this.showDraftForm = false;
  }

  startQuickChat(): void {
    // Quick Start goes directly to chat without showing the form
    this.showDraftForm = false;
    this.showAttachmentArea = true;
    // Add a message from assistant to start the conversation
    if (this.messages.length === 1) {
      this.messages.push({
        role: 'assistant',
        content: 'I\'m ready to help! What would you like to create today?\n\n💡 **Tip:** Upload a PowerPoint file to improve or sanitize it, or start typing to create new content.',
        timestamp: new Date()
      });
    }
  }
  

  quickStart(): void {
    // Check if Quick Start message has already been shown (avoid duplicates)
    const hasQuickStartMessage = this.messages.some(msg => 
      msg.role === 'assistant' && (
        msg.content.includes('Here\'s what I can help you with in the Doc Studio') ||
        msg.content.includes('Here\'s what I can help you with in Thought Leadership')
      )
    );
    
    if (hasQuickStartMessage) {
      // Already shown, just scroll to bottom
      this.triggerScrollToBottom();
      return;
    }
    
    // Create flow-specific welcome message
    let welcomeMessage = '';
    
    if (this.selectedFlow === 'ppt') {
      welcomeMessage = `👋 Welcome! Here's what I can help you with in the **Doc Studio**:

**📝 Prompt to Draft** • Quickly turn an objective or idea into a starter deck
**🔧 Outline to Deck** • Transform a detailed outline into a client-ready presentation
**🔒 Doc Sanitization** • Remove sensitive data to create shareable documents

💡 **Tips:** Upload a PowerPoint file using the attachment button, or simply describe what you need and I'll guide you through the process!`;
    } else if(this.selectedFlow === 'thought-leadership') {
      welcomeMessage = `👋 Welcome! Here's what I can help you with in **Cortex**:

✍️ **Draft Content** • Turn preliminary concepts or outlines into well-research, written, and edited drafts
🔍 **Conduct Research** • Tap into PwC’s full knowledge bank and third-party sources to execute targeted research in minutes
✏️ **Edit Content** • Deploy development, content, line, copy, and PwC brand alignment editors
📄 **Refine Drafts** • Expand or compress content, change tone, or enhance with targeted research & insights
🔄 **Adapt Content** • Transform final outputs into podcasts, social media posts or placements


💡 **Tips:** Type your request naturally, or click "Guided Journey" for a step-by-step wizard to create comprehensive content!`;
    }
    else{
      welcomeMessage = `👋 Welcome! Here's what I can help you with in **Market Intelligence & Insights**:


🔍 **Conduct Research** • Tap into PwC’s full knowledge bank and third-party sources to execute targeted research in minutes
🔄 **Generate Industry Insights** • Synthesize PwC expertise and market data to deliver structured industry intelligence
✨ **Prepare for Client Meeting** • Rapidly ramp-up for senior discussions with structured insights informed by years of experience
📋 **Create Point of View** • Quickly convert targeted research into well-written, edited, and refined perspectives
🔀 **Gather Proposal Inputs** • Develop a proposal outline and pull sample frameworks, approaches, and quals with one click

💡 **Tips:** Type your request naturally, or click "Guided Journey" for a step-by-step wizard to create comprehensive content!`;

    }
    
    // Add the welcome message to chat
    this.messages.push({
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date()
    });
    
    // Save session and scroll to bottom
    this.saveCurrentSession();
    this.triggerScrollToBottom();
  }
  
  toggleDropdown(dropdownId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.openDropdown = this.openDropdown === dropdownId ? null : dropdownId;
  }

  selectServiceProvider(provider: 'openai' | 'anthropic', event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedServiceProvider = provider;
    // Reset model selection to first available model for the new provider
    this.selectedModel = this.availableModels[0];
    this.openDropdown = null;
    console.log(`[ChatComponent] Service provider changed to: ${provider}, Model: ${this.selectedModel}`);
    // Notify backend of the selection change (dummy endpoint)
    this.sendLLMSelectionToBackend(this.selectedServiceProvider, this.selectedModel)
      .catch(err => console.warn('[ChatComponent] sendLLMSelectionToBackend error', err));
  }

  selectModel(model: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedModel = model;
    this.openDropdown = null;
    console.log(`[ChatComponent] Model changed to: ${model}`);
    // Notify backend of the selection change (dummy endpoint)
    this.sendLLMSelectionToBackend(this.selectedServiceProvider, this.selectedModel)
      .catch(err => console.warn('[ChatComponent] sendLLMSelectionToBackend error', err));
  }

  /**
   * Send a dummy POST to backend with selected LLM provider + model.
   * This uses AuthFetchService to include auth when available.
   */
  private async sendLLMSelectionToBackend(provider: 'openai' | 'anthropic', model: string): Promise<void> {
    try {
      const apiBase = (environment && (environment as any).apiUrl) ? (environment as any).apiUrl : ''; 
      const endpoint = `${apiBase}/api/v1/configure-llm`;
      console.log('[ChatComponent] Sending LLM selection to backend:', endpoint, { provider, model });

      const response = await this.authFetchService.authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ serviceProvider: provider, model }),
      });

      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (e) {
        bodyText = '<no response body>';
      }

      console.log('[ChatComponent] LLM selection response', response.status, bodyText);
    } catch (e) {
      console.warn('[ChatComponent] Failed to send LLM selection to backend', e);
      throw e;
    }
  }

  logout(): void {
    this.openDropdown = null;
    this.authService.logout();
  }
  
  selectPrompt(prompt: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.userInput = prompt;
    this.openDropdown = null;
    // Focus the input after selection
    setTimeout(() => {
      const inputElement = document.querySelector('.chat-input-area textarea') as HTMLTextAreaElement;
      if (inputElement) {
        inputElement.focus();
      }
    }, 100);
  }
  
  getDropdownPrompts(dropdownId: string): string[] {
    const promptMap: {[key: string]: string[]} = {
      // PPT prompts
      'draft': this.promptCategories.draft.prompts,
      'fix': this.promptCategories.improve.prompts,
      'sanitize': this.promptCategories.sanitize.prompts,
      'bestPractices': this.promptCategories.bestPractices.prompts,
      // NEW: TL Section prompts
      'draftContent': this.promptCategories.draftContent.prompts,
      'conductResearch': this.promptCategories.conductResearch.prompts,
      'editContent': this.promptCategories.editContent.prompts,
      'refineContent': this.promptCategories.refineContent.prompts,
      'formatTranslator': this.promptCategories.formatTranslator.prompts,
      // Legacy TL prompts
      'generate': this.promptCategories.generate.prompts,
      'research': this.promptCategories.research.prompts,
      'draftArticle': this.promptCategories.draftArticle.prompts,
      'review': this.promptCategories.editorial.prompts
    };
    return promptMap[dropdownId] || [];
  }
  
  quickActionClick(action: string): void {
    // For PPT actions, set prompt in chat
    if (this.selectedFlow === 'ppt') {
      const pptPrompts: {[key: string]: string} = {
        'Digital Document Development Center': 'Help me create a new digital document',
        'Fix Formatting': 'I need to fix formatting in my presentation',
        'Sanitize Documents': 'I need to sanitize sensitive data from my presentation',
        'Validate Best Practices': 'Validate my presentation against PwC best practices'
      };
      this.userInput = pptPrompts[action] || action;
    } else {
      // For TL and MI actions, open the appropriate guided flow
      const flowMapping: {[key: string]: any} = {
        'Draft Content': 'draft-content',
        'Conduct Research': 'conduct-research',
        'Edit Content': 'edit-content',
        'Refine Content': 'refine-content',
        'Format Translator': 'format-translator',
        'Create POV': 'create-pov',
        'Prepare for Client Meeting': 'prepare-client-meeting',
        'Gather Proposal Insights': 'gather-proposal-insights',
        'Target Industry Insights': 'target-industry-insights'
      };
      
      const flowType = flowMapping[action];
      if (flowType) {
        this.tlFlowService.openFlow(flowType);
      }
    }
  }
  
  openDdcWorkflow(workflowId: string): void {
    console.log('[ChatComponent] Opening DDC workflow:', workflowId);
    // Set context: opened from quick-action button
    this.workflowOpenedFrom = 'quick-action';
    this.ddcFlowService.openFlow(workflowId as any);
  }
 

  
  onReferenceDocumentSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.referenceDocument = file;
    }
  }
  
  onEditorialDocumentSelected(event: any): void {
    const file = event.target.files[0];
    if (file && (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
      this.editorialDocumentFile = file;
    }
  }
  
  triggerReferenceUpload(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pptx,.docx,.pdf,.txt'; //,.jpeg,.jpg,.png,.xlsx
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();
      
      // For PPT files, store as uploadedPPTFile (binary will be sent as FormData)
      if (fileName.endsWith('.pptx')) {
        this.uploadedPPTFile = file;
        console.log('[ChatComponent] PPT file selected for upload:', file.name);
        return;
      }
      if (fileName.endsWith('.xlsx')) {
        this.uploadedPPTFile = file;
        console.log('[ChatComponent] Excel file selected for upload:', file.name);
        return;
      }

      // For image files (jpeg, png), store as binary FormData (similar to PPT)
      if (fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.jpg')) {
        this.uploadedPPTFile = file;
        console.log('[ChatComponent] Image file selected for upload:', file.name);
        return;
      }

      // For xlxs files, store as binary FormData (similar to PPT)
      if (fileName.endsWith('.xlsx')) {
        this.uploadedPPTFile = file;
        console.log('[ChatComponent] Excel file selected for upload:', file.name);
        return;
      }

      // For non-PPT files (docx, pdf, txt), extract text and store in extractedDocuments
      if (fileName.endsWith('.docx') || fileName.endsWith('.pdf') || fileName.endsWith('.txt') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.xlsx')) {
        this.extractTextFromReferenceFile(file);
        return;
      }
    };
    fileInput.click();
  }

  /**
   * Extract text from reference document (docx, pdf, txt)
   * Stores extracted text in this.extractedDocuments for later appending to DDC message
   */
  private async extractTextFromReferenceFile(file: File): Promise<void> {
    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    const endpoint = `${apiUrl}/api/v1/export/extract-text`;

    this.isExtractingText = true;
    this.currentAction = `Extracting text/details from ${file.name}...`;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const authHeaders = await (this.authFetchService as any).getAuthHeadersForFormData?.() || {};
      const headers: Record<string, string> = { ...authHeaders };

      const response = await this.authFetchService.authenticatedFetchFormData(endpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Extract-text failed: ${response.status}`);
      }

      const result = await response.json();
      const extractedText = result.text || result.extracted_text || '';

      if (!extractedText.trim()) {
        throw new Error('No text extracted from file');
      }

      // Check if document is already in extractedDocuments (avoid duplicates)
      const existingIndex = this.extractedDocuments.findIndex(doc => doc.fileName === file.name);
      
      if (existingIndex !== -1) {
        // Update existing document
        this.extractedDocuments[existingIndex] = {
          fileName: file.name,
          extractedText: extractedText,
          //timestamp: new Date()
        };
        console.log('[ChatComponent] Updated extracted text for:', file.name);
      } else {
        // Add new document
        this.extractedDocuments.push({
          fileName: file.name,
          extractedText: extractedText,
          //timestamp: new Date()
        });
        console.log('[ChatComponent] Extracted text from reference file:', file.name, 'Length:', extractedText.length);
      }
      

      this.isExtractingText = false;
      this.currentAction = '';
      this.cdr.detectChanges();

    } catch (error) {
      console.error('[ChatComponent] Error extracting text from reference file:', error);
      this.isExtractingText = false;
      this.currentAction = '';
      this.showNotificationMessage(`Error extracting text from ${file.name}. Please try again.`, 'error');
    }
  }
  
  removeUploadedPPT(): void {
    this.uploadedPPTFile = null;
  }

  removeExtractedDocument(fileName: string): void {
    this.extractedDocuments = this.extractedDocuments.filter(doc => doc.fileName !== fileName);
  }

  onEditDocumentSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.editDocumentUploadError = '';
      // Accept Word, PDF, Text, Markdown files
      const validExtensions = ['.doc', '.docx', '.pdf', '.txt', '.md', '.markdown'];
      const fileName = file.name.toLowerCase();
      // const isValid = validExtensions.some(ext => fileName.endsWith(ext));
            const isValidFormat = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValidFormat) {
        this.editDocumentUploadError = 'Invalid file format. Please upload a Word (.doc, .docx), PDF (.pdf), Text (.txt), or Markdown (.md, .markdown) file.';
        console.log('[ChatComponent] Invalid format error set:', this.editDocumentUploadError);
        this.cdr.detectChanges();
        return;
      }
      
      // Validate file size (5MB limit)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
        this.editDocumentUploadError = `File size exceeds the maximum limit of ${this.MAX_FILE_SIZE_MB}MB. Please upload a smaller file.`;
        console.log('[ChatComponent] File size error set:', this.editDocumentUploadError);
        this.cdr.detectChanges();
        return;
      }

      
      // if (isValid) {
      //   this.uploadedEditDocumentFile = file;
      //   console.log('[ChatComponent] Edit document selected:', file.name);
        
      //   // Auto-trigger workflow if in Thought Leadership mode
      //   if (this.selectedFlow === 'thought-leadership') {
      //     // Small delay to ensure file is set before sendMessage processes it
      //     setTimeout(() => {
      //       this.sendMessage();
      //     }, 100);
      //   }
      // } else {
      //   alert('Please upload a Word (.doc, .docx), PDF (.pdf), Text (.txt), or Markdown (.md, .markdown) file.');
      this.uploadedEditDocumentFile = file;
      console.log('[ChatComponent] Edit document selected:', file.name);
      
      // Auto-trigger workflow if in Thought Leadership mode
      if (this.selectedFlow === 'thought-leadership') {
        // Small delay to ensure file is set before sendMessage processes it
        setTimeout(() => {
          this.sendMessage();
        }, 100);
      }
    }
  }

  removeUploadedEditDocument(): void {
    this.uploadedEditDocumentFile = null;
    this.editDocumentUploadError = '';
    // Also clear extracted documents array if present
    this.extractedDocuments = [];
  }

  getUploadedDocumentsCount(): number {
    return this.extractedDocuments.length;
  }

  /**
   * Estimate total token count for all extracted documents
   * Uses approximate calculation: 1 token ≈ 4 characters (conservative estimate for English text)
   * This is a rough approximation; actual tokenization may vary by model
   */
  private estimateTotalTokens(): number {
    const CHARS_PER_TOKEN = 4; // Conservative estimate (OpenAI typically uses ~4 chars per token)
    
    let totalChars = 0;
    for (const doc of this.extractedDocuments) {
      totalChars += doc.extractedText.length;
    }
    
    return Math.ceil(totalChars / CHARS_PER_TOKEN);
  }

  triggerEditDocumentUpload(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.doc,.docx,.pdf,.txt,.md,.markdown';
    fileInput.onchange = (event: any) => {
      this.onEditDocumentSelected(event);
    };
    fileInput.click();
  }

  /**
   * Trigger document upload for analysis (non-workflow scenario)
   * This extracts text and continues with normal chat flow - supports multiple files
   */
  triggerDocumentAnalysisUpload(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.doc,.docx,.pdf,.txt,.md,.markdown,.pptx';
    fileInput.multiple = true; // Enable multiple file selection
    fileInput.onchange = (event: any) => {
      this.onDocumentAnalysisSelected(event);
    };
    fileInput.click();
  }

  /**
   * Handle document selection for analysis (non-workflow) - supports multiple files
   * Extracts text from all documents and stores them for later use when user sends message
   */
  async onDocumentAnalysisSelected(event: any): Promise<void> {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    // Validate all file types
    const validExtensions = ['.doc', '.docx', '.pdf', '.txt', '.md', '.markdown','.pptx'];
    const invalidFiles: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i].name.toLowerCase();
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));
      if (!isValid) {
        invalidFiles.push(files[i].name);
      }
    }

    if (invalidFiles.length > 0) {
      const msg = `Please upload only Word (.doc, .docx), PDF (.pdf), Text (.txt), PPT(.pptx) or Markdown (.md, .markdown) files.\n\nInvalid files: ${invalidFiles.join(', ')}`;
      this.showDocumentUploadError(msg);
      return;
    }

    // Validate total file size (50 MB limit)
    const MAX_TOTAL_SIZE_MB = 50;
    const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
    let totalSize = 0;
    
    for (let i = 0; i < files.length; i++) {
      totalSize += files[i].size;
    }
    
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      const msg = `Total file size (${totalSizeMB} MB) exceeds the maximum allowed size of ${MAX_TOTAL_SIZE_MB} MB.\n\nPlease select fewer or smaller files.`;
      this.showDocumentUploadError(msg);
      return;
    }

    console.log(`[ChatComponent] ${files.length} document(s) selected for analysis, total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

    // Show loading state with specific message
    this.isExtractingText = true;
    this.currentAction = files.length === 1 
      ? `Extracting text from ${files[0].name}...`
      : `Extracting text from ${files.length} documents...`;

    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    const endpoint = `${apiUrl}/api/v1/export/extract-text`;

    try {
      // Process all files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress message
        if (files.length > 1) {
          this.currentAction = `Extracting text from ${file.name} (${i + 1}/${files.length})...`;
        }

        // Build FormData for extract-text API call
        const formData = new FormData();
        formData.append('file', file);

        const response = await this.authFetchService.authenticatedFetchFormData(endpoint, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[ChatComponent] Extract-text failed for ${file.name}:`, response.status, errorText);
          const msg = `Failed to extract text from "${file.name}". This file will be skipped.`;
          this.showDocumentUploadError(msg);
          continue; // Skip this file and continue with others
        }

        const data = await response.json();
        const extractedText = data?.text || '';

        if (!extractedText) {
          console.warn(`[ChatComponent] Extract-text returned empty text for ${file.name}`);
          const msg = `No text could be extracted from "${file.name}". This file will be skipped.`;
          this.showDocumentUploadError(msg);
          continue; // Skip this file and continue with others
        }

        console.log(`[ChatComponent] Text extracted from ${file.name}, length:`, extractedText.length, 'chars');

        // Store extracted text and file name
        this.extractedDocuments.push({
          fileName: file.name,
          extractedText: extractedText
        });

        // Also store in uploadedEditDocumentFile for UI display (use last file)
        this.uploadedEditDocumentFile = file;
      }

      if (this.extractedDocuments.length === 0) {
        const msg = 'No text could be extracted from any of the uploaded documents.';
        this.showDocumentUploadError(msg);
        this.isExtractingText = false;
        this.currentAction = '';
        return;
      }

      // Validate total token count (10,000 tokens limit)
      const MAX_TOKENS = 10000;
      const totalTokens = this.estimateTotalTokens();
      
      if (totalTokens > MAX_TOKENS) {
        const tokenCountFormatted = totalTokens.toLocaleString();
        const msg = `The extracted text from all documents is approximately ${tokenCountFormatted} tokens, which exceeds the maximum limit of ${MAX_TOKENS.toLocaleString()} tokens.\n\nPlease upload fewer documents or documents with less content.`;
        this.showDocumentUploadError(msg);

        // Clear the extracted documents as they exceed limit
        this.extractedDocuments = [];
        this.uploadedEditDocumentFile = null;
        this.isExtractingText = false;
        this.currentAction = '';
        return;
      }

      console.log(`[ChatComponent] Successfully extracted text from ${this.extractedDocuments.length} document(s), estimated tokens: ${totalTokens}`);

      this.isExtractingText = false;
      this.currentAction = '';
      
      // Focus on the text input so user can type their instruction
      setTimeout(() => {
        this.composerTextarea?.nativeElement?.focus();
      }, 100);

    } catch (error) {
      console.error('[ChatComponent] Error extracting text:', error);
      const msg = 'An error occurred while extracting text from the documents. Please try again.';
      this.showDocumentUploadError(msg);
      this.isExtractingText = false;
      this.currentAction = '';
    }
  }

  onWorkflowEditorsSubmitted(selectedIds: string[]): void {
    this.editWorkflowService.handleEditorSelection(selectedIds);
  }

  onWorkflowEditorsSelectionChanged(message: Message, editors: EditorOption[]): void {
    if (message.editWorkflow?.editorOptions) {
      message.editWorkflow.editorOptions = editors;
    }
  }

  onWorkflowCancelled(): void {
    this.editWorkflowService.cancelWorkflow();
  }

  /**
   * Show a simple toast notification inside this component.
   * Auto-hides after 4 seconds.
   */
  private showNotificationMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;
    this.cdr.detectChanges();

    // Auto-hide after timeout
    setTimeout(() => {
      this.showNotification = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  /**
   * Show inline error message for document upload validation.
   * Auto-hides after 5 seconds.
   */
  private showDocumentUploadError(message: string): void {
    console.log('[ChatComponent] Showing document upload error:', message);
    this.editDocumentUploadError = message;
    this.cdr.detectChanges();

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.editDocumentUploadError = '';
      this.cdr.detectChanges();
    }, 5000);
  }

  onWorkflowFileSelected(file: File): void {
        // Validate file format
    const validExtensions = ['.doc', '.docx', '.pdf', '.txt', '.md', '.markdown'];
    const fileName = file.name.toLowerCase();
    const isValidFormat = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidFormat) {
      this.editDocumentUploadError = 'Invalid file format. Please upload a Word (.doc, .docx), PDF (.pdf), Text (.txt), or Markdown (.md, .markdown) file.';
      return; // Stop here - don't process invalid files
    }
    
    // Validate file size (5MB limit)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
      this.editDocumentUploadError = `File size exceeds the maximum limit of ${this.MAX_FILE_SIZE_MB}MB. Please upload a smaller file.`;
      return; // Stop here - don't process oversized files
    }

    if (this.editWorkflowService.currentState.step === 'awaiting_content') {
      // Store the file so it can be displayed in the upload component
      this.uploadedEditDocumentFile = file;
      // Handle the file upload through the workflow service
      this.editWorkflowService.handleFileUpload(file);
    }
    
    // Also handle draft workflow file uploads
    if (this.draftWorkflowService.isActive) {
      this.draftWorkflowService.handleFileUpload(file);
    }
  }

  onWorkflowFileRemoved(): void {
    // File removed - clear the uploaded file
    this.uploadedEditDocumentFile = null;
    this.editDocumentUploadError = '';
    // Note: Workflow continues even if file is removed - user can upload again
  }

  getUploadedFileForMessage(message: Message): File | null {
    // Only return the uploaded file if we're in awaiting_content step AND workflow is active
    // This prevents showing old files when workflow is idle or starting new workflow
    if (message.editWorkflow?.step === 'awaiting_content' && 
        this.editWorkflowService.isActive && 
        this.uploadedEditDocumentFile) {
      return this.uploadedEditDocumentFile;
    }
    return null;
  }

  onParagraphApproved(message: Message, index: number): void {
    if (!message.editWorkflow?.paragraphEdits) {
      return;
    }
    
    const paragraph = message.editWorkflow.paragraphEdits.find(p => p.index === index);
    if (!paragraph) {
      return;
    }
    
    // Update the paragraph directly (like Guided Journey)
    paragraph.approved = true;
    
    // Also sync with service state for final article generation
    this.editWorkflowService.syncParagraphEditsFromMessage(message.editWorkflow.paragraphEdits);
    
    // Save session and trigger change detection
    this.saveCurrentSession();
    this.cdr.detectChanges();
  }

  onParagraphDeclined(message: Message, index: number): void {
    if (!message.editWorkflow?.paragraphEdits) {
      return;
    }
    
    const paragraph = message.editWorkflow.paragraphEdits.find(p => p.index === index);
    if (!paragraph) {
      return;
    }
    
    // Update the paragraph directly (like Guided Journey)
    paragraph.approved = false;
    
    // Also sync with service state for final article generation
    this.editWorkflowService.syncParagraphEditsFromMessage(message.editWorkflow.paragraphEdits);
    
    // Save session and trigger change detection
    this.saveCurrentSession();
    this.cdr.detectChanges();
  }

  onGenerateFinalArticle(message: Message): void {
    if (message.editWorkflow?.paragraphEdits && message.editWorkflow.paragraphEdits.length > 0) {
      this.editWorkflowService.syncParagraphEditsFromMessage(message.editWorkflow.paragraphEdits);
    }
    
    if (message.editWorkflow?.threadId) {
      this.editWorkflowService.syncThreadIdFromMessage(message.editWorkflow.threadId);
    }
    
    this.editWorkflowService.generateFinalArticle();
  }

  onNextEditor(message: Message): void {
    // Sync paragraphEdits from message to service before calling next editor
    if (message.editWorkflow?.paragraphEdits && message.editWorkflow.paragraphEdits.length > 0) {
      this.editWorkflowService.syncParagraphEditsFromMessage(message.editWorkflow.paragraphEdits);
    }
    
    // Sync threadId from message to service (same as Guided Journey stores it in component)
    if (message.editWorkflow?.threadId) {
      this.editWorkflowService.syncThreadIdFromMessage(message.editWorkflow.threadId);
    }
    
    // Call the service to proceed to next editor
    const paragraphEdits = message.editWorkflow?.paragraphEdits || [];
    this.editWorkflowService.nextEditor(paragraphEdits, message.editWorkflow?.threadId);
  }

  getParagraphEditsGeneratingState(message: Message): boolean {
    // Return only final output generating state (for Generate Final Output button)
    return this.editWorkflowService.isGeneratingFinal;
  }

  getParagraphEditsNextEditorGeneratingState(message: Message): boolean {
    // Return only next editor generating state (for Next Editor button)
    return this.editWorkflowService.isGeneratingNextEditor;
  }

  hasFinalOutputBeenGenerated(message: Message, messageIndex: number): boolean {
    if (message.editWorkflow?.finalOutputGenerated === true) {
      return true;
    }
    // Check if final output has been generated by looking for a message after this one
    // with thoughtLeadership topic 'Final Revised Article'
    if (messageIndex < 0 || messageIndex >= this.messages.length - 1) {
      return false;
    }
    
    // Check messages after this one for final output
    for (let i = messageIndex + 1; i < this.messages.length; i++) {
      const nextMessage = this.messages[i];
      if (nextMessage.thoughtLeadership?.topic === 'Final Revised Article' ||
          (nextMessage.content && nextMessage.content.includes('Final Revised Article'))) {
        return true;
      }
    }
    
    return false;
  }

  private clearWorkflowState(): void {
    this.userInput = '';
    this.resetComposerHeight();
    this.uploadedEditDocumentFile = null;
    // Clear file input elements in workflow file upload components
    setTimeout(() => {
      const workflowFileInputs = document.querySelectorAll('.workflow-file-upload input[type="file"]');
      workflowFileInputs.forEach((input: any) => {
        if (input.value) {
          input.value = '';
        }
      });
      // Also clear any file inputs in chat input area
      const chatFileInputs = document.querySelectorAll('.chat-composer input[type="file"]');
      chatFileInputs.forEach((input: any) => {
        if (input.value) {
          input.value = '';
        }
      });
    }, 0);
    // Trigger change detection to update FileUploadComponent bindings
    this.cdr.detectChanges();
  }

  // Check if we're in step 2 (awaiting_content) - now optional since we show upload component
  get isAwaitingContent(): boolean {
    return this.editWorkflowService.isActive && 
           this.editWorkflowService.currentState.step === 'awaiting_content';
  }

  isEditWorkflowResult(message: Message): boolean {
    // Show action buttons for thought leadership and market intelligence content results
    // Check either thoughtLeadership or marketIntelligence metadata with showActions flag
    const hasShowActions =
      (message.thoughtLeadership && message.thoughtLeadership.showActions) ||
      (message.marketIntelligence && message.marketIntelligence.showActions);
   
    console.log('[Chat Component] isEditWorkflowResult Check:', {
      messageContent: message.content?.substring(0, 50),
      hasTLMetadata: !!message.thoughtLeadership,
      tlShowActions: message.thoughtLeadership?.showActions,
      hasMIMetadata: !!message.marketIntelligence,
      miShowActions: message.marketIntelligence?.showActions,
      hasShowActions: hasShowActions,
      result: hasShowActions === true,
      timestamp: new Date().toISOString()
    });
    
    if (!hasShowActions) {
      return false;
    }
    
    // Check if content indicates it's a result (Editorial Feedback, Revised Article, Draft Content, etc.)
    const content = message.content.toLowerCase();
    // return content.includes('editorial feedback') || 
    //        content.includes('revised article') || 
    //        content.includes('quick start thought leadership') ||
    //        content.includes('generated content') || content.includes('formated content');
    return true
  }


  shouldHideEditorialFeedback(message: Message, messageIndex: number): boolean {
    // Check if this message is editorial feedback
    const isEditorialFeedback = message.thoughtLeadership?.topic === 'Editorial Feedback' ||
                                (message.content && message.content.toLowerCase().includes('editorial feedback'));
    
    if (!isEditorialFeedback) {
      return false;
    }
    
    // Only hide editorial feedback if it's in the SAME message as paragraph edits
    // (Separate messages should both be shown - editorial feedback first, then paragraph edits)
    if (message.editWorkflow?.paragraphEdits && message.editWorkflow.paragraphEdits.length > 0) {
      return true;
    }
    
    return false;
  }
  
  downloadGeneratedDocument(format: string, content: string, filename: string): void {
    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.txt`;
      link.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'pdf' || format === 'word') {
      this.chatService.exportDocument(content, filename, format).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.${format === 'word' ? 'docx' : 'pdf'}`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error: any) => {
          console.error(`Error downloading ${format}:`, error);
          this.toastService.error(`Failed to download ${format === 'word' ? 'Word document' : 'PDF'}. Please try again.`);
        }
      });
    }
  }

  copiedButtonId: string | null = null;

  copyToClipboard(content: string, buttonId?: string): void {
    // Convert markdown to plain text for better readability when pasted
    const plainText = this.convertMarkdownToPlainText(content);
    
    navigator.clipboard.writeText(plainText).then(() => {
      // Trigger animation on the button
      if (buttonId) {
        this.copiedButtonId = buttonId;
        this.cdr.detectChanges();
        
        // Remove animation after 2 seconds
        setTimeout(() => {
          this.copiedButtonId = null;
          this.cdr.detectChanges();
        }, 2000);
      }
    }).catch(err => {
      console.error('Failed to copy:', err);
      // No animation on error - just log it
    });
  }

  private convertMarkdownToPlainText(markdown: string): string {
    let text = markdown;
    
    // Remove markdown links [text](url) -> text
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    
    // Remove markdown images ![alt](url) -> alt
    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
    
    // Convert bold **text** -> text
    text = text.replace(/\*\*([^\*]+)\*\*/g, '$1');
    
    // Convert italic *text* -> text
    text = text.replace(/\*([^\*]+)\*/g, '$1');
    
    // Convert italic _text_ -> text
    text = text.replace(/_([^_]+)_/g, '$1');
    
    // Convert strikethrough ~~text~~ -> text
    text = text.replace(/~~([^~]+)~~/g, '$1');
    
    // Convert headers # text -> text
    text = text.replace(/^#+\s+/gm, '');
    
    // Convert horizontal rules
    text = text.replace(/^[-*_]{3,}$/gm, '');
    
    // Convert code blocks ``` -> remove backticks
    text = text.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```/g, '').trim();
    });
    
    // Convert inline code `text` -> text
    text = text.replace(/`([^`]+)`/g, '$1');
    
    // Convert blockquotes > text -> text
    text = text.replace(/^>\s+/gm, '');
    
    // Convert unordered lists - * text -> text
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    
    // Convert ordered lists 1. text -> text
    text = text.replace(/^[\s]*\d+\.\s+/gm, '');
    
    // Remove extra blank lines (more than 2 consecutive)
    text = text.replace(/\n\n\n+/g, '\n\n');
    
    // Trim leading and trailing whitespace
    text = text.trim();
    
    return text;
  }

  regenerateMessage(messageIndex: number): void {
    const message = this.messages[messageIndex];
    if (!message || message.role !== 'assistant') {
      return;
    }

    console.log(`[ChatComponent] Regenerating message at index ${messageIndex}`);
    
    // Get the previous user message
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && this.messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) {
      console.error('[ChatComponent] No user message found to regenerate from');
      this.toastService.error('Cannot regenerate: no user message found');
      return;
    }

    const userMessage = this.messages[userMessageIndex];
    const userInput = userMessage.content;

    // Clear the assistant message and prepare for regeneration
    message.content = '';
    message.isStreaming = true;
    this.isLoading = true;
    this.triggerScrollToBottom();

    // Prepare messages for API call (exclude current and subsequent messages)
    const messagesToSend = this.messages
      .slice(0, messageIndex)
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    console.log(`[ChatComponent] Regenerating with ${messagesToSend.length} context messages`);

    // Ensure we have a session ID before sending
    if (!this.currentSessionId) {
      this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[ChatComponent] Generated new session ID:', this.currentSessionId);
    }

    // Call the chat service to regenerate
    this.chatService.streamChat(
      messagesToSend,
      this.userId,
      this.currentSessionId,
      this.dbThreadId || undefined,
      this.getSourceFromFlow()
    ).subscribe({
      next: (content: string) => {
        message.content += content;
        this.triggerScrollToBottom();
      },
      error: (error: any) => {
        console.error('[ChatComponent] Error regenerating message:', error);
        message.content = 'Sorry, I encountered an error while regenerating the response. Please try again.';
        message.isStreaming = false;
        this.isLoading = false;
        this.triggerScrollToBottom();
      },
      complete: () => {
        message.isStreaming = false;
        this.isLoading = false;
        this.saveCurrentSession();
        this.triggerScrollToBottom();
        console.log('[ChatComponent] Message regeneration complete');
      }
    });
  }

  downloadAsWord(content: string): void {
    // Extract title from content (first line or "Refined Content")
    const lines = content.split('\n');
    let title = 'Refined Content';
    
    // Try to extract title from markdown heading or first line
    const titleMatch = content.match(/\*\*(.+?)\*\*/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else if (lines[0] && lines[0].trim()) {
      title = lines[0].trim().replace(/^#+\s*/, '').substring(0, 50);
    }
    
    // Clean title for filename
    const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'refined_content';
    
    this.downloadGeneratedDocument('word', content, filename);
  }

  downloadAsPDF(content: string): void {
    // Extract title from content (first line or "Refined Content")
    const lines = content.split('\n');
    let title = 'Refined Content';
    
    // Try to extract title from markdown heading or first line
    const titleMatch = content.match(/\*\*(.+?)\*\*/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else if (lines[0] && lines[0].trim()) {
      title = lines[0].trim().replace(/^#+\s*/, '').substring(0, 50);
    }
    
    // Clean title for filename
    const filename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'refined_content';
    
    this.downloadGeneratedDocument('pdf', content, filename);
  }
  
  // Helper method to get TL or MI metadata for any assistant message
  getTLMetadata(message: Message): ThoughtLeadershipMetadata | MarketIntelligenceMetadata | undefined {
    // If message already has TL metadata, return it
    if (message.thoughtLeadership) {
      console.log('[Chat Component] getTLMetadata: Found TL metadata', {
        contentType: message.thoughtLeadership.contentType,
        showActions: message.thoughtLeadership.showActions,
        hasPodcastUrl: !!message.thoughtLeadership.podcastAudioUrl
      });
      return message.thoughtLeadership;
    }
   
    // If message already has MI metadata, return it
    if (message.marketIntelligence) {
      console.log('[Chat Component] getTLMetadata: Found MI metadata', {
        contentType: message.marketIntelligence.contentType,
        showActions: message.marketIntelligence.showActions
      });
      return message.marketIntelligence;
    }
    
    // If we're in TL mode and this is an assistant message with content, create default metadata
    if (this.selectedFlow === 'thought-leadership' && message.role === 'assistant' && message.content) {
      console.log('[Chat Component] getTLMetadata: Creating default TL metadata');
      return {
        contentType: 'article', // Default type
        topic: 'Generated Content',
        fullContent: message.content,
        showActions: true
      };
    }
    
    console.log('[Chat Component] getTLMetadata: No metadata found or conditions not met', {
      hasThoughtLeadership: !!message.thoughtLeadership,
      hasMarketIntelligence: !!message.marketIntelligence,
      selectedFlow: this.selectedFlow,
      messageRole: message.role,
      hasContent: !!message.content
    });
    
    return undefined;
  }
  
  // Helper to detect if message is a welcome/instructional message (not actual generated content)
  private isWelcomeMessage(message: Message): boolean {
    if (!message.content || message.role !== 'assistant') return false;
    
    const content = message.content.toLowerCase();
    const welcomePatterns = [
      'welcome to',
      'how can i assist',
      'how can i help',
      'i\'ll help you',
      'please provide:',
      'you can also use'
    ];
    
    // Check if content starts with or contains welcome patterns
    return welcomePatterns.some(pattern => content.includes(pattern));
  }
  
  // Check if message should show TL action buttons
  shouldShowTLActions(message: Message): boolean {
    // Don't show action buttons for welcome/instructional messages
    // if (this.isWelcomeMessage(message)) {
    //   console.log('[Chat Component] shouldShowTLActions: FALSE - Is welcome message');
    //   return false;
    // }
    
    const hasTLShowActions = !!(message.thoughtLeadership && message.thoughtLeadership.showActions);
    const hasMIShowActions = !!(message.marketIntelligence && message.marketIntelligence.showActions);
    const shouldShow = hasTLShowActions || hasMIShowActions;
    
    // console.log('[Chat Component] shouldShowTLActions Check:', {
    //   messageContent: message.content?.substring(0, 50),
    //   hasTLMetadata: !!message.thoughtLeadership,
    //   tlShowActions: message.thoughtLeadership?.showActions,
    //   hasMIMetadata: !!message.marketIntelligence,
    //   miShowActions: message.marketIntelligence?.showActions,
    //   result: shouldShow,
    //   timestamp: new Date().toISOString()
    // });
    
    // Show action buttons for messages with thoughtLeadership OR marketIntelligence metadata with showActions flag
    return shouldShow;
  }
  
  openPodcastFlow(userQuery: string): void {
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: userQuery,
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    
    // Add assistant response suggesting podcast generation
    const assistantMessage: Message = {
      role: 'assistant',
      content: `I'll help you generate a podcast! Please provide:\n\n1. **Topic or Content**: What should the podcast be about?\n2. **Style**: Dialogue (2 hosts) or Monologue (1 narrator)?\n3. **Additional Context** (optional): Any specific points or customization?\n\nYou can also use the **Guided Journey** button above to open the full podcast creation wizard, or type your requirements here and I'll generate it for you.`,
      timestamp: new Date()
    };
    this.messages.push(assistantMessage);
    
    this.userInput = '';
    this.resetComposerHeight();
    this.saveCurrentSession();
    this.triggerScrollToBottom();
    
    // Optionally, open the guided dialog directly to the podcast workflow
    this.selectedTLOperation = 'generate-podcast';
    this.showGuidedDialog = true;
  }

  showDraftContentTypeOptions(userQuery: string, detectedTopic?: string): void {
    // Store the detected topic for later use
    this.pendingDraftTopic = detectedTopic || null;
    console.log('[ChatComponent] Storing pending draft topic:', this.pendingDraftTopic);
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: userQuery,
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    
    // Add assistant response with four content type options
    const assistantMessage: Message = {
      role: 'assistant',
      content: `Great! I can help you create thought leadership content. Please select the type of content you want to create:

📄 **Article** (2,000-3,000 words)
📝 **Blog** (800-1,500 words)
📋 **Executive Brief** (500-1,000 words)
📑 **White Paper** (5,000+ words)

Click one of the buttons below to get started, or you can type your selection.`,
      timestamp: new Date(),
      actionButtons: [
        { label: 'Article', action: 'draft-article' },
        { label: 'Blog', action: 'draft-blog' },
        { label: 'Executive Brief', action: 'draft-executive-brief' },
        { label: 'White Paper', action: 'draft-white-paper' }
      ]
    };
    this.messages.push(assistantMessage);
    
    this.userInput = '';
    this.resetComposerHeight();
    this.saveCurrentSession();
    this.triggerScrollToBottom();
  }

  onActionButtonClick(action: string): void {
    // Handle action button clicks (e.g., content type selection)
    switch (action) {
      case 'draft-article':
      case 'draft-blog':
      case 'draft-executive-brief':
      case 'draft-white-paper':
        this.handleDraftContentTypeSelection(action);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  handleDraftContentTypeSelection(action: string): void {
    // Map action to content type
    const contentTypeMap: { [key: string]: string } = {
      'draft-article': 'Article',
      'draft-blog': 'Blog',
      'draft-executive-brief': 'Executive Brief',
      'draft-white-paper': 'White Paper'
    };

    const contentType = contentTypeMap[action];
    
    // Add user message showing selection
    const userMessage: Message = {
      role: 'user',
      content: contentType,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    // Open the draft content flow with the selected content type and pending topic
    console.log('[ChatComponent] Opening flow with contentType:', contentType, 'topic:', this.pendingDraftTopic);
    this.tlFlowService.openFlow('draft-content', contentType, this.pendingDraftTopic || undefined);
    
    // Clear the pending topic after using it
    this.pendingDraftTopic = null;
    
    this.saveCurrentSession();
    this.triggerScrollToBottom();
  }

  startGuidedJourney(): void {
    // Guided Journey shows the form first, then goes to chat after submission
    this.showDraftForm = true;
    this.selectedPPTOperation = 'draft'; // Default to draft operation
    this.selectedTLOperation = 'generate'; // Default to generate operation
  }

  selectAction(action: string): void {
    if (this.selectedFlow === 'ppt') {
      this.selectedPPTOperation = action;
    } else {
      this.selectedTLOperation = action;
    }
    this.showDraftForm = true;
  }

  getFormTitle(): string {
    if (this.selectedFlow === 'ppt') {
      switch (this.selectedPPTOperation) {
        case 'draft': return 'Digital Document Development Center';
        case 'improve': return 'Improve Existing Presentation';
        case 'sanitize': return 'Sanitize Presentation';
        default: return 'Document Development Operations';
      }
    } else {
      switch (this.selectedTLOperation) {
        case 'generate': return 'Generate Thought Leadership Article';
        case 'research': return 'Research Additional Insights';
        case 'editorial': return 'Editorial Support';
        case 'improve': return 'Improve Document';
        case 'translate': return 'Translate Document Format';
        default: return 'Thought Leadership Operations';
      }
    }
  }

  downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
  downloadPodcastFromBlob(message: Message): void {
    if (message.thoughtLeadership?.contentType === 'podcast' && message.thoughtLeadership.podcastAudioUrl && message.thoughtLeadership.podcastFilename) {
      const link = document.createElement('a');
      link.href = message.thoughtLeadership.podcastAudioUrl;
      link.download = message.thoughtLeadership.podcastFilename;
      link.click();
    }
  }
 
  previewFile(url: string): void {
    // For PPTX files, browsers will trigger download since they cannot preview natively
    // For true preview, we would need to convert PPTX to PDF or images on the backend
    window.open(url, '_blank');
  }
  
  getPromptKeys(): string[] {
    if (this.selectedFlow === 'ppt') {
      return ['draft', 'improve', 'sanitize'];
    } else {
      return ['generate', 'editorial'];
    }
  }
  
  onEnterPress(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    
    // Note: Step 2 now shows file upload component, so text input can be enabled
    // But we can still optionally prevent sending if needed
    
    if (!keyboardEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onComposerInput(event: Event): void {
    // Prevent input during awaiting_content state
    if (this.isAwaitingContent) {
      this.userInput = '';
      this.resetComposerHeight();
      return;
    }

    // Auto-expand textarea based on content
    const textarea = this.composerTextarea?.nativeElement;
    if (textarea) {
      // Reset height to auto to get the scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight (content height)
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px (~6 lines)
      textarea.style.height = `${newHeight}px`;
      
      // Update expanded state and overflow class
      this.isComposerExpanded = textarea.scrollHeight > 45; // Original max-height was 45px
      
      // Add/remove overflow class when content exceeds one line (min-height is 24px)
      const minHeight = 24;
      if (textarea.scrollHeight > minHeight) {
        textarea.classList.add('has-overflow');
      } else {
        textarea.classList.remove('has-overflow');
      }
    }
  }

  onComposerFocus(): void {
    // Optional: Expand on focus if already has content
    const textarea = this.composerTextarea?.nativeElement;
    if (textarea && this.userInput.length > 0) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
      this.isComposerExpanded = textarea.scrollHeight > 45;
      
      // Add overflow class if content exceeds one line
      const minHeight = 24;
      if (textarea.scrollHeight > minHeight) {
        textarea.classList.add('has-overflow');
      } else {
        textarea.classList.remove('has-overflow');
      }
    }
  }

  collapseComposer(): void {
    const textarea = this.composerTextarea?.nativeElement;
    if (textarea) {
      // Reset to default height
      textarea.style.height = 'auto';
      textarea.style.height = '24px'; // Match min-height
      textarea.classList.remove('has-overflow');
      this.isComposerExpanded = false;
    }
  }

  private resetComposerHeight(): void {
    const textarea = this.composerTextarea?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = '24px'; // Match min-height
      textarea.classList.remove('has-overflow');
      this.isComposerExpanded = false;
    }
  }

  private showStep2ErrorNotification(): void {
    // Show error message via the workflow service
    const errorMessage: Message = {
      role: 'assistant',
      content: '⚠️ **Please upload a document file** (Word, PDF, Text, or Markdown). Text input is disabled in this step - only file uploads are accepted.',
      timestamp: new Date(),
      editWorkflow: {
        step: 'awaiting_content',
        showCancelButton: false,
        showSimpleCancelButton: true
      }
    };
    this.messages.push(errorMessage);
    this.saveCurrentSession();
    this.triggerScrollToBottom();
  }

  submitResearchForm(): void {
    if (!this.researchData.query.trim() || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showGuidedDialog = false;

    const validLinks = this.researchData.links.filter(link => link.trim().length > 0);
    const userMessage: Message = {
      role: 'user',
      content: `Research Assistant: ${this.researchData.query}\n${this.researchFiles.length > 0 ? 'Files: ' + this.researchFiles.map(f => f.name).join(', ') + '\n' : ''}${validLinks.length > 0 ? 'Links: ' + validLinks.join(', ') + '\n' : ''}${this.researchData.focus_areas ? 'Focus Areas: ' + this.researchData.focus_areas + '\n' : ''}${this.researchData.additional_context ? 'Additional Context: ' + this.researchData.additional_context : ''}`,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actionInProgress: 'Analyzing materials and researching...'
    };
    this.messages.push(assistantMessage);
    this.saveCurrentSession();

    this.chatService.streamResearchWithMaterials(
      this.researchFiles.length > 0 ? this.researchFiles : null,
      validLinks.length > 0 ? validLinks : null,
      this.researchData.query,
      this.researchData.focus_areas ? this.researchData.focus_areas.split(',').map(a => a.trim()) : [],
      this.researchData.additional_context
    ).subscribe({
      next: (data) => {
        if (data.type === 'progress') {
          assistantMessage.actionInProgress = data.message;
          this.saveCurrentSession();
        } else if (data.type === 'content') {
          assistantMessage.content += data.content;
          this.saveCurrentSession();
        } else if (data.type === 'sources') {
          // Store source metadata for rendering clickable citations
          assistantMessage.sources = data.sources;
          this.saveCurrentSession();
        } else if (data.type === 'complete') {
          assistantMessage.actionInProgress = undefined;
          this.isLoading = false;
          this.saveCurrentSession();
          this.resetResearchForm();
        } else if (data.type === 'error') {
          assistantMessage.content = `❌ Error: ${data.message}`;
          assistantMessage.actionInProgress = undefined;
          this.isLoading = false;
          this.saveCurrentSession();
        }
      },
      error: (error) => {
        console.error('Error:', error);
        assistantMessage.actionInProgress = undefined;
        assistantMessage.content = 'Sorry, I encountered an error while researching. Please try again.';
        this.isLoading = false;
        this.saveCurrentSession();
      },
      complete: () => {
        assistantMessage.actionInProgress = undefined;
        this.isLoading = false;
        this.saveCurrentSession();
      }
    });
  }

  submitArticleForm(): void {
    if (!this.articleData.topic.trim() || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showGuidedDialog = false;

    const userMessage: Message = {
      role: 'user',
      content: `Draft Article: ${this.articleData.topic}\nType: ${this.articleData.content_type}\nLength: ${this.articleData.desired_length} words\nTone: ${this.articleData.tone}${this.articleData.outline_text ? '\nOutline: ' + this.articleData.outline_text : ''}${this.outlineFile ? '\nOutline File: ' + this.outlineFile.name : ''}${this.supportingDocFiles.length > 0 ? '\nSupporting Documents: ' + this.supportingDocFiles.map(f => f.name).join(', ') : ''}${this.articleData.additional_context ? '\nAdditional Context: ' + this.articleData.additional_context : ''}`,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actionInProgress: 'Drafting article...'
    };
    this.messages.push(assistantMessage);

    this.chatService.draftArticle(this.articleData, this.outlineFile || undefined, this.supportingDocFiles.length > 0 ? this.supportingDocFiles : undefined).subscribe({
      next: (content: string) => {
        assistantMessage.content += content;
      },
      error: (error) => {
        console.error('Error:', error);
        assistantMessage.actionInProgress = undefined;
        assistantMessage.content = 'Sorry, I encountered an error while drafting the article. Please try again.';
        this.isLoading = false;
      },
      complete: () => {
        assistantMessage.actionInProgress = undefined;
        assistantMessage.downloadUrl = 'generated';
        this.isLoading = false;
        this.saveCurrentSession();
        this.resetArticleForm();
      }
    });
  }

  submitBestPracticesForm(): void {
    if (!this.bestPracticesPPTFile || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showGuidedDialog = false;

    const selectedCategories = Object.keys(this.bestPracticesData.categories)
      .filter(key => this.bestPracticesData.categories[key as keyof typeof this.bestPracticesData.categories]);

    const userMessage: Message = {
      role: 'user',
      content: `Validate Best Practices: ${this.bestPracticesPPTFile.name}\nCategories: ${selectedCategories.join(', ')}`,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actionInProgress: 'Analyzing presentation against best practices...'
    };
    this.messages.push(assistantMessage);

    this.chatService.streamBestPractices(this.bestPracticesPPTFile, selectedCategories).subscribe({
      next: (content: string) => {
        assistantMessage.content += content;
      },
      error: (error) => {
        console.error('Error:', error);
        assistantMessage.actionInProgress = undefined;
        assistantMessage.content = 'Sorry, I encountered an error while validating best practices. Please try again.';
        this.isLoading = false;
      },
      complete: () => {
        assistantMessage.actionInProgress = undefined;
        this.isLoading = false;
        this.saveCurrentSession();
        this.resetBestPracticesForm();
      }
    });
  }

  onOutlineFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.outlineFile = file;
    }
  }

  onSupportingDocsSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.supportingDocFiles = files;
  }

  onBestPracticesFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.pptx')) {
      this.bestPracticesPPTFile = file;
    }
  }

  resetResearchForm(): void {
    this.researchData = {
      query: '',
      focus_areas: '',
      additional_context: '',
      links: ['']
    };
    this.researchFiles = [];
  }
  
  onResearchFilesSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.researchFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.txt') || name.endsWith('.md');
    });
  }
  
  addResearchLink(): void {
    this.researchData.links.push('');
  }
  
  removeResearchLink(index: number): void {
    if (this.researchData.links.length > 1) {
      this.researchData.links.splice(index, 1);
    }
  }

  resetArticleForm(): void {
    this.articleData = {
      topic: '',
      content_type: 'Article',
      desired_length: 1000,
      tone: 'Professional',
      outline_text: '',
      additional_context: ''
    };
    this.outlineFile = null;
    this.supportingDocFiles = [];
  }

  resetBestPracticesForm(): void {
    this.bestPracticesData = {
      categories: {
        structure: true,
        visuals: true,
        design: true,
        charts: true,
        formatting: true,
        content: true
      }
    };
    this.bestPracticesPPTFile = null;
  }

  submitPodcastForm(): void {
    if ((this.podcastFiles.length === 0 && !this.podcastData.contentText.trim()) || this.isLoading) {
      return;
    }

    this.isLoading = true;

    const userMessage: Message = {
      role: 'user',
      content: `Generate Podcast (${this.podcastData.podcastStyle === 'dialogue' ? 'Dialogue' : 'Monologue'})\n\nFiles: ${this.podcastFiles.map(f => f.name).join(', ') || 'None'}\nContent: ${this.podcastData.contentText ? 'Provided' : 'None'}\nCustomization: ${this.podcastData.customization || 'None'}`,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      actionInProgress: 'Generating podcast...'
    };
    this.messages.push(assistantMessage);
    this.saveCurrentSession();
    
    // Close the guided dialog
    this.showGuidedDialog = false;

    let scriptContent = '';
    let audioBase64 = '';

    this.chatService.generatePodcast(
      this.podcastFiles.length > 0 ? this.podcastFiles : null,
      this.podcastData.contentText || null,
      this.podcastData.customization || null,
      this.podcastData.podcastStyle || 'dialogue'
    ).subscribe({
      next: (data) => {
        if (data.type === 'progress') {
          assistantMessage.actionInProgress = data.message;
          this.saveCurrentSession();
        } else if (data.type === 'script') {
          scriptContent = data.content;
          assistantMessage.content = `📻 **Podcast Generated Successfully!**\n\n**Script:**\n\n${scriptContent}\n\n`;
          this.saveCurrentSession();
        } else if (data.type === 'complete') {
          audioBase64 = data.audio;
          assistantMessage.content += `\n🎧 **Audio Ready!** Listen to your podcast below or download it as an MP3 file.\n\n`;
          
          // Convert base64 to blob and create download URL
          console.log('Audio base64 length:', audioBase64.length);
          const audioBlob = this.base64ToBlob(audioBase64, 'audio/mpeg');
          console.log('Audio blob size:', audioBlob.size, 'bytes');
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log('Audio URL created:', audioUrl);
          
          assistantMessage.downloadUrl = audioUrl;
          assistantMessage.downloadFilename = 'podcast.mp3';
          
          assistantMessage.actionInProgress = undefined;
          this.isLoading = false;
          this.saveCurrentSession();
          this.resetPodcastForm();
        } else if (data.type === 'error') {
          assistantMessage.content = `❌ Error generating podcast: ${data.message}`;
          assistantMessage.actionInProgress = undefined;
          this.isLoading = false;
          this.saveCurrentSession();
        }
      },
      error: (error) => {
        console.error('Error generating podcast:', error);
        assistantMessage.content = `❌ Error generating podcast: ${error.message || 'Unknown error occurred'}`;
        assistantMessage.actionInProgress = undefined;
        this.isLoading = false;
        this.saveCurrentSession();
        this.resetPodcastForm();
      }
    });
  }

  onPodcastFilesSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.podcastFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.txt') || name.endsWith('.md');
    });
  }

  resetPodcastForm(): void {
    this.podcastData = {
      contentText: '',
      customization: '',
      podcastStyle: 'dialogue'
    };
    this.podcastFiles = [];
  }

  private base64ToBlob(base64: string, contentType: string = ''): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  // Voice input methods
  startVoiceInput(): void {
    setTimeout(() => {
      this.voiceInput?.startListening();
    }, 100);
  }

  onVoiceTranscriptChange(transcript: string): void {
    this.userInput = transcript;
    // Force change detection since transcript updates come from browser API callbacks
    // outside Angular's zone, preventing automatic view updates
    this.cdr.detectChanges();
  }

  onVoiceListeningChange(isListening: boolean): void {
    // Optional: Handle listening state changes if needed
  }

  onRefinedContentGenerated(content: string): void {
    // Populate the chat input textarea with the refined content
    this.userInput = content;
    console.log('[ChatComponent] Refined content populated in chat input');
  }

  // onRefineContentStreamToChat(event: {userMessage: string, streamObservable: any}): void {
  //   // Add user message
  //   const userMessage: Message = {
  //     role: 'user',
  //     content: event.userMessage,
  //     timestamp: new Date()
  //   };
  //   this.messages.push(userMessage);
  //   this.triggerScrollToBottom();

  //   // Create assistant message for streaming
  //   const assistantMessage: Message = {
  //     role: 'assistant',
  //     content: '',
  //     timestamp: new Date(),
  //     isStreaming: true
  //   };
  //   this.messages.push(assistantMessage);
  //   this.triggerScrollToBottom();

  //   this.isLoading = true;

  //   // Subscribe to the stream
  //   event.streamObservable.subscribe({
  //     next: (chunk: string) => {
  //       assistantMessage.content += chunk;
  //       this.triggerScrollToBottom();
  //     },
  //     error: (error: any) => {
  //       console.error('Error streaming refine content:', error);
  //       assistantMessage.content = 'Sorry, I encountered an error while refining content. Please try again.';
  //       assistantMessage.isStreaming = false;
  //       this.isLoading = false;
  //       this.triggerScrollToBottom();
  //     },
  //     complete: () => {
  //       assistantMessage.isStreaming = false;
  //       this.isLoading = false;
  //       this.saveCurrentSession();
  //       this.triggerScrollToBottom();
  //     }
  //   });
  // }
    onRefineContentStreamToChat(event: {userMessage: string, streamObservable: any, fileName?: string}): void {
      // Add user message
      const userMessage: Message = {
        role: 'user',
        content: event.userMessage,
        timestamp: new Date()
      };
      this.messages.push(userMessage);
      this.triggerScrollToBottom();

      // Create assistant message for streaming
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      };
      this.messages.push(assistantMessage);
      this.triggerScrollToBottom();

      this.isLoading = true;

      // Subscribe to the stream
      event.streamObservable.subscribe({
        next: (chunk: any) => {
          if (chunk.type === 'content') {
            assistantMessage.content += chunk.content;
            this.triggerScrollToBottom();
          }
        },
        error: (error: any) => {
          console.error('Error streaming refine content:', error);
          assistantMessage.content = 'Sorry, I encountered an error while refining content. Please try again.';
          assistantMessage.isStreaming = false;
          this.isLoading = false;
          this.triggerScrollToBottom();
        },
        complete: () => {
          assistantMessage.isStreaming = false;
          this.isLoading = false;
          
          // Add thoughtLeadership metadata with showActions flag to enable Canvas, Copy, and Export buttons
          if (assistantMessage.content && assistantMessage.content.trim()) {
            const metadata: ThoughtLeadershipMetadata = {
              contentType: 'article',
              topic: event.fileName || 'Refined Content',
              fullContent: assistantMessage.content,
              showActions: true
            };
            assistantMessage.thoughtLeadership = metadata;
            console.log('[ChatComponent] Added TL metadata to refined content:', metadata);
          }
          
          this.saveCurrentSession();
          this.triggerScrollToBottom();
        }
      });
    }

  /**
   * Format simple text for display (convert newlines to <br> tags)
   * Used for messages that are not already HTML formatted
   */
  formatSimpleText(text: string): string {
    if (!text) return '';
    // Escape HTML first to prevent XSS, then convert newlines to <br>
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  /**
   * Get formatted content for display
   * If message is HTML, return as-is. Otherwise, format as simple text.
   */
  getFormattedContent(message: Message): string | SafeHtml {
      if (message.isHtml) {
        return this.sanitizer.bypassSecurityTrustHtml(message.content);
      }
      
      // For assistant messages, render as markdown
      if (message.role === 'assistant') {
        let html = marked.parse(message.content) as string;

        // Fix bullet list formatting: add proper indentation and remove spacing between items
        html = html.replace(/<ul>\n?/g, '<ul style="padding-left: 1.5rem; margin: 0.5rem 0;">');
        html = html.replace(/<ol>\n?/g, '<ol style="padding-left: 1.5rem; margin: 0.5rem 0;">');
        html = html.replace(/<li>/g, '<li style="margin: 0; padding: 0; line-height: 1.4;">');
        html = html.replace(/<\/li>\n?/g, '</li>');

        // Ensure links open in a new tab and use noopener for security.
        // We add target and rel only when they are not already present.
        // console.log("Reached HTML Part");
        html = html.replace(/<a\s+([^>]*?)href=(["'])(.*?)\2([^>]*)>/gi, (match: string, pre: string, quote: string, url: string, post: string) => {
          const attrs = (pre + ' ' + post).toLowerCase();
          if (/\btarget\s*=/.test(attrs) || /\brel\s*=/.test(attrs)) {
            return match; // already has target or rel
          }
          // Preserve existing attributes order, append target and rel
          return `<a ${pre}href=${quote}${url}${quote}${post} target="_blank" rel="noopener noreferrer">`;
        });

        // IMPORTANT: Return plain HTML string instead of SafeHtml
        // Angular's [innerHTML] binding will sanitize it, but will preserve target="_blank"
        // bypassSecurityTrustHtml was actually causing Angular to strip the attributes!
        // console.log('[ChatComponent] Returning markdown HTML with target="_blank" links');
        
        // Debug: Check if links have target="_blank"
        const linkMatches = html.match(/<a[^>]*>/gi);
        if (linkMatches && linkMatches.length > 0) {
          //console.log('[ChatComponent] Links in HTML:', linkMatches.length);
          //console.log('[ChatComponent] First link:', linkMatches[0]);
          const hasTargetBlank = linkMatches[0].includes('target="_blank"');
          //console.log('[ChatComponent] Has target="_blank":', hasTargetBlank);
        }
        
        return html;
      }
      
      // For user messages, strip out extracted document text for display (keep for API context)
      let displayContent = message.content;
      
      // Remove all "Extracted Text From Document (filename):" sections if present
      // This regex matches both single and multiple document patterns
      const extractedTextPattern = /\n\nExtracted Text From Document[^:]*:\n[\s\S]*$/;
      if (extractedTextPattern.test(displayContent)) {
        displayContent = displayContent.replace(extractedTextPattern, '');
      }
      
      return this.formatSimpleText(displayContent);
    }
  // getFormattedContent(message: Message): string | SafeHtml {
  //   if (message.isHtml) {
  //     // Use DomSanitizer to bypass security for trusted HTML (allows buttons and interactive elements)
  //     return this.sanitizer.bypassSecurityTrustHtml(message.content);
  //   }
  //   if (message.role === 'assistant' && message.sources) {
  //     // Use source citation pipe logic inline
  //     return this.formatSimpleText(message.content);
  //   }
  //   return this.formatSimpleText(message.content);
  // }
  // onRefineContentStreamToChat(event: {userMessage: string, streamObservable: any}): void {
  //   // Add user message to chat
  //   const userMessage: Message = {
  //     role: 'user',
  //     content: event.userMessage,
  //     timestamp: new Date()
  //   };
  //   this.messages.push(userMessage);

  //   // Create assistant message for streaming
  //   const assistantMessage: Message = {
  //     role: 'assistant',
  //     content: '',
  //     timestamp: new Date(),
  //     isStreaming: true
  //   };
  //   this.messages.push(assistantMessage);

  //   // Set loading state
  //   this.isLoading = true;
  //   this.triggerScrollToBottom();

  //   // Subscribe to stream and update assistant message
  //   event.streamObservable.subscribe({
  //     next: (data: any) => {
  //       if (typeof data === 'string') {
  //         assistantMessage.content += data;
  //       } else if (data.type === 'content' && data.content) {
  //         assistantMessage.content += data.content;
  //       }
  //       this.triggerScrollToBottom();
  //     },
  //     error: (error: Error) => {
  //       console.error('[ChatComponent] Refine content stream error:', error);
  //       assistantMessage.isStreaming = false;
  //       assistantMessage.content = 'I apologize, but I encountered an error refining your content. Please try again.';
  //       this.isLoading = false;
  //       this.triggerScrollToBottom();
  //     },
  //     complete: () => {
  //       console.log('[ChatComponent] Refine content stream complete');
  //       assistantMessage.isStreaming = false;
  //       this.isLoading = false;
  //       this.saveCurrentSession();
  //       this.triggerScrollToBottom();
  //     }
  //   });
  // }

  /**
   * Close the quick draft dialog
   */
  closeQuickDraftDialog(): void {
    this.showQuickDraftDialog = false;
    this.quickDraftTopic = '';
    this.quickDraftContentType = '';
  }

  /**
   * Handle quick draft dialog submission
   * NOTE: This is deprecated - now using conversational flow instead
   */
  async onQuickDraftSubmit(inputs: QuickDraftInputs): Promise<void> {
    console.log('[ChatComponent] Quick draft submitted (deprecated):', inputs);
    
    // Close the dialog
    this.closeQuickDraftDialog();

    // Start conversational flow instead
    this.draftWorkflowService.startQuickDraftConversation(
      this.quickDraftTopic,
      this.quickDraftContentType
    );
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
   * Show upload button during draft workflow when collecting outline/supporting docs
   * Only show on the most recent message to avoid duplication on earlier messages
   */
  isDraftWorkflowFileUploadVisible(message?: Message): boolean {
    const step = this.draftWorkflowService.currentState.step;
    const shouldShow = step === 'awaiting_outline_doc' || step === 'awaiting_supporting_doc';
    
    // If message provided, only show on the most recent assistant message
    if (message && shouldShow && this.messages.length > 0) {
      const lastAssistantMsg = [...this.messages].reverse().find(m => m.role === 'assistant');
      return lastAssistantMsg === message;
    }
    
    return shouldShow;
  }

  /**
   * Handle file selection from the draft upload button
   */
  onDraftUploadSelected(files: FileList | null): void {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.onWorkflowFileSelected(file);
  }

  /**
   * Analyze user response to draft satisfaction question
   * Returns: { isPositive: boolean, hasImprovementRequest: boolean, improvementText: string }
  /**
   * Analyze user response to draft satisfaction question using LLM
   * Returns: { isPositive: boolean, hasImprovementRequest: boolean, improvementText: string }
   */
  private async analyzeDraftSatisfactionWithLLM(
    input: string,
    draftContext: any
  ): Promise<{ isPositive: boolean, hasImprovementRequest: boolean, improvementText: string, confidence?: number }> {
    try {
      // Call backend endpoint to analyze satisfaction
      const response = await this.chatService.analyzeSatisfaction({
        user_input: input,
        generated_content: draftContext.generatedContent || '',
        content_type: draftContext.contentType,
        topic: draftContext.topic
      }).toPromise();
      
      // Check if response exists
      if (!response) {
        console.error('[ChatComponent] LLM Response is null, using keyword fallback');
        return this.analyzeDraftSatisfactionResponseKeywordFallback(input);
      }
      
      // If confidence is high enough, trust the LLM (> 0.6)
      if (response.confidence > 0.6) {
        return {
          isPositive: response.is_satisfied,
          hasImprovementRequest: !response.is_satisfied,
          improvementText: input,
          confidence: response.confidence
        };
      }
      
      // If confidence is in middle range (0.3-0.6), show clarification request
      if (response.confidence >= 0.3 && response.confidence <= 0.6) {
        const clarification: Message = {
          role: 'assistant',
          content: `I want to make sure I understand correctly. You said: "${input}"\n\nAre you satisfied with the content and ready to use it, or would you like me to make improvements?`,
          timestamp: new Date()
        };
        this.messages.push(clarification);
        this.triggerScrollToBottom();
        // Return false to indicate we're still waiting for clarity
        return { isPositive: false, hasImprovementRequest: false, improvementText: '' };
      }
      
      // Very low confidence - treat as improvement request to be safe
      return {
        isPositive: false,
        hasImprovementRequest: true,
        improvementText: input,
        confidence: response.confidence
      };
      
    } catch (error) {
      console.error('[ChatComponent] Error calling LLM satisfaction endpoint:', (error as any)?.message);
      const result = this.analyzeDraftSatisfactionResponseKeywordFallback(input);
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
      return {
        isPositive: false,
        hasImprovementRequest: true,
        improvementText: input
      };
    }
    
    // If has explicit satisfaction keyword and no negative, it's satisfied
    if (hasSatisfactionKeyword && !hasNegative) {
      return {
        isPositive: true,
        hasImprovementRequest: false,
        improvementText: ''
      };
    }
    
    // If has negative indicator, it's an improvement request
    if (hasNegative) {
      return {
        isPositive: false,
        hasImprovementRequest: true,
        improvementText: input
      };
    }
    
    // Ambiguous responses - treat as improvement request to be safe
    return {
      isPositive: false,
      hasImprovementRequest: true,
      improvementText: input
    };
  }

  // Export dropdown methods
  toggleExportDropdown(messageIndex: number): void {
    // Close all other export dropdowns
    Object.keys(this.showExportDropdown).forEach(key => {
      if (parseInt(key) !== messageIndex) {
        this.showExportDropdown[parseInt(key)] = false;
      }
    });
    this.showExportDropdown[messageIndex] = !this.showExportDropdown[messageIndex];
  }

  exportSelected(messageIndex: number, format: 'word' | 'pdf' | 'ppt'): void {
    this.showExportDropdown[messageIndex] = false;
    this.isExporting[messageIndex] = true;
    this.isExported[messageIndex] = false;
    this.exportFormat[messageIndex] = format.toUpperCase();

    const message = this.messages[messageIndex];
    if (!message || !message.content) {
      this.toastService.error('Content is not available.');
      this.isExporting[messageIndex] = false;
      return;
    }

    if (format === 'word') {
      this.downloadWord(messageIndex, message);
    } else if (format === 'pdf') {
      console.log("PDF Dwonload here");
      this.downloadPDF(messageIndex, message);
    } else if (format === 'ppt') {
      this.downloadPPT(messageIndex, message);
    }
  }

  private downloadWord(messageIndex: number, message: Message): void {
    const metadata = this.getTLMetadata(message);
    const contentType = metadata?.contentType;
    
    // Check if this is edit content first (same logic as tl-action-buttons)
    if (contentType === 'edit-content') {
      this.exportEditContentWord(messageIndex, message, metadata);
      return;
    }
    
    // Use the same logic as tl-action-buttons
    if (contentType === 'conduct-research') {
      this.exportWordNewLogic(messageIndex, message, metadata);
    } else if (contentType === 'socialMedia') {
      this.exportUIWord(messageIndex, message, metadata);
    } else {
      this.exportDocument(messageIndex, message, metadata, '/api/v1/export/word', 'docx');
    }
  }

  private downloadPDF(messageIndex: number, message: Message): void {
    const metadata = this.getTLMetadata(message);
    const contentType = String(metadata?.contentType || '');
    
    // Check if this is edit content first (same logic as tl-action-buttons)
    if (contentType === 'edit-content') {
      this.exportEditContentPDF(messageIndex, message, metadata);
      return;
    }
    
    // Consider message as 'market module' when contentType is conduct-research or selectedFlow is market-intelligence
    const isMarketModule = contentType === 'conduct-research' || this.selectedFlow === 'market-intelligence';
    console.log("Export pdf 1 ", contentType);
    console.log("Is Market Module: ", isMarketModule);
    const endpoint = isMarketModule
      ? '/api/v1/export/pdf-pwc-bullets'
      : '/api/v1/export/pdf-pwc';
    
    this.exportDocument(messageIndex, message, metadata, endpoint, 'pdf');
  }

  private downloadPPT(messageIndex: number, message: Message): void {
    const metadata = this.getTLMetadata(message);
    this.exportPPT(messageIndex, message, metadata, '/api/v1/export/ppt');
  }

  private exportWordNewLogic(messageIndex: number, message: Message, metadata: any): void {
    const content = metadata?.fullContent || message.content;
    if (!content || !content.trim()) {
      this.toastService.error('Content is not available yet.');
      this.isExporting[messageIndex] = false;
      return;
    }

    const plainText = content.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    const title = metadata?.topic?.trim() || 'Generated Document';

    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    const endpoint = `${apiUrl}/api/v1/export/word-standalone`;

    this.authFetchService.authenticatedFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        content: plainText,
        title,
        content_type: metadata?.contentType
      })
    })
    .then(response => {
      if (!response.ok) throw new Error('Failed to generate Word document');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.sanitizeFilename(title)}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);
      this.resetExportState(messageIndex);
    })
    .catch(err => {
      console.error('New Word export error:', err);
      this.toastService.error('Failed to generate Word document. Please try again.');
      this.isExporting[messageIndex] = false;
    });
  }

  private exportUIWord(messageIndex: number, message: Message, metadata: any): void {
    const content = metadata?.fullContent || message.content;
    if (!content || !content.trim()) {
      this.toastService.error('Content is not available yet.');
      this.isExporting[messageIndex] = false;
      return;
    }

    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    const endpoint = `${apiUrl}/api/v1/export/word-ui`;
    const title = metadata?.topic?.trim() || 'Generated Document';

    this.authFetchService.authenticatedFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        content: content,
        title
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to generate Word document');
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.sanitizeFilename(title)}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);
      this.resetExportState(messageIndex);
    })
    .catch(error => {
      console.error('UI Word export failed:', error);
      this.toastService.error('Failed to generate Word file.');
      this.isExporting[messageIndex] = false;
    });
  }

  /**
   * Get block types using the same logic as final article generation
   * This ensures consistency between display and export
   * Replicates backend logic: only non-empty paragraphs, sequential indices
   */
  private getBlockTypesForExport(metadata: any, content: string): { content: string; blockTypes: BlockTypeInfo[] } {
    // Get plain text content (strip HTML if present)
    let plainTextContent = content;
    if (plainTextContent.includes('<') && plainTextContent.includes('>')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = plainTextContent;
      plainTextContent = tempDiv.textContent || tempDiv.innerText || plainTextContent;
      plainTextContent = plainTextContent.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    
    // Normalize content: same as backend split_blocks() - normalize newlines, remove excessive whitespace
    plainTextContent = plainTextContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    plainTextContent = plainTextContent.replace(/\n{3,}/g, '\n\n');
    plainTextContent = plainTextContent.trim();
    
    // PRIORITY 1: Use paragraphEdits directly (same format as final article generation)
    // Use the exact same format: {index, block_type, level} from paragraphEdits
    const paragraphEdits = metadata?.paragraphEdits;
    if (Array.isArray(paragraphEdits) && paragraphEdits.length > 0) {
      // Split content the same way backend does (matches split_blocks())
      const contentBlocks = plainTextContent.split(/\n\n+/).filter(b => b.trim());
      
      // Create map from paragraphEdits using same format as final article generation
      // Format: {index, block_type, level} - same as chat-edit-workflow.service.ts (1941-1947)
      const blockTypesMap = new Map<number, {type: string, level: number}>();
      paragraphEdits.forEach((edit: any) => {
        if (edit.index !== undefined && edit.index !== null) {
          // Use same format: block_type || 'paragraph', level || 0
          blockTypesMap.set(edit.index, {
            type: edit.block_type || 'paragraph',  // Same as: p.block_type || 'paragraph'
            level: edit.level || 0  // Same as: p.level || 0
          });
        }
      });
      
      // Generate blockTypes with sequential indices matching content blocks
      // Backend creates sequential indices (0, 1, 2, ...) as it builds final_article
      const generatedBlockTypes = contentBlocks.map((block: string, idx: number) => {
        // Try to find matching block_type by index
        let matchedType = blockTypesMap.get(idx);
        if (!matchedType) {
          // Try nearby indices (for minor misalignments)
          matchedType = blockTypesMap.get(idx - 1) || blockTypesMap.get(idx + 1);
        }
        
        return {
          index: idx,  // Sequential index (same as backend: len(final_paragraphs))
          type: matchedType?.type || 'paragraph',
          level: matchedType?.level || 0
        } as BlockTypeInfo;
      });
      
      console.log('[Chat Export] Generated blockTypes from paragraphEdits (same format as final article):', generatedBlockTypes);
      return { content: plainTextContent, blockTypes: generatedBlockTypes };
    }
    
    // PRIORITY 2: Use blockTypes from metadata (stored during final article generation)
    let blockTypes = metadata?.block_types;
    
    // If blockTypes exist, verify alignment with content
    if (blockTypes && Array.isArray(blockTypes) && blockTypes.length > 0) {
      // Split content the same way backend does (matches split_blocks())
      const contentBlocks = plainTextContent.split(/\n\n+/).filter(b => b.trim());
      
      // If counts match, blockTypes are correctly aligned (from backend final article generation)
      if (blockTypes.length === contentBlocks.length) {
        // Ensure indices are sequential (0, 1, 2, ...) - backend creates them this way
        const normalizedBlockTypes = contentBlocks.map((block: string, idx: number) => {
          const originalBt = blockTypes.find((bt: any) => bt.index === idx) || blockTypes[idx];
          return {
            index: idx,  // Sequential index matching content block position
            type: originalBt?.type || 'paragraph',
            level: originalBt?.level || 0
          } as BlockTypeInfo;
        });
        
        console.log('[Chat Export] Using blockTypes from metadata (aligned):', normalizedBlockTypes);
        return { content: plainTextContent, blockTypes: normalizedBlockTypes };
      } else {
        console.warn(`[Chat Export] BlockTypes count (${blockTypes.length}) doesn't match content blocks (${contentBlocks.length}), using fallback...`);
      }
    }
    
    // FALLBACK: Regenerate from paragraphEdits with simpler logic
    if (Array.isArray(paragraphEdits) && paragraphEdits.length > 0) {
      // Replicate backend logic: only include non-empty paragraphs, sequential indices
      const contentBlocks = plainTextContent.split(/\n\n+/).filter(b => b.trim());
      
      // Create map from paragraphEdits (preserve original block_type info)
      const blockTypesMap = new Map<number, {type: string, level: number}>();
      paragraphEdits.forEach((edit: any) => {
        if (edit.index !== undefined && edit.index !== null) {
          blockTypesMap.set(edit.index, {
            type: edit.block_type || 'paragraph',
            level: edit.level || 0
          });
        }
      });
      
      // Generate blockTypes with sequential indices matching content blocks (same as backend)
      // Backend: block_types.append({"index": len(final_paragraphs), "type": edit.get("block_type", "paragraph"), "level": edit.get("level", 0)})
      const generatedBlockTypes = contentBlocks.map((block: string, idx: number) => {
        // Try to find matching block_type by checking nearby indices
        let matchedType = blockTypesMap.get(idx);
        if (!matchedType) {
          // Try nearby indices (for minor misalignments)
          matchedType = blockTypesMap.get(idx - 1) || blockTypesMap.get(idx + 1);
        }
        
        return {
          index: idx,  // Sequential index matching content block position (same as backend)
          type: matchedType?.type || 'paragraph',
          level: matchedType?.level || 0
        } as BlockTypeInfo;
      });
      
      console.log('[Chat Export] Regenerated blockTypes from paragraphEdits (same logic as backend):', generatedBlockTypes);
      return { content: plainTextContent, blockTypes: generatedBlockTypes };
    }
    
    // Last fallback: all paragraphs
    const contentBlocks = plainTextContent.split(/\n\n+/).filter(b => b.trim());
    const defaultBlockTypes = contentBlocks.map((_: string, idx: number) => ({ 
      index: idx, 
      type: 'paragraph', 
      level: 0 
    } as BlockTypeInfo));
    console.warn('[Chat Export] Using default blockTypes (all paragraph):', defaultBlockTypes);
    return { content: plainTextContent, blockTypes: defaultBlockTypes };
  }

  private exportEditContentWord(messageIndex: number, message: Message, metadata: any): void {
    const content = metadata?.fullContent || message.content;
    if (!content || !content.trim()) {
      alert('Content is not available yet.');
      this.isExporting[messageIndex] = false;
      return;
    }

    this.isExporting[messageIndex] = true;
    
    // Use same logic as final article generation
    const { content: normalizedContent, blockTypes } = this.getBlockTypesForExport(metadata, content);
    
    // Send plain text content + block_types to backend
    // Backend will format using its own functions (matches UI formatting)
    const title = extractDocumentTitle(normalizedContent, metadata?.topic);
    this.chatService.exportEditContentToWord({
      content: normalizedContent,  // Normalized plain text content
      title: title,
      block_types: blockTypes
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.sanitizeFilename(title)}.docx`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.resetExportState(messageIndex);
      },
      error: (error) => {
        console.error('Edit Content Word export error:', error);
        alert('Failed to generate Word document. Please try again.');
        this.isExporting[messageIndex] = false;
      }
    });
  }

  private exportEditContentPDF(messageIndex: number, message: Message, metadata: any): void {
    const content = metadata?.fullContent || message.content;
    if (!content || !content.trim()) {
      alert('Content is not available yet.');
      this.isExporting[messageIndex] = false;
      return;
    }

    this.isExporting[messageIndex] = true;
    
    // Use same logic as final article generation
    const { content: normalizedContent, blockTypes } = this.getBlockTypesForExport(metadata, content);
    
    // Send plain text content + block_types to backend
    // Backend will format using its own functions (matches UI formatting)
    const title = extractDocumentTitle(normalizedContent, metadata?.topic);
    this.chatService.exportEditContentToPDF({
      content: normalizedContent,  // Normalized plain text content
      title: title,
      block_types: blockTypes
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.sanitizeFilename(title)}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.resetExportState(messageIndex);
      },
      error: (error) => {
        console.error('Edit Content PDF export error:', error);
        alert('Failed to generate PDF document. Please try again.');
        this.isExporting[messageIndex] = false;
      }
    });
  }

  private exportPPT(messageIndex: number, message: Message, metadata: any, endpoint: string): void {
    const content = metadata?.fullContent || message.content;
    if (!content || !content.trim()) {
      this.toastService.error('Content is not available yet.');
      this.isExporting[messageIndex] = false;
      return;
    }

    const plainText = content.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    const title = metadata?.topic?.trim() || 'Generated Presentation';

    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    const fullEndpoint = `${apiUrl}${endpoint}`;

    this.authFetchService.authenticatedFetch(fullEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        content: plainText,
        title
      })
    })
    .then(response => {
      if (!response.ok) throw new Error("Failed to start PPT generation");
      return response.json();
    })
    .then(data => {
      console.log("PPT download URL:", data.download_url);

      const downloadUrl = data.download_url;
      if (!downloadUrl) throw new Error("No download URL returned");

      return fetch(downloadUrl, {
        method: "GET",
        headers: {
          "Accept": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        }
      });
    })
    .then(response => {
      if (!response.ok) throw new Error("Failed to retrieve PPT file");
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.sanitizeFilename(title)}.pptx`;
      a.click();
      window.URL.revokeObjectURL(url);
      this.resetExportState(messageIndex);
    })
    .catch(err => {
      console.error(err);
      this.toastService.error("Failed to generate PPT file.");
      this.isExporting[messageIndex] = false;
    });
  }

  private exportDocument(messageIndex: number, message: Message, metadata: any, endpoint: string, extension: string): void {
    const content = metadata?.fullContent || message.content;
    if (!content || !content.trim()) {
      this.toastService.error('Content is not available yet.');
      this.isExporting[messageIndex] = false;
      return;
    }

    const plainText = content.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    const lines = plainText.split('\n').filter((line: string) => line.trim());
    const subtitle = lines.length > 0 ? lines[0].substring(0, 150) : 'Generated Document';
    const title = subtitle;

    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    const fullEndpoint = `${apiUrl}${endpoint}`;

    this.authFetchService.authenticatedFetch(fullEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        content: plainText,
        title,
        subtitle: '',
        contentType: metadata?.contentType
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to generate ${extension.toUpperCase()} document`);
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.sanitizeFilename(title)}.${extension}`;
      link.click();
      window.URL.revokeObjectURL(url);
      this.resetExportState(messageIndex);
    })
    .catch(error => {
      console.error(`Error generating ${extension.toUpperCase()}:`, error);
      this.toastService.error(`Failed to generate ${extension.toUpperCase()} file. Please try again.`);
      this.isExporting[messageIndex] = false;
    });
  }

  private resetExportState(messageIndex: number): void {
    setTimeout(() => {
      this.isExporting[messageIndex] = false;
    }, 500);

    this.isExported[messageIndex] = true;
    setTimeout(() => {
      this.isExported[messageIndex] = false;
    }, 3000);
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }
}
