# Prototipo v2 (fuente de verdad del frontend)

Esta carpeta tiene el prototipo *Vitto Club Prototipo v2*, exportado de Claude Design como
**Standalone HTML** ("archivo único") y desempaquetado.

**Por qué desempaquetado.** El archivo único guarda los componentes comprimidos: Claude no puede buscar
texto adentro. Desempaquetado, cada pantalla es un `.html` que se busca con grep.

| Archivo | Qué tiene |
|---|---|
| `pagina-principal.html` | Login y las vistas Cliente, Cajero y Administrador, Configuración y modales |
| `RegistrarConsumo.html` | Buscar cliente, vista previa, "Consumo registrado" y paneles de 24 hs |
| `FichaCliente.html` | Ficha del cliente |
| `Consumos.html` | Listado y detalle de consumos y modal de anulación |
| `MovimientosPuntos.html` | Movimientos de puntos (Administrador) |
| `Auditoria.html` | Auditoría |
| `MiPerfil.html` | Mi perfil del Cliente |
| `CambiarPassword.html` | Ventana "Cambiá tu contraseña" |
| `SidebarMenu.html` | Menú lateral |

## Cómo actualizarlo cuando cambie el prototipo

1. En Claude Design: Export → **Standalone HTML**.
2. Desde la raíz del repo:
   ```bash
   python scripts/desempaquetar_prototipo.py "ruta/al/archivo-unico.html" docs/prototipo/v2
   ```
3. Si el script avisa `SIN-NOMBRE-xxxx`, hay un componente nuevo: avisá para sumarle su nombre al script.
4. Anotá abajo la fecha, y commiteá.

Si no se actualiza, Claude programa contra una versión vieja.

Último export cargado: **(completar fecha)**
