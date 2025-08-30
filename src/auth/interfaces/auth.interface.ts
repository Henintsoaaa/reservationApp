export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string;
  };
}
