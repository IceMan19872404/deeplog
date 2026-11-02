# Auditoria de accesibilidad WCAG 2.2 AA

Revision: 2026-09-30

## Alcance

Acceso, registro, recuperacion, dashboard, perfil, formularios de inmersion,
detalle, compartir y gestion de cuenta. Esta revision combina inspeccion de
marcado y CSS con pruebas automatizadas existentes. La comprobacion visual se
completo sobre la aplicacion ejecutada en Docker. La validacion con lector de
pantalla y medicion instrumental permanece manual.

## Controles aplicados

| Criterio | Estado | Evidencia |
|---|---|---|
| 1.1.1 Contenido no textual | Cumple por diseño | Logos decorativos vacios; QR y fotos informativas conservan texto alternativo |
| 1.3.1 Estructura | Mejorado | Encabezados, `main`, listas descriptivas, `fieldset` y `legend` semanticos |
| 1.3.5 Proposito de campos | Cumple | `autocomplete`, tipos y nombres en autenticacion |
| 1.4.3 Contraste | Mejorado | Variables reforzadas y revision visual realizada; falta medicion instrumental sobre degradados |
| 1.4.10 Reflow | Implementado | Layouts adaptativos desde 320 px sin tablas ni anchos fijos esenciales |
| 1.4.11 Contraste no textual | Mejorado | Foco de 3 px y bordes de error diferenciados |
| 2.1.1 Teclado | Mejorado | Tarjetas operables, dialogos nativos y pestañas con flechas, Inicio y Fin |
| 2.4.1 Evitar bloques | Implementado | Enlace visible al foco para saltar al contenido principal |
| 2.4.3 Orden del foco | Implementado | Orden DOM; `dialog.showModal()` confina el foco de forma nativa |
| 2.4.7 Foco visible | Implementado | Indicador global de alto contraste con `:focus-visible` |
| 2.4.11 Foco no oculto | Mejorado | Editor de perfil revisado con desplazamiento interno; faltan 320 px y zoom 200/400 % |
| 2.5.8 Tamaño del objetivo | Mejorado | Botones principales y avatar interactivo de al menos 42 px |
| 3.3.1 Identificacion de errores | Implementado | `aria-invalid`, mensaje junto al campo y foco al primer error |
| 3.3.2 Etiquetas | Implementado | Controles con `label`; opcionalidad y limites expresados en texto |
| 4.1.2 Nombre, funcion, valor | Mejorado | Tabs ARIA sincronizadas, botones iconicos etiquetados y estados nativos |
| 4.1.3 Mensajes de estado | Mejorado | Cargas, errores y confirmaciones usan `role=status`/`aria-live` |

## Perfil y privacidad

- Foto, biografia y experiencia son privadas y requieren JWT.
- La foto no se expone como archivo estatico ni aparece en enlaces QR.
- El nombre se oculta por defecto hasta que el usuario cambia su preferencia.
- Cada enlace permite revisar y cambiar esa seleccion antes de crearlo.
- Los records son personales; no existe ranking ni comparacion entre usuarios.

## Pruebas manuales obligatorias antes de produccion

El recorrido renderizado de escritorio del dashboard y editor de perfil se
completo el 30-09-2026. El arbol accesible expone dialogo, etiquetas, ayudas,
preferencia de privacidad y acciones con nombre. No se modificaron datos reales.

1. Recorrer todas las acciones usando solo Tab, Shift+Tab, flechas, Enter, Espacio y Escape.
2. Probar VoiceOver en Safari verificando nombres, grupos, errores y dialogos.
3. Medir contraste de texto, foco y controles sobre cada degradado.
4. Revisar 320 CSS px y zoom de navegador al 200 y 400 por ciento.
5. Confirmar `prefers-reduced-motion` y ausencia de perdida de informacion.

No se declara conformidad WCAG definitiva hasta completar estas pruebas sobre
la aplicacion renderizada. La auditoria registra evidencia y pendientes, no una
certificacion formal.
