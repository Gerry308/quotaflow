import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildServer() {
  try {
    console.log('Building server...');
    
    await build({
      entryPoints: [resolve(__dirname, '../index.ts')],  // Changed from '../server/index.ts'
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: resolve(__dirname, '../dist/index.cjs'),
      external: [
        'pg-native',
        '@replit/*',
        'bufferutil',
        'utf-8-validate'
      ],
      packages: 'external',
      minify: false,
      sourcemap: true,
      logLevel: 'info'
    });
    
    console.log('✓ Server build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildServer();
