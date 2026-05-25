import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(_req, ctx) {
    const { name } = ctx.params;
    const response = await fetch(`https://api.example.com/${name}`);
    if (!response.ok) {
      return new Response("Not Found", { status: 404 });
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  },

  async POST(req, ctx) {
    const { name } = ctx.params;
    const body = await req.json();
    const response = await fetch(`https://api.example.com/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return new Response("Not Found", { status: 404 });
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  },

  async PUT(req, ctx) {
    const { name } = ctx.params;
    const body = await req.json();
    const response = await fetch(`https://api.example.com/${name}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return new Response("Not Found", { status: 404 });
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  },

  async DELETE(_req, ctx) {
    const { name } = ctx.params;
    const response = await fetch(`https://api.example.com/${name}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response(null, { status: 204 });
  },
};
