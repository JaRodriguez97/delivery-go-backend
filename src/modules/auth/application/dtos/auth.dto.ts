import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export type LoginDto = z.infer<typeof loginSchema>;

export interface AuthResponse {
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    role: string;
    restaurantId: string | null;
    courierId: string | null;
  };
  requiresOtp?: boolean;
  email?: string;
  etherealUrl?: string;
}

export const otpVerifySchema = z.object({
  identifier: z.string().email("Email inválido"),
  code: z.string().length(6, "El código debe tener 6 dígitos"),
});

export const otpSendSchema = z.object({
  identifier: z.string().email("Email inválido"),
});
