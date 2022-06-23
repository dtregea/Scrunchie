require("dotenv").config();
const discord = require("discord.js");
const mongoose = require("mongoose");
const axios = require("axios").default;

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

client.on("messageCreate", async (msg) => {
  if (msg.content.startsWith(".cat")) {
    // Send a random cat picture
    const response = await axios.get(
      "https://api.thecatapi.com/v1/images/search",
      {
        headers: {
          "x-api-key": process.env.CAT_API_KEY,
        },
      }
    );
    msg.channel.send(response?.data[0]?.url);
  } else if (msg.content.startsWith(".breeds")) {
    const response = await axios.get("https://api.thecatapi.com/v1/breeds", {
      headers: {
        "x-api-key": process.env.CAT_API_KEY,
      },
    });
    let listOfBreeds = "Heres a list of searchable cat breeds:\n`";
    response?.data?.forEach((element) => {
      listOfBreeds += element.name + ", ";
    });
    listOfBreeds += "`";
    msg.channel.send(listOfBreeds);
  } else if (msg.content.startsWith(".breed ")) {
    // Get info about a particular Breed

    let command = msg.content.split(" ");
    if (command.length == 1) {
      msg.channel.send('Correct command usage: ".breed [breed name]"');
      return;
    }

    let breedName = "";
    for (let i = 1; i < command.length; i++) {
      breedName += command[i];
      if (i != command.length - 1) breedName += "%20";
    }

    const breedResponse = await axios.get(
      "https://api.thecatapi.com/v1/breeds/search?q=" + breedName,
      {
        headers: {
          "x-api-key": process.env.CAT_API_KEY,
        },
      }
    );

    if (breedData?.data?.length == 0) {
      msg.channel.send(
        'Breed name of "' +
          breedData.replace(/%20/g, " ") +
          '" not found. Try .breeds to find a list of valid breeds.'
      );
    }
    let breedData = breedResponse?.data[0];
    const catImage = await axios.get(
      "https://api.thecatapi.com/v1/images/" + breedData.reference_image_id,
      {
        headers: {
          "x-api-key": process.env.CAT_API_KEY,
        },
      }
    );

    // Format response to send to users
    let response =
      "Breed: " +
      breedData.name +
      "\nAffection Level: " +
      getStars(breedData.affection_level) +
      "\nEnergy Level: " +
      getStars(breedData.energy_level) +
      "\nIntelligence: " +
      getStars(breedData.intelligence) +
      "\n" +
      breedData.description +
      "\n" +
      catImage?.data.url;
    msg.channel.send(response);
  } else if (msg.content.startsWith(".meow")) {
    // Meow at others, save stats
    let command = msg.content.split(" ");
    if (command.length < 2) {
      // TODO change to separate commands to see other peoples stats
      let numMeows = await Meow.countDocuments({ meowerID: msg.author.id });
      let numMeowed = await Meow.countDocuments({ meowedID: msg.author.id });
      msg.channel.send(
        `<@!${msg.author.id}> Stats:\nMeow'd at others: ${numMeows}\nMeow'd by others: ${numMeowed}`
      );
    } else {
      let validTagRE = new RegExp("<@!*&*[0-9]+>");
      let meowerID = msg.author.id;
      let meowedID = command[1].substring(2, 20);
      if (validTagRE.test(command[1]) && meowerID != meowedID) {
        let newMeow = await new Meow({
          meowerID: meowerID,
          meowedID: meowedID,
        }).save();

        if (newMeow) {
          msg.channel.send(`<@!${meowerID}> just meow'd....`);
        }
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
