// ==UserScript==
// @name	Steam Game AutoJoin
// @namespace	https://github.com/geekahedron/SteamGameAutoJoin/
// @version	0.4
// @description	Auto-join script for 2015 Summer Steam Monster Minigame
// @author	geekahedron
// @match	*://steamcommunity.com/minigame
// @match	*://steamcommunity.com//minigame
// @match	http://steamcommunity.com/minigame/*
// @updateURL	https://github.com/geekahedron/SteamGameAutoJoin/raw/master/autojoin.user.js
// @downloadURL	https://github.com/geekahedron/SteamGameAutoJoin/raw/master/autojoin.user.js
// @grant	none
// ==/UserScript==

//NOTE: This REQUIRES the use of GreaseMonkey or TamperMonkey
(function(w) {
    "use strict";

// http://greasemonkey.win-start.de/patterns/add-css.html
function addGlobalStyle(css)
{
	var head, style;
	head = document.getElementsByTagName('head')[0];
	if (!head) { return; }
	style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = css;
	head.appendChild(style);
}

function GetCurrentGame()
{
    var gameID = 0;
  	var play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0].children[0];
    if (play_div.innerHTML.search("Resume Your Game") === 0)
    {
      gameID = JoinGame.toString().match(/'[0-9]*'/)[0].replace(/'/g, '');
      console.log('Current game: ' + gameID);
      play_div.innerHTML = "Resume Your Game (" + gameID + ")";
    }
    return gameID;
}

function DisplayUI()
{
	var game_div = document.getElementsByClassName('section_play')[0].children[0];
	var play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0];
	GetCurrentGame();
	var sgaj_sp = document.createElement("span");
	sgaj_sp.innerHTML = '<a onClick="javascript:AutoJoinGame()" class="main_btn"><span>Auto Join Game<span></a><input type=text id="autojoinid" name="autojoinid" class="main_btn" />';
	game_div.appendChild(sgaj_sp,game_div.children[0]);
	addGlobalStyle('.section_play .current_game, .section_play .new_game {  margin-top: 10px; }');
}

// https://gist.github.com/HandsomeMatt/477c2867cea18d80306f
function CheckAndLeaveCurrentGame( callback )
{
	var currentgame = GetCurrentGame();
	if (currentgame === 0)
		return callback();
	$J.post(
		'http://steamcommunity.com/minigame/ajaxleavegame/',
		{ 'gameid' : currentgame, 'sessionid' : g_sessionID }
	).done( function() { callback(); }
	);
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

function AutoJoinGame()
{
	var gameID = document.getElementById("autojoinid").value;
	CheckAndLeaveCurrentGame( function() {
		JoinGameID_Real( gameid );
	});
}

DisplayUI();
}(window));
