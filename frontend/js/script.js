// ======================================
// script.js
// Dark mode, mobile menu, contact form, backend API
// ======================================

const API_BASE_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", function () {
  setupDarkMode();
  setupMobileMenu();
  setupContactForm();
  setupFooterYear();
});


// ======================================
// DARK MODE
// ======================================

function setupDarkMode() {
  const themeToggle = document.getElementById("themeToggle");

  if (!themeToggle) {
    console.log("Theme button not found. Check id='themeToggle'.");
    return;
  }

  const savedTheme = localStorage.getItem("portfolioTheme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️";
  } else {
    document.body.classList.remove("dark-mode");
    themeToggle.textContent = "🌙";
  }

  themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    const isDarkMode = document.body.classList.contains("dark-mode");

    if (isDarkMode) {
      localStorage.setItem("portfolioTheme", "dark");
      themeToggle.textContent = "☀️";
    } else {
      localStorage.setItem("portfolioTheme", "light");
      themeToggle.textContent = "🌙";
    }
  });
}


// ======================================
// MOBILE MENU
// ======================================

function setupMobileMenu() {
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const allNavLinks = document.querySelectorAll(".nav-link");

  if (!menuToggle || !navLinks) {
    return;
  }

  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("active");

    if (navLinks.classList.contains("active")) {
      menuToggle.textContent = "✖";
    } else {
      menuToggle.textContent = "☰";
    }
  });

  allNavLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.classList.remove("active");
      menuToggle.textContent = "☰";
    });
  });
}


// ======================================
// CONTACT FORM
// ======================================

function setupContactForm() {
  const contactForm = document.getElementById("contactForm");

  if (!contactForm) {
    return;
  }

  contactForm.addEventListener("submit", handleContactFormSubmit);
}


async function handleContactFormSubmit(event) {
  event.preventDefault();

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const messageInput = document.getElementById("message");
  const submitButton = document.getElementById("submitMessageBtn");

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const message = messageInput.value.trim();

  if (name === "" || email === "" || message === "") {
    showStatusMessage("Please fill in all fields.", "error");
    return;
  }

  if (!isValidEmail(email)) {
    showStatusMessage("Please enter a valid email address.", "error");
    return;
  }

  const messageData = {
    name: name,
    email: email,
    message: message
  };

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messageData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Something went wrong");
    }

    showStatusMessage("Message sent successfully!", "success");

    nameInput.value = "";
    emailInput.value = "";
    messageInput.value = "";

  } catch (error) {
    const localMessage = {
      id: Date.now(),
      name: name,
      email: email,
      message: message,
      date: new Date().toLocaleString()
    };

    saveMessageToLocalStorage(localMessage);

    showStatusMessage(
      "Backend is not running. Message saved only in this browser.",
      "warning"
    );

    nameInput.value = "";
    emailInput.value = "";
    messageInput.value = "";

  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Send Message";
    }
  }
}


function saveMessageToLocalStorage(message) {
  const savedMessages = JSON.parse(localStorage.getItem("portfolioMessages")) || [];

  savedMessages.push(message);

  localStorage.setItem("portfolioMessages", JSON.stringify(savedMessages));
}


function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(email);
}


function showStatusMessage(text, type) {
  let statusMessage = document.getElementById("statusMessage");

  if (!statusMessage) {
    statusMessage = document.createElement("p");
    statusMessage.id = "statusMessage";

    const contactForm = document.getElementById("contactForm");

    if (contactForm) {
      contactForm.appendChild(statusMessage);
    }
  }

  statusMessage.textContent = text;
  statusMessage.className = "";

  if (type === "success") {
    statusMessage.classList.add("success-message");
  } else if (type === "error") {
    statusMessage.classList.add("error-message");
  } else if (type === "warning") {
    statusMessage.classList.add("warning-message");
  }

  setTimeout(function () {
    statusMessage.textContent = "";
    statusMessage.className = "";
  }, 5000);
}


// ======================================
// FOOTER YEAR
// ======================================

function setupFooterYear() {
  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}