# Тест збереження чатів на Irys з серверним гаманцем

## Зміни, які були внесені:

### 1. Виправлено змінну середовища
- Змінено `SERVER_WALLET` на `SERVER_WALLET_PRIVATE_KEY` в `.env` файлі
- Тепер API route `save-chat` правильно знаходить приватний ключ серверного гаманця

### 2. Автоматичне збереження після кожної відповіді AI
- Додано новий `useEffect` в `chat-interface.tsx`
- Збереження на Irys відбувається автоматично після завершення кожної відповіді AI
- Затримка 1 секунда для забезпечення повного завершення відповіді

### 3. Теги для ідентифікації
- Серверний API додає тег `User-Address` з адресою користувача
- Додаються теги `App-Name: ChatAppChats`, `Type: chat-session`
- Кожен чат має унікальний `Chat-ID` тег

## Як тестувати:

1. **Підключити гаманець:**
   - Відкрити http://localhost:3000
   - Підключити Web3 гаманець через RainbowKit

2. **Створити новий чат:**
   - Написати повідомлення
   - Дочекатися відповіді AI
   - Перевірити консоль браузера на наявність логів збереження

3. **Перевірити збереження:**
   - Після кожної відповіді AI повинні з'являтися логи:
     - `💾 Saving chat to Irys: {chatId, title, messageCount}`
     - `✅ Chat saved to Irys successfully: {result}`

4. **Перевірити теги:**
   - Чати зберігаються з серверного гаманця
   - Додається тег з адресою користувача
   - Можна перевірити через Irys GraphQL explorer

## Очікувані результати:

✅ Чати зберігаються автоматично після кожної відповіді AI
✅ Використовується серверний гаманець з .env
✅ Додаються правильні теги з адресою користувача
✅ Збереження відбувається в фоновому режимі без блокування UI

## Структура збережених даних:

```json
{
  "chatId": "unique-chat-id",
  "title": "Chat title",
  "messages": [
    {
      "role": "user",
      "content": "User message",
      "agent": "Agent name (optional)"
    },
    {
      "role": "assistant", 
      "content": "AI response"
    }
  ],
  "userAddress": "0x...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Теги Irys:

- `Content-Type: application/json`
- `App-Name: ChatAppChats`
- `Chat-ID: {chatId}`
- `User-Address: {userAddress}`
- `Chat-Title: {title}`
- `Message-Count: {count}`
- `Type: chat-session`
- `Created-At: {timestamp}`
- `Updated-At: {timestamp}`