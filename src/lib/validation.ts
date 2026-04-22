import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Usuário obrigatório'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const createItemSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200),
  description: z.string().optional().default(''),
  price_cents: z.number().int().positive('Preço deve ser positivo'),
  external_link: z.string().url('Link inválido').optional().or(z.literal('')),
});

export const updateItemSchema = createItemSchema.partial();

export const createContributionSchema = z.object({
  item_id: z.string().uuid().optional().nullable(),
  contributor_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  amount_cents: z
    .number()
    .int()
    .positive('Valor deve ser positivo')
    .max(100_000_00, 'Valor máximo: R$ 100.000'),
});

export const updateContributionStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  admin_notes: z.string().optional().default(''),
});
