import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { Message, ChatRequest, DraftRequest, ThoughtLeadershipRequest, ResearchRequest, ArticleRequest, BestPracticesRequest, PodcastRequest, UpdateSectionRequest } from '../models';
import { environment } from '../../../environments/environment';
import { MsalService } from '@azure/msal-angular';

// Chat History Models
export interface ChatSessionSummary {
  session_id: string;
  source: string;
  title?: string;
  preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionDetail {
  session_id: string;
  source: string;
  title?: string;
  conversation: {
    messages: Message[];
  };
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private get apiUrl(): string {
    // Support runtime configuration via window._env (for production)
    return (window as any)._env?.apiUrl || environment.apiUrl || '';
  }
  

  constructor(
    private http: HttpClient,
    private msalService: MsalService
  ) {
    console.log('[ChatService] Constructor - apiUrl:', this.apiUrl);
    console.log('[ChatService] window._env:', (window as any)._env);
    console.log('[ChatService] environment.apiUrl:', environment.apiUrl);
  }

  /**
   * Get authentication headers for JSON requests
   * MSAL interceptor only works with HttpClient, so we need to manually add headers for fetch()
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (environment.useAuth) {
      try {
        const account = this.msalService.instance.getActiveAccount();
        if (account) {
          const response = await this.msalService.instance.acquireTokenSilent({
            scopes: ['User.Read'], // Use the same scope as in protectedResourceMap
            account: account
          });
          
          if (response.idToken) {
            headers['Authorization'] = `Bearer ${response.idToken}`;
            console.log('[ChatService] Added auth header (ID token) to fetch() call');
          }
        }
      } catch (error) {
        console.error('[ChatService] Failed to acquire token for fetch():', error);
      }
    }

    return headers;
  }

  /**
   * Get authentication headers for FormData requests (no Content-Type header)
   * Browser will automatically set Content-Type with multipart boundary
   */
  private async getAuthHeadersForFormData(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

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
            console.log('[ChatService] Added auth header (ID token) to FormData fetch() call');
          }
        }
      } catch (error) {
        console.error('[ChatService] Failed to acquire token for FormData fetch():', error);
      }
    }

    return headers;
  }

  /**
   * Wrapper around fetch() that automatically adds authentication headers for JSON requests
   * Use this instead of fetch() for all API calls with JSON body
   */
  private async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const authHeaders = await this.getAuthHeaders();
    
    // Merge auth headers with any existing headers
    const headers: Record<string, string> = {
      ...authHeaders,
      ...(options.headers as Record<string, string> || {})
    };

    console.log('[ChatService] authenticatedFetch - URL:', url);
    console.log('[ChatService] authenticatedFetch - Has Authorization:', !!headers['Authorization']);

    return fetch(url, {
      ...options,
      headers
    });
  }

  /**
   * Wrapper around fetch() for FormData requests - doesn't set Content-Type (browser sets it with boundary)
   * Use this for file uploads and multipart form data
   */
  private async authenticatedFetchFormData(url: string, options: RequestInit = {}): Promise<Response> {
    const authHeaders = await this.getAuthHeadersForFormData();
    
    // Merge auth headers with any existing headers
    const headers: Record<string, string> = {
      ...authHeaders,
      ...(options.headers as Record<string, string> || {})
    };

    console.log('[ChatService] authenticatedFetchFormData - URL:', url);
    console.log('[ChatService] authenticatedFetchFormData - Has Authorization:', !!headers['Authorization']);

    return fetch(url, {
      ...options,
      headers
    });
  }

  detectEditIntent(input: string): Observable<{is_edit_intent: boolean, confidence: number, detected_editors?: string[]}> {
    const fullUrl = `${this.apiUrl}/api/v1/chat/detect-edit-intent`;
    console.log('[ChatService] detectEditIntent - Full URL:', fullUrl);
    console.log('[ChatService] detectEditIntent - this.apiUrl:', this.apiUrl);
    console.log('[ChatService] detectEditIntent - Expected to match: http://localhost:8000/api/v1/');
    
    return this.http.post<{is_edit_intent: boolean, confidence: number, detected_editors?: string[]}>(
      fullUrl,
      { input: input.trim() }
    );
  }

  detectDraftIntent(input: string): Observable<{ is_draft_intent: boolean, confidence: number, detected_topic?: string, detected_content_type?: string[] }> {
    return this.http.post<{ is_draft_intent: boolean, confidence: number, detected_topic?: string, detected_content_type?: string[] }>(
      `${this.apiUrl}/api/v1/chat/detect-draft-intent`,
      { input: input.trim() }
    );
  }

  /**
   * DDC Chat Agent
   * Posts FormData to `/api/v1/ddc/ddc_chat_agent`.
   * - Accepts a message string, optional conversation id, and optional PPT file.
   * - Handles PPTX blob responses (sanitized/improved presentations) and JSON responses.
   */
  ddcChatAgent(message: string, conversationId?: string, file?: File): Observable<any> {
    return new Observable(observer => {
      const formData = new FormData();
      formData.append('message', message);
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }
      if (file) {
        formData.append('file', file, file.name);
      }

      this.authenticatedFetchFormData(`${this.apiUrl}/api/v1/ddc/ddc_chat_agent`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }

        const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
        const convId = response.headers.get('X-Conversation-ID') || undefined;
        const summaryHeader = response.headers.get('X-Sanitization-Summary');
        let summary = null;
        if (summaryHeader) {
          try { summary = JSON.parse(summaryHeader); } catch (e) { /* ignore parse errors */ }
        }

        if (contentType.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation') || contentType.includes('application/octet-stream')) {
          return response.blob().then(blob => {
            observer.next({ blob, conversation_id: convId, summary });
          });
        }

        return response.json().then(json => {
          if (convId && !json.conversation_id) json.conversation_id = convId;
          if (summary && !json.sanitization_summary) json.sanitization_summary = summary;
          observer.next(json);
        });
      })
      .then(() => observer.complete())
      .catch(error => observer.error(error));
    });
  }
 

  sendMessage(messages: Message[], userId?: string, sessionId?: string, threadId?: string, source?: string): Observable<any> {
    const request: ChatRequest = {
      messages: messages,
      stream: false,
      user_id: userId,
      session_id: sessionId,
      thread_id: threadId,
      source: source || "Chat"
    };
    
    console.log('[ChatService] sendMessage - URL:', `${this.apiUrl}/api/v1/chat`);
    console.log('[ChatService] sendMessage - Request:', request);
    console.log("Calling from sendMessage Chat");
    return this.http.post(`${this.apiUrl}/api/v1/chat`, request);
  }

  createDraft(draftRequest: DraftRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/draft`, draftRequest);
  }

  streamChat(messages: Message[], userId?: string, sessionId?: string, threadId?: string, source?: string): Observable<string> {
    return new Observable(observer => {
      const request: ChatRequest = {
        messages: messages,
        stream: true,
        user_id: userId,
        session_id: sessionId,
        thread_id: threadId,
        source: source || "Chat"
      };
      console.log("Calling from Stream Chat Source is:", source);
      let endpointUrl= '';
      if (source === 'Market_Intelligence'){
        endpointUrl = '/api/v1/tl/mi_chat_agent'
      }
      else
      {
        endpointUrl= '/api/v1/chat'
      }
      this.authenticatedFetch(`${this.apiUrl}${endpointUrl}`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    if (parsed.content) {
                      observer.next(parsed.content);
                    } else if (parsed.done) {
                      observer.complete();
                    } else if (parsed.error) {
                      observer.error(new Error(parsed.error));
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  streamDraft(draftRequest: DraftRequest): Observable<string> {
    return new Observable(observer => {
      this.authenticatedFetch(`${this.apiUrl}/api/draft`, {
        method: 'POST',
        body: JSON.stringify(draftRequest)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    if (parsed.content) {
                      observer.next(parsed.content);
                    } else if (parsed.done) {
                      observer.complete();
                    } else if (parsed.error) {
                      observer.error(new Error(parsed.error));
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  streamThoughtLeadership(tlRequest: ThoughtLeadershipRequest): Observable<string> {
    return new Observable(observer => {
      this.authenticatedFetch(`${this.apiUrl}/api/thought-leadership`, {
        method: 'POST',
        body: JSON.stringify(tlRequest)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    if (parsed.content) {
                      observer.next(parsed.content);
                    } else if (parsed.done) {
                      observer.complete();
                    } else if (parsed.error) {
                      observer.error(new Error(parsed.error));
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  improvePPT(originalFile: File, referenceFile: File | null): Observable<Blob> {
    return new Observable(observer => {
      const formData = new FormData();
      formData.append('original_ppt', originalFile);
      if (referenceFile) {
        formData.append('reference_ppt', referenceFile);
      }

      this.authenticatedFetchFormData(`${this.apiUrl}/api/v1/ppt/improve`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.blob();
      })
      .then(blob => {
        observer.next(blob);
        observer.complete();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  downloadDdcFormatted(formData: FormData) {
    // Use HttpClient to get response with headers and blob body
    // Return an Observable of the full HttpResponse containing the blob
    return this.http.post(`${this.apiUrl}/api/v1/ddc/brand-format/format-file`, formData, {
      responseType: 'blob',
      observe: 'response' as 'body'
    });
  }

  streamSanitizationConversation(
    messages: Message[], 
    uploadedFileName?: string,
    clientIdentity?: string,
    pageRange?: string,
    tier1Services?: string[],
    tier2Services?: string[]
  ): Observable<string> {
    return new Observable(observer => {
      const request = {
        messages: messages,
        uploaded_file_name: uploadedFileName,
        client_identity: clientIdentity,
        page_range: pageRange,
        tier1_services: tier1Services,
        tier2_services: tier2Services,
        stream: true
      };

      this.authenticatedFetch(`${this.apiUrl}/api/v1/ppt/sanitize/conversation`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    if (parsed.content) {
                      observer.next(parsed.content);
                    } else if (parsed.done) {
                      observer.complete();
                    } else if (parsed.error) {
                      observer.error(new Error(parsed.error));
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  sanitizePPT(file: File, clientName: string, products: string, options?: any): Observable<{blob: Blob, stats: any}> {
    return new Observable(observer => {
      const formData = new FormData();
      formData.append('original_ppt', file);
      if (clientName) {
        formData.append('client_name', clientName);
      }
      if (products) {
        formData.append('client_products', products);
      }
      if (options) {
        // Convert camelCase to snake_case for backend
        const backendOptions = {
          numeric_data: options.numericData,
          personal_info: options.personalInfo,
          financial_data: options.financialData,
          locations: options.locations,
          identifiers: options.identifiers,
          names: options.names,
          logos: options.logos,
          metadata: options.metadata,
          llm_detection: options.llmDetection,
          hyperlinks: options.hyperlinks,
          embedded_objects: options.embeddedObjects
        };
        formData.append('sanitization_options', JSON.stringify(backendOptions));
      }

      this.authenticatedFetchFormData(`${this.apiUrl}/api/v1/ppt/sanitize`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const statsHeader = response.headers.get('X-Sanitization-Stats');
        let stats = null;
        if (statsHeader) {
          try {
            stats = JSON.parse(statsHeader);
          } catch (e) {
            console.warn('Could not parse sanitization stats');
          }
        }
        return response.blob().then(blob => ({blob, stats}));
      })
      .then(result => {
        observer.next(result);
        observer.complete();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  streamDdcWorkflow(workflow: 'brand-format' | 'professional-polish' | 'sanitization' | 'client-customization' | 'rfp-response' | 'ddc-format-translator' | 'slide-creation' | 'slide-creation-prompt', formData: FormData): Observable<string> {
    return this.streamFormData(`${this.apiUrl}/api/v1/ddc/${workflow}`, formData);
  }

  streamDdcBrandFormat(formData: FormData): Observable<string> {
    return this.streamDdcWorkflow('brand-format', formData);
  }

  streamDdcProfessionalPolish(formData: FormData): Observable<string> {
    return this.streamDdcWorkflow('professional-polish', formData);
  }

  streamDdcSanitization(formData: FormData): Observable<string> {
    return this.streamDdcWorkflow('sanitization', formData);
  }

  streamDdcClientCustomization(formData: FormData): Observable<string> {
    return this.streamDdcWorkflow('client-customization', formData);
  }

  streamDdcRfpResponse(formData: FormData): Observable<string> {
    return this.streamDdcWorkflow('rfp-response', formData);
  }

  streamDdcFormatTranslator(formData: FormData): Observable<string> {
    return this.streamDdcWorkflow('ddc-format-translator', formData);
  }

  streamDdcSlideCreation(formData: FormData): Observable<string> {
    return this.streamDdcWorkflow('slide-creation', formData);
  }
  streamDdcSlideCreationPrompt(formData: FormData): Observable<string> {
    return this.streamDdcWorkflow('slide-creation-prompt', formData);
  }

  createDdcSlide(formData: FormData): Observable<any> {
  return this.http.post(`${this.apiUrl}/api/v1/ddc/slide-creation`, formData);
  }

      createPhoenixRequest(formData: FormData): Observable<any> {
  return this.http.post(
    `${this.apiUrl}/api/v1/ddc/phoenix/create-request`,formData);
  } 

  getPhoenixRequestConfigDdc(): Observable<any> {
  return this.http.get(
    `${this.apiUrl}/api/v1/ddc/phoenix/request-config-ddc`
  );
}

  getPhoenixRequestConfigTl(): Observable<any> {
  return this.http.get(
    `${this.apiUrl}/api/v1/ddc/phoenix/request-config-tl`
  );
}
  private streamFormData(endpoint: string, formData: FormData): Observable<string> {
    return new Observable(observer => {
      this.authenticatedFetchFormData(endpoint, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    if (parsed.content) {
                      observer.next(parsed.content);
                    } else if (parsed.done) {
                      observer.complete();
                    } else if (parsed.error) {
                      observer.error(new Error(parsed.error));
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  exportDocument(content: string, title: string, format: string): Observable<Blob> {
    return new Observable(observer => {
      const endpoint = format === 'pdf' ? '/api/v1/export/pdf-pwc' : '/api/v1/export/word';
      
      this.authenticatedFetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ content, title, format })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Export failed: ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        observer.next(blob);
        observer.complete();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  streamResearch(researchRequest: any): Observable<string> {
    return new Observable(observer => {
      this.authenticatedFetch(`${this.apiUrl}/api/research`, {
        method: 'POST',
        body: JSON.stringify(researchRequest)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    if (parsed.content) {
                      observer.next(parsed.content);
                    } else if (parsed.done) {
                      observer.complete();
                    } else if (parsed.error) {
                      observer.error(new Error(parsed.error));
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  draftArticle(articleData: any, outlineFile?: File, supportingDocs?: File[]): Observable<string> {
    return new Observable(observer => {
      const formData = new FormData();
      formData.append('topic', articleData.topic);
      formData.append('content_type', articleData.content_type);
      formData.append('desired_length', articleData.desired_length.toString());
      formData.append('tone', articleData.tone);
      
      if (articleData.outline_text) {
        formData.append('outline_text', articleData.outline_text);
      }
      if (articleData.additional_context) {
        formData.append('additional_context', articleData.additional_context);
      }
      if (outlineFile) {
        formData.append('outline_file', outlineFile);
      }
      if (supportingDocs && supportingDocs.length > 0) {
        supportingDocs.forEach(doc => {
          formData.append('supporting_docs', doc);
        });
      }

      this.authenticatedFetchFormData(`${this.apiUrl}/api/v1/tl/draft-article`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    if (parsed.content) {
                      observer.next(parsed.content);
                    } else if (parsed.done) {
                      observer.complete();
                    } else if (parsed.error) {
                      observer.error(new Error(parsed.error));
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  streamBestPractices(file: File, categories?: string[]): Observable<string> {
    return new Observable(observer => {
      const formData = new FormData();
      formData.append('file', file);
      if (categories && categories.length > 0) {
        formData.append('categories', categories.join(','));
      }

      this.authenticatedFetchFormData(`${this.apiUrl}/api/v1/ppt/validate-best-practices`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    if (parsed.content) {
                      observer.next(parsed.content);
                    } else if (parsed.done) {
                      observer.complete();
                    } else if (parsed.error) {
                      observer.error(new Error(parsed.error));
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  generatePodcast(
    files: File[] | null, 
    contentText: string | null, 
    customization: string | null, 
    podcastStyle: string = 'dialogue',
    speaker1Name?: string,
    speaker1Voice?: string,
    speaker1Accent?: string,
    speaker2Name?: string,
    speaker2Voice?: string,
    speaker2Accent?: string
  ): Observable<any> {
    return new Observable(observer => {
      const formData = new FormData();
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('files', file);
        });
      }
      
      if (contentText) {
        formData.append('content_text', contentText);
      }
      
      if (customization) {
        formData.append('customization', customization);
      }
      
      formData.append('podcast_style', podcastStyle);
      
      if (speaker1Name) formData.append('speaker1_name', speaker1Name);
      if (speaker1Voice) formData.append('speaker1_voice', speaker1Voice);
      if (speaker1Accent) formData.append('speaker1_accent', speaker1Accent);
      if (speaker2Name) formData.append('speaker2_name', speaker2Name);
      if (speaker2Voice) formData.append('speaker2_voice', speaker2Voice);
      if (speaker2Accent) formData.append('speaker2_accent', speaker2Accent);

      this.authenticatedFetchFormData(`${this.apiUrl}/api/v1/tl/generate-podcast`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(parsed);
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  streamResearchWithMaterials(
    files: File[] | null,
    links: string[] | null,
    query: string,
    focusAreas: string[],
    additionalContext: string | null
  ): Observable<any> {
    return new Observable(observer => {
      const formData = new FormData();
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('files', file);
        });
      }
      
      if (links && links.length > 0) {
        links.forEach(link => {
          formData.append('links', link);
        });
      }
      
      formData.append('query', query);
      
      if (focusAreas && focusAreas.length > 0) {
        formData.append('focus_areas', JSON.stringify(focusAreas));
      }
      
      if (additionalContext) {
        formData.append('additional_context', additionalContext);
      }

      this.authenticatedFetchFormData(`${this.apiUrl}/api/v1/tl/research-with-materials`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(parsed);
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  // NEW: Thought Leadership Section Methods (5 Sections)

  streamDraftContent(
    payload: Message[] | {
      messages: Message[],
      content_type?: string,
      topic?: string,
      word_limit?: string,
      audience_tone?: string,
      outline?: { type: string, content: string },
      supporting_documents?: { content: string },
      research?: any,
      stream: boolean
    },
    improvementPrompt?: string,
    draftParams?: any
  ): Observable<any> {
    return new Observable(observer => {
      let request: any;

      // Check if payload is an array (old format for improvement iterations) or structured object (new format)
      if (Array.isArray(payload)) {
        // Old format: Message[] for improvement iterations
        request = { messages: payload, stream: true };
        
        // Add improvement_prompt to request if provided
        if (improvementPrompt) {
          request.improvement_prompt = improvementPrompt;
        }
        
        // Add draft parameters for improvement iterations
        if (draftParams) {
          if (draftParams.contentType) request.content_type = draftParams.contentType;
          if (draftParams.topic) request.topic = draftParams.topic;
          if (draftParams.wordLimit) request.word_limit = draftParams.wordLimit;
          if (draftParams.audienceTone) request.audience_tone = draftParams.audienceTone;
          if (draftParams.outlineDoc) request.outline_doc = draftParams.outlineDoc;
          if (draftParams.supportingDoc) request.supporting_doc = draftParams.supportingDoc;
          if (draftParams.useFactivaResearch !== undefined) request.use_factiva_research = draftParams.useFactivaResearch;
        }
      } else {
        // New format: Structured payload object with all fields
        request = payload;
      }

      this.authenticatedFetch(`${this.apiUrl}/api/v1/tl/draft-content`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(JSON.parse(data));
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => observer.error(error));
    });
  }

  /**
   * Stream POV (Point of View) content generation
   * Routes to /api/v1/tl/pov endpoint instead of draft-content
   */
  streamPOVContent(
    payload: Message[] | {
      messages: Message[],
      content_type?: string,
      topic?: string,
      word_limit?: string,
      audience_tone?: string,
      outline?: { type: string, content: string },
      supporting_documents?: { content: string },
      research?: any,
      stream: boolean
    },
    improvementPrompt?: string,
    draftParams?: any
  ): Observable<any> {
    return new Observable(observer => {
      let request: any;

      // Check if payload is an array (old format for improvement iterations) or structured object (new format)
      if (Array.isArray(payload)) {
        // Old format: Message[] for improvement iterations
        request = { messages: payload, stream: true };
        
        // Add improvement_prompt to request if provided
        if (improvementPrompt) {
          request.improvement_prompt = improvementPrompt;
        }
        
        // Add draft parameters for improvement iterations
        if (draftParams) {
          if (draftParams.contentType) request.content_type = draftParams.contentType;
          if (draftParams.topic) request.topic = draftParams.topic;
          if (draftParams.wordLimit) request.word_limit = draftParams.wordLimit;
          if (draftParams.audienceTone) request.audience_tone = draftParams.audienceTone;
          if (draftParams.outlineDoc) request.outline_doc = draftParams.outlineDoc;
          if (draftParams.supportingDoc) request.supporting_doc = draftParams.supportingDoc;
          if (draftParams.useFactivaResearch !== undefined) request.use_factiva_research = draftParams.useFactivaResearch;
        }
      } else {
        // New format: Structured payload object with all fields
        request = payload;
      }

      this.authenticatedFetch(`${this.apiUrl}/api/v1/tl/pov`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(JSON.parse(data));
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => observer.error(error));
    });
  }

  /**
   * Analyze user satisfaction with generated draft content using LLM backend
   */
  analyzeSatisfaction(request: {
    user_input: string,
    generated_content: string,
    content_type: string,
    topic: string
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/v1/tl/draft-content/analyze-satisfaction`, request);
  }

  // streamConductResearch(messages: Message[], sourceGroups?: string[]): Observable<any> {
  streamConductResearch(formData: FormData): Observable<any> {  
  return new Observable(observer => {
      // const request: any = { messages, stream: true };
      // if (sourceGroups && sourceGroups.length > 0) {
      //   request.source_groups = sourceGroups;
      // }

      this.authenticatedFetchFormData(`${this.apiUrl}/api/v1/tl/conduct-research`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(JSON.parse(data));
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => observer.error(error));
    });
  }

  /** Stream edit content workflow with specified editor types */
  streamEditContent(
    messages: Message[], 
    editorTypes?: string[], 
    temperature: number = 0,
    maxTokens: number = 32000
  ): Observable<any> {
    if (temperature < 0 || temperature > 2) {
      console.warn(`[ChatService] Temperature ${temperature} is outside valid range (0.0-2.0), using default 0`);
      temperature = 0;
    }
    
    if (maxTokens < 1000 || maxTokens > 128000) {
      console.warn(`[ChatService] maxTokens ${maxTokens} is outside valid range (1000-128000), using default 32000`);
      maxTokens = 32000;
    }
    
    return new Observable(observer => {
      const request: any = { 
        messages, 
        stream: true,
        editor_types: editorTypes || [],
        temperature: temperature,
        max_tokens: maxTokens
      };
// streamEditContent(messages: Message[], editorTypes?: string[], temperature: number = 0.0): Observable<any> {
//     return new Observable(observer => {
//       const request = { 
//         messages, 
//         stream: true,
//         editor_types: editorTypes || [],
//         temperature: temperature
//       };

      this.authenticatedFetch(`${this.apiUrl}/api/v1/tl/edit-content`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(JSON.parse(data));
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => observer.error(error));
    });
  }

  // Accept either an array of messages OR a structured payload { messages, original_content, services, stream }
  streamRefineContent(payload: Message[] | { messages: Message[]; original_content?: string; services?: any[]; stream?: boolean }): Observable<any> {
    return new Observable(observer => {
      const request = Array.isArray(payload)
        ? { messages: payload, stream: true }
        : { messages: payload.messages || [], original_content: (payload as any).original_content, services: (payload as any).services, stream: (payload as any).stream ?? true };

      this.authenticatedFetch(`${this.apiUrl}/api/v1/tl/refine-content`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(JSON.parse(data));
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => observer.error(error));
    });
  }

  streamFormatTranslator(params: {
    content: string;
    uploadedFile: File;
    sourceFormat: string;
    targetFormat: string;
    customization?: string;
    podcastStyle?: string;
    speaker1Name?: string;
    speaker1Voice?: string;
    speaker1Accent?: string;
    speaker2Name?: string;
    speaker2Voice?: string;
    speaker2Accent?: string;
    wordLimit?: string;
  }): Observable<any> {
    return new Observable(observer => {
      const formData = new FormData();
      formData.append('content', params.content);
      formData.append('source_format', params.sourceFormat);
      formData.append('target_format', params.targetFormat);
      formData.append('uploadedFile', params.uploadedFile, params.uploadedFile.name);
      
      if (params.customization) formData.append('customization', params.customization);
      if (params.podcastStyle) formData.append('podcast_style', params.podcastStyle);
      if (params.speaker1Name !== undefined) formData.append('speaker1_name', params.speaker1Name);
      if (params.speaker1Voice !== undefined) formData.append('speaker1_voice', params.speaker1Voice);
      if (params.speaker1Accent !== undefined) formData.append('speaker1_accent', params.speaker1Accent);
      if (params.speaker2Name !== undefined) formData.append('speaker2_name', params.speaker2Name);
      if (params.speaker2Voice !== undefined) formData.append('speaker2_voice', params.speaker2Voice);
      if (params.speaker2Accent !== undefined) formData.append('speaker2_accent', params.speaker2Accent);
      if (params.wordLimit) formData.append('word_limit', params.wordLimit);

      console.log('[ChatService] Format Translator Request:', {
        sourceFormat: params.sourceFormat,
        targetFormat: params.targetFormat,
        hasSpeaker1: !!params.speaker1Name,
        hasSpeaker2: !!params.speaker2Name
      });

      this.authenticatedFetchFormData(`${this.apiUrl}/api/v1/tl/format-translator`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          console.error('[ChatService] Format translator response not OK:', response.status, response.statusText);
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        console.log(response.body)

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            console.log(buffer)

            if(buffer.includes("placemat"))
            {
              const parsed = JSON.parse(buffer);
               observer.next({ type: 'placemat', content: buffer, url:parsed.download_url, status:parsed.status});

            }
           

            lines.forEach(line => {
              console.log(lines)
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                console.log(data)
                if (data) {
                  try {
                    const parsed = JSON.parse(data);
                    console.log('[ChatService] Format Translator SSE data:', parsed);
                    observer.next(parsed);
                  } catch (e) {
                    console.error('[ChatService] Error parsing SSE data:', e, 'Raw data:', data);
                    // If parsing fails, try to send as string content
                    observer.next({ type: 'content', content: data });
                  }
                }
                
                  
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => observer.error(error));
    });
  }

  streamSectionUpdate(request: UpdateSectionRequest): Observable<string> {
    return new Observable(observer => {
      this.authenticatedFetch(`${this.apiUrl}/api/v1/tl/update-section`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    if (parsed.content) {
                      observer.next(parsed.content);
                    } else if (parsed.done) {
                      observer.complete();
                    } else if (parsed.error) {
                      observer.error(new Error(parsed.error));
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e, 'Data:', data);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  streamPrepareClientMeeting(
    payload: Message[] | {
      messages: Message[],
      content_type?: string,
      topic?: string,
      word_limit?: string,
      audience_tone?: string,
      outline?: { type: string, content: string },
      supporting_documents?: { content: string },
      research?: any,
      stream: boolean
    },
    improvementPrompt?: string,
    draftParams?: any
  ): Observable<any> {
    return new Observable(observer => {
      let request: any;

      // Check if payload is an array (old format for improvement iterations) or structured object (new format)
      if (Array.isArray(payload)) {
        // Old format: Message[] for improvement iterations
        request = { messages: payload, stream: true };
        
        // Add improvement_prompt to request if provided
        if (improvementPrompt) {
          request.improvement_prompt = improvementPrompt;
        }
        
        // Add draft parameters for improvement iterations
        if (draftParams) {
          if (draftParams.contentType) request.content_type = draftParams.contentType;
          if (draftParams.topic) request.topic = draftParams.topic;
          if (draftParams.wordLimit) request.word_limit = draftParams.wordLimit;
          if (draftParams.audienceTone) request.audience_tone = draftParams.audienceTone;
          if (draftParams.outlineDoc) request.outline_doc = draftParams.outlineDoc;
          if (draftParams.supportingDoc) request.supporting_doc = draftParams.supportingDoc;
          if (draftParams.useFactivaResearch !== undefined) request.use_factiva_research = draftParams.useFactivaResearch;
        }
      } else {
        // New format: Structured payload object with all fields
        request = payload;
      }

      this.authenticatedFetch(`${this.apiUrl}/api/v1/tl/prep-client-meeting`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(JSON.parse(data));
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => observer.error(error));
    });
  }

  streamProposalInsights(
    payload: Message[] | {
      messages: Message[],
      content_type?: string,
      topic?: string,
      word_limit?: string,
      audience_tone?: string,
      outline?: { type: string, content: string },
      supporting_documents?: { content: string },
      research?: any,
      stream: boolean
    },
    improvementPrompt?: string,
    draftParams?: any
  ): Observable<any> {
    return new Observable(observer => {
      let request: any;

      // Check if payload is an array (old format for improvement iterations) or structured object (new format)
      if (Array.isArray(payload)) {
        // Old format: Message[] for improvement iterations
        request = { messages: payload, stream: true };
        
        // Add improvement_prompt to request if provided
        if (improvementPrompt) {
          request.improvement_prompt = improvementPrompt;
        }
        
        // Add draft parameters for improvement iterations
        if (draftParams) {
          if (draftParams.contentType) request.content_type = draftParams.contentType;
          if (draftParams.topic) request.topic = draftParams.topic;
          if (draftParams.wordLimit) request.word_limit = draftParams.wordLimit;
          if (draftParams.audienceTone) request.audience_tone = draftParams.audienceTone;
          if (draftParams.outlineDoc) request.outline_doc = draftParams.outlineDoc;
          if (draftParams.supportingDoc) request.supporting_doc = draftParams.supportingDoc;
          if (draftParams.useFactivaResearch !== undefined) request.use_factiva_research = draftParams.useFactivaResearch;
        }
      } else {
        // New format: Structured payload object with all fields
        request = payload;
      }

      this.authenticatedFetch(`${this.apiUrl}/api/v1/tl/proposal_insights`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(JSON.parse(data));
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => observer.error(error));
    });
  }

  streamIndustryInsights(
    payload: Message[] | {
      messages: Message[],
      content_type?: string,
      topic?: string,
      word_limit?: string,
      audience_tone?: string,
      outline?: { type: string, content: string },
      supporting_documents?: { content: string },
      research?: any,
      stream: boolean
    },
    improvementPrompt?: string,
    draftParams?: any
  ): Observable<any> {
    return new Observable(observer => {
      let request: any;

      // Check if payload is an array (old format for improvement iterations) or structured object (new format)
      if (Array.isArray(payload)) {
        // Old format: Message[] for improvement iterations
        request = { messages: payload, stream: true };
        
        // Add improvement_prompt to request if provided
        if (improvementPrompt) {
          request.improvement_prompt = improvementPrompt;
        }
        
        // Add draft parameters for improvement iterations
        if (draftParams) {
          if (draftParams.contentType) request.content_type = draftParams.contentType;
          if (draftParams.topic) request.topic = draftParams.topic;
          if (draftParams.wordLimit) request.word_limit = draftParams.wordLimit;
          if (draftParams.audienceTone) request.audience_tone = draftParams.audienceTone;
          if (draftParams.outlineDoc) request.outline_doc = draftParams.outlineDoc;
          if (draftParams.supportingDoc) request.supporting_doc = draftParams.supportingDoc;
          if (draftParams.useFactivaResearch !== undefined) request.use_factiva_research = draftParams.useFactivaResearch;
        }
      } else {
        // New format: Structured payload object with all fields
        request = payload;
      }

      this.authenticatedFetch(`${this.apiUrl}/api/v1/tl/industry_insights`, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function readStream(): any {
          return reader?.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
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
                    observer.next(JSON.parse(data));
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            });

            return readStream();
          });
        }

        return readStream();
      })
      .catch(error => observer.error(error));
    });
  }

  // exportToWord(data: { content: string; title: string }): Observable<Blob> {
  //   return this.http.post(`${this.apiUrl}/api/v1/export/word`, data, {

  exportToWord(data: { content: string; title: string; content_type?: string }): Observable<Blob> {
        return this.http.post(`${this.apiUrl}/api/v1/export/word`, data, {
      responseType: 'blob'
    });
  }

  exportToPDF(data: { content: string; title: string }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/api/v1/export/pdf-pwc`, data, {
      responseType: 'blob'
    });
  }
  exportPdfWithBullets(payload: {content: string;title: string;}): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/api/v1/export/pdf-pwc-bullets`,payload,
      { responseType: 'blob' }
    );
  }
  exportToText(data: { content: string; title: string }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/api/v1/export/text`, data, {
      responseType: 'blob'
    });
  }


  exportEditContentToWord(data: { content: string; title: string }): Observable<Blob> {
      return this.http.post(`${this.apiUrl}/api/v1/export/edit-content/word`, data, {
        responseType: 'blob'
      });
    }


  exportEditContentToPDF(data: { content: string; title: string }): Observable<Blob> {
      return this.http.post(`${this.apiUrl}/api/v1/export/edit-content/pdf`, data, {
        responseType: 'blob'
      });
    }


  // ===== Chat History Management Methods =====
  // These methods manage chat history retrieval from database (lazy loading)

  /**
   * Get all chat session summaries for a user.
   * Returns only titles and metadata, NOT full conversations.
   * @param userId User email or identifier
   * @param source Optional source filter (Chat, DDDC, Thought_Leadership, etc.)
   * @returns List of session summaries
   */
  getUserSessions(userId: string, source?: string): Observable<ChatSessionSummary[]> {
    let url = `${this.apiUrl}/api/v1/chat-history/sessions?user_id=${encodeURIComponent(userId)}`;
    if (source) {
      url += `&source=${encodeURIComponent(source)}`;
    }
    return this.http.get<ChatSessionSummary[]>(url);
  }

  /**
   * Get full conversation for a specific session.
   * Call this only when user clicks on a session to load the conversation.
   * @param sessionId Session identifier
   * @returns Complete session data with conversation messages
   */
  getSessionConversation(sessionId: string): Observable<ChatSessionDetail> {
    return this.http.get<ChatSessionDetail>(
      `${this.apiUrl}/api/v1/chat-history/sessions/${encodeURIComponent(sessionId)}`
    );
  }

  /**
   * Delete a chat session (soft delete).
   * @param sessionId Session identifier
   * @returns Deletion confirmation
   */
  deleteSession(sessionId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/api/v1/chat-history/sessions/${encodeURIComponent(sessionId)}`
    );
  }
  exportWordStandalone(payload: {
  content: string;
  title: string;
  content_type?: string;
}): Observable<Blob> {
  return this.http.post(
    `${this.apiUrl}/api/v1/export/word-standalone`,
    payload,
    { responseType: 'blob' }
  );
}
exportWordUI(data: { content: string; title: string }): Observable<Blob> {
  return this.http.post(
    `${this.apiUrl}/api/v1/export/word-ui`,
    data,
    { responseType: 'blob' }
  );
}

exportPdfStandalone(payload: {
  content: string;
  title: string;
}): Observable<Blob> {
  return this.http.post(
    `${this.apiUrl}/api/v1/export/pdf-pwc`,
    payload,
    { responseType: 'blob' }
  );
}
}

