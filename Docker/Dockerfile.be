FROM node:18-alpine

WORKDIR /app

# Copy package.json trước để tận dụng cache của Docker
COPY API2/package*.json ./
RUN npm install

# Copy toàn bộ code Backend
COPY API2/ .

# Mở cổng 3000 giống trong file app.js
EXPOSE 3000

CMD ["node", "app.js"]