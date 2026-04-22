import { hashPassword } from '../src/lib/auth';
import { query } from '../src/lib/db';

async function seed() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('ADMIN_PASSWORD environment variable is required');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await query(
    `INSERT INTO admin (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = $2`,
    [username, passwordHash]
  );

  console.log(`✅ Admin user "${username}" seeded successfully.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
