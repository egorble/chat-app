# 🤖 DataChat - AI Chat Application

Потужний AI чат додаток, побудований на Next.js з підтримкою множинних AI моделей, Web3 інтеграцією та децентралізованим зберіганням через Irys.

## ✨ Особливості

- 🤖 Підтримка множинних AI моделей (OpenAI, Mistral)
- 🔗 Web3 інтеграція з RainbowKit
- 💾 Децентралізоване зберігання через Irys
- 🎨 Сучасний UI з Tailwind CSS та shadcn/ui
- 🌙 Темна/світла тема
- 📱 Повністю адаптивний дизайн
- 🔒 Безпечна аутентифікація
- ⚡ Швидка продуктивність

## 🚀 Швидкий старт

### Розробка

```bash
# Клонування репозиторія
git clone https://github.com/YOUR_USERNAME/datachat.git
cd datachat

# Встановлення залежностей
npm install

# Запуск в режимі розробки
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) у браузері.

### Продакшн деплоймент

#### 🎯 Швидкий деплоймент на Linux сервер

```bash
# Клонування на сервер
git clone https://github.com/YOUR_USERNAME/datachat.git
cd datachat

# Автоматичний деплоймент
chmod +x deploy.sh
./deploy.sh
```

**Або через npm:**
```bash
npm run deploy
```

#### 📋 Вимоги для сервера
- Ubuntu 20.04+ / Debian 11+
- 2GB+ RAM
- 20GB+ дискового простору
- Публічний IP адрес
- DNS: `datachat-ipf.xyz` → `YOUR_SERVER_IP`

#### 🔧 Що включає автоматичний деплоймент
- ✅ Node.js 20.x
- ✅ PM2 для управління процесами
- ✅ Nginx з SSL сертифікатом
- ✅ Автоматичні бекапи
- ✅ Firewall налаштування
- ✅ Моніторинг та логування

## 📚 Документація

- 📖 **[Детальний гайд деплойменту](./PRODUCTION_DEPLOYMENT_GUIDE.md)**
- 🚀 **[Швидкий деплоймент](./QUICK_DEPLOY.md)**

## 🛠️ Управління продакшн сервером

### Основні команди
```bash
# Статус додатку
pm2 status

# Перегляд логів
pm2 logs datachat-app

# Перезапуск
pm2 restart datachat-app

# Оновлення додатку
./update.sh

# Створення бекапу
./backup.sh

# Перевірка здоров'я системи
./health-check.sh
```

### Альтернатива: SystemD замість PM2
```bash
# Перехід на SystemD
sudo ./setup-systemd.sh

# Управління через SystemD
sudo systemctl start datachat
sudo systemctl stop datachat
sudo systemctl restart datachat
sudo journalctl -u datachat -f
```

## 🔧 Налаштування

### Змінні середовища
Скопіюйте `.env.example` в `.env.local` та налаштуйте:

```env
# AI API ключі
OPENAI_API_KEY=your_openai_key
MISTRAL_API_KEY=your_mistral_key

# Web3
WALLET_CONNECT_PROJECT_ID=your_project_id

# Irys
IRYS_PRIVATE_KEY=your_irys_key
```

### Продакшн налаштування
Для продакшну використовуйте `.env.production`:

```env
NODE_ENV=production
PORT=3003
NEXT_PUBLIC_APP_URL=https://datachat-ipf.xyz
```

## 🏗️ Архітектура

```
src/
├── app/                 # Next.js App Router
├── components/          # React компоненти
├── contexts/           # React контексти
├── hooks/              # Кастомні хуки
├── lib/                # Утиліти та конфігурація
├── services/           # API сервіси
├── types/              # TypeScript типи
└── utils/              # Допоміжні функції
```

## 🔒 Безпека

- 🛡️ HTTPS з автоматичним SSL сертифікатом
- 🔥 Firewall налаштування
- 🔐 Безпечні заголовки HTTP
- 🚫 Захист від XSS та CSRF
- 📝 Логування та моніторинг

## 📊 Моніторинг

### Перевірка статусу
```bash
# Загальний статус
./health-check.sh

# PM2 моніторинг
pm2 monit

# Системні ресурси
htop
df -h
```

### Логи
```bash
# Логи додатку
pm2 logs datachat-app

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Системні логи
sudo journalctl -f
```

## 🆘 Вирішення проблем

### Додаток не запускається
```bash
# Перевірка логів
pm2 logs datachat-app

# Перевірка порту
sudo netstat -tlnp | grep :3003

# Перезапуск
pm2 restart datachat-app
```

### SSL проблеми
```bash
# Перевірка сертифіката
sudo certbot certificates

# Оновлення сертифіката
sudo certbot renew

# Перезапуск Nginx
sudo systemctl restart nginx
```

## 🤝 Внесок у проект

1. Форкніть репозиторій
2. Створіть гілку для нової функції
3. Зробіть коміт змін
4. Відправте pull request

## 📄 Ліцензія

MIT License - дивіться [LICENSE](LICENSE) файл для деталей.

## 🔗 Корисні посилання

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [RainbowKit](https://www.rainbowkit.com/)
- [Irys](https://irys.xyz/)

---

**🌐 Живий сайт:** [https://datachat-ipf.xyz](https://datachat-ipf.xyz)

**📧 Підтримка:** egor4042007@gmail.com
