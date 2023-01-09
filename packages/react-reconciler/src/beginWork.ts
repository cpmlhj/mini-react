// 递归中的 递阶段

import { FiberNode } from './fiber'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import {
	HostRoot,
	HostComponent,
	HostText,
	FunctionComponent
} from './workTags'
import { reconcilerChildFibers, mountChildFibers } from './childFiber'
import { ReactElement } from 'shared/ReactTypes'
import { renderWithHooks } from './fiberHooks'

export const beginWork = (wip: FiberNode) => {
	// 比较、返回子fiber
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip)
		case HostComponent:
			return updateHostComponent(wip)
		case HostText:
			return null
		case FunctionComponent:
			return updateFunctionComponent(wip)
		default:
			if (true) {
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
	// 这里的memoizedState 其实就是  ReactDOM.createRoot('#app').render(<App/>) 中的 <App/>
	// 在update的时候，流程会先找到FiberRoot.current(就是 hostRootFiber) 然后根据hostRootFiber 创建新的workInProgress
	// 然后再一次用这里的memoizedState与current自上往下遍历比较生成新的Fiber树(值是赋给到workInProgress)
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

function updateFunctionComponent(wip: FiberNode) {
	const nextChildren = renderWithHooks(wip)
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
