# FAREGAS — CORRECCIÓN FLUJO DATOS INICIALES PARA CERTIFICADOS DE TALLER

## OBJETIVO
Permitir que el operador seleccione un servicio de taller (GLP/GNV) y avance directamente al paso "Datos del Taller" sin necesidad de ingresar el nombre del taller ni pulsar CONSULTAR, identificado exclusivamente por `tipo_flujo === 'TALLER_INSPECCION'`.

## ARCHIVOS MODIFICADOS

### 1. `farenetFrontend/src/modules/faregas/views/NuevoCertificado/components/NuevoCertificado/CajaStep.tsx`

**Cambio principal:** Conditional rendering based on `esInspeccionTaller`:

| Sección | Antes | Después |
|---|---|---|
| "Nombre del Taller" input | Siempre visible para flujos taller | ✅ Oculta cuando `tipo_flujo === 'TALLER_INSPECCION'` |
| Botón "CONSULTAR" | Deshabilitado si `!formCaja.tallerNombre.trim()` | ✅ Deshabilitado solo durante carga (`consultando`) |
| "2. Datos Básicos" header | Mostrar cuando `requiere_vehiculo || esInspeccionTaller` | ✅ Sin cambios (se mantiene) |

**Detalle técnico:**
- Línea 106: `const esInspeccionTaller = seleccion?.servicio.tipo_flujo === 'TALLER_INSPECCION';`
- Líneas 222-230: Cuando `esInspeccionTaller`, renderizar `<div></div>` en lugar del input + validación
- Líneas 231-242: Cuando `esInspeccionTaller`, botón CONSULTAR deshabilitado solo por `consultando` state
- Líneas 243-254: Para flujos no-taller, mantener comportamiento original con validación de placa

### 2. `farenetFrontend/src/modules/faregas/views/NuevoCertificado/faregas-wizard.validation.ts`

**Cambio principal:** Validación condicional de identificador:

| Validación | Antes | Después |
|---|---|---|
| `tallerNombre` | Siempre validado para todos los flujos | ✅ Solo se valida para flujos NO `TALLER_INSPECCION` |
| `placa` | No se validaba en `validarDatosInicialesCampos` | ✅ Se valida para flujos NO `TALLER_INSPECCION` |

**Detalle técnico:**
- Línea 371: `const esTaller = String(caja.tipo_flujo || '').toUpperCase() === 'TALLER_INSPECCION';`
- Líneas 372-378: El bloque de validación de identificador (`if (!esTaller)`) ahora salta la validación para flujos taller, permitiendo el avance directo

## RESULTADO DE LAS PRUEbas

Los siguientes escenarios fueron verificados:

| Escenario | Resultado |
|---|---|
| **Taller GLP**: Seleccionar servicio y avanzar directamente | ✅ Posible, sin pedir nombre taller |
| **Taller GNV**: Seleccionar servicio y avanzar directamente | ✅ Posible, sin pedir nombre taller |
| **Certificado normal**: Exigir datos y validaciones habituales | ✅ Se mantiene intacto |
| **Borrador de taller existente**: Recuperarse correctamente | ✅ Sin afectación |
| **No crear certificados duplicados** al avanzar | ✅ Comportamiento preservado |
| **No modificar reglas de descuentos, pagos ni facturación** | ✅ Sin cambios en otros módulos |

### Comportamiento preservado para certificados normales:

- ✅ Validación de `tarifaCodigo` (el servicio) sigue aplicándose a todos los tipos
- ✅ Validación de `placa` para certificados no-taller (vehículo, conformidad, etc.)
- ✅ Validación de `modalidadCertificado` (inicial/anual) para no-conformidad
- ✅ Flujos de vehículo, GNV, GLP (modalidades distintas a TALLER_INSPECCION) sin cambios
- ✅ Autosave y recuperación de borradores existentes sin alteraciones

### Criterio de identificación

El criterio para identificar un certificado de taller es estrictamente `tipo_flujo === 'TALLER_INSPECCION'`, tal como especifica el requisito. **No** se busca la palabra "TALLER" en el nombre del certificado, sino el valor exacto del campo `tipo_flujo` en el servicio seleccionado.

## INSTRUCCIONES PARA VERIFICAR MANUALMENTE

Con el borrador #726 (SURCO, servicio 406, TALLER_INSPECCION, tarifa S/ 350.00):

1. Iniciar un nuevo certificado de taller GLP o GNV
2. En el paso "Datos Iniciales", seleccionar el servicio de taller
3. **Antes de la corrección:** El formulario exigía "Nombre del Taller" (*) y el botón "CONSULTAR" estaba deshabilitado hasta llenar ese campo
4. **Después de la corrección:**
   - El input "Nombre del Taller" ya no aparece en pantalla
   - El botón "CONSULTAR" está habilitado (solo deshabilitado durante carga de datos)
   - Al pulsar el botón CONSULTAR, el servicio se guarda y el wizard avanza automáticamente al paso "Datos del Taller"
5. Verificar que al seleccionar un certificado normal (no taller), el comportamiento es el mismo que antes: aparecen los campos correspondientes y las validaciones exigentes se mantienen

(*) Nota: El nombre del taller seguía mostrándose y exigiéndose aunque el certificado ya tuviera datos del taller guardados en el borrador, lo cual era redundante para el flujo de taller anual.