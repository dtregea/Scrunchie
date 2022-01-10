const dotenv = require("dotenv").config();
const discord = require("discord.js");
const https = require("https");
const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE_LOCATION, (err) => {
  if (err) console.log("Failed to connect to the database");
  else console.log("Connected to database");
});

const meowSchema = new mongoose.Schema({
  meowerID: String,
  meowedID: String,
});

const Meow = mongoose.model("Meow", meowSchema);

const client = new discord.Client({
  allowedMentions: {
    parse: ["users", "roles"],
    repliedUser: true,
  },
  intents: [
    "GUILDS",
    "GUILD_MESSAGES",
    "GUILD_PRESENCES",
    "GUILD_MEMBERS",
    "GUILD_MESSAGE_REACTIONS",
  ],
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", (msg) => {
  console.log(msg.content);
  if (msg.content.startsWith(".cat")) {
    // TODO specify gif for a gif
    //encouragingMessage = msg.content.split("$new ")[1] get string after command
    let buffers = [];
    let options = {
      hostname: "api.thecatapi.com",
      path: "/v1/images/search",
      headers: { "x-api-key": process.env.CAT_API_KEY },
    };
    const req = https.request(options, (res) => {
      res
        .on("data", (data) => {
          // Push data to a buffer to ensure we get full response first
          buffers.push(data);
        })
        .on("end", () => {
          // Once all data has been received, send the image URL
          let catData = JSON.parse(Buffer.concat(buffers).toString());
          msg.channel.send(catData[0].url);
        });
    });
    req.on("error", (error) => {
      console.error("Error in requesting random cat.");
      console.log(error);
    });
    req.end();
  } else if (msg.content.startsWith(".breeds")) {
    let buffers = [];
    let options = {
      hostname: "api.thecatapi.com",
      path: "/v1/breeds",
      headers: { "x-api-key": process.env.CAT_API_KEY },
    };
    const req = https.request(options, (res) => {
      res
        .on("data", (data) => {
          // Push data to a buffer to ensure we get full response first
          buffers.push(data);
        })
        .on("end", () => {
          // Once all data has been received, send the image URL
          let catData = JSON.parse(Buffer.concat(buffers).toString());
          let listOfBreeds = "Heres a list of searchable cat breeds:\n`";
          catData.forEach((element) => {
            listOfBreeds += element.name + ", ";
          });
          listOfBreeds += "`";
          msg.channel.send(listOfBreeds);
        });
    });
    req.on("error", (error) => {
      console.error("Error in requesting all breeds.");
      console.log(error);
    });
    req.end();
  } else if (msg.content.startsWith(".breed ")) {
    // Get info about a particular Breed
    let command = msg.content.split(" ");
    // Inform Users about command usage if incorrect
    if (command.length == 1) {
      msg.channel.send('Correct command usage: ".breed [breed name]"');
    } else {
      // Get the name of the breed from the command arguments
      let breedName = "";
      for (let i = 1; i < command.length; i++) {
        breedName += command[i];
        if (i != command.length - 1) breedName += "%20";
      }
      let buffers = [];
      let options = {
        hostname: "api.thecatapi.com",
        path: "/v1/breeds/search?q=" + breedName,
        headers: { "x-api-key": process.env.CAT_API_KEY },
      };
      // Make request to Cat API to get information on the breed
      console.log("Sending request for breed info");
      const req = https.request(options, (res) => {
        res
          .on("data", (data) => {
            // Push data to a buffer to ensure we get full response first
            buffers.push(data);
          })
          .on("end", () => {
            console.log("Data for breed info has been received");
            // Once all data has been received, send the image URL
            let catData = JSON.parse(Buffer.concat(buffers).toString());
            if (catData != 0) {
              // On successful breed found, send another request to the Cat API to get a picture of the breed
              let catImgURLBuffer = [];
              const catImgReq = https.request(
                {
                  hostname: "api.thecatapi.com",
                  path:
                    "https://api.thecatapi.com/v1/images/" +
                    catData[0].reference_image_id,
                  headers: { "x-api-key": process.env.CAT_API_KEY },
                },
                (catImgRes) => {
                  console.log("Sending request for cat img url");
                  catImgRes
                    .on("data", (catData) => {
                      // Push data to a buffer to ensure we get full response first
                      catImgURLBuffer.push(catData);
                    })
                    .on("end", () => {
                      console.log("Cat img url received");
                      // Image url has been received
                      let catImgUrl = JSON.parse(
                        Buffer.concat(catImgURLBuffer).toString()
                      ).url;
                      // Generate response to send to users
                      let response =
                        "Breed: " +
                        catData[0].name +
                        "\nAffection Level: " +
                        getStars(catData[0].affection_level) +
                        "\nEnergy Level: " +
                        getStars(catData[0].energy_level) +
                        "\nIntelligence: " +
                        getStars(catData[0].intelligence) +
                        "\n" +
                        catData[0].description +
                        "\n" +
                        catImgUrl;
                      msg.channel.send(response);
                    });
                }
              );
              catImgReq.on("error", (error) => {
                console.error("Error in searching cat by ID.");
                console.log(error);
              });
              catImgReq.end();
            } else {
              msg.channel.send(
                'Breed name of "' +
                  breedName.replace(/%20/g, " ") +
                  '" not found. Try .breeds to find a list of valid breeds.'
              );
            }
          });
      });
      req.on("error", (error) => {
        console.error("Error in requesting all breeds.");
        console.log(error);
      });
      req.end();
    }
  } else if (msg.content.startsWith(".meow")) {
    let command = msg.content.split(" ");
    if (command.length < 2) {
      // TODO change to separate commands to see other peoples stats
      Meow.countDocuments({ meowerID: msg.author.id }, (err, numMeow) => {
        Meow.countDocuments({ meowedID: msg.author.id }, (errn, numMeowed) => {
          if (!(err || errn))
            msg.channel.send(
              `<@!${msg.author.id}> Stats:\nMeow'd at others: ${numMeow}\nMeow'd by others: ${numMeowed}`
            );
        });
      });
    } else {
      let re = new RegExp("<@!*&*[0-9]+>");
      let meowerID = msg.author.id;
      let meowedID = command[1].substring(3, 21);
      if (re.test(command[1]) && meowerID !== meowedID) {
        let newMeow = new Meow({
          meowerID: meowerID,
          meowedID: meowedID,
        }).save((err, result) => {
          if (!err) msg.channel.send(`<@!${meowerID}> just meow'd....`);
          else console.log(err);
        });
      }
    }
  }
});

function getStars(numberOfStars) {
  let result = "";
  for (let i = 0; i < numberOfStars; i++) {
    result += "★";
    if (i != numberOfStars - 1) result += " ";
  }
  return result;
}

client.login(process.env.TOKEN);

// Invite with all permissions
// https://discord.com/oauth2/authorize?client_id=929780122121281637&scope=bot&permissions=1099511627775
