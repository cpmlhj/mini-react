import { FiberNode } from 'react-reconciler/src/fiber'
import { HostComponent, HostText } from 'react-reconciler/src/workTags'

export type Container = Element

export type Instance = Element

export type TextInstance = Text

// export const createInstance = (type: string, props: any): Instance => {
export const createInstance = (type: string): Instance => {
	// ToDo : propd
	const element = document.createElement(type)
	return element
}

export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	parent.appendChild(child)
}

export const createTextInstance = (content: string) => {
	return document.createTextNode(content)
}

export const commitUpdate = (fiber: FiberNode) => {
	switch (fiber.tag) {
		case HostText:
			return commitTextUpdate(
				fiber.stateNode,
				fiber.memoizedProps.content
			)
		default:
			if (true) {
				console.warn('未实现的commitUpdate类型', fiber)
			}
			break
	}
}

export const commitTextUpdate = (
	textInstance: TextInstance,
	content: string
) => {
	textInstance.textContent = content
}

export const removeChild = (
	child: Instance | TextInstance,
	container: Container
) => {
	container.removeChild(child)
}

export const appendChildToContainer = appendInitialChild
