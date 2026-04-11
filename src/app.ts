import { env } from "./shared/config/env";
import { createServer } from "./shared/server";

const app = createServer();

app.listen(env.PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${env.PORT}`);
});
