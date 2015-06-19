// ==UserScript==
// @name	[geekahedron] Steam Game AutoJoin
// @namespace	https://github.com/geekahedron/SteamGameAutoJoin/
// @version	2.2
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

//*** FOR MANUAL INSTALL (COPY-PASTE INTO CONSOLE) START COPYING HERE ***//

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
		gameID = JoinGame.toString().match(/'[0-9]*'/)[0].replace(/'/g, '');
		console.log('Current game: ' + gameID);
		play_div.innerHTML = btn_text + ' (' + gameID + ')';
	}
	else if (play_div.tagName == "SPAN")
	{
		if (play_div.innerHTML == "Play Now!")
		{
			console.log('No current game');
			gameID = 0;
		}
		else if (play_div.innerHTML == "Sign in to play!")
		{
			console.log('Not signed in');
			gameID = -1;
		}
	}
	return gameID;
}

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
	// TODO: Add UI features for users not logged in
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

function JoinGameHelper_Count( gameid, count )
{
    if (doCheck() === false) {
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
        var code = responseJSON.success;
        var msg = responseJSON.errorMsg;
        if ( code == '24' && msg )
        {
            console.log( code + ' Error joining game ' + gameid + ': ' + msg );
            if (msg.search("higher than the highest level you have completed") != -1)
            {
            	ResetUI();
            	console.log( code + ' Error joining game ' + gameid + ': ' + msg);
                ShowAlertDialog( 'Error joining ' + gameid, msg );
            }
            else if (msg.search("maximum number of players") != -1)
            {
            	console.log( code + ' Error joining game ' + gameid + ': ' + msg);
            	// 2.0.3 try a few times on a full room, just for fun
            	if (count < 5)
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
        }
        else if ( code == '25' )	// room full
        {
        	ResetUI();
        	console.log( code + ' Error joining game ' + gameid + ': it already has the maximum number of players.' );
        	ShowAlertDialog( 'Error joining ' + gameid, 'There was a problem trying to join the game: it already has the maximum number of players.' );
        }
        else if ( responseJSON.success == '28' )	// previously quit room
        {
        	ResetUI();
        	console.log( code + ' Error joining game ' + gameid + ': You have previously left this game. You cannot join this game again.' );
        	ShowAlertDialog( 'Error joining ' + gameid, 'You have previously left this game. You cannot join this game again.' );
        }
        else if ( responseJSON.success == '29' )	// currently in room
        {
        	ResetUI();
        	console.log( code + ' Error joining game ' + gameid + ': You\'ll have to leave your current game to join this game. You will not be able to rejoin your current game.');
        	CheckAndLeaveCurrentGame( function() {
        		JoinGameHelper_Count( gameid, count+1 );
        	});
        }

        else
        {
        	console.log( code + ' Error joining game ' + gameid + ': There was a problem trying to join the game.' );
        	CheckAndLeaveCurrentGame( function() {
        		JoinGameHelper_Count( gameid, count+1 );
        	});
        }
    });
}

function AutoJoinGame()
{
    StartRunning();
    var gameid = document.getElementById("autojoinid").value;
    document.getElementById("auto_btn").children[0].innerHTML = "Running..."
    console.log('Launching auto join for room: ' + gameid);
    JoinGameHelper_Count(gameid, 1);
}

// Allow redefining of function to use as state variable
function doCheck() { return false; }
function StartRunning()
{
    function doCheck() { return true; }
    function embedFunction(s) {
        document.body.appendChild(document.createElement('script')).innerHTML=s.toString().replace(/([\s\S]*?return;){2}([\s\S]*)}/,'$2');
    }
    embedFunction(doCheck);
}
function StopRunning()
{
    function doCheck() { return false; }
    function embedFunction(s) {
        document.body.appendChild(document.createElement('script')).innerHTML=s.toString().replace(/([\s\S]*?return;){2}([\s\S]*)}/,'$2');
    }
    embedFunction(doCheck);
}
DisplayUI();

//*** FOR MANUAL INSTALL (COPY-PASTE INTO CONSOLE) STOP COPYING HERE ***//


// Embed functions to be called directly from the UI
function embedFunction(s) {
	document.body.appendChild(document.createElement('script')).innerHTML=s.toString().replace(/([\s\S]*?return;){2}([\s\S]*)}/,'$2');
}

// embed other functions used by UI after loading
embedFunction(GetCurrentGame);
embedFunction(CheckAndLeaveCurrentGame);
embedFunction(JoinGameHelper_Count);
embedFunction(AutoJoinGame);
embedFunction(ResetUI);
embedFunction(doCheck);
embedFunction(StopRunning);
embedFunction(StartRunning);

}(window));
