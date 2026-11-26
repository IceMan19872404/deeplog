// Perfil › Cuenta: close every session, download the data (JSON, CSV or the
// full ZIP with photos) and delete the account.

import { deleteAccount, downloadAccountExport, logoutAllSessions } from "./api.js?v=20261123-2";
import { guardDialogClose, requestDialogClose } from "./dialogs.js?v=20261123-2";
import {
  formDataToObject,
  isFormBusy,
  setFieldError,
  setFormBusy,
  setMessage,
  showApiFieldErrors,
  validateForm
} from "./forms.js?v=20261126-1";

// `endSession(message, { showLogin })` signs out locally and tells the user
// why on the login screen.
export function createAccountView({ handleUnauthorized, endSession }) {
  const message = document.querySelector("#account-message");
  const logoutAllButton = document.querySelector("#logout-all-button");
  const deleteDialog = document.querySelector("#delete-account-dialog");
  const deleteForm = document.querySelector("#delete-account-form");
  const deleteMessage = document.querySelector("#delete-account-message");

  async function handleLogoutAll() {
    logoutAllButton.disabled = true;
    message.textContent = "Cerrando todas las sesiones...";
    try {
      await logoutAllSessions();
      endSession("Se han cerrado todas tus sesiones.");
    } catch (_error) {
      message.textContent = "No se pudieron cerrar todas las sesiones.";
    } finally {
      logoutAllButton.disabled = false;
    }
  }

  async function handleExport(event) {
    const button = event.currentTarget;
    const format = button.dataset.exportFormat;
    message.textContent = "Preparando descarga...";
    button.disabled = true;
    try {
      await downloadAccountExport(format);
      message.textContent = format === "zip"
        ? "Archivo completo preparado. Incluye datos y fotografías."
        : `Exportación ${format.toUpperCase()} preparada.`;
    } catch (error) {
      if (handleUnauthorized(error)) return;
      message.textContent = "No se pudo preparar la exportación.";
    } finally {
      button.disabled = false;
    }
  }

  function openDeleteDialog() {
    deleteForm.reset();
    setMessage(deleteMessage, "");
    deleteDialog.showModal();
  }

  async function handleDelete(event) {
    event.preventDefault();
    setMessage(deleteMessage, "");
    if (!validateForm(deleteForm)) return;

    setFormBusy(deleteForm, true);
    try {
      await deleteAccount(formDataToObject(deleteForm));
      deleteDialog.close();
      endSession("Tu cuenta y todos sus datos se han eliminado.", { showLogin: true });
    } catch (error) {
      if (handleUnauthorized(error)) return;
      // A wrong password is a 400 with its own code, not a lost session.
      const wrongPassword = error.code === "INVALID_ACCOUNT_PASSWORD";
      if (wrongPassword) setFieldError(deleteForm, "password", "La contraseña no es correcta.");
      else showApiFieldErrors(deleteForm, error.details);
      setMessage(deleteMessage, wrongPassword ? "La contraseña no es correcta." : "No se pudo eliminar la cuenta.");
    } finally {
      setFormBusy(deleteForm, false);
    }
  }

  logoutAllButton.addEventListener("click", handleLogoutAll);
  document.querySelectorAll("[data-export-format]").forEach((button) =>
    button.addEventListener("click", handleExport)
  );
  document.querySelector("#open-delete-account").addEventListener("click", openDeleteDialog);
  document.querySelector("#cancel-delete-account").addEventListener("click", () => requestDialogClose(deleteDialog));
  deleteForm.addEventListener("submit", handleDelete);
  guardDialogClose(deleteDialog, { isBusy: () => isFormBusy(deleteForm) });
}
