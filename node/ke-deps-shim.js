
var requirejs = require("requirejs");

requirejs.config({
    //Use node's special variable __dirname to
    //get the directory containing this file.
    //Useful if building a library that will
    //be used in node but does not require the
    //use of node outside
    baseUrl: __dirname,

    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
    nodeRequire: require,
});

global.Khan = window.Khan = {};
global.KhanUtil = window.KhanUtil = Khan.KhanUtil = {};

// Like React in common.js, khan-exercises (notably raphael) requires
// navigator to be set, but requirejs doesn't allow it, so we
// temporarily set it here.
var oldNavigator = global.navigator;
global.navigator = { userAgent: "Node" };

requirejs("./ke-deps.js");

global.navigator = oldNavigator;

module.exports = KhanUtil;
