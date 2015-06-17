// ==UserScript==
// @name	Steam Game AutoJoin
// @namespace	https://github.com/geekahedron/SteamGameAutoJoin/
// @version	0.1
// @description	Auto-join script for 2015 Summer Steam Monster Minigame
// @match	*://steamcommunity.com/minigame
// @match	*://steamcommunity.com//minigame
// @updateURL	https://github.com/geekahedron/SteamGameAutoJoin/raw/master/autojoin.user.js
// @downloadURL	https://github.com/geekahedron/SteamGameAutoJoin/raw/master/autojoin.user.js
// @grant	none
// ==/UserScript==

function StartNewGame()
{
	var gameID = gameid2css.value;
	JoinGameID_Real(gameID);
}

function CheckAndLeaveCurrentGame( callback )
{
	var currentgame = JoinGame.toString().match(/'[0-9]*'/)[0].replace(/'/g, '');
	console.log('Current Game: ' + currentgame);

	if (currentgame == 0)
		return callback();

	$J.post(
		'http://steamcommunity.com/minigame/ajaxleavegame/',
		{ 'gameid' : currentgame, 'sessionid' : g_sessionID }
	).done( function() { callback(); }
	);
}

function JoinGameID( gameid )
{
	CheckAndLeaveCurrentGame( function() {
		JoinGameID_Real( gameid );
	});
}

function JoinGameID_Real( gameid )
{
	console.log('Trying to join room ' + gameid);

	$J.post(
		'http://steamcommunity.com/minigame/ajaxjoingame/',
		{ 'gameid' : gameid }
	).done( function( json ) {
			if ( json.success == '1' )
			{
				top.location.href = 'http://steamcommunity.com/minigame/towerattack/';
				return;
			}

			console.log('Failed to join room ' + gameid);
			JoinGameID_Real( gameid );
		}
	).fail( function( jqXHR ) {
			var responseJSON = jqXHR.responseText.evalJSON();
			if ( responseJSON.success == '24' && responseJSON.errorMsg )
				console.log( responseJSON.errorMsg );
			else if ( responseJSON.success == '25' )
				console.log('Failed to join room ' + gameid + ' - Full');
			else
				console.log('Failed to join room ' + gameid);

			JoinGameID_Real( gameid );
		}
	);
}

var game_div;
try {
    game_div = document.getElementsByClassName('current_game')[0].children[0]
    game_div.outerHTML = '<span class="gameidcss">Game ID: <input name="gameid_input" class="gameid2css" type="text" value="" onkeydown="javascript:JoinGame();"></span></br><a href="javascript:JoinGame();" class="main_btn"><span>Play Sucka!</span><a><p class="start_new">or, <a href="javascript:StartNewGame();">start a new game</a></p>'
}
catch(err) {
        game_div = document.getElementsByClassName('new_game')[0].children[0]
        game_div.outerHTML = '<span class="gameidcss">Game ID: <input name="gameid_input" class="gameid2css" type="text" value="" onkeydown="javascript:JoinGame();"></span></br><a href="javascript:JoinGame();" class="main_btn"><span>Play Sucka!</span><a>'
}
