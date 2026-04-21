declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      userProfile?: { id: string; role: 'admin' | 'accountant' | 'consultant' | 'guest' };
    }
  }
}
export {};
