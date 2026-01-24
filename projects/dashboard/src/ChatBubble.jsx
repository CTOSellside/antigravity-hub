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
        setMessages([...messages, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    data: {
                        prompt: input,
                        context_type: 'MOM'
                    }
                })
            });
            const result = await response.json();
            setMessages(prev => [...prev, { role: 'ai', text: result.result }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Error de conexión con mis neuronas...' }]);
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
