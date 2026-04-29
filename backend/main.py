from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime
import json
import time


app = FastAPI()


# For learning/deployment testing, allow frontend requests from anywhere.
# Later, we can restrict this to your real Vercel website URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


BASE_DIR = Path(__file__).parent
MESSAGES_FILE = BASE_DIR / "messages.json"


class ContactMessage(BaseModel):
    name: str
    email: str
    message: str


def create_messages_file_if_missing():
    if not MESSAGES_FILE.exists():
        with open(MESSAGES_FILE, "w", encoding="utf-8") as file:
            json.dump([], file, indent=4)


def read_messages():
    create_messages_file_if_missing()

    with open(MESSAGES_FILE, "r", encoding="utf-8") as file:
        try:
            return json.load(file)
        except json.JSONDecodeError:
            return []


def save_messages(messages):
    with open(MESSAGES_FILE, "w", encoding="utf-8") as file:
        json.dump(messages, file, indent=4)


@app.get("/")
def home():
    return {
        "message": "Portfolio backend is running successfully"
    }


@app.get("/api/messages")
def get_messages():
    messages = read_messages()
    return messages


@app.post("/api/messages")
def add_message(contact_message: ContactMessage):
    name = contact_message.name.strip()
    email = contact_message.email.strip()
    message = contact_message.message.strip()

    if name == "":
        raise HTTPException(status_code=400, detail="Name is required")

    if email == "":
        raise HTTPException(status_code=400, detail="Email is required")

    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    if message == "":
        raise HTTPException(status_code=400, detail="Message is required")

    messages = read_messages()

    new_message = {
        "id": int(time.time() * 1000),
        "name": name,
        "email": email,
        "message": message,
        "date": datetime.now().strftime("%d %B %Y, %I:%M %p")
    }

    messages.append(new_message)
    save_messages(messages)

    return {
        "success": True,
        "message": "Message saved successfully",
        "data": new_message
    }


@app.delete("/api/messages/{message_id}")
def delete_message(message_id: int):
    messages = read_messages()

    updated_messages = []
    found = False

    for message in messages:
        if message.get("id") == message_id:
            found = True
        else:
            updated_messages.append(message)

    if not found:
        raise HTTPException(status_code=404, detail="Message not found")

    save_messages(updated_messages)

    return {
        "success": True,
        "message": "Message deleted successfully"
    }