import { useState } from 'react'
import './App.css'
import ReactMarkDown from 'react-markdown';

export default function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

	const [openLinkBox, setOpenLinkBox] = useState(false);
    const [showLinksId, setShowLinksId] = useState(null);
    

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

            // Make a second query to get source links
            const linksPrompt = `Based on your previous answer: "${apiResponseText}", provide me with a list of relevant source links and URLs that were used or would support this answer. Format each link on a new line starting with "- "`;
            
            const linksHistory = [...history, { role: "model", parts: [{ text: apiResponseText }] }, { role: "user", parts: [{ text: linksPrompt }] }];
            
            const linksRequestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: linksHistory })
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
						<ReactMarkDown>
                        	{msg.content}
						</ReactMarkDown>

                        {msg.role === "assistant" && msg.links?.length > 0 && (
                            <button
                                className="view-links-btn"
                                onClick={() => {
										setShowLinksId(showLinksId === msg.id ? null : msg.id),
										setOpenLinkBox(prev => !prev)
									}
								}
                            >
                                {showLinksId === msg.id && openLinkBox === true ? "Hide" : "View"}
                            </button>
                        )}

                        {msg.role === "assistant" && msg.links?.length > 0 && (
                            <div className={`links-container ${showLinksId === msg.id && openLinkBox ? "open" : ""}`}>
                                <div className="link-box">
									<button 
										className={openLinkBox ? "close-btn" : "open-btn"}
										onClick={() => {
											if (openLinkBox) {
												setShowLinksId(null),
												setOpenLinkBox(false)
											} else {
												setShowLinksId(msg.id),
												setOpenLinkBox(true)
											}
										}}
									>
										{openLinkBox ? (
											<svg xmlns="http://www.w3.org/2000/svg" height="50px" viewBox="0 -960 960 960" width="50px" fill="#3c3c3ca1"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg>
										) : (
											<svg xmlns="http://www.w3.org/2000/svg" height="50px" viewBox="0 -960 960 960" width="50px" fill="#3c3c3ca1"><path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/></svg>
										)}
									</button>
									
                                    {msg.links.map((l, j) => (
                                        <a key={j} href={l.url} target="_blank" rel="noreferrer">
                                            {l.url}
                                        </a>
                                    ))}
                                </div>
                            </div>
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
        </div>
    );
}