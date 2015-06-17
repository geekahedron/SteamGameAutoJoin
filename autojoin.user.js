// ==UserScript==
// @name	Steam Game AutoJoin
// @namespace	https://github.com/geekahedron/SteamGameAutoJoin/
// @version	0.2
// @description	Auto-join script for 2015 Summer Steam Monster Minigame
// @author	geekahedron
// @match	*://steamcommunity.com/minigame
// @match	*://steamcommunity.com//minigame
// @updateURL	https://github.com/geekahedron/SteamGameAutoJoin/raw/master/autojoin.user.js
// @downloadURL	https://github.com/geekahedron/SteamGameAutoJoin/raw/master/autojoin.user.js
// @grant	none
// ==/UserScript==

// http://greasemonkey.win-start.de/patterns/add-css.html

function addGlobalStyle(css)
{
	var sgaj_head, sgaj_style;
	sgaj_head = document.getElementsByTagName('head')[0];
	if (!sgaj_head) { return; }
	sgaj_style = document.createElement('style');
	sgaj_style.type = 'text/css';
	sgaj_style.innerHTML = css;
	head.appendChild(sgaj_style);
}

function GetCurrentGame()
{	
	return JoinGame.toString().match(/'[0-9]*'/)[0].replace(/'/g, '');
}

function DisplayUI()
{
	var game_div = document.getElementsByClassName('section_play')[0].children[0];
	var play_div = document.getElementsByClassName('section_play')[0].children[1];
	if (play_div.className = "current_game")
	{
		var current = GetCurrentGame();
		play_div.children[0].children[0].children[0].innerHTML = "Resume Your Game (" + current + ")";
	}
	var sgaj_sp = document.createElement("span");
	sgaj_sp.innerHTML = '<a onClick="javascript:AutoJoinGame()" class="main_btn"><span>Auto Join Game<span></a><input type=text id="autojoinid" name="autojoinid" class="main_btn" />';
	game_div.appendChild(sgaj_sp,game_div.children[0]);
	addGlobalStyle('.section_play .current_game, .section_play .new_game {  margin-top: 10px; }');
	
}

function CheckAndLeaveCurrentGame( callback )
{
	var sgaj_currentgame = GetCurrentGame();
	console.log('Current Game: ' + sgaj_currentgame);

	if (sgaj_currentgame == 0)
		return callback();

	$J.post(
		'http://steamcommunity.com/minigame/ajaxleavegame/',
		{ 'gameid' : sgaj_currentgame, 'sessionid' : g_sessionID }
	).done( function() { callback(); }
	);
}

function AutoJoinGame(gameID)
{
	var sgaj_gameID = document.getElementById("autojoinid").value;
	CheckAndLeaveCurrentGame( function() {
		JoinGameID_Real( sgaj_gameID );
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
function embedFunction(s) {
document.body.appendChild(document.createElement('script')).innerHTML=s.toString().replace(/([\s\S]*?return;)
{2}([\s\S]*)}/,'$2');
}

embedFunction(GetCurrentGame);
embedFunction(CheckAndLeaveCurrentGame);
embedFunction(AutoJoinGame);
embedFunction(JoinGameID_Real);

DisplayUI();
