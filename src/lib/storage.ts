import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _supabase;
}

export async function uploadItemImage(
  itemId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const supabase = getSupabase();
  const path = `${itemId}.webp`;

  const { error } = await supabase.storage
    .from('item-images')
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from('item-images')
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadReceipt(
  contributionId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const supabase = getSupabase();
  const path = `${contributionId}-receipt`;

  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  return data?.signedUrl || '';
}

export async function getReceiptUrl(contributionId: string): Promise<string> {
  const supabase = getSupabase();
  const path = `${contributionId}-receipt`;
  const { data } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl || '';
}

export async function deleteItemImage(itemId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.storage.from('item-images').remove([`${itemId}.webp`]);
}

export async function deleteReceipts(contributionIds: string[]): Promise<void> {
  if (contributionIds.length === 0) return;
  const supabase = getSupabase();
  const paths = contributionIds.map((id) => `${id}-receipt`);
  await supabase.storage.from('receipts').remove(paths);
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Tipo de arquivo inválido. Use JPEG, PNG ou WebP.';
  }
  if (file.size > MAX_SIZE) {
    return 'Arquivo muito grande. Máximo 5MB.';
  }
  return null;
}
