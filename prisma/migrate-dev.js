const { execSync } = require('child_process');

console.log('🚀 Running Prisma migration...');
execSync('npx prisma migrate dev --name init_prod', { stdio: 'inherit' });

console.log('📦 Generating Prisma client...');
execSync('npx prisma generate', { stdio: 'inherit' });

console.log('🌱 Seeding production data...');
execSync('npx prisma db seed', { stdio: 'inherit' });

console.log('✅ Database setup complete!');





