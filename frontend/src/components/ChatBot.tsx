import { useState, useRef, useEffect } from 'react';
import { api, type ChatSession } from '../api';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  recommendations?: any[];
  suggestions?: string[];
}

interface Recommendation {
  spotId: string;
  name: string;
  score: number;
  matchReasons: string[];
  location: {
    lat: number;
    lng: number;
  };
  category: string;
  rating: number;
  quietRating: number;
  description: string;
  noiseLevel?: number;
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initSession = async () => {
    if (!session) {
      try {
        const newSession = await api.chatbot.createSession();
        setSession(newSession);
        
        // Add welcome message
        setMessages([{
          id: 'welcome',
          text: '안녕하세요! 조용한 장소 추천 챗봇입니다. 어떤 곳을 찾고 계신가요?',
          isUser: false,
          timestamp: new Date(),
          suggestions: ['조용한 카페', '공부할 도서관', '휴식할 공원']
        }]);
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    }
  };

  const resetChat = () => {
    setMessages([]);
    setSession(null);
    setInputValue('');
    setIsLoading(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && !session) {
      initSession();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset chat after a short delay to allow closing animation
    setTimeout(() => {
      resetChat();
    }, 300);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !session || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: messageText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await api.chatbot.sendMessage(session.sessionId, messageText);
      
      const botMessage: Message = {
        id: response.messageId,
        text: response.response.text,
        isUser: false,
        timestamp: new Date(),
        recommendations: response.recommendations,
        suggestions: response.response.suggestions
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: '죄송합니다. 일시적인 오류가 발생했습니다.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    await sendMessage(inputValue);
    setInputValue('');
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Handle special termination suggestion
    if (suggestion === '대화 종료') {
      const goodbyeMessage: Message = {
        id: `goodbye-${Date.now()}`,
        text: '대화를 종료합니다. 이용해 주셔서 감사합니다! 👋',
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, goodbyeMessage]);
      
      // Close chat after showing goodbye message
      setTimeout(() => {
        handleClose();
      }, 2000);
      
      return;
    }
    
    await sendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderSuggestions = (suggestions: string[]) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion)}
            style={{
              padding: '4px 8px',
              backgroundColor: suggestion === '대화 종료' ? '#ffebee' : '#e3f2fd',
              color: suggestion === '대화 종료' ? '#c62828' : '#1976d2',
              border: suggestion === '대화 종료' ? '1px solid #ffcdd2' : '1px solid #bbdefb',
              borderRadius: '12px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (suggestion === '대화 종료') {
                e.currentTarget.style.backgroundColor = '#ffcdd2';
              } else {
                e.currentTarget.style.backgroundColor = '#bbdefb';
              }
            }}
            onMouseLeave={(e) => {
              if (suggestion === '대화 종료') {
                e.currentTarget.style.backgroundColor = '#ffebee';
              } else {
                e.currentTarget.style.backgroundColor = '#e3f2fd';
              }
            }}
          >
            {suggestion === '대화 종료' ? '🚪 ' + suggestion : suggestion}
          </button>
        ))}
      </div>
    );
  };

  const renderRecommendations = (recommendations: Recommendation[]) => {
    if (!recommendations || recommendations.length === 0) return null;

    return (
      <div style={{ marginTop: '12px' }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 'bold', 
          marginBottom: '8px',
          color: '#007bff'
        }}>
          🎯 추천 장소 ({recommendations.length}개)
        </div>
        {recommendations.map((rec, index) => (
          <div
            key={rec.spotId}
            style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '8px',
              fontSize: '13px'
            }}
          >
            <div style={{ 
              fontWeight: 'bold', 
              marginBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{index + 1}. {rec.name}</span>
              <span style={{ 
                backgroundColor: '#007bff',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                fontSize: '11px'
              }}>
                {Math.round(rec.score * 100)}점
              </span>
            </div>
            
            <div style={{ color: '#666', marginBottom: '6px' }}>
              📍 {rec.category} | ⭐ {rec.rating}점 | 🔇 조용함 {rec.quietRating}점
              {rec.noiseLevel && ` | 📊 ${rec.noiseLevel}dB`}
            </div>
            
            {rec.description && (
              <div style={{ 
                color: '#555', 
                fontSize: '12px', 
                marginBottom: '6px',
                fontStyle: 'italic'
              }}>
                "{rec.description}"
              </div>
            )}
            
            {rec.matchReasons && rec.matchReasons.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#007bff', marginBottom: '2px' }}>
                  추천 이유:
                </div>
                {rec.matchReasons.map((reason, idx) => (
                  <div key={idx} style={{ 
                    fontSize: '11px', 
                    color: '#666',
                    marginLeft: '8px'
                  }}>
                    • {reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Post-recommendation suggestions */}
        <div style={{ marginTop: '12px' }}>
          {renderSuggestions(['새로운 장소 찾아줘', '감사합니다', '대화 종료'])}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={handleToggle}
        className="chat-button"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,123,255,0.3)',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="chat-window"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '400px',
            height: '600px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>🤫 쉿플레이스 AI 추천</span>
            <button
              onClick={handleClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  alignSelf: message.isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: message.isUser ? '#007bff' : '#f1f3f4',
                    color: message.isUser ? 'white' : 'black',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}
                >
                  {message.text}
                </div>
                
                {/* Show suggestions if available and not user message */}
                {!message.isUser && message.suggestions && !message.recommendations && (
                  <div style={{ marginTop: '8px' }}>
                    {renderSuggestions(message.suggestions)}
                  </div>
                )}
                
                {/* Show recommendations if available */}
                {!message.isUser && message.recommendations && (
                  <div style={{ marginTop: '8px' }}>
                    {renderRecommendations(message.recommendations)}
                  </div>
                )}
                
                <div
                  style={{
                    fontSize: '11px',
                    color: '#666',
                    marginTop: '4px',
                    textAlign: message.isUser ? 'right' : 'left'
                  }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{ alignSelf: 'flex-start' }}>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#f1f3f4',
                    fontSize: '14px'
                  }}
                >
                  입력 중...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid #eee',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '20px',
                outline: 'none',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: (!inputValue.trim() || isLoading) ? 0.5 : 1
              }}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
