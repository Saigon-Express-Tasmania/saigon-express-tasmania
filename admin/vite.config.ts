import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const projectRoot = path.resolve(__dirname, "..")
const reactRoot = path.resolve(projectRoot, "node_modules/react")
const reactDomRoot = path.resolve(projectRoot, "node_modules/react-dom")

// https://vite.dev/config/
export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "react/jsx-runtime", replacement: path.join(reactRoot, "jsx-runtime.js") },
      { find: "react/jsx-dev-runtime", replacement: path.join(reactRoot, "jsx-dev-runtime.js") },
      { find: "react-dom/client", replacement: path.join(reactDomRoot, "client.js") },
      { find: "react-dom", replacement: reactDomRoot },
      { find: "react", replacement: reactRoot },
      {
        find: '@/components/franchise-resources',
        replacement: path.resolve(__dirname, '../src/components/franchise-resources'),
      },
      {
        find: '@/types/franchise-resources',
        replacement: path.resolve(__dirname, '../src/types/franchise-resources'),
      },
      {
        find: '@/lib/franchise-resource-file-download',
        replacement: path.resolve(__dirname, '../src/lib/franchise-resource-file-download'),
      },
      {
        find: 'xlsx',
        replacement: path.resolve(projectRoot, 'node_modules/xlsx-js-style'),
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-pdf",
      "xlsx-js-style",
      "handsontable",
      "handsontable/registry",
    ],
    exclude: ["xlsx"],
  },
})
