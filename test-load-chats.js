require('dotenv').config();

// Тестування API завантаження чатів
async function testLoadChats() {
  console.log('🧪 Тестування API завантаження чатів...');
  
  const testUserAddress = '0x233c8C54F25734B744E522bdC1Eed9cbc8C97D0c';
  console.log('👤 Тестовий користувач:', testUserAddress);
  
  try {
    // Виклик API
    const response = await fetch(`http://localhost:3000/api/load-chats?userAddress=${testUserAddress}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API відповідь отримано');
    console.log('📊 Кількість чатів:', data.chats?.length || 0);
    
    if (data.chats && data.chats.length > 0) {
      console.log('📋 Знайдені чати:');
      data.chats.forEach((chat, index) => {
        console.log(`  ${index + 1}. ${chat.title} (ID: ${chat.chatId})`);
        console.log(`     Повідомлень: ${chat.messages?.length || 0}`);
        console.log(`     Оновлено: ${chat.updatedAt}`);
      });
    } else {
      console.log('❌ Чати не знайдено');
    }
    
    console.log('🎉 Тест завершено успішно!');
    
  } catch (error) {
    console.error('❌ Помилка тестування:', error.message);
  }
}

// Запуск тесту
testLoadChats();