<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Base de datos — PostgreSQL en AWS RDS

El backend es la **única** puerta a la BD (`omnitravel_db` en AWS RDS, con
PostGIS). Conexión con TypeORM en `src/app.module.ts` (`synchronize: false`:
las tablas ya existen y no se modifican desde el código).

Variables en `backend/.env` (plantilla en `.env.example`):

| Variable | Uso |
|---|---|
| `DATABASE_URL` | `postgresql://USUARIO:CONTRASEÑA@HOST.rds.amazonaws.com:5432/omnitravel_db` |
| `DB_SSL` | `true` para RDS |
| `JWT_SECRET` | firma de los tokens de sesión |
| `EVIDENCIAS_DIR` | carpeta de fotos (temporal hasta S3; por defecto `uploads/evidencia`) |

Migraciones SQL aditivas en `sql/` (ej. `001-reporte-es-critico.sql`).

### Endpoints

| Método | Ruta | Acceso | Uso |
|---|---|---|---|
| `POST` | `/auth/register` | público | Crear cuenta (rol viajero) → `{ token, usuario }` |
| `POST` | `/auth/login` | público | Iniciar sesión → `{ token, usuario }` |
| `GET` | `/mapa` | público | POIs, catálogo, valores, reportes y confirmaciones |
| `GET` | `/pois/:id/reporte-activo` | público | Reporte vigente del POI con su conteo |
| `POST` | `/reportes` | JWT | Crear reporte (lugar nuevo o actualización) |
| `POST` | `/reportes/:id/confirmaciones` | JWT | Confirmar; la 3.ª confirmación publica |
| `GET` | `/moderacion/reportes?estado=` | JWT moderador | Consola M03/M04 |
| `POST` | `/moderacion/reportes/:id/decision` | JWT moderador | Aprobar/rechazar con motivo (tabla `moderacion`) |
| `POST` | `/evidencias` | JWT | Subir foto `{ base64, mimeType }` (JPG/PNG/WEBP ≤ 5 MB) |
| `GET` | `/evidencias/archivo/:usuario/:archivo` | público | Leer foto |

Los errores de negocio llegan como `message: "CODIGO: mensaje"` (ej.
`AUTOCONFIRMACION: No puedes confirmar tu propio reporte.`).

### Copiar los datos desde Supabase

```bash
# en backend/.env agrega SUPABASE_DB_URL (y SUPABASE_URL para las fotos)
node --env-file=.env scripts/copiar-supabase-a-aws.mjs --simular
node --env-file=.env scripts/copiar-supabase-a-aws.mjs --reemplazar
```

## API OmniTravel — `POST /routes` (Proceso 2)

Ruteo peatonal accesible contra Valhalla. Contrato y decisiones en
`src/routing/valhalla-payload.ts`; pruebas unitarias en
`src/routing/valhalla-payload.spec.ts`.

```http
POST /routes
Content-Type: application/json

{
  "origin": [4.537, -75.675],
  "destination": [4.53389, -75.68111],
  "restrictions": {
    "perfil": "silla_de_ruedas",     // o "visual" / "peatonal"
    "avoidStairs": true,
    "requireElevator": true,
    "preferSoundTrafficLights": false
  }
}
```

Respuesta normalizada (aislada del formato Valhalla):

```json
{
  "distanciaKm": 1.24, "duracionMin": 15.4, "perfil": "silla_de_ruedas",
  "shape": "<polyline6>",
  "pasos": [{ "tipo": 10, "instruccion": "Gira a la derecha.", "distanciaKm": 0.8 }],
  "advertencias": []
}
```

- Valhalla no tiene costing `wheelchair`: se usa `costing: 'pedestrian'` con
  `costing_options.pedestrian.type` (`wheelchair` / `blind`).
- Errores: `BadRequestException` para coordenadas inválidas y
  `InternalServerErrorException` (mensaje en español) si el motor no responde.
- Variable de entorno: `VALHALLA_URL` (por defecto `http://localhost:8002`).

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

This project is already instrumented. Create a free account at [observe.nestjs.com](https://observe.nestjs.com), add an application, and paste the generated app key and secret into the `ObserveModule.forRoot()` call in `src/app.module.ts`.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
