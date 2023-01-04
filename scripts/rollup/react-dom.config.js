import { getPkgJson, resolvePkgPath, getBaseRollupPlugin } from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

const { name, module, peerDependencies } = getPkgJson('react-dom')
const pkgPath = resolvePkgPath(name)
const pkgBuildPath = resolvePkgPath(name, true)
export default [
	// react
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${pkgBuildPath}/index.js`,
				name: 'ReactDOM',
				format: 'umd'
			},
			{
				file: `${pkgBuildPath}/client.js`,
				name: 'client.js',
				format: 'umd'
			}
		],
		external: [...Object.keys(peerDependencies)],
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
	},
	// react-test
	{
		input: `${pkgPath}/test-utils.ts`,
		output: {
			file: `${pkgBuildPath}/test-utils.js`,
			name: 'testUtils.js',
			format: 'umd'
		},
		external: ['react-dom', 'react'],
		plugins: [...getBaseRollupPlugin()]
	}
]
