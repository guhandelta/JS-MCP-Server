import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
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


server.resource(
  "users", // name
  "users://all", // Need to pass in a URI which is essentially a unique identifier that we can create however we want, but it must match a certain protocol. The protocol is relatively straightforward. Essentially, it's similar to a URL, but it can be referencing anything. It doesn't have to just be HTTP, for example, we could have a file:// in here, or we could even have our custom type, for example, we could say it's like a user's type(users://all) and we can have a link to all, for example. It doesn't really matter what you do. It just must match this similar format that you get with HTTP inside of a web browser URL. But it can match anything, whether it's a file, users, whatever. So, depending on your application, you may have your own standards you use, or you may create your own schemas. We're just gonna use this users protocol to start here because.That's just a custom one that we can create for our application.
  {
    description: "Get all users from DB",
    title: "Users",
    mimeType: "application/json"
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
          mimeType: "application/json"
        }
      ]
    }
  }
);

// Resource Template
server.resource(
  "user-details",
  // Instead of passing along just a single Uri, Let's make a new resource template 
  new ResourceTemplate("users://{userId}/profile", {
    list: undefined // Essentially, this list is for matching all of the resources that match this template, this is set to undefined as it's not a concern for here
  }), {
    description: "Get a user's details from DB",
    title: "User Details",
    mimeType: "application/json"
  },
  async (uri, { userId }) => {
    const users = await import("./db/users.json", {
      with: { type: 'json' }
    }).then(ob => ob.default);

    users && console.log("Users:\t", users);
    

    // The userId is a String so cast it to a string
    const user = users.find(u => u.id === parseInt(userId as string));

    if(user == null){
      return{
        contents: [
          { 
            uri: uri.href, 
            text: JSON.stringify({ error: "User not found!"}),
            mimeType: "application/json"
          }
        ]
      }
    }
    
    return{
      contents: [
        { 
          uri: uri.href, 
          text: JSON.stringify(user),
          mimeType: "application/json"
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

async function  main(){

  const transport = new StdioServerTransport();

  await server.connect(transport);

}

main();