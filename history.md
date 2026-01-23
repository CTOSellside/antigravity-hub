# Project History & Decision Log

Registro de hitos y decisiones arquitectónicas tomadas durante el desarrollo de los proyectos.

## Registro Cronológico

### 2026-01-23
- **Decisión**: Se optó por una estructura de "Project Hub" para gestionar múltiples perfiles.
- **Razón**: Permite escalabilidad, separación de secretos en GCP y despliegues independientes a Cloud Run.
- **Estado**: Implementado.

- **Hito**: Configuración Multi-Cuenta GCP.
- **Detalle**: Creación de perfil `cto-sellside` vinculado a `antigravity-cto`.

- **Hito**: Automatización de Despliegue (Trigger 2nd Gen).
- **Detalle**: Conexión de GitHub y creación de disparador en `southamerica-west1`.
- **Hito**: Despliegue exitoso en Cloud Run.
- **Detalle**: La app `hello-world` está viva en `https://hello-world-nm65jwwkta-uc.a.run.app`.
- **Hito**: Persistencia con Firestore.
- **Detalle**: Integración de `@google-cloud/firestore` en `api-service` para registro de proyectos.
- **Estado**: Implementado y en despliegue.


