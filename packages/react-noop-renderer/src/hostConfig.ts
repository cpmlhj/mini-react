import { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'
import { props, Type } from 'shared/ReactTypes'

export interface Container {
	rootID: number
	children: (Instance | TextInstance)[]
}

export interface Instance {
	id: number
	type: string
	children: (Instance | TextInstance)[]
	parent: number
	props: props
}

export interface TextInstance {
	text: string
	id: number
	parent: number
}
let instanceCounter = 0

// export const createInstance = (type: string, props: any): Instance => {
export const createInstance = (type: string, props: props): Instance => {
	const instance: Instance = {
		id: instanceCounter++,
		type,
		children: [],
		parent: -1,
		props
	}
	return instance
}

export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	// id
	const prevParentID = child.parent
	const parentId = 'rootID' in parent ? parent.rootID : parent.id
	if (prevParentID !== -1 && parentId !== prevParentID) {
		// 重复插入 跑错误
		throw new Error('不能重复挂载child')
	}
	child.parent = parentId
	parent.children.push(child)
}

export const createTextInstance = (content: string) => {
	const instance: TextInstance = {
		text: content,
		id: instanceCounter++,
		parent: -1
	}
	return instance
}

export const commitUpdate = (fiber: FiberNode) => {
	switch (fiber.tag) {
		case HostText:
			return commitTextUpdate(
				fiber.stateNode,
				fiber.memoizedProps.content
			)
		// case HostComponent:
		// 	updateFiberProps()
		// 	return
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
	textInstance.text = content
}

export const removeChild = (
	child: Instance | TextInstance,
	container: Container
) => {
	const index = container.children.indexOf(child)
	if (index === -1) {
		throw new Error('child 不存在')
	}
	container.children.splice(index, 1)
}

export const insertChildToContainer = (
	child: Instance,
	container: Container,
	before: Instance
) => {
	const beForeindex = container.children.indexOf(before)
	if (beForeindex === -1) {
		throw new Error('before 不存在')
	}
	const index = container.children.indexOf(child)
	if (index !== -1) {
		container.children.splice(index, 1)
	}
	container.children.splice(beForeindex, 0, child)
}

export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any) => void) =>
				Promise.resolve(null).then(callback)
		: setTimeout

export const appendChildToContainer = (parent: Container, child: Instance) => {
	// id
	const prevParentID = child.parent
	if (prevParentID !== -1 && parent.rootID !== prevParentID) {
		// 重复插入 跑错误
		throw new Error('不能重复挂载child')
	}
	child.parent = parent.rootID
	parent.children.push(child)
}
