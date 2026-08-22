import uuid
from typing import Any, Generic, List, Optional, Type, TypeVar
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic async repository providing standard CRUD operations, pagination, and filters."""
    
    def __init__(self, model: Type[ModelType], session: AsyncSession) -> None:
        self.model = model
        self.session = session

    async def get(self, id: Any, for_update: bool = False) -> Optional[ModelType]:
        """Retrieves a single record by primary key."""
        stmt = select(self.model).where(self.model.id == id)
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[dict] = None,
        sort_by: Optional[str] = None,
        sort_desc: bool = False
    ) -> List[ModelType]:
        """Retrieves multiple records supporting offset/limit pagination, filtering, and sorting."""
        stmt = select(self.model)
        
        # Apply filters
        if filters:
            for attr, val in filters.items():
                if hasattr(self.model, attr):
                    stmt = stmt.where(getattr(self.model, attr) == val)

        # Apply sorting
        if sort_by and hasattr(self.model, sort_by):
            sort_attr = getattr(self.model, sort_by)
            if sort_desc:
                stmt = stmt.order_by(sort_attr.desc())
            else:
                stmt = stmt.order_by(sort_attr.asc())
        
        # Apply offset and limit
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, obj_in: dict) -> ModelType:
        """Persists a new database record."""
        db_obj = self.model(**obj_in)
        self.session.add(db_obj)
        return db_obj

    async def update(self, db_obj: ModelType, obj_in: dict) -> ModelType:
        """Updates properties of an existing database record."""
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.session.add(db_obj)
        return db_obj

    async def delete(self, id: Any) -> bool:
        """Deletes a database record by primary key."""
        stmt = delete(self.model).where(self.model.id == id)
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def count(self, filters: Optional[dict] = None) -> int:
        """Counts records matching filters."""
        stmt = select(func.count()).select_from(self.model)
        if filters:
            for attr, val in filters.items():
                if hasattr(self.model, attr):
                    stmt = stmt.where(getattr(self.model, attr) == val)
        result = await self.session.execute(stmt)
        return result.scalar() or 0
