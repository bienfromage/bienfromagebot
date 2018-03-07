// Load up the discord.js library
const Discord = require("discord.js");

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
const token = process.env.BOT_ID;

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('BienfromageBot server');
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
  
  if(message.channel.type === "dm" && command === "dev"){
    try{
    if(args[0] === "ping"){
      message.reply(`username: ${message.author.username}
      id: ${message.author.id}`);
    }else if(args[0] === "test"){
      const devUsernames = process.env.DEV_USERNAME.split(',');
      const devIds = process.env.DEV_ID.split(',');
      var index = -1;
      for(i = 0; i < devIds.length; i++){
        if(devIds[i] === message.author.id)
          index = i;
      }
      if(index > -1 && devUsernames[index] === message.author.username){
        message.reply(`You have developer access`);
      }else{
        message.reply('You are not a developer');
      }
    }}catch(e){
      message.reply(`Developer process failed for an unclear reason`);
    }
  }
  
  //Lists available commands.
  else if(command === "help"){
    message.reply(`Here is a list of available commands:
    +help - show available commands
    +ping - check for connection
    +say - echo arguments
    +stat - statistics on users's current text channel
    +whoisthegreatest - who is the greatest?
    
    Admin comands:
    +addRole <@mentionUsername> - give a user an additional role
    +ban <@mentionUsername> <reason> - ban a user
    +create <name> - create channel of given name
    +createCat <name> - create a new channel category of given name
    +delete - delete current channel
    +demote <@mentionUsername> - remove a users's server roles
    +kick <@mentionUsername> <reason> kick a user
    +leave - remove me from the server`);
  }
  
  //check connection command
  else if(command === "ping") {
    message.channel.send("pong");
  }
  
  //echo command
  else if(command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use.
    // To get the "message" itself we join the `args` back into a string with spaces:
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{});
    // And we get the bot to say the thing:
    message.channel.send(sayMessage);
  }
  
  //take the past 100 messages, figure out who sent the most
  else if(command === "stat"){
    try{
      // Get messages
      message.channel.fetchMessages()
        .then(messages => {
          var arr = Array.from(messages.values());
          var users = [];
          //loop through array of messages
          for(i=0; i<arr.length;i++){
            var hasMatch = false;
            for(z = 0; z<users.length;z++){
              //add messages to array to indicate who sent the most
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
        .catch(function(error){
          message.channel.send(error);
        });
    }catch(e){
      message.channel.send("Error: you are attempting to access this function from an environment that is not a server");
    }
  }
  
  //hehe
  else if(command === "whoisthegreatest"){
    message.reply("Lord Grape is the greatest");
  }
  
  //Admin commands
  else if(message.channel.type!=="dm" && message.member.hasPermission("ADMINISTRATOR")){//make sure we are in a server and have admin powers
    if(command === "addrole"){
      try{
        var mentions = message.mentions.members.array();
        var role = args[1];
        var roles = message.guild.roles.array();
        var hasResult = false;
        for(i = 0; i<roles.length;i++){
          if(roles[i].name.toLowerCase() === role.toLowerCase()){
            mentions[0].addRole(roles[i])
            .then(member=>message.reply(`Added role ${role} to ${mentions[0].displayName}.`))
            .catch(error=>message.reply(`Failed to add role
            ${error}`));
            hasResult = true;
          }
        }
        if(!hasResult){
          message.reply(`The role was not found.`);
        }
      }catch(e){
        message.channel.send(`An error occured adding a role. Make sure your command is in the form +addRole [@mentionUsername] [role]
        ${e}`);
      }
    }
    
    else if(command === "ban"){//ban user
      try{
        var mentions = message.mentions.members.array();//find all the mentions of other users
        
        if(mentions[0].bannable){//make sure they're not trying to ban an owner
          var reason = "";
          if(args.length <2){
            reason = "an unspecified reason";
          }
          for(i = 1; i < args.length;i++){
            reason+=args[i]+" ";
          }//the rest of the arguments become reason for ban
          mentions[0].createDM()//Direct Message the user the reason for the ban
          .then(dm=>{dm.send(`You have been banned from ${message.guild.name} for ${reason}, if you feel this ban was unjust or a misunderstanding has occurred, please appeal your ban on our website. Fill out the appropriate form on the “Appeals” page under “Contact Us”, we will address it as soon as possible. Thank you`)
            .then(dmMessage=>{//then ban them
              mentions[0].ban(reason);
              message.reply(`You banned ${mentions[0].displayName}.`);
            })
            .catch((error)=>{//if there's an error, say so and ban them anyway
              message.reply("Error sending reason for ban");
              mentions[0].ban(reason);
              message.reply(`You banned ${mentions[0].displayName}.`);
            });
          })
          .catch((error)=>{//if there's an error creating a DM, still ban the users
            message.reply("Failed to send user reason for ban");
            mentions[0].ban(reason);
            message.reply(`You banned ${mentions[0].displayName}.`);
          });
        }else{//if user is unbannable, print error
          message.reply(`${mentions[0].displayName} is unbannable. :grin:
          the bot may not have high enough permissions to ban the user`);
        }
      }catch(error){//notify user that the +ban function encountered an error
        message.channel.send("An error occured. Make sure your command is in the form '+ban [@mentionUsername] [reason]' and that this bot has permission to ban users \n"+error);
      }
    }
    
    else if(command === "create"){//create a channel
      message.guild.createChannel(args[0], "text")
      .then(channel => {console.log(`Created new channel ${channel.name}`);message.reply(`Created new channel ${channel.name}`);})
      .catch(function(error){
          message.channel.send("An error occured. Make sure your command is in the form '+create [name]' and that this bot has permission to create channels\n"+error);
      });
    }
    
    else if(command === "createcat"){
      message.guild.createChannel(args[0], "category")
      .then(channel =>{ console.log(`Created new channel category ${channel.name}`);message.reply(`Created new channel category ${channel.name}`);})
      .catch(function(error){
          message.channel.send("An error occured. Make sure your command is in the form '+createCat [name]' and that this bot has permission to create categories\n"+error);
      });
    }
    
    else if(command === "delete"){
      message.channel.delete("BienfromageBot deleted the channel")
      .then(channel => {console.log(`Deleted channel ${channel.name}`);})
      .catch(function(error){
          message.channel.send(error);
      });
    }
    
    else if(command === "demote"){
      try{
      var mentions = message.mentions.members.array();//find all the mentions of other users
        mentions[0].setRoles([])//set user roles to none
          .then(member => message.reply(`demoted ${mentions[0].displayName}`))
          .catch(error=>message.reply(`Failed to demote ${mentions[0].displayName}. Make sure this bot has high enough permissions and that your command is in the form '+demote [@mentionUsername]'`));
      }catch(error){
        message.reply(`Error: make sure your command is in the form '+demote [@mentionUsername]'`);
      }
    }
    
    else if(command === "kick"){//ban user
      try{
        var mentions = message.mentions.members.array();//find all the mentions of other users
        
        if(mentions[0].kickable){//make sure they're not trying to kick an owner
          var reason = "";
          if(args.length <2){
            reason = "an unspecified reason";
          }
          for(i = 1; i < args.length;i++){
            reason+=args[i]+" ";
          }//the rest of the arguments become reason for kick
          mentions[0].createDM()//Direct Message the user the reason for the kick
          .then(dm=>{dm.send(`You have been kicked from ${message.guild.name} for ${reason}.`)
            .then(dmMessage=>{//then kick them
              mentions[0].kick(reason);
              message.reply(`You kicked ${mentions[0].displayName}.`);
            })
            .catch((error)=>{//if there's an error, say so and kick them anyway
              message.reply("Error sending reason for ban");
              mentions[0].kick(reason);
              message.reply(`You banned ${mentions[0].displayName}.`);
              console.error;
            });
          })
          .catch((error)=>{//if there's an error creating a DM, still kcik the users
            message.reply(`Failed to send ${mentions[0].displayName} reason for ban`);
            mentions[0].kick(reason);
            message.reply(`You banned ${mentions[0].displayName}.`);
          });
        }else{//if user is unkickable, print error
          message.reply(`${mentions[0].displayName} is unkickable. :grin:
          the bot may not have high enough permissions to kick the user`);
        }
      }catch(error){//notify user that the +ban function encountered an error
        message.channel.send("An error occured. Make sure your command is in the form '+kick [@mentionUsername] [reason]' and that this bot has permission to ban users \n"+error);
      }
    }
    
    else if(command === "leave"){
      try{
        message.guild.leave()
        .then(console.log(`Left guild ${message.guild.name}`))
        .catch(console.error);
      }catch(error){
        try{
          message.reply(`Error kicking bot`)
        }catch(e){
          console.log(error);
        }
      }
    }
  }else{
    message.reply(`Command not recognized. If you typed an admin command, make sure you have admin privlidges and are not in a DM. To see the command list, type '+help'`);
  }
});

client.login(process.env.BOT_ID);