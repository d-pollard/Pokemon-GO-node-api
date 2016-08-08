'use strict';

var username = process.env.PGO_USERNAME || 'username';
var password = process.env.PGO_PASSWORD || 'password';
var provider = process.env.PGO_PROVIDER || 'google';  /* google OR ptc */

var location = {
	type: 'name',
	name: process.env.PGO_LOCATION || 'Time Square'
	
// 	type: 'coords',
//         coords: {
//             latitude:  40.758896,
//             longitude: -73.985130,
//             altitude: 10
//         }

};

var Pokego = require('./pokego.js');
var util = require('util');
util.inspect(console, true);

Pokego.init(username, password, location, provider).then((profile) => {
	return new Promise(function(resolve, reject) {
		Pokego.GetProfile().then((profile) => {
			return Pokego.formatPlayercard(profile);
		}).then((val) => {
			Pokego.GetInventory().then((profile) => {
				Pokego.displayInventory(profile);
			});
		}).catch((val) => {
			console.log(val);
		});	
	}).then((a) => {console.log(a);});
});