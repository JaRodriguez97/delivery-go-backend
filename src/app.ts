import { env } from "./shared/config/env";
import { createServer } from "./shared/server";

const app = createServer();

app.listen(Number(env.PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${env.PORT}`);
});
