// ReactDOM.createRoot().render()

import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler'
import { ReactElement } from 'shared/ReactTypes'
import { Container } from './hostConfig'
import { initEvent } from './SyntheticEvent'

export function createRoot(container: Container) {
	const root = createContainer(container)
	return {
		render(element: ReactElement) {
			// 事件绑定 到 挂载点
			initEvent(container, 'click')
			return updateContainer(element, root)
		}
	}
}
