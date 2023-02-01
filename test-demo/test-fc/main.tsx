import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
	const [num, setNum] = useState(1)
	useEffect(() => {
		console.log('====================')
		return () => {
			console.log('workkj')
		}
	}, [])
	// const test =
	// 	num % 2 !== 0
	// 		? [
	// 				<li key={'1'}>li1</li>,
	// 				<li key={'2'}>li2</li>,
	// 				<li key={'3'}>li3</li>
	// 		  ]
	// 		: [
	// 				<li key={'2'}>li2</li>,
	// 				<li key={'3'}>li3</li>,
	// 				<li key={'1'}>li1</li>
	// 		  ]
	return (
		<ul
			className="demo-class"
			key="ulk"
			onClick={() => {
				setNum((num) => num + 1)
				setNum((num) => num + 1)
				setNum((num) => num + 1)
			}}
		>
			{/* <>
				<span>1</span>
				<span>2</span>
				{test}
			</> */}
			{num}
		</ul>
	)
}
console.log(<App />)

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
)
