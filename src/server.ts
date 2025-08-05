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

server.resource(
  "users", // name
  "users://all", // Need to pass in a URI which is essentially a unique identifier that we can create however we want, but it must match a certain protocol. The protocol is relatively straightforward. Essentially, it's similar to a URL, but it can be referencing anything. It doesn't have to just be HTTP, for example, we could have a file:// in here, or we could even have our custom type, for example, we could say it's like a user's type(users://all) and we can have a link to all, for example. It doesn't really matter what you do. It just must match this similar format that you get with HTTP inside of a web browser URL. But it can match anything, whether it's a file, users, whatever. So, depending on your application, you may have your own standards you use, or you may create your own schemas. We're just gonna use this users protocol to start here because.That's just a custom one that we can create for our application.
  {
    description: "Get all users from DB",
    title: "Users",
    mimeType: "applicaiton/json"
  }, 
  // A function that takes the URI that is passed in
  async uri => {
    
    const users = await import("./db/users.json", {
      with: { type: 'json' }
    }).then(ob => ob.default);
    
    return{
      contents: [
        { 
          uri: uri.href, 
          text: JSON.stringify(users),
          mimeType: "applicaiton/json"
        }
      ]
    }
  }
);

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