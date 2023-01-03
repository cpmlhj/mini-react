import { resolve } from 'path'
import { readFileSync } from 'fs'
import typescript from 'rollup-plugin-typescript2'
import commonJS from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

export const rootPath = resolve(__dirname, '../../')
export const pkgPath = resolve(rootPath, 'packages')
export const distPath = resolve(rootPath, 'dist/node_modules')

export function resolvePkgPath(pkgName, isDist) {
	if (isDist) {
		return `${distPath}/${pkgName}`
	}
	return `${pkgPath}/${pkgName}`
}

export function getPkgJson(pkgname) {
	// 路径
	const path = `${resolvePkgPath(pkgname)}/package.json`
	const str = readFileSync(path, { encoding: 'utf8' })
	return JSON.parse(str)
}

export function getBaseRollupPlugin(
	alias = {
		__DEV__: () => JSON.stringify('yes'),
		preventAssignment: true
	},
	tsConfig = {}
) {
	console.log(alias, '==================')
	return [replace(alias), commonJS(), typescript(tsConfig)]
}
