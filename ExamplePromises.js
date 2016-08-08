'use strict';

var username = process.env.PGO_USERNAME || 'username';
var password = process.env.PGO_PASSWORD || 'password';
var provider = process.env.PGO_PROVIDER || 'google';  /* google OR ptc */
var pokeBall = process.env.PGO_POKEBALL || 'POKE_BALL'; // POKE_BALL or GREAT_BALL or ULTRA_BALL

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

var shouldLoop = true;

Pokego.init(username, password, location, provider).then((profile) => {
	setInterval(function() {
		return new Promise(function(resolve, reject) {
			if(shouldLoop) {
				Pokego.GetProfile().then((profile) => {
					return Pokego.formatPlayercard(profile);
				})
				.then((val) => {
					Pokego.Heartbeat().then((heart) => {
						console.log('[o] pump...');
						for (var i = heart.cells.length - 1; i >= 0; i--) {
							if(heart.cells[i].WildPokemon[0]) {
								shouldLoop = false;
								for (var x = heart.cells[i].WildPokemon.length - 1; x >= 0; x--) {
									var currentPokemon = heart.cells[i].WildPokemon[x];
									var pokemon = Pokego.pokemonlist[parseInt(currentPokemon.pokemon.PokemonId)-1];
									console.log('[+] There is a catchable ' + pokemon.name + ' -  ' + parseInt(currentPokemon.TimeTillHiddenMs) / 1000 + ' seconds until hidden.');
									Pokego.fireAndForgetCatch(currentPokemon, pokemon.name, x, pokeBall).then((data) => {
										if(data == 0) {
											shouldLoop = true;
											resolve('');
										}
									});
								}
							}
						}
						Pokego.changePosition();
					}).catch((err) => {console.log(err); });
				});
			} else {
				resolve('[p] Looping stalled to complete execution of task..');
			}
		}).then((a) => {console.log(a);});
	}, 5000);
});