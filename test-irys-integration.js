const { Uploader } = require('@irys/upload');
const { Ethereum } = require('@irys/upload-ethereum');
require('dotenv').config();

// Test configuration
const TEST_USER_ADDRESS = '0x233c8C54F25734B744E522bdC1Eed9cbc8C97D0c';
const TEST_CHAT_ID = `test-chat-${Date.now()}`;
const TEST_CHAT_TITLE = 'Тестовий чат для перевірки Irys';

// Mock conversation data
const TEST_MESSAGES = [
  {
    role: 'user',
    content: 'Привіт! Як справи?'
  },
  {
    role: 'assistant',
    content: 'Привіт! У мене все добре, дякую за запитання. Як у тебе справи?'
  },
  {
    role: 'user',
    content: 'Теж добре! Можеш розповісти про Irys?'
  },
  {
    role: 'assistant',
    content: 'Звичайно! Irys - це децентралізоване сховище даних, яке дозволяє зберігати дані назавжди на блокчейні. Воно використовується для постійного зберігання файлів, метаданих NFT та інших даних.'
  }
];

async function testIrysSaveAndLoad() {
  console.log('🚀 Початок тестування Irys інтеграції...');
  console.log('👤 Тестовий користувач:', TEST_USER_ADDRESS);
  console.log('💬 Тестовий чат ID:', TEST_CHAT_ID);
  
  try {
    // Step 1: Initialize Irys with server wallet
    console.log('\n📝 Крок 1: Ініціалізація Irys з серверним гаманцем...');
    const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('❌ SERVER_WALLET_PRIVATE_KEY не знайдено в .env файлі');
    }
    
    console.log('🔧 Підключення до Irys...');
    const irysUploader = await Uploader(Ethereum).withWallet(privateKey);
    console.log('✅ Irys uploader ініціалізовано');
    console.log('🔑 Wallet адрес:', irysUploader.address);
    console.log('👤 Тестовий користувач:', TEST_USER_ADDRESS);
    console.log('🤔 Чи збігаються адреси?', irysUploader.address.toLowerCase() === TEST_USER_ADDRESS.toLowerCase());
    
    // Step 2: Prepare chat data
    console.log('\n📝 Крок 2: Підготовка даних чату...');
    const chatData = {
      chatId: TEST_CHAT_ID,
      title: TEST_CHAT_TITLE,
      messages: TEST_MESSAGES,
      userAddress: TEST_USER_ADDRESS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const chatDataJson = JSON.stringify(chatData, null, 2);
    console.log('📊 Дані чату підготовлено:', {
      chatId: chatData.chatId,
      title: chatData.title,
      userAddress: chatData.userAddress,
      messageCount: chatData.messages.length,
      dataSize: chatDataJson.length
    });
    
    // Step 3: Create tags
    console.log('\n🏷️ Крок 3: Створення тегів...');
    const tags = [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'App-Name', value: 'ChatAppChats' },
      { name: 'Chat-ID', value: TEST_CHAT_ID },
      { name: 'User-Address', value: TEST_USER_ADDRESS },
      { name: 'Chat-Title', value: TEST_CHAT_TITLE },
      { name: 'Message-Count', value: TEST_MESSAGES.length.toString() },
      { name: 'Type', value: 'chat-session' },
      { name: 'Created-At', value: chatData.createdAt },
      { name: 'Updated-At', value: chatData.updatedAt }
    ];
    
    console.log('🏷️ Теги створено:', tags);
    
    // Step 4: Upload to Irys
    console.log('\n⬆️ Крок 4: Завантаження на Irys...');
    const receipt = await irysUploader.upload(chatDataJson, { tags });
    console.log('🎉 Завантаження успішне!');
    console.log('📋 Irys ID:', receipt.id);
    console.log('⏰ Timestamp:', receipt.timestamp);
    
    // Step 5: Wait a bit for indexing// Крок 5: Очікування індексації
  console.log('\n⏳ Крок 5: Очікування індексації (15 секунд)...');
  await new Promise(resolve => setTimeout(resolve, 15000));    
    // Step 6: Test GraphQL query to find the chat
    console.log('\n🔍 Крок 6: Пошук чату через GraphQL...');
    
    // Спочатку спробуємо знайти транзакцію за ID
    console.log('🔍 Пошук за Irys ID:', receipt.id);
    const directQuery = {
      query: `
        query GetTransaction($id: ID!) {
          transaction(id: $id) {
            id
            timestamp
            tags {
              name
              value
            }
          }
        }
      `,
      variables: {
        id: receipt.id
      }
    };

    console.log('📡 Виконання прямого GraphQL запиту...');
    const directResponse = await fetch('https://uploader.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(directQuery)
    });

    const directData = await directResponse.json();
    console.log('📊 Прямий GraphQL відповідь:', JSON.stringify(directData, null, 2));
    
    // Тепер спробуємо загальний пошук
    const query = `
      query getUserChats($owner: String!) {
        transactions(
          owners: [$owner]
          tags: [
            { name: "App-Name", values: ["ChatAppChats"] }
            { name: "Type", values: ["chat-session"] }
          ]
          order: DESC
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
              timestamp
            }
          }
        }
      }
    `;
    
    const variables = {
      owner: irysUploader.address // Використовуємо адресу серверного wallet'а
    };
    
    console.log('📡 Виконання загального GraphQL запиту...');
    const response = await fetch('https://uploader.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
    
    if (!response.ok) {
      throw new Error(`GraphQL запит не вдався: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('📊 Загальний GraphQL відповідь отримано');
    
    if (result.errors) {
      throw new Error(`GraphQL помилки: ${JSON.stringify(result.errors)}`);
    }
    
    const transactions = result.data?.transactions?.edges || [];
    console.log(`📋 Знайдено ${transactions.length} транзакцій чатів`);
    
    // Find our test chat
    const testChatTransaction = transactions.find(edge => {
      const chatIdTag = edge.node.tags.find(tag => tag.name === 'Chat-ID');
      return chatIdTag && chatIdTag.value === TEST_CHAT_ID;
    });
    
    if (testChatTransaction) {
      console.log('✅ Тестовий чат знайдено в GraphQL результатах!');
      console.log('🆔 Transaction ID:', testChatTransaction.node.id);
      
      // Step 7: Load chat data from gateway
      console.log('\n📥 Крок 7: Завантаження даних чату з gateway...');
      const chatResponse = await fetch(`https://gateway.irys.xyz/${testChatTransaction.node.id}`);
      
      if (!chatResponse.ok) {
        throw new Error(`Не вдалося завантажити чат: ${chatResponse.statusText}`);
      }
      
      const loadedChatData = await chatResponse.json();
      console.log('✅ Дані чату успішно завантажено!');
      console.log('📊 Завантажені дані:', {
        chatId: loadedChatData.chatId,
        title: loadedChatData.title,
        userAddress: loadedChatData.userAddress,
        messageCount: loadedChatData.messages?.length || 0
      });
      
      // Verify data integrity
      if (loadedChatData.chatId === TEST_CHAT_ID && 
          loadedChatData.userAddress === TEST_USER_ADDRESS &&
          loadedChatData.messages?.length === TEST_MESSAGES.length) {
        console.log('🎉 ТЕСТ ПРОЙДЕНО УСПІШНО!');
        console.log('✅ Всі дані збережено та завантажено правильно');
      } else {
        console.log('❌ ТЕСТ НЕ ПРОЙДЕНО - дані не співпадають');
      }
      
    } else {
      console.log('❌ Тестовий чат НЕ знайдено в GraphQL результатах');
      console.log('🔍 Доступні чати:');
      transactions.forEach((edge, index) => {
        const chatIdTag = edge.node.tags.find(tag => tag.name === 'Chat-ID');
        const titleTag = edge.node.tags.find(tag => tag.name === 'Chat-Title');
        console.log(`  ${index + 1}. ID: ${chatIdTag?.value || 'N/A'}, Title: ${titleTag?.value || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Помилка під час тестування:', error);
    process.exit(1);
  }
}

// Run the test
testIrysSaveAndLoad().then(() => {
  console.log('\n🏁 Тестування завершено');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критична помилка:', error);
  process.exit(1);
});