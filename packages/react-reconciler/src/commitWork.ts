import { Container, appendChildToContainer } from 'hostConfig'
import { FiberNode, FiberRootNode } from './fiber'
import { MutationMask, NoFlags, Placement } from './fiberFlags'
import { HostComponent, HostRoot, HostText } from './workTags'

let nextEffect: FiberNode | null = null

export const commitMutationEffects = (finshWork: FiberNode) => {
	nextEffect = finshWork
	while (nextEffect !== null) {
		// 向下遍历
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
}

const commitPlacement = (finshwork: FiberNode) => {
	// parent Dom
	// finishedWork ~
	if (__Dev__) {
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
	if (__Dev__) {
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
	while (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent)
		let sibling = child.sibling
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent)
			sibling = sibling.sibling
		}
	}
}
