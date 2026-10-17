
"use strict";

// MOBILE NAVIGATION

const menu = document.getElementById("menuToggle");
const links = document.getElementById("navLinks");

if (menu && links) {
  menu.addEventListener("click", () => {
    const open = links.classList.toggle("open");

    menu.setAttribute(
      "aria-expanded",
      String(open)
    );

    menu.setAttribute(
      "aria-label",
      open ? "Close menu" : "Open menu"
    );
  });

  links.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-label", "Open menu");
    });
  });
}

// CURRENT YEAR

const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

// SCROLL ANIMATIONS

const reveal = document.querySelectorAll(".reveal");

if (
  "IntersectionObserver" in window &&
  !window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches
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
    { threshold: 0.07 }
  );

  reveal.forEach(el => observer.observe(el));

} else {
  reveal.forEach(el => el.classList.add("visible"));
}

// CONTACT FORM

// Make sure this email is the address you want
// visitors to contact.

const CONTACT_EMAIL = "neupanespandan16@gmail.com";

const form = document.getElementById("contactForm");

if (form) {

  const status = document.getElementById("formStatus");
  const submit = document.getElementById("sendButton");
  const fallback = document.getElementById("emailFallback");
  const keyField = document.getElementById("web3AccessKey");

  function show(message, type = "") {
    status.textContent = message;
    status.className = "form-status " + type;
  }

  function gmailDraft(name, email, message) {

    const subject = encodeURIComponent(
      "Portfolio enquiry from " + name
    );

    const body = encodeURIComponent(
      "Name: " + name +
      "\nEmail: " + email +
      "\n\nMessage:\n" + message
    );

    return (
      "https://mail.google.com/mail/?view=cm&fs=1&to=" +
      encodeURIComponent(CONTACT_EMAIL) +
      "&su=" + subject +
      "&body=" + body
    );
  }

  form.addEventListener("submit", async event => {

    event.preventDefault();

    if (!form.reportValidity() || submit.disabled) {
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

    const key = keyField.value.trim();

    const bot = form.querySelector(
      '[name="botcheck"]'
    );

    if (bot?.checked) {
      return;
    }

    if (name.length < 2 || message.length < 10) {
      show(
        "Please provide your name and a message of at least 10 characters.",
        "error"
      );
      return;
    }

    // Prepare an email draft to use if needed.

    const draftUrl = gmailDraft(name, email, message);

    fallback.href = draftUrl;
    fallback.hidden = false;

    // NO ACCESS KEY:
    // Open Gmail rather than pretending
    // the message has been submitted.

    if (
      !key ||
      key.includes("YOUR_WEB3FORMS_ACCESS_KEY")
    ) {
      show(
        "A Gmail draft is opening. Review it and click Send in Gmail to deliver your message.",
        "info"
      );

      window.location.assign(draftUrl);
      return;
    }

    // WEB3FORMS SUBMISSION

    submit.disabled = true;
    submit.textContent = "Sending…";

    show("Submitting your message…");

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      15000
    );

    try {

      const payload = {
        access_key: key,
        name,
        email,
        message,

        subject:
          "Portfolio enquiry from " + name,

        from_name: "Spandan Portfolio",

        botcheck: ""
      };

      const response = await fetch(
        "https://api.web3forms.com/submit",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },

          body: JSON.stringify(payload),

          signal: controller.signal
        }
      );

      const result = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message ||
          "Submission was not accepted"
        );
      }

      show(
        "Your message was accepted by the form service. Thank you!",
        "ok"
      );

      form.reset();
      fallback.hidden = true;

    } catch (error) {

      console.warn(
        "Contact form failed:",
        error
      );

      show(
        "Your message could not be submitted. Use the Gmail link below to send it instead.",
        "error"
      );

      fallback.hidden = false;

    } finally {

      clearTimeout(timeout);

      submit.disabled = false;
      submit.textContent = "Send Message ↗";

    }
  });
}
