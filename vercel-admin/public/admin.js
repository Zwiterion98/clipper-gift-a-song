const loadingView = document.getElementById("loadingView");
const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");
const loginForm = document.getElementById("loginForm");
const redirectForm = document.getElementById("redirectForm");
const passwordInput = document.getElementById("password");
const destinationInput = document.getElementById("destination");
const saveButton = document.getElementById("saveButton");
const logoutButton = document.getElementById("logoutButton");
const loginStatus = document.getElementById("loginStatus");
const saveStatus = document.getElementById("saveStatus");


function showView(view) {
  for (const item of [loadingView, loginView, adminView]) {
    item.hidden = item !== view;
  }
}


function showStatus(element, message, type = "") {
  element.textContent = message;
  element.className = `status ${type}`.trim();
}


async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Ocurrió un error.");
  }

  return data;
}


function normalizeUrl(value) {
  const trimmedValue = value.trim();
  const normalizedValue = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
  const destination = new URL(normalizedValue);

  if (!["http:", "https:"].includes(destination.protocol) || !destination.hostname) {
    throw new Error("Ingresá una URL válida, por ejemplo: https://ejemplo.com");
  }

  return destination.href;
}


async function loadDestination() {
  const data = await request("/api/destination");
  destinationInput.value = data.url;
}


async function initialize() {
  try {
    const session = await request("/api/session");
    if (!session.authenticated) {
      showView(loginView);
      passwordInput.focus();
      return;
    }

    await loadDestination();
    showView(adminView);
  } catch (error) {
    showView(loginView);
    showStatus(loginStatus, error.message, "error");
  }
}


loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showStatus(loginStatus, "Ingresando…");

  try {
    await request("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: passwordInput.value }),
    });
    passwordInput.value = "";
    await loadDestination();
    showView(adminView);
  } catch (error) {
    showStatus(loginStatus, error.message, "error");
    passwordInput.select();
  }
});


redirectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showStatus(saveStatus, "");

  let destination;
  try {
    destination = normalizeUrl(destinationInput.value);
  } catch (error) {
    showStatus(saveStatus, error.message, "error");
    destinationInput.focus();
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Guardando…";

  try {
    const data = await request("/api/destination", {
      method: "POST",
      body: JSON.stringify({ url: destination }),
    });
    destinationInput.value = data.url;
    showStatus(saveStatus, data.message, "success");
  } catch (error) {
    showStatus(saveStatus, error.message, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Aceptar";
  }
});


logoutButton.addEventListener("click", async () => {
  try {
    await request("/api/logout", { method: "POST", body: "{}" });
  } finally {
    showView(loginView);
    passwordInput.focus();
  }
});


initialize();
