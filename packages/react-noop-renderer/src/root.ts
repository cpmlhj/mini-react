// ReactDOM.createRoot().render()

import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler'
import { REACT_ELEMENT_TYPE, REACT_FRAGEMENT_TYPE } from 'shared/ReactSymbol'
import { ReactElement } from 'shared/ReactTypes'
import { Container, Instance } from './hostConfig'
import * as Scheduler from 'scheduler'

let idCounter = 0

export function createRoot() {
	const container: Container = {
		rootID: idCounter++,
		children: []
	}
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const root = createContainer(container)

	function getChildren(parent: Container | Instance) {
		if (parent) return parent.children
		return null
	}

	function getChildrenAsJSX(root: Container) {
		const children = childToJsx(getChildren(root))
		if (Array.isArray(children)) {
			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: REACT_FRAGEMENT_TYPE,
				key: null,
				ref: null,
				__marl: 'CPM',
				props: { children }
			}
		}
		return children
	}

	function childToJsx(child: any): any {
		if (typeof child === 'string' || typeof child === 'number') {
			return child
		}
		if (Array.isArray(child)) {
			if (child.length === 0) return null
			if (child.length === 1) return childToJsx(child[0])
			const children = child.map(childToJsx)
			if (
				children.every(
					(child) =>
						typeof child === 'string' || typeof child === 'number'
				)
			) {
				return children.join('')
			}
			// [TextInstace, TextInstace,Instance]
			return children
		}
		// Instance
		if (Array.isArray(child.children)) {
			const instance: Instance = child
			const children = childToJsx(instance.children)
			const props = instance.props
			if (children !== null) {
				props.children = children
			}
			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: instance.type,
				key: null,
				ref: null,
				__marl: 'CPM',
				props
			}
		}
		// TextInstace
		return child.text
	}

	return {
		_Scheduler: Scheduler,
		render(element: ReactElement) {
			return updateContainer(element, root)
		},
		getChildren() {
			return getChildren(container)
		},
		getChildrenAsJSX() {
			return getChildrenAsJSX(container)
		}
	}
}
