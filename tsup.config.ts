import {defineConfig} from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    'action/index': 'src/action/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true
})