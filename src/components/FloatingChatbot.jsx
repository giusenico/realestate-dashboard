// src/components/FloatingChatbot.js

import React, { useState } from 'react';
import Chatbot from './Chatbot'; // Il tuo chatbot originale
import './FloatingChatbot.css'; // Gli stili per il widget

// Icone SVG per chiarezza e per non avere dipendenze esterne
const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden="true">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden="true">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
);

const FloatingChatbot = ({ graphData }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleChat = () => {
        setIsOpen(prev => !prev);
    };

    return (
        // Questo contenitore non è strettamente necessario, ma aiuta a mantenere le cose organizzate
        <div className="floating-chatbot-root">
            {/* La finestra della chat che appare/scompare */}
            <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
                {/* 
                  Il componente Chatbot viene renderizzato solo quando la finestra è aperta.
                  Questo è efficiente perché non esegue la logica del chatbot quando non è visibile.
                */}
                {isOpen && <Chatbot graphData={graphData} />}
            </div>

            {/* Il pulsante flottante (il "pallino") */}
            <button 
                className="chat-fab" 
                onClick={toggleChat} 
                aria-label={isOpen ? "Chiudi chat" : "Apri chat"}
            >
                {isOpen ? <CloseIcon /> : <ChatIcon />}
            </button>
        </div>
    );
};

export default FloatingChatbot;