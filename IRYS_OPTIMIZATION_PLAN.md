# План оптимізації Irys з використанням Mutable References

## 🎯 Мета оптимізації
Використати [Irys Mutable References](https://docs.irys.xyz/build/d/features/mutability) для:
- Зменшення кількості транзакцій на блокчейні
- Покращення швидкості завантаження чатів
- Зменшення витрат на зберігання
- Спрощення логіки версіонування

## 🔍 Поточна проблема

### Як працює зараз:
1. **Кожне оновлення чату = нова транзакція**
   - При кожному новому повідомленні створюється нова транзакція
   - Накопичується багато версій одного чату
   - GraphQL запити повертають всі версії, потрібна дедуплікація

2. **Складна логіка завантаження:**
   ```javascript
   // Поточний підхід - завантажуємо ВСІ транзакції
   const transactions = result.data?.transactions?.edges || [];
   
   // Групуємо за Chat-ID для знаходження останньої версії
   const chatTransactions = new Map<string, any>();
   for (const edge of transactions) {
     const chatIdTag = edge.node.tags.find(tag => tag.name === 'Chat-ID');
     if (!chatTransactions.has(chatId)) {
       chatTransactions.set(chatId, edge); // Тільки перша (найновіша)
     }
   }
   ```

3. **Проблеми продуктивності:**
   - Завантажуємо до 200 транзакцій за запит
   - Кожна транзакція потребує окремого HTTP запиту до gateway
   - Дедуплікація на клієнті

## 🚀 Рішення з Mutable References

### Концепція:
1. **Один чат = одна mutable reference**
2. **Оновлення чату = додавання до ланцюжка**
3. **Завантаження = один запит до `/mutable/:txId`**

### Як це працюватиме:

#### 1. Створення нового чату
```javascript
// Створюємо базову транзакцію
const baseReceipt = await irysUploader.upload(chatDataJson, { tags });
const mutableUrl = `https://gateway.irys.xyz/mutable/${baseReceipt.id}`;

// Зберігаємо baseReceipt.id як "Root-TX" для чату
chatData.rootTxId = baseReceipt.id;
```

#### 2. Оновлення існуючого чату
```javascript
// Додаємо до ланцюжка з Root-TX тегом
const updateTags = [
  ...baseTags,
  { name: "Root-TX", value: chatData.rootTxId }
];

const updateReceipt = await irysUploader.upload(updatedChatDataJson, { 
  tags: updateTags 
});

// URL залишається той самий!
// https://gateway.irys.xyz/mutable/${chatData.rootTxId}
```

#### 3. Завантаження чатів
```javascript
// Замість складного GraphQL + дедуплікації:
const chatData = await fetch(`https://gateway.irys.xyz/mutable/${rootTxId}`);
// Автоматично отримуємо найновішу версію!
```

## 📊 Переваги оптимізації

### 1. Продуктивність
- **Було:** 200 GraphQL запитів + 50 HTTP запитів до gateway
- **Стане:** 1 GraphQL запит + 50 HTTP запитів до mutable endpoints
- **Покращення:** ~75% зменшення навантаження на GraphQL

### 2. Простота коду
- Видалення логіки дедуплікації
- Спрощення GraphQL запитів
- Менше помилок з версіонуванням

### 3. Витрати
- Менше транзакцій для індексації
- Швидше синхронізація з блокчейном

## 🔧 План імплементації

### Етап 1: Модифікація save-chat API
```typescript
// src/app/api/save-chat/route.ts

interface ChatData {
  chatId: string;
  rootTxId?: string; // Новий параметр
  title: string;
  messages: Message[];
  userAddress: string;
  // ...
}

export async function POST(request: NextRequest) {
  const { chatId, rootTxId, title, messages, userAddress } = await request.json();
  
  const tags = [
    { name: "App-Name", value: "ChatAppChats" },
    { name: "Type", value: "chat-session" },
    { name: "User-Address", value: userAddress },
    { name: "Chat-ID", value: chatId },
    // Додаємо Root-TX тільки для оновлень
    ...(rootTxId ? [{ name: "Root-TX", value: rootTxId }] : [])
  ];
  
  const receipt = await irysUploader.upload(chatDataJson, { tags });
  
  return NextResponse.json({
    success: true,
    irysId: receipt.id,
    rootTxId: rootTxId || receipt.id, // Для нових чатів rootTxId = irysId
    mutableUrl: `https://gateway.irys.xyz/mutable/${rootTxId || receipt.id}`
  });
}
```

### Етап 2: Модифікація load-chats API
```typescript
// src/app/api/load-chats/route.ts

export async function GET(request: NextRequest) {
  // GraphQL запит тільки для базових транзакцій (без Root-TX тегу)
  const query = `
    query getUserChats($owner: String!) {
      transactions(
        owners: [$owner]
        tags: [
          { name: "App-Name", values: ["ChatAppChats"] }
          { name: "Type", values: ["chat-session"] }
          { name: "User-Address", values: ["${userAddress}"] }
        ]
        # Виключаємо транзакції з Root-TX (це оновлення)
        excludeTags: [
          { name: "Root-TX" }
        ]
        first: 100
      ) { ... }
    }
  `;
  
  // Завантажуємо дані через mutable endpoints
  const chats = [];
  for (const edge of transactions) {
    const rootTxId = edge.node.id;
    const chatData = await fetch(`https://gateway.irys.xyz/mutable/${rootTxId}`);
    chats.push(await chatData.json());
  }
  
  return NextResponse.json({ chats });
}
```

### Етап 3: Модифікація frontend
```typescript
// src/contexts/chat-history-context.tsx

const saveChatToIrys = async (chatData: any) => {
  const response = await fetch('/api/save-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...chatData,
      rootTxId: chatData.rootTxId // Передаємо для оновлень
    })
  });
  
  const result = await response.json();
  
  // Оновлюємо rootTxId для майбутніх оновлень
  if (!chatData.rootTxId) {
    chatData.rootTxId = result.rootTxId;
  }
};
```

## 🧪 Тестування

### Тест 1: Створення нового чату
```javascript
// test-mutable-references.js
const baseReceipt = await irysUploader.upload(chatData);
const mutableUrl = `https://gateway.irys.xyz/mutable/${baseReceipt.id}`;

// Перевіряємо що mutable URL повертає ті самі дані
const mutableData = await fetch(mutableUrl);
assert(mutableData.chatId === chatData.chatId);
```

### Тест 2: Оновлення чату
```javascript
// Додаємо нове повідомлення
chatData.messages.push(newMessage);
const updateTags = [{ name: "Root-TX", value: baseReceipt.id }];
const updateReceipt = await irysUploader.upload(chatData, { tags: updateTags });

// Перевіряємо що mutable URL тепер повертає оновлені дані
const updatedData = await fetch(mutableUrl);
assert(updatedData.messages.length === chatData.messages.length);
```

## 📈 Очікувані результати

### Метрики до оптимізації:
- Час завантаження 50 чатів: ~3-5 секунд
- Кількість HTTP запитів: ~250
- Розмір GraphQL відповіді: ~500KB

### Метрики після оптимізації:
- Час завантаження 50 чатів: ~1-2 секунди
- Кількість HTTP запитів: ~51
- Розмір GraphQL відповіді: ~50KB

### Покращення:
- **Швидкість:** 60-80% швидше
- **Трафік:** 80% менше
- **Складність коду:** 50% менше

## ⚠️ Обмеження та міркування

### 1. Безпека
- Mutable references можуть оновлювати тільки той самий wallet
- Наш серверний wallet контролює всі оновлення ✅

### 2. Час індексації
- Нові транзакції потребують часу для індексації
- Mutable endpoints оновлюються швидше за GraphQL

### 3. Зворотна сумісність
- Потрібна міграція існуючих чатів
- Можна реалізувати поступово

## 🎯 Висновок

Використання Irys Mutable References дозволить:
- Значно покращити продуктивність завантаження чатів
- Спростити архітектуру додатку
- Зменшити витрати на блокчейн транзакції
- Покращити користувацький досвід

Це ідеальне рішення для нашого use case, де чати часто оновлюються, але нам потрібна тільки остання версія.