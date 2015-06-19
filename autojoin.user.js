// ==UserScript==
// @name	[geekahedron] Steam Game AutoJoin
// @namespace	https://github.com/geekahedron/SteamGameAutoJoin/
// @version	2.5
// @description	Auto-join script for 2015 Summer Steam Monster Minigame
// @author	geekahedron
// @match	*://steamcommunity.com/minigame
// @match	*://steamcommunity.com//minigame
// @match	http://steamcommunity.com/minigame/
// @updateURL	https://raw.githubusercontent.com/geekahedron/SteamGameAutoJoin/master/autojoin.user.js
// @downloadURL	https://raw.githubusercontent.com/geekahedron/SteamGameAutoJoin/master/autojoin.user.js
// @grant	none
// ==/UserScript==

//NOTE: This REQUIRES the use of GreaseMonkey or TamperMonkey
(function(w) {
    "use strict";

//**********************************************************************//
//*** FOR MANUAL INSTALL (COPY-PASTE INTO CONSOLE) START COPYING HERE ***//
//**********************************************************************//

function GetCurrentGame()
{
	var gameid = 0;
	var play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0];
	if (play_div.tagName == "A") // Resume your game button
	{
		play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0].children[0];

//! 1.9 removed the hardcoded text check to allow for other languages
//		if (play_div.innerHTML.search("Resume Your Game") != 0) {

// check to see if we've already posted the room number
		var paren_pos = play_div.innerHTML.search('[(]');
		var btn_text = play_div.innerHTML;
		if (paren_pos > 0) btn_text = play_div.innerHTML.substr(0,paren_pos-1);
		gameid = JoinGame.toString().match(/'[0-9]*'/)[0].replace(/'/g, '');
		console.log('Current game: ' + gameid);
		play_div.innerHTML = btn_text + ' (' + gameid + ')';
	}
	else if (play_div.tagName == "SPAN")	// no game or not logged in
	{
		if (play_div.innerHTML == "Play Now!")
		{
			console.log('No current game');
			gameid = 0;
		}
		else if (play_div.innerHTML == "Sign in to play!")
		{
			console.log('Not signed in');
			gameid = -1;
		}
	}
	return gameid;
}

// Thanks to HandsomeMatt for the callback version of this function
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

function ResetUI()
{
    	StopRunning();
    	document.getElementById("auto_btn").children[0].innerHTML = "Auto Join Game"
    	document.getElementById("autojoinid").value = "";
    	document.getElementById("autojoinid").focus();
}

function HandleJoinError(gameid, count, code, msg)
{
	switch(code)
	{
		case 25:	// room full
			console.log( code + ' Error joining game ' + gameid + ': it already has the maximum number of players.' );
			if (getPreferenceBoolean("tryFullRooms", false) === true)
			{
				JoinGameHelper_Count( gameid, count+1 );
			} else {
				ResetUI();
				ShowAlertDialog( 'Error joining ' + gameid, 'There was a problem trying to join the game: it already has the maximum number of players.' );
			}
			break;
		case 28:	// previously quit room
			ResetUI();
        	console.log( code + ' Error joining game ' + gameid + ': You have previously left this game. You cannot join this game again.' );
        	ShowAlertDialog( 'Error joining ' + gameid, 'You have previously left this game. You cannot join this game again.' );
			break;
		case 29:	// currently in a room
        	ResetUI();
        	console.log( code + ' Error joining game ' + gameid + ': You\'ll have to leave your current game to join this game. You will not be able to rejoin your current game.');
        	CheckAndLeaveCurrentGame( function() {
        		JoinGameHelper_Count( gameid, count+1 );
			});
			break;
		case 24:	// undefined error (with message, hopefully)
			if (msg)
			{
				console.log( code + ' Error joining game ' + gameid + ': ' + msg );
				if (msg.search("higher than the highest level you have completed") != -1)
				{
					ResetUI();
					ShowAlertDialog( 'Error joining ' + gameid, msg );
				}
				else if (msg.search("maximum number of players") != -1)
				{
					if (getPreferenceBoolean("tryFullRooms", false) === true)
						{
						JoinGameHelper_Count(gameid, count+1);
					} else {
						ResetUI();
						ShowAlertDialog( 'Error joining ' + gameid, msg );
					}
				}
				else
				{
					CheckAndLeaveCurrentGame( function() {
						JoinGameHelper_Count( gameid, count+1 );
					});
				}
				break;
			}	// if there is no message, assume the worst and cascade to default response
		default:
			console.log( code + ' Error joining game ' + gameid + ': There was a problem trying to join the game.' );
			CheckAndLeaveCurrentGame( function() {
				JoinGameHelper_Count( gameid, count+1 );
			});
	}
}

function JoinGameHelper_Count( gameid, count )
{
    if (getPreferenceBoolean("keepRunning", false) === false) {
    	ResetUI();
        console.log('Execution stopped by user');
        return;
    }
    console.log('Attempting to join game ' + gameid + ' (Attempt ' + count + ')');
    $J.post(
        'http://steamcommunity.com/minigame/ajaxjoingame/',
        { 'gameid' : gameid, 'sessionid' : g_sessionID }
    ).done( function( json ) {
        if ( json.success == '1' )
        {
            top.location.href = 'http://steamcommunity.com/minigame/towerattack/';
        }
        else
        {
            console.log('Failed to join game ' + gameid);
            JoinGameHelper_Count(gameid, count+1);
        }
    }
    ).fail( function( jqXHR ) {
        var responseJSON = jqXHR.responseText.evalJSON();
        HandleJoinError(gameid, count, responseJSON.success, responseJSON.errorMsg)
    });
}

function AutoJoinGame()
{
    StartRunning();
    var gameid = document.getElementById("autojoinid").value;
	if (gameid)
	{
		document.getElementById("auto_btn").children[0].innerHTML = "Running..."
		console.log('Launching auto join for room: ' + gameid);
		JoinGameHelper_Count(gameid, 1);
	} else {
		console.log('No room ID specified for auto join');
	}
}

//*** UI and preferences start here	***//

function DisplayUI()
{
	if (GetCurrentGame() >= 0)
	{
		var game_div = document.getElementsByClassName('section_play')[0].children[0];
		var play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0];
		GetCurrentGame();
		var sgaj_sp = document.createElement("span");
		sgaj_sp.innerHTML = '<span><label for="autojoinid" class="main_btn">Game ID</label><input type="text" id="autojoinid" name="autojoinid" class="main_btn" /></span><a onClick="javascript:AutoJoinGame()" class="main_btn" id="auto_btn"><span>Auto Join Game</span></a><a onClick="javascript:StopRunning()" class="main_btn" id="stop_btn"><span>Stop</span></a>';
		game_div.appendChild(sgaj_sp,game_div.children[0]);
		document.getElementById('autojoinid').focus();
		addGlobalStyle('.section_play .current_game, .section_play .new_game {  margin-top: 10px; }');
		addGlobalStyle('#autojoinid { color: #404; background-color: #EEE; }');
	}
	
	var options1 = document.createElement("div");
	options1.className = "options_column";
	
	options1.appendChild(MakeCheckBox("tryFullRooms", "Continue when room is full", false, toggleFullRooms));

	game_div.appendChild(options1);

	// TODO: Add UI features for users not logged in
}

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

function toggleFullRooms(event)
{
	var value = getPreferenceBoolean("tryFullRooms", false);
	
	setPreferenceBoolen("tryFullRooms", !value);
}

function MakeCheckBox(name, desc, state, listener)
{
	var asterisk = document.createElement('span');
	asterisk.className = "asterisk";
	asterisk.appendChild(document.createTextNode("*"));

	var label = document.createElement("label");
	var description = document.createTextNode(desc);
	var checkbox = document.createElement("input");

	checkbox.type = "checkbox";
	checkbox.name = name;
	checkbox.checked = state;
	checkbox.onclick = listener;
	w[checkbox.name] = checkbox.checked;

	label.appendChild(checkbox);
	label.appendChild(description);
	label.appendChild(document.createElement("br"));
	return label;
}

function setPreference(key, value) {
	try {
		if(localStorage !== 'undefined') {
			localStorage.setItem('steamdb-minigame-wormholers/' + key, value);
		}
	} catch (e) {
		console.log(e); // silently ignore error
	}
}

function getPreference(key, defaultValue) {
	try {
		if(localStorage !== 'undefined') {
			var result = localStorage.getItem('steamdb-minigame-wormholers/' + key);
			return (result !== null ? result : defaultValue);
		}
	} catch (e) {
		console.log(e); // silently ignore error
		return defaultValue;
	}
}

function getPreferenceBoolean(key, defaultValue) {
	return (getPreference(key, defaultValue.toString()) == "true");
}

// Allow redefining of function to use as state variable
setPreference("keepRunning", false);
function StartRunning()
{
	setPreference("keepRunning", true);
}
function StopRunning()
{
	setPreference("keepRunning", false);
}
DisplayUI();

//*********************************************************************//
//*** FOR MANUAL INSTALL (COPY-PASTE INTO CONSOLE) STOP COPYING HERE ***//
//*********************************************************************//

// Embed functions to be called directly from the UI in *-monkey installations
function embedFunction(s) {
	document.body.appendChild(document.createElement('script')).innerHTML=s.toString().replace(/([\s\S]*?return;){2}([\s\S]*)}/,'$2');
}

// embed other functions used by UI after loading
embedFunction(GetCurrentGame);
embedFunction(CheckAndLeaveCurrentGame);
embedFunction(HandleJoinError);
embedFunction(JoinGameHelper_Count);
embedFunction(AutoJoinGame);
embedFunction(ResetUI);
embedFunction(MakeCheckBox);
embedFunction(toggleFullRooms);
embedFunction(StopRunning);
embedFunction(StartRunning);
embedFunction(setPreference);
embedFunction(getPreference);
embedFunction(getPreferenceBoolean);

}(window));
