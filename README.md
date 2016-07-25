# PokeGo
Pokemon GO api node.js library, still WIP<br>
Check `ExamplePromises.js`, `example.js`, and `exampleFort.js`  for examples

## Installation & Usage:
```git
$ git clone git@github.com:d-pollard/Pokemon-GO-node-api.git .
```

```javascript
var Pokeio = require('./poke.io.js'); // when using poke.io.js
var Pokego = require('./pokego.js'); // when using pokego.js
```
Check [ExamplePromises.js](./ExamplePromises.js) for the result showed in the demo or check the documentation below.

## Demo:
![alt tag](http://cl.arm4x.net/poke2.png)

## Documentation:

### Pokeio.init(username, password, location, provider, callback)

Initializes Pokeio with either pokemon trainer club credentials or google account.
Accepts locations by name or coordinates

**Parameters**
  * `username {String}` Your pokemon trainer club or google username
  * `password {String}` Your pokemon trainer club or google password
  * `location {Object}` location accepts a combination of type = 'name' & name or type = 'coords' & latitude, longitude, altitude
    * `type {String}` Must be one of ['name', 'coords']
    * `name {String}` Address for lookup using the google maps api.
    * `coords {Object}` 
      * `latitude {Number}`
      * `longitude {Number}`
      * `altitude {Number}`
  * `provider {String}` Must be one of ['ptc', 'google']
  * `callback {Function(error)}`
    * `error {Error}`

### Pokeio.GetAccessToken(username, password, callback)

Will save the access token to the Pokeio internal state.

**Parameters**
  * `username {String}` Your pokemon trainer club username
  * `password {String}` Your pokemon trainer club password
  * `callback {Function(error, token)}`
    * `error {Error}`
    * `token {String}`

### Pokeio.GetApiEndpoint(callback)

Will save the api endpoint to the Pokeio internal state.

**Parameters**
  * `callback {Function(error, api_endpoint)}`
    * `error {Error}`
    * `api_endpoint {String}`

### Pokeio.GetProfile(callback)
**Parameters**
  * `callback {Function(error, profile)}`
    * `error {Error}`
    * `profile {Object}`
      * `creation_time {Number}`
      * `username {String}`
      * `team {Number}`
      * `tutorial {Number/Boolean}`
        * `poke_storage {String}`
        * `item_storage {String}`
        * `daily_bonus {Object}`
          * `NextCollectTimestampMs {Number}`
          * `NextDefenderBonusCollectTimestampMs {Number}`
        * `currency {Object}`
          * `type {String}`
          * `amount {Number}`

### Pokeio.GetLocation(callback)
Reads current latitude and longitude and returns a human readable address using the google maps api.

**Parameters**
  * `callback {Function(error, formatted_address)}`
    * `error {Error}`
    * `formatted_address {String}`

### Pokeio.GetLocationCoords()
**Returns**
  * `coordinates {Object}`
    * `latitude {Number}`
    * `longitude {Number}`
    * `altitude {Number}`

### Pokeio.SetLocation(location, callback)

Will save cooridinates to the Pokeio internal state.
Accepts raw coordinates or location name based on the type property.

**Parameters**
  * `location {Object}`
    * `type {String}` One of ['name', 'coords']
    * `name {String}` Address for lookup using the google maps api.
    * `latitude {Number}`
    * `longitude {Number}`
    * `altitude {Number}`
  * `callback {Function(error, coordinates)}`
    * `error {Error}`
    * `coordinates {Object}`
      * `latitude {Number}`
      * `longitude {Number}`
      * `altitude {Number}`

## Thanks to:
Python demo: [tejado](https://github.com/tejado/pokemongo-api-demo) <br>
ES5 demo: [Armax](https://github.com/Armax/Pokemon-GO-node-api/) <br>


## Contact me
[@Derek](mailto:derek@heroesplay.com)
Feel free to contact me for help or anything else
