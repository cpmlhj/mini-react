import { FiberRootNode } from './fiber'

export type Lane = number
export type Lanes = number

export const SyncLane = 0b0001 // 同步

export const NoLane = 0b0000

export const NoLanes = 0b0000

export function mergeLanes(lanA: Lane, lanB: Lane): Lanes {
	return lanA | lanB
}

export function requestUpdateLane() {
	return SyncLane
}

export function getHighesPriority(lanes: Lanes): Lane {
	return lanes & -lanes
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane
}
