# Walkthrough: Securización y Estabilización de La Brújula

Este documento detalla el proceso de mejora de seguridad y la resolución de errores para el microservicio de IA.

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
