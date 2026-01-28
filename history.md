# Project History & Decision Log

Registro de hitos y decisiones arquitectónicas tomadas durante el desarrollo de los proyectos.

## Registro Cronológico

### 2026-01-23
- **Decisión**: Se optó por una estructura de "Project Hub" para gestionar múltiples perfiles.
- **Razón**: Permite escalabilidad, separación de secretos en GCP y despliegues independientes a Cloud Run.
- **Estado**: Implementado.

- **Hito**: Seguridad con Google One Tap & JWT.
- **Detalle**: Dashboard protegido con Google Identity; API protegida con verificación de tokens Firebase Admin.
- **Hito**: Arquitectura Firebase Genkit (La Brújula v2).
- **Detalle**: Migración del microservicio de IA a **Genkit Flows**. Mayor observabilidad, mejores trazas y manejo profesional de prompts.
- **Hito**: IA Frontier & La Brújula (Gemini 3.0 Pro).
- **Detalle**: Microservicio `ai-service` optimizado para escalabilidad con Firebase Genkit.
- **Estado**: Ecosistema con Arquitectura de Nivel Empresa.

### 2026-01-27
- **Hito**: Menú de Gestión de Perfiles UI.
- **Detalle**: Evolución del selector de entornos a un menú de gestión completo. Ahora permite visualizar todos los perfiles en un modal y añadir nuevos entornos directamente desde el Dashboard.
- **Hito**: Sistema Multi-perfil Dinámico.
- **Detalle**: Implementación de una arquitectura de "Entornos" que permite al Dashboard cambiar entre diferentes proyectos de GCP (CTO Sellside vs RepuestosMOM) dinámicamente. 
- **Resolución**: Se corrigieron errores de despliegue y configuración de OAuth (`origin_mismatch`).
- **Componentes**: Nueva colección de `profiles` en Firestore, API de gestión de entornos y componente `ProfileSwitcher` en el frontend.
- **Hito**: Securización de "La Brújula" (AI Service).
- **Detalle**: Migración de credenciales de Odoo a **Secret Manager**. Implementación de inicialización asíncrona.
- **Resolución**: Se corrigió error de despliegue (`Default STARTUP TCP probe failed`) mediante la asignación del rol `Secret Accessor` a la Service Account de Cloud Run.
- **Hito**: Consolidación de Autenticación.
- **Detalle**: Verificación de flujo completo One Tap -> Dashboard -> API (JWT) -> Firestore.
- **Estado**: Todo el codebase principal es ahora "Production Ready" bajo estándares de seguridad de Antigravity.
### 2026-01-28
- **Hito**: Protocolo Antigravity & Scaffolding 3.0.
- **Detalle**: Implementación de ejecución técnica desde el Dashboard. Automatización de creación de repositorios en GitHub e inicialización en Firestore.
- **Hito**: Gobernanza de Notificaciones (ChatOps separation).
- **Decisión**: Se separaron las alertas operativas (MOM Inventory) de las notificaciones de infraestructura (ChatOps).
- **Razón**: Mantener jerarquías de acceso y evitar ruido en los canales operativos. Se introdujo `SS_CHATOPS_WEBHOOK`.
- **Estado**: Implementado y desplegado en Cloud Run.
