// ReactElement
import { REACT_ELEMENT_TYPE, REACT_FRAGEMENT_TYPE } from 'shared/ReactSymbol'
import {
	ReactElement,
	ElementType,
	Type,
	Key,
	ref,
	props
} from 'shared/ReactTypes'

const ReactElement = function (
	type: Type,
	key: Key,
	ref: ref,
	props: props
): ReactElement {
	const element = {
		$$typeof: REACT_ELEMENT_TYPE,
		key,
		ref,
		props,
		type,
		__mark: 'CPM'
	}
	return element
}

export const jsx = (type: ElementType, config: any, ...maybeChildren: any) => {
	let key: Key = null
	const props: props = {}
	let ref: ref = null
	for (const prop in config) {
		const val = config[prop]
		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val
			}
			continue
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val
			}
			continue
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = val
		}
	}
	const mayBeChildLen = maybeChildren.length
	if (mayBeChildLen) {
		if (mayBeChildLen === 1) {
			// [child]
			props.children = maybeChildren[0]
		} else {
			// [child, child, child]
			props.children = maybeChildren
		}
	}
	return ReactElement(type, key, ref, props)
}

export const jsxDev = (type: ElementType, config: any, maybeKey: any) => {
	let key: Key = maybeKey || null
	const props: props = {}
	let ref: ref = null

	for (const prop in config) {
		const val = config[prop]
		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val
			}
			continue
		}
		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val
			}
			continue
		}
		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = val
		}
	}
	return ReactElement(type, key, ref, props)
}

export const Fragment = REACT_FRAGEMENT_TYPE

export const isValidElementFn = (object: any) => {
	return (
		typeof object === 'object' &&
		object !== null &&
		object.$$typeof === REACT_ELEMENT_TYPE
	)
}
