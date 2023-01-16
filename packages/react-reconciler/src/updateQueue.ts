import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'
import { Lane } from './fiberLanes'

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
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	}
	if (pendingUpdate !== null) {
		const fisrt = pendingUpdate.next // 第一个更新
		let pending = pendingUpdate.next as Update<any>
		do {
			const updateLane = pending?.lane
			if (updateLane === renderLane) {
				const action = pending?.action
				if (action instanceof Function) {
					baseState = action(baseState)
				} else {
					baseState = action
				}
			} else {
				if (true) {
					console.warn('当前更新 不应该进入')
				}
			}
			pending = pending.next as Update<any>
		} while (pending !== fisrt)
	}
	result.memoizedState = baseState
	return result
}
