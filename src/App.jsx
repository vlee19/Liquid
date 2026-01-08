import { useState } from 'react'
import './App.css'

export default function App() {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");

	const handleSend = () => {
		if(!input.trim()) return;

		const userMessage = {
			role: "user",
			content: input
		};

		const aiMessage = {
			role: "assistant",
			content: "My response will go here!"
		};

		setMessages(prev => [...prev, userMessage, aiMessage]);
		setInput("");
	};

	return (
		<div className="container">
			<div className="messages">
				{messages.map((msg, index) => (
					<div key={index}>
						{msg.content}
					</div>
				))}
			</div>
			<div className="input">
				<input 
					value={input} 
					onChange={e => setInput(e.target.value)}
					placeholder='Ask Liquid'
				/>
				<button onClick={handleSend}>Send</button>
			</div>
		</div>
	);
}
