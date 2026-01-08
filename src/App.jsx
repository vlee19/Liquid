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
					<div 
						key={index}
						className={`${msg.role === "user" ? "user" : "ai"}-msg`}
					>
						{msg.content}
					</div>
				))}
			</div>
			<div className="input-container">
				<div className="input-wrapper">
					<input 
						value={input}
						onChange={e => setInput(e.target.value)}
						placeholder='Ask Liquid'
						onKeyDown={(e) => e.key === "Enter" && handleSend()}
						className="user-input"
					/>
					<button onClick={handleSend} className="send-btn">Send</button>
				</div>
			</div>
		</div>
	);
}
