const http = require("http");
var request = require("request");
var html2json = require("html2json").html2json;
const sanitizeHtml = require("sanitize-html");

const hostname = "127.0.0.1";
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("I'm running, but in the background.");
});

server.listen(port, hostname, () => {
  //   updateData();
  // Every 5 minutes
  //   setInterval(updateData, 300000);
  updateData();
  loop();

  console.log(`Server running at http://${hostname}:${port}/`);
});

function loop() {
  // Math.random() * (max - min + 1) + min); // Random time between 4 and 6 minutes
  var rand = Math.round(Math.random() * (240000 - 360000 + 1)) + 360000;
  setTimeout(function () {
    updateData();
    loop();
  }, rand);
}

var firstTime = true;
var previous = [];
var price = 320;
// Models to check
var conditions = ["2060", "2070", "3060", "3060ti"];

function updateData() {
  // GPUs ajax URL
  let url =
    "https://www.pccomponentes.com/outlet/ajax?idFamilies[]=6&page=0&order=price-asc";

  request(url, function (err, res, body) {
    // Allow only a super restricted set of tags and attributes
    const clean = sanitizeHtml(body, {
      allowedTags: ["article"],
      allowedAttributes: {
        article: ["data-price", "data-name"],
      },
    });

    const json = html2json(clean);

    var matches = [];

    json.child.forEach((element) => {
      if (element.tag === "article" && element.attr["data-price"] < price) {
        // Check if any of the models are in the title of the product
        if (conditions.some((el) => element.attr["data-name"].includes(el))) {
          let match =
            "[" +
            element.attr["data-price"] +
            " EUR] " +
            element.attr["data-name"].join([" "]);
          matches.push(match);
        }
      }
    });

    // Check if there is any new card in the price range
    const difference = matches.filter((x) => !previous.includes(x));

    if (firstTime) {
      // Do not notify the first update
      console.log("Bot started! Start tracking cards:");
      console.log(difference);
      firstTime = false;
    } else if (difference.length > 0) {
      // New cards found!
      console.log(difference);
    } else {
      console.log("No new cards found...");
    }

    // Update previous
    previous = matches;
  });
}
