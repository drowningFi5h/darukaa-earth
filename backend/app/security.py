from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

passwords = PasswordHash.recommended()


def set_session(response: Response, user: User):
    token = jwt.encode(
        {"sub": user.id, "exp": datetime.now(UTC) + timedelta(hours=8)},
        settings.jwt_secret,
        algorithm="HS256",
    )
    response.set_cookie(
        "session",
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=28800,
    )


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(
            request.cookies.get("session", ""), settings.jwt_secret, algorithms=["HS256"]
        )
        user = db.get(User, payload["sub"])
    except (jwt.InvalidTokenError, KeyError) as exc:
        raise HTTPException(401, "Please log in to continue") from exc
    if not user:
        raise HTTPException(401, "Please log in to continue")
    return user


def writable(user: User = Depends(current_user)) -> User:
    if user.is_demo:
        raise HTTPException(
            403, "The demo is read-only. Create an account to add your own projects."
        )
    return user
