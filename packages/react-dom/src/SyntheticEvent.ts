import { Container } from 'hostConfig'
import { props } from 'shared/ReactTypes'
import {
	unstable_ImmediatePriority as ImmediatePriority,
	unstable_UserBlockingPriority as UserBlockingPriority,
	unstable_NormalPriority as NormalPriority,
	unstable_runWithPriority
} from 'scheduler'

const validEventTypeList = ['click']
export const elementPropsKey = '__props'

export interface DOMElement extends Element {
	[elementPropsKey]?: props
}

export type EventCallback = (e: Event) => void

export interface Paths {
	capture: EventCallback[]
	bubble: EventCallback[]
}

export interface SyntheticEvent extends Event {
	__stopPropagation: boolean
}

export function updateFiberProps(node: DOMElement, props: props) {
	node[elementPropsKey] = props
}

export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		throw new Error(`当前不支持:${eventType}`)
	}
	if (true) {
		console.log('初始化事件系统', eventType)
	}
	container.addEventListener(eventType, (e) => {
		dispatchEvent(container, eventType, e)
	})
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
	const targetElement = e.target as unknown as DOMElement
	if (targetElement === null) {
		console.warn(`事件不存在target`, e)
	} else {
		// 1. 收集沿途的事件
		const paths = collectPaths(targetElement, container, eventType)
		// 2. 构造合成事件
		const se = createSyntheticEvent(e)
		// 3. 遍历 captue 遍历 bubble
		triggerEventFlow(paths.capture, se)
		if (!se.__stopPropagation) {
			// 遍历bubble
			triggerEventFlow(paths.bubble, se)
		}
	}
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
	for (let i = 0; i < paths.length; i++) {
		const callback = paths[i]
		unstable_runWithPriority(eventTypeToSchdulerPriority(se.type), () =>
			callback.call(null, se)
		)
		callback.call(null, se)
		if (se.__stopPropagation) {
			// 在事件 捕获、冒泡阶段 如果某个事件回调逻辑 执行了 e.stopPropagation，则 立刻停止 事件传递，体现到React中 就是 停止事情遍历
			break
		}
	}
}

function collectPaths(
	targetElement: DOMElement,
	container: Container,
	eventType: string
) {
	const paths: Paths = {
		capture: [],
		bubble: []
	}
	while (targetElement && targetElement !== container) {
		// 收集过程
		const elementProps = targetElement[elementPropsKey]
		if (elementProps) {
			// click -> onClick、onClickCapture
			const callbackNameList =
				getEventCallbackNameFromEventType(eventType)
			if (callbackNameList) {
				callbackNameList.forEach((callbackName, i) => {
					const EventCallback = elementProps[callbackName]
					if (EventCallback) {
						if (i === 0) {
							// capture
							// unshift 后 , 最终第一项为 container的事件，
							// 以此来模拟捕获阶段 事件触发的顺序
							paths.capture.unshift(EventCallback)
						} else {
							paths.bubble.push(EventCallback)
						}
					}
				})
			}
		}
		targetElement = targetElement.parentNode as DOMElement
	}
	return paths
}

function getEventCallbackNameFromEventType(
	eventType: string
): string[] | undefined {
	return {
		click: ['onClickCapture', 'onClick']
	}[eventType]
}

function createSyntheticEvent(e: Event) {
	const syntheticEvent = e as SyntheticEvent
	syntheticEvent.__stopPropagation = false
	const originStopPropagation = e.stopPropagation
	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true // 用来标记 React事件系统中 是否需要停止遍历事件
		if (originStopPropagation) originStopPropagation() // 执行浏览器原生的 stopPropagation
	}
	return syntheticEvent
}

function eventTypeToSchdulerPriority(eventType: string) {
	switch (eventType) {
		case 'click':
		case 'keydown':
		case 'keyup':
			return ImmediatePriority
		case 'scroll':
			return UserBlockingPriority
		default:
			return NormalPriority
	}
}
