/*
 * Load settings, client.js and the main js file
*/

client_js(document.cookie.substring(7, document.cookie.length));

function client_js(apikey) {
    var url = "https://api.trello.com/1/client.js";
    $.ajax(url, {
        dataType: "script",
        data: { "key": apikey },
        success: load_main
    });
}

function load_main() {
    $.ajax("js/autoscrum.js", {
        dataType: "script"
    });
}
