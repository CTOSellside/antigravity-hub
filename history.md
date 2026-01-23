# Project History & Decision Log

Registro de hitos y decisiones arquitectónicas tomadas durante el desarrollo de los proyectos.

## Registro Cronológico

### 2026-01-23
- **Decisión**: Se optó por una estructura de "Project Hub" para gestionar múltiples perfiles.
- **Razón**: Permite escalabilidad, separación de secretos en GCP y despliegues independientes a Cloud Run.
- **Estado**: Implementado.

- **Hito**: Sistema Completo y Verificado.
- **Detalle**: Arquitectura Monorepo con 3 servicios (Frontend, API, Demo) desplegados en Cloud Run.
- **Seguridad**: Secretos centralizados en Secret Manager.
- **Datos**: Persistencia en tiempo real con Firestore.
- **Estado**: Sprint 1 Finalizado con éxito rotundo.


