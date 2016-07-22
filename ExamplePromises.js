'use strict';

var Pokego = require('./pokego.js');
var util = require('util');
util.inspect(console, true);

var username = process.env.PGO_USERNAME || 'username';
var password = process.env.PGO_PASSWORD || 'password';
var provider = process.env.PGO_PROVIDER || 'google';

var location = {
	type: 'name',
	name: process.env.PGO_LOCATION || 'Time Square'
};

Pokego.init(username, password, location, provider)
.then((val) => {
	setInterval(function() {
		Pokego.GetProfile().then((profile) => {
			return Pokego.formatPlayercard(profile);
		})
		.then((val) => {
			Pokego.Heartbeat().then((heart) => {
				console.log('[o] pump...');
				for (var i = heart.cells.length - 1; i >= 0; i--) {
					if(heart.cells[i].WildPokemon[0]) {
						for (var x = heart.cells[i].WildPokemon.length - 1; x >= 0; x--) {
							var currentPokemon = heart.cells[i].WildPokemon[x];
							var pokemon = Pokego.pokemonlist[parseInt(currentPokemon.pokemon.PokemonId)-1];
							console.log('[+] There is a catchable ' + pokemon.name + ' -  ' + parseInt(currentPokemon.TimeTillHiddenMs) / 1000 + ' seconds until hidden.');
						}
					}
				}
			}).catch((err) => {console.log(err); });
		});
	}, 2000);
});