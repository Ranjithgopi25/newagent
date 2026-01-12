import { Component, Input, ViewChild, ElementRef, HostListener, Output, EventEmitter, OnInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { ThoughtLeadershipMetadata } from '../../../../../core/models';
import { CanvasStateService } from '../../../../../core/services/canvas-state.service';
import { TlChatBridgeService } from '../../../../../core/services/tl-chat-bridge.service';
import { ChatService } from '../../../../../core/services/chat.service';
import { environment } from '../../../../../../environments/environment';
import { TlRequestFormComponent } from '../../../../phoenix/TL/request-form';
import { AuthFetchService } from '../../../../../core/services/auth-fetch.service';
import { extractDocumentTitle } from '../../../../../core/utils/edit-content.utils';

@Component({
    selector: 'app-tl-action-buttons',
    imports: [TlRequestFormComponent],
    templateUrl: './tl-action-buttons.component.html',
    styleUrls: ['./tl-action-buttons.component.scss']
})
export class TlActionButtonsComponent implements OnInit {
  @Input() metadata!: ThoughtLeadershipMetadata;
  @Input() messageId?: string;
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

  @Output() raisePhoenix = new EventEmitter<void>();

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
    private chatService: ChatService
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
    alert('Content is not available yet.');
    return;
  }

  // Prepare content according to new logic
  const plainText = this.metadata.fullContent
    .replace(/<br>/g, '\n')
    .replace(/<[^>]+>/g, ''); // strip HTML

  const title = this.metadata.topic?.trim() || 'Generated Document';

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
      // Use existing download mechanism
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.sanitizeFilename(title)}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);
      this.resetExportState();
    })
    .catch(err => {
      console.error('New Word export error:', err);
      alert('Failed to generate Word document. Please try again.');
      this.isExporting = false;
    });
}

  private isEditContent(): boolean {
    // Check if this is edit content workflow
    // Edit content may have contentType 'edit-content' 
    return this.metadata?.contentType === 'edit-content';
  }



  downloadWord(): void {
    // Check if this is edit content first
    if (this.isEditContent()) {
      this.exportEditContentWord();
      return;
    }

    const isSocialModule = this.metadata?.contentType === 'socialMedia';
    const isEditContent = this.metadata?.contentType === 'edit-content';
    const isMarketModule =
      this.metadata?.contentType === 'conduct-research' ||
      this.selectedFlow === 'market-intelligence';

    if (isSocialModule) {
      this.exportUIWord();
    } else if (isMarketModule) {
      this.exportDocument('/api/v1/export/word-pwc-no-toc', 'docx', 'docx');
    } else if (isEditContent) {
      this.exportEditContentWord();
    }

  }

  private exportEditContentWord(): void {
    if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
      alert('Content is not available yet.');
      return;
    }

    this.isExporting = true;
    const plainText = this.metadata.fullContent.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    
    // Use extractDocumentTitle utility for proper title extraction
    const title = extractDocumentTitle(plainText, this.metadata.topic);
    
    // Extract subtitle from first line if available
    const lines = plainText.split('\n').filter(line => line.trim());
    const subtitle = lines.length > 0 ? lines[0].substring(0, 150) : undefined;

    this.chatService.exportEditContentToWord({
      content: plainText,
      title: title,
      subtitle: subtitle
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.sanitizeFilename(title)}.docx`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.resetExportState();
      },
      error: (error) => {
        console.error('Edit Content Word export error:', error);
        alert('Failed to generate Word document. Please try again.');
        this.isExporting = false;
      }
    });
  }

  downloadPDF(): void {
    // Check if this is edit content first
    if (this.isEditContent()) {
      this.exportEditContentPDF();
      return;
    }

    // this.exportDocument('/api/v1/export/pdf-pwc', 'pdf', 'pdf');
  // Consider message as 'market module' when contentType is conduct-research or selectedFlow is market-intelligence
  const contentType = String(this.metadata?.contentType || '');
  const isEditContent = this.metadata?.contentType === 'edit-content';
  const isMarketModule = contentType === 'conduct-research' || this.selectedFlow === 'market-intelligence';
    console.log("Content Type", this.metadata?.contentType)
    console.log("Export pdf 2 ", isMarketModule);
    const endpoint = isMarketModule
      ? '/api/v1/export/pdf-pwc-no-toc'
      : '/api/v1/export/pdf-pwc';
    this.exportDocument(endpoint, 'pdf', 'pdf');
  }

  private exportEditContentPDF(): void {
    if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
      alert('Content is not available yet.');
      return;
    }

    this.isExporting = true;
    const plainText = this.metadata.fullContent.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    
    // Use extractDocumentTitle utility for proper title extraction
    const title = extractDocumentTitle(plainText, this.metadata.topic);
    
    // Extract subtitle from first line if available
    const lines = plainText.split('\n').filter(line => line.trim());
    const subtitle = lines.length > 0 ? lines[0].substring(0, 150) : undefined;

    this.chatService.exportEditContentToPDF({
      content: plainText,
      title: title,
      subtitle: subtitle
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.sanitizeFilename(title)}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.resetExportState();
      },
      error: (error) => {
        console.error('Edit Content PDF export error:', error);
        alert('Failed to generate PDF document. Please try again.');
        this.isExporting = false;
      }
    });
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
  onRaisePhoenix(): void {
    this.showRequestForm = true;
    this.raisePhoenix.emit();
  }
  
  phoenixRdpLink = '';
  ticketNumber = '';

  onTicketCreated(event: {
  requestNumber: string;
  phoenixRdpLink: string;
  }): void {
 this.phoenixRdpLink = event.phoenixRdpLink;
 this.ticketNumber = event.requestNumber;
  console.log('Ticket created:', event.requestNumber);
  this.translatedContent = `✅ Request created successfully! Your request number is: <a href="${event.phoenixRdpLink}" target="_blank" rel="noopener noreferrer">${event.requestNumber}</a>`.trim();
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
    // Convert markdown to plain text for better readability when pasted
    const plainText = this.convertMarkdownToPlainText(this.metadata.fullContent);
    
    navigator.clipboard.writeText(plainText).then(() => {
      this.isCopied = true;
      // Reset the "copied" feedback after 2 seconds
      setTimeout(() => {
        this.isCopied = false;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
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

  openInCanvas(): void {
    if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
      alert('Content is not available yet.');
      return;
    }
    // Only allow supported types for canvas
    const allowedTypes = ['article', 'blog', 'white_paper', 'executive_brief', 'socialMedia','conduct-research'];
    if (!allowedTypes.includes(this.metadata.contentType)) {
      alert('Canvas is only available for articles, blogs, white papers, executive briefs, social media posts, and conduct research.');
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
    this.isExporting = true;
    this.isExported = false;
    this.exportFormat = format.toUpperCase();
    
    if (format === 'word') {
    //  if (this.metadata?.contentType === 'conduct-research') {
    //     this.exportWordNewLogic();   
    //   } else {
        this.downloadWord();       
      // }
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
      alert('Content is not available yet.');
      return;
    }

    // Clean content the same way as the working implementation
    const plainText = this.metadata.fullContent.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
    
    // Extract first line as subtitle (title for download)
    const lines = plainText.split('\n').filter(line => line.trim());
    const subtitle = lines.length > 0 ? lines[0].substring(0, 150) : 'Generated Document'; // First line as title, max 150 chars
    const title = subtitle; // Use subtitle as the main title, not the topic
    
    console.log(`>>>>>>>>>>>>>`,plainText);

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
        content_type: this.metadata.contentType  // Use snake_case to match backend
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
      this.resetExportState();
    })
    .catch(error => {
      console.error(`Error generating ${extension.toUpperCase()}:`, error);
      alert(`Failed to generate ${extension.toUpperCase()} file. Please try again.`);
      this.isExporting = false;
    });
  }
  private exportUIWord(): void {
  if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
    alert('Content is not available yet.');
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
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.sanitizeFilename(title)}.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
  })
  .catch(error => {
    console.error('UI Word export failed:', error);
    alert('Failed to generate Word file.');
  });
}

  private exportPPT(endpoint: string): void {
  if (!this.metadata.fullContent || !this.metadata.fullContent.trim()) {
    alert('Content is not available yet.');
    return;
  }

  const plainText = this.metadata.fullContent
    .replace(/<br>/g, '\n')
    .replace(/<[^>]+>/g, '');

  const title = this.metadata.topic?.trim() || 'Generated Presentation';

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
    this.resetExportState();
  })
  .catch(err => {
    console.error(err);
    alert("Failed to generate PPT file.");
    this.isExporting = false;
  });
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
              alert('Podcast generated and added to chat!');
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
                    console.error('Podcast generation error:', parsed.message);
                    alert(`Error generating podcast: ${parsed.message}`);
                    
                    // Abort the reader and reset state immediately
                    reader?.cancel();
                    this.isConvertingToPodcast = false;
                    throw new Error(parsed.message);
                  } else if (parsed.type === 'progress') {
                    console.log('[Podcast Debug] Progress:', parsed.message);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
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
      console.error('Error converting to podcast:', error);
      alert(`Failed to convert content to podcast: ${error.message || 'Unknown error'}`);
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

 
}
