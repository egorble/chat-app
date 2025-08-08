# Рішення для видалення чатів з Irys

## 🎯 Проблема

Дані на Irys є незмінними (immutable), тому фізичне видалення неможливе. Потрібно реалізувати "м'яке видалення" (soft delete).

## 💡 Рішення: М'яке видалення

### Концепція
1. **Додати поле `isDeleted`** до структури чату
2. **Зберігати "видалений" стан** як новий запис на Irys
3. **Фільтрувати видалені чати** при завантаженні
4. **Зберігати локальний стан** для миттєвого відображення

### Переваги
- ✅ Миттєве видалення в UI
- ✅ Можливість відновлення
- ✅ Збереження історії
- ✅ Сумісність з Irys

## 🔧 Технічна реалізація

### 1. Оновлення структури даних

```typescript
interface ChatSession {
  id: string
  title: string
  createdAt: Date
  lastMessage?: string
  messages: Message[]
  isDeleted?: boolean  // Нове поле
  deletedAt?: Date     // Дата видалення
}
```

### 2. Нова функція видалення

```typescript
const deleteChatSession = useCallback(async (chatId: string) => {
  // 1. Миттєво видалити з локального стану
  setChatSessions(prev => prev.filter(chat => chat.id !== chatId))
  
  // 2. Перемкнути на інший чат якщо потрібно
  if (currentChatId === chatId) {
    const remainingChats = chatSessions.filter(chat => chat.id !== chatId)
    setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null)
  }
  
  // 3. Зберегти "видалений" стан на Irys
  if (address) {
    try {
      const deletedChat = chatSessions.find(chat => chat.id === chatId)
      if (deletedChat) {
        await saveChatToIrys(chatId, deletedChat.messages, true) // isDeleted = true
      }
    } catch (error) {
      console.error('Failed to save deletion state to Irys:', error)
    }
  }
}, [currentChatId, chatSessions, address, saveChatToIrys])
```

### 3. Оновлення API збереження

Додати підтримку поля `isDeleted` в `/api/save-chat`:

```typescript
interface ChatData {
  chatId: string
  title: string
  messages: Message[]
  userAddress: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean    // Нове поле
  deletedAt?: string     // Дата видалення
}
```

### 4. Оновлення завантаження

Фільтрувати видалені чати в `/api/load-chats`:

```typescript
// Групувати за Chat-ID та взяти найновішу версію
const latestChats = chats.filter(chat => !chat.isDeleted)
```

### 5. Додаткові теги для Irys

```typescript
const tags = [
  // ... існуючі теги
  { name: 'Is-Deleted', value: isDeleted ? 'true' : 'false' },
  { name: 'Deleted-At', value: isDeleted ? new Date().toISOString() : '' }
]
```

## 🎨 UI покращення

### Підтвердження видалення
```typescript
const handleDelete = (chatId: string) => {
  if (confirm('Ви впевнені, що хочете видалити цей чат?')) {
    deleteChatSession(chatId)
  }
}
```

### Можливість відновлення (опціонально)
- Додати розділ "Видалені чати"
- Функція відновлення через збереження з `isDeleted: false`

## 📋 План впровадження

### Крок 1: Оновити типи та інтерфейси
- [ ] Додати `isDeleted` та `deletedAt` до `ChatSession`
- [ ] Оновити `ChatData` інтерфейс

### Крок 2: Оновити API
- [ ] Модифікувати `/api/save-chat` для підтримки видалення
- [ ] Оновити `/api/load-chats` для фільтрації

### Крок 3: Оновити контекст
- [ ] Модифікувати `deleteChatSession` функцію
- [ ] Оновити `saveChatToIrys` для підтримки `isDeleted`

### Крок 4: Тестування
- [ ] Створити тест для видалення чатів
- [ ] Перевірити фільтрацію при завантаженні
- [ ] Тест відновлення (якщо реалізовано)

## 🔍 Альтернативні рішення

### 1. Локальне видалення
- Видаляти тільки з локального стану
- Не зберігати стан видалення на Irys
- ❌ Чати повернуться після перезавантаження

### 2. Приховування через теги
- Додавати тег `Hidden: true` до існуючих записів
- ❌ Неможливо через незмінність Irys

### 3. Окремий реєстр видалених
- Зберігати список видалених ID окремо
- ✅ Простіше реалізувати
- ❌ Менш надійно

## 🎯 Рекомендація

**Використовувати м'яке видалення** з збереженням стану на Irys як найбільш надійне та масштабоване рішення.

Це забезпечує:
- Миттєву реакцію UI
- Збереження цілісності даних
- Можливість відновлення
- Сумісність з децентралізованою архітектурою