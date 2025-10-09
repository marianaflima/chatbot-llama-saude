import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // app.useStaticAssets(join(__dirname, '..', 'public')); // CSS, JS, imagens

  // app.use((req, res, next) => {
  //   if (req.path === '/') {
  //     res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  //   } else {
  //     next();
  //   }
  // });

  const port = process.env.PORT || 3000;
  const url = process.env.WEB_URL || `http://localhost:${port}/`;
  const swagger = `http://localhost:${port}/api`;

  app.enableCors({
    origin: [url],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
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

  await app.listen(port);
  console.log(`Servidor rodando em ${url}`);
  console.log(`Swagger disponível em ${swagger}`);
  // await open(swagger);
}

bootstrap();
