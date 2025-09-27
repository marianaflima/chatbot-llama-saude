import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Chatbot Llama API')
    .setDescription('Chatbot Lllama entregável para o PET Saúde Digital')
    .setVersion('1.0')
    .addTag('Chat')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory, {
    swaggerUiEnabled: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
