# CLIPPER Redirect Admin

Panel privado para cambiar el destino de la redirección pública de CLIPPER.

## Producción

- Panel: `https://clipper-redirect-admin.vercel.app/admin`
- Proyecto: `zwiterion98s-projects/clipper-redirect-admin`
- Almacenamiento: Vercel Blob privado `clipper-redirect-config` (`gru1`)
- Web pública autorizada: `https://zwiterion98.github.io`

La contraseña se guarda solamente en `admin-access.local.txt`, ignorado por Git.
Compartir el enlace y la contraseña por mensajes separados.

## Despliegue en Vercel

1. Crear un proyecto de Vercel usando `vercel-admin` como Root Directory.
2. Conectar un Vercel Blob store con acceso **Private**.
3. Configurar estas variables para Production, Preview y Development:
   - `ADMIN_PASSWORD`: contraseña larga (mínimo 16 caracteres).
   - `SESSION_SECRET`: valor aleatorio de al menos 32 caracteres.
   - `DEFAULT_REDIRECT_URL`: destino usado antes de la primera actualización.
   - `PUBLIC_REDIRECT_ORIGIN`: `https://zwiterion98.github.io`.
4. Desplegar y verificar `/api/destination` y el login de `/admin`.
5. Configurar la web pública para consultar la URL del endpoint desplegado.

`BLOB_READ_WRITE_TOKEN` se agrega automáticamente al conectar el Blob store al proyecto. No se debe guardar ninguna contraseña o token en Git.
