export class TokenChairResponseTooLargeError extends Error {
  constructor(
    readonly sourceLabel: string,
    readonly maxBytes: number,
  ) {
    super(`${sourceLabel} response exceeded ${maxBytes} bytes.`);
    this.name = "TokenChairResponseTooLargeError";
  }
}

export async function readTokenChairBoundedJson(
  response: Response,
  sourceLabel: string,
  maxBytes: number,
): Promise<unknown> {
  const text = await readTokenChairBoundedText(response, sourceLabel, maxBytes);
  return JSON.parse(text) as unknown;
}

export async function readTokenChairBoundedText(
  response: Response,
  sourceLabel: string,
  maxBytes: number,
): Promise<string> {
  const contentLength = response.headers.get("content-length");
  const declaredBytes = contentLength ? Number(contentLength) : null;

  if (
    declaredBytes !== null &&
    Number.isFinite(declaredBytes) &&
    declaredBytes > maxBytes
  ) {
    throw new TokenChairResponseTooLargeError(sourceLabel, maxBytes);
  }

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new TokenChairResponseTooLargeError(sourceLabel, maxBytes);
  }

  return text;
}

export function isTokenChairResponseTooLargeError(
  error: unknown,
): error is TokenChairResponseTooLargeError {
  return error instanceof TokenChairResponseTooLargeError;
}
