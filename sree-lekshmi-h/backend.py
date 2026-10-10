from fastapi import Request, FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import hashlib
import secrets
import hmac
from dotenv import load_dotenv

from google import genai
from datetime import datetime, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.extension import _rate_limit_exceeded_handler
from jose import jwt, JWTError
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Users are stored in the database given by DATABASE_URL (use a free hosted
# Postgres such as Neon or Supabase so accounts survive Render restarts).
# Without DATABASE_URL it falls back to a local SQLite file (local testing only).
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///users.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

with engine.begin() as conn:
    conn.execute(text(
        "CREATE TABLE IF NOT EXISTS users ("
        "username VARCHAR(30) PRIMARY KEY, "
        "salt VARCHAR(64) NOT NULL, "
        "password_hash VARCHAR(128) NOT NULL)"
    ))

# app must be created before anything uses it (middleware, routes, etc.)
app = FastAPI(title="IdeaForge")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)

app.add_middleware(SlowAPIMiddleware)

# Single CORS registration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ---------------- Models ----------------

class HackathonRequest(BaseModel):
    theme: str = Field(..., min_length=3)
    skills: List[str]
    team_size: int = Field(..., ge=1, le=10)
    experience: str
    hours: int = Field(..., ge=1)
    requirements: Optional[str] = None


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str

def hash_password(password: str, salt_hex: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt_hex), 200_000
    ).hex()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")

        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return username

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@app.get("/")
def home():
    return {
        "message": "IdeaForge Backend Running"
    }


@app.post("/register", status_code=201)
@limiter.limit("5/minute")
def register(request: Request, user: RegisterRequest):
    username = user.username.strip().lower()
    salt = secrets.token_hex(16)
    password_hash = hash_password(user.password, salt)

    try:
        with engine.begin() as conn:
            conn.execute(
                text("INSERT INTO users (username, salt, password_hash) "
                     "VALUES (:u, :s, :h)"),
                {"u": username, "s": salt, "h": password_hash},
            )
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Username already taken")

    token = create_access_token({"sub": username})

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@app.post("/login")
@limiter.limit("10/minute")
def login(request: Request, user: LoginRequest):
    username = user.username.strip().lower()

    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT salt, password_hash FROM users WHERE username = :u"),
            {"u": username},
        ).fetchone()

    # Same error for "no such user" and "wrong password"
    if row is None or not hmac.compare_digest(
        hash_password(user.password, row[0]), row[1]
    ):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": username})

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@app.post("/generate")
@limiter.limit("5/minute")
def generate(
    request: Request,
    data: HackathonRequest,
    username: str = Depends(verify_token)
):
    prompt = f"""
You are an expert hackathon mentor.

Generate EXACTLY 5 unique hackathon ideas.

Theme:
{data.theme}

Skills:
{', '.join(data.skills)}

Team Size:
{data.team_size}

Experience:
{data.experience}

Available Time:
{data.hours} hours

Additional Requirements:
{data.requirements or "None"}

IMPORTANT FORMATTING RULES:

• Return ONLY the hackathon ideas.
• Do NOT write introductions, conclusions, notes, or explanations.
• Do NOT write sentences like "Here are 5 ideas..." or "Hope this helps."
• Do NOT use Markdown symbols such as #, ##, **, *, ---, or numbered headings.
• Use clean spacing between ideas.
• Use emojis to make the response visually appealing.
• Make every section easy to read.

For each idea use exactly this format:

🚀 Project Name: <name>

🎯 Problem
<problem>

💡 Solution
<solution>

🛠 Tech Stack
<tech stack>

✨ MVP Features
• feature 1
• feature 2
• feature 3

📊 Difficulty
Easy / Medium / Hard

🎤 Elevator Pitch
<pitch>


Leave one blank line between each section and two blank lines between projects.

Do not output anything except the five formatted ideas.
"""
    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )

        return {
            "ideas": response.text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))