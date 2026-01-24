# Project History & Decision Log

Registro de hitos y decisiones arquitectónicas tomadas durante el desarrollo de los proyectos.

## Registro Cronológico

### 2026-01-23
- **Decisión**: Se optó por una estructura de "Project Hub" para gestionar múltiples perfiles.
- **Razón**: Permite escalabilidad, separación de secretos en GCP y despliegues independientes a Cloud Run.
- **Estado**: Implementado.

- **Hito**: Seguridad con Google One Tap & JWT.
- **Detalle**: Dashboard protegido con Google Identity; API protegida con verificación de tokens Firebase Admin.
- **Hito**: IA & La Brújula (Gemini).
- **Detalle**: Microservicio `ai-service` operativo con Vertex AI (Gemini 1.5 Flash). Chat interactivo en Dashboard para soporte de MOM y gestión HUB.
- **Hito**: Integración Odoo ERP (RepuestosMOM).
- **Detalle**: Conexión segura mediante XML-RPC y Secret Manager. Inventario en tiempo real activo.
- **Estado**: Ecosistema Inteligente y Seguro.


