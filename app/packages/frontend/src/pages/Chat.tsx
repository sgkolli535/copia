import React, { useState, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { chatMessagesAtom, chatLoadingAtom } from '../store/atoms';
import { api, type ChatResponse } from '../api/client';
import CalloutBox from '../components/CalloutBox';

const STARTER_PROMPTS = [
  'I am a US citizen living in London with a flat worth 1.1M GBP and a US brokerage worth 2.5M USD. My wife is Indian.',
  'What would happen if I relocated from the UK to Portugal?',
  'Explain the US-UK estate tax treaty and how it applies to my situation.',
];

export default function Chat() {
  const [messages, setMessages] = useAtom(chatMessagesAtom);
  const [loading, setLoading] = useAtom(chatLoadingAtom);
  const [input, setInput] = useState('');
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user' as const, content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setLastResponse(null);

    try {
      const response = await api.chat(updatedMessages);
      setMessages([...updatedMessages, { role: 'assistant', content: response.text }]);
      setLastResponse(response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setMessages([...updatedMessages, { role: 'assistant', content: `Error: ${errorMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const allIssues = [
    ...(lastResponse?.sanityIssues ?? []),
    ...(lastResponse?.citationIssues ?? []),
    ...(lastResponse?.confidenceIssues ?? []),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4">
        <h1 className="font-display text-3xl font-semibold text-forest-900">AI Chat</h1>
        <p className="font-serif text-forest-600">
          Describe your situation and explore estate planning scenarios.
        </p>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-thin">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-lg">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="font-sans font-semibold text-forest-700 mb-2">Start a Conversation</h3>
              <p className="font-serif text-sm text-forest-500 mb-6">
                Describe your financial situation and the AI agent will orchestrate the rule engine to analyze your cross-border estate plan.
              </p>
              <div className="space-y-2">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="block w-full text-left px-4 py-3 bg-white border border-cream-200 rounded-institutional font-serif text-sm text-forest-700 hover:bg-cream-100 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={[
                'max-w-[80%] rounded-institutional px-4 py-3',
                msg.role === 'user'
                  ? 'bg-cream-200 text-forest-900 font-sans text-sm'
                  : 'card border-l-4 border-l-forest-500 font-serif text-sm text-forest-700',
              ].join(' ')}
            >
              {msg.content.split('\n').filter(Boolean).map((p, j) => (
                <p key={j} className={j > 0 ? 'mt-2' : ''}>{p}</p>
              ))}
            </div>
          </div>
        ))}

        {/* Tool calls display */}
        {lastResponse && lastResponse.toolCalls.length > 0 && (
          <ToolCallsDisplay toolCalls={lastResponse.toolCalls} />
        )}

        {/* Guardrail warnings */}
        {allIssues.length > 0 && (
          <div className="px-2">
            <CalloutBox variant="warning" title="Guardrail Warnings">
              <ul className="list-disc list-inside space-y-1 text-xs">
                {allIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </CalloutBox>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="card border-l-4 border-l-forest-500 px-4 py-3">
              <div className="flex items-center gap-2 text-forest-400">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="font-sans text-xs">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-cream-200 pt-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your situation or ask a question..."
            rows={2}
            className="flex-1 resize-none rounded-institutional border border-cream-200 px-4 py-3 font-serif text-sm text-forest-900 placeholder-forest-300 focus:outline-none focus:border-forest-400 focus:ring-1 focus:ring-forest-400"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="self-end px-5 py-3 bg-forest-500 text-white font-sans font-medium text-sm rounded-institutional hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolCallsDisplay({ toolCalls }: { toolCalls: ChatResponse['toolCalls'] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 font-sans text-xs font-medium text-forest-500 hover:text-forest-700 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {toolCalls.length} tool call{toolCalls.length !== 1 ? 's' : ''} executed
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {toolCalls.map((tc, i) => (
            <div
              key={i}
              className="bg-cream-50 border border-cream-200 rounded-institutional px-3 py-2"
            >
              <div className="font-mono text-xs font-medium text-forest-700 mb-1">
                {tc.toolName}
              </div>
              <pre className="font-mono text-xs text-forest-500 overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(tc.result, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
