<h1>Pioneer<h1>

This is my attempt to create a game editor and engine using only web technologies. It's still in the early stages of development.

Eventually, this could become an entire game editor and engine, but I haven't had that much time to work on it, so right now, it's just a map editor.  You can click on stuff and move it around, but it is not playable.

<h3>Running<h3>

The server for Pioneer runs on Node.js

Step 1:
To build Node.js from scratch, try the following:<br>
  $ wget http://nodejs.org/dist/v0.8.4/node-v0.8.4.tar.gz<br>
  $ tar -zxvpf node-v0.8.4.tar.gz<br>
  $ cd node-v0.8.4<br>
  $ ./configure<br>
  $ make<br>
  $ make install<br>
  
NOTE: Node.js has the following prerequisites:
 - GNU make 3.81 or newer
 - python 2.6 or 2.7 (not 3.0)

On Windows and Mac, you can download Node.js from <a href="http://nodejs.org/#download">here</a>.

Step2:
After installing Node.js, in Pioneer's root directory, run this:
  $ node server.js

Finally, open Firefox and navigate to <a href="http://127.0.0.1:7890/">http://127.0.0.1:7890/</a>.
