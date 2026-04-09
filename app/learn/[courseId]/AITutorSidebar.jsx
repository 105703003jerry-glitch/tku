'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef } from 'react';

export default function AITutorSidebar({ activeLesson, viewer, courseId }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: {
      lessonId: activeLesson?.id,
      courseId,
    },
  });

  const chatScrollRef = useRef(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const userName = typeof viewer?.nickname === 'string' && viewer.nickname 
    ? viewer.nickname.split(' ')[0] 
    : (typeof viewer?.name === 'string' && viewer.name ? viewer.name.split(' ')[0] : 'there');

  return (
    <aside style={{ width: '350px', backgroundColor: '#ffffff', borderLeft: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--brand-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
          AI
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Tutor Assistant</h3>
          <span style={{ fontSize: '0.75rem', color: '#34c759', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', backgroundColor: '#34c759', borderRadius: '50%' }} /> Online
          </span>
        </div>
      </div>

      <div ref={chatScrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ width: '28px', height: '28px', backgroundColor: 'var(--brand-primary)', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem' }}>AI</div>
          <div style={{ backgroundColor: '#f2f2f7', padding: '12px 16px', borderRadius: '0px 12px 12px 12px', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            Hello {userName}! I'm your tutor for <strong>"{activeLesson?.title || 'this course'}"</strong>.
            <br />
            <br />
            You can ask me questions about this video! {viewer?.membership_tier === 'free' ? '(You have 3 free queries)' : ''}
          </div>
        </div>

        {messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', gap: '12px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            {m.role !== 'user' && (
              <div style={{ width: '28px', height: '28px', backgroundColor: 'var(--brand-primary)', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem' }}>AI</div>
            )}
            <div style={{ 
              backgroundColor: m.role === 'user' ? 'var(--brand-primary)' : '#f2f2f7', 
              color: m.role === 'user' ? 'white' : 'var(--text-primary)',
              padding: '12px 16px', 
              borderRadius: m.role === 'user' ? '12px 12px 0px 12px' : '0px 12px 12px 12px', 
              fontSize: '0.9rem', 
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 auto' }}>AI is typing...</div>
        )}
      </div>
      
      {error && (
        <div style={{ padding: '8px 20px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.85rem' }}>
          {error.message || 'Something went wrong.'}
        </div>
      )}

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)', backgroundColor: '#ffffff' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder={viewer?.membership_tier === 'free' ? "Ask a question (3 left)..." : "Ask about the video..."}
            style={{ 
              flex: 1, 
              padding: '10px 14px', 
              borderRadius: '20px', 
              border: '1px solid #d1d5db', 
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            style={{ 
              backgroundColor: 'var(--brand-primary)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '20px', 
              padding: '0 16px',
              fontWeight: 600,
              cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !input.trim()) ? 0.6 : 1
            }}
          >
            ↑
          </button>
        </form>
      </div>
    </aside>
  );
}
