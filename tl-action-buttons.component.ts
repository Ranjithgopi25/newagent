from pydantic import BaseModel
from typing import Optional

from typing import Optional, List

class BlockTypeInfo(BaseModel):
    index: int
    type: str  # title, heading, paragraph, bullet_item
    level: Optional[int] = 0

class ExportRequest(BaseModel):
    content: str
    title: str
    block_types: List[BlockTypeInfo]  # Required for edit content formatting
    format: Optional[str] = None
    subtitle: Optional[str] = None
    content_type: Optional[str] = None  # article, whitepaper, executive-brief, blog
    references: list[dict] | None = None
    client: str | None = None
