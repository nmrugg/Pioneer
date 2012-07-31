/**
    Copyright (C) 2012  Nathan Rugg
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*jslint node: true, nomen: true, white: true */

"use strict";

var formidable = require("formidable"),
    fs   = require("fs"),
    mime = require("mime"),
    url  = require("url"),
    path = require("path"),
    qs   = require("querystring");

/// Array Remove - By John Resig (MIT Licensed)
/// http://ejohn.org/blog/javascript-array-remove/
function array_remove(array, from, to)
{
    var rest = array.slice((to || from) + 1 || array.length);
    array.length = from < 0 ? array.length + from : from;
    return array.push.apply(array, rest);
}

function del_actor(response, data)
{
    response.writeHead(200, {"Content-Type": "text/plain"});
    fs.readFile("data/actors.json", "utf8", function (err, actors)
    {
        if (actors) {
            try {
                actors = JSON.parse(actors);
            } catch (e) {}
        } else {
            actors = {};
        }
        
        if (data && typeof data.name !== "undefined") {
            delete actors[data.name];
            
            ///NOTE: To avoid race conditions, write this file synchronously.
            fs.writeFileSync("data/actors.json", JSON.stringify(actors), "utf8");
        }
        
        response.end();
    });
}

function get_actors(response)
{
    response.writeHead(200, {"Content-Type": "application/json"});
    fs.readFile("data/actors.json", "utf8", function (err, actors)
    {
        if (!actors) {
            actors = "{}";
        }
        
        response.end(actors);
    });
}

function save_actor(response, data)
{
    response.writeHead(200, {"Content-Type": "text/plain"});
    fs.readFile("data/actors.json", "utf8", function (err, actors)
    {
        if (actors) {
            try {
                actors = JSON.parse(actors);
            } catch (e) {}
        } else {
            actors = {};
        }
        
        if (data && typeof data.name !== "undefined" && data.code) {
            actors[data.name] = data.code;
            
            ///NOTE: To avoid race conditions, write this file synchronously.
            fs.writeFileSync("data/actors.json", JSON.stringify(actors), "utf8");
        }
        
        response.end();
    });
}

function del_animations(response, data)
{
    response.writeHead(200, {"Content-Type": "text/plain"});
    fs.readFile("data/animations.json", "utf8", function (err, animations)
    {
        if (animations) {
            try {
                animations = JSON.parse(animations);
            } catch (e) {}
        } else {
            animations = {};
        }
        
        if (data && typeof data.name !== "undefined") {
        
            if (animations[data.name]) {
                delete animations[data.name];
            }
            
            ///NOTE: To avoid race conditions, write this file synchronously.
            fs.writeFileSync("data/animations.json", JSON.stringify(animations), "utf8");
        }
        
        response.end(JSON.stringify(animations));
    });
}

function get_animations(response)
{
    response.writeHead(200, {"Content-Type": "application/json"});
    fs.readFile("data/animations.json", "utf8", function (err, animations)
    {
        if (!animations) {
            animations = "{}";
        }
        
        response.end(animations);
    });
}

function save_animation(response, data)
{
    response.writeHead(200, {"Content-Type": "text/plain"});
    fs.readFile("data/animations.json", "utf8", function (err, animations)
    {
        if (animations) {
            try {
                animations = JSON.parse(animations);
            } catch (e) {}
        } else {
            animations = {};
        }
        
        if (data && typeof data.name !== "undefined" && data.data) {
            animations[data.name] = data.data;
            
            ///NOTE: To avoid race conditions, write this file synchronously.
            fs.writeFileSync("data/animations.json", JSON.stringify(animations), "utf8");
        }
        
        response.end(JSON.stringify(animations));
    });
}

function get_map(response, data)
{
    response.writeHead(200, {"Content-Type": "application/json"});
    fs.readFile("data/maps.json", "utf8", function (err, maps)
    {
        var map;
        
        if (!maps) {
            maps = "[]";
        }
        
        try {
            maps = JSON.parse(maps);
        } catch (e) {}
        
        if (!data || typeof data.num === "undefined") {
            /// If no map is specified, return all of the maps.
            map = maps;
        } else if (maps[data.num]) {
            map = maps[data.num];
        } else {
            map = {};
        }
        
        response.end(JSON.stringify(map));
    });
}

function save_map(response, data)
{
    response.writeHead(200, {"Content-Type": "text/plain"});
    fs.readFile("data/maps.json", "utf8", function (err, maps)
    {
        if (maps) {
            try {
                maps = JSON.parse(maps);
            } catch (e) {}
        } else {
            maps = [];
        }
        
        if (typeof data.num !== "undefined" && data.data) {
            maps[Number(data.num)] = {
                data:   data.data,
                size:   data.size,
                assets: data.assets,
                layers: data.layers
            };
            
            ///NOTE: To avoid race conditions, write this file synchronously.
            fs.writeFileSync("data/maps.json", JSON.stringify(maps), "utf8");
        }
        
        response.end();
    });
}

function get_assets(response)
{
    response.writeHead(200, {"Content-Type": "application/json"});
    fs.readdir("assets", function (err, files)
    {
        response.end(JSON.stringify(files));
    });
}

function get_tiles(response)
{
    response.writeHead(200, {"Content-Type": "application/json"});
    fs.readFile("data/tiles.json", "utf8", function (err, tiles)
    {
        if (!tiles) {
            tiles = "{}";
        }
        response.end(tiles);
    });
}

function remove_tile(response, data)
{
    response.writeHead(200, {"Content-Type": "text/plain"});
    fs.readFile("data/tiles.json", "utf8", function (err, cur_tiles)
    {
        var tiles = {},
            tiles_str,
            this_tile;
        
        if (cur_tiles) {
            try {
                tiles = JSON.parse(cur_tiles);
            } catch (e) {}
        }
        
        if (data && data.img && typeof data.tile !== "undefined") {
            if (tiles[data.img]) {
                array_remove(tiles[data.img], data.tile);
            }
        }
        
        tiles_str = JSON.stringify(tiles);
        
        response.end();
        
        ///NOTE: To avoid race conditions, write this file synchronously.
        fs.writeFileSync("data/tiles.json", tiles_str, "utf8");
    });
}

function add_tiles(response, data)
{
    response.writeHead(200, {"Content-Type": "application/json"});
    fs.readFile("data/tiles.json", "utf8", function (err, cur_tiles)
    {
        var tiles = {},
            tiles_str,
            this_tile;
        
        if (cur_tiles) {
            try {
                tiles = JSON.parse(cur_tiles);
            } catch (e) {}
        }
        
        if (data && data.img && data.tiles && data.tiles.forEach) {
            if (!tiles[data.img]) {
                tiles[data.img] = [];
            }
            
            this_tile = tiles[data.img];
            
            data.tiles.forEach(function (tile)
            {
                this_tile[this_tile.length] = tile;
            });
        }
        
        tiles_str = JSON.stringify(tiles);
        
        response.end(tiles_str);
        
        ///NOTE: To avoid race conditions, write this file synchronously.
        fs.writeFileSync("data/tiles.json", tiles_str, "utf8");
    });
}

function run_api(action, response, data)
{
    try {
        data = JSON.parse(data);
    } catch (e) {}
    
    switch (action) {
    case "get_assets":
        get_assets(response);
        return;
    case "add_tiles":
        add_tiles(response, data);
        return;
    case "get_tiles":
        get_tiles(response);
        return;
    case "remove_tile":
        remove_tile(response, data);
        return;
    case "save_map":
        save_map(response, data)
        return;
    case "get_map":
        get_map(response, data)
        return;
    case "save_animation":
        save_animation(response, data)
        return;
    case "get_animations":
        get_animations(response)
        return;
    case "save_actor":
        save_actor(response, data)
        return;
    case "get_actors":
        get_actors(response, data)
        return;
    case "del_actor":
        del_actor(response, data)
        return;
    }
    /// If the action is not valid, simply end.
    response.end();
}


require("http").createServer(function (request, response)
{
    var form,
        post_data,
        query,
        url_parts = url.parse(request.url);
    
    /// Convert special charcters to normal (e.g., "%20" => " ").
    url_parts.pathname = decodeURI(url_parts.pathname);
    
    /// Is there an upload?
    if (url_parts.pathname === "/upload" && request.method.toLowerCase() === "post") {
        form = new formidable.IncomingForm();
        form.maxFieldsSize = 100 * 1024 * 1024; /// 100 MB
        form.encoding = "binary";
        
        /**
         * Handle the files, one at a time, after they are uploaded.
         */
        form.addListener("file", function(name, file)
        {
            /// Move the file to the assests directory.
            fs.rename(file.path, __dirname + "/assets/" + name);
        });
        
        /**
         * Close the connection after everything is uploaded.
         */
        form.addListener("end", function() {
            response.end("Received upload sucessfully.");
        });
        
        /**
         * Parse the upload.
         */
        form.parse(request, function(err, fields, files)
        {
            response.writeHead(200, {"content-type": "text/plain"});
        });
    } else if (url_parts.pathname === "/api") {
        if (request.method === "GET") {
            query = qs.parse(url_parts.query);
            run_api(query.action, response, query.data);
        } else if (request.method === "POST") {
            post_data = "";
            
            request.on("data", function(chunk)
            {
                /// Get the POST data.
                post_data += chunk.toString();
            });
            
            request.on("end", function(chunk)
            {
                post_data = qs.parse(post_data);
                run_api(post_data.action, response, post_data.data);
            });
        }

        return;
    } else {
        /// Check to see if the client is trying to access a real file.
        path.exists(url_parts.pathname.substr(1), function (exists)
        {
            var filename;
            
            if (exists) {
                ///NOTE: .substr(1) trims off the leading slash (/).
                filename = url_parts.pathname.substr(1);
            } else if (url_parts.pathname === "/") {
                /// If it is trying to access the root, load the index.
                filename = "index.html";
                
            } else {
                /// If the file does not exist at all, throw a 404 error, and exit.
                response.writeHead(404, {"Content-Type": "text/plain"});
                response.end("File not found");
                return;
            }
            
            fs.stat(filename, function (err, stats)
            {
                /// If the client has the current file cached, tell it to use that.
                if (request.headers["if-modified-since"] && Date.parse(request.headers["if-modified-since"]) >= Date.parse(stats.mtime)) {
                    response.writeHead(304, {});
                    response.end();
                } else {
                    fs.readFile(filename, "binary", function (err, data)
                    {
                        response.writeHead(200, {"Content-Type": mime.lookup(filename), "Last-Modified": stats.mtime});
                        response.end(data, "binary");
                    });
                }
            });
        });
    }
}).listen(7890);

console.log("Server Started. Go to http://127.0.0.1:7890/");
