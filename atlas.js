$(document).ready(function ()
{
    "use strict";
    
    var bg_el = document.getElementById("bg"),
        bg_context,
        editor = document.getElementById("editor"),
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
    
    
    bg_context = bg_el.getContext("2d");
    
    window.onresize = resize_canvas;
    resize_canvas();
    
    (function ()
    {
        var pos = window.localStorage.getItem("editor_pos");
        
        if (!pos) {
            pos = {top: 10, right: 10, width: 300, bottom: 10};
        }
        
        editor.style.top    = pos.top    + "px";
        editor.style.right  = pos.right  + "px";
        editor.style.bottom = pos.bottom + "px";
        editor.style.width  = pos.width  + "px";
        
        ///NOTE: It does not work without draggable (even though it cannot be dragged).
        $(editor).draggable().resizable({ handles: "all" });
        
        /// Create tabs
        (function ()
        {
            var cur_tab = 2,
                create_tab,
                tab_container = document.createElement("div"),
                ul = document.createElement("ul");
            
            tab_container.id = "tabs";
            tab_container.appendChild(ul);
            
            tab_container.onmousedown = function (e) {e.stopPropagation();};
            
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
    
    get_assets = function ()
    {
        var ajax = new window.XMLHttpRequest();
        
        ajax.open("GET", "/api?action=get_assets");
        
        ajax.addEventListener("load", function ()
        {
            var assests = [],
                i,
                len;
            
            try {
                assests = JSON.parse(ajax.responseText);
            } catch (e) {}
            
            len = assests.length;
            
            for (i = 0; i < len; i += 1) {
                tabs[2].innerHTML += "<img src=\"/assets/" + assests[i].replace(/"/g, '\\"') + "\">";
            }
        });
        
        ajax.send();
    };
    
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
                var file;
                var formData = new FormData();
                
                for (var i = 0, file; file = files[i]; i += 1) {
                    formData.append(file.name, file);
                }
                
                var ajax = new window.XMLHttpRequest();
                
                ajax.open("POST", "/upload");
                
                ajax.addEventListener("load", function ()
                {
                    console.log("uploaded");
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