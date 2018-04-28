// Load up the discord.js library
const Discord = require("discord.js");
const MongoClient = require("mongodb").MongoClient;

var server_port = 8080;
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
  client.user.setActivity(`on ${client.guilds.size} servers | +help`);
});

client.on('guildMemberAdd', member => {
  try{
    // Send the message to a designated channel on a server:
    const channel = member.guild.channels.find('name', 'welcome');
    // Do nothing if the channel wasn't found on this server
    if (!channel) return;
    
    //find welcome message in mongodb
    const url = process.env.MONGODB_URL;
    var welcomeMessage = config.welcome;
    try{
      MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("servers").find({identifier:member.guild.id}).toArray(function(err, result) {
          if (err) throw err;
          //make sure only one database is found
          if(result.length==1){
            welcomeMessage = result[0].welcome;//set Welcome Message to value found in database
            member.createDM()
              .then(dm=>{dm.send(`Hello ${member}! ${welcomeMessage}`)
                            .catch(console.error);})
              .catch(console.error);
          }else{
            console.log("More than one entry was found!\n"+result);
          }
          db.close();
        });
      });
    }catch(e){
      console.log("Error connecting to MongoDB: "+e);
    }
    
    // Send the message, mentioning the member
    channel.send(`Welcome to the server, ${member}, you are guild member number ${member.guild.members.size}.`);
      
    if(member.guild.roles.exists('name','Visitor')){//If the role 'Visitor' exists, add it.
      member.addRole(member.guild.roles.find('name','Visitor'));
    }else{//Otherwise, I'll create my OWN role BWAHAHA.
      member.guild.createRole({
        name: 'Visitor',
        color: 'BLUE',
      })
        .then(role => member.addRole(role))
        .catch(console.error);
    }
  }catch(e){
    console.log("Welcome message error.");
  }
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`on ${client.guilds.size} servers | +help`);
  
  try{
    //add guild to records
    const url = process.env.MONGODB_URL;
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("mydb");
      var myobj = { name: guild.name, identifier:guild.id ,welcome: " welcome to "+guild.name};
      dbo.collection("servers").insertOne(myobj, function(err, res) {
        if (err) throw err;
        console.log("Added guild successfully");
        db.close();
      });
    });
  }catch(e){
    console.log("Error adding guild to record: "+e);
  }
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setActivity(`on ${client.guilds.size} servers | +help`);
  
  //remove guild from database listings
  try{
    const url = process.env.MONGODB_URL;
    
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("mydb");
      var myquery = { identifier: guild.id };
      dbo.collection("servers").deleteOne(myquery, function(err, obj) {
        if (err) throw err;
        console.log("1 document deleted");
        db.close();
      });
    });
  }catch(e){
    console.log("Error removing guild record: "+e);
  }
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
      if(args[0] && args[0] === "ping"){//check if user has developer privledges from a secret list
        message.reply(`username: ${message.author.username}
        id: ${message.author.id}`);
      }else{
        const devUsernames = process.env.DEV_USERNAME.split(',');
        const devIds = process.env.DEV_ID.split(',');
        var index = -1;
        for(i = 0; i < devIds.length; i++){
          if(devIds[i] === message.author.id)
            index = i;
        }
        if(index > -1 && devUsernames[index] === message.author.username){
          message.reply(`You have developer access`);
          if(args[0]){
            if(args[0] === "help"){//print developer help commands
              message.reply(`${config.devHelp}`);
            }else if(args[0] === "leave"){//remotely leave a server
              try{
                var guildName = "";
                
                for(i = 1; i<args.length; i++){//build guild name from arguments
                  if(i>1)
                    guildName+=" ";
                  guildName+=args[i];
                }
                if(guildName){//check if I'm a part of that guild, if so prepare to leave
                  guildName = guildName.toLowerCase();
                  var myGuilds = client.guilds.array();
                  var index = -1;
                  for(i = 0; i<myGuilds.length;i++){
                    if(myGuilds[i].name.toLowerCase() === guildName){
                      index = i;
                    }
                  }
                
                  if(index > -1){//leave guild
                    myGuilds[index].leave()
                      .then(message.reply(`Left guild ${guildName}`))
                      .catch(console.error);
                  }else{//error message in case not a part of that guild
                    message.reply(`I do not think I am a part of that guild.`);
                  }
                }else{
                  message.reply(`I am not sure that you inputed a server name. Make sure your command is in the form '+dev leave [server name]'`);
                }
              }catch(error){
                try{
                  message.reply(`Error leaving: ${error}`);
                }catch(e){
                  console.log(error);
                }
              }
            }else if(args[0] === "guilds"){//print list of guilds
              try{
                var myGuilds = client.guilds.array();
                if(myGuilds.length<1){
                  message.reply("I do not have any guilds stored in my memory banks");
                }else{
                  var names = "";
                  for(i = 0; i<myGuilds.length;i++){
                    names +="\n"+myGuilds[i].name;
                  }
                  message.reply(names);
                }
              }catch(error){
                message.reply("Error finding guilds: "+error);
              }
            }
          }
        }else{
          message.reply('You are not a developer');
        }
      }
    }catch(e){
      message.reply(`Developer command failed for an unclear reason. Makes sure your command is in the form '+dev [command]'`);
    }
  }
  
  //Lists available commands. This works differently for developers and normal users so dev commands are not sent to normal users
  else if(command === "help"){
    const devUsernames = process.env.DEV_USERNAME.split(',');
    const devIds = process.env.DEV_ID.split(',');
    var index = -1;
    for(i = 0; i < devIds.length; i++){
      if(devIds[i] === message.author.id)
        index = i;
    }
    if(index > -1 && devUsernames[index] === message.author.username){
      message.author.createDM()//Direct Message the user
      .then(dm=>{dm.send(`${config.help}${config.devHelp}`);
        message.reply("I sent you a DM with the commands.");
      })
      .catch((error)=>{//if there's an error still send help
        message.reply(`${config.help}`);
        console.log(error);
      });
      
      
    }else{
      message.reply(`${config.help}`);
    }
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
  
  else if(command === "welcome"){
    const url = process.env.MONGODB_URL;
    var welcomeMessage = config.welcome;
    if(message.channel.type!=="dm"){
      try{
        var member = message.member;
        MongoClient.connect(url, function(err, db) {
          if (err) throw err;
          var dbo = db.db("mydb");
          dbo.collection("servers").find({identifier:member.guild.id}).toArray(function(err, result) {
            if (err) throw err;
            //make sure only one database is found
            if(result.length!=1){
              console.log("More than one entry or no entry for this database found!");
            }else{
              welcomeMessage = result[0].welcome;
              message.channel.send(`Hello, ${message.member}! ${welcomeMessage}`);
            }
            db.close();
          });
        });
      }catch(e){
        console.log("Error connecting to MongoDB: "+e);
      }
    }
  }
  
  //hehe
  else if(command === "whoisthegreatest"){
    message.reply("Lord Grape is the greatest");
  }
  
  //server commands
  else if(message.channel.type!=="dm"){//make sure we are in a server
    var recognized = false;
    
    if(command === "ban"){//ban user
      recognized = true;
      if(checkPermission("BAN_MEMBERS",message,command)){
        try{
          var mentions = message.mentions.members.array();//find all the mentions of other users
          
          if(mentions[0].bannable){//make sure they're not trying to ban an owner
            var reason = "";
            if(args.length <2){
              reason = "an unspecified reason";
            }else{
              for(i = 1; i < args.length;i++){
                reason+=args[i]+" ";
              }//the rest of the arguments become reason for ban
            }
            
            mentions[0].ban(reason).catch(e);
            message.reply(`ban command sent for ${mentions[0].displayName}`);
          }else{//if user is unbannable, print error
            message.reply(`${mentions[0].displayName} is unbannable. :grin:
I may not have high enough permissions to ban the user`);
          }
        }catch(error){//notify user that the +ban function encountered an error
          message.channel.send("An error occured. Make sure your command is in the form '+ban [@mentionUsername] [reason]' and that I have permission to ban users \n"+error);
        }
      }
    }
    
    else if(command === "kick"){//kick user
      recognized = true;
      if(checkPermission("KICK_MEMBERS",message,command)){
        try{
          var mentions = message.mentions.members.array();//find all the mentions of other users
          
          if(mentions[0].kickable){//make sure they're not trying to kick an owner
            var reason = "";
            if(args.length <2){
              reason = "an unspecified reason";
            }else{
              for(i = 1; i < args.length;i++){
                reason+=args[i]+" ";
              }//the rest of the arguments become reason for kick
            }
            
            mentions[0].kick(reason)
                    .catch(console.error);
                    
            message.reply(`kick command sent for ${mentions[0].displayName}`);
          }else{//if user is unkickable, print error
            message.reply(`${mentions[0].displayName} is unkickable. :grin:
I may not have high enough permissions to kick the user`);
          }
        }catch(error){//notify user that the +kick function encountered an error
          message.channel.send("An error occured. Make sure your command is in the form '+kick [@mentionUsername] [reason]' and that I have permission to kick users \n"+error);
        }
      }
    }
    
    else if(command === "leave"){
      recognized = true;
      if(checkPermission("ADMINISTRATOR",message,command)){
        try{
          message.guild.leave()
          .then(console.log(`Left guild ${message.guild.name}`))
          .catch(console.error);
        }catch(error){
          try{
            message.reply(`Error leaving: ${error}`);
          }catch(e){
            console.log(error);
          }
        }
      }
    }
    
    else if(command === "addrole"){
      recognized = true;
      if(checkPermission("MANAGE_ROLES",message,command)){
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
    }
      
    else if(command === "create"){//create a channel
      recognized = true;
      if(checkPermission("MANAGE_CHANNELS",message,command)){
        message.guild.createChannel(args[0], "text")
        .then(channel => {console.log(`Created new channel ${channel.name}`);message.reply(`Created new channel ${channel.name}`);})
        .catch(function(error){
            message.channel.send("An error occured. Make sure your command is in the form '+create [name]' and that I have permission to create channels\n"+error);
        });
      }
    }
    
    else if(command === "createcat"){
      recognized = true;
      if(checkPermission("MANAGE_CHANNELS",message,command)){
        message.guild.createChannel(args[0], "category")
        .then(channel =>{ console.log(`Created new channel category ${channel.name}`);message.reply(`Created new channel category ${channel.name}`);})
        .catch(function(error){
            message.channel.send("An error occured. Make sure your command is in the form '+createCat [name]' and that I have permission to create categories\n"+error);
        });
      }
    }
    
    else if(command === "delete"){
      recognized = true;
      if(checkPermission("MANAGE_CHANNELS",message,command)){
        try{
          message.channel.delete()
          .then(channel => {console.log(`Deleted channel ${channel.name}`);})
          .catch(function(error){
              message.channel.send(error);
          });
        }catch(e){
          message.channel.send("An error occured. Make sure your commmand is in the form '+delete' and that I have permission to create categories\n");
        }
      }
    }
    
    else if(command === "demote"){
      recognized = true;
      if(checkPermission("MANAGE_ROLES",message,command)){
        try{
          var mentions = message.mentions.members.array();//find all the mentions of other users
          mentions[0].setRoles([])//set user roles to none
            .then(member => message.reply(`demoted ${mentions[0].displayName}`))
            .catch(error=>message.reply(`Failed to demote ${mentions[0].displayName}. Make sure this bot has high enough permissions and that your command is in the form '+demote [@mentionUsername]'`));
        }catch(error){
          message.reply(`Error: make sure your command is in the form '+demote [@mentionUsername]'`);
        }
      }
    }
    
    else if(command === "info"){//dev command, find the database id
      recognized = true;
      if(checkPermission("ADMINISTRATOR",message,command)){
        try{
          message.reply("Name: "+message.member.guild.name+"\nId: "+message.member.guild.id);
        }catch(error){
          message.reply("Error"+error);
        }
      }
    }
    
    else if(command === "setwelcome"){
      recognized = true;
      if(checkPermission("ADMINISTRATOR",message,command)){
        try{
          //get new message
          var welcomeMessage = "";
          
          for(i = 0; i<args.length; i++){
            welcomeMessage+=args[i]+" ";
          }
          
          //make suer message length is greater than 0
          if(welcomeMessage.trim().length>0){
            const url = process.env.MONGODB_URL;
            
            //create new server object
            var serverObj = {name: message.member.guild.name, identifier:message.member.guild.id, welcome: welcomeMessage};
            
            MongoClient.connect(url, function(err, db) {
              if (err) throw err;
              var dbo = db.db("mydb");
              var myquery = { identifier: message.member.guild.id};
              //delete old record
              dbo.collection("servers").deleteOne(myquery, function(err, obj) {
                if (err) throw err;
                console.log("1 document deleted");
                db.close();
              });
              
              //insert new record
              dbo.collection("servers").insertOne(serverObj, function(err, res) {
                if (err) throw err;
                console.log("Changed welcome message for "+message.member.guild.name);
                db.close();
              });
            });
            message.reply("Record submission successful. Your new message is:\n"+welcomeMessage);
          }else{
            message.reply("It seems you are attempting to set your server welcome message to a blank line. Make sure your command has the form +setWelcome [message]");
          }
        }
        catch(e){
          message.reply("Error: "+e);
        }
      }
    }
    
    //alert the user if no commands are found
    if(!recognized){
      message.reply(config.notFound);
    }
  }else{
    message.reply(config.notFound);
  }
});

client.login(process.env.BOT_ID);

function checkPermission(permission, message, command){
  if(message.member.hasPermission(permission)){
    return true;
  }else{
    message.reply(`My sensors indicate that you do not have sufficient permission to use the +${command} command.`);
    return false;
  }
}