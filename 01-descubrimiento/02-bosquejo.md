# Bosquejo

Tres partes:

1. **Pedidos en la tableta de Araujos.** Switch Local | Envío. En Envío, un campo Clave y, al cerrar verdura, una revisión con Cancelar y Enviar pedido. Un arco girando espera el número. Con el número, la verdura se cierra en AMG y aparece el éxito.
2. **PWA de la distribuidora.** Panel. Crear cuenta genera la llave y la muestra. El inbox y el detalle leen la misma puerta. Vista previa del label.
3. **Android de la distribuidora.** La misma lista, notificación al entrar un pedido, detalle e impresión Zebra 4 × 2.5. Cada build copia `apk/Distribuidora.apk`.

La tableta manda un mensaje HTTP con la llave del cliente. La API de la distribuidora es la única que inserta en su base MySQL. El panel y la Android preguntan si hay algo nuevo. No escriben el pedido.
