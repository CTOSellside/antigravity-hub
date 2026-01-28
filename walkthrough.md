# Walkthrough: Securización y Estabilización de La Brújula

Este documento detalla el proceso de mejora de seguridad y la resolución de errores para el microservicio de IA.

## 🚀 Antigravity Execution Protocol

Hemos desbloqueado la capacidad de **ejecutar código desde el Dashboard**. Este hito cierra el puente entre la planificación (Scrum) y la acción técnica autónoma.

### 🛡️ Características del Protocolo
- **Instructions In-line**: El usuario puede proveer contexto a la IA antes de disparar la ejecución.
- **Acción Zap**: Al presionar el rayo, la tarea escala al estado `In Progress` y se gatilla un evento de red en el Hub.
- **Scaffolding Automático 3.0**: Si la tarea implica crear un proyecto, Rosa crea automáticamente un **repositorio privado en GitHub** e inicializa el registro en Firestore.
- **Feedback Proactivo**: El sistema notifica a Google Chat vía "La Brújula", confirmando: *"Entendido, Javi. Iniciando el proceso técnico ahora mismo."*

---

## 🏗️ Motor de Scaffolding Real

Hemos elevado la automatización a nivel de infraestructura pura:
- **GitHub Integration**: Creación automática de repositorios usando tokens securizados.
- **Project Discovery**: Los nuevos repositorios aparecen automáticamente en el Dashboard sin intervención manual.
- **Git Ready**: Notificaciones con las URLs y comandos necesarios para clonar y empezar a codear.

---

## 📈 Roadmap & Siguientes Pasos

Con el Hub completamente operativo y securizado, estos son los horizontes que propongo explorar:

1.  **Conexión RepuestosMOM**: Vincular el flujo de inventario real al dashboard de este perfil utilizando el modelo `product.product`. ¡Conexión verificada con éxito! 🔧🛒✅
2.  **IA Brújula Log-Analysis**: Próximo paso: desarrollar el servicio que lee logs de Cloud Run. 🧠🔍
3.  **Slack/Chat Automations**: Expandir las notificaciones para que incluyan reportes de salud diarios automáticos. 🤖📊

> [!TIP]
> **Rosa DevOps Tip**: "La automatización del backlog no es solo mover tarjetas; es asegurar que la IA tenga el contexto necesario (instrucciones) para actuar sin fricciones." 🦾✨

## 1. Migración a Secret Manager
Se eliminaron las credenciales hardcodeadas en ` projects/ai-service/index.js` y se integró el servicio de **Google Cloud Secret Manager**.

### Cambios en el Código:
- Se añadió la dependencia `@google-cloud/secret-manager`.
- Implementación de `getSecret()` y `initSecrets()` para carga dinámica.
- Refactorización del arranque del servidor para que sea asíncrono y espere a los secretos.

## 2. Resolución de Error de Despliegue (Post-Mortem)
Al desplegar la nueva versión, el servicio falló inicialmente con el error:
`Default STARTUP TCP probe failed 1 time consecutively`

### Diagnóstico:
- Los logs mostraron `PERMISSION_DENIED (code 7)`.
- La Service Account no tenía permisos para leer los secretos.

### Solución:
- Se ejecutó: `gcloud projects add-iam-policy-binding antigravity-cto --member="serviceAccount:598703083226-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"`
- Se realizó un redespliegue manual que resultó en **ÉXITO**.

## 3. Estado Final
El microservicio `ai-service` está operativo y seguro en:
🔗 [https://ai-service-nm65jwwkta-uc.a.run.app](https://ai-service-nm65jwwkta-uc.a.run.app)

---
> [!NOTE]
> Todo el "Project Hub" está ahora en estado **Production Ready**.
