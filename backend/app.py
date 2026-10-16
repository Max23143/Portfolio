
"""
Spandan Neupane Portfolio Backend

Run from the project root:

python -m uvicorn backend.app:app --reload
"""

import html
import json
import os
import secrets
import smtplib
import time

from collections import defaultdict, deque
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from threading import Lock
from uuid import uuid4

from dotenv import load_dotenv

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Request,
)

from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import (
    FileResponse,
    HTMLResponse,
)

from fastapi.security import (
    HTTPBasic,
    HTTPBasicCredentials,
)

from fastapi.staticfiles import StaticFiles

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)


# =============================
# PROJECT DIRECTORIES
# =============================

BASE_DIR = Path(__file__).resolve().parent

ROOT_DIR = BASE_DIR.parent

FRONTEND_DIR = ROOT_DIR / "frontend"

DATA_DIR = BASE_DIR / "data"

MESSAGE_FILE = DATA_DIR / "messages.json"


# =============================
# ENVIRONMENT VARIABLES
# =============================

load_dotenv(BASE_DIR / ".env")

# CONTACT_MODE:
# local = save messages on this computer
# smtp = send messages through email

CONTACT_MODE = os.getenv(
    "CONTACT_MODE",
    "local"
).lower()

FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    ""
).strip().rstrip("/")


# =============================
# FASTAPI CONFIGURATION
# =============================

app = FastAPI(
    title="Spandan Portfolio API",
    docs_url=None,
    redoc_url=None,
)

ALLOWED_ORIGINS = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

if FRONTEND_ORIGIN:
    ALLOWED_ORIGINS.append(FRONTEND_ORIGIN)

app.add_middleware(
    CORSMiddleware,

    allow_origins=ALLOWED_ORIGINS,

    allow_credentials=False,

    allow_methods=["POST", "GET"],

    allow_headers=["Content-Type"],
)


# Serve frontend CSS, JS and images

app.mount(
    "/assets",

    StaticFiles(
        directory=FRONTEND_DIR / "assets"
    ),

    name="assets",
)


# =============================
# MESSAGE MODEL
# =============================

class ContactMessage(BaseModel):

    name: str = Field(
        min_length=2,
        max_length=100
    )

    email: EmailStr

    message: str = Field(
        min_length=10,
        max_length=3000
    )


# =============================
# BASIC RATE LIMITING
# =============================

recent_attempts = defaultdict(deque)

rate_lock = Lock()

data_lock = Lock()


def check_rate_limit(ip: str):

    now = time.monotonic()

    with rate_lock:

        attempts = recent_attempts[ip]

        # Remove attempts older than 10 minutes.

        while attempts and now - attempts[0] > 600:
            attempts.popleft()

        # Maximum 5 messages per 10 minutes.

        if len(attempts) >= 5:

            raise HTTPException(
                status_code=429,
                detail=(
                    "Too many messages. "
                    "Please try again later."
                )
            )

        attempts.append(now)


# =============================
# SAVE MESSAGES LOCALLY
# =============================

def save_locally(data: dict):

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with data_lock:

        try:

            if MESSAGE_FILE.exists():

                messages = json.loads(
                    MESSAGE_FILE.read_text(
                        encoding="utf-8"
                    )
                )

            else:
                messages = []

            if not isinstance(messages, list):
                raise ValueError(
                    "Invalid message store"
                )

        except (ValueError, OSError) as exc:

            raise RuntimeError(
                "Cannot read local messages"
            ) from exc

        new_message = {
            "id": str(uuid4()),

            "received_at": datetime.now(
                timezone.utc
            ).isoformat(),

            **data,
        }

        messages.append(new_message)

        temporary = DATA_DIR / (
            "messages-" + str(uuid4()) + ".tmp"
        )

        temporary.write_text(
            json.dumps(
                messages,
                indent=2,
                ensure_ascii=False
            ),
            encoding="utf-8"
        )

        temporary.replace(MESSAGE_FILE)


# =============================
# SEND REAL EMAIL (SMTP)
# =============================

def send_email(data: dict):

    host = os.getenv("SMTP_HOST")

    user = os.getenv("SMTP_USER")

    password = os.getenv("SMTP_PASSWORD")

    sender = os.getenv(
        "SMTP_FROM",
        user
    )

    recipient = os.getenv(
        "CONTACT_TO_EMAIL"
    )

    port = int(
        os.getenv("SMTP_PORT", "587")
    )

    if not all([
        host,
        user,
        password,
        sender,
        recipient
    ]):

        raise RuntimeError(
            "SMTP configuration is incomplete"
        )

    email = EmailMessage()

    email["Subject"] = (
        "New Portfolio Contact Enquiry"
    )

    email["From"] = sender

    email["To"] = recipient

    email["Reply-To"] = data["email"]

    email.set_content(
        f"Name: {data['name']}\n"
        f"Email: {data['email']}\n\n"
        f"Message:\n{data['message']}"
    )

    with smtplib.SMTP(
        host,
        port,
        timeout=12
    ) as smtp:

        smtp.starttls()

        smtp.login(
            user,
            password
        )

        smtp.send_message(email)


# =============================
# WEBSITE ROUTES
# =============================

@app.get("/")
@app.get("/index.html")
def home():

    return FileResponse(
        FRONTEND_DIR / "index.html"
    )


@app.get("/cv.html")
def cv_page():

    return FileResponse(
        FRONTEND_DIR / "cv.html"
    )


@app.get("/messages.html")
def messages_page():

    return FileResponse(
        FRONTEND_DIR / "messages.html"
    )


@app.get("/favicon.ico")
def favicon():

    return FileResponse(
        FRONTEND_DIR / "assets" / "favicon.svg",
        media_type="image/svg+xml"
    )


# =============================
# HEALTH CHECK
# =============================

@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "contact_mode": CONTACT_MODE
    }


# =============================
# CONTACT ENDPOINT
# =============================

@app.post("/api/contact")
def contact(
    payload: ContactMessage,
    request: Request
):

    ip = (
        request.client.host
        if request.client
        else "unknown"
    )

    check_rate_limit(ip)

    data = {
        "name": payload.name.strip(),

        "email": str(payload.email),

        "message": payload.message.strip(),
    }

    if (
        len(data["name"]) < 2
        or len(data["message"]) < 10
    ):

        raise HTTPException(
            status_code=422,
            detail="Please complete the form correctly."
        )

    try:

        if CONTACT_MODE == "local":

            save_locally(data)

            return {
                "ok": True,
                "delivery": "saved_locally"
            }

        if CONTACT_MODE == "smtp":

            send_email(data)

            return {
                "ok": True,
                "delivery": "emailed"
            }

        raise RuntimeError(
            "Unknown contact mode"
        )

    except Exception as exc:

        # Do not expose private settings.

        print(
            "Contact processing error:",
            type(exc).__name__
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Contact service unavailable. "
                "Please email directly."
            )
        ) from None


# =============================
# PRIVATE MESSAGE INBOX
# =============================

admin_basic = HTTPBasic(auto_error=False)


@app.get(
    "/admin/messages",
    response_class=HTMLResponse,
    include_in_schema=False
)
def private_message_inbox(
    credentials: HTTPBasicCredentials | None =
        Depends(admin_basic)
):

    username = os.getenv(
        "ADMIN_USERNAME",
        ""
    )

    password = os.getenv(
        "ADMIN_PASSWORD",
        ""
    )

    # Private inbox is disabled without credentials.

    if (
        not username
        or not password
        or password ==
        "CHANGE_THIS_TO_A_STRONG_UNIQUE_PASSWORD"
    ):

        raise HTTPException(
            status_code=404,
            detail="Private inbox not configured."
        )

    # Password-protected owner access.

    if (
        credentials is None
        or not secrets.compare_digest(
            credentials.username.encode("utf-8"),
            username.encode("utf-8")
        )
        or not secrets.compare_digest(
            credentials.password.encode("utf-8"),
            password.encode("utf-8")
        )
    ):

        raise HTTPException(
            status_code=401,
            detail="Owner login required",
            headers={
                "WWW-Authenticate":
                'Basic realm="Portfolio Private Inbox"'
            }
        )

    # Read private message file.

    try:

        if MESSAGE_FILE.exists():

            messages = json.loads(
                MESSAGE_FILE.read_text(
                    encoding="utf-8"
                )
            )

        else:
            messages = []

        if not isinstance(messages, list):
            messages = []

    except (ValueError, OSError):

        messages = []

    cards = []

    for message in reversed(messages):

        if not isinstance(message, dict):
            continue

        # Escape user content before rendering HTML.

        name = html.escape(
            str(message.get("name", "Unknown"))
        )

        sender = html.escape(
            str(message.get("email", ""))
        )

        date = html.escape(
            str(message.get("received_at", ""))
        )

        body = html.escape(
            str(message.get("message", ""))
        )

        cards.append(
            '<article>'
            '<div class="details">'
            f'<b>{name}</b>'
            f'<span>{date}</span>'
            '</div>'
            f'<p class="sender">{sender}</p>'
            f'<p class="body">{body}</p>'
            '</article>'
        )

    content = (
        "".join(cards)
        if cards
        else "<p>No messages yet.</p>"
    )

    document = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport"
        content="width=device-width, initial-scale=1">

  <meta name="robots"
        content="noindex,nofollow">

  <title>Private Messages | Spandan</title>

  <style>
    * {{ box-sizing: border-box; }}

    body {{
      margin: 0;
      background: #090f1b;
      color: #eaf4fc;
      font: 15px/1.7 Arial, sans-serif;
    }}

    main {{
      width: min(850px, 92%);
      margin: 55px auto;
    }}

    a {{ color: #83f0c6; }}

    h1 {{ font-size: 33px; }}

    article {{
      padding: 22px;
      background: #142035;
      border: 1px solid #30415a;
      border-radius: 13px;
      margin-bottom: 16px;
    }}

    .details {{
      display: flex;
      justify-content: space-between;
      gap: 15px;
      flex-wrap: wrap;
    }}

    .details span,
    .sender {{
      color: #9eaec2;
      font-size: 13px;
    }}

    .body {{
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }}
  </style>
</head>

<body>

  <main>

    <a href="/">
      ← Back to Portfolio
    </a>

    <h1>Private Message Inbox</h1>

    <p>
      Messages saved on your development server.
      Saved messages have not been emailed.
    </p>

    {content}

  </main>

</body>
</html>
"""

    return HTMLResponse(
        document,
        headers={
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow"
        }
    )
