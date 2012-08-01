/**
    Pioneer (currently just a map editor)
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

/*jslint browser: true, white: true */

/*global alert, console */

(function ()
{
    "use strict";
    
    function start()
    {
        var editor = {},
            sector_size = 640;
        
        document.removeEventListener("DOMContentLoaded", start, false);
                
        /// First, saved settings, then load the map data, then (while waiting for that) load helper functions;
        /// after the maps data loads, necessary images and tile info, then the editor and (perhaps) other tiles and images.
        
        /**
         * Create the map canvases
         */
        
        ///TODO: Save and load camera (or character) position.
        editor.camera = {x: 0, y: 0};
        ///TODO: Get the current map number.
        editor.selected_map = 0;
        
        /// Create a sample world_map object.
        editor.world_map = [];
        
        editor.tabs = [];
        
        editor.get_game_data = function (callback)
        {
            ///TODO: Get data from the server.
            editor.game_name = "Pioneer";
            
            document.title = editor.game_name;
            
            if (callback) {
                callback();
            }
        };
        
        /**
         * Load the map data.
         */
        editor.get_map = function (which, callback)
        {
            var ajax = new window.XMLHttpRequest();
            
            ajax.open("GET", "/api?action=get_map&data=" + JSON.stringify({num: which}));
            
            ajax.addEventListener("load", function ()
            {
                var data = {};
                
                try {
                    data = JSON.parse(ajax.responseText);
                } catch (e) {}
                
                if (!editor.world_map[which]) {
                    editor.world_map[which] = {};
                }
                
                if (!data.size) {
                    data.size = {x: 4000, y: 4000};
                }
                
                if (!data.layers || !Array.isArray(data.layers)) {
                    data.layers = ["bg","bg","fg"];
                }
                
                editor.world_map[which].data = data.data;
                
                editor.world_map[which].size = data.size;
                
                editor.world_map[which].assets = data.assets;
                
                editor.world_map[which].container = document.createElement("div");
                editor.world_map[which].container.className = "container";
                
                editor.world_map[which].container.style.top  = editor.camera.x + "px";
                editor.world_map[which].container.style.left = editor.camera.y + "px";
                
                editor.world_map[which].canvases = [];
                data.layers.forEach(function (layer, i)
                {
                    editor.world_map[which].canvases[i] = {
                        el: document.createElement("canvas"),
                        type: layer
                    };
                });
                ///TODO: Combine with above.
                editor.world_map[which].canvases.forEach(function (canvas)
                {
                    canvas.cx = canvas.el.getContext("2d");
                    canvas.el.className = "map";
                    
                    editor.world_map[which].container.appendChild(canvas.el);
                });
                
                /// Prevent the browser from trying to select text or draw elements when clicking on the canvas.
                editor.world_map[which].canvases[editor.world_map[which].canvases.length - 1].el.onmousedown = function (e)
                {
                    e.preventDefault();
                };
                
                document.body.appendChild(editor.world_map[which].container);
                
                ///NOTE: editor.change_map_size() triggers editor.draw_map().
                editor.change_map_size(editor.world_map[which].size, which, true);
                
                if (callback) {
                    callback();
                }
            });
            
            ajax.send();
        };
        
        /// **************************
        /// * Start loading the game *
        /// **************************
        document.title = "Loading...";
        document.body.style.cursor = "wait";
        editor.get_game_data(function ()
        {
            if (!editor.world_map[editor.selected_map]) {
                editor.world_map[editor.selected_map] = {};
            }
            
            document.title = "Loading " + editor.game_name + "...";
            editor.cur_map = editor.world_map[editor.selected_map];
            editor.cur_map.loaded = false;
            
            editor.get_map(editor.selected_map, function ()
            {
                ///TODO: Just get the tiles that are needed.
                editor.get_tiles(function ()
                {
                    editor.get_animations(function ()
                    {
                        ///TODO: Just get the assets that are needed.
                        editor.get_assets(function () {
                            load_actor(editor, function ()
                            {
                                editor.draw_map(editor.selected_map, null, function ()
                                {
                                    document.title = editor.game_name;
                                    document.body.style.cursor = "auto";
                                    editor.cur_map.loaded = true;
                                    editor.load_panel();
                                });
                            });
                        });
                    });
                });
            });
        });
        
        /// *************************
        /// * Load helper functions *
        /// *************************
        
        /// Array Remove - By John Resig (MIT Licensed)
        /// http://ejohn.org/blog/javascript-array-remove/
        editor.array_remove = function(array, from, to)
        {
            var rest = array.slice((to || from) + 1 || array.length);
            array.length = from < 0 ? array.length + from : from;
            return array.push.apply(array, rest);
        };
        
        /// Create the event handler.
        editor.event = (function ()
        {
            var func_list = {};
            
            return {
                attach: function (name, func, once)
                {
                    var arr_len,
                        i;
                    
                    /// Should the function be attached to multiple events?
                    if (Array.isArray(name)) {
                        arr_len = name.length;
                        for (i = 0; i < arr_len; i += 1) {
                            /// If "once" is an array, then use the elements of the array.
                            /// If "once" is not an array, then just send the "once" variable each time.
                            this.attach(name[i], func, Array.isArray(once) ? once[i] : once);
                        }
                    } else {
                        if (typeof func === "function") {
                            /// Has a function been previously attached to this event? If not, create a function to handle them.
                            if (!func_list[name]) {
                                func_list[name] = [];
                            }
                            func_list[name][func_list[name].length] = {
                                func: func,
                                once: once
                            };
                        }
                    }
                },
                detach: function (name, func, once)
                {
                    var i;
                    
                    if (func_list[name]) {
                        for (i = func_list[name].length - 1; i >= 0; i -= 1) {
                            ///NOTE: Both func and once must match.
                            if (func_list[name][i].func === func && func_list[name][i].once === once) {
                                func_list[name].remove(i);
                                /// Since only one event should be removed at a time, we can end now.
                                return;
                            }
                        }
                    }
                },
                trigger: function (name, e)
                {
                    var func_arr_len,
                        i,
                        stop_propagation;
                    
                    /// Does this event have any functions attached to it?
                    if (func_list[name]) {
                        func_arr_len = func_list[name].length;
                        
                        if (!(e instanceof Object)) {
                            /// If the event object was not specificed, it needs to be created in order to attach stopPropagation() to it.
                            e = {};
                        }
                        
                        ///NOTE: If an attached function runs this function, it will stop calling other functions.
                        e.stopPropagation = function ()
                        {
                            stop_propagation = true;
                        };
                        
                        for (i = 0; i < func_arr_len; i += 1) {
                            func_list[name][i].func(e);
                            
                            /// Is this function only supposed to be executed once?
                            if (func_list[name][i].once) {
                                func_list[name].remove(i);
                            }
                            
                            /// Was e.stopPropagation() called?
                            if (stop_propagation) {
                                break;
                            }
                        }
                    }
                }
            };
        }());
        
        editor.for_each_tile_every_map = function (callback)
        {
            editor.world_map.forEach(function (map_id)
            {
                editor.for_each_tile(callback, map_id);
            });
        };
        
        editor.for_each_tile = function (callback, map_id)
        {
            var i,
                map,
                sector,
                x,
                x_len,
                y,
                y_len;
            
            if (!editor.world_map[map_id]) {
                map_id = editor.world_map_num;
            }
            
            map = editor.world_map[map_id];
            
            x_len = map.data.length;
            y_len = map.data[0].length;
            
            for (x = 0; x < x_len; x += 1) {
                for (y = 0; y < y_len; y += 1) {
                    sector = map.data[x][y];
                    
                    for (i = sector.length - 1; i >= 0; i -= 1) {
                        callback(sector[i], i, sector, map_id);
                    }
                }
            }
        };
        
        /**
         * Parse a width x height dimension string.
         *
         * @example editor.parse_dimension("32 x 64"); /// Returns {x 32: y: 64}
         * @example editor.parse_dimension("32");      /// Returns {x 32: y: 32}
         * @param   str (string) The string to parse.
         * @note    If there is only one parameter (and no "x"), the parameter will be used for both the width and height.
         */
        editor.parse_dimension = function (str)
        {
            var split,
                val;
            
            if (!str || !str.split) {
                val = {x: 1, y: 1};
            } else {
                split = str.split(/\s*x\s*/);
                if (split.length < 2) {
                    val = {x: Number(split[0]), y: Number(split[0])};
                } else {
                    val = {x: Number(split[0]), y: Number(split[1])};
                }
            }
            
            return val;
        };
        
        
        editor.bind_input_box = function (el, storage_name, default_val, callback)
        {
            var onchange,
                value;
            
            if (storage_name) {
                value = window.localStorage.getItem(storage_name) || default_val;
            } else {
                value = default_val;
            }
            
            el.value = value;
            if (typeof callback === "function") {
                callback(value);
            }
            
            onchange = function ()
            {
                value = el.value;
                if (storage_name) {
                    window.localStorage.setItem(storage_name, value);
                }
                if (typeof callback === "function") {
                    callback(value);
                }
            };
            
            el.onchange = onchange; 
            el.onkeyup  = onchange;
        };
        
        editor.get_tiles = function (callback)
        {
            var ajax = new window.XMLHttpRequest();
            
            ///TODO: Be able to select which tiles to get at one time.
            ajax.open("GET", "/api?action=get_tiles");
            
            ajax.addEventListener("load", function ()
            {
                var cur_tiles = {};
                
                try {
                    cur_tiles = JSON.parse(ajax.responseText);
                } catch (e) {}
                
                editor.tiles = cur_tiles;
                
                if (callback) {
                    callback();
                }
            });
            
            ajax.send();
        };
        
        editor.get_assets = function (callback)
        {
            var ajax = new window.XMLHttpRequest();
            ajax.open("GET", "/api?action=get_assets");
            
            ajax.addEventListener("load", function ()
            {
                var assets = [],
                    download_assets;
                
                try {
                    assets = JSON.parse(ajax.responseText);
                } catch (e) {}
                
                assets.sort();
                
                /// Store in the editor object so that other functions can get access to it.
                editor.assets = {
                    images: {},
                    names:  assets
                };
                
                download_assets = function (i)
                {
                    var asset;
                    
                    if (i < assets.length) {
                        asset = assets[i];
                        editor.assets.images[asset] = document.createElement("img");
                        editor.assets.images[asset].onerror = function ()
                        {
                            console.log(this.src);
                            this.src = this.src + "?" + Math.random();
                        };
                        editor.assets.images[asset].onload = function ()
                        {
                            editor.assets.images[asset].onerror = "";
                            editor.assets.images[asset].onload  = "";
                            download_assets(i + 1);
                        };
                        editor.assets.images[asset].src = "/assets/" + asset;
                    } else {
                        if (callback) {
                            callback();
                        }
                        
                        editor.event.trigger("load_assets");
                    }
                };
                
                download_assets(0);
            });
            
            ajax.send();
        };
        
        editor.get_animations = function (callback)
        {
            var ajax = new window.XMLHttpRequest();
            ajax.open("GET", "/api?action=get_animations");
            
            ajax.addEventListener("load", function ()
            {
                editor.animations = {};
                
                try {
                    editor.animations = JSON.parse(ajax.responseText);
                } catch (e) {}
                
                callback();
            });
            
            ajax.send();
        };
        
        
        editor.draw_map = (function ()
        {
            var animation_started;
            
            function start_animations()
            {
                var last_time = Date.now();
                
                /// It only needs to be started once.
                if (animation_started) {
                    return;
                }
                
                window.setInterval(function ()
                {
                    var animation_obj,
                        i,
                        map,
                        map_tile,
                        sector,
                        since,
                        tile,
                        time = Date.now(),
                        x,
                        x_len,
                        y,
                        y_len;
                    
                    since = time - last_time;
                    
                    if (since > 100) {
                        map = editor.cur_map;
                        
                        x_len = map.data.length;
                        y_len = map.data[0].length;
                        
                        for (x = 0; x < x_len; x += 1) {
                            for (y = 0; y < y_len; y += 1) {
                                sector = map.data[x][y];
                                
                                for (i = sector.length - 1; i >= 0; i -= 1) {
                                    map_tile = sector[i];
                                    if (typeof map_tile.a === "undefined") {
                                        /// Is this the first time the animation has been drawn?
                                        if (typeof map_tile.cur_frame === "undefined") {
                                            /// Create unenumerable properties to keep track to the animation.
                                            /// This way, these properties do not get saved when converting to JSON.
                                            Object.defineProperty(map_tile, "cur_frame", {writable: true, value: -1});
                                            Object.defineProperty(map_tile, "waiting",   {writable: true, value: 0});
                                        }
                                        
                                        map_tile.waiting += Math.round(since / 100);
                                        
                                        animation_obj = editor.animations[map_tile.t];
                                        
                                        if (map_tile.waiting >= animation_obj.delay) {
                                            
                                            map_tile.cur_frame += 1;
                                            
                                            if (map_tile.cur_frame >= animation_obj.frames.length) {
                                                map_tile.cur_frame = 0;
                                            }
                                            
                                            tile = editor.tiles[animation_obj.asset][animation_obj.frames[map_tile.cur_frame]];
                                            map.canvases[map_tile.l].cx.clearRect(map_tile.x, map_tile.y, tile.w, tile.h);
                                            map.canvases[map_tile.l].cx.drawImage(editor.assets.images[animation_obj.asset], tile.x, tile.y, tile.w, tile.h, map_tile.x, map_tile.y, tile.w, tile.h);
                                            
                                            map_tile.waiting = 0;
                                        }
                                        
                                    }
                                }
                            }
                        }
                        last_time = time;
                    }
                }, 20);
                
                animation_started = true;
            }
            
            function draw_sector(map, sector_x, sector_y, delay, callback)
            {
                var loop_and_draw,
                    sector;
                
                if (!map.data[sector_x] || !map.data[sector_x][sector_y]) {
                    callback(false);
                    return;
                }
                
                sector = map.data[sector_x][sector_y];
                
                if (sector.length === 0) {
                    callback(true);
                    return;
                }
                
                loop_and_draw = function ()
                {
                    var base_tile,
                        i,
                        tile;
                    
                    /// Structure:
                    /// map.data[sector_x][sector_y][tiles]
                    /// The tiles object:
                    ///     a: asset_id (only for normal tiles, not animations)
                    ///     l: level
                    ///     t: tile_id
                    ///     x: x
                    ///     y: y
                    for (i = sector.length - 1; i >= 0; i -= 1) {
                        tile = sector[i];
                        /// Is it a normal tile (not an animation)?
                        if (typeof tile.a !== "undefined") {
                            base_tile = editor.tiles[map.assets[tile.a]][tile.t];
                            
                            map.canvases[tile.l].cx.drawImage(editor.assets.images[map.assets[tile.a]], base_tile.x, base_tile.y, base_tile.w, base_tile.h, tile.x, tile.y, base_tile.w, base_tile.h);
                        }
                    }
                    callback(true);
                };
                
                if (delay) {
                    window.setTimeout(function ()
                    {
                        loop_and_draw();
                    }, 50);
                } else {
                    loop_and_draw();
                }
            }
            
            return function draw_map(which, starting_pos, callback)
            {
                var draw_loop,
                    map = editor.world_map[which] || editor.world_map[editor.world_map_num],
                    map_size_x,
                    map_size_y,
                    starting_sector_x,
                    starting_sector_y,
                    
                    sectors_drawn = 0,
                    total_sectors;
                
                /// Is there no map data?
                if (!map.data) {
                    return false;
                }
                
                /// Start the animation loop.
                ///NOTE: This will only start once
                start_animations();
                
                /// Make sure all of the canvases are blank.
                map.canvases.forEach(function (canvas)
                {
                    canvas.cx.clearRect(0, 0, canvas.el.width, canvas.el.height);
                });
                
                if (!starting_pos) {
                    /// Get the middle of the screen.
                    starting_pos = {
                        x: editor.camera.x + (window.innerWidth  / 2),
                        y: editor.camera.y + (window.innerHeight / 2)
                    };
                }
                
                starting_sector_x = (starting_pos.x - (starting_pos.x % sector_size)) / sector_size;
                starting_sector_y = (starting_pos.y - (starting_pos.y % sector_size)) / sector_size;
                
                map_size_x = map.data.length;
                map_size_y = map.data[0].length;
                
                total_sectors = map_size_x * map_size_y;
                
                draw_loop = (function ()
                {
                    function draw_top(distance, callback)
                    {
                        function loop(i)
                        {
                            if (i <= distance) {
                                draw_sector(map, starting_sector_x + i, starting_sector_y - distance, distance > 1, function (success)
                                {
                                    if (success) {
                                        sectors_drawn += 1;
                                    }
                                    loop(i + 1);
                                });
                            } else {
                                callback();
                            }
                        }
                        /// Is this row on the map?
                        if (starting_sector_y >= distance) {
                            loop(-distance);
                        } else {
                            /// If not, don't bother trying to draw it.
                            callback();
                        }
                    }
                    
                    function draw_right(distance, callback)
                    {
                        function loop(i)
                        {
                            if (i > -distance) {
                                draw_sector(map, starting_sector_x + distance, starting_sector_y + i, distance > 1, function (success)
                                {
                                    if (success) {
                                        sectors_drawn += 1;
                                    }
                                    loop(i - 1);
                                });
                            } else {
                                callback();
                            }
                        }
                        
                        /// Is this column on the map?
                        if (starting_sector_x + distance < map_size_x) {
                            loop(distance);
                        } else {
                            /// If not, don't bother trying to draw it.
                            callback();
                        }
                    }
                    
                    function draw_bottom(distance, callback)
                    {
                        function loop(i)
                        {
                            if (i < distance) {
                                draw_sector(map, starting_sector_x + i, starting_sector_y + distance, distance > 1, function (success)
                                {
                                    if (success) {
                                        sectors_drawn += 1;
                                    }
                                    loop(i + 1);
                                });
                            } else {
                                callback();
                            }
                        }
                        
                        /// Is this row on the map?
                        if (starting_sector_y + distance < map_size_y) {
                            loop(-distance);
                        } else {
                            /// If not, don't bother trying to draw it.
                            callback();
                        }
                    }
                    
                    function draw_left(distance, callback)
                    {
                        function loop(i)
                        {
                            if (i < distance) {
                                draw_sector(map, starting_sector_x - distance, starting_sector_y + i, distance > 1, function (success)
                                {
                                    if (success) {
                                        sectors_drawn += 1;
                                    }
                                    loop(i + 1);
                                });
                            } else {
                                callback();
                            }
                        }
                        
                        /// Is this column on the map?
                        if (starting_sector_x >= distance) {
                            ///NOTE: The +1 is to skip the top left sector because it was already drawn by draw_top().
                            loop(-distance + 1);
                        } else {
                            /// If not, don't bother trying to draw it.
                            callback();
                        }
                    }
                    
                    return function (distance)
                    {
                        draw_top(distance, function ()
                        {
                            draw_right(distance, function ()
                            {
                                draw_bottom(distance, function ()
                                {
                                    draw_left(distance, function ()
                                    {
                                        if (sectors_drawn < total_sectors) {
                                            draw_loop(distance + 1);
                                        } else if (callback) {
                                            callback();
                                        }
                                    });
                                });
                            });
                        });
                    };
                }());
                
                draw_loop(0);
            };
        }());
        
        editor.change_map_size = function (size, which, dont_save)
        {
            var map = editor.world_map[which] || editor.cur_map;
            
            if (!map) {
                return;
            }
            
            map.size = size;
            
            /**
             * Resize map canvases and map sectors.
             */
            map.canvases.forEach(function (canvas)
            {
                canvas.el.setAttribute("width",  map.size.x);
                canvas.el.setAttribute("height", map.size.y);
            });
            
            /**
             * Load/create the map data.
             */
            (function ()
            {
                var x,
                    x_sectors = (map.size.x - (map.size.x % sector_size)) / sector_size,
                    y,
                    y_sectors = (map.size.y - (map.size.y % sector_size)) / sector_size;
                
                /// Prevent 
                if (x_sectors < 1) {
                    x_sectors = 1;
                }
                if (y_sectors < 1) {
                    y_sectors = 1;
                }
                
                if (!map.data) {
                    ///TODO: It could also create a JSON string and then stringify it.
                    map.data = [];
                }
                
                ///TODO: Check and warn about deleting data.
                for (x = 0; x < x_sectors; x += 1) {
                    if (!map.data[x]) {
                        map.data[x] = [];
                    }
                    for (y = 0; y < y_sectors; y += 1) {
                        if (!map.data[x][y]) {
                            map.data[x][y] = [];
                        }
                    }
                    if (map.data[x].length > y_sectors) {
                        map.data[x] = map.data[x].slice(0, y_sectors);
                    }
                }
                if (map.data.length > x_sectors) {
                    map.data = map.data.slice(0, x_sectors);
                }
                
                if (!dont_save) {
                    editor.event.trigger("map_edit");
                }
            }());
        };
        
        editor.change_selection_box = function (el, value)
        {
            var i;
            
            for (i = el.options.length - 1; i >= 0; i -= 1) {
                if (el.options[i].value === value) {
                    el.selectedIndex = i;
                    return;
                }
            }
        };
        
        
        editor.el = document.createElement("div");
        
        editor.el.className = "editor";
        
        document.body.appendChild(editor.el);
        
        editor.event.attach("map_edit", (function ()
        {
            var timers = [];
            
            function create_layer_obj(arr)
            {
                var layers = [];
                
                arr.forEach(function (canvas)
                {
                    layers[layers.length] = canvas.type;
                });
                
                return layers;
            }
            
            return function ()
            {
                /// Store the variables so that if the current maps changes, it knowns which one to save.
                var which_map,
                    which_num;
                
                if (!editor.cur_map || !editor.cur_map.data) {
                    return;
                }
                
                which_map = editor.cur_map;
                which_num = editor.selected_map;
                
                if (!timers[which_num]) {
                    timers[which_num] = window.setTimeout(function ()
                    {
                        var ajax;
                        
                        timers[which_num] = false;
                        
                        ajax = new window.XMLHttpRequest();
                        ajax.open("POST", "/api");
                        
                        /// Wait until a response to reset the timer.
                        /*
                        ajax.addEventListener("load", function ()
                        {
                            
                        });
                        */
                        
                        ajax.send("action=save_map&data=" + JSON.stringify({data: which_map.data, size: which_map.size, assets: which_map.assets, layers: create_layer_obj(which_map.canvases), num: Number(which_num)}));
                        
                    }, 3000);
                }
            };
        }()));
        
        
        /**
         * Calculate the position and size of the tilesheet selection rectangle.
         */
        editor.get_selection_rec = function (tilesheet_canvas, mouse_pos, dont_snap, size, snap)
        {
            var canvas_pos = tilesheet_canvas.getClientRects()[0],
                x,
                y;
            
            if (!size) {
                size = {};
            }
            
            x = mouse_pos.x - canvas_pos.left;
            y = mouse_pos.y - canvas_pos.top;
            
            if (!dont_snap) {
                if (snap.x > 0) {
                    x = x - (x % snap.x);
                }
                if (snap.y > 0) {
                    y = y - (y % snap.y);
                }
            }
            
            if (size.x < 1) {
                size.x = 1;
            }
            if (size.y < 1) {
                size.y = 1;
            }
            
            return {x: x, y: y, w: size.x, h: size.y};
        };
        
        editor.get_hover_tile = function (tilesheet_canvas, tilesheet, mouse_event)
        {
            var tile_selected = false,
                rect;
            
            if (editor.tiles && editor.tiles[tilesheet]) {
                /// Check to see if the mouse is hovering over an already created tile.
                rect = editor.get_selection_rec(tilesheet_canvas, {x: mouse_event.clientX, y: mouse_event.clientY}, true);
                editor.tiles[tilesheet].every(function (tile, num)
                {
                    if (rect.x >= tile.x && rect.x <= tile.x + tile.w && rect.y >= tile.y && rect.y <= tile.y + tile.h) {
                        tile_selected = {
                            tile: tile,
                            num: num
                        };
                        return false; /// I.e., break.
                    }
                    return true;
                });
                
                return tile_selected;
            }
            /// There are no tiles for this image, it cannot hover over anything.
            return false;
        };
        
        editor.do_animation = function (animation_obj, pos, cx, repeat, callback)
        {
            var cur_frame = -1,
                interval,
                last_time = Date.now(),
                waiting = 0;
            
            interval = window.setInterval(function ()
            {
                var since,
                    tile,
                    time = Date.now();
                
                since = time - last_time;
                
                /// Stop if there is no asset.
                if (!animation_obj.asset || animation_obj.frames.length === 0) {
                    return;
                }
                
                if (since > 100) {
                    waiting += Math.round(since / 100);
                    
                    if (waiting >= animation_obj.delay) {
                        
                        cur_frame += 1;
                        
                        if (cur_frame >= animation_obj.frames.length) {
                            if (!repeat) {
                                if (callback) {
                                    callback();
                                }
                                window.clearInterval(interval);
                                return;
                            }
                            
                            cur_frame = 0;
                        }
                        
                        tile = editor.tiles[animation_obj.asset][animation_obj.frames[cur_frame]];
                        cx.clearRect(pos.x, pos.y, tile.w, tile.h);
                        cx.drawImage(editor.assets.images[animation_obj.asset], tile.x, tile.y, tile.w, tile.h, pos.x, pos.y, tile.w, tile.h);
                        
                        waiting = 0;
                    }
                    last_time = time;
                }
            }, 20);
            
            return {
                stop: function (skip_callback)
                {
                    window.clearInterval(interval);
                    if (!skip_callback && callback) {
                        callback();
                    }
                }
            };
        };
        
        
        editor.load_panel = function ()
        {
            /**
             * Create editor side panel.
             */
            (function ()
            {
                var pos = window.localStorage.getItem("editor_pos");
                
                if (!pos) {
                    pos = {top: 10, right: 10, bottom: 10};
                }
                
                editor.el.style.top    = pos.top    + "px";
                editor.el.style.right  = pos.right  + "px";
                editor.el.style.bottom = pos.bottom + "px";
                if (pos.width) {
                    editor.el.style.width = pos.width + "px";
                }
                
                /**
                 * Create tabs
                 */
                (function ()
                {
                    var create_tab,
                        tab_container = document.createElement("div"),
                        ul = document.createElement("ul");
                    
                    if (/\#tab-\d+/.test(window.location.hash)) {
                        editor.cur_tab = Number(/\#tab-(\d+)/.exec(window.location.hash)[1]);
                    } else if (window.localStorage.getItem("cur_tab")) {
                        editor.cur_tab = Number(window.localStorage.getItem("cur_tab"));
                    } else {
                        editor.cur_tab = 0;
                    }
                    
                    tab_container.id = "tabs";
                    tab_container.appendChild(ul);
                    
                    /// Disable dragging.
                    tab_container.onmousedown = function (e)
                    {
                        e.stopPropagation();
                    };
                    
                    create_tab = (function ()
                    {
                        var tabs = 0;
                        
                        return function create_tab(name, container, ul)
                        {
                            var a   = document.createElement("a"),
                                li  = document.createElement("li"),
                                tab = document.createElement("div");
                            
                            function create_onclick(this_tab)
                            {
                                return function (e)
                                {
                                    var old_el,
                                        old_tab;
                                    
                                    if (editor.cur_tab !== this_tab) {
                                        old_el = document.getElementById("tab-" + editor.cur_tab);
                                        old_tab = editor.cur_tab;
                                        if (old_el) {
                                            old_el.style.display = "none";
                                            document.getElementById("a_tab-" + editor.cur_tab).classList.remove("active-tab");
                                        }
                                        tab.style.display = "block";
                                        a.classList.add("active-tab");
                                        editor.cur_tab = this_tab;
                                        window.localStorage.setItem("cur_tab", editor.cur_tab);
                                        
                                        editor.event.trigger("tab_change", {cur_tab: editor.cur_tab, old_tab: old_tab});
                                    }
                                    
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    return false;
                                };
                            }
                            
                            a.href = "#tab-" + tabs;
                            a.id   = "a_tab-" + tabs;
                            a.textContent = name;
                            
                            a.onclick = create_onclick(tabs);
                            
                            tab.id = "tab-" + tabs;
                            
                            if (tabs === editor.cur_tab) {
                                tab.style.display = "block";
                                a.classList.add("active-tab");
                                window.localStorage.setItem("cur_tab", editor.cur_tab);
                                window.setTimeout(function ()
                                {
                                    editor.event.trigger("tab_change", {cur_tab: editor.cur_tab});
                                }, 0);
                            } else {
                                tab.style.display = "none";
                            }
                            
                            li.appendChild(a);
                            ul.appendChild(li);
                            container.appendChild(tab);
                            
                            tabs += 1;
                            
                            return tab;
                        };
                    }());
                    
                    editor.tabs[editor.tabs.length] = create_tab("World",      tab_container, ul);
                    editor.tabs[editor.tabs.length] = create_tab("Draw",       tab_container, ul);
                    editor.tabs[editor.tabs.length] = create_tab("Animations", tab_container, ul);
                    editor.tabs[editor.tabs.length] = create_tab("Actors", tab_container, ul);
                    
                    editor.el.appendChild(tab_container);
                    
                }());
            }());
            
            /**
             * Create World editor (tab 0)
             */
            (function ()
            {
                var create_level_options,
                    map_box   = document.createElement("input"),
                    map_size_box = document.createElement("input"),
                    //name_box  = document.createElement("input"), /// The name of the game
                    snap_box  = document.createElement("input"),
                    show_grid = document.createElement("input");
                
                snap_box.type  = "text";
                editor.bind_input_box(snap_box, "world_snap", "32 x 32", function (value)
                {
                    editor.world_snap = value;
                    editor.world_snap_value = editor.parse_dimension(editor.world_snap);
                });
                
                show_grid.type = "checkbox";
                /// Since localStorage only stores data as strings and Boolean() does not convert strings, check the value against the string "true".
                if (window.localStorage.getItem("world_show_grid") === "true") {
                    show_grid.checked = true;
                }
                
                show_grid.onchange = function ()
                {
                    editor.world_show_grid = show_grid.checked;
                    window.localStorage.setItem("world_show_grid", editor.world_show_grid);
                };
                
                map_box.type = "text";
                editor.bind_input_box(map_box, "world_map_num", 0, function (value)
                {
                    editor.world_map_num = value;
                    editor.cur_map = editor.world_map[value];
                });
                
                map_size_box.type = "text";
                editor.bind_input_box(map_size_box, "", editor.cur_map.size.x + " x " + editor.cur_map.size.y, function (value)
                {
                    var new_size = editor.parse_dimension(value);
                    
                    /**
                     * Setup the map array.
                     *
                     * @note This is delayed so that as the user types, it is not updated instantly.
                     */
                    window.setTimeout(function ()
                    {
                        if (!editor.cur_map.loaded || (!new_size.x && !new_size.y) || (editor.cur_map.size && new_size.x === editor.cur_map.size.x && new_size.y === editor.cur_map.size.y)) {
                            /// Don't bother updating if nothing changed.
                            return;
                        }
                        
                        editor.change_map_size(editor.parse_dimension(value));
                        editor.draw_map();
                    }, 750);
                });
                
                create_level_options = function ()
                {
                    var add_el    = document.createElement("input"),
                        change_el = document.createElement("input"),
                        del_el    = document.createElement("input"),
                        down_el   = document.createElement("input"),
                        level_div = document.createElement("div"),
                        up_el     = document.createElement("input"),
                        select_el = document.createElement("select");
                    
                    function create_select_options(which)
                    {
                        var i;
                        
                        select_el.options.length = 0;
                        
                        if (typeof which === "undefined") {
                            which = editor.draw_on_canvas_level;
                        }
                        
                        if (!editor.cur_map.loaded) {
                            return;
                        }
                        
                        for (i = editor.cur_map.canvases.length - 1; i >= 0; i -= 1) {
                            ///NOTE: new Option(text, value, default_selected, selected);
                            select_el.options[select_el.options.length] = new Option(i + " " + editor.cur_map.canvases[i].type, i, false, (i === which));
                        }
                        
                        /// Is the currently stored level greater than the actual number of layers; if so, move it down one.
                        if (editor.draw_on_canvas_level > editor.cur_map.canvases.length) {
                            editor.draw_on_canvas_level = editor.cur_map.canvases.length - 1;
                        }
                        
                        if (typeof which === "number") {
                            editor.draw_on_canvas_level = which;
                        }
                        
                        editor.event.trigger("update_map_layers");
                        
                        if (Number(select_el.value) !== editor.draw_on_canvas_level) {
                            editor.event.trigger("change_drawing_level", {level: Number(select_el.value)});
                        }
                    }
                    
                    editor.event.attach("change_map", function ()
                    {
                        create_select_options();
                    });
                    
                    /// The delay is to let the editor.draw_on_canvas_level load.
                    window.setTimeout(create_select_options, 100);
                    
                    add_el.type = "button";
                    del_el.type = "button";
                    
                    add_el.value = "Insert Layer";
                    del_el.value = "Remove Layer";
                    
                    add_el.onclick = function ()
                    {
                        var new_canvas,
                            where = Number(select_el.value) + 1;
                        
                        new_canvas = {
                            el:   document.createElement("canvas"),
                            type: editor.cur_map.canvases[where - 1] ? editor.cur_map.canvases[where - 1].type : "bg"
                        };
                        new_canvas.cx = new_canvas.el.getContext("2d");
                        new_canvas.el.className = "map";
                        
                        new_canvas.el.setAttribute("width",  editor.cur_map.size.x);
                        new_canvas.el.setAttribute("height", editor.cur_map.size.y);
                        
                        /// Add the new canvas to the DOM.
                        editor.cur_map.container.insertBefore(new_canvas.el, editor.cur_map.canvases[where] ? editor.cur_map.canvases[where].el : null);
                        
                        /// Insert the new canvas into the canvas array.
                        editor.cur_map.canvases.splice(where, 0, new_canvas);
                        
                        editor.for_each_tile(function (tile)
                        {
                            if (tile.l >= where) {
                                tile.l += 1;
                            }
                        });
                        
                        create_select_options(where);
                    };
                    
                    del_el.onclick = function ()
                    {
                        var where = Number(select_el.value);
                        
                        editor.cur_map.container.removeChild(editor.cur_map.canvases[where].el);
                        editor.array_remove(editor.cur_map.canvases, where);
                        create_select_options(where < editor.cur_map.canvases.length ? where : where - 1);
                        editor.for_each_tile(function (tile, i, sector)
                        {
                            if (tile.l === where) {
                                editor.array_remove(sector, i);
                            } else if (tile.l > where) {
                                tile.l -= 1;
                            }
                        });
                    };
                    
                    up_el.type   = "button";
                    down_el.type = "button";
                    
                    up_el.value   = "Move Up ▲";
                    down_el.value = "Move Down ▼";
                    
                    up_el.onclick = function ()
                    {
                        var where = Number(select_el.value);
                        
                        if (where < editor.cur_map.canvases.length - 1) {
                            editor.for_each_tile(function (tile)
                            {
                                if (tile.l === where) {
                                    tile.l += 1;
                                } else if (tile.l === where + 1) {
                                    tile.l -= 1;
                                }
                            });
                            
                            create_select_options(where + 1);
                            editor.draw_map();
                        }
                    };
                    
                    down_el.onclick = function ()
                    {
                        var where = Number(select_el.value);
                        
                        if (where > 0) {
                            editor.for_each_tile(function (tile)
                            {
                                if (tile.l === where) {
                                    tile.l -= 1;
                                } else if (tile.l === where - 1) {
                                    tile.l += 1;
                                }
                            });
                            
                            create_select_options(where - 1);
                            editor.draw_map();
                        }
                    };
                    
                    change_el.type  = "button";
                    change_el.value = "Change layer type";
                    
                    change_el.onclick = function ()
                    {
                        var where = Number(select_el.value);
                        
                        editor.cur_map.canvases[where].type = (editor.cur_map.canvases[where].type === "bg" ? "fg" : "bg");
                        create_select_options(where);
                    };
                    
                    select_el.onchange = function ()
                    {
                        editor.event.trigger("change_drawing_level", {level: Number(select_el.value)});
                    };
                    
                    editor.event.attach("change_drawing_level", function (e)
                    {
                        if (select_el.value !== e.level) {
                            select_el.selectedIndex = select_el.options.length - 1 - e.level;
                        }
                    });
                    
                    level_div.appendChild(document.createTextNode("Layer: "));
                    level_div.appendChild(select_el);
                    level_div.appendChild(document.createElement("br"));
                    level_div.appendChild(add_el);
                    level_div.appendChild(document.createTextNode(" "));
                    level_div.appendChild(del_el);
                    level_div.appendChild(document.createElement("br"));
                    level_div.appendChild(up_el);
                    level_div.appendChild(document.createTextNode(" "));
                    level_div.appendChild(down_el);
                    level_div.appendChild(document.createElement("br"));
                    level_div.appendChild(change_el);
                    
                    return level_div;
                };
                
                editor.tabs[0].appendChild(document.createTextNode("Snap: "));
                editor.tabs[0].appendChild(snap_box);
                /// Not yet implamented
                //tabs[0].appendChild(document.createElement("br"));
                //tabs[0].appendChild(document.createTextNode("Show grid: "));
                //tabs[0].appendChild(show_grid);
                editor.tabs[0].appendChild(document.createElement("br"));
                editor.tabs[0].appendChild(document.createTextNode("Map #: "));
                editor.tabs[0].appendChild(map_box);
                editor.tabs[0].appendChild(document.createElement("br"));
                editor.tabs[0].appendChild(document.createTextNode("Map size: "));
                editor.tabs[0].appendChild(map_size_box);
                editor.tabs[0].appendChild(create_level_options());
            }());
            
            /**
             * Create Draw tab (tab 1)
             */
            window.setTimeout(function ()
            {
                var hide_show_layers,
                    hide_show_checkbox  = document.createElement("input"),
                    level_select_el     = document.createElement("select"),
                    level_select_onchange,
                    tilesheet_canvas    = document.createElement("canvas"),
                    tilesheet_canvas_cx,
                    tilesheet_container = document.createElement("div"),
                    tilesheet_options   = document.createElement("div"),
                    tilesheet_select    = document.createElement("select");
                
                /// This is attached to the editor object so that it can be accessd later if a user clicks to move a tile.
                editor.draw_tilesheet_el = tilesheet_select;
                
                /// Set up hide other layers checkbox.
                hide_show_layers = function ()
                {
                    var value = hide_show_checkbox.checked;
                    
                    editor.cur_map.canvases.forEach(function (canvas, i)
                    {
                        if (!value || editor.draw_on_canvas_level === i) {
                            canvas.el.style.visibility = "visible";
                        } else {
                            canvas.el.style.visibility = "hidden";
                        }
                    });
                };
                
                hide_show_checkbox.type = "checkbox";
                
                hide_show_checkbox.onchange = hide_show_layers;
                
                /// Set up the layer select box.
                editor.event.attach("update_map_layers", function ()
                {
                    var i;
                    
                    level_select_el.options.length = 0;
                    
                    for (i = editor.cur_map.canvases.length - 1; i >= 0; i -= 1) {
                        ///NOTE: new Option(text, value, default_selected, selected);
                        level_select_el.options[level_select_el.options.length] = new Option(i + " " + editor.cur_map.canvases[i].type, i, false, (i === editor.draw_on_canvas_level));
                    }
                    
                    hide_show_layers();
                });
            
                level_select_onchange = function (forced)
                {
                    var value = Number(level_select_el.value);
                    
                    window.localStorage.setItem("draw_on_canvas_level", value);
                    editor.draw_on_canvas_level = Number(value);
                    
                    hide_show_layers();
                    
                    if (!forced) {
                        editor.event.trigger("change_drawing_level", {level: value});
                    }
                };
                
                editor.event.attach("change_drawing_level", function (e)
                {
                    if (level_select_el.value !== e.level) {
                        level_select_el.selectedIndex = level_select_el.options.length - 1 - e.level;
                        level_select_onchange(true);
                    }
                });
                
                level_select_el.onchange = level_select_onchange;
                level_select_el.onkeyup  = level_select_onchange;
                
                /// Set the default drawing level.
                editor.draw_on_canvas_level = Number(window.localStorage.getItem("draw_on_canvas_level"));
                /// If it is invalid, set it to 0.
                if (isNaN(editor.draw_on_canvas_level)) {
                    editor.draw_on_canvas_level = 0;
                }
                
                
                tilesheet_canvas_cx = tilesheet_canvas.getContext("2d");
                
                /// Hide the canvas until it is ready to be drawn on.
                tilesheet_canvas.setAttribute("width",  0);
                tilesheet_canvas.setAttribute("height", 0);
                
                tilesheet_canvas.className = "checkered";
                tilesheet_container.className = "canvas_container";
                tilesheet_container.appendChild(tilesheet_canvas);
                
                
                ///NOTE: A delay is needed to let it get attached to the DOM.
                window.setTimeout(function ()
                {
                    var cur_style = editor.tabs[1].style.display;
                    /// Force the current tab to be hidden so that this tab's position will not be affected by it.
                    editor.tabs[window.localStorage.getItem("cur_tab")].style.display = "none";
                    /// Because elements only have offsetTop if they are displayed on the screen, we must make sure that the tab is set to block (even though the user never sees anything unusual).
                    editor.tabs[1].style.display = "block";
                    /// Set the top to the current position and bottom to the bottom of the parent div.
                    tilesheet_container.style.top = tilesheet_container.offsetTop + "px";
                    tilesheet_container.style.bottom = 0;
                    editor.tabs[1].style.display = cur_style;
                    /// Make sure that the current tab is visible.
                    editor.tabs[window.localStorage.getItem("cur_tab")].style.display = "block";
                }, 0);
                
                editor.tabs[1].appendChild(document.createTextNode("Drawing Layer: "));
                editor.tabs[1].appendChild(level_select_el);
                editor.tabs[1].appendChild(document.createElement("br"));
                editor.tabs[1].appendChild(document.createTextNode("Hide other layers: "));
                editor.tabs[1].appendChild(hide_show_checkbox);
                editor.tabs[1].appendChild(document.createElement("br"));
                
                editor.tabs[1].appendChild(tilesheet_select);
                editor.tabs[1].appendChild(tilesheet_options);
                editor.tabs[1].appendChild(tilesheet_container);
                
                /// Make tilesheet options
                (function ()
                {
                    var auto_split = document.createElement("button"),
                        size_box   = document.createElement("input"),
                        snap_box   = document.createElement("input");
                    
                    snap_box.type = "text";
                    size_box.type = "text";
                    
                    editor.bind_input_box(snap_box, "tilesheet_snap", "32 x 32");
                    editor.bind_input_box(size_box, "tilesheet_size", "32 x 32");
                    
                    auto_split.textContent = "Auto Split";
                    
                    tilesheet_options.appendChild(document.createTextNode("Snap: "));
                    tilesheet_options.appendChild(snap_box);
                    tilesheet_options.appendChild(auto_split);
                    tilesheet_options.appendChild(document.createElement("br"));
                    tilesheet_options.appendChild(document.createTextNode("Size: "));
                    tilesheet_options.appendChild(size_box);
                    
                    /**
                     * Draw the tile selection square or highlight a tile.
                     */
                    tilesheet_canvas.onmousemove = function (e)
                    {
                        var tile_selected;
                        
                        function draw_square()
                        {
                            /// Get the snapped rectangle.
                            var rect = editor.get_selection_rec(tilesheet_canvas, {x: e.clientX, y: e.clientY}, false, editor.parse_dimension(size_box.value), editor.parse_dimension(snap_box.value));
                            
                            tilesheet_canvas_cx.beginPath();
                            tilesheet_canvas_cx.lineWidth      = 1;
                            tilesheet_canvas_cx.mozDash        = [3, 4];
                            tilesheet_canvas_cx.webkitLineDash = [3, 4];
                            tilesheet_canvas_cx.strokeStyle    = "rgba(40,300,115,.8)";
                            
                            tilesheet_canvas_cx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w, rect.h);
                            tilesheet_canvas.style.cursor = "pointer";
                        }
                        
                        /// Reset the canvas.
                        editor.draw_tilesheet();
                        
                        tile_selected = editor.get_hover_tile(tilesheet_canvas, editor.selected_tilesheet, e);
                        
                        if (tile_selected) {
                            /// Since the mouse is hovering over an already created tile, highlight it.
                            tilesheet_canvas_cx.fillStyle = "rgba(255,255,255, .4)";
                            tilesheet_canvas_cx.fillRect(tile_selected.tile.x, tile_selected.tile.y, tile_selected.tile.w, tile_selected.tile.h);
                            tilesheet_canvas.style.cursor = "move";
                        } else {
                            /// The mouse is not hovering over a tile, so draw the selection rectangle.
                            draw_square();
                        }
                    };
                    
                    /// Allow users to click and drag a tile
                    tilesheet_canvas.onmousedown = function (e)
                    {
                        var tile_selected = editor.get_hover_tile(tilesheet_canvas, editor.selected_tilesheet, e);
                        
                        if (tile_selected) {
                            editor.selected_tile = {
                                tile:      tile_selected.tile,
                                tile_num:  tile_selected.num,
                                tilesheet: editor.selected_tilesheet
                            };
                            editor.change_tool("draw");
                            editor.dragging_tilesheet = true;
                        }
                        ///TODO: Let the user draw a selection rectangle.
                    };
                    /// NEEDED?
                    tilesheet_canvas.onmouseup = function ()
                    {
                        editor.dragging_tilesheet = false;
                    };
                    
                    tilesheet_canvas.onclick = function (e)
                    {
                        var ajax,
                            rect,
                            tile_selected = editor.get_hover_tile(tilesheet_canvas, editor.selected_tilesheet, e);
                        
                        /// Did the user click on an already designated tile?
                        if (tile_selected) {
                            editor.selected_tile = {
                                tile:      tile_selected.tile,
                                tile_num:  tile_selected.num,
                                tilesheet: editor.selected_tilesheet
                            };
                            editor.change_tool("draw");
                        } else {
                            ajax = new window.XMLHttpRequest();
                            rect = editor.get_selection_rec(tilesheet_canvas, {x: e.clientX, y: e.clientY}, false, editor.parse_dimension(size_box.value), editor.parse_dimension(snap_box.value));
                            
                            ajax.open("GET", "/api?action=add_tiles&data=" + JSON.stringify({img: tilesheet_select.value, tiles: [rect]}));
                            
                            ajax.addEventListener("load", function ()
                            {
                                var cur_tiles = {};
                                
                                try {
                                    cur_tiles = JSON.parse(ajax.responseText);
                                } catch (e) {}
                                
                                editor.tiles = cur_tiles;
                                
                                editor.draw_tilesheet();
                            });
                            
                            ajax.send();
                        }
                    };
                    
                    window.addEventListener("keyup", function (e)
                    {
                        var ajax;
                        
                        if (editor.tool === "draw") {
                            if (e.keyCode === 46) { /// Delete
                                if (window.confirm("Danger:\n\nDo you really want to delete this tile from the tilesheet? It will remove ALL of this specific tile from ALL of the maps.")) {
                                    editor.array_remove(editor.tiles[editor.selected_tile.tilesheet], editor.selected_tile.tile_num);
                                    editor.cancel_draw_mode({keyCode: 27});
                                    
                                    ajax = new window.XMLHttpRequest();
                                    ajax.open("GET", "/api?action=remove_tile&data=" + JSON.stringify({img: editor.selected_tile.tilesheet, tile: editor.selected_tile.tile_num}));
                                    ajax.addEventListener("load", function ()
                                    {
                                        editor.draw_tilesheet();
                                        editor.for_each_tile_every_map(function (tile, i, sector, map_id)
                                        {
                                            if (editor.world_map[map_id].assets[tile.a] === editor.selected_tile.tilesheet) {
                                                if (tile.t === editor.selected_tile.tile_num) {
                                                    editor.array_remove(sector, i);
                                                } else if (tile.t > editor.selected_tile.tile_num){
                                                    tile.t -= 1;
                                                }
                                            }
                                        });
                                        editor.draw_map();
                                    });
                                    ajax.send();
                                }
                            }
                        }
                    }, false);
                    
                    /**
                     * Draw grid when hovering over the Auto Split button.
                     */
                    auto_split.onmouseover = function ()
                    {
                        var height = Number(tilesheet_canvas.height),
                            snap   = editor.parse_dimension(snap_box.value),
                            width  = Number(tilesheet_canvas.width),
                            x,
                            y;
                        
                        if (snap.x <= 0 || snap.y <= 0) {
                            return;
                        }
                        
                        editor.draw_tilesheet();
                        
                        tilesheet_canvas_cx.beginPath();
                        tilesheet_canvas_cx.lineWidth      = 1;
                        tilesheet_canvas_cx.mozDash        = [3, 4];
                        tilesheet_canvas_cx.webkitLineDash = [3, 4];
                        tilesheet_canvas_cx.strokeStyle    = "rgba(0,0,0,0.5)";
                        
                        ///NOTE: adding 0.5 makes the line draw more cleanly.
                        
                        for (x = snap.x; x < width; x += snap.x) {
                            tilesheet_canvas_cx.moveTo(x + 0.5, 0);
                            tilesheet_canvas_cx.lineTo(x + 0.5, height);
                        }
                        for (y = snap.y; y < height; y += snap.y) {
                            tilesheet_canvas_cx.moveTo(0, y + 0.5);
                            tilesheet_canvas_cx.lineTo(width, y + 0.5);
                        }
                        
                        tilesheet_canvas_cx.stroke();
                    };
                    /**
                     * Remove the grid when the mouse moves off of the button.
                     */
                    auto_split.onmouseout = function ()
                    {
                        editor.draw_tilesheet();
                    };
                    
                    /**
                     * Split up all of the tiles.
                     */
                    auto_split.onclick = function ()
                    {
                        var ajax = new window.XMLHttpRequest(),
                            tiles = [],
                            
                            height = Number(tilesheet_canvas.height),
                            snap   = editor.parse_dimension(snap_box.value),
                            width  = Number(tilesheet_canvas.width),
                            x,
                            y;
                        
                        for (y = 0; y < height; y += snap.y) {
                            for (x = 0; x < width; x += snap.x) {
                                tiles[tiles.length] = {x: x, y: y, w: snap.x, h: snap.y};
                            }
                            
                        }
                        
                        ajax.open("GET", "/api?action=add_tiles&data=" + JSON.stringify({img: tilesheet_select.value, tiles: tiles}));
                        
                        ajax.addEventListener("load", function ()
                        {
                            var cur_tiles = {};
                            
                            try {
                                cur_tiles = JSON.parse(ajax.responseText);
                            } catch (e) {}
                            
                            editor.tiles = cur_tiles;
                        });
                        
                        ajax.send();
                    };
                }());
                
                (function ()
                {
                    var tilesheet_select_onchange,
                        assets_updated;
                    
                    editor.draw_tilesheet = function ()
                    {
                        /// Don't attempt to draw the image if it has not been set yet.
                        if (editor.assets.images[editor.selected_tilesheet]) {
                            /// First, clear the canvas.
                            tilesheet_canvas_cx.clearRect(0, 0, tilesheet_canvas.width, tilesheet_canvas.height);
                            /// Next, draw the image.
                            tilesheet_canvas_cx.drawImage(editor.assets.images[editor.selected_tilesheet], 0, 0);
                            
                            /// Does this tilesheet have any already designated tiles in it?
                            if (editor.tiles && editor.tiles[editor.selected_tilesheet]) {
                                tilesheet_canvas_cx.fillStyle = "rgba(0,0,0,.3)";
                                /// Now, draw a dark rectangle for each tile that is already made.
                                editor.tiles[editor.selected_tilesheet].forEach(function (tile)
                                {
                                    tilesheet_canvas_cx.fillRect(tile.x, tile.y, tile.w, tile.h);
                                });
                            }
                        }
                    };
                    
                    editor.load_tilesheet = (function ()
                    {
                        var last_item;
                        
                        return function (which)
                        {
                            if (which !== last_item) {
                                window.localStorage.setItem("selected_tilesheet", which);
                                editor.selected_tilesheet = which;
                                
                                tilesheet_canvas.setAttribute("width",  editor.assets.images[editor.selected_tilesheet].width);
                                tilesheet_canvas.setAttribute("height", editor.assets.images[editor.selected_tilesheet].height);
                                
                                editor.draw_tilesheet();
                                
                                last_item = which;
                            }
                        };
                    }());
                    
                    tilesheet_select_onchange = function ()
                    {
                        editor.load_tilesheet(tilesheet_select.value);
                        
                        if (typeof editor.cancel_draw_mode === "function") {
                            /// When the selected tilesheet changes, it would draw the wrong graphic, so cancel the drawing mode.
                            editor.cancel_draw_mode({keyCode: 27});
                        }
                    };
                    
                    tilesheet_select.onchange = tilesheet_select_onchange;
                    
                    tilesheet_select.onkeyup  = tilesheet_select_onchange;
                    
                    assets_updated = function ()
                    {
                        tilesheet_select.options.length = 0;
                        
                        if (editor.assets && editor.assets.names) {
                            editor.assets.names.forEach(function (asset)
                            {
                                ///NOTE: new Option(text, value, default_selected, selected);
                                tilesheet_select.options[tilesheet_select.options.length] = new Option(asset, asset, false, (asset === editor.selected_tilesheet));
                            });
                        }
                    };
                    
                    editor.event.attach("load_assets", assets_updated);
                    
                    
                    /// Set the default tilesheet.
                    editor.selected_tilesheet = window.localStorage.getItem("selected_tilesheet");
                    
                    /// Make sure the editor has time to be loaded onto the page.
                    window.setTimeout(function ()
                    {
                        /// Update the asset box.
                        assets_updated();
                        /// Draw the selected tilesheet.
                        tilesheet_select_onchange();
                    }, 0);
                }());
            }, 0);
            
        
            /**
             * Enabled drag and drop uploading.
             */
            (function ()
            {
                function ignore_event(e)
                {
                    e.stopPropagation();
                    e.preventDefault();
                }
                
                function drop(e)
                {
                    var files = e.dataTransfer.files,
                        len;
                    
                    e.stopPropagation();
                    e.preventDefault();
                    
                    len = files.length;
                    
                    /// Only call the handler if one or more files were dropped.
                    if (len < 1) {
                        alert("ERROR: No files were dropped.");
                        return;
                    }
                    
                    function upload_files()
                    {
                        var ajax = new window.XMLHttpRequest(),
                            formData = new FormData(),
                            i;
                        
                        for (i = 0; i < len; i += 1) {
                            formData.append(files[i].name, files[i]);
                        }
                        
                        ajax.open("POST", "/upload");
                        
                        ajax.addEventListener("load", function ()
                        {
                            /// Update the assets list.
                            editor.get_assets(function ()
                            {
                                /// Set the first uploaded file as the new selected one.
                                editor.load_tilesheet(files[0].name);
                            });
                        });
                        
                        ajax.send(formData);
                    }
                    
                    upload_files();
                }
                
                editor.el.addEventListener("dragenter", ignore_event, false);
                editor.el.addEventListener("dragexit",  ignore_event, false);
                editor.el.addEventListener("dragover",  ignore_event, false);
                editor.el.addEventListener("drop",      drop,         false);
            }());
            
            editor.change_tool = (function ()
            {
                var show_tile_cursor = (function ()
                {
                    var tile_cursor = document.createElement("canvas"),
                        tile_cursor_cx,
                        tile_img    = document.createElement("img");
                    
                    tile_cursor_cx = tile_cursor.getContext("2d");
                    tile_cursor.className = "tile_cursor";
                    
                    tile_cursor.style.display = "none";
                    document.body.appendChild(tile_cursor);
                    
                    return function show_tile_cursor(which_tilesheet, which_tile, this_id)
                    {
                        tile_img.onload = function ()
                        {
                            /// Center the tile on the cursor.
                            var half_w = which_tile.w / 2,
                                half_h = which_tile.h / 2,
                                onmove,
                                onup;
                            
                            ///Chrome appears to need a brief pause.
                            window.setTimeout(function ()
                            {
                                /// Create the floating tile.
                                tile_cursor_cx.drawImage(tile_img, which_tile.x, which_tile.y, which_tile.w, which_tile.h, 0, 0, which_tile.w, which_tile.h);
                            }, 100);
                            
                            /// If keypress events have been set, they need to be removed, but don't change the tool.
                            if (typeof editor.cancel_draw_mode === "function") {
                                editor.cancel_draw_mode({keyCode: 27, tool: editor.tool});
                            }
                            
                            function get_tile_pos(mouse_pos, dont_snap)
                            {
                                var snap = editor.world_snap_value,
                                    x,
                                    y;
                                
                                x = mouse_pos.x;
                                y = mouse_pos.y;
                                
                                if (!dont_snap) {
                                    if (snap.x > 0) {
                                        x = x - (x % snap.x);
                                    }
                                    if (snap.y > 0) {
                                        y = y - (y % snap.y);
                                    }
                                }
                                
                                return {x: x, y: y};
                            }
                            
                            /**
                             * Move the floating image with the cursor.
                             */
                            onmove = function (e)
                            {
                                /// Turn off snap with the ctrl key.
                                var pos = get_tile_pos({x: e.clientX - (which_tile.w > editor.world_snap_value.x ? half_w : 0), y: e.clientY - (which_tile.h > editor.world_snap_value.y ? half_h : 0)}, e.ctrlKey);
                                tile_cursor.style.display = "block";
                                tile_cursor.style.left = pos.x + "px";
                                tile_cursor.style.top  = pos.y + "px";
                                
                                ///NOTE: \u00d7 is the &times; symbols (i.e., mathmatical times).
                                document.title = pos.x + " \u00d7 " + pos.y + " - " + editor.game_name;
                                
                                if (typeof e.buttons === "undefined") {
                                    e.buttons = e.which;
                                }
                                
                                /// Allow for drawing by holding down the button.
                                if (e.buttons === 1 && !editor.dragging_tilesheet) {
                                    onup(e);
                                }
                            };
                            
                            window.addEventListener("mousemove", onmove, false);
                            
                            onup = function(e)
                            {
                                var asset_id,
                                    className,
                                    i,
                                    level = editor.draw_on_canvas_level,
                                    overlaps_down,
                                    overlaps_right,
                                    remove_overlapping,
                                    target = e.srcElement || e.originalTarget,
                                    tile_bottom,
                                    tile_right,
                                    sector,
                                    sector_x,
                                    sector_y,
                                    pos = get_tile_pos({x: e.clientX - (which_tile.w > editor.world_snap_value.x ? half_w : 0), y: e.clientY - (which_tile.h > editor.world_snap_value.y ? half_h : 0)}, e.ctrlKey);
                                
                                if (typeof e.buttons === "undefined") {
                                    e.buttons = e.which;
                                }
                                
                                if (e.buttons !== 1) {
                                    /// Only accept left clicks.
                                    return;
                                }
                                
                                editor.dragging_tilesheet = false;
                                
                                /// For some reason, Firefox occationally throws this error: "Error: Permission denied to access property 'className'",
                                /// so put it in a try/catch.
                                try {
                                    className = target.className;
                                } catch (err) {}
                                
                                if (className === "map") {
                                    e.stopPropagation();
                                    
                                    /// Does this map already have assets added?
                                    if (!editor.cur_map.assets) {
                                        editor.cur_map.assets = [];
                                    }
                                    
                                    /// Does this map already uses this asset?
                                    asset_id = editor.cur_map.assets.indexOf(which_tilesheet);
                                    if (asset_id === -1) {
                                        asset_id = editor.cur_map.assets.length;
                                        editor.cur_map.assets[asset_id] = which_tilesheet;
                                    }
                                    
                                    /// Make sure that the position is inside the sectors.
                                    sector_x = (pos.x - (pos.x % sector_size)) / sector_size;
                                    if (sector_x < 0) {
                                        sector_x = 0;
                                    }
                                    if (sector_x >= editor.cur_map.data.length) {
                                        sector_x = editor.cur_map.data.length - 1;
                                    }
                                    
                                    sector_y = (pos.y - (pos.y % sector_size)) / sector_size;
                                    if (sector_y < 0) {
                                        sector_y = 0;
                                    }
                                    if (sector_y >= editor.cur_map.data[sector_x].length) {
                                        sector_y = editor.cur_map.data[sector_x].length - 1;
                                    }
                                    
                                    tile_right  = pos.x + which_tile.w;
                                    tile_bottom = pos.y + which_tile.h;
                                    
                                    overlaps_right = (sector_x < (tile_right  - (tile_right  % sector_size)) / sector_size);
                                    overlaps_down  = (sector_y < (tile_bottom - (tile_bottom % sector_size)) / sector_size);
                                    
                                    /**
                                     * Check for and remove overlapping tiles.
                                     *
                                     * @return FALSE if no exact matches, TRUE if an exact match (same position and same tile)
                                     */
                                    remove_overlapping = function(sector_x, sector_y)
                                    {
                                        var sector,
                                            tmp_base_tile,
                                            tmp_tile;
                                        
                                        if (!editor.cur_map.data[sector_x] || !editor.cur_map.data[sector_x][sector_y]) {
                                            return;
                                        }
                                        
                                        sector = editor.cur_map.data[sector_x][sector_y];
                                        
                                        /// It needs to go in reverse because it may remove items.
                                        for (i = sector.length - 1; i >= 0; i -= 1) {
                                            tmp_tile = sector[i];
                                            /// Is it an animation?
                                            if (typeof tmp_tile.a === "undefined") {
                                                tmp_base_tile = editor.tiles[editor.animations[tmp_tile.t].asset][editor.animations[tmp_tile.t].frames[0]];
                                            } else {
                                                tmp_base_tile = editor.tiles[editor.cur_map.assets[tmp_tile.a]][tmp_tile.t];
                                            }
                                            if (tmp_tile.l === level && tmp_tile.x < tile_right && tmp_tile.x + tmp_base_tile.w > pos.x && tmp_tile.y < tile_bottom && tmp_tile.y + tmp_base_tile.h > pos.y) {
                                                /// If it is the same exact tile on the same exact position, don't do anything.
                                                if (this_id === tmp_tile.t && asset_id === tmp_tile.a && tmp_tile.x === pos.x && tmp_tile.y === pos.y) {
                                                    return true;
                                                }
                                                /// Erase the old tile.
                                                
                                                editor.cur_map.canvases[level].cx.clearRect(tmp_tile.x, tmp_tile.y, tmp_base_tile.w, tmp_base_tile.h);
                                                /// Remove tiles under (completely or partially) this one.
                                                editor.array_remove(sector, i);
                                            }
                                        }
                                        return false;
                                    };
                                    
                                    ///NOTE: We have to assume that tiles can be no larger than a sector; however, they can overlap multiple sectors.
                                    /// Check all of the sourounding sectors for overlapping tiles.
                                    
                                    /// First, check the sector that the tile will be added to to see if there is an exact match.
                                    if (remove_overlapping(sector_x, sector_y) === true) {
                                        return;
                                    }
                                    
                                    remove_overlapping(sector_x - 1, sector_y - 1);
                                    remove_overlapping(sector_x - 1, sector_y);
                                    remove_overlapping(sector_x, sector_y - 1);
                                    if (overlaps_down) {
                                        remove_overlapping(sector_x - 1, sector_y + 1);
                                        remove_overlapping(sector_x, sector_y + 1);
                                    }
                                    if (overlaps_right) {
                                        remove_overlapping(sector_x + 1, sector_y - 1);
                                        remove_overlapping(sector_x + 1, sector_y);
                                    }
                                    if (overlaps_down && overlaps_right) {
                                        remove_overlapping(sector_x + 1, sector_y + 1);
                                    }
                                    
                                    sector = editor.cur_map.data[sector_x][sector_y];
                                    
                                    /// Is it a normal tile?
                                    if (editor.tool === "draw") {
                                        sector[sector.length] = {
                                            a: asset_id,
                                            l: level,
                                            t: this_id,
                                            x: pos.x,
                                            y: pos.y
                                        };
                                    } else if (editor.tool === "draw_animation") {
                                        sector[sector.length] = {
                                            l: level,
                                            t: this_id,
                                            x: pos.x,
                                            y: pos.y
                                        };
                                    }
                                    
                                    editor.event.trigger("map_edit");
                                    
                                    /// Since nothing can over lap on the same level, clear the space first.
                                    editor.cur_map.canvases[level].cx.clearRect(pos.x, pos.y, which_tile.w, which_tile.h);
                                    editor.cur_map.canvases[level].cx.drawImage(editor.assets.images[which_tilesheet], which_tile.x, which_tile.y, which_tile.w, which_tile.h, pos.x, pos.y, which_tile.w, which_tile.h);
                                }
                            };
                            
                            window.addEventListener("mouseup", onup, false);
                            
                            /**
                             * Allow the user to get out of draw mode by pressing escape.
                             */
                            editor.cancel_draw_mode = function(e)
                            {
                                if (e.keyCode === 27) { /// Escape
                                    window.removeEventListener("mousemove", onmove, false);
                                    window.removeEventListener("mouseup", onup, false);
                                    tile_cursor.style.display = "none";
                                    
                                    /// Reset to the default tool.
                                    if (e.tool) {
                                        editor.tool = e.tool;
                                    } else {
                                        editor.tool = "select";
                                    }
                                    
                                    window.removeEventListener("keyup", editor.cancel_draw_mode, false);
                                    delete editor.cancel_draw_mode;
                                    document.title = editor.game_name;
                                }
                            };
                            
                            window.addEventListener("keyup", editor.cancel_draw_mode, false);
                        };
                        
                        tile_cursor.setAttribute("width",  which_tile.w);
                        tile_cursor.setAttribute("height", which_tile.h);
                        
                        
                        /// To fix a WebKit bug, the image must first be removed in order for the onload event to fire.
                        tile_img.src = "";
                        tile_img.src = "/assets/" + which_tilesheet;
                    };
                }());
                
                /// Set the default tool.
                editor.tool = "select";
                
                return function change_tool(tool)
                {
                    editor.tool = tool;
                    
                    if (tool === "draw") {
                        if (editor.selected_tile) {
                            show_tile_cursor(editor.selected_tile.tilesheet, editor.selected_tile.tile, editor.selected_tile.tile_num);
                        }
                    } else if (tool === "draw_animation") {
                        if (editor.selected_animated_tilesheet) {
                            show_tile_cursor(editor.cur_animation.asset, editor.tiles[editor.cur_animation.asset][editor.cur_animation.frames[0]], editor.selected_animation);
                        }
                    }
                };
            }());
            
            editor.event.attach("tab_change", (function ()
            {
                var onclick,
                    onmove;
                
                function find_tile(pos)
                {
                    var i,
                        level = editor.draw_on_canvas_level,
                        starting_sector_x,
                        starting_sector_y,
                        tile;
                    
                    function check_sector(sector_x, sector_y)
                    {
                        var base_tile,
                            sector;
                        
                        if (sector_x < 0 || sector_y < 0 || !editor.cur_map.data[sector_x] || !editor.cur_map.data[sector_x][sector_y]) {
                            return;
                        }
                        
                        sector = editor.cur_map.data[sector_x][sector_y];
                        
                        for (i = sector.length - 1; i >= 0; i -= 1) {
                            /// Is it an animation?
                            if (typeof sector[i].a === "undefined") {
                                base_tile = editor.tiles[editor.animations[sector[i].t].asset][editor.animations[sector[i].t].frames[0]];
                            } else {
                                base_tile = editor.tiles[editor.cur_map.assets[sector[i].a]][sector[i].t];
                            }
                            if ((level === -1 || sector[i].l === level) && sector[i].x < pos.x && sector[i].x + base_tile.w >= pos.x && sector[i].y < pos.y && sector[i].y + base_tile.h >= pos.y) {
                                return {tile: sector[i], base_tile: base_tile, num: i, sector: sector};
                            }
                        }
                        
                        return false;
                    }
                    
                    function look_through_sectors()
                    {
                        var tile = check_sector(starting_sector_x, starting_sector_y);
                        if (!tile) {
                            /// Try nearby tiles because they can overlap.
                            tile = check_sector(starting_sector_x - 1, starting_sector_y);
                            if (!tile) {
                                tile = check_sector(starting_sector_x, starting_sector_y - 1);
                                if (!tile) {
                                    tile = check_sector(starting_sector_x - 1, starting_sector_y - 1);
                                }
                            }
                        }
                        return tile;
                    }
                    
                    starting_sector_x = (pos.x - (pos.x % sector_size)) / sector_size;
                    starting_sector_y = (pos.y - (pos.y % sector_size)) / sector_size;
                    
                    if (editor.cur_map.data) {
                        tile = look_through_sectors();
                        if (!tile) {
                            /// If it didn't find anything on the selected layer, try looking on any layer.
                            level = -1;
                            tile = look_through_sectors();
                        }
                    }
                    
                    return tile;
                }
                
                /// When the cursor moves over the map (when in select mode and the draw tab is selected),
                /// allow the user to click on a tile to move it.
                onclick = function (e)
                {
                    var className,
                        target = e.srcElement || e.originalTarget,
                        tile;
                    
                    if (editor.tool === "select") {
                        /// For some reason, Firefox occationally throws this error: "Error: Permission denied to access property 'className'",
                        /// so put it in a try/catch.
                        try {
                            className = target.className;
                        } catch (err) {}
                        
                        if (className === "map") {
                            tile = find_tile({x: e.clientX, y: e.clientY});
                            
                            if (tile) {
                                editor.array_remove(tile.sector, tile.num);
                                /// Erase the tile from the map.
                                editor.cur_map.canvases[tile.tile.l].cx.clearRect(tile.tile.x, tile.tile.y, tile.base_tile.w, tile.base_tile.h);
                                
                                /// Is it an animation?
                                if (typeof tile.tile.a === "undefined") {
                                    editor.cur_animation.asset = editor.animations[tile.tile.t].asset;
                                    editor.cur_animation.frames = editor.animations[tile.tile.t].frames.slice();
                                    editor.cur_animation.delay = editor.animations[tile.tile.t].delay;
                                    editor.selected_animation = tile.tile.t;
                                    editor.set_animation_selection_box(editor.selected_animation)
                                    editor.change_tool("draw_animation");
                                } else {
                                    editor.selected_tilesheet = editor.cur_map.assets[tile.tile.a];
                                    editor.selected_tile = {
                                        tile:      tile.base_tile,
                                        tile_num:  tile.tile.t,
                                        tilesheet: editor.selected_tilesheet
                                    };
                                    ///TODO: Change the drop down selection too.
                                    editor.load_tilesheet(editor.selected_tilesheet);
                                    editor.change_tool("draw");
                                    editor.change_selection_box(editor.draw_tilesheet_el, editor.selected_tilesheet);
                                    window.localStorage.setItem("selected_tilesheet", editor.selected_tilesheet);
                                }
                                editor.event.trigger("change_drawing_level", {level: tile.tile.l});
                                editor.event.trigger("map_edit");
                            }
                        }
                    }
                };
                
                /// When the cursor moves over the map (when in select mode and the draw tab is selected),
                /// indicate to the user when the user can click on a tile to move it.
                onmove = function (e)
                {
                    var className,
                        target = e.srcElement || e.originalTarget,
                        tile;
                    
                    if (editor.tool === "select") {
                        /// For some reason, Firefox occationally throws this error: "Error: Permission denied to access property 'className'",
                        /// so put it in a try/catch.
                        try {
                            className = target.className;
                        } catch (err) {}
                        
                        if (className === "map") {
                            tile = find_tile({x: e.clientX, y: e.clientY});
                            
                            if (tile) {
                                editor.cur_map.container.style.cursor = "move";
                                return;
                            }
                        }
                    }
                    editor.cur_map.container.style.cursor = "default";
                };
                
                return function ontab_change(e)
                {
                    if (editor.cur_map && editor.cur_map.loaded) {
                        /// If the current tab is the Draw tab, let the user be able to select already drawn tiles.
                        ///NOTE: Temporarily, this will work on all tabs.
                        if (true || e.cur_tab === 1 || e.cur_tab === 2) {
                            window.addEventListener("mousemove",  onmove,  false);
                            window.addEventListener("click",      onclick, false);
                        } else {
                            window.removeEventListener("mousemove", onmove,  false);
                            window.removeEventListener("click",     onclick, false);
                            editor.cur_map.container.style.cursor = "default";
                        }
                    }
                };
            }()));
            
            /**
             * Create tab 3 (Animations)
             */
            window.setTimeout(function ()
            {
                var animation_select = document.createElement("select"),
                    new_button  = document.createElement("input"),
                    del_button  = document.createElement("input"),
                    save_button = document.createElement("input"),
                    rem_button = document.createElement("input"),
                    delay_box  = document.createElement("input"),
                    container_div = document.createElement("div"),
                    tilesheet_select = document.createElement("select"),
                    tilesheet_canvas = document.createElement("canvas"),
                    demo_canvas = document.createElement("canvas"),
                    
                    animation_select_change,
                    save_animation,
                    draw_tilesheet,
                    ondelay_change,
                    tilesheet_canvas_cx,
                    assets_updated,
                    tilesheet_select_onchange,
                    
                    cur_frame = 0,
                    demo_size,
                    tilesheet_canvas_top;
                
                editor.cur_animation = {frames: []};
                
                tilesheet_canvas_cx = tilesheet_canvas.getContext("2d");
                
                new_button.type  = "button";
                del_button.type  = "button";
                save_button.type = "button";
                rem_button.type  = "button";
                
                new_button.value  = "New";
                del_button.value  = "Delete";
                save_button.value = "Save";
                rem_button.value  = "Remove Frame";
                
                container_div.style.overflow = "scroll";
                container_div.className = "canvas_container";
                
                tilesheet_canvas.className = "checkered";
                demo_canvas.className = "checkered";
                
                container_div.appendChild(tilesheet_canvas);
                
                demo_canvas.style.display = "none";
                
                function display_demo()
                {
                    demo_canvas.setAttribute("width",  demo_size.w);
                    demo_canvas.setAttribute("height", demo_size.h);
                    container_div.style.top = (tilesheet_canvas_top + demo_size.h) + "px";
                    demo_canvas.style.display = "block";
                }
                
                function load_animations()
                {
                    animation_select.options.length = 0;
                    
                    animation_select.options[0] = new Option("(new)", "", false, false);
                    
                    if (editor.animations) {
                        Object.keys(editor.animations).sort().forEach(function (animation_name)
                        {
                            ///NOTE: new Option(text, value, default_selected, selected);
                            animation_select.options[animation_select.options.length] = new Option(animation_name, animation_name, false, (animation_name === editor.selected_animation));
                        });
                    }
                }
                
                animation_select_change = function ()
                {
                    var animation,
                        tile;
                    
                    animation = editor.animations[animation_select.value];
                    
                    if (animation_select.value !== "" && animation) {
                        editor.cur_animation.frames = animation.frames;
                        editor.cur_animation.asset = animation.asset;
                        editor.cur_animation.delay = animation.delay;
                        delay_box.value = animation.delay;
                        
                        tile = editor.tiles[animation.asset][animation.frames[0]];
                        
                        demo_size = {w: tile.w, h: tile.h};
                        
                        editor.selected_animated_tilesheet = animation.asset;
                        editor.selected_animation = animation_select.value;
                        
                        editor.change_selection_box(tilesheet_select, animation.asset);
                        window.localStorage.setItem("selected_animated_tilesheet", animation.asset);
                         
                        display_demo();
                        draw_tilesheet();
                    } else {
                        editor.selected_animation = undefined;
                    }
                };
                
                /// This is to allow outside functions to set change the selected animation.
                editor.set_animation_selection_box = function (which)
                {
                    editor.change_selection_box(animation_select, which);
                    animation_select_change();
                }
                
                ///NOTE: A delay is needed to let it get attached to the DOM.
                window.setTimeout(function ()
                {
                    var cur_style = editor.tabs[2].style.display;
                    /// Force the current tab to be hidden so that this tab's position will not be affected by it.
                    editor.tabs[window.localStorage.getItem("cur_tab")].style.display = "none";
                    /// Because elements only have offsetTop if they are displayed on the screen, we must make sure that the tab is set to block (even though the user never sees anything unusual).
                    editor.tabs[2].style.display = "block";
                    /// Set the top to the current position and bottom to the bottom of the parent div.
                    container_div.style.top = container_div.offsetTop + "px";
                    tilesheet_canvas_top = container_div.offsetTop;
                    container_div.style.bottom = 0;
                    editor.tabs[2].style.display = cur_style;
                    /// Make sure that the current tab is visible.
                    editor.tabs[window.localStorage.getItem("cur_tab")].style.display = "block";
                }, 0);
                
                draw_tilesheet = function ()
                {
                    if (!editor.assets.images[editor.selected_animated_tilesheet]) {
                        return;
                    }
                    
                    tilesheet_canvas.setAttribute("width",  editor.assets.images[editor.selected_animated_tilesheet].width);
                    tilesheet_canvas.setAttribute("height", editor.assets.images[editor.selected_animated_tilesheet].height);
                    
                    /// Don't attempt to draw the image if it has not been set yet.
                    if (editor.assets.images[editor.selected_animated_tilesheet]) {
                        /// First, clear the canvas.
                        tilesheet_canvas_cx.clearRect(0, 0, tilesheet_canvas.width, tilesheet_canvas.height);
                        /// Next, draw the image.
                        tilesheet_canvas_cx.drawImage(editor.assets.images[editor.selected_animated_tilesheet], 0, 0);
                        
                        /// Does this tilesheet have any already designated tiles in it?
                        if (editor.tiles && editor.tiles[editor.selected_animated_tilesheet]) {
                            tilesheet_canvas_cx.fillStyle = "rgba(0,0,0,.3)";
                            /// Now, draw a dark rectangle for each tile that is already made.
                            editor.tiles[editor.selected_animated_tilesheet].forEach(function (tile, i)
                            {
                                if (editor.cur_animation.frames.indexOf(i) === -1) {
                                    tilesheet_canvas_cx.fillRect(tile.x, tile.y, tile.w, tile.h);
                                }
                            });
                            tilesheet_canvas_cx.fillStyle = "rgba(255,255,255,.4)";
                            /// Now, draw a dark rectangle for each tile that is already made.
                            editor.cur_animation.frames.forEach(function (i)
                            {
                                var tile = editor.tiles[editor.selected_animated_tilesheet][i];
                                tilesheet_canvas_cx.fillRect(tile.x, tile.y, tile.w, tile.h);
                            });
                        }
                    }
                };
                
                tilesheet_select_onchange = (function ()
                {
                    var last_item;
                    
                    return function (which)
                    {
                        if (typeof which === "undefined") {
                            which = tilesheet_select.value;
                        }
                        
                        if (which !== last_item) {
                            window.localStorage.setItem("selected_animated_tilesheet", which);
                            editor.selected_animated_tilesheet = which;
                            
                            ///NOTE: This will also redraw the tilesheet.
                            editor.reset_demo_animation();
                            
                            last_item = which;
                        }
                    };
                }());
                
                tilesheet_select.onchange = function ()
                {
                    tilesheet_select_onchange();
                };
                
                tilesheet_select.onkeyup = function ()
                {
                    tilesheet_select_onchange();
                };
                
                assets_updated = function ()
                {
                    tilesheet_select.options.length = 0;
                    
                    if (editor.assets && editor.assets.names) {
                        editor.assets.names.forEach(function (asset)
                        {
                            ///NOTE: new Option(text, value, default_selected, selected);
                            tilesheet_select.options[tilesheet_select.options.length] = new Option(asset, asset, false, (asset === editor.selected_animated_tilesheet));
                        });
                        tilesheet_select_onchange();
                    }
                };
                
                editor.event.attach("load_assets", assets_updated);
                
                editor.selected_animated_tilesheet = window.localStorage.getItem("selected_animated_tilesheet");
                window.setTimeout(assets_updated, 0);
                
                /**
                 * Highlight a tile.
                 */
                tilesheet_canvas.onmousemove = function (e)
                {
                    var tile_selected;
                    
                    /// Reset the canvas.
                    draw_tilesheet();
                    
                    tile_selected = editor.get_hover_tile(tilesheet_canvas, editor.selected_animated_tilesheet, e);
                    
                    if (tile_selected) {
                        /// Since the mouse is hovering over an already created tile, highlight it.
                        tilesheet_canvas_cx.fillStyle = "rgba(255,255,255,.4)";
                        tilesheet_canvas_cx.fillRect(tile_selected.tile.x, tile_selected.tile.y, tile_selected.tile.w, tile_selected.tile.h);
                        tilesheet_canvas.style.cursor = "pointer";
                    } else {
                        /// The mouse is not hovering over a tile, so draw the selection rectangle.
                        tilesheet_canvas.style.cursor = "default";
                    }
                };
                
                /// Allow users select a frame
                tilesheet_canvas.onmousedown = function (e)
                {
                    var tile_selected = editor.get_hover_tile(tilesheet_canvas, editor.selected_animated_tilesheet, e);
                    
                    if (tile_selected) {
                        if (!editor.cur_animation.asset) {
                            editor.cur_animation.asset = editor.selected_animated_tilesheet;
                            demo_size = {w: tile_selected.tile.w, h: tile_selected.tile.h};
                            display_demo();
                        }
                        editor.cur_animation.frames[editor.cur_animation.frames.length] = tile_selected.num;
                        draw_tilesheet();
                    }
                };
                
                
                ondelay_change = function ()
                {
                    editor.cur_animation.delay = Number(delay_box.value);
                    if (isNaN(editor.cur_animation.delay)) {
                        editor.cur_animation.delay = 1;
                    }
                };
                
                delay_box.onchange = ondelay_change;
                delay_box.onkeyup  = ondelay_change;
                
                
                editor.reset_demo_animation = function ()
                {
                    editor.cur_animation.frames = [];
                    delete editor.cur_animation.asset;
                    ondelay_change();
                    
                    demo_canvas.setAttribute("width",  0);
                    demo_canvas.setAttribute("height", 0);
                    container_div.style.top = tilesheet_canvas_top + "px";
                    demo_canvas.style.display = "none";
                    editor.selected_animation = undefined;
                    animation_select.selectedIndex = 0;
                    draw_tilesheet();
                };
                
                /// Prepare to reset the animations to make a new one.
                new_button.onclick = function ()
                {
                    if (typeof editor.selected_animation === "undefined" && editor.cur_animation.frames.length > 0 && !window.confirm("Are you sure you want to discard the changes?")) {
                        return;
                    }
                    
                    editor.reset_demo_animation();
                };
                
                /// Save an animation.
                save_animation = function (animation_name, animation)
                {
                    var ajax = new window.XMLHttpRequest();
                    
                    ajax.open("POST", "/api");
                    
                    ajax.addEventListener("load", function ()
                    {
                        var animations = {};
                        
                        try {
                            animations = JSON.parse(ajax.responseText);
                        } catch (e) {}
                        
                        editor.animations = animations;
                        load_animations();
                    });
                    
                    ajax.send("action=save_animation&data=" + JSON.stringify({data: animation, name: animation_name}));
                };
                
                /// Prepare to save an animation.
                save_button.onclick = function ()
                {
                    var animation_name;
                    
                    /// Don't save if there are no frames.
                    if (editor.cur_animation.frames.length < 1) {
                        return;
                    }
                    
                    /// Is it a new animation?
                    if (!editor.selected_animation) {
                        animation_name = window.prompt("Enter animation name:");
                        
                        if (animation_name === null || animation_name.trim() === "") {
                            return;
                        }
                        editor.selected_animation = animation_name;
                    } else if (!window.confirm("Are you sure you want to save over \"" + editor.selected_animation + "\"?\n\n(If not, select \"(new)\" in the animation drop down box.)")) {
                        return;
                    }
                    save_animation(editor.selected_animation, editor.cur_animation);
                };
                
                /// Remove the last frame.
                rem_button.onclick = function ()
                {
                    if (editor.cur_animation.frames.length > 0) {
                        editor.cur_animation.frames.pop();
                        draw_tilesheet();
                    }
                };
                
                /// Delete an animation
                del_button.onclick = function ()
                {
                    var ajax;
                    
                    if (window.confirm("Do you really want to delete \"" + editor.selected_animation + "\"?")) {
                        ajax = new window.XMLHttpRequest();
                        ajax.open("POST", "/api");
                        
                        ajax.addEventListener("load", function ()
                        {
                            var animations = {};
                            
                            try {
                                animations = JSON.parse(ajax.responseText);
                            } catch (e) {}
                            
                            editor.animations = animations;
                            load_animations();
                        });
                        
                        ajax.send("action=del_animation&data=" + JSON.stringify({name: editor.selected_animation}));
                        editor.selected_animation = undefined;
                    }
                };
                
                animation_select.onchange = animation_select_change;
                animation_select.onkeyup  = animation_select_change;
                
                load_animations();
                
                delay_box.value = 1;
                editor.cur_animation.delay = 1;
                
                editor.do_animation(editor.cur_animation, {x: 0, y: 0}, demo_canvas.getContext("2d"), true);
                
                demo_canvas.onclick = function ()
                {
                    /// Has this animation been saved?
                    if (editor.selected_animation) {
                        editor.change_tool("draw_animation");
                    }
                };
                
                demo_canvas.style.cursor = "pointer";
                
                editor.tabs[2].appendChild(animation_select);
                editor.tabs[2].appendChild(document.createElement("br"));
                editor.tabs[2].appendChild(new_button);
                editor.tabs[2].appendChild(document.createTextNode(" "));
                editor.tabs[2].appendChild(save_button);
                editor.tabs[2].appendChild(document.createTextNode(" "));
                editor.tabs[2].appendChild(del_button);
                editor.tabs[2].appendChild(document.createTextNode(" "));
                editor.tabs[2].appendChild(rem_button);
                editor.tabs[2].appendChild(document.createElement("br"));
                editor.tabs[2].appendChild(document.createTextNode("Delay: "));
                editor.tabs[2].appendChild(delay_box);
                editor.tabs[2].appendChild(document.createElement("br"));
                editor.tabs[2].appendChild(tilesheet_select);
                editor.tabs[2].appendChild(document.createElement("br"));
                editor.tabs[2].appendChild(demo_canvas);
                editor.tabs[2].appendChild(container_div);
            }, 0);
            
            editor.load_actor_panel();
        };
    }
    
    document.addEventListener("DOMContentLoaded", function ()
    {
        window.setTimeout(start, 100);
    }, false);
}());
