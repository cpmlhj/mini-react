import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { HostRoot } from './workTags'
import { MutationMask, NoFlags } from './fiberFlags'
import { commitMutationEffects } from './commitWork'
import {
	getHighesPriority,
	Lane,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes'
import { flushSyncCallback, scheduleSyncCallback } from './syncTaskQueue'
import { scheduleMicroTask } from 'hostConfig'

let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	workInProgress = createWorkInProgress(root.current, {})
	wipRootRenderLane = lane
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	// TODO: 调度功能
	// 每次更新调度 需要找到当前fiberRoot，做统筹管理
	const root = markUpdateFormFiberRoot(fiber)
	markRootUpdated(root, lane)
	ensureRootIsScheduled(root)
}

export function markUpdateFormFiberRoot(fiber: FiberNode) {
	let node = fiber
	let parent = node.return
	while (parent !== null) {
		node = parent
		parent = parent.return
	}
	if (node.tag === HostRoot) {
		// 返回
		return node.stateNode
	}
	return null
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighesPriority(root.pendingLanes)
	if (updateLane === NoLane) {
		// 已无更新任务
		return
	}
	if (updateLane === SyncLane) {
		if (true) {
			console.log(`在微任务中调度，优先级:`, updateLane)
		}
		// 同步优先级  用微任务调度
		// [performSyncWorkOnRoot,performSyncWorkOnRoot,performSyncWorkOnRoot]
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
		/**
		 * !!! 这里值得注意的是（假设此次批量更新操作的优先级都是一样），下面的函数的执行时机 是当前JS调用栈已经是空， 开始执行微任务了
		 * 在我们在一个函数（譬如onClick）中 多次执行 setState, 这个过程是同步的，当最后一个setState执行完后
		 * updateQueue 已经构成了一条更新的链表，虽然performSyncWorkOnRoot 被推入了N次，但是他会在第一次中，把updateQueu
		 * 中的要更新的内容一次性执行完，然后在ccommitRoot中将 root.pendingLane设置为NoLane
		 * 那么在下一次执行performSyncWorkOnRoot时，会因为root.pendingLanes !==SyncLane 而return
		 */
		scheduleMicroTask(flushSyncCallback)
	} else {
		// 其他优先级  用宏任务调度
	}
}

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighesPriority(root.pendingLanes)
	if (nextLane !== SyncLane) {
		// 其他比SyncLane低的优先级
		// NoLane
		ensureRootIsScheduled(root)
		return
	}
	// 初始化
	prepareFreshStack(root, lane)
	console.info('renderer阶段开始')
	do {
		try {
			workLoop()
			break
		} catch (e) {
			if (true) {
				console.warn('error workLoop', e)
			}
			workInProgress = null
		}
	} while (true)
	const finishWork = root.current.alternate
	root.finishWork = finishWork
	root.finishLanes = lane
	wipRootRenderLane = NoLane
	// wip fiberNode树
	commitRoot(root)
}

function commitRoot(root: FiberRootNode) {
	const finishWork = root.finishWork
	if (finishWork === null) return
	if (true) {
		console.warn('commit 阶段开始', finishWork)
	}
	const lane = root.finishLanes
	if (lane === NoLane) {
		console.error('commit阶段finishLanes 不应该是NoLane')
	}
	root.finishWork = null
	root.finishLanes = NoLane
	// 关键操作 此时的
	markRootFinished(root, lane)
	// 判断 是否存在三个子阶段 需要执行的操作
	const subtreeHasEffect =
		(finishWork.subtreeFlags & MutationMask) !== NoFlags
	const rootHasEffect = (finishWork.flags & MutationMask) !== NoFlags
	if (subtreeHasEffect || rootHasEffect) {
		// beforeMutation
		// mutation  -- placement
		commitMutationEffects(finishWork)
		root.current = finishWork
		// layout
	} else {
		root.current = finishWork
	}
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress)
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane)
	fiber.memoizedProps = fiber.pendingProps
	if (next === null) {
		completeUnitOfWork(fiber)
	} else {
		workInProgress = next
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber
	do {
		completeWork(node)
		const sibling = node.sibling
		if (sibling !== null) {
			workInProgress = sibling
			return
		}
		node = node.return
		workInProgress = node
	} while (node !== null)
}
