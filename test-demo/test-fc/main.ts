import {
	unstable_ImmediatePriority as ImmediatePriority,
	unstable_UserBlockingPriority as UserBlockingPriority,
	unstable_NormalPriority as NormalPriority,
	unstable_LowPriority as LowPriority,
	unstable_IdlePriority as IdlePriority,
	unstable_scheduleCallback as scheduleCallback,
	unstable_shouldYield as shouldYield,
	CallbackNode,
	unstable_getFirstCallbackNode as getFirstCallbackNode,
	unstable_cancelCallback as cancelCallback
} from 'scheduler'

const button = document.querySelector('button')
const root = document.getElementById('root')

interface Work {
	count: number
	proiority: Proiority
}

type Proiority =
	| typeof ImmediatePriority
	| typeof UserBlockingPriority
	| typeof NormalPriority
	| typeof LowPriority
	| typeof IdlePriority

const workList: Work[] = []
let preProiority: Proiority = IdlePriority
let curCallBack: CallbackNode | null

function schedule() {
	const cnode = getFirstCallbackNode()
	const work = workList.sort((w1, w2) => w1.proiority - w2.proiority)[0]
	if (!work) {
		curCallBack = null
		cnode && cancelCallback(cnode)
		return
	}
	// TODO: 策略逻辑
	const { proiority: curProiority } = work
	if (curProiority === preProiority) return
	// 更高优先级的work
	cnode && cancelCallback(cnode)
	curCallBack = scheduleCallback(curProiority, perform.bind(null, work))
}

function perform(work: Work, didTimeout?: boolean) {
	/**
	 * 1.work.proiority
	 * 2.饥饿问题
	 * 3.时间切片
	 */
	const needSync = work.proiority === ImmediatePriority || didTimeout
	while ((needSync || !shouldYield()) && work.count) {
		work.count--
		insertSpan('0')
	}
	preProiority = work.proiority
	// 执行完或中断执行
	if (!work.count) {
		const idx = workList.indexOf(work)
		workList.splice(idx, 1)
		preProiority = IdlePriority
	}
	const preCallback = curCallBack
	schedule()
	const newCallback = curCallBack
	if (newCallback && newCallback === preCallback) {
		return perform.bind(null, work)
	}
}

function insertSpan(content) {
	const span = document.createElement('span')
	span.innerText = content
	root?.appendChild(span)
}

button &&
	(button.onclick = () => {
		workList.unshift({
			count: 100
		})
		schedule()
	})
