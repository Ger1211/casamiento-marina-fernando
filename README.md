# Invitación Marina & Fernando

Invitación digital de casamiento para **Marina & Fernando** con dos versiones:

- `index.html` — Invitación al **Civil + Iglesia**
- `reunion.html` — Invitación a la **Reunión íntima**

Diseño en paleta **oliva + celeste pastel**, con hojas y flores en acuarela, y animaciones con **GSAP**.

---

## Estructura

```
invitacion-marina-fernando/
├── index.html              # Civil + Iglesia
├── reunion.html            # Reunión íntima
├── css/
│   └── styles.css          # Estilos compartidos
├── js/
│   ├── main.js             # Animaciones, countdown, RSVP, calendario
│   ├── gsap.min.js         # Librería GSAP (local)
│   └── ScrollTrigger.min.js # Plugin ScrollTrigger de GSAP (local)
├── assets/
│   ├── eucalyptus.png      # Hojas de eucalipto (decoración)
│   ├── floral-corner.png   # Esquina floral azul y blanca
│   ├── hojas.svg           # Hojas SVG sutiles de fondo
│   └── favicon.svg         # Ícono del sitio
└── README.md
```

---

## Cómo personalizar los datos

Todos los datos de ejemplo están marcados para reemplazar fácilmente. Editá los archivos `.html` con la información real.

### Fecha y hora

En la etiqueta `<html>` de cada página:

```html
<!-- index.html -->
<html lang="es" data-date="2026-12-05T11:00:00-03:00">

<!-- reunion.html -->
<html lang="es" data-date="2026-12-05T13:30:00-03:00">
```

El formato es ISO 8601. El `-03:00` es la zona horaria de Argentina.

### Nombres, textos, direcciones

Buscá en cada `index.html` y `reunion.html` los textos entre etiquetas y reemplazalos por los reales:

- Nombres de los novios
- Fecha y horarios
- Nombres y direcciones de los lugares
- Links de Google Maps
- Textos del itinerario

### Botón "Agregar al calendario"

En cada botón `#btn-calendar` ajustá:

```html
data-title="..."
data-location="..."
data-details="..."
data-start="AAAAMMDDTTHHMMSS"
data-end="AAAAMMDDTTHHMMSS"
```

---

## RSVP con Google Forms

El formulario de confirmación puede enviar las respuestas a un **Google Form**. Para configurarlo:

1. Creá un formulario en [Google Forms](https://forms.google.com).
2. Agregá las preguntas:
   - Nombre y apellido
   - ¿Vas a poder acompañarnos?
   - Cantidad de personas
   - Restricciones alimentarias
   - Mensaje para los novios
3. Publicá el formulario (icono de ojo → enviar → icono de link → copiar el ID).
4. Abrí el formulario en una pestaña de incógnito, completalo con datos de prueba y envialo.
5. En las herramientas de desarrollador del navegador (F12 → Network), buscá la petición `formResponse`.
6. Copiá los parámetros `entry.XXXXXXXXX` de cada campo.
7. En los archivos HTML, reemplazá:

```html
data-form-id="REEMPLAZAR_FORM_ID"
data-entry-name="entry.REEMPLAZAR"
data-entry-attend="entry.REEMPLAZAR"
data-entry-guests="entry.REEMPLAZAR"
data-entry-restrictions="entry.REEMPLAZAR"
data-entry-message="entry.REEMPLAZAR"
```

> **Nota:** mientras no configures el Google Form, el formulario funciona en modo demo: guarda los datos en `localStorage` y muestra el mensaje de agradecimiento.

---

## URL personalizada para invitados

Para mostrar el nombre del invitado en la pantalla de bienvenida, usá el parámetro `?invitados=`:

```
https://tusuario.github.io/invitacion-marina-fernando/?invitados=Juan%20y%20María
```

El nombre también se precarga en el campo del RSVP.

---

## Subir a GitHub Pages

1. Creá un repositorio nuevo en GitHub (por ejemplo: `invitacion-marina-fernando`).
2. Subí todos los archivos del proyecto a la rama `main`.
3. Andá a **Settings → Pages**.
4. En "Build and deployment" seleccioná:
   - Source: **Deploy from a branch**
   - Branch: **main** → **/(root)**
5. Guardá. En unos minutos el sitio estará en:

```
https://tusuario.github.io/invitacion-marina-fernando/
```

---

## Dominio propio

Cuando compres un dominio, agregá un archivo `CNAME` en la raíz del proyecto con el dominio:

```
marina-y-fernando.com
```

Luego configurá los registros DNS del dominio para que apunten a GitHub Pages:

- Tipo **A**:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- O tipo **CNAME** si usás un subdominio (por ejemplo `www`):
  - `tusuario.github.io`

Más info: [Configuring a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

---

## Créditos de imágenes

- Hojas de eucalipto y esquina floral: recursos gratuitos de [CleanPNG](https://www.cleanpng.com/).
- Fuentes: Google Fonts (Dancing Script, Cormorant Garamond, Jost).
- Animaciones: GSAP.

---

## Notas

- El sitio es completamente estático: no necesita backend.
- No incluye música ni código de vestimenta, según lo solicitado.
- Las dos invitaciones comparten los mismos estilos y scripts para mantener la coherencia visual.
