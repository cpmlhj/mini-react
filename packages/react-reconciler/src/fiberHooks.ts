import { FiberNode } from './fiber'
import internals from 'shared/internals'
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue,
	UpdateQueue
} from './updateQueue'
import { scheduleUpdateOnFiber } from './workloop'
import { Action } from 'shared/ReactTypes'

interface Hook {
	memoizedState: any // 每个hook 自身存放的state
	updateQueue: unknown
	next: Hook | null
}

// 当前执行渲染中的 fiberNode
let currentlyRenderingFiber: FiberNode | null = null
// 当前正在处理的hook
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null

const { currentDispatcher } = internals

export function renderWithHooks(wip: FiberNode) {
	// 赋值操作
	currentlyRenderingFiber = wip
	// 重置 FC中 memoizedState保存的是 hooks 链表数据
	wip.memoizedState = null

	const current = wip.alternate
	if (current !== null) {
		// update
		currentDispatcher.current = HookDispatcherOnUpdate
	} else {
		// mount
		currentDispatcher.current = HooksDispatcherOnMount
	}

	const component = wip.type
	const props = wip.pendingProps
	const children = component(props)
	// 重置
	currentlyRenderingFiber = null
	workInProgressHook = null
	currentHook = null
	return children
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
}

const HookDispatcherOnUpdate: Dispatcher = {
	useState: updateState
}

function mountState<State>(
	initialState: (() => State) | State
): [State, Dispatch<State>] {
	// 找到当前useState 对应的 数据
	const hook = mountWorkInProgressHook()
	let memoizedState
	if (initialState instanceof Function) {
		memoizedState = initialState()
	} else {
		memoizedState = initialState
	}
	const queue = createUpdateQueue<State>()
	hook.updateQueue = queue
	hook.memoizedState = memoizedState

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const dispatch = dispatchSetState.bind(
		null,
		currentlyRenderingFiber as FiberNode,
		queue
	)
	queue.dispatch = dispatch
	return [memoizedState, dispatch]
}

function updateState<State>(): [State, Dispatch<State>] {
	// 找到当前useState 对应的 数据
	const hook = updateWorkInProgressHook()
	// 计算新的state的逻辑
	// 最新的state 存放在上一次Hook中的updateQueue
	// 因为 上一次 执行完 useState 返回的 dispatch中，将最新的state 传入到dispatch
	// 然后 dispatch 内部逻辑 将 参数state 以参数形式传入到 createQueue中
	const queue = hook.updateQueue as UpdateQueue<State>
	const pending = queue.shared.pending
	if (pending !== null) {
		const { memoizedState } = processUpdateQueue(
			hook.memoizedState, // 上一次hook的state
			pending
		)
		hook.memoizedState = memoizedState
	}
	return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null
	}
	if (workInProgressHook === null) {
		// mount 并且是第一个hook
		if (currentlyRenderingFiber === null) {
			// 在执行mountState(useState -> mount 上下文)时候，如果不存在currentlyRenderingFiber
			// 则说明 useState的执行时机 不是在 函数组件的上下文里，抛出异常
			throw new Error('请在函数组件内调用hook')
		} else {
			workInProgressHook = hook
			currentlyRenderingFiber.memoizedState = hook
		}
	} else {
		// mount 后续的hook
		workInProgressHook.next = hook
		workInProgressHook = hook
	}
	return workInProgressHook
}

function updateWorkInProgressHook(): Hook {
	// TODO: render 阶段触发的更新
	let nextCurrentHook: Hook | null = null
	if (currentHook === null) {
		// FC update时第一个Hook
		const current = currentlyRenderingFiber?.alternate
		if (current !== null) {
			nextCurrentHook = current?.memoizedState
		}
	} else {
		nextCurrentHook = currentHook.next
	}
	if (nextCurrentHook === null) {
		// nextCurrentHook ===  null 的情况
		// 上一次 render  mount/update  use1 -> use2 -> use3
		// 这一次 render  if(xxx) {use4()} : use1 -> use2 -> use3 -> use4
		// 此时， currentHook.next = null
		throw new Error(
			`组件${currentlyRenderingFiber?.type}本次执行时的hooks比上一次执行的hooks 多`
		)
	}
	// 注意 看currentHook 一直是对应的 current?.memoizedState中 hooks的链表，也就是上一次更新的hooks链表
	currentHook = nextCurrentHook
	const newHook: Hook = {
		memoizedState: currentHook?.memoizedState,
		updateQueue: currentHook?.updateQueue,
		next: null
	}
	if (workInProgressHook === null) {
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用hook')
		}
		workInProgressHook = newHook
		// 将新的hook 链表赋值给 当前Fiber节点  currentlyRenderingFiber.memoizedState === workInProgressHook
		// workInProgressHook 构成了新的hook 链表
		currentlyRenderingFiber.memoizedState = newHook
	} else {
		workInProgressHook.next = newHook
		workInProgressHook = newHook
	}
	return workInProgressHook
}

function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const update = createUpdate(action)
	enqueueUpdate(updateQueue, update)
	scheduleUpdateOnFiber(fiber)
}
