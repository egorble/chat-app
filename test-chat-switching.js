require('dotenv').config();

// Тест для перевірки, що чати не зберігаються при переключенні між ними

const testUserAddress = '0x233c8C54F25734B744E522bdC1Eed9cbc8C97D0c';

async function testChatSwitching() {
  console.log('🔄 Тестування переключення між чатами...');
  console.log('👤 Тестовий користувач:', testUserAddress);
  
  // Отримуємо початкову кількість чатів
  console.log('\n📥 Крок 1: Отримання початкової кількості чатів...');
  const initialResponse = await fetch(`http://localhost:3000/api/load-chats?userAddress=${encodeURIComponent(testUserAddress)}`);
  const initialData = await initialResponse.json();
  const initialCount = initialData.chats ? initialData.chats.length : 0;
  console.log('📊 Початкова кількість чатів:', initialCount);
  
  // Створюємо тестовий чат
  const testChatId = `switching-test-${Date.now()}`;
  console.log('\n📝 Крок 2: Створення тестового чату...');
  console.log('🆔 Тестовий чат ID:', testChatId);
  
  const testMessages = [
    { role: 'user', content: 'Тестове повідомлення для перевірки переключення' },
    { role: 'assistant', content: 'Це відповідь AI для тесту переключення чатів' }
  ];
  
  const saveResponse = await fetch('http://localhost:3000/api/save-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId: testChatId,
      title: 'Тест переключення чатів',
      messages: testMessages,
      userAddress: testUserAddress
    })
  });
  
  if (!saveResponse.ok) {
    throw new Error(`Помилка збереження чату: ${saveResponse.status}`);
  }
  
  const saveResult = await saveResponse.json();
  console.log('✅ Тестовий чат збережено!');
  console.log('📋 Irys ID:', saveResult.irysId);
  
  // Очікуємо індексації
  console.log('\n⏳ Очікування індексації (10 секунд)...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Перевіряємо, що чат з'явився
  console.log('\n📥 Крок 3: Перевірка появи нового чату...');
  const afterSaveResponse = await fetch(`http://localhost:3000/api/load-chats?userAddress=${encodeURIComponent(testUserAddress)}`);
  const afterSaveData = await afterSaveResponse.json();
  const afterSaveCount = afterSaveData.chats ? afterSaveData.chats.length : 0;
  console.log('📊 Кількість чатів після збереження:', afterSaveCount);
  
  if (afterSaveCount <= initialCount) {
    throw new Error('Новий чат не з\'явився в списку!');
  }
  
  // Симулюємо "переключення" між чатами - просто завантажуємо чати кілька разів
  console.log('\n🔄 Крок 4: Симуляція переключення між чатами (5 разів)...');
  
  for (let i = 1; i <= 5; i++) {
    console.log(`   Переключення ${i}/5...`);
    const switchResponse = await fetch(`http://localhost:3000/api/load-chats?userAddress=${encodeURIComponent(testUserAddress)}`);
    const switchData = await switchResponse.json();
    
    if (!switchResponse.ok) {
      throw new Error(`Помилка при переключенні ${i}: ${switchResponse.status}`);
    }
    
    // Невелика затримка між переключеннями
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Очікуємо ще трохи, щоб переконатися, що не відбувається автозбереження
  console.log('\n⏳ Очікування можливого автозбереження (5 секунд)...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Перевіряємо фінальну кількість чатів
  console.log('\n📥 Крок 5: Перевірка фінальної кількості чатів...');
  const finalResponse = await fetch(`http://localhost:3000/api/load-chats?userAddress=${encodeURIComponent(testUserAddress)}`);
  const finalData = await finalResponse.json();
  const finalCount = finalData.chats ? finalData.chats.length : 0;
  console.log('📊 Фінальна кількість чатів:', finalCount);
  
  // Аналізуємо результати
  const expectedCount = initialCount + 1; // Початкова кількість + 1 новий тестовий чат
  
  if (finalCount === expectedCount) {
    console.log('\n🎉 ТЕСТ ПРОЙДЕНО УСПІШНО!');
    console.log('✅ Кількість чатів не змінилася при переключенні');
    console.log(`📊 Очікувалося: ${expectedCount}, Отримано: ${finalCount}`);
  } else if (finalCount > expectedCount) {
    console.log('\n❌ ТЕСТ НЕ ПРОЙДЕНО!');
    console.log('⚠️  Виявлено додаткові чати, можливо через автозбереження при переключенні');
    console.log(`📊 Очікувалося: ${expectedCount}, Отримано: ${finalCount}`);
    console.log(`🔍 Різниця: +${finalCount - expectedCount} зайвих чатів`);
  } else {
    console.log('\n❓ НЕОЧІКУВАНИЙ РЕЗУЛЬТАТ');
    console.log('⚠️  Кількість чатів менша за очікувану');
    console.log(`📊 Очікувалося: ${expectedCount}, Отримано: ${finalCount}`);
  }
}

// Запускаємо тест
testChatSwitching().catch(error => {
  console.error('❌ Помилка тесту:', error);
  process.exit(1);
});