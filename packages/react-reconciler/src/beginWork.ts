// 递归中的 递阶段

import {
	FiberNode,
	OffScreenProps,
	createFiberFromFragement,
	createFiberOffscreen,
	createWorkInProgress
} from './fiber'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import {
	HostRoot,
	HostComponent,
	HostText,
	FunctionComponent,
	Fragement,
	SuspenceComponent,
	OffScreen
} from './workTags'
import { reconcilerChildFibers, mountChildFibers } from './childFiber'
import { ReactElement } from 'shared/ReactTypes'
import { renderWithHooks } from './fiberHooks'
import { Lane } from './fiberLanes'
import { ChildDeletion, Placement } from './fiberFlags'

export const beginWork = (wip: FiberNode, renderLane: Lane) => {
	// 比较、返回子fiber
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane)
		case HostComponent:
			return updateHostComponent(wip)
		case HostText:
			return null
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane)
		case Fragement:
			return updateFragementComponent(wip)
		case SuspenceComponent:
			return updateSuspenceComponent(wip)
		case OffScreen:
			return updateOffScreenComponent(wip)
		default:
			if (true) {
				console.warn('beginWork 未实现')
			}
			return null
	}
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memoizedState
	const updateQueue = wip.updateQueue as UpdateQueue<Element>
	const pending = updateQueue.shared.pending
	updateQueue.shared.pending = null
	// 这里的memoizedState 其实就是  ReactDOM.createRoot('#app').render(<App/>) 中的 <App/>
	// 在update的时候，流程会先找到FiberRoot.current(就是 hostRootFiber) 然后根据hostRootFiber 创建新的workInProgress
	// 然后再一次用这里的memoizedState与current自上往下遍历比较生成新的Fiber树(值是赋给到workInProgress)
	const { memoizedState } = processUpdateQueue(baseState, pending, renderLane)
	wip.memoizedState = memoizedState
	const nextChildren = wip.memoizedState
	reconcilerChildren(wip, nextChildren)
	return wip.child
}

function updateHostComponent(wip: FiberNode) {
	// <div><span></span></div>
	const nextProps = wip.pendingProps
	const nextChildren = nextProps.children
	reconcilerChildren(wip, nextChildren)
	return wip.child
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(wip, renderLane)
	reconcilerChildren(wip, nextChildren)
	return wip.child
}

function updateFragementComponent(wip: FiberNode) {
	const nextChildren = wip.pendingProps
	reconcilerChildren(wip, nextChildren)
	return wip.child
}

function updateSuspenceComponent(wip: FiberNode) {
	const current = wip.alternate
	const nextProps = wip.pendingProps
	let showFallback = false
	const didSuspencePending = true
	if (didSuspencePending) {
		showFallback = true
	}
	const nextPrimaryChildren = nextProps.children
	const nextFallbackChildren = nextProps.fallback
	if (current === null) {
		// mount阶段
		if (showFallback) {
			// pending
			return mountSuspenceFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChildren
			)
		} else {
			// 正常
			return mountSuspencePrimaryChildren(wip, nextPrimaryChildren)
		}
	} else {
		// update流程
		if (showFallback) {
			// pending
			return updateSuspenceFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChildren
			)
		} else {
			// 正常
			return updateSuspencePrimaryChildren(wip, nextPrimaryChildren)
		}
	}
}

function updateOffScreenComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps
	const nextChildren = nextProps.children
	reconcilerChildren(wip, nextChildren)
	return wip.child
}

function mountSuspencePrimaryChildren(wip: FiberNode, primaryChilren: any) {
	const primaryChildProps: OffScreenProps = {
		mode: 'visable',
		children: primaryChilren
	}
	const primaryChildrenFiber = createFiberOffscreen(primaryChildProps)
	wip.child = primaryChildrenFiber
	primaryChildrenFiber.return = wip
	return primaryChildrenFiber
}

function mountSuspenceFallbackChildren(
	wip: FiberNode,
	primaryChilren: any,
	fallbackChildren: any
) {
	const primaryChildProps: OffScreenProps = {
		mode: 'hidden',
		children: primaryChilren
	}
	const primaryChildrenFiber = createFiberOffscreen(primaryChildProps)
	const fallbackChildrenFiber = createFiberFromFragement(fallbackChildren)

	/**
	 * 手动标记fallbackChildren, 因为mount阶段
	 */
	fallbackChildrenFiber.flags |= Placement

	primaryChildrenFiber.return = wip
	fallbackChildrenFiber.return = wip
	primaryChildrenFiber.sibling = fallbackChildrenFiber
	wip.child = primaryChildrenFiber
	return fallbackChildrenFiber
}

function updateSuspenceFallbackChildren(
	wip: FiberNode,
	primaryChilren: any,
	fallbackChildren: any
) {
	const current = wip.alternate
	const currentPrimaryChildrenFiber = current?.child as FiberNode
	const currentFallbackChildrenFiber: FiberNode | null =
		currentPrimaryChildrenFiber.sibling
	const primaryChildProps: OffScreenProps = {
		mode: 'hidden',
		children: primaryChilren
	}

	const primaryChildrenFiber = createWorkInProgress(
		currentPrimaryChildrenFiber,
		primaryChildProps
	)
	let fallbackChildrenFiber
	if (currentFallbackChildrenFiber) {
		fallbackChildrenFiber = createWorkInProgress(
			currentFallbackChildrenFiber,
			fallbackChildren
		)
	} else {
		fallbackChildrenFiber = createFiberFromFragement(fallbackChildren)
		fallbackChildrenFiber.flags |= Placement
	}
	primaryChildrenFiber.return = wip
	fallbackChildrenFiber.return = wip
	primaryChildrenFiber.sibling = fallbackChildrenFiber
	wip.child = primaryChildrenFiber
	return fallbackChildrenFiber
}

function updateSuspencePrimaryChildren(wip: FiberNode, primaryChilren: any) {
	const current = wip.alternate
	const currentPrimaryChildren = current?.child as FiberNode
	const currentFallbackChildrenFiber: FiberNode | null =
		currentPrimaryChildren.sibling
	const primaryChildProps: OffScreenProps = {
		mode: 'visable',
		children: primaryChilren
	}
	const primaryChildrenFiber = createWorkInProgress(
		currentPrimaryChildren,
		primaryChildProps
	)
	primaryChildrenFiber.return = wip
	primaryChildrenFiber.sibling = null
	wip.child = primaryChildrenFiber
	if (currentFallbackChildrenFiber) {
		const deletions = wip.deletions
		if (!deletions) {
			wip.deletions = [currentFallbackChildrenFiber]
			wip.flags |= ChildDeletion
		} else {
			deletions.push(currentFallbackChildrenFiber)
		}
	}
	return primaryChildrenFiber
}

function reconcilerChildren(wip: FiberNode, child: ReactElement | null) {
	const current = wip.alternate
	if (current !== null) {
		// 在第一次mount的时候 -> ReactDOM.createRoot,
		// 有且仅有 HostRootFiber('#app')这个节点 会存在current,
		// 所以会走到update流程，被标记上 placement, 这是react在mount阶段优化的点
		// update
		wip.child = reconcilerChildFibers(wip, current?.child, child)
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, child)
	}
}
