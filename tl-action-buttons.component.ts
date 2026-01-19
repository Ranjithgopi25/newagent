export interface Source {
  number: number;
  url: string;
  title: string;
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

export interface EditorProgress {
  current: number;
  total: number;
  currentEditor: string;
}

export interface EditorProgressItem {
  editorId: string;
  editorName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  current?: number;
  total?: number;
}

export interface ParagraphEdit {
  index: number;
  original: string;
  edited: string;
  tags: string[];
  approved: boolean | null;
  autoApproved?: boolean;
  block_type?: string;
  level?: number;
  // Allow editorial feedback buckets by editor type (keys are editor type strings)
  editorial_feedback?: {
    development?: EditorialFeedbackItem[];
    content?: EditorialFeedbackItem[];
    copy?: EditorialFeedbackItem[];
    line?: EditorialFeedbackItem[];
    brand?: EditorialFeedbackItem[];
    [key: string]: EditorialFeedbackItem[] | undefined;
  };
  displayOriginal?: string;
  displayEdited?: string;
}

export interface EditorialFeedbackItem {
  issue: string;
  fix: string;
  impact: string;
  rule_used?: string;
  rule?: string;
  priority: 'Critical' | 'Important' | 'Enhancement';
  approved?: boolean | null;
}

export interface ContentTypeOption {
 id: string;
 name: string;
 icon: string;
 description: string;
 selected: boolean;
}

export interface EditWorkflowMetadata {
  step: 'awaiting_editors' | 'awaiting_content' | 'processing' | 'awaiting_approval';
  showEditorSelection?: boolean;
  showFileUpload?: boolean;  // Show file upload component (for Step 2 - awaiting_content)
  showCancelButton?: boolean;
  showSimpleCancelButton?: boolean;  // Show simple "Cancel" button (not "Cancel Workflow")
  cancelButtonDisabled?: boolean;  // Disable cancel button (for processing step)
  editorOptions?: EditorOption[];
  editorProgress?: EditorProgress;  // Progress indicator for sequential editor processing
  editorProgressList?: EditorProgressItem[];  // List of all editors with their status
  paragraphEdits?: ParagraphEdit[];  // Paragraph-level edits for approval

  // Sequential workflow fields
  threadId?: string | null;  // Track sequential workflow thread
  currentEditor?: string | null;  // Current editor ID
  editorOrder?: string[];  // Normalized editor order (source of truth for timeline display)
  isSequentialMode?: boolean;  // Flag for sequential vs parallel mode
  isLastEditor?: boolean;  // Whether current editor is the last one
  currentEditorIndex?: number;  // Current editor position (0-based)
  totalEditors?: number;  // Total number of editors
  isGeneratingNextEditor?: boolean;
  finalOutputGenerated?: boolean;

}

export interface DraftWorkflowMetadata {
 step: 'idle' | 'awaiting_topic' | 'awaiting_content_type' | 'processing';
 topic?: string;
 contentType?: string;
 wordLimit?: string;
 audienceTone?: string;
 showContentTypeSelection?: boolean;  // Show content type selection component
 showCancelButton?: boolean;
 showSimpleCancelButton?: boolean;  // Show simple "Cancel" button
 cancelButtonDisabled?: boolean;  // Disable cancel button (for processing step)
 contentTypeOptions?: ContentTypeOption[];  // Available content type options
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  downloadUrl?: string;
  downloadFilename?: string;
  previewUrl?: string;
  actionInProgress?: string;
  isStreaming?: boolean;
  isHtml?: boolean;  // Flag to indicate content is already HTML formatted
  sources?: Source[];  // For research citations
  thoughtLeadership?: ThoughtLeadershipMetadata;  // For TL content with actions
  marketIntelligence?: MarketIntelligenceMetadata;  // For MI content with actions
  editWorkflow?: EditWorkflowMetadata;  // For Edit Content workflow
  draftWorkflow?: DraftWorkflowMetadata;
  actionButtons?: ActionButton[];  // For interactive button options
  flowType?: 'ppt' | 'thought-leadership' | 'market-intelligence';  // Track which flow generated this message
}

export interface ActionButton {
  label: string;
  action: string;
}

export interface ThoughtLeadershipMetadata {
  contentType: 'article' | 'blog' | 'white_paper' | 'executive_brief' | 'podcast' | 'socialMedia'|'Phoenix_Request' | 'conduct-research'| 'industry-insights' | 'proposal-inputs'|'prep-meet'|'pov'| 'edit-content';
  topic: string;
  fullContent: string;  // Store the complete content for downloads and Canvas
  showActions: boolean;  // Whether to show action buttons
  podcastAudioUrl?: string;  // For podcast playback
  podcastFilename?: string;  // For podcast download
  // Optional structural metadata for edit-content exports
  block_types?: Array<{ index: number; type: string; level?: number }>;
  paragraphEdits?: ParagraphEdit[];
  // Formatted HTML content (from formatFinalArticleWithBlockTypes) for export reuse
  formattedContent?: string;
}
export interface MarketIntelligenceMetadata {
  contentType: 'article' | 'blog' | 'white_paper' | 'executive_brief' | 'podcast' | 'socialMedia'| 'conduct-research' | 'industry-insights' | 'proposal-inputs'|'prep-meet'|'pov';
  topic: string;
  fullContent: string;  // Store the complete content for downloads
  showActions: boolean;  // Whether to show action buttons
}

export interface ChatRequest {
  messages: Message[];
  stream: boolean;
  user_id?: string;
  session_id?: string;
  thread_id?: string;
  source?: string;
}

export interface DraftRequest {
  topic: string;
  objective: string;
  audience: string;
  additional_context?: string;
}

export interface ThoughtLeadershipRequest {
  operation: string;
  topic?: string;
  perspective?: string;
  target_audience?: string;
  document_text?: string;
  target_format?: string;
  additional_context?: string;
  reference_urls?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
  lastModified: Date;
}

export interface ResearchRequest {
  query: string;
  focus_areas?: string[];
  additional_context?: string;
}

export interface ArticleRequest {
  topic: string;
  content_type: string;
  desired_length: number;
  tone: string;
  outline_text?: string;
  additional_context?: string;
}

export interface BestPracticesRequest {
  categories?: string[];
}

export interface PodcastRequest {
  customization?: string;
}
