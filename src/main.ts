import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import open from 'open';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'src/public')); // CSS, JS, imagens

  app.use((req, res, next) => {
    if (req.path === '/') {
      res.sendFile(join(__dirname, '..', 'src/public', 'index.html'));
    } else {
      next();
    }
  });

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Chatbot Llama API')
    .setDescription('Chatbot Llama entregável para o PET Saúde Digital')
    .setVersion('1.0')
    .addTag('Chat')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  const url = `http://localhost:${3000}/api`;
  await app.listen(port);
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`Swagger disponível em ${url}`);
  await open(url);
}

bootstrap();
