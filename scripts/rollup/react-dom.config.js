import { getPkgJson, resolvePkgPath, getBaseRollupPlugin } from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

const { name, module } = getPkgJson('react-dom')
const pkgPath = resolvePkgPath(name)
const pkgBuildPath = resolvePkgPath(name, true)
export default [
	// react
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${pkgBuildPath}/index.js`,
				name: 'index.js',
				format: 'umd'
			},
			{
				file: `${pkgBuildPath}/client.js`,
				name: 'client.js',
				format: 'umd'
			}
		],
		plugins: [
			...getBaseRollupPlugin(),
			alias({
				entries: {
					hostConfig: `${pkgPath}/src/hostConfig.ts`
				}
			}),
			generatePackageJson({
				inputFolder: pkgPath,
				outputFolder: pkgBuildPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					peerDependencies: {
						react: version
					},
					main: 'index.js'
				})
			})
		]
	}
]
