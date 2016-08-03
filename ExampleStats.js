'use strict';

var username = process.env.PGO_USERNAME || 'username';
var password = process.env.PGO_PASSWORD || 'password';
var provider = process.env.PGO_PROVIDER || 'google';  /* google OR ptc */

var location = {
	type: 'name',
	name: process.env.PGO_LOCATION || 'Time Square'
};

var Pokego = require('./pokego.js');
var util = require('util');
util.inspect(console, true);

Pokego.init(username, password, location, provider).then((profile) => {
	Pokego.GetProfile().then((profile) => {
		return Pokego.formatPlayercard(profile);
	}).then((x) => {
		Pokego.getStats().then((stats) => {
			console.log(stats);
		});	
	}).catch((val) => {
		console.log(val);
	});
});