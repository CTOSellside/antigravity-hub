# Project History & Decision Log

Registro de hitos y decisiones arquitectónicas tomadas durante el desarrollo de los proyectos.

## Registro Cronológico

### 2026-01-23
- **Decisión**: Se optó por una estructura de "Project Hub" para gestionar múltiples perfiles.
- **Razón**: Permite escalabilidad, separación de secretos en GCP y despliegues independientes a Cloud Run.
- **Estado**: Implementado.

- **Hito**: Seguridad con Google One Tap & JWT.
- **Detalle**: Dashboard protegido con Google Identity; API protegida con verificación de tokens Firebase Admin.
- **Hito**: Integración Odoo ERP (RepuestosMOM).
- **Detalle**: Conexión segura mediante XML-RPC y Secret Manager. Inventario en tiempo real activo.
- **Hito**: Dashboard Intelligence (Charts).
- **Detalle**: Implementación de gráficos `recharts` para visualización de estados y métricas Scrum.
- **Estado**: Sistema Multi-Servicio con ERP integrado y Seguridad Activa.


