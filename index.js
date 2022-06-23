const { Client, Intents } = require('discord.js');
const express = require('express');
const bearerToken = require('express-bearer-token');
const app = express();
const port = 3000;
var prv = {};
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bearerToken());

function auth_needed(req, res, next) {
    if(req.token==undefined) res.sendStatus(400);
    else next();
}

function auth_instore(req, res, next) {
    auth_needed(req, res, () => {
        if(!(req.token in prv)) {
            res.status(403);
            res.json(req.token);
        } else next();
    });
}

app.post("/", auth_needed, (req, res) => {
    let client = new Client({ intents: [Intents.FLAGS.GUILDS] });
    prv[req.token] = {};
    prv[req.token].client = client;
    client.login(req.body.token);
    let channelID = req.body.channel;
    prv[req.token].channelID = channelID;
    client.once('ready', () => {
	    console.log("Ready!");
        client.channels.fetch(channelID)
            .then(c => {
                prv[req.token].channel = c;
                console.log(c.name);
                res.json({status: "Ready!", channel_name: c.name})
            });
    });
});

function log(req, res, next) {
    console.log(req.token);
    console.log(prv);
    next();
}

app.get("/log", log, auth_instore, (req, res) => {
    res.sendStatus(200);
})

app.get("/ready", auth_instore, (req, res) => {
    res.json(prv[req.token].client.isReady())
})

app.get("/messages", auth_instore, (req, res) => {
    prv[req.token].channel.messages.fetch()
        .then(messages => {
            console.log(messages);

            messages = messages.map(v => [v.createdAt, v.cleanContent]);
            console.log(messages);
            res.json(messages);
        });
})



app.get("/messages/:after", auth_instore, (req, res) => {
    let msg = prv[req.token].channel.messages;
    var acc = {};
    let after = req.params.after;
    var beforeID = undefined;
    var beforeAt = undefined;
    function fetch(messagesColl) {
        let lastp = messagesColl.size;
        let messages = messagesColl.map(v => [v.createdAt, v.cleanContent, v.id, v.createdTimestamp]);
        acc[beforeAt] = messages;
        let last = messages.at(lastp-1);
        console.log(lastp, last);
        beforeID = last[2];
        beforeAt = last[0];
        console.log(messages, messagesColl);
        console.log(beforeAt, beforeID, after);
        if(!(messagesColl.has(after))) msg.fetch({limit: 50, before: beforeID}).then(fetch)
        else res.json(acc);
    }
    msg.fetch({limit: 50}).then(fetch);
})

app.delete("/", auth_instore, (req, res) => {
    if(result) prv[req.token] = undefined;
    res.json(result);
});

app.listen(port, () => {
    console.log("hey");
});
