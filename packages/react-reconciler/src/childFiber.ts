import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbol'
import { props, ReactElement } from 'shared/ReactTypes'
import {
	createFiberFromElement,
	createWorkInProgress,
	FiberNode
} from './fiber'
import { ChildDeletion, Placement } from './fiberFlags'
import { HostText } from './workTags'

function ChildReconciler(shouldTrackEffects: boolean) {
	return function reconcilerChildFiber(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElement | null
	) {
		//  return fiberNode
		// 判断当前fiber的类型
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcilerSignleElement(
							returnFiber,
							currentFiber,
							newChild
						)
					)
				default:
					if (true) {
						console.warn('未实现的reconcile类型')
					}
					break
			}
		}
		// TODO: 多接点 ul > li*3

		// HostText
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcilerSingleTextNode(returnFiber, currentFiber, newChild)
			)
		}
		if (true) {
			console.warn('未实现的reconcile类型')
		}
		// 兜底 删除
		if (currentFiber !== null) {
			deleteChild(returnFiber, currentFiber)
		}
		return null
	}

	function reconcilerSignleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElement
	) {
		const key = element.key
		work: if (currentFiber !== null) {
			// update
			if (key === currentFiber.key) {
				// key 相同
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (element.type === currentFiber.type) {
						// type 相同
						const existing = useFiber(currentFiber, element.props)
						existing.return = returnFiber
						return existing
					}
					//  删除旧的
					deleteChild(returnFiber, currentFiber)
					break work
				} else {
					console.warn('还没实现的React类型', element.$$typeof)
					break work
				}
			} else {
				// key 不同， 删除旧的
				deleteChild(returnFiber, currentFiber)
			}
		}
		// 根据 element 创建 Fiber
		const fiber = createFiberFromElement(element)
		fiber.return = returnFiber
		return fiber
	}

	function reconcilerSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: string | number
	) {
		if (currentFiber !== null) {
			// update
			if (currentFiber.tag === HostText) {
				// <div>123</div> -> <div>123</div>
				// 类型没变
				const existing = useFiber(currentFiber, { content: element })
				existing.return = returnFiber
				return existing
			}
			// currentFiber 不是HostText
			// <div><span></span><div> -> <div>123</div>
			deleteChild(returnFiber, currentFiber)
		}
		const fiber = new FiberNode(
			HostText,
			{
				content: element
			},
			null
		)
		fiber.return = returnFiber
		return fiber
	}

	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffects && fiber.alternate === null) {
			fiber.flags |= Placement
		}
		return fiber
	}

	function deleteChild(returnFiber: FiberNode, childToDelte: FiberNode) {
		if (!shouldTrackEffects) {
			return
		}
		const deletions = returnFiber.deletions
		if (deletions === null) {
			// 当前父FiberNode 还没有要删除的节点
			returnFiber.deletions = [childToDelte]
			// 为父节点添加 对应的副作用Flags
			returnFiber.flags |= ChildDeletion
		} else {
			deletions.push(childToDelte)
		}
	}
	function useFiber(fiber: FiberNode, pendingProps: props): FiberNode {
		const clone = createWorkInProgress(fiber, pendingProps)
		clone.index = 0
		clone.sibling = null
		return clone
	}
}

export const reconcilerChildFibers = ChildReconciler(true)

export const mountChildFibers = ChildReconciler(false)
