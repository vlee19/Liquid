import { useState } from 'react'
import './App.css'

export default function App() {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	
	const generatedBotResponse = async (history) => {
		const updateHistory = (text) => {
			setChatHistory(prev => [...prev.filter(msg => msg.text !== "Thinking..."), { role: "assistant", text }]);
		}

		//format chat history for API Request
		history =history.map(({ role, text }) => ({ role, parts: [{text}] }));
		
		const requestOptions = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages: history })
		};

		try{
			const response = await fetch(import.meta.env.VITE_API_URL, requestOptions);
			const data = await response.json();
			if(!response.ok) throw new Error(data.error.message || 'Something went wrong!');
		
			console.log();
			const apiResponseText = data.candidates[0].contents.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1').trim();

			updateHistory(apiResponseText);
		}
		catch(error){
		console.log(error);
	}
};

	const handleSend = () => {//current messages and input value
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
