import { FiberNode } from 'react-reconciler/src/fiber'
import { HostComponent, HostText } from 'react-reconciler/src/workTags'
import { props } from 'shared/ReactTypes'
import { updateFiberProps } from './SyntheticEvent'

export type Container = Element

export type Instance = Element

export type TextInstance = Text

// export const createInstance = (type: string, props: any): Instance => {
export const createInstance = (type: string, props: props): Instance => {
	// ToDo : propd
	const element = document.createElement(type)
	updateFiberProps(element, props)
	return element
}

export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	parent.appendChild(child)
}

export const createTextInstance = (content: string) => {
	const element = document.createTextNode(content)

	return element
}

export const commitUpdate = (fiber: FiberNode) => {
	switch (fiber.tag) {
		case HostText:
			return commitTextUpdate(
				fiber.stateNode,
				fiber.memoizedProps.content
			)
		case HostComponent:
			return updateFiberProps(fiber.stateNode, fiber.memoizedProps)

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

export const insertChildToContainer = (
	child: Instance,
	container: Container,
	before: Instance
) => {
	container.insertBefore(child, before)
}

export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any) => void) =>
				Promise.resolve(null).then(callback)
		: setTimeout

export const appendChildToContainer = appendInitialChild
