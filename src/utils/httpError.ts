// Ошибка с HTTP-статусом. Бросайте её из сервисов и контроллеров:
//   throw new HttpError(404, "Задача не найдена")
// middleware/error.ts превратит её в ответ со статусом 404 и телом { error: "Задача не найдена" }.

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
