"""FastAPI dependencies: database sessions, authentication, etc."""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.core.security import verify_token


def get_db() -> Generator[Session, None, None]:
    """
    Dependency для получения сессии базы данных
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependency для получения текущего пользователя из JWT токена
    Опциональная аутентификация для MVP
    """
    if not authorization:
        # Для MVP возвращаем анонимного пользователя (user_id=None для совместимости с UUID колонками)
        return {"user_id": None, "username": "anonymous"}
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.split(" ")[1]
    
    # Для MVP и тестирования - принимаем mock-token
    if token == "mock-token":
        return {"user_id": None, "username": "web-user"}
    
    # Для реальных токенов - валидация
    payload = verify_token(token)
    
    return {
        "user_id": payload.get("sub"),
        "username": payload.get("username"),
    }


def verify_api_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """
    Dependency для проверки API ключа
    Опциональное для MVP
    """
    if not x_api_key:
        return False
    
    # TODO: Проверка API ключа в базе данных
    # Для MVP просто возвращаем True
    return True
