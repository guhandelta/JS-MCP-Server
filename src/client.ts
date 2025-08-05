import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { confirm, input, select } from "@inquirer/prompts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CreateMessageRequestSchema, Prompt, PromptMessage, Tool } from "@modelcontextprotocol/sdk/types.js";
import { generateText, jsonSchema, ToolSet } from "ai";
import "dotenv/config"

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY
});

const mcp = new Client(
    {
        name: "test-video-client",
        version: "1.0.0",
    },
    {
        capabilities: {
            sampling: {}
        }
    }
);

const transportProtocol = new StdioClientTransport({
    command: "node",
    args: ["dist/server.js"],
    stderr: "ignore" // Just to prevent throwing any errors on the console for using some NodeJS's experimental features(importing users.json dynamically)
});

async function main() {
  await mcp.connect(transportProtocol);
  const [{ tools }, { prompts }, { resources }, { resourceTemplates }] = await Promise.all([
    mcp.listTools(),
    mcp.listPrompts(),
    mcp.listResources(),
    mcp.listResourceTemplates()
  ])

  // Sampling
  mcp.setRequestHandler(CreateMessageRequestSchema, async request => {
     const texts: string[] = [];
     for (const message of request.params.messages){
        const text = await handleServerMessagePrompt(message);
        if(text !== null) texts.push(text);
     }

     return{
        role: "user",
        model: "gemini-2.0-flash",
        stopReason: 'endTurn',
        content: {
            type: "text",
            text: texts.join("\n"),
        }
     }
  })

  console.log("You are conneced!!");

  while(true){
    const options = await select({
        message: "What would you like to do?",
        choices: ["Query", "Tools", "Resourcs", "Prompts"]
    });

    switch(options){
        case "Tools":
            const toolName = await select({
                message: "Select a tool",
                choices: tools.map(tool => ({
                    name: tool.annotations?.title || tool.name,
                    value: tool.name,
                    description: tool.description,
                })),
            });
            const tool = tools.find(t => t.name === toolName);
            if(tool == null){
                console.error("Tool not found");
            } else {
                await handleTool(tool);
            }
        break;
        
        case "Resources":
            const resourceUri = await select({
                message: "Select a resource",
                choices: [
                    ...resources.map(resource => ({
                        name: resource.name,
                        value: resource.ur,
                        description: resource.description,
                    })),
                    ...resourceTemplates.map(template => ({
                        name: template.name,
                        value: template.uriTemplate,
                        description: template.description,
                    })),
                ] 
            });
            const uri = resources.find(r => r.uri === resourceUri) ??
            resourceTemplates.find(r => r.uriTemplate === resourceUri)?.uriTemplate;
            if(uri == null){
                console.error("resource not found");
            } else {
                await handleResource(uri);
            }
        break;
        
        case "Prompts":
            const promptName = await select({
                message: "Select a prompt",
                choices: prompts.map(prompt => ({
                        name: prompt.name,
                        value: prompt.name,
                        description: prompt.description,
                    }))
            });
            const prompt = resources.find(p => p.name === promptName);
            if(prompt == null){
                console.error("prompt not found");
            } else {
                await handlePrompt(prompt);
            }
        break;

        case "Query":
            await handleQuery(tools);
        break;
    }
  }
};

async function handleTool(tool:Tool) {
    const args: Record<string, string> = {};
    // So, essentially, if there are parameters, loop through each one of those and which will a value as well as a key for all the different information that we need. Now looking at this properties object, it is clear that, it has an unknown type, it doesn't really know what those properties are supposed to be, but the properties will specifically have a type keyword on them that can be worked off with.

    // looping through every single one of the parameters that I defined on my server. It's asking the user to give their input for the name of the parameter and it tells them the types. That way they know what the type of that parameter is as well.
    for(const [key, value] of Object.entries(tool.inputSchema.properties ?? {})){
        args[key] = await input({
            // value.type will give an error as it will be unknown, so cast all the values as a string
            message: `Enter a value for ${key} (${(value as {type: string}).type})`
        })
    }

    const res = await mcp.callTool({
        name: tool.name,
        arguments: args
    });

    // Now in this case, again, this returns an unknown type, the workaround for that is by casting that directly because we don't really care about the TypeScript errors. So we know that this is going to return to us an array and that array is going to have a text which is a string inside of it. Then we just want to make sure we get the first property of that and we.To get the text portion.
    console.log((res.content as [{text: string}])[0].text);
    
}

async function handleResource(uri:string) {
    // Need to get the final, because our Uri could have dynamic parameters that need to be replaced.
    let finalUri = uri;
    // Regex to match the text between the {***}
    const paramMatches = uri.match(/{([^}]+)/g);

    if(paramMatches !== null){
        for(const paramMatch of paramMatches){
            // Replace the { and } with empty spaces to get the param name, as in the choices array ln:39
            const paramName = paramMatch.replace('{', '').replace('}', '')
            const paramValue = await input({
                // value.type will give an error as it will be unknown, so cast all the values as a string
                message: `Enter a value for ${paramName}: \t`
            })
            // Replacing the dynamic param with whatever the user types in
            finalUri = finalUri.replace(paramMatch, paramValue);
        }
    }

    const res = await mcp.readResource({
        uri: finalUri
    });

    // Now the reason for converting it from a string to an object and back to a string is because the data returned is essentially the minimized version as a string.
    console.log(JSON.stringify(res.contents[0].text as string, null, 2));
    
}

async function handlePrompt(prompt: Prompt){
    const args: Record<string, string> = {};
    for(const arg of prompt.arguments ?? []){
        args[arg.name] = await input({
            message: `Enter a value for ${arg.name}: \t`
        })
    }

    // this response could be multiple different messages. But the important thing is it need to be made sure that this prompt is used inside of the AI chat bot
    const res = await mcp.getPrompt({
        name: prompt.name,
        arguments: args
    });

    for(const message of res.messages){
        console.log(await handleServerMessagePrompt(message));
    }

}
async function handleServerMessagePrompt(message: PromptMessage){
    // When the type is not text, ignore it completely as we're only supporting text in this particular use case, because it doesn't make sense to render like images and so on inside of our application. 
    if(message.content.type !== 'text') return

    console.log(message.content.text);
    // Ask the user if they want to use this prompt using the confirm()
    const run = await confirm({
        message: "Would you like to run the prompt",
        default: true
    });
    
    if(!run) return;

    const { text } = await generateText({
        model: google("gemini-2.0-flash"),
        prompt: message.content.text
    });
}

async function handleQuery(tools:Tool[]) {
    const query = await input({ message: "Enter your query" });
    
    // So now we're getting not only text, but we're also possibly getting tool results back. The reason for that is because if we told the AI, hey, create me a brand new user with this name, e-mail address and phone number, it'll say, oh, I have a tool for that. I'm going to call that tool, call this execute function, and I'm going to give you what the result of that tool is, which in our case is like user created with ID 7 and so on. 
    const { text, toolResults } = await generateText({
        model: google("gemini-2.0-flash"),
        prompt: query,
        // Reformat the tools into proper format, from an Arr[Obj]
        tools: tools.reduce((obj, tool) => ({
            ...obj,
            [tool.name]: {
                description: tool.description,
                // It comes in JSON Schema already, but it needs to be formatted using this jsonSchema() from the AI library to actually make it work
                parameters: jsonSchema(tool.inputSchema),
                // If the user wants to call a tool, just call this function right here and return that information to the user by calling tool and returning whatever the result is.
                execute: async (args: Record<string, any>) => {
                    return await mcp.callTool({
                        name: tool.name,
                        arguments: args
                    })
                }
            }
        }), {} as ToolSet) // ToolSet is what this aprticualr object is    
    });
    
    console.log(
        // `result` might unknown or never as the type here because dynamic parameters are used here instead of hard coded parameters, so the errors can be ignored for now
        // @ts-ignore
        text || toolResults[0]?.result?.context[0] || "No Text Generated"
    );
}

main();