const fs = require("fs");

const fd = fs.openSync("/tmp/scaleB", "w");


setInterval(() => {

    let berat = Math.floor(
        Math.random() * 1000000
    )
        .toString()
        .padStart(6, '0');


    let data = `+00${berat}01f`;


    fs.writeSync(
        fd,
        data
    );


    console.log(
        "SEND:",
        data
    );


}, 1000);