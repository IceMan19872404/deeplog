// Perfil: the diver's private profile (bio, certification, diving since,
// default for sharing the name), the avatar shown in the header and the
// profile, and the dialog that edits them.

import {
  deleteProfilePhoto,
  getProfile,
  getProfilePhotoBlob,
  updateProfile,
  uploadProfilePhoto
} from "./api.js?v=20261126-2";
import { createUnsavedChanges, guardDialogClose, requestDialogClose } from "./dialogs.js?v=20261126-2";
import { CERTIFICATION_LABELS } from "./dive-labels.js?v=20261126-2";
import {
  clearFieldError,
  clearFormErrors,
  isFormBusy,
  setFieldError,
  setFormBusy,
  setMessage,
  showApiFieldErrors,
  validateForm
} from "./forms.js?v=20261126-2";
import { profilePhotoMessage } from "./validation-messages.js?v=20261123-2";

function profileFormErrors(form) {
  const photoMessage = profilePhotoMessage(form.elements.photo.files[0]);
  return photoMessage ? [["photo", photoMessage]] : [];
}

// `getUser()` gives the signed-in user, for the avatar's initials.
export function createProfileView({ getUser, handleUnauthorized, confirmDiscard }) {
  const dialog = document.querySelector("#profile-dialog");
  const form = document.querySelector("#profile-form");
  const message = document.querySelector("#profile-message");
  const removePhotoButton = document.querySelector("#remove-profile-photo");
  const summary = {
    copy: document.querySelector("#profile-summary-copy"),
    certification: document.querySelector("#profile-certification"),
    since: document.querySelector("#profile-since"),
    privacy: document.querySelector("#profile-privacy")
  };
  const avatars = document.querySelectorAll("#header-avatar, #profile-avatar, #profile-form-avatar");
  const changes = createUnsavedChanges(form);
  let profile = null;
  let photoUrl = null;

  function setAvatars(url = null) {
    const user = getUser();
    const initials = user ? `${user.firstName[0] || ""}${user.lastName[0] || ""}`.toUpperCase() : "";
    avatars.forEach((avatar) => {
      avatar.textContent = url ? "" : initials;
      avatar.style.backgroundImage = url ? `url("${url}")` : "";
      avatar.classList.toggle("has-photo", Boolean(url));
    });
  }

  function revokePhoto() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = null;
  }

  async function loadPhoto(current) {
    revokePhoto();
    if (current.photoUrl) {
      try {
        photoUrl = URL.createObjectURL(await getProfilePhotoBlob());
      } catch (_error) {
        photoUrl = null;
      }
    }
    setAvatars(photoUrl);
    removePhotoButton.hidden = !photoUrl;
  }

  function render(current) {
    profile = current;
    summary.copy.textContent = current.bio || "Completa tu perfil para reunir trayectoria y preferencias.";
    summary.certification.textContent = CERTIFICATION_LABELS[current.certificationLevel] || "Sin indicar";
    summary.since.textContent = current.divingSince || "Sin indicar";
    summary.privacy.textContent = current.shareNameByDefault
      ? "Nombre incluido por defecto"
      : "Nombre oculto por defecto";
  }

  async function show(current) {
    render(current);
    await loadPhoto(current);
  }

  async function load() {
    try {
      const response = await getProfile();
      await show(response.data.profile);
    } catch (error) {
      if (!handleUnauthorized(error)) {
        summary.copy.textContent = "No se pudo cargar el perfil.";
      }
    }
  }

  // Forget everything when the session ends.
  function reset() {
    revokePhoto();
    profile = null;
  }

  function openDialog() {
    const current = profile || {};
    form.elements.bio.value = current.bio || "";
    form.elements.certificationLevel.value = current.certificationLevel || "";
    form.elements.divingSince.value = current.divingSince || "";
    form.elements.divingSince.max = new Date().getFullYear();
    form.elements.shareNameByDefault.checked = Boolean(current.shareNameByDefault);
    form.elements.photo.value = "";
    setMessage(message, "");
    clearFormErrors(form);
    changes.markClean();
    dialog.showModal();
  }

  function closeDialog() {
    requestDialogClose(dialog);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm(form, profileFormErrors)) return;
    const fields = form.elements;
    const photo = fields.photo.files[0];
    setFormBusy(form, true);
    setMessage(message, "");
    try {
      const response = await updateProfile({
        bio: fields.bio.value.trim() || null,
        certificationLevel: fields.certificationLevel.value || null,
        divingSince: fields.divingSince.value ? Number(fields.divingSince.value) : null,
        shareNameByDefault: fields.shareNameByDefault.checked
      });
      let saved = response.data.profile;
      if (photo) {
        try {
          saved = (await uploadProfilePhoto(photo)).data.profile;
        } catch (_photoError) {
          await show(saved);
          changes.markClean();
          setMessage(message, "Los datos se guardaron, pero la fotografía no era válida o superaba 3 MB.");
          return;
        }
      }
      await show(saved);
      changes.markClean();
      setMessage(message, "Perfil actualizado.", "success");
      setTimeout(() => { if (dialog.open) closeDialog(); }, 500);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      const hasFieldErrors = showApiFieldErrors(form, error.details);
      setMessage(message, hasFieldErrors ? "Revisa los campos señalados." : "No se pudo guardar el perfil.");
    } finally {
      setFormBusy(form, false);
    }
  }

  async function handlePhotoDelete() {
    removePhotoButton.disabled = true;
    try {
      await deleteProfilePhoto();
      await show({ ...profile, photoUrl: null });
      setMessage(message, "Fotografía eliminada.", "success");
    } catch (error) {
      if (!handleUnauthorized(error)) setMessage(message, "No se pudo eliminar la fotografía.");
    } finally {
      removePhotoButton.disabled = false;
    }
  }

  document.querySelector("#open-profile").addEventListener("click", openDialog);
  document.querySelector("#close-profile").addEventListener("click", closeDialog);
  document.querySelector("#cancel-profile").addEventListener("click", closeDialog);
  form.addEventListener("submit", handleSubmit);
  removePhotoButton.addEventListener("click", handlePhotoDelete);
  form.elements.photo.addEventListener("change", (event) => {
    const photoMessage = profilePhotoMessage(event.target.files[0]);
    if (photoMessage) setFieldError(form, "photo", photoMessage);
    else clearFieldError(event.target);
  });
  guardDialogClose(dialog, {
    isBusy: () => isFormBusy(form),
    isDirty: changes.isDirty,
    confirmDiscard
  });

  return {
    load,
    reset,
    get profile() { return profile; }
  };
}
