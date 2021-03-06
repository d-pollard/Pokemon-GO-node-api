'use strict';

const request = require('request');
const geocoder = require('geocoder');
const events = require('events');
const ProtoBuf = require('protobufjs');
const GoogleOAuth = require('gpsoauthnode');
const Long = require('long');
const ByteBuffer = require('bytebuffer');

const s2 = require('s2geometry-node');
const Logins = require('./auth');
const fs = require('fs');
const pokemonlist = JSON.parse(fs.readFileSync(__dirname + '/pokemons.json', 'utf8'));

let builder = ProtoBuf.loadProtoFile('pokemon.proto');
if (builder === null) {
	builder = ProtoBuf.loadProtoFile(__dirname + '/pokemon.proto');
}

const pokemonProto = builder.build();
const {RequestEnvelop, ResponseEnvelop} = pokemonProto;

const EventEmitter = events.EventEmitter;

const api_url = 'https://pgorelease.nianticlabs.com/plfe/rpc';

function GetCoords(self) {
	let {latitude, longitude} = self.playerInfo;
	return [latitude, longitude];
};


function getNeighbors(lat, lng) {
	var origin = new s2.S2CellId(new s2.S2LatLng(lat, lng)).parent(15);
	var walk = [origin.id()];
	// 10 before and 10 after
	var next = origin.next();
	var prev = origin.prev();
	for (var i = 0; i < 10; i++) {
		// in range(10):
		walk.push(prev.id());
		walk.push(next.id());
		next = next.next();
		prev = prev.prev();
	}
	return walk;
}

function Pokego() {
	var self = this;
	self.events = new EventEmitter();
	self.j = request.jar();
	self.request = request.defaults({jar: self.j});

	self.google = new GoogleOAuth();

	self.playerInfo = {
		accessToken: '',
		debug: true,
		latitude: 0,
		longitude: 0,
		altitude: 0,
		locationName: '',
		provider: '',
		apiEndpoint: '',
		tokenExpire: 0
	};

	self.myStats = false;

	self.DebugPrint = function (str) {
		if (self.playerInfo.debug === true) {
			//self.events.emit('debug',str)
			console.log(str);
		}
	};

	self.pokemonlist = pokemonlist.pokemon;

	function api_req(api_endpoint, access_token, req) {
		// Auth
		var auth = new RequestEnvelop.AuthInfo({
			provider: self.playerInfo.provider,
			token: new RequestEnvelop.AuthInfo.JWT(access_token, 59)
		});

		var f_req = new RequestEnvelop({
			unknown1: 2,
			rpc_id: 1469378659230941192,

			requests: req,

			latitude: self.playerInfo.latitude,
			longitude: self.playerInfo.longitude,
			altitude: self.playerInfo.altitude,

			auth: auth,
			unknown12: 989
		});

		var protobuf = f_req.encode().toBuffer();

		var options = {
			url: api_endpoint,
			body: protobuf,
			encoding: null,
			headers: {
				'User-Agent': 'Niantic App'
			}
		};

		return new Promise(function(resolve, reject) {

			self.request.post(options, function (err, response, body) {
				if (response === undefined || body === undefined) {
					console.error('[!] RPC Server offline');
					return reject('Error');
				}

				try {
					var f_ret = ResponseEnvelop.decode(body);
				} catch (e) {
					if (e.decoded) { // Truncated
						console.warn(e);
						f_ret = e.decoded; // Decoded message with missing required fields
						resolve(f_ret);
					}
				}
				if (f_ret) {
					return resolve(f_ret);
				}
				else {
					api_req(api_endpoint, access_token, req)
				}
			});
		});
	}


	self.init = function(username, password, location, provider) {
		console.log('..:: Initializing the API ::..');
		return new Promise(function(resolve, reject) {
			if(provider !== 'ptc' && provider !== 'google') {
				return reject('Provider is not supported');
			} else {
				self.playerInfo.provider = provider;
				self.SetLocation(location).then((val) => {
					self.GetAccessToken(username, password).then((val) => {
						self.GetApiEndpoint().then((val) => {
							return resolve(val);
						})
						.catch((err) => {
							console.log(err);
						});
					})
					.catch((err) => {
						console.log(err);
					});
				})
				.catch((err) => {
					console.log(err);
				});
			}
		});
	};

	self.GetAccessToken = function (user, pass, callback) {
		return new Promise(function(resolve, reject) {
			self.DebugPrint('[i] Logging with user: ' + user);
			if(self.playerInfo.provider === 'ptc') {
				Logins.PokemonClub(user, pass, self).then((token) => {
					self.playerInfo.accessToken = token[0];
					self.playerInfo.tokenExpire = token[1];
					self.DebugPrint('[i] Received PTC access token! { Expires: ' + token[1] + ' }');
					return resolve(token[0]);
				}).catch((err) => {
					return reject('[x] There was an error logging in. Please try again.')
				});
			} else {
				Logins.GoogleAccount(user, pass, self).then((token) => {
					self.playerInfo.accessToken = token[0];
					self.playerInfo.tokenExpire = token[1];
					self.DebugPrint('[i] Received Google access token! {Expires: ' + token[1] + '}');
					return resolve(token[0]);
				});
			}
		});
	};


	self.GetApiEndpoint = function () {
		return new Promise(function(resolve, reject) {
			var req = [
				new RequestEnvelop.Requests(2),
				new RequestEnvelop.Requests(126),
				new RequestEnvelop.Requests(4),
				new RequestEnvelop.Requests(129),
				new RequestEnvelop.Requests(5)
			];
			api_req(api_url, self.playerInfo.accessToken, req).then((f_ret) => {
				var apiEndpoint = `https://${f_ret.api_url}/rpc`;
				if(apiEndpoint === 'https://null/rpc') {
				   return reject('[x] There seams to be an issue. Please try again.') 
				}
				self.playerInfo.apiEndpoint = apiEndpoint;
				self.DebugPrint('[i] Received API Endpoint: ' + apiEndpoint);
				return resolve(apiEndpoint);
			});
		});
	};
	
	self.GetInventory = function() {
		return new Promise(function(resolve, reject) {
			var req = new RequestEnvelop.Requests(4);

			api_req(self.playerInfo.apiEndpoint, self.playerInfo.accessToken, req).then((f_ret) => {
				var inventory = ResponseEnvelop.GetInventoryResponse.decode(f_ret.payload[0]);
				return resolve(inventory);   
			}).catch((val) => {
				console.log(val);
			});
		});
	};

	self.displayInventory = function(data) {
		//console.log(data);
		var inventory = data.inventory_delta.inventory_items;
		// console.log(inventory.length);
		for (var i = inventory.length - 1; i >= 0; i--) {
			var x = inventory[i];
			var pokemon = x.inventory_item_data.pokemon;
			var item = x.inventory_item_data.item;
			var candy = x.inventory_item_data.pokemon_family;
			var stats = x.inventory_item_data.player_stats;
			if(pokemon !== null && pokemon.pokemon_id !== null) {
				// item is a pokemon
				var pkmn = self.pokemonlist[parseInt(pokemon.pokemon_id)-1];
				console.log(pkmn.name + ' -> ' + pokemon.cp + 'cp ');
			} else if(item !== null && item.item !== null) {
				// item is an actual item
				console.log(self.whatItem(item.item) + ' -> ' + (item.count || 0) + ' count');
			} else if(candy !== null && candy.family_id !== null){
				// item is a candy
				console.log(self.whatFamily(candy.family_id) + ' -> ' + (candy.candy || 0) + ' count');	
			} else if(pokemon !== null && pokemon.is_egg === true) {
				// item *might be* an egg
				console.log('An egg');
			} else if(stats !== null) {
				console.log(stats);
			} else {
				// console.log(x);
			}
		}
	};

	self.getStats = function() {
		return new Promise(function(resolve, reject) {
			self.GetInventory().then((data) => {
				var inventory = data.inventory_delta.inventory_items;
				for (var i = inventory.length - 1; i >= 0; i--) {
					var x = inventory[i];
					var stats = x.inventory_item_data.player_stats;
					if(stats !== null) {
						// console.log(stats);
						self.myStats = stats;
						return resolve(stats);
					} else {
						continue;
					}
				}
			});
		});
	};

	self.GetProfile = function () {
		return new Promise(function(resolve, reject) {
			var req = new RequestEnvelop.Requests(2);
			api_req(self.playerInfo.apiEndpoint, self.playerInfo.accessToken, req).then((f_ret) => {
				var profile = ResponseEnvelop.ProfilePayload.decode(f_ret.payload[0]).profile
				if (profile.username) {
					self.DebugPrint('[i] Player Profile');
				}
				return resolve(profile);
			}).catch((err) => {
				console.log(err);
			});
		});
	};

	// IN DEVELPOMENT, YES WE KNOW IS NOT WORKING ATM
	self.Heartbeat = function () {
		let { apiEndpoint, accessToken } = self.playerInfo;


		var nullbytes = new Array(21);
		nullbytes.fill(0);

		// Generating walk data using s2 geometry
		var walk = getNeighbors(self.playerInfo.latitude, self.playerInfo.longitude).sort(function (a, b) {
			return a > b;
		});

		// Creating MessageQuad for Requests type=106
		var walkData = new RequestEnvelop.MessageQuad({
			'f1': walk,
			'f2': nullbytes,
			'lat': self.playerInfo.latitude,
			'long': self.playerInfo.longitude
		});

		var req = [new RequestEnvelop.Requests(106, walkData.encode().toBuffer()), new RequestEnvelop.Requests(126), new RequestEnvelop.Requests(4, new RequestEnvelop.Unknown3(Date.now().toString()).encode().toBuffer()), new RequestEnvelop.Requests(129), new RequestEnvelop.Requests(5, new RequestEnvelop.Unknown3('05daf51635c82611d1aac95c0b051d3ec088a930').encode().toBuffer())];
		return new Promise(function(resolve, reject) {
			api_req(apiEndpoint, accessToken, req).then((data) => {
				if (!data || !data.payload || !data.payload[0]) {
					return reject('No data. API Failure.');
				}
				var heartbeat = ResponseEnvelop.HeartbeatPayload.decode(data.payload[0]);
				return resolve(heartbeat);
			}).catch((err) => {
				console.log(err);
			});
		}).catch((err) => {
			console.log(err);
		});
	};

	self.GetLocation = function () {
		geocoder.reverseGeocode(...GetCoords(self), function (err, data) {
			if (data.status === 'ZERO_RESULTS') {
				return callback(new Error('location not found'));
			}
			callback(null, data.results[0].formatted_address);
		});
	};

	self.fireAndForgetCatch = function(catchablePokemon, name, cnt, ball) {
		if(ball === 'POKE_BALL') { ball = 1; } else if(ball === 'GREAT_BALL') { ball = 2; } else { ball = 3; }
		return new Promise(function(resolve, reject) {
			self.EncounterPokemon(catchablePokemon).then((data) => {
				self.CatchPokemon(data.WildPokemon, ball).then((final) => {
					var status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
					if(final.Status == null) {
						console.log('[x] Error: You have no more of that ball left to use!');
					} else {
						console.log('[s] Catch status for ' + name + ': ' + status[parseInt(final.Status)]);
					}
					return resolve(cnt);
				}).catch((err) => {
					console.log(err);
				});
			}).catch((err) => {
				console.log(err);
			});
		});
	};

	self.CatchPokemon = function (mapPokemon, pokeball) {
		console.log('Attempting to catch now...');
		// console.log(mapPokemon);
		let {apiEndpoint, accessToken} = self.playerInfo;
		var catchPokemon = new RequestEnvelop.CatchPokemonMessage({
			'encounter_id': mapPokemon.EncounterId,
			'pokeball': pokeball,
			'normalized_reticle_size': 1.950,
			'spawnpoint_id': mapPokemon.SpawnPointId,
			'hit_pokemon': true,
			'spin_modifier': 1,
			'normalized_hit_position': 1
		});

		var req = new RequestEnvelop.Requests(103, catchPokemon.encode().toBuffer());
		return new Promise(function(resolve, reject) {
			api_req(apiEndpoint, accessToken, req).then((data) => {
				if (!data || !data.payload || !data.payload[0]) {
					return reject(data);
				}
				var catchPokemonResponse = ResponseEnvelop.CatchPokemonResponse.decode(data.payload[0]);
				return resolve(catchPokemonResponse);
			}); 
		});
	};

	self.EncounterPokemon = function (catchablePokemon) {
		// console.log(catchablePokemon);
		let {apiEndpoint, accessToken, latitude, longitude} = self.playerInfo;

		var encounterPokemon = new RequestEnvelop.EncounterMessage({
			'encounter_id': catchablePokemon.EncounterId,
			'spawnpoint_id': catchablePokemon.SpawnPointId,
			'player_latitude': latitude,
			'player_longitude': longitude
		});

		// console.log(encounterPokemon);

		var req = new RequestEnvelop.Requests(102, encounterPokemon.encode().toBuffer());

		return new Promise(function(resolve, reject) {

			api_req(apiEndpoint, accessToken, req).then((data) => {
				if (!data || !data.payload || !data.payload[0]) {
					return reject(data);
				}
				var catchPokemonResponse = ResponseEnvelop.EncounterResponse.decode(data.payload[0]);
				// console.log(catchPokemonResponse);
				return resolve(catchPokemonResponse);
			});
		});
	};

	self.GetLocationCoords = function () {
		let {latitude, longitude, altitude} = self.playerInfo;
		return {latitude, longitude, altitude};
	};

	self.setCoords = function(lt,ln) {
		self.playerInfo.latitude = lt;
		self.playerInfo.longitude = ln;
		return true;
	};

	self.SetLocation = function (location) {
		return new Promise(function(resolve, reject) {
			if (location.type !== 'name' && location.type !== 'coords') {
				return reject('You need to add a location name OR coordinates. API Failure.');
			} else {
				if (location.type === 'name') {
					if(location.name === 'name' || location.name === '') {
						return reject('You need to add a location name OR coordinates. API Failure.');
					} else {
						let locationName = location.name;
						geocoder.geocode(locationName, function(err, data) {
							if(err || data.status === 'ZERO_RESULTS') {
								return reject('Location not found. API Failure.');
							} else {
								let {lat, lng} = data.results[0].geometry.location;
								self.setCoords(lat, lng);
								self.playerInfo.locationName = locationName;

								return resolve(self.GetLocationCoords());
							}
						});
					}
				} else if(location.type === 'coords') {
					if(!location.coords) {
						return reject('Coordinates are missing. API Failure.');
					} else {
						self.playerInfo.latitude = location.coords.latitude || self.playerInfo.latitude;
						self.playerInfo.longitude = location.coords.longitude || self.playerInfo.longitude;
						self.playerInfo.altitude = location.coords.altitude || self.playerInfo.altitude;

						geocoder.reverseGeocode(...GetCoords(self), function(err, data) {
							if (data.status !== 'ZERO_RESULTS' && data.results && data.results[0]) {
								self.playerInfo.locationName = data.results[0].formatted_address;
							} 
							return resolve(self.GetLocationCoords());
						});
					}

				} else {
					return reject('No data passed. API failure.')
				}
			}
		});
	};

	self.changePosition = function () {
		self.playerInfo.longitude = self.playerInfo.longitude + 0.000055;
		self.playerInfo.latitude = self.playerInfo.latitude + 0.000055;
		return true;
	};

	self.hatchEggs = function(cb) {
		self.changePosition();
		self.Heartbeat(cb);
	};

	self.GetFort = function(fortid, fortlat, fortlong, callback) {
		var FortMessage = new RequestEnvelop.FortSearchMessage({
			'fort_id': fortid,
			'player_latitude': fortlat,
			'player_longitude': fortlong,
			'fort_latitude': fortlat,
			'fort_longitude': fortlong
		});

		var req = new RequestEnvelop.Requests(101, FortMessage.encode().toBuffer());
		return new Promise(function(resolve, reject) {
			api_req(self.playerInfo.apiEndpoint, self.playerInfo.accessToken, req).then((err, f_ret) => {
				if (err) {
					return reject(err);
				} else if (!f_ret || !f_ret.payload || !f_ret.payload[0]) {
					return reject('No result');
				}

				var FortSearchResponse = ResponseEnvelop.FortSearchResponse.decode(f_ret.payload[0]);
				return resolve(FortSearchResponse);
			});
		});
	};

	self.warpSpeed = function(lat,long) {
		self.playerInfo.latitude = lat;
		self.playerInfo.longitude = long;
		return true;
	};

	self.formatPlayercard = function(profile) {
		let team = ['Nuetral','Mystic','Valor','Instinct'];
		console.log('[o] -> Player: ' + profile.username);
		console.log('[o] -> Team: ' + team[profile.team]);
		console.log('[o] -> Created: ' + self.timeConverter(parseInt(profile.creation_time)));
		console.log('[o] -> Poke Storage: ' + profile.poke_storage);
		console.log('[o] -> Item Storage: ' + profile.item_storage);
		console.log('[o] -> Poke Coin: ' + profile.currency[0].amount);
		console.log('[o] -> Star Dust: ' + profile.currency[1].amount);
		console.log('[o] -> location lat:' + self.playerInfo.latitude + ' lng: ' + self.playerInfo.longitude);
		return true;
	};



	self.timeConverter = function(x){
		var a = new Date(x);
		var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		var year = a.getFullYear();
		var month = months[a.getMonth()];
		var date = a.getDate();
		var hour = a.getHours();
		var min = a.getMinutes();
		var sec = a.getSeconds();
		var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
		return time;
	}

	self.whatItem = function(x) {
		var itemsArr = { 1: 'ITEM_POKE_BALL', 2: 'ITEM_GREAT_BALL', 3: 'ITEM_ULTRA_BALL', 4: 'ITEM_MASTER_BALL', 101: 'ITEM_POTION', 102: 'ITEM_SUPER_POTION', 103: 'ITEM_HYPER_POTION', 104: 'ITEM_MAX_POTION', 201: 'ITEM_REVIVE', 301: 'ITEM_LUCKY_EGG', 401: 'ITEM_INCENSE_ORDINARY', 402: 'ITEM_INCENSE_SPICY', 403: 'ITEM_INCENSE_COOL', 404: 'ITEM_INCENSE_FLORAL', 501: 'ITEM_TROY_DISK', 602: 'ITEM_X_ATTACK', 603: 'ITEM_X_DEFENSE', 604: 'ITEM_X_MIRACLE', 701: 'ITEM_RAZZ_BERRY', 702: 'ITEM_BLUK_BERRY', 703: 'ITEM_NANAB_BERRY', 704: 'ITEM_WEPAR_BERRY', 705: 'ITEM_PINAP_BERRY', 801: 'ITEM_SPECIAL_CAMERA', 901: 'ITEM_INCUBATOR_BASIC_UNLIMITED', 902: 'ITEM_INCUBATOR_BASIC', 1001: 'ITEM_POKEMON_STORAGE_UPGRADE', 1002: 'ITEM_ITEM_STORAGE_UPGRADE'}; 
		return itemsArr[x];
	};

	self.whatFamily = function(x) {
		var candyClass = {0: 'FAMILY_UNSET', 1: 'FAMILY_BULBASAUR', 4: 'FAMILY_CHARMANDER', 7: 'FAMILY_SQUIRTLE', 10: 'FAMILY_CATERPIE', 13: 'FAMILY_WEEDLE', 16: 'FAMILY_PIDGEY', 19: 'FAMILY_RATTATA', 21: 'FAMILY_SPEAROW', 23: 'FAMILY_EKANS', 25: 'FAMILY_PIKACHU', 27: 'FAMILY_SANDSHREW', 29: 'FAMILY_NIDORAN_FEMALE', 32: 'FAMILY_NIDORAN_MALE', 35: 'FAMILY_CLEFAIRY', 37: 'FAMILY_VULPIX', 39: 'FAMILY_JIGGLYPUFF', 41: 'FAMILY_ZUBAT', 43: 'FAMILY_ODDISH', 46: 'FAMILY_PARAS', 48: 'FAMILY_VENONAT', 50: 'FAMILY_DIGLETT', 52: 'FAMILY_MEOWTH', 54: 'FAMILY_PSYDUCK', 56: 'FAMILY_MANKEY', 58: 'FAMILY_GROWLITHE', 60: 'FAMILY_POLIWAG', 63: 'FAMILY_ABRA', 66: 'FAMILY_MACHOP', 69: 'FAMILY_BELLSPROUT', 72: 'FAMILY_TENTACOOL', 74: 'FAMILY_GEODUDE', 77: 'FAMILY_PONYTA', 79: 'FAMILY_SLOWPOKE', 81: 'FAMILY_MAGNEMITE', 83: 'FAMILY_FARFETCHD', 84: 'FAMILY_DODUO', 86: 'FAMILY_SEEL', 88: 'FAMILY_GRIMER', 90: 'FAMILY_SHELLDER', 92: 'FAMILY_GASTLY', 95: 'FAMILY_ONIX', 96: 'FAMILY_DROWZEE', 97: 'FAMILY_HYPNO', 98: 'FAMILY_KRABBY', 100: 'FAMILY_VOLTORB', 102: 'FAMILY_EXEGGCUTE', 104: 'FAMILY_CUBONE', 106: 'FAMILY_HITMONLEE', 107: 'FAMILY_HITMONCHAN', 108: 'FAMILY_LICKITUNG', 109: 'FAMILY_KOFFING', 110: 'FAMILY_DEREK', 111: 'FAMILY_RHYHORN', 113: 'FAMILY_CHANSEY', 114: 'FAMILY_TANGELA', 115: 'FAMILY_KANGASKHAN', 116: 'FAMILY_HORSEA', 118: 'FAMILY_GOLDEEN', 120: 'FAMILY_STARYU', 122: 'FAMILY_MR_MIME', 123: 'FAMILY_SCYTHER', 124: 'FAMILY_JYNX', 125: 'FAMILY_ELECTABUZZ', 126: 'FAMILY_MAGMAR', 127: 'FAMILY_PINSIR', 128: 'FAMILY_TAUROS', 129: 'FAMILY_MAGIKARP', 131: 'FAMILY_LAPRAS', 132: 'FAMILY_DITTO', 133: 'FAMILY_EEVEE', 137: 'FAMILY_PORYGON', 138: 'FAMILY_OMANYTE', 140: 'FAMILY_KABUTO', 142: 'FAMILY_AERODACTYL', 143: 'FAMILY_SNORLAX', 144: 'FAMILY_ARTICUNO', 145: 'FAMILY_ZAPDOS', 146: 'FAMILY_MOLTRES', 147: 'FAMILY_DRATINI', 150: 'FAMILY_MEWTWO', 151: 'FAMILY_MEW'};
		return candyClass[x];
	};


};

module.exports = new Pokego();
module.exports.Pokego = Pokego;
