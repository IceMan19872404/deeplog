# ADR - Evolucion del frontend

Fecha: 2026-10-14

Estado: Aceptada

## Contexto

El frontend vanilla es estable y funcional, pero `app.js` concentra gran parte
del estado y comportamiento. La Semana 23 construye una vertical independiente
para medir React y TypeScript sin reescribir el producto antes de produccion.

## Prueba de concepto

La POC incluye login, sesion en memoria, cuatro metricas y listado paginado
contra el mismo contrato `/api/v1`. Utiliza React 19, TypeScript estricto, Vite,
TanStack Query y Vitest. Se ejecuta solo con el perfil Compose `poc` en el puerto
8081; el producto estable permanece en el 8080.

## Metricas observadas

| Criterio | Frontend actual | POC React |
|---|---:|---:|
| Alcance | Producto completo | Vertical login/dashboard |
| Fuente medida | 195.030 bytes / 5.606 lineas | 11.711 bytes / 155 lineas |
| JavaScript/CSS/HTML comprimido | 44,5 KB | 82,7 KB de JS+CSS gzip |
| Tipado estatico | No | TypeScript `strict` |
| Estado remoto | Manual | TanStack Query |
| Pruebas frontend | Manuales | 2 unitarias + build tipado |
| Vulnerabilidades npm | No aplica | 0 |

La comparacion de tamaño no es equivalente porque el frontend actual contiene
todo el producto y la POC solo una vertical. Aun asi, React añade un coste base
de aproximadamente 81 KB gzip antes de migrar mas funciones.

## Hallazgo de seguridad funcional

La primera POC conservaba la cache durante 30 segundos al cerrar sesion. Se
corrigio vaciando QueryClient en logout e incluyendo el id de usuario en las
claves. Este hallazgo demuestra el valor de centralizar estado remoto, pero
tambien exige una politica explicita de cache por identidad.

## Evaluacion de tecnologias

### React + TypeScript

Adoptar gradualmente. Mejora componentes, contratos, pruebas y mantenibilidad.
No reemplazar ahora el frontend completo: una reescritura antes del despliegue
añadiria riesgo sin mejorar el producto visible de la Semana 24.

### TanStack Query

Adoptar con React. Resulta adecuado para cache, carga y errores. Toda clave debe
incluir identidad cuando corresponda y la cache debe vaciarse al cerrar sesion.

### Next.js

No adoptar por ahora. DeepLog es principalmente una aplicacion autenticada sin
necesidad actual de SSR, SEO de contenido ni rutas server-side. Vite produce un
cliente estatico mas simple para el despliegue previsto.

### Tailwind CSS

No adoptar durante la migracion inicial. El sistema visual ya existe en CSS y
reescribirlo no aporta valor funcional. Se puede reevaluar si aparecen problemas
reales de consistencia o velocidad de desarrollo.

### shadcn/ui

No adoptar globalmente. Sus primitivas pueden evaluarse de forma selectiva para
dialogos complejos una vez migrado React, preservando el lenguaje visual propio.

## Decision

Mantener vanilla como frontend de produccion para la Semana 24 y conservar la
POC como referencia ejecutable. Tras validar el producto con usuarios, migrar
por verticales comenzando por autenticacion y dashboard, siempre contra
`/api/v1`, con paridad visual, accesible y de pruebas antes de sustituir cada
pantalla.
