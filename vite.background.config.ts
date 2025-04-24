import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/background/index.ts'),
      formats: ['es'],
      fileName: () => 'background.js'
    }
  }
}); 