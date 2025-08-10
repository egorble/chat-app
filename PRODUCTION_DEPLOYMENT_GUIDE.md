# 🚀 DataChat Production Deployment Guide

Цей гайд допоможе вам розгорнути DataChat на Linux сервері з SSL сертифікатом та nginx.

## 📋 Передумови

### Сервер
- Ubuntu 20.04+ або Debian 11+
- Мінімум 2GB RAM
- Мінімум 20GB дискового простору
- Публічний IP адрес
- Доступ по SSH

### DNS налаштування
Переконайтеся, що ваш домен `datachat-ipf.xyz` вказує на IP адресу вашого сервера:
```
A record: datachat-ipf.xyz -> YOUR_SERVER_IP
A record: www.datachat-ipf.xyz -> YOUR_SERVER_IP
```

## 🛠️ Крок 1: Підготовка сервера

### Підключення до сервера
```bash
ssh your_username@your_server_ip
```

### Створення користувача (якщо потрібно)
```bash
# Якщо ви підключені як root, створіть нового користувача
sudo adduser datachat
sudo usermod -aG sudo datachat
su - datachat
```

### Оновлення системи
```bash
sudo apt update && sudo apt upgrade -y
```

## 📦 Крок 2: Клонування репозиторія

```bash
# Перейдіть в домашню директорію
cd ~

# Клонуйте репозиторій
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git datachat
cd datachat
```

## 🚀 Крок 3: Автоматичний деплоймент

### Зробіть скрипт виконуваним
```bash
chmod +x deploy.sh
```

### Запустіть скрипт деплойменту
```bash
./deploy.sh
```

Скрипт автоматично:
- Встановить Node.js 20.x
- Встановить PM2 для управління процесами
- Встановить Nginx
- Встановить Certbot для SSL
- Створить директорію додатку
- Встановить залежності
- Зібере додаток
- Налаштує PM2
- Налаштує Nginx
- Отримає SSL сертифікат
- Налаштує firewall
- Створить скрипти для бекапу та оновлення

## 🔧 Крок 4: Ручне налаштування (якщо потрібно)

### Якщо автоматичний скрипт не спрацював, виконайте кроки вручну:

#### Встановлення Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Встановлення PM2
```bash
sudo npm install -g pm2
```

#### Встановлення Nginx
```bash
sudo apt install -y nginx
```

#### Встановлення Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### Створення директорії додатку
```bash
sudo mkdir -p /var/www/datachat
sudo chown $USER:$USER /var/www/datachat
cp -r ~/datachat/* /var/www/datachat/
cd /var/www/datachat
```

#### Встановлення залежностей та збірка
```bash
npm ci --production
cp next.config.prod.ts next.config.ts
npm run build
mkdir -p logs
```

#### Налаштування PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Налаштування Nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/datachat
sudo ln -s /etc/nginx/sites-available/datachat /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

#### Отримання SSL сертифіката
```bash
sudo certbot --nginx -d datachat-ipf.xyz -d www.datachat-ipf.xyz --email egor4042007@gmail.com --agree-tos --non-interactive --redirect
```

#### Налаштування firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 🔍 Крок 5: Перевірка статусу

### Перевірка PM2
```bash
pm2 status
pm2 logs datachat-app
```

### Перевірка Nginx
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Перевірка SSL сертифіката
```bash
sudo certbot certificates
```

### Перевірка портів
```bash
sudo netstat -tlnp | grep :3003
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

## 🌐 Крок 6: Тестування

1. Відкрийте браузер та перейдіть на `https://datachat-ipf.xyz`
2. Переконайтеся, що сайт завантажується з SSL сертифікатом
3. Перевірте функціональність чату

## 🔧 Управління додатком

### Перезапуск додатку
```bash
pm2 restart datachat-app
```

### Зупинка додатку
```bash
pm2 stop datachat-app
```

### Перегляд логів
```bash
pm2 logs datachat-app
```

### Оновлення додатку
```bash
cd /var/www/datachat
./update.sh
```

### Створення бекапу
```bash
cd /var/www/datachat
./backup.sh
```

## 🔒 Безпека

### Налаштування SSH ключів (рекомендовано)
```bash
# На вашому локальному комп'ютері
ssh-keygen -t rsa -b 4096
ssh-copy-id your_username@your_server_ip
```

### Відключення паролевої аутентифікації SSH
```bash
sudo nano /etc/ssh/sshd_config
# Змініть: PasswordAuthentication no
sudo systemctl restart ssh
```

### Налаштування fail2ban
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📊 Моніторинг

### Перевірка використання ресурсів
```bash
# CPU та RAM
top
htop

# Дисковий простір
df -h

# PM2 моніторинг
pm2 monit
```

### Логи
```bash
# PM2 логи
pm2 logs

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Системні логи
sudo journalctl -u nginx -f
```

## 🆘 Вирішення проблем

### Додаток не запускається
```bash
# Перевірте логи PM2
pm2 logs datachat-app

# Перевірте порт
sudo netstat -tlnp | grep :3003

# Перезапустіть PM2
pm2 restart datachat-app
```

### SSL сертифікат не працює
```bash
# Перевірте сертифікат
sudo certbot certificates

# Оновіть сертифікат
sudo certbot renew --dry-run

# Перезапустіть Nginx
sudo systemctl restart nginx
```

### Nginx помилки
```bash
# Перевірте конфігурацію
sudo nginx -t

# Перевірте логи
sudo tail -f /var/log/nginx/error.log

# Перезапустіть Nginx
sudo systemctl restart nginx
```

## 📝 Додаткові налаштування

### Налаштування змінних середовища
Створіть файл `.env.production` в `/var/www/datachat`:
```bash
NODE_ENV=production
PORT=3003
# Додайте інші необхідні змінні
```

### Налаштування домену
Якщо ваш домен відрізняється від `datachat-ipf.xyz`, відредагуйте:
1. `nginx.conf` - змініть `server_name`
2. `deploy.sh` - змініть змінну `DOMAIN`

## 🎉 Готово!

Ваш DataChat тепер працює в продакшні на `https://datachat-ipf.xyz` з SSL сертифікатом та автоматичним управлінням процесами через PM2.

### Корисні команди для щоденного використання:
- `pm2 status` - статус додатку
- `pm2 logs` - перегляд логів
- `./update.sh` - оновлення додатку
- `./backup.sh` - створення бекапу
- `sudo systemctl status nginx` - статус Nginx
- `sudo certbot renew` - оновлення SSL сертифіката