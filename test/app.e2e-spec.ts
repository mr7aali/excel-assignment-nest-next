import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/common/configure-app';

@Controller()
class TestController {
  @Get()
  getHello() {
    return 'Hello World!';
  }
}

@Module({
  controllers: [TestController],
})
class TestAppModule {}

describe('App E2E', () => {
  it('serves the prefixed API route with response wrapping', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    try {
      configureApp(app);
      await app.init();

      await request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect((response) => {
          expect(response.body).toMatchObject({
            success: true,
            statusCode: 200,
            message: 'Request successful',
            path: '/api',
            data: 'Hello World!',
          });
        });
    } finally {
      await app.close();
    }
  }, 60000);
});
