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
import { Lane, NoLane, requestUpdateLane } from './fiberLanes'
import { Flags, PassiveEffect } from './fiberFlags'
import { HookHasEffect, Passive } from './hookEffectTags'

type EffectCallback = () => void
type EffectDeps = any[] | null
interface Hook {
	memoizedState: any // 每个hook 自身存放的state
	updateQueue: unknown
	next: Hook | null
}

export interface Effect {
	tag: Flags
	create: EffectCallback | void
	destory: EffectCallback | void
	deps: EffectDeps
	next: Effect | null
}

export interface FunctionUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null
}

// 当前执行渲染中的 fiberNode
let currentlyRenderingFiber: FiberNode | null = null
// 当前正在处理的hook
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null
let renderLane: Lane = NoLane

const { currentDispatcher } = internals

export function renderWithHooks(wip: FiberNode, lane: Lane) {
	// 赋值操作
	currentlyRenderingFiber = wip
	// 重置 FC中 memoizedState保存的是 hooks 链表数据
	wip.memoizedState = null
	wip.updateQueue = null
	renderLane = lane

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
	// 执行完函数后，也就是执行了所有hooks 获取到了最新的state，呈现在ReactElement中
	const children = component(props)
	// 重置
	currentlyRenderingFiber = null
	workInProgressHook = null
	renderLane = NoLane
	currentHook = null
	return children
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect
}

const HookDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect
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

/**
 * updateState 的执行时机是在beginwork时 如果tag是FunctionComponent时，会执行renderWithHooks,
 * 此时 代码中的useState 是 updateState, updateState 拿到的hook 是根据上一次更新的hook创建而来的新hook(有可能是mountstate)
 * updateState 拿到的 queue 就是这次要更新的内容
 */
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
			pending,
			renderLane
		)
		hook.memoizedState = memoizedState
	}
	queue.shared.pending = null
	return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = mountWorkInProgressHook()
	const nextDeps = deps === undefined ? null : deps

	currentlyRenderingFiber!.flags |= PassiveEffect
	hook.memoizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	)
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = updateWorkInProgressHook()
	const nextDeps = deps === undefined ? null : deps
	let destory: EffectCallback | void
	if (currentHook !== null) {
		const preEffect = currentHook.memoizedState as Effect
		destory = preEffect.destory
		if (nextDeps !== null) {
			// 比较依赖
			const preDeps = preEffect.deps
			// 这里会有关键点，deps获取到的值，其实是执行了 setState之后的值（最新的值），因为 deps的state 所指的 useState 总是比 useEffect 执行
			// 毕竟变量还没声明，是不能作为参数传入的
			if (areHookInputIsEqual(nextDeps, preDeps)) {
				hook.memoizedState = pushEffect(
					Passive,
					create,
					destory,
					nextDeps
				)
				return
			}
			// 依赖的state发生了change, 标记effect需要在commit阶段执行、同时标记fiberNode flags 合并值PassiveEffect，代表当前fiberNode节点有需要执行的effect
			currentlyRenderingFiber!.flags = PassiveEffect
			hook.memoizedState = pushEffect(
				Passive | HookHasEffect,
				create,
				destory,
				nextDeps
			)
		}
	}
}

function areHookInputIsEqual(nextDeps: EffectDeps, preDeps: EffectDeps) {
	if (preDeps === null || nextDeps === null) return false
	for (let i = 0; i < preDeps.length && i < nextDeps.length; i++) {
		if (Object.is(preDeps[i], nextDeps[i])) {
			continue
		}
		return false
	}
	return true
}

/**
 *
 * @param hookFlags
 * @param create
 * @param destory
 * @param deps
 * @returns
 */
function pushEffect(
	hookFlags: Flags,
	create: EffectCallback | void,
	destory: EffectCallback | void,
	deps: EffectDeps
): Effect {
	const effect: Effect = {
		tag: hookFlags,
		create,
		deps,
		destory,
		next: null
	}
	const fiber = currentlyRenderingFiber as FiberNode
	const updateQueue = fiber.updateQueue as FunctionUpdateQueue<any>
	if (!updateQueue) {
		const updateQueue = createFunctionUpdateQueue()
		fiber.updateQueue = updateQueue
		effect.next = effect
		updateQueue.lastEffect = effect
	} else {
		const lastEffect = updateQueue.lastEffect
		if (lastEffect === null) {
			effect.next = effect
			updateQueue.lastEffect = effect
		} else {
			const firstEffect = lastEffect.next
			lastEffect.next = effect
			effect.next = firstEffect
			updateQueue.lastEffect = effect
		}
	}
	return effect
}

function createFunctionUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FunctionUpdateQueue<State>
	updateQueue.lastEffect = null
	return updateQueue
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

		/**
		 * 这里的alternate 有时候会有个疑惑，就是在第一次update时，currentlyRenderingFiber 其实是FiberRootNode.current.alternate 的FiberNode
		 * 就是 画面上正在使用的是FiberRootNode.current，那么 currentlyRenderingFiber.alternate  === FiberRootNode.current  （特指某个FiberNode节点）
		 */
		const current = currentlyRenderingFiber?.alternate
		if (current !== null) {
			nextCurrentHook = current?.memoizedState // 这里的memoizedState 就是当前画面更新前的hook链表
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
	const lane = requestUpdateLane()
	const update = createUpdate(action, lane)
	enqueueUpdate(updateQueue, update)
	scheduleUpdateOnFiber(fiber, lane)
}
