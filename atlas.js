/*jslint browser: true, white: true */

/*global alert */

document.addEventListener("DOMContentLoaded", function ()
{
    "use strict";
    
    var bg_el = document.createElement("canvas"),
        bg_context,
        editor = {},
        tabs = [];
    
    function resize_canvas()
    {
        ///NOTE: Must use setAttribute to avoid stretching.
        bg_el.setAttribute("width",  window.innerWidth);
        bg_el.setAttribute("height", window.innerHeight);
    }
    
    editor.game_name = "Pioneer";
    
    editor.el = document.createElement("div");
    
    editor.el.className = "editor";
    
    document.body.appendChild(bg_el);
    document.body.appendChild(editor.el);
    
    bg_context = bg_el.getContext("2d");
    
    window.onresize = resize_canvas;
    resize_canvas();
    
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
            editor.el.style.width  = pos.width  + "px";
        }
        
        /**
         * Create tabs
         */
        (function ()
        {
            var cur_tab,
                create_tab,
                tab_container = document.createElement("div"),
                ul = document.createElement("ul");
            
            if (/\#tab-\d+/.test(window.location.hash)) {
                cur_tab = Number(/\#tab-(\d+)/.exec(window.location.hash)[1]);
            } else if (window.localStorage.getItem("cur_tab")) {
                cur_tab = Number(window.localStorage.getItem("cur_tab"));
            } else {
                cur_tab = 0;
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
                            var old_el;
                            
                            if (cur_tab !== this_tab) {
                                old_el = document.getElementById("tab-" + cur_tab);
                                if (old_el) {
                                    old_el.style.display = "none";
                                    document.getElementById("a_tab-" + cur_tab).classList.remove("active-tab");
                                }
                                tab.style.display = "block";
                                a.classList.add("active-tab");
                                cur_tab = this_tab;
                                window.localStorage.setItem("cur_tab", cur_tab);
                            }
                            
                            e.preventDefault();
                            e.stopPropagation();
                            
                            return false;
                        };
                    }
                    
                    a.href = "#tab-" + tabs;
                    a.id = "a_tab-" + tabs;
                    a.textContent = name;
                    
                    a.onclick = create_onclick(tabs);
                    
                    tab.id = "tab-" + tabs;
                    
                    if (tabs === cur_tab) {
                        tab.style.display = "block";
                        a.classList.add("active-tab");
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
            
            tabs[tabs.length] = create_tab("World",      tab_container, ul);
            tabs[tabs.length] = create_tab("Tilesheets", tab_container, ul);
            tabs[tabs.length] = create_tab("Animations", tab_container, ul);
            
            editor.el.appendChild(tab_container);
            
        }());
    }());
    
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
    
    /**
     * Create World editor (tab 0)
     */
    (function ()
    {
        var map_box   = document.createElement("input"),
            map_size_box = document.createElement("input"),
            name_box  = document.createElement("input"), /// The name of the game
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
        }
        
        /// Create a sample world_map object.
        editor.world_map = [{}];
        editor.cur_map = editor.world_map[0];
        
        map_box.type = "text";
        editor.bind_input_box(map_box, "world_map_num", 0, function (value)
        {
            editor.world_map_num = value;
            editor.cur_map = editor.world_map[value];
        });
        
        map_size_box.type = "text";
        editor.bind_input_box(map_size_box, "", "8000 x 8000", function (value)
        {
            editor.cur_map.size = editor.parse_dimension(value);
        });
        
        tabs[0].appendChild(document.createTextNode("Snap: "));
        tabs[0].appendChild(snap_box);
        tabs[0].appendChild(document.createElement("br"));
        tabs[0].appendChild(document.createTextNode("Show grid: "));
        tabs[0].appendChild(show_grid);
        tabs[0].appendChild(document.createElement("br"));
        tabs[0].appendChild(document.createTextNode("Map #: "));
        tabs[0].appendChild(map_box);
        tabs[0].appendChild(document.createElement("br"));
        tabs[0].appendChild(document.createTextNode("Map size: "));
        tabs[0].appendChild(map_size_box);
    }());
    
    /**
     * Create tile editor (tab 1)
     */
    (function ()
    {
        var tilesheet_canvas    = document.createElement("canvas"),
            tilesheet_canvas_cx,
            tilesheet_container = document.createElement("div"),
            tilesheet_options   = document.createElement("div"),
            tilesheet_select    = document.createElement("select");
        
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
            var cur_style = tabs[1].style.display;
            /// Force the current tab to be hidden so that this tab's position will not be affected by it.
            tabs[window.localStorage.getItem("cur_tab")].style.display = "none";
            /// Because elements only have offsetTop if they are displayed on the screen, we must make sure that the tab is set to block (even though the user never sees anything unusual).
            tabs[1].style.display = "block";
            /// Set the top to the current position and bottom to the bottom of the parent div.
            tilesheet_container.style.top = tilesheet_container.offsetTop + "px";
            tilesheet_container.style.bottom = 0;
            tabs[1].style.display = cur_style;
            /// Make sure that the current tab is visible.
            tabs[window.localStorage.getItem("cur_tab")].style.display = "block";
        }, 0);
        
        tabs[1].appendChild(tilesheet_select);
        tabs[1].appendChild(tilesheet_options);
        tabs[1].appendChild(tilesheet_container);
        
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
             * Calculate the position and size of the tilesheet selection rectangle.
             */
            function get_selection_rec(mouse_pos, dont_snap)
            {
                var canvas_pos = tilesheet_canvas.getClientRects()[0],
                    size = editor.parse_dimension(size_box.value),
                    snap = editor.parse_dimension(snap_box.value),
                    x,
                    y;
                
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
            }
            
            function get_hover_tile(mouse_event)
            {
                var tile_selected = false,
                    rect;
                
                if (editor.tiles && editor.tiles[editor.selected_tilesheet]) {
                    /// Check to see if the mouse is hovering over an already created tile.
                    rect = get_selection_rec({x: mouse_event.clientX, y: mouse_event.clientY}, true);
                    editor.tiles[editor.selected_tilesheet].every(function (tile)
                    {
                        if (rect.x >= tile.x && rect.x <= tile.x + tile.w && rect.y >= tile.y && rect.y <= tile.y + tile.h) {
                            tile_selected = tile;
                            return false; /// I.e., break.
                        }
                        
                        return true;
                    });
                    
                    return tile_selected;
                }
                /// There are no tiles for this image, it cannot hover over anything.
                return false;
            }
            
            /**
             * Draw the tile selection square or highlight a tile.
             */
            tilesheet_canvas.onmousemove = function (e)
            {
                var tile_selected;
                
                function draw_square()
                {
                    /// Get the snapped rectangle.
                    var rect = get_selection_rec({x: e.clientX, y: e.clientY});
                    
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
                
                tile_selected = get_hover_tile(e);
                
                if (tile_selected) {
                    /// Since the mouse is hovering over an already created tile, highlight it.
                    tilesheet_canvas_cx.fillStyle = "rgba(255,255,255, .4)";
                    tilesheet_canvas_cx.fillRect(tile_selected.x, tile_selected.y, tile_selected.w, tile_selected.h);
                    tilesheet_canvas.style.cursor = "move";
                } else {
                    /// The mouse is not hovering over a tile, so draw the selection rectangle.
                    draw_square();
                }
            };
            
            tilesheet_canvas.onmousedown = function (e)
            {
                var tile_selected = get_hover_tile(e);
                
                if (tile_selected) {
                    editor.selected_tile = {
                        tile:      tile_selected,
                        tilesheet: editor.selected_tilesheet 
                    };
                    editor.change_tool("draw");
                }
                ///TODO: Let the user draw a selection rectangle.
            };
            
            tilesheet_canvas.onclick = function (e)
            {
                var ajax,
                    rect,
                    tile_selected = get_hover_tile(e);
                
                /// Did the user click on an already designated tile?
                if (tile_selected) {
                    editor.selected_tile = {
                        tile:      tile_selected,
                        tilesheet: editor.selected_tilesheet 
                    };
                    editor.change_tool("draw");
                } else {
                    ajax = new window.XMLHttpRequest();
                    rect = get_selection_rec({x: e.clientX, y: e.clientY});
                    
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
        
        editor.get_assets = (function ()
        {
            var img  = document.createElement("img"),
                load_tile,
                tilesheet_select_onchange;
            
            editor.draw_tilesheet = function ()
            {
                /// Don't attempt to draw the image if it has not been set yet.
                if (img.src) {
                    /// First, clear the canvas.
                    tilesheet_canvas_cx.clearRect(0, 0, tilesheet_canvas.width, tilesheet_canvas.height);
                    /// Next, draw the image.
                    tilesheet_canvas_cx.drawImage(img, 0, 0);
                    
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
            
            load_tile = (function ()
            {
                var last_item;
                
                return function (which)
                {
                    if (which !== last_item) {
                        last_item = which;
                        img.onload = function ()
                        {
                            tilesheet_canvas.setAttribute("width",  img.width);
                            tilesheet_canvas.setAttribute("height", img.height);
                            editor.draw_tilesheet();
                        };
                        editor.selected_tilesheet = which;
                        img.src = "/assets/" + which;
                    }
                };
            }());
            
            tilesheet_select_onchange = function ()
            {
                window.localStorage.setItem("selected_tilesheet", tilesheet_select.value);
                load_tile(tilesheet_select.value);
            };
            
            tilesheet_select.onchange = tilesheet_select_onchange;
            
            tilesheet_select.onkeyup  = tilesheet_select_onchange;
            
            return function get_assets(which)
            {
                var ajax = new window.XMLHttpRequest();
                ajax.open("GET", "/api?action=get_assets");
                
                ajax.addEventListener("load", function ()
                {
                    var assets = [],
                        selected_tilesheet = which || window.localStorage.getItem("selected_tilesheet");
                    
                    try {
                        assets = JSON.parse(ajax.responseText);
                    } catch (e) {}
                    
                    assets.sort();
                    
                    /// Store in the editor object so that other functions can get access to it.
                    editor.assets = assets;
                    
                    tilesheet_select.options.length = 0;
                    
                    editor.assets.forEach(function (asset)
                    {
                        ///NOTE: new Option(text, value, default_selected, selected);
                        tilesheet_select.options[tilesheet_select.options.length] = new Option(asset, asset, false, (asset === selected_tilesheet));
                    });
                    
                    load_tile(tilesheet_select.value);
                });
                
                ajax.send();
            };
        }());
    }());
    
    
    /**
     * Get tiles at start up.
     */
    (function get_tiles()
    {
        var ajax = new window.XMLHttpRequest();
        
        ajax.open("GET", "/api?action=get_tiles");
        
        ajax.addEventListener("load", function ()
        {
            var cur_tiles = {};
            
            try {
                cur_tiles = JSON.parse(ajax.responseText);
            } catch (e) {}
            
            editor.tiles = cur_tiles;
            
            /// Now, get the assets.
            editor.get_assets();
        });
        
        ajax.send();
    }());
    

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
                    editor.get_assets(files[0].name);
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
    
    document.title = editor.game_name;
    
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
            
            return function show_tile_cursor()
            {
                tile_img.onload = function ()
                {
                    /// Center the tile on the cursor.
                    var half_w = editor.selected_tile.tile.w / 2,
                        half_h = editor.selected_tile.tile.h / 2,
                        onmove;
                    
                    /// Create the floating tile.
                    tile_cursor_cx.drawImage(tile_img, editor.selected_tile.tile.x, editor.selected_tile.tile.y, editor.selected_tile.tile.w, editor.selected_tile.tile.h, 0, 0, editor.selected_tile.tile.w, editor.selected_tile.tile.h);
                    
                    if (typeof editor.cancel_draw_mode === "function") {
                        editor.cancel_draw_mode({keyCode: 27});
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
                        
                        if (x < 0) {
                            x = 0;
                        }
                        if (y < 0) {
                            y = 0;
                        }
                        if (x > editor.cur_map.size.x) {
                            x = editor.cur_map.size.x;
                        }
                        if (y > editor.cur_map.size.y) {
                            y = editor.cur_map.size.y;
                        }
                        
                        return {x: x, y: y};
                    }
                    
                    /**
                     * Move the floating image with the cursor.
                     */
                    onmove = function (e)
                    {
                        /// Turn off snap with the ctrl key.
                        var pos = get_tile_pos({x: e.clientX - (editor.selected_tile.tile.w > editor.world_snap_value.x ? half_w : 0), y: e.clientY - (editor.selected_tile.tile.h > editor.world_snap_value.y ? half_h : 0)}, e.ctrlKey);
                        tile_cursor.style.display = "block";
                        tile_cursor.style.left = pos.x + "px";
                        tile_cursor.style.top  = pos.y + "px";
                        
                        ///NOTE: \u00d7 is the &times; symbols (i.e., mathmatical times).
                        document.title = pos.x + " \u00d7 " + pos.y + " - " + editor.game_name;
                    };
                    
                    window.addEventListener("mousemove", onmove, false);
                    
                    /**
                     * Allow the user to get out of draw mode by pressing escape.
                     */
                    editor.cancel_draw_mode = function(e)
                    {
                        if (e.keyCode === 27) { /// Escape
                            window.removeEventListener("mousemove", onmove, false);
                            tile_cursor.style.display = "none";
                            
                            /// Reset to the default tool.
                            editor.tool = "select";
                            
                            window.removeEventListener("keypress", editor.cancel_draw_mode, false);
                            delete editor.cancel_draw_mode;
                        }
                    };
                    
                    window.addEventListener("keypress", editor.cancel_draw_mode, false);
                    editor.tool = "draW";
                };
                
                tile_img.src = "/assets/" + editor.selected_tile.tilesheet;
                tile_cursor.setAttribute("width",   editor.selected_tile.tile.w);
                tile_cursor.setAttribute("height",  editor.selected_tile.tile.h);
            };
        }());
        
        /// Set the default tool.
        editor.tool = "select";
        
        return function change_tool(tool)
        {
            editor.tool = tool;
            
            if (tool === "draw") {
                if (editor.selected_tile) {
                    show_tile_cursor();
                }
            }
        };
    }());
});
