import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/simple";

// 数据库连接
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

export * from "./schema/simple";
