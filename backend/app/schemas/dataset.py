from datetime import datetime
from typing import Optional

from app.schemas.base import CamelModel, Id


class DatasetOut(CamelModel):
    id: Id
    name: str
    source: str
    product_name: str
    review_count: int
    takeaway: Optional[str] = None
    created_at: datetime


class JobOut(CamelModel):
    id: Id
    dataset_id: Id
    status: str
    progress: int
    error: Optional[str] = None
    created_at: datetime


class UploadResponse(CamelModel):
    dataset: DatasetOut
    job: JobOut
