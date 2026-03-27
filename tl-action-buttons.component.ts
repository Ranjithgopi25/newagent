
import { Component, Input, ViewChild, ElementRef, HostListener, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { ThoughtLeadershipMetadata, Message } from '../../../../../core/models';
import { CanvasStateService } from '../../../../../core/services/canvas-state.service';
import { TlChatBridgeService } from '../../../../../core/services/tl-chat-bridge.service';
import { ChatService } from '../../../../../core/services/chat.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ChatEditWorkflowService } from '../../../../../core/services/chat-edit-workflow.service';
import { environment } from '../../../../../../environments/environment';
import { TlRequestFormComponent } from '../../../../phoenix/TL/request-form';
import { AuthFetchService } from '../../../../../core/services/auth-fetch.service';
import { TlFlowService } from '../../../../../core/services/tl-flow.service';
import { extractDocumentTitle } from '../../../../../core/utils/edit-content.utils';
import { formatFinalArticleWithBlockTypes} from '../../../../../core/utils/edit-content.utils';
import { BlockTypeInfo } from '../../../../../core/utils/edit-content.utils';
import { renderMarkdownForDisplay } from '../../../../../core/utils/edit-content.utils';

@Component({
    selector: 'app-tl-action-buttons',
    imports: [CommonModule, TlRequestFormComponent],
    templateUrl: './tl-action-buttons.component.html',
    styleUrls: ['./tl-action-buttons.component.scss']
})
export class TlActionButtonsComponent implements OnInit {
  @Input() metadata!: ThoughtLeadershipMetadata;
  @Input() messageId?: string;
  @Input() message?: Message;  // Optional: Full message for accessing paragraph_edits
  @Input() selectedFlow?: 'ppt' | 'thought-leadership' | 'market-intelligence';
  @ViewChild('exportButton') exportButton?: ElementRef<HTMLButtonElement>;
  
  isConvertingToPodcast = false;
  showExportDropdown = false;
  isCopied = false;
  isExporting = false;
  isExported = false;
  exportFormat = '';
  showRequestForm = false;
  translatedContent = '';
  isPreparingDocument = false;
  isDocumentPrepared = false;

  @Output() raisePhoenix = new EventEmitter<void>();
  @Output() exportRequested = new EventEmitter<{ format: 'word' | 'pdf' | 'ppt', component: any }>();
  @Output() copyRequested = new EventEmitter<{ content: string, component: any }>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const exportDropdown = target.closest('.export-dropdown');
    if (!exportDropdown && this.showExportDropdown) {
      this.showExportDropdown = false;
    }
  }

  constructor(
    private canvasStateService: CanvasStateService,
    private http: HttpClient,
    private tlChatBridge: TlChatBridgeService,
    private authFetchService: AuthFetchService,
    private chatService: ChatService,
    private toastService: ToastService,
    private editWorkflowService: ChatEditWorkflowService,
    private sanitizer: DomSanitizer,
    private tlFlowService: TlFlowService
  ) {}
  

  ngOnInit(): void {
    console.log('[TL Action Buttons] Component initialized with metadata:', {
      contentType: this.metadata?.contentType,
      hasPodcastUrl: !!this.metadata?.podcastAudioUrl,
      podcastUrl: this.metadata?.podcastAudioUrl?.substring(0, 80),
      showActions: this.metadata?.showActions,
      isPodcast: this.isPodcast
    });
  }
private exportWordNewLogic(): void {
  if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
    this.toastService.error('Content is not available yet.');
    return;
  }

  // Prepare content according to new logic
  const plainText = this.metadata.fullContent
    .replace(/<br>/g, '\n')
    .replace(/<[^>]+>/g, ''); // strip HTML

  const title = this.metadata.topic?.trim() || 'Generated Document';
  const filename = `${this.sanitizeFilename(title)}.docx`;

  const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
  const endpoint = `${apiUrl}/api/v1/export/word-standalone`; 

  this.authFetchService.authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      content: plainText,
      title,
      content_type: this.metadata.contentType
    })
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to generate Word document');
      return response.blob();
    })
    .then(blob => {
      return this.downloadBlobWithSaveDialog(blob, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    })
    .then(() => {
      this.resetExportState();
    })
    .catch(err => {
      // Log generic message without full error object to prevent information leakage
      console.error('[TL Action Buttons] Word document export failed');
      this.toastService.error('Failed to generate Word document. Please try again.');
      this.isExporting = false;
    });
}

  // private isEditContent(): boolean {
  //   // Check if this is edit content workflow
  //   // Edit content may have contentType 'edit-content' 
  //   return this.metadata?.contentType === 'edit-content';
  // }



  downloadWord(): void {
    // this.exportDocument('/api/v1/export/word', 'docx', 'docx');
    const isSocialModule = this.metadata?.contentType === 'socialMedia';
    const isEditContent = this.metadata?.contentType === 'edit-article';
    const isMarketModule = this.metadata?.contentType === 'conduct-research'; 
    const isindustryModule = this.metadata?.contentType === 'industry-insights';
    const isproposalModule = this.metadata?.contentType === 'proposal-inputs';
    const isprepMeetModule = this.metadata?.contentType === 'prep-meet';
    const isPovModule = this.metadata?.contentType === 'pov';
    const isDraftModule = this.metadata?.contentType === 'article' || 'blog' ||'executive_brief';
    const isrefineModule = this.metadata?.contentType === 'refine-content';
    console.log('[TL Action Buttons] downloadWord() called:', {
      contentType: this.metadata?.contentType,
      selectedFlow: this.selectedFlow,
      isSocialModule,
      isPovModule,isrefineModule,
      isMarketModule,
      timestamp: new Date().toISOString()
    });
    
    if (isEditContent) {
      this.exportEditContentWord();
    } else if (isSocialModule) {
      this.exportUIWord();  
    }
    else if (isindustryModule || isprepMeetModule || isproposalModule || isMarketModule || isrefineModule ){
       this.exportDocument('/api/v1/export/word-pwc-mi-module', 'docx', 'docx');
    }
    else if (isPovModule ) {
      this.exportDocument('/api/v1/export/word', 'docx', 'docx');
    }
    else if (isDraftModule){
      this.exportDocument('/api/v1/export/word', 'docx', 'docx'); 
    }
    else {
      console.log("Export word 2")
      this.exportDocument('/api/v1/export/word', 'docx', 'docx'); 
    }
  }

  /** Extract export title from markdown: prefer # Title (level-1), then ## heading, then first short non-list line. */
  private getEditContentExportTitleAndContent(): { content: string; title: string } {
    const content = this.metadata.fullContent || '';
    const lines = content.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    let title = '';
    let fallbackHeading = '';
    for (const line of lines) {
      const h1 = line.match(/^#\s+(.+)$/);
      if (h1 && h1[1]) {
        title = h1[1].replace(/\*\*/g, '').trim();
        break;
      }
      const hAny = line.match(/^#+\s+(.+)$/);
      if (hAny && hAny[1] && !fallbackHeading) {
        fallbackHeading = hAny[1].replace(/\*\*/g, '').trim();
      }
      if (!title && !/^#+\s/.test(line) && line.length < 120 && !/^[-*]\s/.test(line) && !/^\d+\.\s/.test(line)) {
        title = line.replace(/\*\*/g, '').trim();
        break;
      }
    }
    return { content, title: title || fallbackHeading || 'Revised Article' };
  }

  private async exportEditContentWord(): Promise<void> {
    if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
      alert('Content is not available yet.');
      return;
    }
    this.isExporting = true;
    try {
      const { content, title: exportTitle } = this.getEditContentExportTitleAndContent();
      const finalTitle = exportTitle;
      const filename = `${this.sanitizeFilename(finalTitle)}.docx`;
      this.chatService.exportEditContentToWord({
        content,
        title: exportTitle,
        block_types: [],
        content_type: this.metadata.contentType
      }).subscribe({
        next: (blob: Blob) => {
          this.downloadBlobWithSaveDialog(blob, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').then(() => {
            this.resetExportState();
          }).catch(err => {
            // Log generic message without full error object to prevent information leakage
            console.error('[TL Action Buttons] Download failed');
            this.isExporting = false;
          });
        },
        error: (error) => {
          // Log generic message without full error object to prevent information leakage
          console.error('[TL Action Buttons] Word export failed');
          alert('Failed to generate Word document. Please try again.');
          this.isExporting = false;
        }
      });
    } catch (error) {
      // Log generic message without full error object to prevent information leakage
      console.error('[TL Action Buttons] Word export exception');
      alert('Failed to generate Word document. Please try again.');
      this.isExporting = false;
    }
  }

  downloadPDF(): void {
    // Consider message as 'market module' when contentType is conduct-research or selectedFlow is market-intelligence
    const contentType = String(this.metadata?.contentType || '');
    const isEditContent = this.metadata?.contentType === 'edit-article';
    const isMarketModule = contentType === 'conduct-research';
    const isIndustryModule = contentType === 'industry-insights';
    const isproposalModule = contentType === 'proposal-inputs';
    const isprepMeetModule = contentType === 'prep-meet';
    const isPovModule = contentType === 'pov';
    const isDraftModule = contentType === 'article'||'blog'||'executive_brief';
    const isrefineModule = this.metadata?.contentType === 'refine-content';
    const isConductResearch = this.metadata?.contentType === 'conduct-research';
    console.log('[TL Action Buttons] downloadPDF() called:', {
      contentType,
      selectedFlow: this.selectedFlow,
      isMarketModule,
      isIndustryModule,
      isPovModule,
      isprepMeetModule,
      isproposalModule,isrefineModule,
      timestamp: new Date().toISOString()
    });
      if (isEditContent) {
        this.exportEditContentPDF();
        return;
    }
      else if (isIndustryModule || isprepMeetModule || isproposalModule || isMarketModule || isrefineModule || isConductResearch ){
          this.exportDocument('/api/v1/export/pdf-pwc-mi-module', 'pdf', 'pdf');
          return;
 
      }
      else if (isPovModule ) {
        this.exportDocument('/api/v1/export/pdf-pwc', 'pdf', 'pdf');
        return;
      }
      else if(isDraftModule){
        this.exportDocument('/api/v1/export/pdf-pwc', 'pdf', 'pdf');
        return;
      }
      else {
        this.exportDocument('/api/v1/export/pdf-pwc', 'pdf', 'pdf');
      }
    // const endpoint = isMarketModule
    //   ? '/api/v1/export/pdf-pwc-no-toc'
    //   : '/api/v1/export/pdf-pwc';
    
    // console.log('[TL Action Buttons] Using endpoint:', endpoint);
    // this.exportDocument(endpoint, 'pdf', 'pdf');
  }

  private async exportEditContentPDF(): Promise<void> {
    if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
      alert('Content is not available yet.');
      return;
    }
    this.isExporting = true;
    try {
      const { content, title: exportTitle } = this.getEditContentExportTitleAndContent();
      const finalTitle = exportTitle;
      const filename = `${this.sanitizeFilename(finalTitle)}.pdf`;
      this.chatService.exportEditContentToPDF({
        content,
        content_type: this.metadata.contentType,
        title: exportTitle,
        block_types: []
      }).subscribe({
        next: (blob: Blob) => {
          this.downloadBlobWithSaveDialog(blob, filename, 'application/pdf').then(() => {
            this.resetExportState();
          }).catch(err => {
            // Log generic message without full error object to prevent information leakage
            console.error('[TL Action Buttons] PDF download failed');
            this.isExporting = false;
          });
        },
        error: (error) => {
          // Log generic message without full error object to prevent information leakage
          console.error('[TL Action Buttons] PDF export failed');
          alert('Failed to generate PDF document. Please try again.');
          this.isExporting = false;
        }
      });
    } catch (error) {
      // Log generic message without full error object to prevent information leakage
      console.error('[TL Action Buttons] PDF export exception');
      alert('Failed to generate PDF document. Please try again.');
      this.isExporting = false;
    }
  }
  
  downloadPPT(): void {
    this.exportPPT('/api/v1/export/ppt');
  }

  downloadPodcast(): void {
    if (this.metadata.podcastAudioUrl && this.metadata.podcastFilename) {
      const link = document.createElement('a');
      link.href = this.metadata.podcastAudioUrl;
      link.download = this.metadata.podcastFilename;
      link.click();
    }
  }

  cleanedDocumentText!: string;
  documentTitle!: string;
  preGeneratedDocFile: File | null = null;
  isGeneratingDocument = false;

  onRaisePhoenix(): void {

    this.cleanedDocumentText = this.metadata.fullContent
    .replace(/<br>/g, '\n')
    .replace(/<[^>]+>/g, '');

    const lines = this.cleanedDocumentText
    .split('\n')
    .filter(line => line.trim());

    this.documentTitle = lines.length > 0
    ? lines[0].substring(0, 150)
    : 'Generated Document';

    this.showRequestForm = true;
    this.raisePhoenix.emit();
  }

  onReadyToPublish(): void {
    // Check if content is available
    if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
      this.toastService.error('Content is not available yet.');
      return;
    }

    this.isPreparingDocument = true;
    this.isDocumentPrepared = false;
    this.toastService.info('Preparing document for publication...');

    // Clean content (same pattern as onRaisePhoenix)
    const cleanedText = this.metadata.fullContent
      .replace(/<br>/g, '\n')
      .replace(/<[^>]+>/g, '');

    const title = this.metadata.topic?.trim() || 'Generated Document';

    // Generate DOCX via API
    const plainText = cleanedText;
    const filename = 'generated_content.docx';

    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    const endpoint = `${apiUrl}/api/v1/export/word-standalone`;

    console.log('[TL Action Buttons] Generating document for ready-to-publish:', { 
      title, 
      contentType: this.metadata.contentType 
    });

    this.authFetchService.authenticatedFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        content: plainText,
        title,
        content_type: this.metadata.contentType
      })
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to generate Word document');
        return response.blob();
      })
      .then(blob => {
        // Create File object from blob
        const file = new File(
          [blob], 
          filename, 
          { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        );
        
        // Store in component property (following onRaisePhoenix pattern)
        this.preGeneratedDocFile = file;
        
        // Store in service for ready-to-publish-flow to access
        this.tlFlowService.setPreGeneratedDocument(file);
        
        console.log('[TL Action Buttons] Document generated and stored');
        
        // Show prepared state
        this.isPreparingDocument = false;
        this.isDocumentPrepared = true;
        
        // Open the ready-to-publish flow
        this.tlFlowService.openFlow('ready-to-publish');
        
        this.toastService.success('Document prepared! Opening publication window...');
        
        // Reset animation state after delay
        setTimeout(() => {
          this.isDocumentPrepared = false;
        }, 2000);
      })
      .catch(err => {
        // Log generic message without full error object to prevent information leakage
        console.error('[TL Action Buttons] Document generation failed');
        this.toastService.error('Failed to prepare document. Please try again.');
        this.isPreparingDocument = false;
        this.isDocumentPrepared = false;
      });
  }
  
  phoenixRdpLink = '';
  ticketNumber = '';

  onTicketCreated(event: {
  requestNumber: string;
  phoenixRdpLink: string;
  }): void {
  // Validate and escape untrusted data before using in HTTP response
  try {
    this.validateAndEscapeUrl(event.phoenixRdpLink);
    const escapedRequestNumber = this.escapeHtmlSpecialChars(event.requestNumber);
    const escapedLink = this.escapeHtmlAttribute(event.phoenixRdpLink);
    this.phoenixRdpLink = event.phoenixRdpLink;
    this.ticketNumber = event.requestNumber;
    console.log('Ticket created:', event.requestNumber);
    this.translatedContent = `Request created successfully! Your request number is: <a href="${escapedLink}" target="_blank" rel="noopener noreferrer">${escapedRequestNumber}</a>`.trim();
  } catch (error) {
    // Log generic message without full error object to prevent information leakage
    console.error('[TL Action Buttons] Invalid ticket data');
    this.translatedContent = 'Error processing request. Please try again.';
  }
  this.showRequestForm = false; 
  this.sendToChat();
}

sendToChat(): void {

  const topic = `Phoenix Request - ${this.ticketNumber}`;
  let contentType: string;

   
    // Create metadata for the message
    const metadata: ThoughtLeadershipMetadata = {
      contentType: 'Phoenix_Request',
      topic: topic,
      fullContent: this.translatedContent,
      showActions: false
    };
  const chatMessage = this.translatedContent;
   
    // Send to chat via bridge
    console.log('[FormatTranslatorFlow] Sending to chat with metadata:', metadata);
    this.tlChatBridge.sendToChat(chatMessage, metadata);
    //this.onClose();
}

  copyToClipboard(): void {
    // Emit event to parent (chat component) to show reminder dialog
    const markdownContent = this.metadata.fullContent ?? '';
    this.copyRequested.emit({ content: markdownContent, component: this });
  }

  proceedWithCopy(content: string): void {
    // Convert markdown to HTML (same format as UI display)
    const htmlContent = renderMarkdownForDisplay(content);
    
    // Use ClipboardItem to support both HTML and plain text formats
    if (navigator.clipboard && navigator.clipboard.write) {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([content], { type: 'text/plain' })
      });
      
      navigator.clipboard.write([clipboardItem]).then(() => {
        this.isCopied = true;
        // Reset the "copied" feedback after 2 seconds
        setTimeout(() => {
          this.isCopied = false;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        // Fallback to plain text if HTML copy fails
        navigator.clipboard.writeText(content).then(() => {
          this.isCopied = true;
          setTimeout(() => {
            this.isCopied = false;
          }, 2000);
        }).catch(fallbackErr => {
          console.error('Failed to copy plain text to clipboard:', fallbackErr);
        });
      });
    } else {
      // Fallback for older browsers
      navigator.clipboard.writeText(content).then(() => {
        this.isCopied = true;
        setTimeout(() => {
          this.isCopied = false;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
    }
  }

  openInCanvas(): void {
    if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
      this.toastService.error('Content is not available yet.');
      return;
    }
    // Only allow supported types for canvas
    const allowedTypes = ['article', 'blog', 'white_paper', 'executive_brief', 'socialMedia','conduct-research'];
    if (!allowedTypes.includes(this.metadata.contentType)) {
      this.toastService.warning('Canvas is only available for articles, blogs, white papers, executive briefs, social media posts, and conduct research.');
      return;
    }
    // Map socialMedia and conduct-research to an accepted canvas type (they function like articles)
    let canvasContentType: 'article' | 'blog' | 'white_paper' | 'executive_brief';
    switch (this.metadata.contentType) {
      case 'article':
      case 'blog':
      case 'white_paper':
      case 'executive_brief':
        canvasContentType = this.metadata.contentType;
        break;
      case 'socialMedia':
      case 'conduct-research':
      default:
        canvasContentType = 'article';
        break;
    }
    this.canvasStateService.loadFromContent(
      this.metadata.fullContent,
      this.metadata.topic || 'Untitled',
      canvasContentType,
      this.messageId
    );
  }

  toggleExportDropdown(): void {
    this.showExportDropdown = !this.showExportDropdown;
  }
  // downloadProcessedFile(): void {
  //   if (!this.downloadUrl) {
  //     console.warn('[SlideCreationFlow] No download URL available');
  //     return;
  //   }

  //   const link = document.createElement('a');
  //   link.href = this.downloadUrl;
  //   link.target = '_blank';
  //   link.download = 'Slide.pptx'; // default filename
  //   link.click();
  // }
  exportSelected(format: 'word' | 'pdf' | 'ppt'): void {
    this.showExportDropdown = false;
    // Emit event to parent (chat component) to show reminder dialog
    this.exportRequested.emit({ format, component: this });
  }

  // Called by parent after reminder confirmation
  proceedWithExport(format: 'word' | 'pdf' | 'ppt'): void {
    this.isExporting = true;
    this.isExported = false;
    this.exportFormat = format.toUpperCase();
    
    if (format === 'word') {
      this.downloadWord();       
    } else if(format === 'pdf') {
      this.downloadPDF();
    } else if (format === 'ppt') {
      this.downloadPPT();
    }
  }

  private resetExportState(): void {
    setTimeout(() => {
      this.isExporting = false;
    }, 500);
    
    this.isExported = true;
    // Reset success indicator after 3 seconds
    setTimeout(() => {
      this.isExported = false;
    }, 3000);
  }

  private exportDocument(endpoint: string, extension: string, format: string): void {
    // Reuse the same approach as EditContentFlowComponent.downloadRevised()
    if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
      this.toastService.error('Content is not available yet.');
      return;
    }

    // Clean content the same way as the working implementation
    const plainText = this.metadata.fullContent.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    
    // Extract first line as subtitle (title for download)
    const lines = plainText.split('\n').filter(line => line.trim());
    const subtitle = lines.length > 0 ? lines[0].substring(0, 150) : 'Generated Document'; // First line as title, max 150 chars
    const title = subtitle; // Use subtitle as the main title, not the topic
    
    // console.log(`>>>>>>>>>>>>>`,plainText);

    // Get API URL from environment (supports runtime config via window._env)
    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    const fullEndpoint = `${apiUrl}${endpoint}`;

    // Use fetch API like the working implementation (same as EditContentFlowComponent.downloadRevised)
    this.authFetchService.authenticatedFetch(fullEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        content: plainText,
        title,
        subtitle: '',  // Don't pass subtitle separately since title is already set to it
        content_type: this.metadata.contentType,  // Use snake_case to match backend

      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to generate ${extension.toUpperCase()} document`);
      }
      return response.blob();
    })
    .then(blob => {
      const filename = `${this.sanitizeFilename(title)}.${extension}`;
      return this.downloadBlobWithSaveDialog(blob, filename);
    })
    .then(() => {
      this.resetExportState();
    })
    .catch(error => {
      // Log generic message without full error object to prevent information leakage
      console.error(`[TL Action Buttons] ${extension.toUpperCase()} export failed`);
      this.toastService.error(`Failed to generate ${extension.toUpperCase()} file. Please try again.`);
      this.isExporting = false;
    });
  }
  private exportUIWord(): void {
  if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
    this.toastService.error('Content is not available yet.');
    return;
  }

  const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
  const endpoint = `${apiUrl}/api/v1/export/word-ui`;

  // IMPORTANT: send content AS-IS (no stripping)
  const content = this.metadata.fullContent;

  // Title logic can stay simple
  const title = 'Generated Document';

  this.authFetchService.authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      content,
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
    const filename = `${this.sanitizeFilename(title)}.docx`;
    return this.downloadBlobWithSaveDialog(blob, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  })
  .then(() => {
    this.resetExportState();
  })
  .catch(error => {
    // Log generic message without full error object to prevent information leakage
    console.error('[TL Action Buttons] Word export failed');
    this.toastService.error('Failed to generate Word file.');
    this.isExporting = false;
  });
}

  private async exportPPT(endpoint: string): Promise<void> {
  if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
    this.toastService.error('Content is not available yet.');
    return;
  }

  const plainText = this.metadata.fullContent
    .replace(/<br>/g, '\n')
    .replace(/<[^>]+>/g, '');

  const title = this.metadata.topic?.trim() || 'Generated Presentation';
  const filename = `${this.sanitizeFilename(title)}.pptx`;
  const pptMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  let selectedPptFileHandle: any | null = null;
  if ('showSaveFilePicker' in window) {
    try {
      selectedPptFileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'PPTX Files',
            accept: { [pptMimeType]: ['.pptx'] }
          }
        ]
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        this.isExporting = false;
        return;
      }
      console.error('[TL Action Buttons] PPT save dialog unavailable');
    }
  }

  const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
  const fullEndpoint = `${apiUrl}${endpoint}`;

  try {
    const response = await this.authFetchService.authenticatedFetch(fullEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        content: plainText,
        title
      })
    });

    if (!response.ok) {
      throw new Error('Failed to start PPT generation');
    }

    const data = await response.json();
    console.log('PPT download URL:', data.download_url);

    const downloadUrl = data.download_url;
    if (!downloadUrl) {
      throw new Error('No download URL returned');
    }

    const fileResponse = await fetch(downloadUrl, {
      method: 'GET'
    });

    if (!fileResponse.ok) {
      throw new Error('Failed to retrieve PPT file');
    }

    const blob = await fileResponse.blob();

    if (selectedPptFileHandle) {
      await this.writeBlobToSelectedFile(selectedPptFileHandle, blob);
    } else {
      await this.downloadBlobWithSaveDialog(blob, filename, pptMimeType);
    }

    this.resetExportState();
  } catch (err) {
    console.error(err);
    this.toastService.error('Failed to generate PPT file.');
    this.isExporting = false;
  }
}

  private async writeBlobToSelectedFile(fileHandle: any, blob: Blob): Promise<void> {
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }


  private downloadFile(extension: string, mimeType: string): void {
    const blob = new Blob([this.metadata.fullContent], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.sanitizeFilename(this.metadata.topic)}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  get isPodcast(): boolean {
    const result = this.metadata.contentType === 'podcast' && !!this.metadata.podcastAudioUrl;
    // console.log('[TL Action Buttons] isPodcast check:', {
    //   contentType: this.metadata.contentType,
    //   hasPodcastUrl: !!this.metadata.podcastAudioUrl,
    //   podcastUrl: this.metadata.podcastAudioUrl?.substring(0, 50),
    //   result: result
    // });
    return result;
  }
  
  convertToPodcast(): void {
    if (this.isConvertingToPodcast) return;
    
    this.isConvertingToPodcast = true;
    
    // Prepare the podcast generation request with correct backend schema
    const formData = new FormData();
    formData.append('topic', this.metadata.topic); // Required field
    formData.append('style', 'dialogue'); // dialogue or monologue
    formData.append('duration', 'medium'); // short, medium, or long
    formData.append('context', this.metadata.fullContent); // The content to convert
    
    let scriptContent = '';
    let audioBase64 = '';
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    
    // Get API URL from environment (supports runtime config via window._env)
    const apiUrl = (window as any)._env?.apiUrl || environment.apiUrl || '';
    
    // Use fetch for SSE streaming
    this.authFetchService.authenticatedFetchFormData(`${apiUrl}/api/v1/tl/generate-podcast`, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      const readStream = (): any => {
        return reader?.read().then(({ done, value }) => {
          if (done) {
            this.isConvertingToPodcast = false;
            
            console.log('[Podcast Debug] Stream complete');
            console.log('[Podcast Debug] audioBase64 length:', audioBase64?.length || 0);
            console.log('[Podcast Debug] scriptContent length:', scriptContent?.length || 0);
            
            // Send podcast to chat with metadata
            if (audioBase64 && scriptContent) {
              console.log('[Podcast Debug] Converting base64 to blob...');
              const audioBlob = this.base64ToBlob(audioBase64, 'audio/mpeg');
              console.log('[Podcast Debug] Blob size:', audioBlob.size, 'bytes');
              
              const audioUrl = URL.createObjectURL(audioBlob);
              console.log('[Podcast Debug] Audio URL created:', audioUrl);
              
              // Create metadata for the podcast message
              const podcastMetadata: ThoughtLeadershipMetadata = {
                contentType: 'podcast',
                topic: `${this.metadata.topic} (Podcast)`,
                fullContent: scriptContent,
                showActions: true,
                podcastAudioUrl: audioUrl,
                podcastFilename: `${this.sanitizeFilename(this.metadata.topic)}_podcast.mp3`
              };
              
              console.log('[Podcast Debug] Metadata:', podcastMetadata);
              
              // Send to chat via bridge
              const podcastMessage = `📻 **Podcast Generated Successfully!**\n\n**Script:**\n\n${scriptContent}\n\n🎧 **Audio Ready!** Listen below or download the MP3 file.`;
              this.tlChatBridge.sendToChat(podcastMessage, podcastMetadata);
              
              console.log('[Podcast Debug] Sent to chat via bridge');
              this.toastService.success('Podcast generated and added to chat!');
            } else {
              console.error('[Podcast Debug] Missing data - audioBase64:', !!audioBase64, 'scriptContent:', !!scriptContent);
            }
            return;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  console.log('[Podcast Debug] SSE event type:', parsed.type);
                  
                  if (parsed.type === 'script') {
                    scriptContent = parsed.content;
                    console.log('[Podcast Debug] Script received, length:', scriptContent.length);
                  } else if (parsed.type === 'complete') {
                    audioBase64 = parsed.audio;
                    console.log('[Podcast Debug] Audio received, base64 length:', audioBase64?.length || 0);
                  } else if (parsed.type === 'error') {
                    console.error('[TL Action Buttons] Podcast generation failed');
                    this.toastService.error(`Error generating podcast: ${parsed.message}`);
                    
                    // Abort the reader and reset state immediately
                    reader?.cancel();
                    this.isConvertingToPodcast = false;
                    throw new Error(parsed.message);
                  } else if (parsed.type === 'progress') {
                    console.log('[Podcast Debug] Progress:', parsed.message);
                  }
                } catch (e) {
                  console.error('[TL Action Buttons] Error parsing SSE data');
                }
              }
            }
          });
          
          return readStream();
        }).catch((error) => {
          // Handle stream reading errors
          this.isConvertingToPodcast = false;
          reader?.cancel();
          throw error;
        });
      };
      
      return readStream();
    })
    .catch(error => {
      console.error('[TL Action Buttons] Error converting to podcast');
      this.toastService.error(`Failed to convert content to podcast: ${error.message || 'Unknown error'}`);
      this.isConvertingToPodcast = false;
      reader?.cancel();
    });
  }
  
  private base64ToBlob(base64: string, contentType: string): Blob {
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

  /**
   * Escape HTML special characters to prevent XSS attacks
   */
  private escapeHtmlSpecialChars(untrustedData: string): string {
    if (!untrustedData) return '';
    const div = document.createElement('div');
    div.textContent = untrustedData;
    return div.innerHTML;
  }

  /**
   * Escape data for use in HTML attributes
   */
  private escapeHtmlAttribute(untrustedData: string): string {
    if (!untrustedData) return '';
    return untrustedData
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Validate URL to prevent open redirect attacks
   */
  private validateAndEscapeUrl(urlString: string): void {
    if (!urlString) throw new Error('URL is empty');
    
    try {
      const url = new URL(urlString);
      
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error(`Invalid protocol: ${url.protocol}`);
      }
    } catch (error) {
      throw new Error(`URL validation failed: ${error instanceof Error ? error.message : 'Invalid URL'}`);
    }
  }

  private async downloadBlobWithSaveDialog(blob: Blob, filename: string, mimeTypeOverride?: string): Promise<void> {
    // Check if File System Access API is available (Chrome, Edge, Firefox with flag)
    if ('showSaveFilePicker' in window) {
      try {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        let mimeType = mimeTypeOverride || blob.type || 'application/octet-stream';
        
        // Map extensions to proper MIME types if needed
        if (!mimeTypeOverride && (!blob.type || blob.type === 'application/octet-stream')) {
          switch (ext) {
            case 'docx':
              mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              break;
            case 'pdf':
              mimeType = 'application/pdf';
              break;
            case 'pptx':
              mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
              break;
            case 'txt':
              mimeType = 'text/plain';
              break;
            case 'mp3':
              mimeType = 'audio/mpeg';
              break;
          }
        }
        
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: `${ext.toUpperCase()} Files`,
              accept: { [mimeType]: [`.${ext}`] }
            }
          ]
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        console.log(`File saved: ${filename}`);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('[TL Action Buttons] Error saving file');
          // Fallback to default download if dialog fails
          this.fallbackDownload(blob, filename);
        }
      }
    } else {
      // Fallback: use default download behavior for unsupported browsers
      this.fallbackDownload(blob, filename);
    }
  }

  private fallbackDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  }
 
}
