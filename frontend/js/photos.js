// Dive photos are private: each one is fetched with the session's token and
// shown through an object URL, which must be revoked when it is no longer on
// screen. A pool holds the URLs of one gallery so they go away together.

import { getDivePhotoBlob } from "./api.js?v=20261123-2";
import { escapeHtml } from "./text.js?v=20261126-1";

export function createUrlPool(urlApi = URL) {
  let urls = [];
  return {
    add(blob) {
      const url = urlApi.createObjectURL(blob);
      urls.push(url);
      return url;
    },
    revokeAll() {
      urls.forEach((url) => urlApi.revokeObjectURL(url));
      urls = [];
    }
  };
}

export const PHOTO_LOADING_MARKUP = '<span class="photo-loading">Cargando galería...</span>';

export function photoErrorMarkup(photo) {
  return `<span class="photo-load-error">No se pudo cargar ${escapeHtml(photo.originalName)}</span>`;
}

export function photoCard(url, label, extra = "", className = "photo-card") {
  return `
    <figure class="${className}">
      <img src="${url}" alt="${escapeHtml(label)}">
      <figcaption>${escapeHtml(label)}</figcaption>
      ${extra}
    </figure>
  `;
}

// Fetches every photo in parallel. Each result has the object URL, or null
// when that photo could not be loaded.
export function loadPhotoUrls(photos, pool, fetchBlob = getDivePhotoBlob) {
  return Promise.all(photos.map(async (photo) => {
    try {
      return { photo, url: pool.add(await fetchBlob(photo.url)) };
    } catch (_error) {
      return { photo, url: null };
    }
  }));
}
