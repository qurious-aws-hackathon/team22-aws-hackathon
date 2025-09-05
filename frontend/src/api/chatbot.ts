// Chatbot API service
const API_BASE_URL = 'https://9ml7fncvu6.execute-api.us-east-1.amazonaws.com/prod';

export interface ChatSession {
  sessionId: string;
  expiresAt: string;
  status: string;
}

export interface ChatMessage {
  messageId: string;
  response: {
    text: string;
    type: string;
    suggestions?: string[];
  };
  context: {
    extractedPreferences: Record<string, any>;
    conversationStage: string;
  };
  recommendations?: any[];
}

export const chatbotApi = {
  async createSession(userId: string = 'anonymous'): Promise<ChatSession> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  },

  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          messageType: 'text',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }
};
