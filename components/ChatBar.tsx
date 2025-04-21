'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBarProps {
  currentContent: string;
  pageNumber: number;
  totalPages: number;
  chapterTitle: string;
}

export function ChatBar({ currentContent, pageNumber, totalPages, chapterTitle }: ChatBarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome! I'm your AI reading assistant. How can I help you with the book?"
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamedMessage, setCurrentStreamedMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamedMessage]);

  useEffect(() => {
    if (window) {
      // @ts-ignore
      window.handleSelectedText = handleSelectedText;
    }
  }, []);

  const handleStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    let streamedText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        // Process each line
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              if (data.done) {
                // Use the final accumulated message if available
                const finalContent = data.finalMessage || streamedText;
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: finalContent,
                }]);
                setCurrentStreamedMessage('');
                break;
              } else {
                streamedText += data.content;
                setCurrentStreamedMessage(streamedText);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading stream:', error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  };

  const handleSelectedText = (text: string) => {
    setSelectedText(text);
    if (inputRef.current) {
      const currentInput = inputRef.current.value;
      const newInput = currentInput ? `${currentInput}\n\nSelected text: "${text}"` : `Selected text: "${text}"`;
      setInput(newInput);
      inputRef.current.focus();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentStreamedMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          bookContext: `Current chapter: ${chapterTitle}
Page ${pageNumber} of ${totalPages}
Content: ${currentContent}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      await handleStreamResponse(response);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Welcome! I'm your AI reading assistant. How can I help you with the book?"
    }]);
    setCurrentStreamedMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-silver text-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-8 h-8 text-blue-600"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Main circle */}
              <circle
                cx="50"
                cy="50"
                r="48"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="white"
              />
              
              {/* Mountains - adjusted for better silhouette */}
              <path
                d="M20 75 L35 55 L45 65 L60 45 L80 75"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinejoin="round"
              />
              
              {/* Sun with larger center */}
              <circle
                cx="50"
                cy="30"
                r="12"
                fill="currentColor"
              />
              
              {/* Sun rays - made longer and more prominent */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                <line
                  key={angle}
                  x1={50 + Math.cos((angle * Math.PI) / 180) * 16}
                  y1={30 + Math.sin((angle * Math.PI) / 180) * 16}
                  x2={50 + Math.cos((angle * Math.PI) / 180) * 22}
                  y2={30 + Math.sin((angle * Math.PI) / 180) * 22}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">LibyAI</h2>
            <p className="text-sm text-gray-500">Ask questions about the book</p>
          </div>
          <button
            onClick={clearChat}
            className="ml-auto p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-start`}
          >
            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white mr-2">
              {message.role === 'user' ? 'U' : 'AI'}
            </div>
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-[#F0EFE9] text-gray-800'
                  : 'bg-white text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {currentStreamedMessage && (
          <div className="flex justify-start items-start">
            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white mr-2">
              AI
            </div>
            <div className="max-w-[80%] p-3 rounded-lg bg-white text-gray-800">
              <p className="text-sm whitespace-pre-wrap">{currentStreamedMessage}</p>
            </div>
          </div>
        )}
        {isLoading && !currentStreamedMessage && (
          <div className="flex items-center justify-center p-4">
            <div className="w-full max-w-xs">
              {/* Simpler progress bar for chat */}
              <div className="w-full h-1.5 bg-black bg-opacity-10 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-black rounded-full animate-pulse-width"></div>
              </div>
              <div className="text-black text-xs text-center">
                Processing your request...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Reply to Claude..."
            className="flex-1 p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 bg-gray-200 text-gray-800 placeholder-gray-400 border border-gray-s"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
              isLoading || !input.trim()
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
