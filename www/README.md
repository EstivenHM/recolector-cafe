# ☕ Recolector Café - PWA para Android

Aplicación Web Progresiva (PWA) móvil diseñada para el control diario y semanal de cajuelas de café recolectadas por cortadores, con cálculo de pagos en colones costarricenses (₡) y almacenamiento 100% offline mediante `localStorage`.

Desarrollada **exclusivamente con HTML5, CSS3 y JavaScript Vanilla** (sin frameworks, sin npm, sin node_modules), completamente optimizada y lista para empaquetarse en un APK de Android mediante [PWABuilder](https://www.pwabuilder.com/).

---

## 📱 Características Principales

1. **Vista "Usuarios" (Pantalla Principal)**:
   - Tabla responsiva optimizada para pantallas táctiles móviles: `Nombre | Cajuelas | Monto (₡) | Acción`.
   - Cálculo automático del monto: `Cajuelas de la semana * Precio actual de la cajuela`.
   - Botón `[+]` táctil que abre el modal para registrar cajuelas:
     - Admite valores decimales (`step="0.01"`, `inputmode="decimal"`), como `18.25`, `0.5`, `1.75`.
     - Normalización automática de comas y puntos (soporta cualquier teclado de Android).
     - Atajos rápidos de incremento (`+0.25`, `+0.50`, `+1`, `+2`, `+5`).
     - Vista previa en tiempo real del monto equivalente en colones.
   - **Corte semanal automático**: Verifica si ha iniciado una nueva semana (domingo a las 00:00) y reinicia el contador semanal de la vista Usuarios a 0 sin tocar el Historial acumulado.
   - **Botón manual "Reiniciar Semana"**: Con ventana de confirmación para hacer el cierre en el horario deseado.
   - Búsqueda y filtrado dinámico de recolectores.

2. **Vista "Crear Usuario"**:
   - Registro de cortadores con validación contra nombres vacíos o duplicados (insensible a mayúsculas/minúsculas).
   - Lista visual de recolectores registrados.

3. **Vista "Historial"**:
   - Tabla: `Nombre | Total Cajuelas | Monto Acumulado (₡)`.
   - Acumulado permanente de toda la temporada/cosecha que persiste aunque se reinicien las semanas.
   - Botón **"Limpiar Historial"** con modal de confirmación antes de resetear a 0.

4. **Vista "Ajustes"**:
   - Permite consultar y modificar el **Precio actual de la cajuela (₡)** (valor por defecto: `₡2,000`).
   - Botones "Guardar" y "Cancelar" (Cancelar restaura el valor anterior).
   - Todos los montos se recalculan de inmediato al guardar.

5. **Robustez y Prevención de Errores**:
   - Blindaje total contra `NaN`, `undefined` o `null`.
   - Validación estricta con `parseFloat()` y `Number.isFinite()`.
   - Sistema de notificaciones flotantes **Toast** (éxito, error, advertencia, información).
   - 100% Offline con Service Worker (`sw.js`) y `manifest.json`.

---

## 📂 Estructura del Proyecto

```text
recolector-cafe/
│
├── index.html              # Interfaz completa de la aplicación (SPA sin dependencias)
├── manifest.json           # Manifiesto Web PWA con configuración para Android
├── sw.js                   # Service Worker para funcionamiento 100% offline
├── README.md               # Documentación y guía de empaquetado APK
│
├── css/
│   └── style.css           # Estilos mobile-first, responsive, tema cafetalero
│
├── js/
│   └── app.js              # Lógica de cálculo, validaciones, navegación y almacenamiento
│
└── icons/
    ├── icon-192.png        # Icono PWA para pantallas estándar (192x192)
    ├── icon-512.png        # Icono PWA de alta resolución (512x512)
    ├── icon-maskable.png   # Icono adaptable para Android (maskable)
    ├── favicon.png         # Icono para navegador
    └── icon.svg            # Gráfico vectorial original
```

---

## 🚀 Cómo Probar la Aplicación en la PC o Móvil

### Opción 1: Abrir directamente en el navegador
Simplemente haz doble clic en `index.html` para abrirlo en Chrome, Edge o Firefox.

### Opción 2: Usar un servidor HTTP local (Recomendado para Service Worker)
Los Service Workers requieren HTTPS o `localhost`. Puedes iniciar un servidor ligero sin instalar nada adicional:
- Con Python:
  ```bash
  cd recolector-cafe
  python -m http.server 8080
  ```
- O con Node.js:
  ```bash
  cd recolector-cafe
  npx serve .
  ```
Luego abre en tu navegador `http://localhost:8080`.

---

## 📦 Cómo Convertir a APK para Android con PWABuilder (Sin instalar dependencias)

1. **Subir los archivos a un hosting gratuito con HTTPS**:
   - Puedes usar **GitHub Pages**, **Vercel**, **Netlify** o **Firebase Hosting** (todos ofrecen HTTPS gratuito).
   - *Ejemplo con GitHub Pages:*
     1. Crea un repositorio en GitHub (ej: `recolector-cafe`).
     2. Sube el contenido de la carpeta `recolector-cafe`.
     3. Ve a **Settings** > **Pages** y selecciona la rama `main` y carpeta `/root`.
     4. Tu app quedará publicada en: `https://tu-usuario.github.io/recolector-cafe/`.

2. **Generar el APK en PWABuilder**:
   1. Ingresa a [https://www.pwabuilder.com/](https://www.pwabuilder.com/).
   2. Pega la URL de tu aplicación (ej: `https://tu-usuario.github.io/recolector-cafe/`).
   3. Haz clic en **Start**. PWABuilder verificará el `manifest.json`, los iconos y el Service Worker (obtendrá puntaje perfecto).
   4. Haz clic en **Package for Stores** y selecciona **Android**.
   5. Haz clic en **Generate Package**.
   6. Descarga el archivo `.zip`. Dentro encontrarás el archivo `.apk` listo para instalar en cualquier teléfono Android, y el archivo `.aab` por si deseas subirlo a Google Play Store.

3. **Instalación Directa como PWA en Android**:
   - También puedes abrir la URL en Google Chrome en el teléfono Android.
   - Pulsa los tres puntos ⋮ del navegador y selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
   - Se instalará exactamente igual que una app nativa, con su icono, pantalla completa y acceso offline en el cafetal.

