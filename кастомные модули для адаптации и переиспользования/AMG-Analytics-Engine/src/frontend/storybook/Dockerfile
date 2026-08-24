FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем Storybook
RUN npm run build-storybook

# Устанавливаем serve для раздачи статических файлов
RUN npm install -g serve

# Открываем порт
EXPOSE 6006

# Запускаем Storybook
CMD ["npm", "run", "storybook", "--", "--host", "0.0.0.0"]
