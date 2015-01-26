/*
 * Load settings, client.js and the main js file
*/

$.ajax("autoscrum.config.json", {
    dataType: "json",
    success: function(values) {
        client_js(values.trello.key)
    }
});

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
