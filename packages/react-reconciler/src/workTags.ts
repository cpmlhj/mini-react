export type WorkTag =
	| typeof FunctionComponent
	| typeof HostComponent
	| typeof HostRoot
	| typeof HostText
	| typeof Fragement
	| typeof SuspenceComponent
	| typeof OffScreen

export const FunctionComponent = 0
export const HostRoot = 3
export const HostComponent = 5
export const HostText = 6
export const Fragement = 7
export const SuspenceComponent = 14
export const OffScreen = 13
