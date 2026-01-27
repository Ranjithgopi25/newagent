from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field


BlockType = Literal["title", "heading", "paragraph", "bullet_item"]

EditorName = Literal[
    "development",
    "content",
    "copy",
    "line",
    "brand-alignment"
]


class FeedbackItem(BaseModel):
    issue: str = Field(
        ..., description="Quoted problematic text from ORIGINAL paragraph"
    )
    fix: str = Field(
        ..., description="Replacement text suggested by the editor"
    )
    impact: str = Field(
        ..., description="Why this change matters"
    )
    rule_used: str = Field(
        ..., description="[editor_name] - [Rule Name]"
    )
    priority: Literal["Critical", "Important", "Enhancement"] = "Enhancement"


class DocumentBlock(BaseModel):
    id: str = Field(..., description="Unique id, e.g., 'b1'")
    type: BlockType
    level: int = Field(..., description="0 for title/paragraph, 1–3 for headings")
    text: str = Field(..., description="Exact original text")


class DocumentStructure(BaseModel):
    blocks: List[DocumentBlock]

class SingleEditorFeedback(BaseModel):
    editor: EditorName
    items: List[FeedbackItem]

class BlockEditResult(BaseModel):
    id: str
    type: BlockType
    level: int
    original_text: str
    suggested_text: Optional[str] = None
    has_changes: bool
    feedback_edit: List[SingleEditorFeedback] = Field(default_factory=list)

class ListedBlockEditResult(BaseModel):
    blocks: List[BlockEditResult]

class EditorResult(BaseModel):
    editor_type: EditorName
    blocks: List[BlockEditResult]
    warnings: List[str] = Field(default_factory=list)
    raw_output: Optional[str] = None


class EditorFeedback(BaseModel):
    development: List[FeedbackItem] = Field(default_factory=list)
    content: List[FeedbackItem] = Field(default_factory=list)
    copy: List[FeedbackItem] = Field(default_factory=list)
    line: List[FeedbackItem] = Field(default_factory=list)
    brand: List[FeedbackItem] = Field(default_factory=list)

class ConsolidatedBlockEdit(BaseModel):
    id: str
    type: BlockType
    level: int
    original_text: str
    final_text: str
    editorial_feedback: EditorFeedback


class ConsolidateResult(BaseModel):
    blocks: List[ConsolidatedBlockEdit]


# ---------------------------------------------------------------------
# VALIDATION SCHEMAS FOR DEVELOPMENT EDITOR
# ---------------------------------------------------------------------

class ValidationFeedbackItem(BaseModel):
    """Feedback for a validation criterion: pass/fail, feedback, remarks."""
    passed: bool = Field(..., description="Whether this criterion passed")
    feedback: str = Field(..., description="Feedback for this criterion")
    remarks: str = Field(..., description="Remarks for this criterion")


class DevelopmentEditorValidationResult(BaseModel):
    """Validation result: score and feedback_remarks."""
    score: int = Field(..., ge=0, le=10, description="Overall validation score from 0-10")
    feedback_remarks: List[ValidationFeedbackItem] = Field(
        default_factory=list,
        description="Feedback and remarks for each validation criterion"
    )


class ContentEditorValidationResult(BaseModel):
    """Validation result for Content Editor: score and feedback_remarks."""
    score: int = Field(..., ge=0, le=10, description="Overall validation score from 0-10")
    feedback_remarks: List[ValidationFeedbackItem] = Field(
        default_factory=list,
        description="Feedback and remarks for each validation criterion"
    )
