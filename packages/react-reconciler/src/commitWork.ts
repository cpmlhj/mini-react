import {
	Container,
	appendChildToContainer,
	commitUpdate,
	removeChild
} from 'hostConfig'
import { FiberNode, FiberRootNode } from './fiber'
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	Placement,
	Update
} from './fiberFlags'
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags'

let nextEffect: FiberNode | null = null

export const commitMutationEffects = (finshWork: FiberNode) => {
	nextEffect = finshWork
	while (nextEffect !== null) {
		// 向下遍历 child 直到 找到最底层的  没有副作用的child 或者child 为 null
		const child: FiberNode | null = nextEffect.child
		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffect = child
		} else {
			// 向上遍历 DFS
			up: while (nextEffect !== null) {
				commitMutationEffectOnFiber(nextEffect)
				const sibling: FiberNode | null = nextEffect.sibling
				if (sibling !== null) {
					nextEffect = sibling
					break up
				}
				nextEffect = nextEffect.return
			}
		}
	}
}

export const commitMutationEffectOnFiber = (finshwork: FiberNode) => {
	const flags = finshwork.flags
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finshwork)
		finshwork.flags &= ~Placement
	}
	if ((flags & Update) !== NoFlags) {
		commitUpdate(finshwork)
		finshwork.flags &= ~Update
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		const deletions = finshwork.deletions
		if (deletions !== null) {
			deletions.forEach((child) => {
				commitDeletion(child)
			})
		}
		finshwork.flags &= ~ChildDeletion
	}
}

const commitPlacement = (finshwork: FiberNode) => {
	// parent Dom
	// finishedWork ~
	if (true) {
		console.warn('执行Placement操作', finshwork)
	}
	const hostParent = getHostParent(finshwork)
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finshwork, hostParent)
	}
}

function getHostParent(fiber: FiberNode): Container | null {
	let parent = fiber.return
	while (parent) {
		const parentTag = parent.tag
		// hostComponent hostRoot
		if (parentTag === HostComponent) return parent.stateNode as Container
		if (parentTag === HostRoot)
			return (parent.stateNode as FiberRootNode).container
		parent = parent.return
	}
	if (true) {
		console.warn('未找到host parent')
	}
	return null
}

function appendPlacementNodeIntoContainer(
	finishWork: FiberNode,
	hostParent: Container
) {
	// fiber host
	if (finishWork.tag === HostComponent || finishWork.tag === HostText) {
		appendChildToContainer(hostParent, finishWork.stateNode)
		return
	}
	const child = finishWork.child
	if (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent)
		let sibling = child.sibling
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent)
			sibling = sibling.sibling
		}
	}
}

/**
 *
 * @param childToDelete 要删除的Fiber节点
 * 在childToDelete的子树中存在一下情况
 * ① 对于FC,需要处理useEffect unmount执行、解绑ref
 * ② 对于HostComponent 需要解绑ref
 * ③ 对于子树的[根HostComponent], 需要移除DOM 譬如 <App><div></div></App> 就需要找到App下的根节点
 * 要满足以上情况，需要对 childToDelete 遍历 child
 */
function commitDeletion(childToDelete: FiberNode) {
	let rootHostNode: FiberNode | null = null
	// 递归子树
	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber
				}
				//Todo: 解绑ref
				return
			case HostText:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber
				}
				return
			case FunctionComponent:
				// Todo useEffect unmount
				return
			default:
				if (true) {
					console.warn('未实现的commitUpdate类型', unmountFiber)
				}
				return
		}
	})
	if (rootHostNode !== null) {
		// commitNestedComponent 结束时返回的是root.child (根HostComponent)
		const hostParent = getHostParent(childToDelete)
		if (hostParent !== null)
			removeChild((rootHostNode as FiberNode).stateNode, hostParent)
	}
	childToDelete.return = null
	childToDelete.child = null
}

/**
 *
 * @param root
 * @param onCommitUnmount
 * 假设 <App> -> root
 *      <div>123</div>
 *      <span>456</span>
 *      </App>
 */
function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void
) {
	let node = root
	while (true) {
		onCommitUnmount(node)
		if (node.child !== null) {
			// 向下遍历
			node.child.return = node
			node = node.child
			continue
		}
		if (node === root) return
		while (node.sibling === null) {
			if (node.return === null || node.return === root) return
			node = node.return
		}
		node.sibling.return = node.return
		node = node.sibling
	}
}
