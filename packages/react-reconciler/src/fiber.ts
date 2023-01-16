import { Key, props, ReactElement, ref } from 'shared/ReactTypes'
import {
	Fragement,
	FunctionComponent,
	HostComponent,
	WorkTag
} from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'
import { Lanes, NoLane, NoLanes } from './fiberLanes'

export class FiberNode {
	tag: WorkTag
	key: Key
	stateNode: any
	type: any
	pendingProps: props
	return: FiberNode | null
	sibling: FiberNode | null
	child: FiberNode | null
	index: number
	ref: ref

	memoizedProps: props | null

	memoizedState: any
	alternate: FiberNode | null

	flags: Flags
	subtreeFlags: Flags
	deletions: FiberNode[] | null
	updateQueue: unknown

	constructor(target: WorkTag, pendingProps: props, key: Key) {
		this.tag = target
		this.key = key || null
		// 如果是HostComponent div 那么就是 <div> Dom
		this.stateNode = null
		// FunctionComponent () => {}
		this.type = null

		// 树状结构
		this.return = null // 当前FiberNode 节点的父节点
		this.sibling = null // 当前FiberNode 节点的兄弟节点
		this.child = null
		this.index = 0

		this.ref = null

		this.memoizedProps = null
		this.pendingProps = pendingProps
		this.updateQueue = null
		this.memoizedState = null

		this.alternate = null

		// 副作用
		this.flags = NoFlags
		this.subtreeFlags = NoFlags
		this.deletions = null
	}
}

export class FiberRootNode {
	container: Container
	current: FiberNode
	finishWork: FiberNode | null
	pendingLanes: Lanes
	finishLanes: Lanes

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container
		this.current = hostRootFiber
		hostRootFiber.stateNode = this
		this.finishWork = null
		this.pendingLanes = NoLanes
		this.finishLanes = NoLanes
	}
}

export const createWorkInProgress = (
	current: FiberNode,
	pendingProps: props
): FiberNode => {
	let wip = current.alternate
	if (wip === null) {
		// mount
		wip = new FiberNode(current.tag, pendingProps, current.key)
		wip.stateNode = current.stateNode
		wip.alternate = current
		current.alternate = wip
	} else {
		// update
		wip.pendingProps = pendingProps
		wip.flags = NoFlags
		wip.subtreeFlags = NoFlags
		wip.deletions = null
	}
	wip.type = current.type
	wip.updateQueue = current.updateQueue
	wip.child = current.child
	wip.memoizedProps = current.memoizedProps
	wip.memoizedState = current.memoizedState
	return wip
}

export function createFiberFromElement(element: ReactElement): FiberNode {
	const { type, key, props } = element
	let fiberTag: WorkTag = FunctionComponent
	if (typeof type === 'string') {
		// <div/> type: 'div'
		fiberTag = HostComponent
	} else if (typeof type !== 'function' && true) {
		console.warn('未定义的type类型', element)
	}
	const fiber = new FiberNode(fiberTag, props, key)
	fiber.type = type
	return fiber
}

export function createFiberFromFragement(elements: any[], key: Key): FiberNode {
	const fiber = new FiberNode(Fragement, elements, key)
	return fiber
}
