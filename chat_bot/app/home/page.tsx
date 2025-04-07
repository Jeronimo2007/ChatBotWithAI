'use client';
import { useEffect, useRef, useState } from 'react';

type Message = {
  from: 'me' | 'ia';
  text: string;
};

export default function Chat() {
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const streamingTextRef = useRef('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect for messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  useEffect(() => {
    socketRef.current = new WebSocket('ws://localhost:8000/ws');

    socketRef.current.onmessage = (event) => {
      const token = event.data;
      console.log('Received token:', JSON.stringify(token));

      if (token === '__END__') {
        console.log('Received __END__ marker');
        console.log('Current streamingText before finalizing (from ref):', streamingTextRef.current);
        if (streamingTextRef.current.trim() !== '') {
          const finalMessage = streamingTextRef.current;
          setMessages((prev) => {
            const updated = [...prev, { from: 'ia', text: finalMessage } as Message];
            console.log('Adding IA message to messages:', finalMessage);
            console.log('Updated messages:', updated);
            return updated;
          });
        } else {
          console.log('streamingText empty, not adding IA message');
        }
        setStreamingText('');
        streamingTextRef.current = '';
      } else if (token.trim() !== '') {
        console.log('Appending token to streamingText');
        setStreamingText((prev) => {
          const updated = prev + token;
          streamingTextRef.current = updated;
          console.log('Updated streamingText:', updated);
          return updated;
        });
      } else {
        console.log('Received empty or whitespace token, ignoring');
      }
    };

    socketRef.current.onclose = () => {
      console.log('WebSocket cerrado');
    };

    return () => {
      socketRef.current?.close();
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;

    
    setMessages((prev) => [...prev, { from: 'me', text: input }]);
    setStreamingText(''); 
    socketRef.current.send(input); 
    setInput('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div ref={chatContainerRef} className="border rounded p-4 h-200 overflow-y-auto bg-white shadow">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 ${msg.from === 'me' ? 'text-right' : 'text-left'}`}>
            <span className="inline-block px-3 py-1 bg-black rounded">
              <strong>{msg.from === 'me' ? 'Tú' : 'IA'}:</strong> {msg.text}
            </span>
          </div>
        ))}

        
        {streamingText && (
          <div className="text-left text-white bg-black rounded p-2 mt-2">
            <strong>IA:</strong> {streamingText}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="border p-2 rounded flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe algo..."
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={sendMessage}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
