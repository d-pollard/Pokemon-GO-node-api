var Pokeio = require('./poke.io.js');
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

		var fortArr = [];

		setInterval(function() {
			// This lets you know the heartbeat is pumping
			console.log('[o] pump...');
			Pokeio.Heartbeat(function(a,hb) {
				if(a !== null) {
					console.log('There appeared to be an error...');
				} else {
					for (var i = hb.cells.length - 1; i >= 0; i--) {
						if(hb.cells[i].Fort) {
							var currentFortArr = hb.cells[i].Fort;
							for (var j = currentFortArr.length - 1; j >= 0; j--) {
								var currentFort = currentFortArr[j];
								// console.log(currentFort);
								if(currentFort.FortType === 1) {
									// "Fort" is a pokestop
									if(fortArr.indexOf(currentFort.FortId) === -1) {
										fortArr.push(currentFort.FortId);
										Pokeio.GetFort(currentFort.FortId, currentFort.Latitude, currentFort.Longitude, function(a,b) {
											// NO_RESULT_SET = 0; SUCCESS = 1; OUT_OF_RANGE = 2; IN_COOLDOWN_PERIOD = 3; INVENTORY_FULL = 4;
											var resultSet = ['Unexpected Error','Successful collect','Out of range','Already collected','Inventory Full'];
											if(b.result === 2) {
												Pokeio.warpSpeed(currentFort.Latitude, currentFort.Longitude);
												Pokeio.Heartbeat(function(z,y) {
													Pokeio.GetFort(currentFort.FortId, currentFort.Latitude, currentFort.Longitude, function(a,b) {
														console.log('Stop status: ' + resultSet[b.result]);
													});
												});

											} else {
												console.log('Stop status: ' + resultSet[b.result]);
											}
											console.log(util.inspect(b, showHidden=false, depth=10, colorize=true));						
										});
									}

								} else {
									// "Fort" is a gym
									if(fortArr.indexOf(currentFort.FortId) === -1) {
										fortArr.push(currentFort.FortId);
										console.log('.:Fort is a gym, pass:.');
									}
								}
							}
						}
					}
				}
			});
		}, 2000);

	});

});