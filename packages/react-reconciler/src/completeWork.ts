import { FiberNode } from './fiber'
import { HostComponent, HostRoot, HostText } from './workTags'
import {
	createInstance,
	appendInitialChild,
	createTextInstance,
	Container
} from 'hostConfig'
import { NoFlags } from './fiberFlags'

export const completeWork = (wip: FiberNode) => {
	// 递归中的归
	const newProps = wip.pendingProps
	const current = wip.alternate
	switch (wip.tag) {
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// update
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
				const instance = createInstance(wip.type)
				appendAllChildren(instance, wip)
				wip.stateNode = instance
			}
			bubbleProperties(wip)
			return null
		case HostRoot:
			bubbleProperties(wip)
			return null
		case HostText:
			if (current !== null && wip.stateNode) {
				// update
			} else {
				// 1. 构建Dom
				// 2. 将Dom插入到Dom树
				const instance = createTextInstance(newProps.content)
				wip.stateNode = instance
			}
			bubbleProperties(wip)
			return null
		default:
			if (__Dev__) {
				console.warn('未处理的类型', wip.tag)
			}
			return null
	}
}

function appendAllChildren(parent: Container, wip: FiberNode) {
	let node = wip.child
	while (node !== null) {
		if (node?.tag === HostComponent || node?.tag === HostText) {
			appendInitialChild(parent, node.stateNode)
		} else if (node.child !== null) {
			node.child.return = node
			node = node.child
			continue
		}
		if (node === wip) return
		while (node.sibling === null) {
			if (node.return === null || node.return === wip) return
			node = node?.return
		}
		node.sibling.return = node.return
		node = node.sibling
	}
}

function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags
	let child = wip.child
	while (child !== null) {
		subtreeFlags |= child.subtreeFlags
		subtreeFlags |= child.flags
		child.return = wip
		child = child.sibling
	}
	wip.subtreeFlags |= subtreeFlags
}
