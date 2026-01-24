import React, { useState } from 'react';
import { auth } from './firebase-config';

const ChatBubble = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', text: '¡Hola Javi! Soy La Brújula. ¿En qué te ayudo hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const API_URL = 'https://ai-service-nm65jwwkta-uc.a.run.app/chatFlow';

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        const newMessages = [...messages, userMsg]; // Immediate update for history calculation
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        // Convert local messages to Genkit History format
        const history = newMessages.slice(0, -1).map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            content: [{ text: msg.text }]
        }));

        try {
            const token = await auth.currentUser.getIdToken();
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
            const body = JSON.stringify({
                data: {
                    prompt: input,
                    context_type: 'MOM',
                    history: history // Passing context buffer
                }
            });

            // Fallback Logic
            let response;
            try {
                // Attempt 1: Direct
                response = await fetch(API_URL, { method: 'POST', headers, body });
            } catch (err) {
                console.log('Direct fetch failed, trying proxy...', err);
                // Attempt 2: CORS Proxy
                response = await fetch(`https://corsproxy.io/?${encodeURIComponent(API_URL)}`, {
                    method: 'POST',
                    headers,
                    body
                });
            }

            const result = await response.json();
            setMessages(prev => [...prev, { role: 'ai', text: result.result }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', text: 'Error de conexión (ni directo ni proxy)...' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`chat-wrapper ${isOpen ? 'open' : ''}`}>
            <button className="chat-trigger" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '✕' : '💬'}
            </button>

            {isOpen && (
                <div className="chat-window shadow-xl">
                    <div className="chat-header">
                        <h4>La Brújula AI</h4>
                        <span>Online</span>
                    </div>
                    <div className="chat-messages">
                        {messages.map((m, i) => (
                            <div key={i} className={`message ${m.role}`}>
                                {m.text}
                            </div>
                        ))}
                        {loading && <div className="message ai typing">...</div>}
                    </div>
                    <div className="chat-input-area">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Pregunta algo sobre MOM..."
                        />
                        <button onClick={handleSend}>➤</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBubble;
