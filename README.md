# Reporte de traslado — PWA (132 SEM / BOSEM)

Aplicación web progresiva para el celular que registra, con la **hora del dispositivo (24 h)**,
signos vitales, medicamentos, bombas y ventilador de cada estado del traslado, y genera el
**reporte PDF** con membrete, firmas y nombre automático. Funciona **sin conexión**.

## Cómo probarla

La app necesita servirse por `http://localhost` o `https://` (el service worker y la cámara no
funcionan abriendo el archivo con doble clic).

```bash
cd pwa-transporte
python3 -m http.server 8080      # o: npx serve .
```

Abre `http://localhost:8080` en el navegador. Para instalarla en el celular, publica la carpeta en
cualquier hosting con HTTPS (GitHub Pages, Netlify, etc.), ábrela en Chrome/Safari y elige
**"Agregar a pantalla de inicio"**.

## Estructura

```
pwa-transporte/
├── index.html                 Esqueleto de la página
├── manifest.webmanifest       Datos de instalación (nombre, iconos, colores)
├── service-worker.js          Caché para uso sin conexión  (sube VERSION_CACHE al cambiar archivos)
├── assets/
│   ├── css/                   base.css (colores y estructura) · componentes.css
│   ├── img/                   logo-132sem.jpg · logo-minsal.png (membrete del PDF)
│   ├── icons/                 Iconos de la app (192 y 512)
│   └── vendor/                jspdf.umd.min.js (copia local para el PDF sin conexión)
└── src/
    ├── main.js                Arranque y barra inferior (Caso / Historial)
    ├── config/                ← AQUÍ se edita lo que cambia con frecuencia
    │   ├── constantes.js        Edad pediátrica (14), título del reporte, colores, juntas JVPM/JVPE
    │   ├── estados.js           Los 7 estados y desde cuál salen las leyendas rojas
    │   ├── catalogos.js         Listas del Excel (modos ventilatorios, I:E, soluciones…)
    │   └── rangosPAM.js         Rangos de PAM por edad
    ├── models/caso.js         Estructura de datos de un caso
    ├── services/              db (IndexedDB) · store (estado y guardado) · reloj · cámara · pdf · nombreArchivo
    ├── utils/                 Formatos de signos y hora, cálculo de PAM, edad pediátrica
    ├── components/            Modal, pestañas, campos, signos con PAM, lienzo de firma
    └── views/                 paciente · estado · reporte · historial · caso
```

Todos los archivos están comentados en español.

## Reglas que implementa

- **Hora**: siempre del dispositivo (`services/reloj.js`); nunca se puede editar.
- **Estados**: 7 pestañas. «Nuevo estado» cierra el actual y abre el siguiente con la hora actual.
- **Signos**: sin límite de tomas. Se escribe solo el número; la app da el formato
  (`TA: 120/80`, `FC: 90 x´`, `FR: 30 x´`, `SPO2: 100%`, `Hgt: 80 mg/dl`, `T°: 36 °C`, `Glasgow: 15`).
- **PAM** = (Sistólica + 2 × Diastólica) ÷ 3, con color y etiqueta según la **edad**
  (🔴 bajo · 🟢 normal · 🟠 alto). Rangos en `config/rangosPAM.js`.
- **Medicamentos**: «Registrar» con desplegable Bolo / Infusión (infusión pide velocidad).
  Los ya administrados al paciente aparecen como botones para elegirlos otra vez.
- **Bombas y ventilador**: «Cambiar bomba» y «Cambios en ventilador» crean un registro **nuevo**
  con su hora; el anterior se conserva.
- **Leyendas rojas** (desde Echo Alfa): si un estado no tiene registros, el reporte imprime
  «Sin modificaciones de ventilador mecánico» / «Sin modificaciones de medicamentos».
- **Campos vacíos** no se imprimen en el PDF.
- **Nombre del archivo**: `Ped.`/`Ad.` (14 años o menos = Ped.) + `DDMMAAAA` + `_N`
  → `Ad.05102026_1.pdf`. Meses y días cuentan como pediátrico.
- **Guardado automático** de cada cambio. «Guardar registro» envía el caso al **Historial**.

## Cómo editar cosas comunes

| Quiero… | Archivo |
|---|---|
| Cambiar la edad pediátrica | `src/config/constantes.js` → `EDAD_MAXIMA_PEDIATRICA` |
| Cambiar rangos de PAM | `src/config/rangosPAM.js` |
| Agregar un modo ventilatorio o solución | `src/config/catalogos.js` |
| Cambiar desde qué estado salen las leyendas rojas | `src/config/estados.js` → `leyendas` |
| Cambiar el título del PDF o los logos | `src/config/constantes.js` + `assets/img/` |
| Cambiar el diseño del PDF | `src/services/pdf.js` |
| Cambiar colores de la app | `assets/css/base.css` (variables de `:root`) |

Después de cambiar cualquier archivo, sube el número de `VERSION_CACHE` en `service-worker.js`
para que los celulares descarguen la versión nueva.

## Notas

- Los datos viven **solo en el dispositivo** (IndexedDB). Si se borran los datos del navegador
  o se desinstala la app, se pierden los casos que no se hayan descargado en PDF.
- Las leyendas de PAM usan los rangos entregados por el equipo; conviene que la dirección médica
  los valide antes del uso en campo.
