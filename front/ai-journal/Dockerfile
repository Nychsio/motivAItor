# Obraz Node
FROM node:18-alpine

WORKDIR /app

# Kopiujemy package.json żeby zainstalować moduły
COPY package.json package-lock.json ./

# Instalujemy
RUN npm install

# Kopiujemy kod
COPY . .

# Odpalamy
CMD ["npm", "start"]