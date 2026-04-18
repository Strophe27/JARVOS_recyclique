import { z } from 'zod';

function addPasswordStrengthIssues(password: string, ctx: z.RefinementCtx): void {
  if (password.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le mot de passe doit contenir au moins 8 caractères',
      path: ['newPassword'],
    });
  }
  if (!/[A-Z]/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le mot de passe doit contenir au moins une majuscule',
      path: ['newPassword'],
    });
  }
  if (!/[a-z]/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le mot de passe doit contenir au moins une minuscule',
      path: ['newPassword'],
    });
  }
  if (!/\d/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le mot de passe doit contenir au moins un chiffre',
      path: ['newPassword'],
    });
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le mot de passe doit contenir au moins un caractère spécial',
      path: ['newPassword'],
    });
  }
}

/**
 * Même ordre métier que l'ancienne validation locale : d'abord discordance des champs,
 * puis exigences de complexité (messages concaténés avec « . » comme avant).
 */
export const resetPasswordFormSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Les mots de passe ne correspondent pas',
        path: ['confirmPassword'],
      });
      return;
    }
    addPasswordStrengthIssues(data.newPassword, ctx);
  });

export function formatResetPasswordClientMessage(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join('. ');
}
