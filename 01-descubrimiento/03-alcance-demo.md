# Alcance del demo

Entra en este corte:

- Base nueva `distribuidora` en MySQL local (XAMPP).
- Puerta PHP: crear cuenta, recibir mensaje, listar pedidos.
- Llave secreta por cliente, creada con la cuenta y enviada en el mensaje.
- PWA verde con Heroicons: crear cuenta, inbox, aviso, detalle, vista previa de labels.
- Android de la distribuidora: notificación, detalle, labels (`ceil` de la cantidad, `n de N` por producto) y copia de la APK a `apk/Distribuidora.apk`.
- En Pedidos de Araujos: switch Local | Envío guardado solo en esa tableta, campo Clave, revisión, indicador girando, éxito con el número.

Queda fuera:

- Portal para que otros restaurantes pidan solos.
- Precios, factura, inventario, rutas, faltantes y sustituciones.
- La tableta escribiendo SQL en la base de la distribuidora.
- Push Firebase.
- Cambiar el cierre de bodega o de carnes.
- Guardar el switch en el servidor de operaciones.

## Arranque local

1. MySQL de XAMPP encendido.
2. `database/schema.sql` sobre la base `distribuidora`.
3. `api/config/db.sample.php` copiado a `api/config/db.php`.
4. `cd api` y `C:\xampp\php\php.exe -S 0.0.0.0:8084 -t .`
5. `cd app`, `npm install`, `npm run dev` → `http://localhost:4323`.
6. En la tableta, la URL de la puerta es la IP de esta máquina, puerto 8084. En el emulador, `10.0.2.2`.
