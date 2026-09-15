import express from "express";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerAppApi } from "./appApi";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  registerAppApi(app);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe("Mind Mirror REST API", () => {
  it("reports service health", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, service: "mind-mirror-api" });
  });

  it("rejects incomplete registration without touching the database", async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", email: "", password: "" }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it("protects user data and admin routes", async () => {
    const dataResponse = await fetch(`${baseUrl}/api/data/study`);
    const adminResponse = await fetch(`${baseUrl}/api/admin/dashboard`);
    expect(dataResponse.status).toBe(401);
    expect(adminResponse.status).toBe(401);
  });
});
