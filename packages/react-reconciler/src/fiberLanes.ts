import { FiberRootNode } from './fiber'
import {
	unstable_getCurrentPriorityLevel,
	unstable_ImmediatePriority,
	unstable_UserBlockingPriority,
	unstable_NormalPriority,
	unstable_IdlePriority
} from 'scheduler'

export type Lane = number
export type Lanes = number

export const SyncLane = 0b0001 // 同步
export const InputContinuousLane = 0b0010
export const defaultLane = 0b0100
export const IdleLane = 0b1000

export const NoLane = 0b0000

export const NoLanes = 0b0000

export function mergeLanes(lanA: Lane, lanB: Lane): Lanes {
	return lanA | lanB
}

export function requestUpdateLane() {
	// 从上下文环境中获取当前Scheduler的优先级
	const currentPriorityLevel = unstable_getCurrentPriorityLevel()
	const lane = schedulerPriorityToLane(currentPriorityLevel)
	return lane
}

export function getHighesPriority(lanes: Lanes): Lane {
	return lanes & -lanes
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane
}

export function lanesToSchedulerPriority(lanes: Lanes) {
	const lane = getHighesPriority(lanes)
	if (lane === SyncLane) return unstable_ImmediatePriority
	if (lane === InputContinuousLane) return unstable_UserBlockingPriority
	if (lane === defaultLane) return unstable_NormalPriority
	return unstable_IdlePriority
}

function schedulerPriorityToLane(schedulerPriority: number) {
	if (schedulerPriority === unstable_ImmediatePriority) return SyncLane
	if (schedulerPriority === unstable_UserBlockingPriority)
		return InputContinuousLane
	if (schedulerPriority === unstable_NormalPriority) return defaultLane
	return IdleLane
}

export function isSubsetOfLane(set: Lanes, subset: Lane) {
	return (set & subset) === subset
}
