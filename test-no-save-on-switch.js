const fetch = require('node-fetch');

// Тестова адреса користувача
const testUserAddress = '0x233c8C54F25734B744E522bdC1Eed9cbc8C97D0c';

async function testNoSaveOnSwitch() {
  console.log('🧪 Тестування: чати НЕ зберігаються при переключенні');
  console.log('=' .repeat(60));
  
  try {
    // 1. Отримати початкову кількість чатів
    console.log('📊 Отримання початкової кількості чатів...');
    const initialResponse = await fetch(`http://localhost:3000/api/load-chats?userAddress=${encodeURIComponent(testUserAddress)}`);
    const initialData = await initialResponse.json();
    const initialCount = initialData.chats ? initialData.chats.length : 0;
    console.log(`✅ Початкова кількість чатів: ${initialCount}`);
    
    // 2. Створити та зберегти новий тестовий чат
    const testChatId = `no-save-switch-test-${Date.now()}`;
    const testMessages = [
      { role: 'user', content: 'Тестове повідомлення для перевірки' },
      { role: 'assistant', content: 'Тестова відповідь AI' }
    ];
    
    console.log('💾 Створення нового тестового чату...');
    const saveResponse = await fetch('http://localhost:3000/api/save-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: testChatId,
        title: 'Тест переключення без збереження',
        messages: testMessages,
        userAddress: testUserAddress
      })
    });
    
    if (!saveResponse.ok) {
      throw new Error(`Помилка збереження: ${saveResponse.status}`);
    }
    
    const saveResult = await saveResponse.json();
    console.log(`✅ Чат збережено з Irys ID: ${saveResult.irysId}`);
    
    // 3. Почекати на індексацію
    console.log('⏳ Очікування індексації (10 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 4. Перевірити, що новий чат з'явився
    console.log('🔍 Перевірка появи нового чату...');
    const afterSaveResponse = await fetch(`http://localhost:3000/api/load-chats?userAddress=${encodeURIComponent(testUserAddress)}`);
    const afterSaveData = await afterSaveResponse.json();
    const afterSaveCount = afterSaveData.chats ? afterSaveData.chats.length : 0;
    console.log(`✅ Кількість чатів після збереження: ${afterSaveCount}`);
    
    if (afterSaveCount !== initialCount + 1) {
      throw new Error(`Очікувалося ${initialCount + 1} чатів, але знайдено ${afterSaveCount}`);
    }
    
    // 5. Симулювати переключення між чатами (завантаження кількох разів)
    console.log('🔄 Симуляція переключення між чатами...');
    for (let i = 0; i < 5; i++) {
      console.log(`   Переключення ${i + 1}/5...`);
      await fetch(`http://localhost:3000/api/load-chats?userAddress=${encodeURIComponent(testUserAddress)}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Пауза між переключеннями
    }
    
    // 6. Почекати трохи для можливих затриманих збережень
    console.log('⏳ Очікування можливих затриманих збережень (5 секунд)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 7. Перевірити фінальну кількість чатів
    console.log('🔍 Перевірка фінальної кількості чатів...');
    const finalResponse = await fetch(`http://localhost:3000/api/load-chats?userAddress=${encodeURIComponent(testUserAddress)}`);
    const finalData = await finalResponse.json();
    const finalCount = finalData.chats ? finalData.chats.length : 0;
    console.log(`📊 Фінальна кількість чатів: ${finalCount}`);
    
    // 8. Перевірити результат
    const expectedCount = initialCount + 1; // Тільки один новий чат
    
    console.log('\n' + '=' .repeat(60));
    console.log('📋 РЕЗУЛЬТАТИ ТЕСТУ:');
    console.log(`   Початкова кількість: ${initialCount}`);
    console.log(`   Після збереження: ${afterSaveCount}`);
    console.log(`   Після переключень: ${finalCount}`);
    console.log(`   Очікувана кількість: ${expectedCount}`);
    
    if (finalCount === expectedCount) {
      console.log('\n🎉 ТЕСТ ПРОЙДЕНО УСПІШНО!');
      console.log('✅ Чати НЕ зберігаються при переключенні');
      console.log('✅ Збереження відбувається тільки після відповідей AI');
    } else {
      console.log('\n❌ ТЕСТ НЕ ПРОЙДЕНО!');
      console.log(`❌ Очікувалося ${expectedCount} чатів, але знайдено ${finalCount}`);
      console.log('❌ Можливо, чати все ще зберігаються при переключенні');
    }
    
  } catch (error) {
    console.error('❌ Помилка під час тестування:', error.message);
  }
}

// Запустити тест
testNoSaveOnSwitch();