import { useState } from 'react'
import './App.css'

export default function App() {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	

	const handleSend = async () => {
		if(!input.trim()) return;

		const userMessage = {
			role: "user",
			content: input
		};

		// Add user message and thinking placeholder
		setMessages(prev => [...prev, userMessage]);
		setInput("");

		// Add thinking message
		setMessages(prev => [...prev, { role: "assistant", content: "Thinking..." }]);

		// Prepare history for API request
		const history = [...messages, userMessage].map(({ role, content }) => ({ 
			role: role === "user" ? "user" : "model", 
			parts: [{ text: content }] 
		}));

		const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
		const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

		const requestOptions = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ contents: history })
		};

		try {
			const response = await fetch(API_URL, requestOptions);
			if(!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error?.message || 'Something went wrong!');
			}
			
			const data = await response.json();
			const apiResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1').trim();

			// Replace thinking message with actual response
			setMessages(prev => [
				...prev.filter(msg => msg.content !== "Thinking..."), 
				{ role: "assistant", content: apiResponseText }
			]);
		} catch(error) {
			console.log(error);
			// Replace thinking message with error message
			setMessages(prev => [
				...prev.filter(msg => msg.content !== "Thinking..."), 
				{ role: "assistant", content: "Sorry, something went wrong. Please try again." }
			]);
		}
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
