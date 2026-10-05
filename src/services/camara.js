/**
 * camara.js — Toma una foto con la cámara del dispositivo.
 * Usa un <input type="file" capture="environment">, que en el celular abre la cámara.
 * La foto se reduce de tamaño (FOTO_LADO_MAXIMO) y se devuelve como Blob JPEG.
 */
import { FOTO_LADO_MAXIMO, FOTO_CALIDAD_JPEG } from '../config/constantes.js';

/** Abre la cámara y devuelve un Blob, o null si el usuario cancela. */
export function tomarFoto() {
  return new Promise((resolver) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
      const archivo = input.files && input.files[0];
      input.remove();
      if (!archivo) return resolver(null);
      try {
        resolver(await reducir(archivo));
      } catch (e) {
        console.error('No se pudo procesar la foto', e);
        resolver(archivo); // Si falla la reducción, se guarda la original.
      }
    });
    input.addEventListener('cancel', () => { input.remove(); resolver(null); });
    input.click();
  });
}

/** Reduce la imagen manteniendo la proporción. */
async function reducir(archivo) {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, FOTO_LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return new Promise((resolver) => lienzo.toBlob((b) => resolver(b), 'image/jpeg', FOTO_CALIDAD_JPEG));
}
