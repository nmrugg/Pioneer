(function ()
{
    "use strict";
    
    var bg_el = document.getElementById("bg"),
        bg_context,
        game_name = "Pioneer",
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
            
            function read_file()
            {
                //var file   = files[i];
                var file;
                var formData = new FormData();
                
                for (var i = 0, file; file = files[i]; i += 1) {
                    formData.append(file.name, file);
                }
                
                //var bin = e.target.result;
                var ajax = new window.XMLHttpRequest();
                var boundary = "--------XX" + Math.random();
                
                ajax.open("POST", "/upload");
                //ajax.setRequestHeader("Content-type",  "multipart/form-data; boundary=" + boundary);
                //ajax.setRequestHeader("Content-type",  "multipart/form-data;");
                //ajax.setRequestHeader("X-File-Size",    file.fileSize);
                //ajax.setRequestHeader("X-File-Type",    file.type);
                //ajax.setRequestHeader("X-File-Name",    file.fileName);
                //ajax.send("--" + boundary + "\n" + e.target.result + "\n--" + boundary + "\n");
                
                ajax.addEventListener("load", function ()
                {
                    console.log("uploaded");
                });
                
                ajax.send(formData);
                
                /*
                
                
                /// Initialize the reader event handlers
                reader.onnotification = handleReadernotification; /// Does anything use this?
                reader.onprogress     = handleReadernotification;
                reader.onloadstart    = handleReadernotification;
                reader.onloadend      = function (e2)
                {
                    //var cur_pos = canvas_manager.get_relative_x_y(e);
                    //canvas_manager.add_image(e2.target.result, cur_pos.x + (i * 15), cur_pos.y + (i * 15));
                    //alert(e2.target.result);
                    
                    var ajax = new window.XMLHttpRequest();
                    ajax.open("POST", "/upload");
                    ajax.setRequestHeader("Content-type",   "multipart/form-data;");
                    ajax.setRequestHeader("Content-length", file.fileSize);
                    
                    /// Get the next file, if any.
                    i += 1;
                    
                    if (i < count) {
                        read_file();
                    }
                    document.title = game_name;
                };
                
                /// Begin reading in files.
                reader.readAsDataURL(file);
                */
            }
            
            read_file();
        }
        
        bg_el.addEventListener("dragenter", ignore_event, false);
        bg_el.addEventListener("dragexit",  ignore_event, false);
        bg_el.addEventListener("dragover",  ignore_event, false);
        bg_el.addEventListener("drop",      drop,         false);
    }());
    
    document.title = game_name;
}());