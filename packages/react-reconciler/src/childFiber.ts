import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbol'
import { ReactElement } from 'shared/ReactTypes'
import { createFiberFromElement, FiberNode } from './fiber'
import { Placement } from './fiberFlags'
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
					if (__Dev__) {
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
		if (__Dev__) {
			console.warn('未实现的reconcile类型')
		}
		return null
	}

	function reconcilerSignleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElement
	) {
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
}

export const reconcilerChildFibers = ChildReconciler(true)

export const mountChildFibers = ChildReconciler(false)
