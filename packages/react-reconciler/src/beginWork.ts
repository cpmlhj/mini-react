// 递归中的 递阶段

import { FiberNode } from './fiber'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import { HostRoot, HostComponent, HostText } from './workTags'
import { reconcilerChildFibers, mountChildFibers } from './childFiber'
import { ReactElement } from 'shared/ReactTypes'

export const beginWork = (wip: FiberNode) => {
	// 比较、返回子fiber
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip)
		case HostComponent:
			return updateHostComponent(wip)
		case HostText:
			return null
		default:
			if (__Dev__) {
				console.warn('beginWork 未实现')
			}
			return null
	}
}

function updateHostRoot(wip: FiberNode) {
	const baseState = wip.memoizedState
	const updateQueue = wip.updateQueue as UpdateQueue<Element>
	const pending = updateQueue.shared.pending
	updateQueue.shared.pending = null
	const { memoizedState } = processUpdateQueue(baseState, pending)
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
