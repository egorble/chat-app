require('dotenv').config();

// Повний тест циклу: створення -> збереження -> завантаження
async function testFullCycle() {
  console.log('🔄 Тестування повного циклу чату...');
  
  const testUserAddress = '0x233c8C54F25734B744E522bdC1Eed9cbc8C97D0c';
  const testChatId = `full-cycle-test-${Date.now()}`;
  
  console.log('👤 Тестовий користувач:', testUserAddress);
  console.log('🆔 Тестовий чат ID:', testChatId);
  
  // Крок 1: Створення тестових даних чату
  const chatData = {
    chatId: testChatId,
    title: 'Повний цикл тест',
    userAddress: testUserAddress,
    messages: [
      {
        id: '1',
        content: 'Привіт! Це тестове повідомлення.',
        role: 'user',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        content: 'Привіт! Як справи?',
        role: 'assistant',
        timestamp: new Date().toISOString()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('\n📝 Крок 1: Збереження чату через API...');
  
  try {
    // Збереження чату
    const saveResponse = await fetch('http://localhost:3000/api/save-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chatData)
    });
    
    if (!saveResponse.ok) {
      throw new Error(`Save failed! status: ${saveResponse.status}`);
    }
    
    const saveResult = await saveResponse.json();
    console.log('✅ Чат збережено успішно!');
    console.log('📋 Irys ID:', saveResult.irysId);
    
    // Очікування індексації
    console.log('\n⏳ Очікування індексації (10 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Завантаження чатів
    console.log('\n📥 Крок 2: Завантаження чатів через API...');
    
    const loadResponse = await fetch(`http://localhost:3000/api/load-chats?userAddress=${testUserAddress}`);
    
    if (!loadResponse.ok) {
      throw new Error(`Load failed! status: ${loadResponse.status}`);
    }
    
    const loadResult = await loadResponse.json();
    console.log('✅ Чати завантажено успішно!');
    console.log('📊 Загальна кількість чатів:', loadResult.chats?.length || 0);
    
    // Пошук нашого тестового чату
    const foundChat = loadResult.chats?.find(chat => chat.chatId === testChatId);
    
    if (foundChat) {
      console.log('\n🎉 ТЕСТ ПРОЙДЕНО УСПІШНО!');
      console.log('✅ Тестовий чат знайдено в завантажених даних');
      console.log('📋 Деталі знайденого чату:');
      console.log('   - ID:', foundChat.chatId);
      console.log('   - Назва:', foundChat.title);
      console.log('   - Повідомлень:', foundChat.messages?.length || 0);
      console.log('   - Користувач:', foundChat.userAddress);
      console.log('   - Irys ID:', foundChat.irysId);
    } else {
      console.log('\n❌ ТЕСТ НЕ ПРОЙДЕНО!');
      console.log('❌ Тестовий чат НЕ знайдено в завантажених даних');
      console.log('🔍 Доступні чати:');
      loadResult.chats?.slice(0, 5).forEach((chat, index) => {
        console.log(`   ${index + 1}. ${chat.title} (ID: ${chat.chatId})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Помилка тестування:', error.message);
  }
}

// Запуск тесту
testFullCycle();