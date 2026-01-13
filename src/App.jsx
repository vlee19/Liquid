import { useState, useEffect, useRef } from 'react'
import './App.css'
import ReactMarkDown from 'react-markdown';
import TypingEffect from "./components/TypingEffect";

export default function App() {
    const [messages, setMessages] = useState(() => {
		const stored = localStorage.getItem("messages");
		return stored ? JSON.parse(stored) : [];
	});
    const [input, setInput] = useState("");

	const [openLinkBox, setOpenLinkBox] = useState(false);
    const [showLinksId, setShowLinksId] = useState(null);

	const [showWarning, setShowWarning] = useState(false);

	const abortControllerRef = useRef(null);

    const handleSend = async () => {
        if(!input.trim()) return;

		abortControllerRef.current?.abort();

		const controller = new AbortController();
		abortControllerRef.current = controller;

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
            body: JSON.stringify({ contents: history }),
			signal: controller.signal
        };

        try {
            const response = await fetch(API_URL, requestOptions);
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'Something went wrong!');
            }
            
            const data = await response.json();
            const apiResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1').trim();

            // Make a second query to get source links
            const linksPrompt = `Based on your previous answer: "${apiResponseText}", provide me with a list of relevant source links and URLs that were used or would support this answer. Format each link on a new line starting with "- "`;
            
            const linksHistory = [...history, { role: "model", parts: [{ text: apiResponseText }] }, { role: "user", parts: [{ text: linksPrompt }] }];
            
            const linksRequestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: linksHistory }),
				signal: controller.signal
            };

            const linksResponse = await fetch(API_URL, linksRequestOptions);
            let extractedLinks = [];

            if(linksResponse.ok) {
                const linksData = await linksResponse.json();
                const linksText = linksData.candidates[0].content.parts[0].text;
                
                // Extract URLs from the response
                const urlPattern = /https?:\/\/[^\s]+/g;
                const urls = linksText.match(urlPattern) || [];
                extractedLinks = urls.map(url => ({ url }));
            }

            // Replace thinking message with actual response
            setMessages(prev => [
                ...prev.filter(msg => msg.content !== "Thinking..."), 
                { 
                    role: "assistant", 
                    content: apiResponseText,  
                    links: extractedLinks,
                    id: Date.now()
                }
            ]);
        } catch(error) {
			if (error.name === "AbortError") {
				return;
			}
            console.log(error);
            // Replace thinking message with error message
            setMessages(prev => [
                ...prev.filter(msg => msg.content !== "Thinking..."), 
                { role: "assistant", content: "Sorry, something went wrong. Please try again." }
            ]);
        }
    };
	
	const currentLinksMsg = messages.find(
		m => m.id === showLinksId && m.role === "assistant" && m.links?.length > 0
	);
	
	const activeMsg = messages
		.slice()
		.reverse()
		.find(m => m.role === "assistant" && m.links?.length > 0);

	useEffect(() => {
		if (activeMsg && showLinksId == null) {
			setShowLinksId(activeMsg.id);
		}
	}, [activeMsg, showLinksId]);
	
	useEffect(() => {
		if (showLinksId && openLinkBox) {
			const msgElement = document.getElementById(`msg-${showLinksId}`);
			msgElement?.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [showLinksId, openLinkBox]);
	
	const linkMessages = messages.filter(
		m => m.role === "assistant" && m.links?.length > 0
	);
	const navDisabled = linkMessages.length < 2;
	
	const handlePrev = () => {
		if (!showLinksId || linkMessages.length === 0) return;

		const currIndex = linkMessages.findIndex(m => m.id === showLinksId);
		const prevIndex = (currIndex - 1 + linkMessages.length) % linkMessages.length;

		setShowLinksId(linkMessages[prevIndex].id);
	}
	const handleNext = () => {
		if (!showLinksId || linkMessages.length === 0) return;

		const currIndex = linkMessages.findIndex(m => m.id === showLinksId);
		const nextIndex = (currIndex + 1) % linkMessages.length;

		setShowLinksId(linkMessages[nextIndex].id);
	}

	useEffect(() => {
		localStorage.setItem("messages", JSON.stringify(messages));
	}, [messages]);

	const clearChat = () => {
		abortControllerRef.current?.abort();
		abortControllerRef.current = null;

		setMessages([]);
		localStorage.removeItem("messages");
		setShowLinksId(null);
		setOpenLinkBox(false);
		setShowWarning(false);
	}

    return (
        <div className="container">
			<div 
				className="clear-btn"
				onClick={() => setShowWarning(true)}
			>
				<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#e3e3e3"><path d="M480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440h80q0 117 81.5 198.5T480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Z"/></svg>
			</div>
					<div className={`modal-overlay ${showWarning ? "show" : ""}`}>
						<div className={`modal ${showWarning ? "show" : ""}`}>
							<h2>Clear Chat?</h2>
							<p>This action cannot be undone.</p>
							<div className="modal-buttons">
								<button onClick={clearChat} className="confirm-btn">Clear</button>
								<button onClick={() => setShowWarning(false)} className="cancel-btn">Cancel</button>
							</div>
						</div>
					</div>
			{messages.length === 0 && (
				<div className="welcome-container">
					<h1 className="welcome-header">This is Liquid</h1>
					<TypingEffect
						texts={[
							"How can I help you today?",
							"What questions do you have for me?",
							"Can I assist you with anything?",
							"What should I help you with?",
							"What do you need to know?"
						]}
						typingSpeed={40}
						deletingSpeed={50}
						pause={2000}
						loop={true}
						className="typing-subtitle"
						/>
				</div>
			)}
            <div className={`messages ${openLinkBox ? "links-open" : ""}`}>
                {messages.map((msg, index) => (
                    <div 
                        key={index}
						id={msg.id ? `msg-${msg.id}` : undefined}
                        className={`${msg.role === "user" ? "user" : "ai"}-msg ${msg.id === showLinksId && openLinkBox ? "active" : ""}`}
                    >
						{msg.role === "assistant" && msg.content === "Thinking..." ? (

							<div className="thinking-msg">
								{msg.content}
								<svg className="spinner" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#272727ff"><path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Z"/></svg>
							</div>
						) : (
							<ReactMarkDown>{msg.content}</ReactMarkDown>
						)}

                        {msg.role === "assistant" && msg.links?.length > 0 && (
                            <button
                                className="view-links-btn"
                                onClick={() => {
										if (openLinkBox && showLinksId === msg.id) {
											setShowLinksId(null),
											setOpenLinkBox(false)
										} else {
											setShowLinksId(msg.id);
											setOpenLinkBox(true);
										}
									}
								}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#5d5d5dff"><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>
                            </button>
                        )}

                    </div>
                ))}
            </div>
			<div className={`links-container ${showLinksId && openLinkBox ? "open" : ""}`}>
				<div className="link-box">
					<h1>Sources</h1>
					{currentLinksMsg?.links?.map((l, j) => (
						<a key={j} href={l.url} target="_blank" rel="noreferrer">
							{l.url}
						</a>
					))}
				</div>
				<div className="links-nav">
					<button
						className="prev-btn"
						onClick={handlePrev}
						disabled={navDisabled}
					>
						<svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffffff"><path d="M640-200 200-480l440-280v560Zm-80-280Zm0 134v-268L350-480l210 134Z"/></svg>
					</button>

					<button
						className="next-btn"
						onClick={handleNext}
						disabled={navDisabled}
					>
						<svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffffff"><path d="M640-200 200-480l440-280v560Zm-80-280Zm0 134v-268L350-480l210 134Z"/></svg>
					</button>
				</div>
			</div>
			
			{activeMsg && (
				<button 
					className={`arrow-btn ${openLinkBox ? "open" : ""}`}
					onClick={() => {
						if (!showLinksId) {
							setShowLinksId(activeMsg.id);
						}
						setOpenLinkBox(prev => !prev);}}
				>
					<svg xmlns="http://www.w3.org/2000/svg" height="50px" viewBox="0 -960 960 960" width="50px" fill="#3c3c3ca1"><path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/></svg>
				</button>
			)}
            <div className={`input-container ${openLinkBox ? "links-open" : ""}`}>
                <div className="input-wrapper">
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder='Ask Liquid'
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="user-input"
                    />
                    <button onClick={handleSend} className="send-btn">
						<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#ffffffff"><path d="M440-240v-368L296-464l-56-56 240-240 240 240-56 56-144-144v368h-80Z"/></svg>
					</button>
                </div>
            </div>
        </div>
    );
}