// ======================================
// message.js
// Shows messages from Python backend
// Falls back to localStorage if backend is unavailable
// ======================================


const API_BASE_URL = "http://127.0.0.1:8000";

let currentMessageSource = "backend";


document.addEventListener("DOMContentLoaded", function () {
  loadMessages();

  const refreshBtn = document.getElementById("refreshBtn");
  const clearLocalBtn = document.getElementById("clearLocalBtn");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadMessages);
  }

  if (clearLocalBtn) {
    clearLocalBtn.addEventListener("click", clearLocalMessages);
  }
});


// ======================================
// LOAD MESSAGES
// ======================================

async function loadMessages() {
  const messageContainer = document.getElementById("messageContainer");
  const messageSource = document.getElementById("messageSource");

  messageContainer.innerHTML = "<p>Loading messages...</p>";

  try {
    const response = await fetch(`${API_BASE_URL}/api/messages`);

    if (!response.ok) {
      throw new Error("Backend error");
    }

    const messages = await response.json();

    currentMessageSource = "backend";

    if (messageSource) {
      messageSource.textContent = "Showing messages from Python backend.";
      messageSource.className = "message-source backend-source";
    }

    displayMessages(messages);

  } catch (error) {
    const localMessages = JSON.parse(localStorage.getItem("portfolioMessages")) || [];

    currentMessageSource = "local";

    if (messageSource) {
      messageSource.textContent = "Backend is not running. Showing messages saved only in this browser.";
      messageSource.className = "message-source local-source";
    }

    displayMessages(localMessages);
  }
}


// ======================================
// DISPLAY MESSAGES
// ======================================

function displayMessages(messages) {
  const messageContainer = document.getElementById("messageContainer");
  const totalMessages = document.getElementById("totalMessages");

  messageContainer.innerHTML = "";

  if (!Array.isArray(messages)) {
    messages = [];
  }

  totalMessages.textContent = messages.length;

  if (messages.length === 0) {
    const emptyBox = document.createElement("div");
    emptyBox.classList.add("empty-message");

    emptyBox.innerHTML = `
      <h3>No messages yet</h3>
      <p>When someone sends a message from your portfolio, it will appear here.</p>
    `;

    messageContainer.appendChild(emptyBox);
    return;
  }

  const sortedMessages = [...messages].sort(function (a, b) {
    return Number(b.id) - Number(a.id);
  });

  sortedMessages.forEach(function (message) {
    const messageCard = document.createElement("div");
    messageCard.classList.add("message-card");

    const messageTop = document.createElement("div");
    messageTop.classList.add("message-top");

    const senderName = document.createElement("h3");
    senderName.textContent = message.name || "Unknown";

    const messageDate = document.createElement("span");
    messageDate.textContent = message.date || "No date";

    messageTop.appendChild(senderName);
    messageTop.appendChild(messageDate);


    const emailText = document.createElement("p");
    emailText.classList.add("message-email");

    const strongText = document.createElement("strong");
    strongText.textContent = "Email: ";

    const emailLink = document.createElement("a");
    emailLink.href = `mailto:${message.email || ""}`;
    emailLink.textContent = message.email || "No email";

    emailText.appendChild(strongText);
    emailText.appendChild(emailLink);


    const messageText = document.createElement("p");
    messageText.classList.add("message-text");
    messageText.textContent = message.message || "";


    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-message-btn");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete Message";

    deleteButton.addEventListener("click", function () {
      deleteMessage(message.id);
    });


    messageCard.appendChild(messageTop);
    messageCard.appendChild(emailText);
    messageCard.appendChild(messageText);
    messageCard.appendChild(deleteButton);

    messageContainer.appendChild(messageCard);
  });
}


// ======================================
// DELETE MESSAGE
// ======================================

async function deleteMessage(messageId) {
  const confirmDelete = confirm("Are you sure you want to delete this message?");

  if (!confirmDelete) {
    return;
  }

  if (currentMessageSource === "backend") {
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Could not delete message");
      }

      loadMessages();

    } catch (error) {
      alert("Could not delete message from backend.");
    }

  } else {
    let messages = JSON.parse(localStorage.getItem("portfolioMessages")) || [];

    messages = messages.filter(function (message) {
      return message.id !== messageId;
    });

    localStorage.setItem("portfolioMessages", JSON.stringify(messages));

    loadMessages();
  }
}


// ======================================
// CLEAR LOCAL MESSAGES
// ======================================

function clearLocalMessages() {
  const confirmClear = confirm("Are you sure you want to clear local messages?");

  if (!confirmClear) {
    return;
  }

  localStorage.removeItem("portfolioMessages");

  loadMessages();
}