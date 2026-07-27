"""CSV parsing + validation for review uploads.

Contract (docs/api-spec.md #6): header `author,rating,text,created_at`;
rating 1–5; created_at ISO-8601. Missing columns → 400; bad rows → 422 with
row numbers; row count over the caller's tier cap → 413 (raised by the API).
"""
import csv
import io
from datetime import datetime, timezone

from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator

REQUIRED_COLUMNS = ["author", "rating", "text", "created_at"]


class ReviewRow(BaseModel):
    author: str = Field(min_length=1, max_length=120)
    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=1)
    created_at: datetime

    @field_validator("author", "text", mode="before")
    @classmethod
    def strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("rating", mode="before")
    @classmethod
    def to_int(cls, v):
        try:
            return int(float(v))
        except (TypeError, ValueError):
            return v

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_dt(cls, v):
        if isinstance(v, str):
            try:
                dt = datetime.fromisoformat(v.strip())
            except ValueError:
                return v
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        return v


def parse_reviews_csv(content: bytes) -> list[ReviewRow]:
    try:
        text_stream = io.StringIO(content.decode("utf-8-sig"))
    except UnicodeDecodeError:
        raise HTTPException(400, detail="File is not valid UTF-8 CSV")

    reader = csv.DictReader(text_stream)
    if reader.fieldnames is None:
        raise HTTPException(400, detail="CSV file is empty")

    columns = [c.strip().lower() for c in reader.fieldnames]
    missing = [c for c in REQUIRED_COLUMNS if c not in columns]
    if missing:
        raise HTTPException(400, detail=f"CSV is missing required columns: {', '.join(missing)}")

    rows: list[ReviewRow] = []
    errors: list[str] = []
    for line_no, raw in enumerate(reader, start=2):  # 2 = first data line in the file
        normalized = {(k or "").strip().lower(): (v or "") for k, v in raw.items()}
        if not any(normalized.values()):
            continue  # skip blank lines
        try:
            rows.append(ReviewRow(**{c: normalized.get(c, "") for c in REQUIRED_COLUMNS}))
        except Exception as exc:
            first = getattr(exc, "errors", lambda: [{}])()[0]
            field = ".".join(str(p) for p in first.get("loc", [])) or "row"
            errors.append(f"Row {line_no}: invalid {field} ({first.get('msg', 'validation error')})")

    if errors:
        raise HTTPException(422, detail="; ".join(errors[:10]))
    if not rows:
        raise HTTPException(400, detail="CSV contains no data rows")
    return rows
