var Pokeio = require('pokemon-go-node-api');
var util = require('util');
util.inspect(console, true);

var username = process.env.PGO_USERNAME || 'username';
var password = process.env.PGO_PASSWORD || 'password';
var provider = process.env.PGO_PROVIDER || 'google';

var location = {
	type: 'name',
	name: process.env.PGO_LOCATION || 'Time Square'
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
			console.log('pump...');
			Pokeio.Heartbeat(function(a,hb) {
				if(a !== null) {
					console.log('There appeared to be an error...');
				} else {
					for (var i = hb.cells.length - 1; i >= 0; i--) {

						if(hb.cells[i].WildPokemon[0]) {
							var iSpawnz = hb.cells[i].WildPokemon[0];
							Pokeio.EncounterPokemon(iSpawnz, function(j,ax) {
								var useBall = 1; // ITEM_POKE_BALL = 1; ITEM_GREAT_BALL = 2; ITEM_ULTRA_BALL = 3; ITEM_MASTER_BALL = 4; 
								var pokemon = Pokeio.pokemonlist[parseInt(ax.WildPokemon.pokemon.PokemonId)-1];
								Pokeio.CatchPokemon(ax.WildPokemon, useBall, function(a, b){
									var status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
									console.log('Catch status for ' + pokemon.name + ': ' + status[b.status])
								});
							});
						}
					}
					// console.log(util.inspect(hb, showHidden=false, depth=10, colorize=true));
				}
			});
		}, 2000);

	});

});