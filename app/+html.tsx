import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/**
 * Componente raíz HTML para la Web y PWA (Progressive Web App).
 * Configura los metadatos de instalación, pantalla completa, barra de estado y colores de tema.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, maximum-scale=1, user-scalable=no"
        />

        {/* PWA & Mobile Web Capabilities */}
        <title>Nutrición IA Chile</title>
        <meta name="description" content="Seguimiento nutricional inteligente con IA para Chile" />
        <meta name="theme-color" content="#10B981" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nutrición IA" />

        {/* Manifest y Favicons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        {/* Estilos para evitar el scroll elástico y asegurar sensación de App Nativa */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root {
              height: 100%;
              overflow: hidden;
              user-select: none;
              -webkit-user-select: none;
              -webkit-touch-callout: none;
            }
            body {
              background-color: #F8FAFC;
            }
          `
        }} />

        {/* Registro del Service Worker para capacidades PWA Offline */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator && window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                  console.log('SW registration skipped:', err.message);
                });
              });
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
