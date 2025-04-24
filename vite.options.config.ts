import { defineConfig } from 'vite';
import path from 'path';

// Config for building the options page (HTML + JS)
export default defineConfig({
  // root: path.resolve(__dirname, 'src/options'), // REMOVED
  // base: './', // REMOVED - caused incorrect relative path
  build: {
    // Output relative to the project root, into its own subdirectory
    outDir: path.resolve(__dirname, 'dist/options'), 
    emptyOutDir: true, // Clean this specific output directory
    rollupOptions: {
      // Use an object with absolute path to explicitly name the output chunk
      input: {
        options: path.resolve(__dirname, 'src/options/index.html')
      }, 
      output: {
        // JS output name is based on input key ('options.js')
        entryFileNames: `assets/[name].js`, // No HASH
        chunkFileNames: `assets/[name].js`,
        // Use assetFileNames to handle the preserved path
        assetFileNames: (assetInfo) => {
          // Check if the source asset name ends with the expected path
          if (assetInfo.name?.endsWith('src/options/index.html')) {
            // Output it as options.html at the root of outDir
            return 'options.html';
          }
          // Place other assets (CSS, images) in the assets dir
          return `assets/[name][extname]`; // No HASH
        },
      }
    }
  },
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      // Force relative paths for JS assets
      if (hostType === 'html' && filename.startsWith('assets/') && filename.endsWith('.js')) {
        return { relative: true }; // Use default Vite relative path generation
      }
    }
  }
}); 