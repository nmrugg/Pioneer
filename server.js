"use strict";

var formidable = require("formidable"),
    fs   = require("fs"),
    mime = require("mime"),
    url  = require("url"),
    path = require("path"),
    qs   = require("querystring");

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
            })
        }
        
        tiles_str = JSON.stringify(tiles);
        
        response.end(tiles_str);
        
        ///NOTE: To avoid race conditions, write this file synchronously.
        fs.writeFileSync("data/tiles.json", tiles_str, "utf8");
    });
    
    try {
        data = JSON.parse(data);
    } catch (e) {}
}


require("http").createServer(function (request, response)
{
    var form,
        url_parts = url.parse(request.url),
        query;
    
    /// Is there an upload?
    if (url_parts.pathname === "/upload" && request.method.toLowerCase() == "post") {
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
        query = qs.parse(url_parts.query);
        
        switch (query.action) {
        case "get_assets":
            get_assets(response);
            return;
        case "add_tiles":
            add_tiles(response, query.data);
            return;
        }
    } else {
        /// Check to see if the client is trying to access a real file.
        path.exists(request.url.substr(1), function (exists)
        {
            var filename;
            
            if (exists) {
                ///NOTE: .substr(1) trims off the leading slash (/).
                filename = request.url.substr(1);
            } else {
                /// If the file does not exist, load the index.
                filename = "index.html";
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
