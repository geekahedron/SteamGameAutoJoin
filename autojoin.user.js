// ==UserScript==
// @name	Steam Game AutoJoin
// @namespace	https://github.com/geekahedron/SteamGameAutoJoin/
// @version	1.2a
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
    var play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0];
    if (play_div.innerHTML != "Play Now!")
    {
        play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0].children[0];
        if (play_div.innerHTML.search("Resume Your Game") === 0)
        {
            gameID = JoinGame.toString().match(/'[0-9]*'/)[0].replace(/'/g, '');
            console.log('Current game: ' + gameID);
            play_div.innerHTML = "Resume Your Game (" + gameID + ")";
        }
    }
    return gameID;
}

function DisplayUI()
{
	var game_div = document.getElementsByClassName('section_play')[0].children[0];
	var play_div = document.getElementsByClassName('section_play')[0].children[1].children[0].children[0];
	GetCurrentGame();
	var sgaj_sp = document.createElement("span");
    sgaj_sp.innerHTML = '<span><label for="autojoinid" class="main_btn">Game ID</label><input type=text id="autojoinid" name="autojoinid" class="main_btn" /></span><a onClick="javascript:AutoJoinGame()" class="main_btn" id="auto_btn"><span>Auto Join Game</span></a><a onClick="javascript:StopRunning()" class="main_btn" id="stop_btn"><span>Stop</span></a>';
	game_div.appendChild(sgaj_sp,game_div.children[0]);
	addGlobalStyle('.section_play .current_game, .section_play .new_game {  margin-top: 10px; }');
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

function JoinGameHelper_Count( gameid, count )
{
    if (doCheck() === false) {
        console.log('Execution stopped by user');
        return;
    }
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
        if ( responseJSON.success == '24' && responseJSON.errorMsg )
        {
            console.log( 'Error joining game ' + gameid + ': ' + responseJSON.errorMsg );
            if (responseJSON.errorMsg.search("higher than the highest level you have completed") == -1)
            {
                JoinGameHelper_Count(gameid, count+1);
            }
            else
            {
                ShowAlertDialog( 'Error', responseJSON.errorMsg );
            }
        }
        else if ( responseJSON.success == '25' )
        {
            console.log('Error joining game ' + gameid + ': it already has the maximum number of players.' );
            ShowAlertDialog( 'Error', 'There was a problem trying to join the game: it already has the maximum number of players.' );
        }
        else if ( responseJSON.success == '28' )
        {
            console.log('Error joining game ' + gameid + ': You have previously left this game. You cannot join this game again.' );
            ShowAlertDialog( 'Error', 'You have previously left this game. You cannot join this game again.' );
        }
        else
        {
            console.log('Error joining game ' + gameid + ': There was a problem trying to join the game.' );
            JoinGameHelper_Count(gameid, count+1);
        }
    });
}

function AutoJoinGame()
{
    StartRunning();
	var gameID = document.getElementById("autojoinid").value;
    console.log('Launching auto join for room: ' + gameID);
	CheckAndLeaveCurrentGame( function() {
		JoinGameHelper_Count( gameID, 1 );
	});
}

// Embed functions to be called directly from the UI
function embedFunction(s) {
	document.body.appendChild(document.createElement('script')).innerHTML=s.toString().replace(/([\s\S]*?return;){2}([\s\S]*)}/,'$2');
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

// embed other functions used by UI after loading
embedFunction(GetCurrentGame);
embedFunction(CheckAndLeaveCurrentGame);
embedFunction(JoinGameHelper_Count);
embedFunction(AutoJoinGame);
embedFunction(doCheck);
embedFunction(StopRunning);
embedFunction(StartRunning);

DisplayUI();
}(window));
