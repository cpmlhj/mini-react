import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
	const [num, setNum] = useState(100)
	window.setNum = setNum
	return num === 3 ? (
		<div>我是三啊</div>
	) : (
		<div>
			<span>{num}</span>
		</div>
	)
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
)
console.log(<App />)
