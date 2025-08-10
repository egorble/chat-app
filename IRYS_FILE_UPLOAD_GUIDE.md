# 📁 Гайд по завантаженню файлів на Irys

## 🚀 Швидкий старт

### 📦 Необхідні бібліотеки

```bash
# Основні Irys пакети
npm install @irys/upload @irys/upload-ethereum

# Для роботи з файлами в React
npm install react-dropzone

# Додаткові утиліти
npm install streamifier buffer
```

### ⚡ Простий приклад завантаження файлу

```javascript
// 1. Створюємо FormData з файлом
const formData = new FormData();
formData.append('file', file);

// 2. Відправляємо на сервер
const response = await fetch('/api/upload-file-temp', {
  method: 'POST',
  body: formData
});

// 3. Отримуємо Irys ID
const result = await response.json();
console.log('Файл збережено з ID:', result.file.irysId);
```

### 📥 Простий приклад завантаження файлу

```javascript
// Завантажуємо файл за Irys ID
const response = await fetch(`/api/upload-file-temp?irysId=${irysId}`);
const blob = await response.blob();

// Створюємо посилання для завантаження
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'filename.pdf';
link.click();
```

### 🎨 Простий React компонент

```tsx
import { FileUploadZone } from '@/components/ui/file-upload-zone';

function MyUploader() {
  return (
    <FileUploadZone
      onFilesUploaded={(files) => {
        files.forEach(file => {
          console.log('Завантажено:', file.name, 'ID:', file.irysId);
        });
      }}
    />
  );
}
```

## 🎯 Огляд системи

Цей проект використовує **Irys** (раніше Bundlr) для децентралізованого зберігання файлів. Система підтримує завантаження різних типів файлів з автоматичним збереженням на блокчейні та можливістю завантаження через IPFS gateway.

## 🏗️ Архітектура системи

### Основні компоненти:

1. **API Endpoints** - серверні маршрути для обробки файлів
2. **UI Components** - React компоненти для інтерфейсу
3. **Irys Manager** - утиліта для роботи з Irys
4. **Type Definitions** - TypeScript типи для файлів

## 📋 Підтримувані типи файлів

### Документи:
- **PDF** - `application/pdf`
- **DOCX** - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **XLSX** - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Текстові файли:
- **TXT** - `text/plain`
- **Markdown** - `text/markdown`
- **CSV** - `text/csv`
- **JSON** - `application/json`

### Зображення:
- **PNG** - `image/png`
- **JPEG** - `image/jpeg`
- **GIF** - `image/gif`
- **SVG** - `image/svg+xml`
- **WebP** - `image/webp`

### Обмеження:
- **Максимальний розмір файлу:** 10MB
- **Максимальна кількість файлів на агента:** 20

## 🔧 API Endpoints

### 1. `/api/upload-file-temp` - Тимчасове завантаження файлів

**Метод:** `POST`

**Параметри:**
- `file` (File) - файл для завантаження
- `description` (string, optional) - опис файлу

**Відповідь:**
```json
{
  "success": true,
  "file": {
    "id": "uuid",
    "name": "filename.pdf",
    "size": 1024,
    "type": "application/pdf",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "irysId": "irys_transaction_id",
    "description": "Опис файлу"
  }
}
```

**Теги Irys:**
```javascript
const tags = [
  { name: 'App-Name', value: 'ChatAppAgents' },
  { name: 'Type', value: 'file-attachment' },
  { name: 'File-Name', value: file.name },
  { name: 'File-Type', value: file.type },
  { name: 'File-Size', value: file.size.toString() },
  { name: 'Uploaded-At', value: new Date().toISOString() },
  { name: 'Temporary', value: 'true' }
];
```

### 2. `/api/upload-file-context` - Завантаження файлів для агентів

**Метод:** `POST`

**Параметри:**
- `file` (File) - файл для завантаження
- `agentId` (string) - ID агента
- `description` (string, optional) - опис файлу

**Відповідь:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "context.txt",
    "size": 2048,
    "type": "text/plain",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "irysId": "irys_transaction_id",
    "agentId": "agent_uuid",
    "content": "Текстовий вміст файлу"
  }
}
```

**Теги Irys:**
```javascript
const tags = [
  { name: 'App-Name', value: 'ChatAppAgents' },
  { name: 'Type', value: 'file-context' },
  { name: 'Content-Type', value: file.type },
  { name: 'File-Name', value: file.name },
  { name: 'File-Size', value: file.size.toString() },
  { name: 'Agent-Id', value: agentId },
  { name: 'Upload-Type', value: 'file-context' },
  { name: 'Uploaded-At', value: new Date().toISOString() }
];
```

### 3. Завантаження файлів - `GET` запити

**Для тимчасових файлів:**
```
GET /api/upload-file-temp?irysId=IRYS_ID
```

**Для контекстних файлів:**
```
GET /api/upload-file-context?irysId=IRYS_ID
```

## 🛠️ Irys Manager - Основні функції

### Файл: `src/utils/irys-manager.ts`

#### 1. `uploadFile()` - Завантаження файлу

```typescript
async uploadFile(buffer: Buffer, metadata: {
  name: string;
  type: string;
  size: number;
  description?: string;
  temporary?: boolean;
  agentId?: string;
}): Promise<string>
```

**Приклад використання:**
```typescript
const irysId = await irysManager.uploadFile(buffer, {
  name: 'document.pdf',
  type: 'application/pdf',
  size: 1024,
  description: 'Важливий документ',
  agentId: 'agent-123'
});
```

#### 2. `downloadFile()` - Завантаження файлу

```typescript
async downloadFile(irysId: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
}>
```

**Приклад використання:**
```typescript
const fileData = await irysManager.downloadFile('irys-id-123');
const blob = new Blob([fileData.buffer], { type: fileData.contentType });
```

#### 3. `uploadData()` - Загальне завантаження даних

```typescript
async uploadData(data: Buffer, tags: Record<string, string>): Promise<Receipt>
```

## 🎨 UI Components

### 1. `FileUploadZone` - Зона завантаження файлів

**Файл:** `src/components/ui/file-upload-zone.tsx`

**Props:**
```typescript
interface FileUploadZoneProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  agentId?: string
  maxFiles?: number
  disabled?: boolean
  className?: string
}
```

**Функціональність:**
- Drag & Drop інтерфейс
- Валідація типів файлів
- Прогрес завантаження
- Обробка помилок
- Підтримка множинного вибору

**Приклад використання:**
```tsx
<FileUploadZone
  agentId="agent-123"
  onFilesUploaded={(files) => {
    console.log('Завантажені файли:', files);
  }}
  maxFiles={10}
/>
```

### 2. `FileList` - Список файлів

**Файл:** `src/components/ui/file-list.tsx`

**Props:**
```typescript
interface FileListProps {
  files: FileAttachment[]
  onDownload?: (file: FileAttachment) => void
  onDelete?: (file: FileAttachment) => void
  showActions?: boolean
  showDownload?: boolean
}
```

### 3. `FilePreview` - Попередній перегляд файлів

**Файл:** `src/components/ui/file-preview.tsx`

**Функціональність:**
- Попередній перегляд текстових файлів
- Відображення зображень
- Завантаження файлів
- Модальне вікно

### 4. `AgentFileManager` - Менеджер файлів агента

**Файл:** `src/components/agent-file-manager.tsx`

**Функціональність:**
- Завантаження файлів для агента
- Управління файлами
- Інтеграція з контекстом агентів

## 📊 TypeScript типи

### 1. `FileAttachment` - Основний тип файлу

```typescript
export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  content?: string // Для текстових файлів
  irysId?: string
  uploadedAt: Date
  lastModified?: Date
  description?: string
}
```

### 2. `UploadedFile` - Завантажений файл

```typescript
export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  irysId?: string
  url?: string
}
```

### 3. `FileUploadProgress` - Прогрес завантаження

```typescript
export interface FileUploadProgress {
  fileId: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}
```

## 🔐 Конфігурація та безпека

### Змінні середовища

```env
# Приватний ключ серверного гаманця для Irys
SERVER_WALLET_PRIVATE_KEY=your_private_key_here
```

### Ініціалізація Irys

```typescript
import { Uploader } from '@irys/upload'
import { Ethereum } from '@irys/upload-ethereum'

const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
const irysUploader = await Uploader(Ethereum).withWallet(privateKey);
```

## 🚀 Приклади використання

### 1. Завантаження файлу через API

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('description', 'Опис файлу');

const response = await fetch('/api/upload-file-temp', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Irys ID:', result.file.irysId);
}
```

### 2. Завантаження файлу з Irys

```javascript
const response = await fetch(`/api/upload-file-temp?irysId=${irysId}`);
const blob = await response.blob();

// Створення посилання для завантаження
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'filename.pdf';
a.click();
```

### 3. Використання в React компоненті

```tsx
function MyComponent() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const handleFilesUploaded = (uploadedFiles: UploadedFile[]) => {
    setFiles(prev => [...prev, ...uploadedFiles]);
  };

  return (
    <div>
      <FileUploadZone onFilesUploaded={handleFilesUploaded} />
      <FileList 
        files={files} 
        onDownload={(file) => {
          // Логіка завантаження
        }}
      />
    </div>
  );
}
```

## 🔍 Відстеження та логування

### Консольні логи

```
🔑 Irys uploader initialized for file upload
⬆️ Starting upload to Irys...
🎉 File upload successful! Irys ID: ABC123...
📥 Downloading file from Irys ID: ABC123...
✅ File downloaded successfully, size: 1024
```

### Обробка помилок

```typescript
try {
  const irysId = await irysManager.uploadFile(buffer, metadata);
} catch (error) {
  console.error('❌ Error uploading file to Irys:', error);
  // Обробка помилки
}
```

## 📈 Оптимізація та продуктивність

### 1. Валідація файлів
- Перевірка розміру файлу (макс. 10MB)
- Валідація типу файлу
- Перевірка кількості файлів

### 2. Прогрес завантаження
- Візуальний індикатор прогресу
- Можливість скасування
- Обробка помилок

### 3. Кешування
- Збереження метаданих файлів
- Локальне кешування для швидкого доступу

## 🧪 Тестування

### Тестові файли:
- `test-irys-integration.js` - Базовий тест інтеграції
- `test-load-chats.js` - Тест завантаження чатів
- `test-full-cycle.js` - Повний цикл тестування

### Приклад тесту:

```javascript
// Тест завантаження файлу
const testFile = new File(['Hello World'], 'test.txt', {
  type: 'text/plain'
});

const formData = new FormData();
formData.append('file', testFile);

const response = await fetch('/api/upload-file-temp', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('✅ Test passed:', result.success);
```

## 🔗 Корисні посилання

- **Irys Documentation:** https://docs.irys.xyz/
- **Irys Gateway:** https://gateway.irys.xyz/
- **React Dropzone:** https://react-dropzone.js.org/
- **Next.js API Routes:** https://nextjs.org/docs/api-routes/introduction

## 📝 Висновок

Система завантаження файлів на Irys у цьому проекті забезпечує:

✅ **Децентралізоване зберігання** - файли зберігаються назавжди на блокчейні
✅ **Безпечність** - використання приватних ключів та валідації
✅ **Зручність** - інтуїтивний drag & drop інтерфейс
✅ **Продуктивність** - оптимізовані API та кешування
✅ **Масштабованість** - підтримка різних типів файлів та агентів

Система готова до продакшену та може бути легко розширена для додаткових потреб.