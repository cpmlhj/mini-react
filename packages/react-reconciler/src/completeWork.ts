import { FiberNode } from './fiber'
import {
	Fragement,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags'
import {
	createInstance,
	appendInitialChild,
	createTextInstance,
	Container,
	Instance
} from 'hostConfig'
import { NoFlags, Update } from './fiberFlags'

export const completeWork = (wip: FiberNode) => {
	// 递归中的归
	const newProps = wip.pendingProps
	const current = wip.alternate
	switch (wip.tag) {
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// TODO: update
				// props 是否发生变化
				// 1.变化了  update flag
				markUpdate(wip)
				// updateFiberProps(wip.stateNode, newProps)
			} else {
				// 1. 构建Dom
				// 2. 将Dom插入到Dom树

				/**
				 * 情况一、 当前wip 为叶子节点 appendAllChildren 不做任何操作 因为 wip.child === null
				 * wip(叶子节点).statNode  = (真实DOM) --> instance
				 *
				 * 情况二、假设为如下情况
				 *  <div> 第三次completework 为这个节点
				 * <span id=1></span> 第二次completework 为这个节点，
				 * <span id=2></span> 上一次completework 为这个节点，
				 * </div>
				 * 通过workloop 逻辑后，将wip 设定为 div, 也就是span1 span2的return节点， div
				 * 此时appendAllChildren wip.child 为存在的
				 * appendInitialChild中，parent为div（真实DOM）节点, node.stateNode 为子节点的真实DOM,挂载到div上
				 * */
				// const instance = createInstance(wip.type, newProps)
				const instance = createInstance(wip.type, newProps)
				appendAllChildren(instance, wip)
				wip.stateNode = instance
			}
			bubbleProperties(wip)
			return null
		case HostRoot:
		case FunctionComponent:
		case Fragement:
			bubbleProperties(wip)
			return null
		case HostText:
			if (current !== null && wip.stateNode) {
				// update
				// current.memoizedProps.content 就是当前使用的值， 也最新的值 wip.pendingProps比较
				const oldText = current.memoizedProps.content
				const newText = newProps.content
				if (oldText !== newText) {
					markUpdate(wip)
				}
			} else {
				// 1. 构建Dom
				// 2. 将Dom插入到Dom树
				const instance = createTextInstance(newProps.content)
				wip.stateNode = instance
			}
			bubbleProperties(wip)
			return null
		default:
			if (true) {
				console.warn('未处理的类型', wip.tag)
			}
			return null
	}
}

/**
 *
 * @param parent workInProgress.stateNode -> DOM Element
 * @param wip workInProgress
 * ① 从当前FiberNode 向下遍历 遍历到第一层DOM元素类型(HostComponent、HostText) 通过appendChild方法插入到parent末尾
 * ② 对兄弟FiberNode执行步骤①
 * ③ 如果没有兄弟FiberNode 则对父FiberNode 的兄弟执行步骤①
 * ④ 当遍历流程回到最初的workInProgress(就是入参时候的FiberNode)时终止
 */
function appendAllChildren(parent: Container | Instance, wip: FiberNode) {
	let node = wip.child
	while (node !== null) {
		if (node?.tag === HostComponent || node?.tag === HostText) {
			// 步骤 ①
			appendInitialChild(parent, node.stateNode)
		} else if (node.child !== null) {
			// 步骤 ①
			// 当第一层child 没有的时候 才会继续向下遍历child.child, 其余情况只会遍历 sibilng
			node.child.return = node
			node = node.child
			continue
		}
		// 步骤 ④
		if (node === wip) return
		while (node.sibling === null) {
			// 步骤 ② ③
			if (node.return === null || node.return === wip) return
			node = node?.return
		}
		node.sibling.return = node.return
		node = node.sibling
	}
}

// 通过传入当前的workInProgress 向下child sibling遍历，冒泡flags
function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags
	let child = wip.child
	while (child !== null) {
		subtreeFlags |= child.subtreeFlags
		subtreeFlags |= child.flags
		child.return = wip
		// 只需要拿 child, sibling, 因为 child sibling的 child flags
		//  已经在上一轮冒泡中将自身的flags 冒泡到 child ,sibling的flags中
		child = child.sibling
	}
	wip.subtreeFlags |= subtreeFlags
}

function markUpdate(fiber: FiberNode) {
	fiber.flags |= Update
}
