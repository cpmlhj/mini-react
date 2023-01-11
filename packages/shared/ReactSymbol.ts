const supportSymbol = typeof Symbol === 'function' && Symbol.for

export const REACT_ELEMENT_TYPE = supportSymbol
	? Symbol.for('react.element')
	: 0xeac7

export const REACT_FRAGEMENT_TYPE = supportSymbol
	? Symbol.for('react.fragement')
	: 0xeacb
