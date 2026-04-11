import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';

export function configureApp(app: INestApplication): INestApplication {
  const globalPrefix = process.env.GLOBAL_PREFIX ?? 'api';

  app.enableCors({
    origin: true,
    credentials: false,
  });
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Excel Assignment API')
    .setDescription(
      'Swagger documentation for the concurrent banking transaction backend.',
    )
    .setVersion('1.0')
    .addServer(`/${globalPrefix}`)
    .addTag('Accounts', 'Account creation and retrieval APIs')
    .addTag(
      'Transactions',
      'Concurrent-safe deposit, withdraw, and transfer APIs',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const docsDir = join(process.cwd(), 'docs');
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(
    join(docsDir, 'swagger.json'),
    JSON.stringify(swaggerDocument, null, 2),
    'utf8',
  );
  SwaggerModule.setup(`${globalPrefix}/docs`, app, swaggerDocument);

  return app;
}
