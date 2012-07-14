function load_actor(editor, callback)
{
    "user strict";
    
    editor.load_actor_panel = function ()
    {
        var code_editor = document.createElement("div"),
            actor_select_box = document.createElement("select"),
            new_button  = document.createElement("input"),
            del_button  = document.createElement("input"),
            update_height,
            
            editor_on_change,
            myCodeMirror,
            reset_code;
        
        editor_on_change = (function ()
        {
            var waiting,
                timeout;
            
            function save_code()
            {
                var ajax = new window.XMLHttpRequest(),
                    code = myCodeMirror.getValue();
                
                ajax.open("POST", "/api");
                ajax.addEventListener("error", function ()
                {
                    waiting = false;
                });
                
                ajax.addEventListener("load", function ()
                {
                    waiting = false;
                });
                ajax.send("action=save_actor&data=" + JSON.stringify({name: editor.selected_actor, code: code}));
                
                ///TODO: Update the code on the page.
            };
            
            return function (force)
            {
                if (editor.selected_actor) {
                    if (force) {
                        window.clearTimeout(timeout);
                        save_code();
                    } else if (!waiting) {
                        waiting = true;
                        timeout = window.setTimeout(function ()
                        {
                            if (editor.selected_actor) {
                                save_code();
                            }
                        }, 1000);
                    }
                }
            };
        }());
        
        reset_code = function ()
        {
            myCodeMirror.setValue("{\n    human: false,\n    animations: {\n        walkRight: \"walk-right\",\n        walkLeft:  \"walk-left\"\n    }\n}\n");
        };
        
        new_button.type  = "button";
        new_button.value = "Create New Actor";
        
        new_button.onclick = function ()
        {
            var name = window.prompt("Enter the name of the actor:");
            
            if (name !== null && name !== "") {
                /// Make sure that any changes get saved.
                editor_on_change(true);
                
                /// Add the name afterwards to make sure to save the new actor.
                editor.selected_actor = name;
                reset_code();
                code_editor.style.visibility = "visible";
            }
        };
        
        del_button.type  = "button";
        del_button.value = "Delete Actor";
        
        del_button.onclick = function ()
        {
            if (editor.selected_actor) {
                if (window.confirm("Do you really want to delete \"" + editor.selected_actor + "\"?")) {
                    
                }
            }
        };
        
        
        editor.tabs[3].appendChild(actor_select_box);
        editor.tabs[3].appendChild(document.createElement("br"));
        editor.tabs[3].appendChild(new_button);
        editor.tabs[3].appendChild(del_button);
        editor.tabs[3].appendChild(code_editor);
        
        /// Hide the code editor until an actor is loaded
        code_editor.style.visibility = "hidden";
        
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
        
        
        myCodeMirror = CodeMirror(code_editor, {mode: "javascript", lineNumbers: true, indentUnit: 4, matchBrackets: true, smartIndent: false, onChange: function ()
        {
            editor_on_change();
        }});
        
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
        
        
        reset_code();
    };
    
    callback();
};
