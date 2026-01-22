class Citation(BaseModel):
    """Citation model with text and optional URL link"""
    text: str = Field(description="Citation text or title")
    url: Optional[str] = Field(default=None, description="URL link for the citation")

class ResearchSignals(BaseModel):
    facts: List[str] = Field(default_factory=list)
    statistics: List[str] = Field(default_factory=list)
    trends: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list, description="List of citations with text and optional URL links")
