
"use strict";

/* ============================
   BACKEND CONFIGURATION
============================ */

// If you deploy your FastAPI backend separately,
// replace this with its public HTTPS address.
//
// Example:
// const API_BASE_URL = "https://my-api.example.com";
//
// Leave empty for local development.

const API_BASE_URL = "";

/* ============================
   MOBILE MENU
============================ */

const menuButton = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuButton && navLinks) {

  function closeMenu() {
    navLinks.classList.remove("open");

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  menuButton.addEventListener("click", () => {

    const open = navLinks.classList.toggle("open");

    menuButton.setAttribute(
      "aria-expanded",
      String(open)
    );

  });

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

/* ============================
   AUTOMATIC YEAR
============================ */

const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

/* ============================
   SCROLL ANIMATIONS
============================ */

const items = document.querySelectorAll(".reveal");

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (
  "IntersectionObserver" in window &&
  !reduceMotion
) {

  const observer = new IntersectionObserver(
    entries => {

      entries.forEach(entry => {

        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }

      });

    },
    { threshold: 0.08 }
  );

  items.forEach(item => observer.observe(item));

} else {

  items.forEach(item => {
    item.classList.add("visible");
  });

}

/* ============================
   CONTACT FORM
============================ */

const form = document.getElementById("contactForm");

if (form) {

  const status = document.getElementById("formStatus");

  const sendButton = document.getElementById("sendButton");

  const fallback = document.getElementById("emailFallback");

  function showStatus(message, kind) {

    status.textContent = message;

    status.className = `form-status ${kind}`;

  }

  form.addEventListener("submit", async event => {

    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const name = document
      .getElementById("contactName")
      .value.trim();

    const email = document
      .getElementById("contactEmail")
      .value.trim();

    const message = document
      .getElementById("contactMessage")
      .value.trim();

    if (!name || !email || message.length < 10) {

      showStatus(
        "Please enter your details and a message of at least 10 characters.",
        "error"
      );

      return;
    }

    /* EMAIL FALLBACK */

    const subject = encodeURIComponent(
      `Portfolio enquiry from ${name}`
    );

    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );

    fallback.href =
      `mailto:neupanespandan16@gmail.com?subject=${subject}&body=${body}`;

    fallback.hidden = true;

    /* FORM SUBMISSION */

    sendButton.disabled = true;

    sendButton.textContent = "Sending...";

    showStatus("Contacting the server...", "");

    let base = API_BASE_URL.replace(/\/$/, "");

    // Frontend on port 5500 uses backend on port 8000.

    if (
      !base &&
      ["localhost", "127.0.0.1"].includes(
        window.location.hostname
      ) &&
      window.location.port === "5500"
    ) {

      base = "http://127.0.0.1:8000";

    }

    try {

      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        12000
      );

      let response;

      try {

        response = await fetch(
          `${base}/api/contact`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              name,
              email,
              message
            }),

            signal: controller.signal
          }
        );

      } finally {

        clearTimeout(timeout);

      }

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "The contact service is currently unavailable."
        );

      }

      if (data.delivery === "emailed") {

        showStatus(
          "Thank you! Your email was sent successfully.",
          "ok"
        );

      } else if (data.delivery === "saved_locally") {

        showStatus(
          "Message saved in your private local inbox. It has not been emailed.",
          "warn"
        );

      } else {

        throw new Error(
          "The backend did not confirm delivery."
        );

      }

      form.reset();

    } catch (error) {

      showStatus(
        "Your message could not be delivered. Please use the email option below.",
        "error"
      );

      fallback.hidden = false;

      console.warn(
        "Contact request failed:",
        error
      );

    } finally {

      sendButton.disabled = false;

      sendButton.textContent = "Send Message ↗";

    }

  });
}

/* ============================
   PRIVATE OWNER INBOX LINK
============================ */

// The private inbox link is only shown
// while viewing the site locally.
//
// The backend still requires authentication.

const ownerInbox = document.getElementById("ownerInbox");

if (
  ownerInbox &&
  ["localhost", "127.0.0.1"].includes(
    window.location.hostname
  )
) {

  ownerInbox.hidden = false;

}
