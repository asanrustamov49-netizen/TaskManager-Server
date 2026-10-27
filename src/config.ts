// Настройки сервера. Каждую можно переопределить переменной окружения,
// например: PORT=5000 npm run dev. Значения справа от ?? — для разработки.

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000", // адрес фронтенда для CORS
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me", // в продакшене обязательно задать свой
  jwtExpiresIn: "7d", // сколько живёт вход
  dbPath: process.env.DB_PATH ?? "data/db.json",
} as const;
