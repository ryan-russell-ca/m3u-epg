const https = require("https");

https
  .get("https://iptv-org.github.io/iptv/channels.json", (resp) => {
    let data = "";

    // A chunk of data has been received.
    resp.on("data", (chunk) => {
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on("end", () => {
      console.log(JSON.parse(data)[1000]);
    });
  })
  .on("error", (err) => {
    console.log("Error: " + err.message);
  });
