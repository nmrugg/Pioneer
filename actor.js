function load_actor(editor, callback)
{
    "user strict";
    
    editor.load_actor_panel = function ()
    {
        var code_editor = document.createElement("div"),
            sel_actor   = document.createElement("select"),
            myCodeMirror,
            new_button  = document.createElement("input"),
            update_height;
        
        new_button.type  = "button";
        new_button.value = "Create New Actor";
        
        editor.tabs[3].appendChild(sel_actor);
        editor.tabs[3].appendChild(document.createElement("br"));
        editor.tabs[3].appendChild(new_button);
        editor.tabs[3].appendChild(code_editor);
        
        //code_editor.style.position = "absolute";
        code_editor.style.minWidth = "450px";
        code_editor.style.maxWidth = "450px";
        code_editor.style.left = "0";
        code_editor.style.right = "0";
        
        ///NOTE: A delay is needed to let it get attached to the DOM.
        window.setTimeout(function ()
        {
            var cur_style = editor.tabs[3].style.display;
            /// Force the current tab to be hidden so that this tab's position will not be affected by it.
            editor.tabs[window.localStorage.getItem("cur_tab")].style.display = "none";
            /// Because elements only have offsetTop if they are displayed on the screen, we must make sure that the tab is set to block (even though the user never sees anything unusual).
            editor.tabs[3].style.display = "block";
            /// Set the top to the current position and bottom to the bottom of the parent div.
            code_editor.style.top = code_editor.offsetTop + "px";
            code_editor.style.bottom = 0;
            update_height();
            editor.tabs[3].style.display = cur_style;
            /// Make sure that the current tab is visible.
            editor.tabs[window.localStorage.getItem("cur_tab")].style.display = "block";
        }, 0);
        
        
        myCodeMirror = CodeMirror(code_editor, {mode: "javascript", lineNumbers: true, indentUnit: 4, matchBrackets: true});
        
        /// To add code:
        ///     myCodeMirror.setValue("var test = 'testing';");
        
        /// Fix the code editor's height
        update_height = function ()
        {
            var el = myCodeMirror.getScrollerElement();
            
            el.style.height = (editor.el.offsetHeight - code_editor.offsetTop - 3) + "px";
            myCodeMirror.refresh();
        };
        
        window.addEventListener("resize", update_height, false);
        
    };
    
    callback();
};
