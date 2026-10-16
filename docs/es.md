# Anniversaries

## Presentación

Esta integración hace la cuenta atrás de las fechas que importan: cumpleaños, aniversarios de boda, conmemoraciones, eventos. Para cada fecha indica los días restantes, la edad que se cumple o los años transcurridos, y puede iniciar sus escenas el mismo día, unos días antes o en el recordatorio propio de cada fecha.

- Cada fecha se convierte en un **dispositivo**: días restantes, años en el próximo aniversario y años transcurridos, días pasados (opción), días hasta el medio aniversario (opción), próxima fecha.
- **Disparadores de escena**: una fecha es hoy, una fecha es dentro de N días, recordatorio de una fecha. **Acción de escena**: obtener las próximas fechas como texto para enviar.
- Dos **widgets del panel**: próximas fechas, cuenta atrás de una fecha.

![Los dos widgets de la integración: próximas fechas y cuenta atrás de un aniversario de boda (ilustración generada, no una captura de pantalla)](https://raw.githubusercontent.com/William-De71/gladys-anniversaries/main/docs/assets/widgets.es.png)

La imagen de arriba es una ilustración generada, no una captura de pantalla.

## Requisitos previos

- Gladys Assistant 5.1.0 o posterior.
- La zona horaria de Gladys bien configurada (**Ajustes > Sistema**): los días cambian a su medianoche.
- Nada más: ni cuenta, ni dispositivo, ni acceso a Internet.

## Configuración

Las fechas no se escriben en JSON: cada una es un pequeño formulario, tras los botones al final de la página de configuración.

| Campo o botón                 | Descripción                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hora de los eventos de escena | La hora (0 a 23) a la que las escenas «hoy», «dentro de N días» y de recordatorio empiezan cada día. 9 por defecto.                                         |
| Recordatorio por defecto      | Días antes de una fecha para sus escenas «Recordatorio de una fecha», para las fechas sin recordatorio propio. 7 por defecto, 0 para ninguno.               |
| Idioma de los textos          | Nombres de funciones, próxima fecha, resúmenes de escenas, mensajes de los botones. Automático: el idioma de su panel en cuanto se haya mostrado un widget. |
| Añadir una fecha              | Nombre, día, mes, año (vacío si se desconoce), tipo, cada año o una sola vez, recordatorio propio, «contar los días pasados», «medio aniversario».          |
| Modificar una fecha           | El nombre o número de la fecha (como lo muestra «Listar las fechas») y solo los campos que cambian. Un año 0 quita el año.                                  |
| Eliminar una fecha            | Su nombre o número. Su dispositivo permanece en Gladys hasta que lo elimine.                                                                                |
| Listar las fechas             | Todas las fechas con su número, próxima vez, años y opciones, y el día y la zona horaria que usa la integración.                                            |

Las fechas se guardan en la configuración de la integración en Gladys: siguen sus copias de seguridad de Gladys.

## Uso

### Fechas

- **Con o sin año**: sin él, la integración cuenta los días pero no los años.
- **Cada año o una sola vez**: una fecha única (un evento, un plazo) necesita su año; una vez pasada, sus días restantes se vuelven negativos y sale de los widgets.
- El **29 de febrero** cae el 28 de febrero los demás años.
- **Tipo**: cumpleaños, aniversario de boda, aniversario, conmemoración, evento u otro. Las escenas y los widgets pueden filtrar por él.

### Dispositivos

Tras **Añadir una fecha**, abra la pestaña **Descubrir** de la integración y añada la fecha: se convierte en un dispositivo con su nombre.

- Días restantes (días; 0 el mismo día).
- Años en el próximo aniversario y años transcurridos (si se conoce el año; «edad» para un cumpleaños).
- Días pasados (opción «contar los días pasados»): desde la última vez, o desde una fecha única.
- Días hasta el medio aniversario (opción), seis meses después de la fecha.
- Próxima fecha, escrita en el idioma de la integración.

Los valores cambian a medianoche en la zona horaria de Gladys. Si cambia las opciones de una fecha, su dispositivo recibe nuevas funciones: pulse **Actualizar** en la pestaña Descubrir.

### Widgets del panel

- **Próximas fechas**: las próximas fechas (1 a 8), con los años cumplidos, el día y una insignia (verde el mismo día, naranja dentro del recordatorio). Ajustes: cuántas, dentro de cuántos días, qué tipos. Toque una fecha para ver sus detalles.
- **Cuenta atrás**: una fecha entre los dispositivos añadidos: días restantes, años, días pasados, fecha original, medio aniversario y recordatorio.

### Escenas

Disparadores, enviados una vez al día a la hora de la configuración (nunca dos veces para la misma fecha el mismo día; si Gladys estaba detenida a esa hora, llegan a su vuelta, el mismo día):

- **Una fecha es hoy**: filtros por fecha y tipos.
- **Una fecha es dentro de N días**: usted elige N (1 a 60), por ejemplo 7 para «una semana antes».
- **Recordatorio de una fecha**: cuando una fecha alcanza su propio recordatorio (o el predeterminado).

Variables: nombre, tipo, años cumplidos, fecha original, día, días restantes y una frase de resumen lista («Marie: en 7 días, jueves, 24 de diciembre de 2026 (31 años)»).

Acción **Obtener las próximas fechas**: dentro de N días (0 solo hoy), opcionalmente para algunos tipos; devuelve el número, un resumen (una línea por fecha) y la fecha más cercana.

Ejemplos:

- Cuando un cumpleaños es hoy → enviar «{{triggerEvent.data.summary}}» a la familia y poner la luz del salón en un color festivo.
- Cuando una fecha es dentro de 7 días, tipo aniversario de boda → enviarse un mensaje para reservar el restaurante.
- Cada lunes a las 8:00 → obtener las próximas fechas en 7 días → enviar el resumen por mensaje.

### Transporte

Local: la integración no llama a ningún servicio en línea, nada sale de su Gladys. Su insignia en el catálogo indica «local».

## Solución de problemas

- **Una fecha aparece desplazada un día**: compruebe la zona horaria de Gladys (Ajustes > Sistema); «Listar las fechas» muestra el día y la zona horaria que usa la integración.
- **Una escena no se ha iniciado**: los eventos llegan a la hora de la configuración, no a medianoche. Una fecha añadida después de esa hora envía enseguida sus eventos del día; una fecha nunca envía dos veces el mismo evento el mismo día.
- **Falta una función tras una modificación**: pulse **Actualizar** en el dispositivo en la pestaña Descubrir.
- **Otra cosa**: abra una issue en GitHub (https://github.com/William-De71/gladys-anniversaries/issues) con las versiones de Gladys y de la integración, el resultado de «Listar las fechas» y los registros de la integración (Ajustes > Supervisión).
