import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
	const [num, setNum] = useState(1)
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
			}}
		>
			{num % 2 !== 0 ? (
				<div>
					<span>1</span>
					<span>2</span>
				</div>
			) : (
				<p>
					<h1>3</h1>
					<h1>4</h1>
				</p>
			)}
		</ul>
	)
}
console.log(<App />)

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
)
