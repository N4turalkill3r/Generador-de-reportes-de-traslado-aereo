/*
 * service-worker.js — Hace que la app funcione SIN CONEXIÓN.
 * Estrategia: "cache first". Al instalar guarda todos los archivos de la app;
 * después los sirve desde el caché y solo va a la red si no los tiene.
 *
 * IMPORTANTE: cada vez que cambies un archivo de la app, sube el número de
 * VERSION_CACHE para que los celulares descarguen la versión nueva.
 */
const VERSION_CACHE = 'traslado-v2';

// Lista de archivos de la app (rutas relativas a esta carpeta).
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest',
  './assets/css/base.css', './assets/css/componentes.css',
  './assets/img/logo-132sem.jpg', './assets/img/logo-minsal.png',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/vendor/jspdf.umd.min.js',
  './src/main.js',
  './src/config/constantes.js', './src/config/estados.js', './src/config/catalogos.js', './src/config/rangosPAM.js',
  './src/models/caso.js',
  './src/services/db.js', './src/services/store.js', './src/services/reloj.js', './src/services/camara.js',
  './src/services/nombreArchivo.js', './src/services/pdf.js',
  './src/utils/dom.js', './src/utils/formatoHora.js', './src/utils/formatoSignos.js',
  './src/utils/calculoPAM.js', './src/utils/formatoRegistros.js', './src/utils/edadPediatrica.js',
  './src/components/modal.js', './src/components/pestanas.js', './src/components/camposSignos.js',
  './src/components/insigniaPAM.js', './src/components/firma.js', './src/components/camposComunes.js',
  './src/views/casoView.js', './src/views/pacienteView.js', './src/views/estadoView.js',
  './src/views/reporteView.js', './src/views/historialView.js'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSION_CACHE).then((c) => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  // Borra cachés de versiones anteriores.
  evento.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== VERSION_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(
    caches.match(evento.request).then((enCache) => enCache || fetch(evento.request))
  );
});
