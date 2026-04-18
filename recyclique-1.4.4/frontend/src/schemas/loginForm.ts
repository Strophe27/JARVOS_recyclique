import { z } from 'zod';

/** Aligné sur le contrat API `LoginRequest` : chaînes non vides après trim pour le nom d'utilisateur. */
export const loginFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Le nom d'utilisateur est requis"),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
