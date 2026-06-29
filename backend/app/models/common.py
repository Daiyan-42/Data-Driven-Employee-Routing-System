from pydantic import BaseModel


class Pagination(BaseModel):
    current_page: int
    total_pages: int
    page_size: int
    total_items: int


def paginate(items: list, page: int, limit: int) -> tuple[list, Pagination]:
    page = max(page, 1)
    limit = max(limit, 1)
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    total_pages = max(1, (total + limit - 1) // limit)

    return items[start:end], Pagination(
        current_page=page,
        total_pages=total_pages,
        page_size=limit,
        total_items=total,
    )
