const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');
const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  outfile: './dist/extension.js',
  sourcemap: true,
  minify: isProduction,
  logLevel: 'info',
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log('Build complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
