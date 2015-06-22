// ==UserScript==
// @name	[geekahedron] Steam Game AutoJoin
// @namespace	https://github.com/geekahedron/SteamGameAutoJoin/
// @version	4.2
// @description	Auto-join script for 2015 Summer Steam Monster Minigame
// @author	geekahedron
// @match	*://steamcommunity.com/minigame
// @match	*://steamcommunity.com//minigame
// @match	*://steamcommunity.com/minigame/
// @match	*://steamcommunity.com//minigame/
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

function GetCurrentGameId()
{
	var play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0];
	if (play_div.tagName === "A")
	{
		return JoinGame.toString().match(/'[0-9]*'/)[0].replace(/'/g, '');
	}
	else if (play_div.innerHTML === "Sign in to play!")
	{
		console.log('Not signed in');
		return -1;
	}
	return 0;
}

function GetCurrentGame()
{
	var gameid = GetCurrentGameId();
	if (gameid > 0)
	{
		console.log('Current game: ' + gameid);
		var play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0].children[0];
		var paren_pos = play_div.innerHTML.search('[(]');
		var btn_text = play_div.innerHTML;
		if (paren_pos > 0) btn_text = play_div.innerHTML.substr(0,paren_pos-1);
		play_div.innerHTML = btn_text + ' (' + gameid + ')';
	}
	else if (gameid === 0)
	{
		console.log('No current game');
	}
	return gameid;
}

// Thanks to HandsomeMatt for the callback version of this function
function CheckAndLeaveCurrentGame( callback )
{
	var currentgame = GetCurrentGameId();
	if (currentgame === 0)
		return callback();
	console.log('Leaving current game: ' + currentgame);
	try {
		$J.post(
			'http://steamcommunity.com/minigame/ajaxleavegame/',
			{ 'gameid' : currentgame, 'sessionid' : g_sessionID }
		).done(
			function() { callback(); }
		);
	}
	catch(e)
	{
		console.log('Error leaving current game');
		console.log(e);
		callback();
	}
}

function ResetUI()
{
    	StopRunning();
    	ClearQueue();
    	document.getElementById("auto_btn").children[0].innerHTML = "Auto Join Game";
//    	document.getElementById("autojoinid").value = "";
    	document.getElementById("autojoinid").focus();
}

function JoinGameList(roomlist)
{
	var rooms = roomlist.toArray();
//    console.log(rooms);

	for (i = 0,x = rooms.length; i<x; i++)
	{
        var gameid = rooms[i];
//        console.log('checking: ' + gameid);
		if (gameid && gameid.match(/^\d{5}$/))	// verify 5-digit number
		{
			setTimeout(JoinGameLoop,10,gameid, 1);
			AddQueue(gameid);
		} else {
			console.log('Invalid room number: ' + gameid);
		}
	}
}

function JoinGameLoop(gameid, count)
{
	if (getPreferenceBoolean("keepRunning", false) === false) {
		ResetUI();
		console.log('Execution stopped by user');
	} else {
		console.log('(' + count + ') Joining room ' + gameid + ' [' + gameid + ']');
		try {
			$J.post('http://steamcommunity.com/minigame/ajaxjoingame/', { 'gameid' : gameid, 'sessionid' : g_sessionID })
			.done(
				function( json ) {
					if ( json.success == '1' ) {
						console.log('Success! Joining room now');
						top.location.href = 'http://steamcommunity.com/minigame/towerattack/';
					} else {
						console.log('Not successful to join game ' + gameid);
						JoinGameLoop(gameid, count+1);
					}
				}).fail(
				function( jqXHR ) {
//					console.log('Failed to join game ' + gameid);
					var responseJSON = jqXHR.responseText.evalJSON();
					HandleJoinError(gameid, count, responseJSON.success, responseJSON.errorMsg)
				}
			);
		}
		catch(e)	// 3.3 catch other errors (timeout, etc) that aren't handled by JSON
		{
			console.log('Catching error from API call');
			console.log(e);
			JoinGameLoop(gameid, count+1);
		}
	}
}

function HandleJoinError(gameid, count, code, msg)
{
	try {
		switch(code)
		{
			case 25:	// room full
				console.log( '[' + code + '] Error joining game ' + gameid + ': it already has the maximum number of players.' );
				if (getPreferenceBoolean("tryFullRooms", true) != false)
				{
					JoinGameLoop(gameid, count+1 );
				} else {
					console.log('Stopping loop on room: ' + gameid);
					RemoveQueue(gameid);
				}
				break;
			case 28:	// previously quit room
				console.log( '[' + code + '] Error joining game ' + gameid + ': You have previously left this game. You cannot join this game again.' );
				console.log('Stopping loop on room: ' + gameid);
				RemoveQueue(gameid);
				break;
			case 29:	// currently in a room
		        	console.log( '[' + code + '] Error joining game ' + gameid + ': You\'ll have to leave your current game to join this game. You will not be able to rejoin your current game.');
	        		CheckAndLeaveCurrentGame( function() {
	        			JoinGameLoop(gameid, count+1 );
				});
				break;
			case 24:	// undefined error (with message, hopefully)
				if (msg)
				{
					console.log( '[' + code + '] Error joining game ' + gameid + ': ' + msg );
					if (msg.search("higher than the highest level you have completed") != -1)
					{
						console.log('Stopping loop on room: ' + gameid);
						RemoveQueue(gameid);
					}
					else if (msg.search("maximum number of players") != -1)
					{
						if (getPreferenceBoolean("tryFullRooms", true) != false)
							{
							JoinGameLoop(gameid, count+1 );
						} else {
							console.log('Stopping loop on room: ' + gameid);
							RemoveQueue(gameid);
						}
					}
					else
					{
						console.log('Unknown error, trying to leave current room');
						CheckAndLeaveCurrentGame( function() {
							JoinGameLoop(gameid, count+1 );
						});
					}
					break;
				}	// if there is no message, assume the worst and cascade to default response
			default:
				console.log( '[' + code + '] Error joining game ' + gameid + ': There was a problem trying to join the game.' );
				console.log('Fallback error, trying to leave current room');
				CheckAndLeaveCurrentGame( function() {
					JoinGameLoop(gameid, count+1 );
				});
		} // switch
	} // try
	catch(e)
	{
		console.log('Problem handling response: ' + code + ' : ' + msg);
		console.log(e);
		JoinGameLoop(gameid,count+1);
	}
}

function AutoJoinGame()
{
	StartRunning();
	var gameid = document.getElementById("autojoinid").value;
	gameid.replace(/[^0-9,]/g,'');	// 3.2.2 try and make sure there are only valid characters
	document.getElementById("autojoinid").value = gameid;
	if (gameid.search(/\d/) > -1)	// make sure we have at least a digit in there (for future, enforce 5-digit numbers?)
	{
		var rooms = gameid.split(',');
		document.getElementById("auto_btn").children[0].innerHTML = "Running..."
		console.log('Launching auto join for room(s): ' + gameid);
		JoinGameList(rooms);
	} else {
		console.log('No room ID specified for auto join');
	}
}

function AddQueue(gameid)
{
	var list = getPreference("roomlist", '');
	var rooms = list.split(',');
	rooms.unshift(gameid+'');
	removeByValue(rooms,'');
	setPreference("roomlist",rooms.toString());
}

function RemoveQueue(gameid)
{
	var list = getPreference("roomlist", '');
	var rooms = list.split(',');
	removeByValue(rooms,gameid);
	console.log(rooms);
	setPreference("roomlist",rooms.toString());
	if (rooms.length === 0)
	{
		ResetUI();
	}
}

function ClearQueue()
{
	setPreference("roomlist", '');
}

function QueueEmpty()
{
	return getPreference("roomlist", '').length === 0;
}

function CheckKey(e)
{
	e = e || window.event;
	switch(e.keyCode)
	{
		case 13:	// enter 
			console.log('Enter pressed');
			AutoJoinGame();
			break;
		case 27:	// esc
			console.log('Esc pressed');
			StopRunning();
			break;
	}
	
}

//*** UI and preferences start here	***//

function DisplayUI()
{
	if (GetCurrentGame() >= 0)
	{
		var game_div = document.getElementsByClassName('section_play')[0].children[0];
		var play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0];
		var sgaj_sp = document.createElement("span");
		sgaj_sp.innerHTML = '<span><label for="autojoinid" class="main_btn">Game ID</label><input type="text" id="autojoinid" name="autojoinid" class="main_btn" onKeyDown="javascript:CheckKey(event)" /></span><a onClick="javascript:AutoJoinGame()" class="main_btn" id="auto_btn"><span>Auto Join Game</span></a><a onClick="javascript:StopRunning()" class="main_btn" id="stop_btn"><span>Stop</span></a>';
		game_div.appendChild(sgaj_sp,game_div.children[0]);
		document.getElementById('autojoinid').focus();
		addGlobalStyle('.section_play .current_game, .section_play .new_game {  margin-top: 10px; }');
		addGlobalStyle('#autojoinid { color: #404; background-color: #EEE; }');
		addGlobalStyle('.checklabel { color: #000; }');
	}
	
	var options1 = document.createElement("div");
	options1.className = "options_column";
	
	options1.appendChild(MakeCheckBox("tryFullRooms", "Continue when room is full", false, toggleFullRooms));
	setPreference("tryFullRooms", false);

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

function removeByValue(arr,val)
{
	for (var i = arr.length; i >= 0; --i)	// go backwards so we don't lose our place
	{
		if (arr[i] == val)
		{
			arr.splice(i,1);
		}
	}
}

function toggleFullRooms(event)
{
	var value = getPreferenceBoolean("tryFullRooms", false);
	
	setPreference("tryFullRooms", !value);
}

function MakeCheckBox(name, desc, state, listener)
{
	var label = document.createElement("label");
	var description = document.createTextNode(desc);
	var checkbox = document.createElement("input");

	checkbox.type = "checkbox";
	checkbox.name = name;
	checkbox.checked = state;
	checkbox.onclick = listener;
	
	label.className = "checklabel";

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
    console.log('embedding: ' + s.name);
	document.body.appendChild(document.createElement('script')).innerHTML=s.toString().replace(/([\s\S]*?return;){2}([\s\S]*)}/,'$2');
}

// embed other functions used by UI after loading
embedFunction(GetCurrentGameId);
embedFunction(GetCurrentGame);
embedFunction(CheckAndLeaveCurrentGame);
embedFunction(JoinGameList);
embedFunction(JoinGameLoop);
embedFunction(HandleJoinError);
embedFunction(AutoJoinGame);
embedFunction(AddQueue);
embedFunction(RemoveQueue);
embedFunction(ClearQueue);
embedFunction(QueueEmpty);
embedFunction(ResetUI);
embedFunction(removeByValue);
embedFunction(MakeCheckBox);
embedFunction(toggleFullRooms);
embedFunction(StopRunning);
embedFunction(StartRunning);
embedFunction(setPreference);
embedFunction(getPreference);
embedFunction(getPreferenceBoolean);
embedFunction(CheckKey);

}(window));
