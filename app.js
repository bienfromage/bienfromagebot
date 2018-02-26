// Load up the discord.js library
const Discord = require("discord.js");

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
const token = process.env.BOT_ID;

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello World!');
  res.end();
}).listen(server_port,server_ip_address);

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values.
const config = require("./config.json");
// config.prefix contains the message prefix.
// we have not done so because of GitHub security, but if we wished we could put our bot token in config.json as well

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setActivity(`on ${client.guilds.size} servers`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`on ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setActivity(`on ${client.guilds.size} servers`);
});


client.on("message", message => {
  // This event will run on every single message received, from any channel or DM.
  
  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot) return;
  
  // Also good practice to ignore any message that does not start with our prefix,
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;
  
  // Here we separate our "command" name, and our "arguments" for the command.
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  
  // Let's go with a few common example commands! Feel free to delete or change those.
  
  if(command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    message.channel.send("pong");
  }
  
  if(command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use.
    // To get the "message" itself we join the `args` back into a string with spaces:
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{});
    // And we get the bot to say the thing:
    message.channel.send(sayMessage);
  }
  
  if(command === "stat"){
    try{
      // Get messages
      message.channel.fetchMessages()
        .then(messages => {
          var arr = Array.from(messages.values());
          var users = [];
          for(i=0; i<arr.length;i++){
            var hasMatch = false;
            for(z = 0; z<users.length;z++){
              if(users[z].name === arr[i].author.username){
                users[z].value++;
                hasMatch = true;
              }
            }
            if(!hasMatch){
              users.push({name:arr[i].author.username,value:1});
            }
          }
          users.sort(function(first,second){
            return second.value-first.value;
          });
          
          if(users.length===1)
            message.reply("Statistics Check! In the Past 100 messages on this channel, the user who sent the most messages was\n"+users[0].name);
          if(users.length===2)
            message.reply("Statistics Check! In the Past 100 messages on this channel, the users who sent the most messages were \n1."+users[0].name+"\n2."+users[1].name);
            if(users.length>2)
            message.reply("Statistics Check! In the Past 100 messages on this channel, the users who sent the most messages were \n1."+users[0].name+"\n2."+users[1].name+"\n3."+users[2].name);
        })
        .catch(console.error);
    }catch(e){
      message.channel.send("Error: you are attempting to access this function from an environment that is not a server");
    }
  }
  
  if(command === "help"){
    message.reply(`Here is a list of available commands:
    +help - show available commands
    +ping - check for connection
    +say - echo arguments
    +stat - statistics on users's current text channel
    +whoisthegreatest - who is the greatest?
    +goat - sets a user's nickname to goat(WIP)`);
  }
  
  if(command === "whoisthegreatest"){
    message.reply("Lord Grape is the greatest");
  }
});

client.login(process.env.BOT_ID);
