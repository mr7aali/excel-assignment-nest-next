import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './common/configure-app';

async function bootstrap() {
  console.log('Bootstrapping Nest application...');
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  console.log('Nest application created. Starting listener...');
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Nest application is listening on port ${process.env.PORT ?? 3000}`);
}
bootstrap().catch((error) => {
  console.error('Failed to start Nest application', error);
  process.exit(1);
});
