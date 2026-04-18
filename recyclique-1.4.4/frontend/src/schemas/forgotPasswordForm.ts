import { z } from 'zod';

export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'adresse email est requise")
    .email("L'adresse email n'est pas valide"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;
