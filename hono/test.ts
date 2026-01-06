import { Hono } from "hono";
import { describeInput } from "@spudlabs/guardis-hono";
import { validator } from "hono/validator";
import { createTypeGuard, isObject, isString } from "@spudlabs/guardis";

declare module "hono" {
  interface ContextVariableMap {
    testObj: { hello: string };
  }

  interface Bindings {
    MY_VAR: string;
  }
}

const isTestObj = isObject.extend<{ hello: string }>((v, { has }) => {
  if (typeof v === "object" && v !== null && has(v, "hello", isString)) {
    return v;
  }
  return null;
});

const app = new Hono<{ Bindings: { MY_VAR: string } }>()
  .use("/*", (c, next) => {
    c.set("testObj", { hello: "world" });

    return next();
  })
  .get(
    "/",
    describeInput("json", isTestObj),
    (c) => {
      c.env.MY_VAR;
      const valid = c.req.valid("json");

      return c.json({ hello: valid.hello });
    },
  )
  .post(
    "/transformed",
    describeInput("json", isTestObj, (input) => ({
      greeting: `Hello, ${input.hello}!`,
      timestamp: Date.now(),
    })),
    (c) => {
      const valid = c.req.valid("json");

      return c.json({ greeting: valid.greeting, timestamp: valid.timestamp });
    },
  );
