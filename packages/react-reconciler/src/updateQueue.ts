import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'
import { isSubsetOfLane, Lane, NoLane } from './fiberLanes'

export interface Update<State> {
	action: Action<State>
	next: Update<any> | null
	lane: Lane
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null
	}
	dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane
): Update<State> => {
	return {
		action,
		next: null,
		lane
	}
}

export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	} as UpdateQueue<State>
}

export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	const pending = updateQueue.shared.pending
	if (pending === null) {
		// 当前update链表为空
		// a -> a.next = a 指向自己
		update.next = update
	} else {
		// a -> b
		// c   a -> c - >b 维持环状链表
		update.next = pending.next
		pending.next = update
	}
	updateQueue.shared.pending = update
}

export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): {
	memoizedState: State
	baseState: State
	baseQueue: Update<State> | null
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
		baseState,
		baseQueue: null
	}
	if (pendingUpdate !== null) {
		const fisrt = pendingUpdate.next // 第一个更新
		let pending = pendingUpdate.next as Update<any>
		let newBaseState = baseState
		let newBaseQueueFirst: Update<State> | null = null
		let newBaseQueueLast: Update<State> | null = null
		let newState = baseState
		do {
			const updateLane = pending?.lane
			if (!isSubsetOfLane(renderLane, updateLane)) {
				// 优先级🙅🏻不够
				const clone = createUpdate(pending.action, pending.lane)
				// 是不是第一个被跳过的
				if (newBaseQueueFirst === null) {
					newBaseQueueFirst = clone
					newBaseQueueLast = clone
					newBaseState = newState
				} else {
					;(newBaseQueueLast as Update<State>).next = clone
					newBaseQueueLast = clone
				}
			} else {
				if (newBaseQueueFirst !== null) {
					const clone = createUpdate(pending.action, NoLane)
					;(newBaseQueueLast as Update<State>).next = clone
					newBaseQueueLast = clone
				}
				const action = pending?.action
				if (action instanceof Function) {
					newState = action(baseState)
				} else {
					newState = action
				}
			}
			pending = pending.next as Update<any>
		} while (pending !== fisrt)
		if (newBaseQueueLast === null) {
			// 本次计算没有update 跳过
			newBaseState = newState
		} else {
			newBaseQueueLast.next = newBaseQueueFirst
		}
		result.memoizedState = newState
		result.baseQueue = newBaseQueueLast
		result.baseState = newBaseState
	}
	return result
}
