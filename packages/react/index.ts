// React
import { Dispatcher, resolveDispatcher } from './src/currentDispatcher'
import { jsx, isValidElementFn } from './src/jsx'
import currentDispatcher from './src/currentDispatcher'
export {
	REACT_SUSPENSE_TYPE as Suspence,
	REACT_FRAGEMENT_TYPE as Fragement
} from 'shared/ReactSymbol'

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher()
	return dispatcher.useState(initialState)
}

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispatcher = resolveDispatcher()
	return dispatcher.useEffect(create, deps)
}

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FILED = {
	currentDispatcher
}

export const version = '0.0.1'

export const createElement = jsx

export const isValidElement = isValidElementFn

// export default {
// 	version: '0.0.1',
// 	createElement: jsx
// }
