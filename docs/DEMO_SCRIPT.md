# Guion de demostracion de DeepLog

Duracion objetivo: 5-7 minutos.

## 1. Problema y propuesta

DeepLog convierte una bitacora de buceo funcional en un producto personal:
datos tecnicos, recuerdos, contexto historico y aprendizaje en un unico lugar.
No sustituye formacion, planificacion ni criterios de seguridad.

## 2. Recorrido principal

1. Iniciar sesion y mostrar el dashboard responsive.
2. Señalar metricas personales, records y actividad sin ranking social.
3. Crear una inmersion con configuracion, compañeros y fotografias.
4. Abrir la tarjeta para consultar la ficha completa sin entrar en edicion.
5. Mostrar la memoria de configuraciones como historial factual, no consejo.
6. Añadir una reflexion: que salio bien, mejora, habilidad y proximo objetivo.
7. Volver al panel para enseñar la cronologia cualitativa.
8. Preparar el PDF editorial y una capsula privada con QR revocable.
9. Cerrar con la exportacion JSON/CSV/ZIP y el control de borrado de cuenta.

## 3. Decisiones tecnicas para explicar

- API REST versionada y arquitectura controller/service/repository.
- PostgreSQL con constraints, claves foraneas, indices y migraciones.
- JWT corto, refresh rotatorio `httpOnly`, CSRF, BCrypt y aislamiento por usuario.
- Fotografias privadas fuera de la carpeta publica.
- Docker Compose con healthchecks y entorno de produccion separado.
- Pruebas de integracion para permisos, exportacion, shares y borrado.
- Contrato OpenAPI 3.1 y pruebas unitarias, integracion y E2E por riesgo.
- CI con PostgreSQL real, auditoria de dependencias y builds Docker.
- Logs Pino correlacionados, readiness y alertas sin contenido personal.
- Funciones sensibles diseñadas con privacidad por defecto.

## 4. Limites que conviene reconocer

- El despliegue publico, dominio y proveedor cloud siguen pendientes.
- La ejecucion remota de CI, el proveedor de correo y el despliegue publico
  siguen pendientes de infraestructura externa.
- El proveedor de correo real, monitor externo y navegador E2E siguen pendientes.
- La validacion con buceadores reales sera necesaria antes de afirmar valor de mercado.

## 5. Cierre para entrevista

DeepLog demuestra evolucion desde un proyecto DAW anterior hacia una aplicacion
modular, probada y preparada para crecer. Las decisiones priorizan seguridad,
propiedad de datos y una experiencia enfocada en el buceador, no la acumulacion
de tecnologias por curriculum.
