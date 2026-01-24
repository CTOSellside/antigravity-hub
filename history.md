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


