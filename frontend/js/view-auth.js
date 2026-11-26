// Sign-in screen: the login and registration tabs, password recovery and
// the reset form reached from the e-mailed link (?resetToken=).

import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  setToken
} from "./api.js?v=20261126-2";
import {
  clearFormErrors,
  formDataToObject,
  maskPasswords,
  setFieldError,
  setFormBusy,
  setMessage,
  showApiFieldErrors,
  validateForm
} from "./forms.js?v=20261126-2";

function passwordConfirmationErrors(form) {
  const password = form.elements.password;
  const confirmation = form.elements.passwordConfirmation;
  return password.value && confirmation.value && password.value !== confirmation.value
    ? [["passwordConfirmation", "Las contraseñas no coinciden."]]
    : [];
}

// `onSignedIn(user)` runs after a successful login.
export function createAuthView({ onSignedIn }) {
  const view = document.querySelector("#auth-view");
  const loginTab = document.querySelector("#login-tab");
  const registerTab = document.querySelector("#register-tab");
  const authTabs = document.querySelector(".auth-tabs");
  const loginForm = document.querySelector("#login-form");
  const registerForm = document.querySelector("#register-form");
  const forgotPasswordForm = document.querySelector("#forgot-password-form");
  const resetPasswordForm = document.querySelector("#reset-password-form");
  const message = document.querySelector("#auth-message");

  function showMessage(text, type) {
    setMessage(message, text, type);
  }

  // mode: "login" | "register" | "forgot" | "reset"
  function switchMode(mode) {
    maskPasswords(view);
    const loginActive = mode === "login";
    const registerActive = mode === "register";

    loginForm.hidden = !loginActive;
    registerForm.hidden = !registerActive;
    forgotPasswordForm.hidden = mode !== "forgot";
    resetPasswordForm.hidden = mode !== "reset";
    authTabs.hidden = !loginActive && !registerActive;
    loginTab.classList.toggle("is-active", loginActive);
    registerTab.classList.toggle("is-active", registerActive);
    loginTab.setAttribute("aria-selected", String(loginActive));
    registerTab.setAttribute("aria-selected", String(registerActive));
    loginTab.tabIndex = loginActive ? 0 : -1;
    registerTab.tabIndex = registerActive ? 0 : -1;
    showMessage("");
    clearFormErrors(view);
  }

  function startPasswordReset(token) {
    switchMode("reset");
    resetPasswordForm.elements.token.value = token;
  }

  async function handleLogin(event) {
    event.preventDefault();
    showMessage("");
    if (!validateForm(loginForm)) return;

    setFormBusy(loginForm, true);
    try {
      const response = await loginUser(formDataToObject(loginForm));
      setToken(response.data.accessToken);
      loginForm.reset();
      onSignedIn(response.data.user);
    } catch (error) {
      if (error.code === "INVALID_CREDENTIALS") {
        const fieldMessage = "El correo o la contraseña no coinciden con una cuenta.";
        setFieldError(loginForm, "email", fieldMessage);
        setFieldError(loginForm, "password", fieldMessage);
      } else {
        showApiFieldErrors(loginForm, error.details);
      }
      showMessage(error.code === "INVALID_CREDENTIALS"
        ? "El correo o la contraseña no son correctos."
        : error.code === "RATE_LIMIT_EXCEEDED"
          ? "Demasiados intentos. Espera unos minutos antes de volver a intentarlo."
          : "No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setFormBusy(loginForm, false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    showMessage("");
    if (!validateForm(registerForm)) return;

    setFormBusy(registerForm, true);
    try {
      const data = formDataToObject(registerForm);
      await registerUser(data);
      registerForm.reset();
      switchMode("login");
      loginForm.elements.email.value = data.email;
      showMessage("Cuenta creada. Ya puedes iniciar sesión.", "success");
    } catch (error) {
      if (error.code === "RATE_LIMIT_EXCEEDED") {
        showMessage("Se han creado demasiadas cuentas desde esta conexión. Inténtalo más tarde.");
        return;
      }
      if (error.code === "EMAIL_ALREADY_REGISTERED") {
        setFieldError(registerForm, "email", "Ya existe una cuenta registrada con este correo.");
      } else {
        showApiFieldErrors(registerForm, error.details);
      }
      showMessage(error.code === "EMAIL_ALREADY_REGISTERED"
        ? "Ya existe una cuenta con ese correo."
        : error.details?.[0]?.message || "No se pudo crear la cuenta. Revisa los datos.");
    } finally {
      setFormBusy(registerForm, false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    showMessage("");
    if (!validateForm(forgotPasswordForm)) return;

    setFormBusy(forgotPasswordForm, true);
    try {
      const response = await requestPasswordReset(formDataToObject(forgotPasswordForm));
      const resetToken = response.data.resetToken;
      // Development returns the token directly; production e-mails it.
      if (resetToken) {
        startPasswordReset(resetToken);
        resetPasswordForm.elements.password.focus();
        showMessage("Cuenta localizada. Ya puedes establecer una contraseña nueva.", "success");
      } else {
        switchMode("login");
        showMessage("Si existe una cuenta con ese correo, recibirás instrucciones para recuperarla.", "success");
      }
    } catch (error) {
      if (error.code === "RATE_LIMIT_EXCEEDED") {
        showMessage("Has solicitado demasiados enlaces. Espera unos minutos antes de repetirlo.");
        return;
      }
      const hasFieldErrors = showApiFieldErrors(forgotPasswordForm, error.details);
      showMessage(hasFieldErrors
        ? "Revisa el campo señalado."
        : "No se pudo preparar la recuperación. Inténtalo de nuevo.");
    } finally {
      setFormBusy(forgotPasswordForm, false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    showMessage("");
    if (!validateForm(resetPasswordForm, passwordConfirmationErrors)) return;

    setFormBusy(resetPasswordForm, true);
    try {
      const { token, password } = formDataToObject(resetPasswordForm);
      await resetPassword({ token, password });
      resetPasswordForm.reset();
      history.replaceState({}, "", location.pathname);
      switchMode("login");
      showMessage("Contraseña actualizada. Ya puedes iniciar sesión.", "success");
    } catch (error) {
      if (error.code === "RATE_LIMIT_EXCEEDED") {
        showMessage("Demasiados intentos. Solicita un enlace nuevo dentro de unos minutos.");
        return;
      }
      if (error.code === "INVALID_OR_EXPIRED_RESET_TOKEN") {
        showMessage("El enlace de recuperación ha caducado o ya se ha utilizado. Solicita uno nuevo.");
      } else {
        const hasFieldErrors = showApiFieldErrors(resetPasswordForm, error.details);
        showMessage(hasFieldErrors
          ? "Revisa los campos señalados."
          : "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setFormBusy(resetPasswordForm, false);
    }
  }

  loginTab.addEventListener("click", () => switchMode("login"));
  registerTab.addEventListener("click", () => switchMode("register"));
  authTabs.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const login = event.key === "ArrowLeft" || event.key === "Home";
    switchMode(login ? "login" : "register");
    (login ? loginTab : registerTab).focus();
  });
  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  forgotPasswordForm.addEventListener("submit", handleForgotPassword);
  resetPasswordForm.addEventListener("submit", handleResetPassword);
  document.querySelector("#forgot-password-button").addEventListener("click", () => {
    switchMode("forgot");
    forgotPasswordForm.elements.email.value = loginForm.elements.email.value;
    forgotPasswordForm.elements.email.focus();
  });
  document.querySelectorAll("[data-back-login]").forEach((button) =>
    button.addEventListener("click", () => switchMode("login"))
  );

  return { switchMode, showMessage, startPasswordReset };
}
