export type Type = any
export type Key = any
export type ref = any
export type props = any
export type ElementType = any

export interface ReactElement {
	$$typeof: symbol | number
	type: ElementType
	key: Key
	ref: ref
	props: props
	__mark: string
}

export type Action<State> = State | ((prevState: State) => State)
