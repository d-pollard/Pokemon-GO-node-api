var Pokeio = require('./poke.io.js');
var util = require('util');
util.inspect(console, true);

var username = process.env.PGO_USERNAME || 'username';
var password = process.env.PGO_PASSWORD || 'password';
var provider = process.env.PGO_PROVIDER || 'google';

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

Pokeio.init(username, password, location, provider, function(err) {

	console.log('[i] Current location: ' + Pokeio.playerInfo.locationName);

	console.log('[i] lat/long/alt: : ' + Pokeio.playerInfo.latitude + ' ' + Pokeio.playerInfo.longitude + ' ' + Pokeio.playerInfo.altitude);

	Pokeio.GetProfile(function(err, profile) {
		if (err) throw err;

		console.log('[i] Username: ' + profile.username);
		console.log('[i] Poke Storage: ' + profile.poke_storage);
		console.log('[i] Item Storage: ' + profile.item_storage);

		var poke = 0;
		if (profile.currency[0].amount) {
			poke = profile.currency[0].amount;
		}

		console.log('[i] Pokecoin: ' + poke);
		console.log('[i] Stardust: ' + profile.currency[1].amount);

		setInterval(function() {
			// This will let you know the heartbeat is pumping..
			console.log('[o] pump...');
			Pokeio.Heartbeat(function(a,hb) {
				if(a !== null) {
					console.log('There appeared to be an error...');
				} else {
					for (var i = hb.cells.length - 1; i >= 0; i--) {

						if(hb.cells[i].WildPokemon[0]) {
							for (var x = hb.cells[i].WildPokemon.length - 1; x >= 0; x--) {
								var currentPokemon = hb.cells[i].WildPokemon[x];
								var iPokedex = Pokeio.pokemonlist[parseInt(currentPokemon.pokemon.PokemonId)-1];
								Pokeio.EncounterPokemon(currentPokemon, function(suc, dat) {
									console.log('Encountering pokemon ' + iPokedex.name + '...');
									Pokeio.CatchPokemon(currentPokemon, 2, function(xsuc, xdat) {
										var status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
										console.log(status[xdat.Status]);
										Pokeio.changePosition();
									});
								});
							}
						}
					}
					// console.log(util.inspect(hb, showHidden=false, depth=10, colorize=true));
				}
			});
		}, 5000);

	});

});