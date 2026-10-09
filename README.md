# 🥗 Nutrición App

Aplicación moderna de seguimiento nutricional con Inteligencia Artificial, adaptada para hábitos y alimentos chilenos. Funciona como **PWA (Progressive Web App)** en web/móvil y en **iOS / Android** mediante Expo y React Native.

La integración opcional con USDA FoodData Central complementa los alimentos identificados
por Gemini o Groq con referencias nutricionales revisadas. Configuración y alcance:
[Gemini y USDA](docs/usda-integration.md).
El coach, texto, audio e imágenes reparten el trabajo entre proveedores con respaldo automático:
[proveedores y cuotas de IA](docs/ai-providers.md).
El coach permite escuchar sus respuestas y conversar con Gemini Live en la web/PWA:
[voz y formato de mensajes](docs/coach-voice.md).

---

## 🚀 Requisitos Previos

* **Node.js**: v18 o v20+ (recomendado LTS)
* **npm** o **yarn**
* **Git**

---

## 📦 Instalación Rápida en una Nueva Computadora

Para clonar y poner a andar el proyecto en tu PC de escritorio, sigue estos pasos:

### 1. Clonar el repositorio
```bash
git clone https://github.com/barvaro0411/Nutricionapp.git
cd Nutricionapp
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia la plantilla de ejemplo para crear tu archivo `.env.local`:

```bash
cp .env.example .env.local
```

Abre `.env.local` y completa las credenciales públicas de Supabase. Configura las claves de Gemini y Groq como secretos de las funciones del servidor según [esta guía](docs/ai-providers.md):
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 4. Iniciar la aplicación
* **Para abrir en el navegador web:**
  ```bash
  npm run dev:web
  ```
  *(La app abrirá en `http://localhost:8081`)*

* **Para abrir en celular con Expo Go (código QR):**
  ```bash
  npm start
  ```

---

## 🛠️ Scripts Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev:web` | Inicia el servidor de desarrollo web en tiempo real. |
| `npm start` | Inicia el bundler Metro de Expo para móviles y web. |
| `npm test` | Ejecuta la suite de pruebas unitarias (Jest). |
| `npm run type-check` | Verifica que no existan errores de tipos con TypeScript. |
| `npm run lint` | Ejecuta validación estática de código con ESLint. |
| `npm run build:pwa` | Compila la PWA lista para producción e inyecta Service Worker en `dist/`. |
| `npm run icons` | Genera favicon y recursos PNG PWA a partir de `assets/icon.svg`. |
| `npm run check:tooling` | Verifica integridad de seguridad en la cadena de compilación. |

Para documentación detallada de arquitectura, integraciones y voz, consulta el **[Índice de Documentación](docs/README.md)**.

---

## 📁 Estructura del Proyecto

* **`app/`**: Enrutamiento basado en archivos (Expo Router).
  * `(tabs)/`: Pantallas de la barra inferior (*Hoy*, *Historial*, *Registrar*, *Coach IA*, *Ajustes*).
  * `meal/`: Flujos de registro de comida (*Cámara IA*, *Código de barras*, *Revisión*).
  * `coach/`: Chat interactivo con el Coach Nutricional IA.
  * `recipes/`: Generador y visor de recetas saludables adaptadas a tus macros.
* **`src/components/`**: Componentes reutilizables de UI (Dashboard, Modales, Tarjetas).
* **`src/hooks/`**: Lógica de datos y sincronización con Supabase (React Query).
* **`src/stores/`**: Manejo de estados globales rápidos con Zustand.
* **`supabase/functions/`**: Edge Functions en Deno para procesar IA con Gemini, Groq y USDA:
  * `analyze-meal`: Visión por computadora para fotos de platos.
  * `parse-meal-text`: Procesamiento de lenguaje natural y dictado por voz.
  * `nutrition-coach`: Asistente nutricional contextualizado con tus metas y comidas.
  * `coach-live-session`: Tokens temporales para Gemini Live y guardado del diálogo por voz.
  * `search-foods`: Búsqueda y enriquecimiento nutricional de alimentos USDA.
* **`supabase/migrations/`**: Esquema de base de datos relacional PostgreSQL con RLS.

---

## ☁️ Despliegue en Producción

La versión PWA de producción se encuentra desplegada en:
🌐 **[https://dist-two-alpha-18.vercel.app](https://dist-two-alpha-18.vercel.app)**
