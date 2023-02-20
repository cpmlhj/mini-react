// declare let true: boolean

interface DE {
	name: string
	age: number
}

type DMOE<T> = {
	[P in keyof T]?: T[P]
}

type ss = DMOE<DE>
