# Plan de Trusted Types

Revision: 2026-11-23. Estado: pendiente (no se activa todavia).

## Situacion

- La CSP (nginx y Caddy) no incluye `require-trusted-types-for`.
- Quedan 22 asignaciones a `innerHTML` en `js/app.js` y un `document.write`
  en `js/dive-pdf.js` (vista de impresion en `about:blank`). Todas escapan los
  datos con `escapeHtml` o insertan solo numeros; `public-share.js` y
  `dive-map.js` ya construyen el DOM con `textContent`/`createElement`.
- No hay un endpoint que recoja informes de CSP; la telemetria del navegador
  (TD-028) solo admite una allowlist de campos.

## Por que no se activa ya el modo Report-Only

La guia `trusted-types` pide, antes del despliegue, haber identificado y
migrado los sumideros ("Sink refactoring: Ensure you have identified and
refactored dangerous sinks to use your Trusted Types policies") y despues
desplegar `Content-Security-Policy-Report-Only`. Con 23 sumideros sin migrar
y sin donde recoger los informes, la cabecera solo llenaria la consola de
avisos en cada vista (y las pruebas de Playwright cuentan los avisos de CSP
como fallos) sin aportar datos nuevos: la lista de sumideros ya se conoce.

## Pasos

1. Sustituir los textos estaticos por DOM: estados vacios y de carga con
   `replaceChildren()` o un `<p>` con `textContent` (ya hecho en
   `renderHome`).
2. Crear `js/html.js` con una unica politica `deeplog-html` cuyo `createHTML`
   escapa por si misma cada valor interpolado (no una politica de paso
   `createHTML: (s) => s`) y exportar una plantilla etiquetada `html`. En
   navegadores sin Trusted Types, usar el *tinyfill* de la guia
   (`createPolicy: (name, rules) => rules`). Sustituir `escapeHtml` y las
   plantillas de `app.js` y `dive-pdf.js` por `html`.
3. Recoger violaciones sin endpoint nuevo: en `client-monitoring.js`,
   escuchar `securitypolicyviolation` y enviar `{ kind: "csp", source, line }`
   (ruta local sin query, sin muestra de texto), ampliando la allowlist de
   TD-028.
4. Añadir en `nginx.conf` y `Caddyfile`:
   `Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; trusted-types deeplog-html`.
5. Revisar en esa fase si la ventana de impresion (`about:blank` +
   `document.write`) acepta el `TrustedHTML` del opener; si no, generar la
   vista desde un `print.html` propio que construya el DOM con `textContent`.
6. Con cero violaciones en todas las vistas, dialogos, PDF y ficha
   compartida, mover la directiva a la CSP aplicada.

Soporte: Trusted Types es Baseline 2026 (Newly available, 2026-02-24); el
tinyfill mantiene el escape actual en navegadores anteriores.
