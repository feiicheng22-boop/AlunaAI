FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Supaya process dianggap "aktif"
CMD ["node", "index.js"]
