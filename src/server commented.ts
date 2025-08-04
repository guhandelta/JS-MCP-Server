import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "node:fs/promises";
import { z } from "zod";

const server = new McpServer({
  name: "Guha's MCP server",
  version: "1.0.0",
  // what the server is capable of
  capabilities:  {
    resources: {},
    tools: {},
    prompts: {}
    // Samplings need not be mentioned here as that is some sent from the Server to the Client, so the client should be able to support that and not the server
  }
});

// Describe what the tool is, fo rhte AI to understand
// name of the tool | description the AI could use to understand what the tool does | Mentiond what all the diff params that will be passed in
server.tool("create-user", "Craete a new user in the DB", {
  name: z.string(),
  email: z.string(),
  address: z.string(),
  phone: z.string()
},{
  // These options are optional, all these different annotations it's because it allows me to provide  to provide extra information to AI to give the best possible chance of using these tools the best that it can. Come into our function down here. This is going to get all of our a bunch of error right now, right here.
  // Define all the annotations => To provide hints to the AI to help it know what it can and cannot do
  title: "Create User",
  // This determines how it interacts with things
  // destructiveHint ||  ||  || readOnlyHint
  readOnlyHint: false, // This tells the data that it does not read any data but manipulates, updates, inserts data
  destructiveHint: false, // It is false as this is not destructive, if it were the AI may were to prompt the user that this action will destroy the data
  idempotentHint: false, // Idempotent: Does this action cause any side effects or chage things differently when executed multiple times, in this case if the function is run multiple times even with teh same input, it will end up creating new users, so it is not Idempotent
  openWorldHint: true // openWorld: Does this program access the data outside the environment it exiists, like the web. In this case this app will interact with a fake DB that is external to the app
  
}, async (params) => { // The param type is nothing but name, email, address, phone
  // add a try catch to let the AI know that an error has occured
  try {
    const id = await createUser(params)
    return{
      content: [
        { type: 'text', text: `User ${id} created successfully` }
      ]
    }
  } catch {
    // When working with these AI, they expect a very specific response to be returned down
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
  }).then(ob => ob.default)
  
  const id = users.length+1;
  
  users.push({ id, ...user });
  
  fs.writeFile( './src/db/users.json', JSON.stringify(users, null, 2));
  return id;
}

async function  main(){

  /* To build & use an MCP server with a server- client relationship you need to specify what the actual transport protocol is going to be, and there are technically three but really only two main protocols. 

  Only the first one is going to be input output essentially that she is going to be using the standard console essentially that type of communication through a terminal. This is a great one. You have an application running locally on the same place that your actual client is running so we have a Copilot running on my computer and we have our program also running on my computer so we can use a standard PO process for this option is going to be HTTP streaming. 
  This is great if you have a web where your streaming is down to another web application, that's not connected on the same network that would be a use case for a streaming version and then technically there's another one called server sent that's deprecated so we don't need to worry about it, it was replaced by HTTPstreaming. 
  
  The code will exactly be the same no matter which transport it just depends on how your application is it local or is it going to be remote in this case this is a local application so Standard I/O will be used
  */

  const transport = new StdioServerTransport();

  // Created an MCP server adn hooked it up to a transport layer, but it doesn't do anyhting yet
  await server.connect(transport);

}

main();