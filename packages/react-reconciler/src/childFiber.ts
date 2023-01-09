import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbol'
import { props, ReactElement } from 'shared/ReactTypes'
import {
	createFiberFromElement,
	createWorkInProgress,
	FiberNode
} from './fiber'
import { ChildDeletion, Placement } from './fiberFlags'
import { HostText } from './workTags'

type ExistingChild = Map<string | number, FiberNode>

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
			if (Array.isArray(newChild)) {
				return reconcilerChildArray(returnFiber, currentFiber, newChild)
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
		while (currentFiber !== null) {
			// update
			if (key === currentFiber.key) {
				// key 相同
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (element.type === currentFiber.type) {
						// type 相同
						const existing = useFiber(currentFiber, element.props)
						existing.return = returnFiber
						// 当前节点可复用， 标记剩下的节点删除
						deleteRemainingChildren(
							returnFiber,
							currentFiber.sibling
						)
						return existing
					}
					//  key相同 type不通过   删除所有旧的
					deleteChild(returnFiber, currentFiber)
					break
				} else {
					console.warn('还没实现的React类型', element.$$typeof)
					break
				}
			} else {
				// key 不同， 删除旧的
				deleteChild(returnFiber, currentFiber)
				currentFiber = currentFiber.sibling
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
		while (currentFiber !== null) {
			// update
			if (currentFiber.tag === HostText) {
				// <div>123</div> -> <div>123</div>
				// 类型没变
				const existing = useFiber(currentFiber, { content: element })
				existing.return = returnFiber
				deleteRemainingChildren(returnFiber, currentFiber.sibling)
				return existing
			}
			// currentFiber 不是HostText
			// <div><span></span><div> -> <div>123</div>
			deleteChild(returnFiber, currentFiber)
			currentFiber = currentFiber.sibling
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

	function reconcilerChildArray(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		newChild: any[]
	) {
		// 1. 将current保存到map中
		const existingChild: ExistingChild = new Map()
		let current = currentFirstChild
		// 最后一个可复用Fiber在current中的index
		let lastPlacedIndex = 0
		// 最后的创建的Fiber
		let lastNewFiber: FiberNode | null = null
		// 创建的第一个Fiber
		let firstNewFiber: FiberNode | null = null
		while (current !== null) {
			const keyToUse = current.key !== null ? current.key : current.index
			existingChild.set(keyToUse, current)
			current = current.sibling
		}
		for (let i = 0; i < newChild.length; i++) {
			// 2. 遍历newChild, 寻找是否可复用
			const after = newChild[i]
			const afterFiber = updateFromMap(
				returnFiber,
				existingChild,
				i,
				after
			)
			if (afterFiber === null) {
				continue
			}
			// 3. 标记移动、插入
			afterFiber.index = i // 为新的Fiber 标记位置 index
			afterFiber.return = returnFiber
			if (lastNewFiber === null) {
				lastNewFiber = afterFiber
				firstNewFiber = afterFiber
			} else {
				lastNewFiber.sibling = afterFiber
				lastNewFiber = lastNewFiber.sibling
			}
			if (!shouldTrackEffects) continue
			const current = afterFiber.alternate
			if (current !== null) {
				// update
				// current 存在 代表这当前的afterFiber 为复用节点，能获取到节点在更新前的下标Index
				/**
				 * 举例： ReactElement 属性存在 key的情况下
				 *  A1 - B2 - C3 -> B2 - C3 - A1
				 *  0    1    2     0    1     2
				 *  B2 - oldIndex = 1 < 0 不用移动   lastPlacedIndex = 1
				 *  C3 - oldIndex = 2 <  1 不用移动  lastPlacedIndex = 2
				 *  A1 -  oldIndex = 0 < 2 需要移动  A1.flags |= Placement
				 */
				const oldIndex = current.index
				if (oldIndex < lastPlacedIndex) {
					// 移动
					afterFiber.flags |= Placement
					continue
				} else {
					// 不移动
					lastPlacedIndex = oldIndex
				}
			} else {
				// mount index = 0
				afterFiber.flags |= Placement
			}
		}
		// 4. 将map中剩下的 标记删除
		existingChild.forEach((fiber) => {
			deleteChild(returnFiber, fiber)
		})
		return firstNewFiber // 返回 firstChild
	}

	function updateFromMap(
		returnFiber: FiberNode,
		existingChild: ExistingChild,
		index: number,
		element: any
	): FiberNode | null {
		const EleKey = element.key !== null ? element.key : index
		const beforeNode = existingChild.get(EleKey)
		if (typeof element === 'string' || typeof element === 'number') {
			// hostText
			if (beforeNode) {
				if (beforeNode.tag === HostText) {
					existingChild.delete(EleKey)
					return useFiber(beforeNode, { content: element + '' })
				}
			}
			return new FiberNode(HostText, { content: element + '' }, null)
		}
		// ReactElement
		if (typeof element === 'object' && element !== null) {
			switch (element.$$typeof) {
				case REACT_ELEMENT_TYPE:
					if (beforeNode) {
						if (beforeNode.type === element.type) {
							existingChild.delete(EleKey)
							return useFiber(beforeNode, element.props)
						}
					}
					return createFiberFromElement(element)
			}
			// TODO: 数组
			if (Array.isArray(element)) {
				console.warn('暂不支持数组类型的child ')
				return null
			}
		}
		return null
	}

	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null
	) {
		if (!shouldTrackEffects) return
		let childDelete = currentFirstChild
		while (childDelete !== null) {
			deleteChild(returnFiber, childDelete)
			childDelete = childDelete.sibling
		}
	}

	function useFiber(fiber: FiberNode, pendingProps: props): FiberNode {
		// 在 update阶段 如果节点可复用，则使用该节点复制一个FiberNode, 并且如果alternate 为null,
		// 则用该节点生成一个新的FiberNode赋值给alternate
		const clone = createWorkInProgress(fiber, pendingProps)
		clone.index = 0
		clone.sibling = null
		return clone
	}
}

export const reconcilerChildFibers = ChildReconciler(true)

export const mountChildFibers = ChildReconciler(false)
