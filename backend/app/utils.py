from __future__ import annotations

from math import ceil
from uuid import uuid4


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:24]}"


def serialize_model(model) -> dict:
    return model.model_dump(by_alias=False)


def paginate(items: list, page: int, page_size: int) -> dict:
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return {
      "items": items[start:end],
      "page": page,
      "pageSize": page_size,
      "total": total,
      "totalPages": ceil(total / page_size) if total else 0,
    }


def paginate_query(query, page: int, page_size: int) -> tuple[list, dict]:
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    meta = {
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": ceil(total / page_size) if total else 0,
    }
    return items, meta
