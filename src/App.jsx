import { useState } from 'react'
import './App.css'

export default function App() {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");

	const [showLinks, setShowLinks] = useState(false);
	

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
				{ 
					role: "assistant", 
					content: apiResponseText,  
					links: [
						{ url: "https://fonts.google.com/icons?selected=Material+Symbols+Outlined:arrow_right_alt:FILL@0;wght@400;GRAD@0;opsz@24&icon.query=enter&icon.size=24&icon.color=%23e3e3e3" },
						{ url: "https://fonts.google.com/icons?selected=Material+Symbols+Outlined:arrow_right_alt:FILL@0;wght@400;GRAD@0;opsz@24&icon.query=enter&icon.size=24&icon.color=%23e3e3e3" }
					]
				}
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

						{msg.role === "assistant" && msg.links?.length > 0 && (
							<button
								className="view-links-btn"
								onClick={() => setShowLinks(prev => !prev)}
							>
								{showLinks ? "Hide" : "View"}
							</button>
						)}
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
			{showLinks && (
				<div className="links-container">
					{messages
						.filter(msg => msg.role === "assistant" && msg.links?.length > 0)
						.map((msg, i) => (
						<div key={i} className="link-box">
							{msg.links.map((l, j) => (
								<a key={j} href={l.url} target="_blank" rel="noreferrer">
									{l.url}
								</a>
							))}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
