export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000", 
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me", // 
  jwtExpiresIn: "7d", 
  dbPath: process.env.DB_PATH ?? "data/db.json",
} as const;
