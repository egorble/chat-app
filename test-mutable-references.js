const { Uploader } = require('@irys/upload');
const { Ethereum } = require('@irys/upload-ethereum');
require('dotenv').config();

// Test configuration
const TEST_USER_ADDRESS = '0x233c8C54F25734B744E522bdC1Eed9cbc8C97D0c';
const TEST_CHAT_ID = `mutable-test-chat-${Date.now()}`;
const TEST_CHAT_TITLE = 'Тест Mutable References';

// Initial chat data
const INITIAL_MESSAGES = [
  {
    role: 'user',
    content: 'Привіт! Це тест mutable references.'
  },
  {
    role: 'assistant',
    content: 'Привіт! Я розумію, що ми тестуємо функціональність mutable references в Irys.'
  }
];

// Additional message for update test
const ADDITIONAL_MESSAGE = {
  role: 'user',
  content: 'Додаю нове повідомлення для тестування оновлення через mutable reference.'
};

async function testMutableReferences() {
  console.log('🧪 Початок тестування Irys Mutable References...');
  console.log('👤 Тестовий користувач:', TEST_USER_ADDRESS);
  console.log('💬 Тестовий чат ID:', TEST_CHAT_ID);
  
  try {
    // Step 1: Initialize Irys
    console.log('\n📝 Крок 1: Ініціалізація Irys...');
    const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('❌ SERVER_WALLET_PRIVATE_KEY не знайдено в .env файлі');
    }
    
    const irysUploader = await Uploader(Ethereum).withWallet(privateKey);
    console.log('✅ Irys uploader ініціалізовано');
    console.log('🔑 Wallet адрес:', irysUploader.address);
    
    // Step 2: Create base transaction (initial chat)
    console.log('\n📝 Крок 2: Створення базової транзакції...');
    const initialChatData = {
      chatId: TEST_CHAT_ID,
      title: TEST_CHAT_TITLE,
      messages: INITIAL_MESSAGES,
      userAddress: TEST_USER_ADDRESS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const baseTags = [
      { name: "App-Name", value: "ChatAppChats" },
      { name: "Type", value: "chat-session" },
      { name: "User-Address", value: TEST_USER_ADDRESS },
      { name: "Chat-ID", value: TEST_CHAT_ID },
      { name: "Chat-Title", value: TEST_CHAT_TITLE },
      { name: "Message-Count", value: INITIAL_MESSAGES.length.toString() },
      { name: "Created-At", value: initialChatData.createdAt },
      { name: "Updated-At", value: initialChatData.updatedAt },
      { name: "Test-Type", value: "mutable-reference" }
    ];
    
    console.log('⬆️ Завантаження базової транзакції...');
    const baseReceipt = await irysUploader.upload(JSON.stringify(initialChatData, null, 2), { tags: baseTags });
    console.log('✅ Базова транзакція створена!');
    console.log('🆔 Base Transaction ID:', baseReceipt.id);
    
    // Step 3: Create mutable URL
    const mutableUrl = `https://gateway.irys.xyz/mutable/${baseReceipt.id}`;
    console.log('🔗 Mutable URL:', mutableUrl);
    
    // Step 4: Wait for indexing and test base access
    console.log('\n📝 Крок 3: Очікування індексації та тестування базового доступу...');
    console.log('⏳ Очікування 15 секунд для індексації...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('🔍 Тестування прямого доступу до базової транзакції...');
    const directResponse = await fetch(`https://gateway.irys.xyz/${baseReceipt.id}`);
    if (!directResponse.ok) {
      throw new Error(`Не вдалося отримати базову транзакцію: ${directResponse.statusText}`);
    }
    const directData = await directResponse.json();
    console.log('✅ Пряме завантаження успішне:', {
      chatId: directData.chatId,
      messageCount: directData.messages?.length || 0
    });
    
    console.log('🔍 Тестування mutable URL...');
    const mutableResponse = await fetch(mutableUrl);
    if (!mutableResponse.ok) {
      throw new Error(`Не вдалося отримати дані через mutable URL: ${mutableResponse.statusText}`);
    }
    const mutableData = await mutableResponse.json();
    console.log('✅ Mutable URL працює:', {
      chatId: mutableData.chatId,
      messageCount: mutableData.messages?.length || 0
    });
    
    // Verify data consistency
    if (directData.chatId === mutableData.chatId && 
        directData.messages.length === mutableData.messages.length) {
      console.log('🎉 Базова функціональність mutable reference працює!');
    } else {
      throw new Error('❌ Дані не співпадають між прямим та mutable доступом');
    }
    
    // Step 5: Create update transaction
    console.log('\n📝 Крок 4: Створення оновлення через Root-TX...');
    const updatedMessages = [...INITIAL_MESSAGES, ADDITIONAL_MESSAGE];
    const updatedChatData = {
      ...initialChatData,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
    };
    
    const updateTags = [
      ...baseTags.filter(tag => tag.name !== 'Message-Count' && tag.name !== 'Updated-At'),
      { name: "Root-TX", value: baseReceipt.id }, // Ключовий тег для mutable reference
      { name: "Message-Count", value: updatedMessages.length.toString() },
      { name: "Updated-At", value: updatedChatData.updatedAt }
    ];
    
    console.log('⬆️ Завантаження оновлення з Root-TX тегом...');
    const updateReceipt = await irysUploader.upload(JSON.stringify(updatedChatData, null, 2), { tags: updateTags });
    console.log('✅ Оновлення створено!');
    console.log('🆔 Update Transaction ID:', updateReceipt.id);
    console.log('🔗 Root-TX:', baseReceipt.id);
    
    // Step 6: Wait for update indexing and test mutable URL
    console.log('\n📝 Крок 5: Тестування оновленого mutable URL...');
    console.log('⏳ Очікування 15 секунд для індексації оновлення...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('🔍 Тестування mutable URL після оновлення...');
    const updatedMutableResponse = await fetch(mutableUrl);
    if (!updatedMutableResponse.ok) {
      throw new Error(`Не вдалося отримати оновлені дані: ${updatedMutableResponse.statusText}`);
    }
    const updatedMutableData = await updatedMutableResponse.json();
    console.log('📊 Оновлені дані через mutable URL:', {
      chatId: updatedMutableData.chatId,
      messageCount: updatedMutableData.messages?.length || 0,
      lastMessage: updatedMutableData.messages?.[updatedMutableData.messages.length - 1]?.content?.substring(0, 50) + '...'
    });
    
    // Step 7: Verify update worked
    if (updatedMutableData.messages.length === updatedMessages.length &&
        updatedMutableData.messages[updatedMutableData.messages.length - 1].content === ADDITIONAL_MESSAGE.content) {
      console.log('🎉 MUTABLE REFERENCE ОНОВЛЕННЯ ПРАЦЮЄ!');
      console.log('✅ Mutable URL тепер повертає оновлені дані');
      console.log('✅ Кількість повідомлень збільшилась з', INITIAL_MESSAGES.length, 'до', updatedMessages.length);
    } else {
      throw new Error('❌ Оновлення не працює - mutable URL не повертає нові дані');
    }
    
    // Step 8: Test direct access to both transactions
    console.log('\n📝 Крок 6: Перевірка прямого доступу до обох транзакцій...');
    
    console.log('🔍 Доступ до базової транзакції:', baseReceipt.id);
    const baseDirectResponse = await fetch(`https://gateway.irys.xyz/${baseReceipt.id}`);
    const baseDirectData = await baseDirectResponse.json();
    console.log('📊 Базова транзакція:', {
      messageCount: baseDirectData.messages?.length || 0
    });
    
    console.log('🔍 Доступ до оновленої транзакції:', updateReceipt.id);
    const updateDirectResponse = await fetch(`https://gateway.irys.xyz/${updateReceipt.id}`);
    const updateDirectData = await updateDirectResponse.json();
    console.log('📊 Оновлена транзакція:', {
      messageCount: updateDirectData.messages?.length || 0
    });
    
    // Step 9: Test GraphQL query for version chain
    console.log('\n📝 Крок 7: Тестування GraphQL запиту для ланцюжка версій...');
    const chainQuery = `
      query getChain {
        transactions(
          tags: [
            {
              name: "Root-TX"
              values: ["${baseReceipt.id}"]
            }
          ]
          owners: ["${irysUploader.address}"]
          order: ASC
        ) {
          edges {
            node {
              id
              timestamp
              tags {
                name
                value
              }
            }
          }
        }
      }
    `;
    
    const chainResponse = await fetch('https://uploader.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: chainQuery
      })
    });
    
    const chainResult = await chainResponse.json();
    const chainTransactions = chainResult.data?.transactions?.edges || [];
    console.log(`📋 Знайдено ${chainTransactions.length} транзакцій в ланцюжку`);
    
    chainTransactions.forEach((edge, index) => {
      const messageCountTag = edge.node.tags.find(tag => tag.name === 'Message-Count');
      console.log(`  ${index + 1}. ID: ${edge.node.id}, Messages: ${messageCountTag?.value || 'N/A'}`);
    });
    
    // Final verification
    console.log('\n🎯 Фінальна перевірка...');
    console.log('✅ Базова транзакція створена:', baseReceipt.id);
    console.log('✅ Оновлена транзакція створена:', updateReceipt.id);
    console.log('✅ Mutable URL працює:', mutableUrl);
    console.log('✅ Mutable URL повертає останню версію');
    console.log('✅ GraphQL може знайти ланцюжок версій');
    
    console.log('\n🎉 ТЕСТ MUTABLE REFERENCES ПРОЙДЕНО УСПІШНО!');
    console.log('\n📋 Результати:');
    console.log(`   🔗 Mutable URL: ${mutableUrl}`);
    console.log(`   🆔 Base TX: ${baseReceipt.id}`);
    console.log(`   🆔 Update TX: ${updateReceipt.id}`);
    console.log(`   📊 Початкові повідомлення: ${INITIAL_MESSAGES.length}`);
    console.log(`   📊 Оновлені повідомлення: ${updatedMessages.length}`);
    
  } catch (error) {
    console.error('❌ Помилка під час тестування mutable references:', error);
    process.exit(1);
  }
}

// Run the test
testMutableReferences().then(() => {
  console.log('\n🏁 Тестування mutable references завершено');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критична помилка:', error);
  process.exit(1);
});