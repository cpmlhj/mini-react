export type Container = Element

export type Instance = Element

// export const createInstance = (type: string, props: any): Instance => {
export const createInstance = (type: string): Instance => {
	// ToDo : propd
	const element = document.createElement(type)
	return element
}

export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	parent.appendChild(child)
}

export const createTextInstance = (content: string) => {
	return document.createTextNode(content)
}

export const appendChildToContainer = appendInitialChild
