const express = require("express");
const route = express.Router();
app.set("view engine", "pug");

route.get("/:isbn", getBooks);

module.exports = route;
