import { Container } from 'hostConfig'
import { FiberNode, FiberRootNode } from './fiber'
import { HostRoot } from './workTags'
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue
} from './updateQueue'
import { ReactElement } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workloop'

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null)
	const root = new FiberRootNode(container, hostRootFiber)
	hostRootFiber.updateQueue = createUpdateQueue()
	return root
}

export function updateContainer(
	element: ReactElement | null,
	root: FiberRootNode
) {
	const hostRootFiber = root.current
	const update = createUpdate<ReactElement | null>(element)
	enqueueUpdate(
		hostRootFiber.updateQueue as UpdateQueue<ReactElement | null>,
		update
	)
	scheduleUpdateOnFiber(hostRootFiber)
	return element
}
