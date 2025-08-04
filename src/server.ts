import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "node:fs/promises";
import { z } from "zod";

const server = new McpServer({
  name: "Guha's MCP server",
  version: "1.0.0",
  capabilities:  {
    resources: {},
    tools: {},
    prompts: {}
  }
});

server.tool("create-user", "Create a new user in the DB", {
  name: z.string(),
  email: z.string(),
  address: z.string(),
  phone: z.string()
},{
  title: "Create User",
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false, 
  openWorldHint: true
}, async (params) => { 
  try {
    const id = await createUser(params)
    return{
      content: [
        { type: 'text', text: `User ${id} created successfully` }
      ]
    }
  } catch {
    return{
      content: [
        { type: 'text', text: 'Failed to create the user' }
      ]
    }
  }
});

async function  createUser(user:{
  name: string;
  email: string;
  address: string;
  phone: string;
}){

  const users = await import("./db/users.json", {
    with: { type: 'json' }
  }).then(ob => ob.default);

  const id = users.length+1;

  users.push({ id, ...user });

  fs.writeFile( './src/db/users.json', JSON.stringify(users, null, 2));
  return id;
}

async function  main(){

  const transport = new StdioServerTransport();

  await server.connect(transport);

}

main();