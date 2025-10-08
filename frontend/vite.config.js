import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Pothole Detection App',
        short_name: 'PotholeApp',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#242424',
        background_color: '#242424',
        icons: [
          { src: '/256.png', sizes: '192x192', type: 'image/png' },
          { src: '/512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })

  ],
  server: {
    host: true, // listen on all interfaces
    port: 5173, // optional, default Vite port
    https: {
      key: fs.readFileSync("localhost-key.pem"), // your HTTPS key
      cert: fs.readFileSync("localhost.pem")     // your HTTPS certificate
    }
  }
});
