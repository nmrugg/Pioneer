document.addEventListener("DOMContentLoaded", function ()
{
    "use strict";
    
    var bg_el = document.createElement("canvas"),
        bg_context,
        editor = document.createElement("div"),
        game_name = "Pioneer",
        get_assets,
        tabs = [],
        tilesheet = document.createElement("img");
    
    function resize_canvas(e)
    {
        ///NOTE: Must use setAttribute to avoid stretching.
        bg_el.setAttribute("width",  window.innerWidth);
        bg_el.setAttribute("height", window.innerHeight);
    }
    
    editor.className = "editor";
    
    document.body.appendChild(bg_el);
    document.body.appendChild(editor);
    
    bg_context = bg_el.getContext("2d");
    
    window.onresize = resize_canvas;
    resize_canvas();
    
    (function ()
    {
        var pos = window.localStorage.getItem("editor_pos");
        
        if (!pos) {
            pos = {top: 10, right: 10, width: 350, bottom: 10};
        }
        
        editor.style.top    = pos.top    + "px";
        editor.style.right  = pos.right  + "px";
        editor.style.bottom = pos.bottom + "px";
        editor.style.width  = pos.width  + "px";
        
        /**
         * Create tabs
         */
        (function ()
        {
            var cur_tab = 2,
                create_tab,
                tab_container = document.createElement("div"),
                ul = document.createElement("ul");
            
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
                                    old_el.style.display = "none"
                                    document.getElementById("a_tab-" + cur_tab).classList.remove("active-tab");
                                }
                                tab.style.display = "block";
                                a.classList.add("active-tab");
                                cur_tab = this_tab;
                            }
                            
                            e.preventDefault();
                            e.stopPropagation();
                            
                            return false;
                        };
                    };
                    
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
            
            tabs[tabs.length] = create_tab("Draw",     tab_container, ul);
            tabs[tabs.length] = create_tab("Create",   tab_container, ul);
            tabs[tabs.length] = create_tab("Tilesets", tab_container, ul);
            
            editor.appendChild(tab_container);
            
        }());
    }());
    
    /**
     * Create tile editor (tab 2)
     */
    (function ()
    {
        var draw_tile,
            tile_select    = document.createElement("select"),
            tile_options   = document.createElement("div"),
            tile_container = document.createElement("div"),
            tile_canvas    = document.createElement("canvas"),
            tile_canvas_cx;
        
        tile_canvas_cx = tile_canvas.getContext("2d");
        
        tile_canvas.className = "checkered";
        tile_container.className = "tile_container";
        tile_container.appendChild(tile_canvas);
        
        
        ///NOTE: A delay is needed to let it get attached to the DOM.
        window.setTimeout(function ()
        {
            /// Set the top to the current position and bottom to the bottom of the parent div..
            tile_container.style.top = tile_container.offsetTop + "px";
            tile_container.style.bottom = 0;
        }, 0);
        
        tabs[2].appendChild(tile_select);
        tabs[2].appendChild(tile_options);
        tabs[2].appendChild(tile_container);
        
        
        /// Make options
        (function ()
        {
            var auto_split = document.createElement("button"),
                size_box = document.createElement("input"),
                snap_box = document.createElement("input");
            
            function split_dim(str)
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
            }
            
            snap_box.type = "text";
            size_box.type = "text";
            
            snap_box.value = "32 x 32";
            size_box.value = "32 x 32";
            
            auto_split.textContent = "Auto Split";
            
            tile_options.appendChild(document.createTextNode("Snap: "));
            tile_options.appendChild(snap_box);
            tile_options.appendChild(auto_split);
            tile_options.appendChild(document.createElement("br"));
            tile_options.appendChild(document.createTextNode("Size: "));
            tile_options.appendChild(size_box);
            
            tile_canvas.onmousemove = function (e)
            {
                var canvas_pos = tile_canvas.getClientRects()[0],
                    size = split_dim(size_box.value),
                    snap = split_dim(snap_box.value),
                    x,
                    y;
                
                x = e.clientX - canvas_pos.left;
                y = e.clientY - canvas_pos.top;
                
                if (snap.x > 0) {
                    x = x - (x % snap.x);
                }
                
                if (snap.y > 0) {
                    y = y - (y % snap.y);
                }
                
                if (size < 1) {
                    size = 1
                }
                
                draw_tile();
                
                tile_canvas_cx.beginPath();
                tile_canvas_cx.lineWidth = 1;
                tile_canvas_cx.mozDash        = [3, 4];
                tile_canvas_cx.webkitLineDash = [3, 4];
                tile_canvas_cx.strokeStyle = "rgba(40,300,115,.8)";
                
                tile_canvas_cx.strokeRect(x + .5, y + .5, size.x, size.y);
            };
            
            /**
             * Draw grid when hovering over the Auto Split button.
             */
            auto_split.onmouseover = function ()
            {
                var height = Number(tile_canvas.height),
                    snap   = split_dim(snap_box.value),
                    width  = Number(tile_canvas.width),
                    x,
                    y;
                
                if (snap.x <= 0 || snap.y <= 0) {
                    return;
                }
                
                tile_canvas_cx.beginPath();
                tile_canvas_cx.lineWidth = 1;
                tile_canvas_cx.mozDash        = [3, 4];
                tile_canvas_cx.webkitLineDash = [3, 4];
                tile_canvas_cx.strokeStyle = "rgba(0,0,0,.5)";
                
                ///NOTE: adding .5 makes the line draw more cleanly.
                
                for (x = snap.x; x < width; x += snap.x) {
                    tile_canvas_cx.moveTo(x + .5, 0);
                    tile_canvas_cx.lineTo(x + .5, height);
                }
                for (y = snap.y; y < height; y += snap.y) {
                    tile_canvas_cx.moveTo(0, y + .5);
                    tile_canvas_cx.lineTo(width, y + .5);
                }
                
                tile_canvas_cx.stroke();
            };
            /**
             * Remove the grid when the mouse moves off of the button.
             */
            auto_split.onmouseout = function ()
            {
                draw_tile();
            };
        }());
        
        get_assets = function ()
        {
            var ajax = new window.XMLHttpRequest(),
                img = document.createElement("img"),
                load_tile;
            
            draw_tile = function ()
            {
                /// Don't attempt to draw the image if it has not been set yet.
                if (img.src) {
                    tile_canvas_cx.clearRect(0, 0, tile_canvas.width, tile_canvas.height);
                    tile_canvas_cx.drawImage(img, 0, 0);
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
                            tile_canvas.setAttribute("width",  img.width);
                            tile_canvas.setAttribute("height", img.height);
                            draw_tile();
                        };
                        img.src = "/assets/" + which;
                    }
                }
            }());
            
            tile_select.onchange = function ()
            {
                load_tile(tile_select.value);
            };
            
            tile_select.onkeyup = function ()
            {
                load_tile(tile_select.value);
            };
            
            ajax.open("GET", "/api?action=get_assets");
            
            ajax.addEventListener("load", function ()
            {
                var assests = [],
                    i,
                    len;
                
                try {
                    assests = JSON.parse(ajax.responseText);
                } catch (e) {}
                
                assests.sort();
                
                len = assests.length;
                
                tile_select.options.length = 0;
                
                for (i = 0; i < len; i += 1) {
                    ///NOTE: new Option(text, value, default_selected, selected);
                    tile_select.options[tile_select.options.length] = new Option(assests[i], assests[i], false, false);
                    
                    load_tile(tile_select.value);
                }
            });
            
            ajax.send();
        };
    }());
    
    get_assets();
    
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
        
        function handleReadernotification(e)
        {
            if (e.lengthComputable) {
                document.title = game_name + " (" + (e.loaded / e.total) + ")";
            }
        }
        
        function drop(e)
        {
            var count,
                files = e.dataTransfer.files,
                i     = 0;
            
            e.stopPropagation();
            e.preventDefault();
            
            count = files.length;
            
            /// Only call the handler if one or more files were dropped.
            if (count < 1) {
                alert("ERROR: No files were dropped.");
                return;
            }
            
            function upload_files()
            {
                var file,
                    formData = new FormData();
                
                for (var i = 0, file; file = files[i]; i += 1) {
                    formData.append(file.name, file);
                }
                
                var ajax = new window.XMLHttpRequest();
                
                ajax.open("POST", "/upload");
                
                ajax.addEventListener("load", function ()
                {
                    /// Update the assets list.
                    get_assets();
                });
                
                ajax.send(formData);
            }
            
            upload_files();
        }
        
        bg_el.addEventListener("dragenter", ignore_event, false);
        bg_el.addEventListener("dragexit",  ignore_event, false);
        bg_el.addEventListener("dragover",  ignore_event, false);
        bg_el.addEventListener("drop",      drop,         false);
    }());
    
    document.title = game_name;
}());