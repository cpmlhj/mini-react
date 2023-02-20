import {
	createWorkInProgress,
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects
} from './fiber'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { HostRoot } from './workTags'
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags'
import {
	commitHookEffectDestory,
	commitHookEffectListCreate,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './commitWork'
import {
	getHighesPriority,
	Lane,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane,
	lanesToSchedulerPriority
} from './fiberLanes'
import { flushSyncCallback, scheduleSyncCallback } from './syncTaskQueue'
import { scheduleMicroTask } from 'hostConfig'
import {
	unstable_scheduleCallback as SchedulerCallback,
	unstable_NormalPriority as normalPriority,
	unstable_shouldYield,
	unstable_cancelCallback
} from 'scheduler'
import { HookHasEffect, Passive } from './hookEffectTags'

type RootExitStatus = number

const RootInComplete = 1
const RootCompleted = 2
// TODO: 执行过程中抛出错误
let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
let rootDoesHasPassiveEffects = false
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishLanes = NoLane
	root.finishWork = null
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
	const existingCallback = root.callbackNode
	if (updateLane === NoLane) {
		// 已无更新任务
		if (existingCallback !== null) unstable_cancelCallback(existingCallback)
		root.callbackNode = null
		root.callbackPriority = NoLane
		return
	}
	const curPriority = updateLane
	const prePriority = root.callbackPriority
	if (curPriority === prePriority) return // 同一优先级 无序在执行调度
	// 存在更高优先级
	if (existingCallback !== null) {
		unstable_cancelCallback(existingCallback)
	}
	let newCallbackNode = null
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
		const schedulerPriority = lanesToSchedulerPriority(updateLane)

		newCallbackNode = SchedulerCallback(
			schedulerPriority,
			// @ts-ignore
			performConcurrentWorkOnRoot.bind(null, root)
		)
	}
	root.callbackNode = newCallbackNode
	root.callbackPriority = curPriority
}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
	if (true) {
		console.log('开始' + shouldTimeSlice ? '并发更新' : '同步更新', root)
	}
	if (wipRootRenderLane !== lane) prepareFreshStack(root, lane)
	console.info('renderer阶段开始')
	do {
		try {
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync()
			break
		} catch (e) {
			if (true) {
				console.warn('error workLoop', e)
			}
			workInProgress = null
		}
	} while (true)
	// 执行完毕 || 中断执行
	if (shouldTimeSlice && workInProgress !== null) {
		// 被中断
		return RootInComplete
	}
	if (!shouldTimeSlice && workInProgress !== null) {
		console.error('renderer 阶段报错了')
	}
	return RootCompleted
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	// 保证useEffect回调执行
	const curCallback = root.callbackNode
	const didFlushPassiveEffect = flushPassiveEffects(
		root.pendingPassiveEffects
	)
	if (didFlushPassiveEffect) {
		if (root.callbackNode !== curCallback) return null
	}
	const lane = getHighesPriority(root.pendingLanes)
	const currentCallbackNode = root.callbackNode
	if (lane === NoLane) return null // 代表当前没有调度任务
	const needSync = lane === SyncLane || didTimeout // 是否需要同步
	const exitStatus = renderRoot(root, lane, !needSync)
	ensureRootIsScheduled(root)
	if (exitStatus === RootInComplete) {
		// 中断状态
		if (root.callbackNode !== currentCallbackNode) {
			return null
		}
		return performConcurrentWorkOnRoot.bind(null, root)
	}
	if (exitStatus == RootCompleted) {
		const finishWork = root.current.alternate
		root.finishWork = finishWork
		root.finishLanes = lane
		wipRootRenderLane = NoLane
		// wip fiberNode树
		commitRoot(root)
	} else if (true) {
		console.error('这里有点小小的错误')
	}
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	const nextLane = getHighesPriority(root.pendingLanes)
	if (nextLane !== SyncLane) {
		// 其他比SyncLane低的优先级
		// NoLane
		ensureRootIsScheduled(root)
		return
	}
	const exitStatus = renderRoot(root, nextLane, false)
	if (exitStatus == RootCompleted) {
		const finishWork = root.current.alternate
		root.finishWork = finishWork
		root.finishLanes = nextLane
		wipRootRenderLane = NoLane
		// wip fiberNode树
		commitRoot(root)
	} else if (true) {
		console.error('这里有点小小的错误')
	}
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
	if (
		(finishWork.flags & PassiveMask) !== NoFlags ||
		(finishWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!rootDoesHasPassiveEffects) rootDoesHasPassiveEffects = true
		// 异步调度执行
		SchedulerCallback(normalPriority, () => {
			// 执行副作用
			flushPassiveEffects(root.pendingPassiveEffects)
			return
		})
	}
	// 判断 是否存在三个子阶段 需要执行的操作
	const subtreeHasEffect =
		(finishWork.subtreeFlags & MutationMask) !== NoFlags
	const rootHasEffect = (finishWork.flags & MutationMask) !== NoFlags
	if (subtreeHasEffect || rootHasEffect) {
		// beforeMutation
		// mutation  -- placement
		commitMutationEffects(finishWork, root)
		root.current = finishWork
		// layout
	} else {
		root.current = finishWork
	}
	rootDoesHasPassiveEffects = false
	ensureRootIsScheduled(root)
}

function workLoopSync() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress)
	}
}

function workLoopConcurrent() {
	while (workInProgress !== null && !unstable_shouldYield()) {
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

/**
 * useEffect(() => {  // 这是effect
 *      return () => {}  // 这是 destory
 * }, [] // 这是 依赖)
 * @param pendingPassiveEffects
 */
function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	let didFlushPassiveEffect = false

	// 这里执行的是标记了delete的fiberNode(一直都是 type === FunctionComponent)所关联的effect的return 也叫destroy
	pendingPassiveEffects.unmount.forEach((effect) => {
		didFlushPassiveEffect = true
		commitHookEffectListUnmount(Passive, effect)
	})
	pendingPassiveEffects.unmount = []
	// 这里执行的是 依赖变更了的 effect， 他们也需要执行 此effect  的 上一次的 return
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true
		commitHookEffectDestory(Passive | HookHasEffect, effect)
	})
	// 最后才执行需要更新的effect 然后再次将return 赋值给effect.destroy
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true
		commitHookEffectListCreate(Passive | HookHasEffect, effect)
	})
	pendingPassiveEffects.update = []
	flushSyncCallback()
	return didFlushPassiveEffect
}
