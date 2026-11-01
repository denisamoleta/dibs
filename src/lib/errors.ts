export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const notFound = (what = "This sheet") =>
  new AppError(404, "not_found", `${what} doesn't exist or was deleted.`)

export const forbidden = () =>
  new AppError(403, "forbidden", "You don't have permission to do that.")
