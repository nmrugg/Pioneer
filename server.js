"use strict";

var formidable = require("formidable"),
    fs   = require("fs"),
    mime = require("mime"),
    url  = require("url"),
    path = require("path"),
    qs   = require("querystring");

require("http").createServer(function (request, response)
{
    var form;
    
    /// Is there an upload?
    if (request.url === "/upload" && request.method.toLowerCase() == "post") {
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
                    fs.readFile(filename, "utf8", function (err, data)
                    {
                        response.writeHead(200, {"Content-Type": mime.lookup(filename), "Last-Modified": stats.mtime});
                        response.end(data);
                    });
                }
            });
        });
    }
}).listen(7890);
