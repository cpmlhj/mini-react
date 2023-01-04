import { getPkgJson, resolvePkgPath, getBaseRollupPlugin } from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'

const { name, module } = getPkgJson('react')
const pkgPath = resolvePkgPath(name)
const pkgBuildPath = resolvePkgPath(name, true)

export default [
	// react
	{
		input: `${pkgPath}/${module}`,
		output: {
			file: `${pkgBuildPath}/index.js`,
			name: 'React',
			format: 'umd'
		},
		plugins: getBaseRollupPlugin()
	},
	// jsx-runtime
	{
		input: `${pkgPath}/src/jsx.ts`,
		output: [
			// prod
			{
				file: `${pkgBuildPath}/jsx.runtime.js`,
				name: 'jsx.runtime',
				format: 'umd'
			},
			// dev
			{
				file: `${pkgBuildPath}/jsx.dev-runtime.js`,
				name: 'jsx.dev-runtime',
				format: 'umd'
			}
		],
		plugins: [
			...getBaseRollupPlugin(),
			generatePackageJson({
				inputFolder: pkgPath,
				outputFolder: pkgBuildPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					main: 'index.js'
				})
			})
		]
	}
]
