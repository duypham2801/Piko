import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'db/migrate': 'src/db/migrate.ts',
  },
  format: ['esm'],
  target: 'node22',
  bundle: true,
  noExternal: [/^@wswd\//],
  sourcemap: true,
  clean: true,
});
