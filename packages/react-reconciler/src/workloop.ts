import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { HostRoot } from './workTags'
import { MutationMask, NoFlags } from './fiberFlags'
import { commitMutationEffects } from './commitWork'

let workInProgress: FiberNode | null = null

function prepareFreshStack(root: FiberRootNode) {
	workInProgress = createWorkInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	// 调度功能
	// 每次更新调度 需要找到当前fiberRoot，做统筹管理
	const root = markUpdateFormFiberRoot(fiber)
	renderRoot(root)
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

function renderRoot(root: FiberRootNode) {
	// 初始化
	prepareFreshStack(root)

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
	// wip fiberNode树
	commitRoot(root)
}

function commitRoot(root: FiberRootNode) {
	const finishWork = root.finishWork
	if (finishWork === null) return
	if (true) {
		console.warn('commit 阶段开始', finishWork)
	}
	root.finishWork = null
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
	const next = beginWork(fiber)
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
