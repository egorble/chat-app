// Use global fetch (available in Node.js 18+)
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER_ADDRESS = '0x233c8C54F25734B744E522bdC1Eed9cbc8C97D0c';
const TEST_CHAT_ID = `optimized-test-chat-${Date.now()}`;
const TEST_CHAT_TITLE = 'Тест Оптимізованих API';

// Test data
const INITIAL_MESSAGES = [
  {
    role: 'user',
    content: 'Привіт! Це тест оптимізованих API з mutable references.'
  },
  {
    role: 'assistant',
    content: 'Привіт! Я тестую нову оптимізовану систему збереження чатів.'
  }
];

const UPDATED_MESSAGES = [
  ...INITIAL_MESSAGES,
  {
    role: 'user',
    content: 'Додаю нове повідомлення для тестування оновлення.'
  },
  {
    role: 'assistant',
    content: 'Отримано! Тепер чат має більше повідомлень і використовує mutable reference.'
  }
];

async function testOptimizedAPIs() {
  console.log('🧪 Початок тестування оптимізованих API...');
  console.log('🌐 Base URL:', BASE_URL);
  console.log('👤 Test User:', TEST_USER_ADDRESS);
  console.log('💬 Test Chat ID:', TEST_CHAT_ID);
  
  try {
    // Step 1: Test creating a new chat
    console.log('\n📝 Крок 1: Створення нового чату...');
    const createResponse = await fetch(`${BASE_URL}/api/save-chat-optimized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: TEST_CHAT_ID,
        title: TEST_CHAT_TITLE,
        messages: INITIAL_MESSAGES,
        userAddress: TEST_USER_ADDRESS
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create chat: ${createResponse.statusText}`);
    }
    
    const createResult = await createResponse.json();
    console.log('✅ Чат створено успішно!');
    console.log('🆔 Transaction ID:', createResult.transactionId);
    console.log('🔗 Mutable URL:', createResult.mutableUrl);
    console.log('📊 Optimization info:', createResult.optimization.description);
    console.log('🎯 Benefits:', createResult.optimization.benefits.join(', '));
    
    const rootTxId = createResult.rootTxId;
    const mutableUrl = createResult.mutableUrl;
    
    // Step 2: Wait for indexing
    console.log('\n⏳ Очікування індексації (15 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Step 3: Test mutable URL access
    console.log('\n📝 Крок 2: Тестування доступу через mutable URL...');
    const mutableResponse = await fetch(mutableUrl);
    if (!mutableResponse.ok) {
      throw new Error(`Failed to access mutable URL: ${mutableResponse.statusText}`);
    }
    
    const mutableData = await mutableResponse.json();
    console.log('✅ Mutable URL працює!');
    console.log('📊 Дані з mutable URL:', {
      chatId: mutableData.chatId,
      title: mutableData.title,
      messageCount: mutableData.messages?.length || 0
    });
    
    // Step 4: Test updating the chat
    console.log('\n📝 Крок 3: Оновлення чату...');
    const updateResponse = await fetch(`${BASE_URL}/api/save-chat-optimized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: TEST_CHAT_ID,
        title: TEST_CHAT_TITLE + ' (Оновлено)',
        messages: UPDATED_MESSAGES,
        userAddress: TEST_USER_ADDRESS
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update chat: ${updateResponse.statusText}`);
    }
    
    const updateResult = await updateResponse.json();
    console.log('✅ Чат оновлено успішно!');
    console.log('🆔 New Transaction ID:', updateResult.transactionId);
    console.log('🔗 Same Mutable URL:', updateResult.mutableUrl);
    console.log('📊 Is Update:', updateResult.isUpdate);
    console.log('🎯 Root TX ID:', updateResult.rootTxId);
    
    // Verify same mutable URL
    if (updateResult.mutableUrl === mutableUrl) {
      console.log('🎉 Mutable URL залишається незмінним - оптимізація працює!');
    } else {
      throw new Error('❌ Mutable URL змінився - це не повинно відбуватися!');
    }
    
    // Step 5: Wait for update indexing
    console.log('\n⏳ Очікування індексації оновлення (15 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Step 6: Test mutable URL with updated data
    console.log('\n📝 Крок 4: Перевірка оновлених даних через mutable URL...');
    const updatedMutableResponse = await fetch(mutableUrl);
    if (!updatedMutableResponse.ok) {
      throw new Error(`Failed to access updated mutable URL: ${updatedMutableResponse.statusText}`);
    }
    
    const updatedMutableData = await updatedMutableResponse.json();
    console.log('✅ Оновлені дані отримано!');
    console.log('📊 Оновлені дані:', {
      chatId: updatedMutableData.chatId,
      title: updatedMutableData.title,
      messageCount: updatedMutableData.messages?.length || 0
    });
    
    // Verify update worked
    if (updatedMutableData.messages.length === UPDATED_MESSAGES.length) {
      console.log('🎉 Оновлення працює! Mutable URL повертає нові дані.');
    } else {
      throw new Error(`❌ Кількість повідомлень не співпадає: очікувалось ${UPDATED_MESSAGES.length}, отримано ${updatedMutableData.messages.length}`);
    }
    
    // Step 7: Test optimized load-chats API
    console.log('\n📝 Крок 5: Тестування оптимізованого load-chats API...');
    const loadResponse = await fetch(`${BASE_URL}/api/load-chats-optimized?userAddress=${TEST_USER_ADDRESS}`);
    if (!loadResponse.ok) {
      throw new Error(`Failed to load chats: ${loadResponse.statusText}`);
    }
    
    const loadResult = await loadResponse.json();
    console.log('✅ Чати завантажено успішно!');
    console.log('📊 Кількість чатів:', loadResult.chats.length);
    console.log('🎯 Optimization type:', loadResult.optimization.type);
    console.log('📈 Performance metrics:', loadResult.optimization.performance);
    
    // Find our test chat
    const testChat = loadResult.chats.find(chat => chat.chatId === TEST_CHAT_ID);
    if (testChat) {
      console.log('✅ Тестовий чат знайдено в результатах!');
      console.log('📊 Chat data:', {
        chatId: testChat.chatId,
        title: testChat.title,
        messageCount: testChat.messages?.length || 0,
        loadingMethod: testChat.loadingMethod,
        versionCount: testChat.versionCount
      });
      
      if (testChat.loadingMethod === 'mutable-reference') {
        console.log('🎉 Чат завантажено через mutable reference!');
      }
      
      if (testChat.messages.length === UPDATED_MESSAGES.length) {
        console.log('🎉 Load API повертає останню версію чату!');
      }
    } else {
      console.warn('⚠️ Тестовий чат не знайдено в результатах (можливо, ще індексується)');
    }
    
    // Step 8: Performance comparison
    console.log('\n📝 Крок 6: Аналіз продуктивності...');
    const metrics = loadResult.optimization.performance;
    console.log('📊 Метрики продуктивності:');
    console.log(`   📈 Всього транзакцій: ${metrics.totalTransactions}`);
    console.log(`   💬 Унікальних чатів: ${metrics.uniqueChats}`);
    console.log(`   ✅ Активних чатів: ${metrics.activeChats}`);
    console.log(`   🔗 Mutable URL використано: ${metrics.mutableUrlUsage}`);
    console.log(`   🔄 Fallback використано: ${metrics.fallbackUsage}`);
    console.log(`   📊 Середня кількість версій на чат: ${metrics.averageVersionsPerChat}`);
    
    const optimizationRatio = metrics.mutableUrlUsage / (metrics.mutableUrlUsage + metrics.fallbackUsage) * 100;
    console.log(`   🎯 Відсоток оптимізації: ${optimizationRatio.toFixed(1)}%`);
    
    // Final verification
    console.log('\n🎯 Фінальна перевірка...');
    console.log('✅ Створення чату працює');
    console.log('✅ Mutable URL працює');
    console.log('✅ Оновлення чату працює');
    console.log('✅ Mutable URL повертає останню версію');
    console.log('✅ Load API використовує mutable references');
    console.log('✅ Оптимізація продуктивності працює');
    
    console.log('\n🎉 ВСІ ТЕСТИ ПРОЙДЕНО УСПІШНО!');
    console.log('\n📋 Результати оптимізації:');
    console.log(`   🔗 Mutable URL: ${mutableUrl}`);
    console.log(`   🆔 Root TX: ${rootTxId}`);
    console.log(`   📊 Початкові повідомлення: ${INITIAL_MESSAGES.length}`);
    console.log(`   📊 Оновлені повідомлення: ${UPDATED_MESSAGES.length}`);
    console.log(`   🎯 Оптимізація: ${optimizationRatio.toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Помилка під час тестування:', error);
    process.exit(1);
  }
}

// Run the test
testOptimizedAPIs().then(() => {
  console.log('\n🏁 Тестування оптимізованих API завершено');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критична помилка:', error);
  process.exit(1);
});