// Simple test script for chatbot API
const { chatbotApi } = require('./dist/assets/index-f534912e.js');

async function testChatbot() {
  try {
    console.log('Testing chatbot API...');
    
    // Test session creation
    const session = await chatbotApi.createSession('test-user');
    console.log('✅ Session created:', session.sessionId);
    
    // Test message sending
    const response = await chatbotApi.sendMessage(session.sessionId, '조용한 카페 찾아줘');
    console.log('✅ Message sent, response:', response.response.text);
    
    console.log('🎉 Chatbot test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// For browser testing, just log that the component is ready
console.log('🤖 ChatBot component is ready for testing!');
console.log('📝 To test:');
console.log('1. Start the dev server: npm run dev');
console.log('2. Open the app in browser');
console.log('3. Click the chat button (💬) in bottom-right corner');
console.log('4. Try sending messages to test the mock responses');
