import jwt from 'jsonwebtoken';

export function signToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, process.env.JWT_SECRET!);
}
