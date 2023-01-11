import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'

export interface Update<State> {
	action: Action<State>
	next: Update<any> | null
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null
	}
	dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return {
		action,
		next: null
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
	pendingUpdate: Update<State> | null
): {
	memoizedState: State
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	}
	if (pendingUpdate !== null) {
		// baseState 1 update 2 ->  memoizedState 2
		//  baseState 1 update (x) => 2x -> memoizedState 2
		const action = pendingUpdate.action
		if (action instanceof Function) {
			result.memoizedState = action(baseState)
		} else {
			result.memoizedState = action
		}
	}
	return result
}
