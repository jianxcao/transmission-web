import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'
import svgLoader from 'vite-svg-loader'
import AutoImport from 'unplugin-auto-import/vite'
import fs from 'node:fs'
import { VitePWA } from 'vite-plugin-pwa'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const base = env.VITE_BASE_URL || ''
  const manifestBase = base.endsWith('/') ? base || '/' : `${base}/`

  // 读取 package.json 中的版本号
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))

  return {
    base: base,
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version)
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        // output: {
        //   manualChunks: {
        //     common: ['vue', 'vue-router', '@vueuse/core', 'pinia'],
        //     ui: ['naive-ui']
        //   }
        // }
        output: {
          advancedChunks: {
            groups: [
              {
                test: /node_modules\/(?:vue|vue-router|@vueuse\/core|pinia)/,
                name: 'common',
                priority: 1
              },
              {
                test: /node_modules\/(?:naive-ui)/,
                name: 'ui',
                priority: 2
              }
            ]
          }
        }
      }
    },
    envPrefix: ['VITE_'],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    plugins: [
      vue(),
      svgLoader(),
      Unocss(),
      AutoImport({
        imports: ['vue', '@vueuse/core', 'vue-router'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: {
          enabled: true
        },
        vueTemplate: true
      }),
      Components({
        resolvers: [NaiveUiResolver()],
        dts: true
      }),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['transmission.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png'],
        manifest: {
          name: 'Transmission Web',
          short_name: 'Transmission',
          description: packageJson.description,
          start_url: manifestBase,
          scope: manifestBase,
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#d92323',
          icons: [
            {
              src: `${manifestBase}pwa-192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: `${manifestBase}pwa-512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: `${manifestBase}transmission.svg`,
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: `${manifestBase}apple-touch-icon.png`,
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            }
          ]
        },
        devOptions: {
          enabled: true
        },
        workbox: {
          cleanupOutdatedCaches: true
        }
      })
    ],
    server: {
      host: '0.0.0.0',
      port: 5174,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      proxy: {
        '/transmission/rpc': {
          target: env.VITE_DOMAIN,
          changeOrigin: true
        }
      }
    }
  }
})
