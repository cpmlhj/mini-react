import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
	const [num, setNum] = useState(1)
	console.log(num)
	const test =
		num % 2 !== 0
			? [
					<li key={'1'}>li1</li>,
					<li key={'2'}>li2</li>,
					<li key={'3'}>li3</li>
			  ]
			: [
					<li key={'2'}>li2</li>,
					<li key={'3'}>li3</li>,
					<li key={'1'}>li1</li>
			  ]
	return (
		<ul className="demo-class" key="ulk" onClick={() => setNum(num + 1)}>
			{test}
		</ul>
	)
}
console.log(<App />)

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
)
