import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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