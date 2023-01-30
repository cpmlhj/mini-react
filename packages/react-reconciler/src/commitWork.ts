import {
	Container,
	appendChildToContainer,
	commitUpdate,
	removeChild,
	Instance,
	insertChildToContainer
} from 'hostConfig'
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber'
import {
	ChildDeletion,
	Flags,
	MutationMask,
	NoFlags,
	PassiveEffect,
	PassiveMask,
	Placement,
	Update
} from './fiberFlags'
import { Effect, FunctionUpdateQueue } from './fiberHooks'
import { HookHasEffect } from './hookEffectTags'
import {
	Fragement,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags'

let nextEffect: FiberNode | null = null

export const commitMutationEffects = (
	finshWork: FiberNode,
	root: FiberRootNode
) => {
	nextEffect = finshWork
	while (nextEffect !== null) {
		// 向下遍历 child 直到 找到最底层的  没有副作用的child 或者child 为 null
		const child: FiberNode | null = nextEffect.child
		if (
			(nextEffect.subtreeFlags & (MutationMask | PassiveMask)) !==
				NoFlags &&
			child !== null
		) {
			nextEffect = child
		} else {
			// 走到这里，代表当前FiberNode 是没副作用的，开始往回遍历，处理遍历链路上每个副作用的FiberNode
			// 向上遍历 DFS
			up: while (nextEffect !== null) {
				commitMutationEffectOnFiber(nextEffect, root)
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

export const commitMutationEffectOnFiber = (
	finshwork: FiberNode,
	root: FiberRootNode
) => {
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
				commitDeletion(child, root)
			})
		}
		finshwork.flags &= ~ChildDeletion
	}
	if ((flags & PassiveEffect) !== NoFlags) {
		// 收集回调
		commitPassiveEffect(finshwork, root, 'update')
		finshwork.flags &= ~PassiveEffect
	}
}

function commitPassiveEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	if (fiber.tag !== FunctionComponent) return
	if (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags) return
	const updateQueue = fiber.updateQueue as FunctionUpdateQueue<any>
	if (updateQueue !== null) {
		if (updateQueue.lastEffect === null && true) {
			console.error('当FC存在PassiveEffect， updateQueue不应该不存在')
			return
		}
		root.pendingPassiveEffects[type].push(updateQueue.lastEffect)
	}
}

const commitPlacement = (finshwork: FiberNode) => {
	/**
	 * Placement 的情况目前分两种  移动 或 增加
	 * ① 移动:
	 *  举例：
	 * // 情况1
        <A/><B/>
        function B() {
          return <div/>;
        }
        
        // 情况2
        <App/><div/>
        function App() {
          return <A/>;
        }
	 */
	if (true) {
		console.warn('执行Placement操作', finshwork)
	}
	const hostParent = getHostParent(finshwork)
	const sibilng = getHostSibling(finshwork)
	if (hostParent !== null) {
		insertOrappendPlacementNodeIntoContainer(finshwork, hostParent, sibilng)
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

function getHostSibling(fiber: FiberNode) {
	let node: FiberNode = fiber
	findSibling: while (true) {
		while (node.sibling === null) {
			const parent = node.return
			if (
				parent === null ||
				parent.tag === HostComponent ||
				parent.tag === HostText
			)
				return null
			node = parent
		}
		node.sibling.return = node.return
		node = node.sibling

		// 这里处理的情况是 sibling 有可能是ReactComponent, 需要找到Component下的根HostComponent
		while (node.tag !== HostText && node.tag !== HostComponent) {
			// 向下遍历
			if (node.flags !== NoFlags) {
				// 不稳定的节点  如果当前 sibling 不稳定 跳过此sibling
				continue findSibling
			}
			// 如果当前sibling 没有根HostComponent也跳过
			if (node.child === null) continue findSibling
			node.child.return = node
			node = node.child
		}
		// 稳定的节点  如果当前 找到Node是稳定的
		if ((node.flags & Placement) === NoFlags) {
			return node.stateNode
		}
	}
}

function insertOrappendPlacementNodeIntoContainer(
	finishWork: FiberNode,
	hostParent: Container,
	before?: Instance
) {
	// fiber host
	if (finishWork.tag === HostComponent || finishWork.tag === HostText) {
		if (before) {
			/**
			 * 为了处理一下情况
			 * <div>
			 *    span 1
			 *    span 3 -> finishWork   就是当前要移动的FiberNode
			 *    span 2 -> before   通过getHostSibling找到的稳定的 sibling FiberNode
			 * </div>
			 */
			insertChildToContainer(finishWork.stateNode, hostParent, before)
		} else {
			appendChildToContainer(hostParent, finishWork.stateNode)
		}
		return
	}
	const child = finishWork.child
	if (child !== null) {
		insertOrappendPlacementNodeIntoContainer(child, hostParent)
		let sibling = child.sibling
		while (sibling !== null) {
			insertOrappendPlacementNodeIntoContainer(sibling, hostParent)
			sibling = sibling.sibling
		}
	}
}

/**
 * @param childrenToDelete
 * @param unmountFiber
 * childToDelete 的情况目前分一下
 * ① 根节点类型不是Fragment的，那就是在根节点向下遍历 处理每个FiberNode的情况，最后返回根节点的HostComponent 此时删除的操作 = 1
 * ② 根节点类型时Fragment的， 那么就需要删除Fragment下的所有child 此时 要删除的操作长度 >= 1
 */
function recordHostChildrenToDelete(
	childrenToDelete: FiberNode[],
	unmountFiber: FiberNode
) {
	// 1. 找到第一个root host 节点
	const lastOne = childrenToDelete[childrenToDelete.length - 1]
	if (!lastOne) {
		childrenToDelete.push(unmountFiber)
	} else {
		let node = lastOne.sibling
		while (node !== null) {
			if (unmountFiber === node) childrenToDelete.push(unmountFiber)
			node = node.sibling
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
 * ④ <div>
       <> -> childToDelete 
          <p>xxx</p>
          <p>yyy</p>
        </>
      </div>
 */
function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
	const rootChildToDelete: FiberNode[] = []
	// 递归子树
	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				recordHostChildrenToDelete(rootChildToDelete, unmountFiber)
				//TODO: 解绑ref
				return
			case HostText:
				recordHostChildrenToDelete(rootChildToDelete, unmountFiber)
				return
			case FunctionComponent:
				commitPassiveEffect(unmountFiber, root, 'unmount')
				return
			case Fragement:
				return
			default:
				if (true) {
					console.warn('未实现的commitUpdate类型', unmountFiber)
				}
				return
		}
	})
	if (rootChildToDelete.length !== 0) {
		// commitNestedComponent 结束时返回的是root.child (根HostComponent)
		const hostParent = getHostParent(childToDelete)
		if (hostParent !== null)
			rootChildToDelete.forEach((node) => {
				removeChild((node as FiberNode).stateNode, hostParent)
			})
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
		/**
		 *  <div> ①
		 *      <span>1 ③</span> ②
		 *      <span>2 5️⃣</span>  ④
		 * </div>
		 */
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

function commitHookEffectList(
	flags: Flags,
	lastEffect: Effect,
	callback: (effect: Effect) => void
) {
	let effect = lastEffect.next as Effect
	do {
		if ((effect.tag & flags) === flags) {
			callback(effect)
			effect = effect.next as Effect
		}
	} while (effect !== lastEffect.next)
}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destory = effect.destory
		if (typeof destory === 'function') {
			destory()
		}
		effect.tag &= ~HookHasEffect
	})
}

export function commitHookEffectDestory(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destory = effect.destory
		if (typeof destory === 'function') {
			destory()
		}
	})
}

export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const create = effect.create
		if (typeof create === 'function') {
			const ret = create()
			effect.destory = ret
		}
	})
}
