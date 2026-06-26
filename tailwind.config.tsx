import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        farenet: {
          azul: '#0033a0',   // Azul marino corporativo
          rojo: '#e4002b',   // Rojo de acento
          gris: '#fbf30dff'    // Fondo general limpio
        }
      }
    },
  },
  plugins: [],
};

export default config;