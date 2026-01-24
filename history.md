# Project History & Decision Log

Registro de hitos y decisiones arquitectónicas tomadas durante el desarrollo de los proyectos.

## Registro Cronológico

### 2026-01-23
- **Decisión**: Se optó por una estructura de "Project Hub" para gestionar múltiples perfiles.
- **Razón**: Permite escalabilidad, separación de secretos en GCP y despliegues independientes a Cloud Run.
- **Estado**: Implementado.

- **Hito**: Seguridad con Google One Tap & JWT.
- **Detalle**: Dashboard protegido con Google Identity; API protegida con verificación de tokens Firebase Admin.
- **Hito**: IA Frontier & La Brújula (Gemini 3.0 Pro).
- **Detalle**: Microservicio `ai-service` actualizado al último modelo disponible: **Gemini 3.0 Pro Preview**. Chat dinámico con contexto de MOM y HUB.
- **Hito**: Integración Odoo ERP (RepuestosMOM).
- **Detalle**: Conexión segura mediante XML-RPC y Secret Manager. Inventario en tiempo real activo.
- **Estado**: Ecosistema de Vanguardia con Gemini 3.0.


