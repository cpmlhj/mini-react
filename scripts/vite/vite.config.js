import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolvePkgPath } from '../rollup/utils'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: [
			{
				find: 'react',
				replacement: resolvePkgPath('react')
			},
			{
				find: 'react-dom',
				replacement: resolvePkgPath('react-dom')
			},
			{
				find: 'react-noop-renderer',
				replacement: resolvePkgPath('react-noop-renderer')
			},
			{
				find: 'hostConfig',
				replacement: resolve(
					resolvePkgPath('react-dom'),
					'src',
					'hostConfig.ts'
				)
			}
		]
	}
})
