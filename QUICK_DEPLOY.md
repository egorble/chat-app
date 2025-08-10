# 🚀 Швидкий деплоймент DataChat

## Для швидкого деплойменту на Linux сервер:

### 1. Клонування репозиторія
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 2. Запуск автоматичного деплойменту
```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. Або через npm
```bash
npm run deploy
```

## Що робить скрипт:
- ✅ Встановлює Node.js 20.x
- ✅ Встановлює PM2
- ✅ Встановлює Nginx
- ✅ Налаштовує SSL сертифікат
- ✅ Збирає та запускає додаток на порті 3003
- ✅ Налаштовує автоматичні бекапи
- ✅ Налаштовує firewall

## Після деплойменту:
- 🌐 Сайт доступний на: `https://datachat-ipf.xyz`
- 📊 Моніторинг: `pm2 monit`
- 📝 Логи: `pm2 logs datachat-app`
- 🔄 Оновлення: `./update.sh`
- 💾 Бекап: `./backup.sh`

## Вимоги:
- Ubuntu 20.04+ / Debian 11+
- 2GB+ RAM
- Публічний IP
- DNS: `datachat-ipf.xyz` → `YOUR_SERVER_IP`

📖 **Детальний гайд:** [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)