#!/usr/bin/env node
var screenoptions = {};
if(process.argv.length > 3) {
  screenoptions.log = "/tmp/vikeys.log";
  screenoptions.debug = true;
}
var blessed = require('blessed');
var screen = blessed.screen(screenoptions);
var widgets = require('./lib/ui/widgets.js');
var keyboard = require('./lib/keyboard');
var keyboards = require('./lib/keyboards');
var key = require('./lib/key');
var state = require('./lib/state')
var menuAssign = require('./lib/ui/assignmenu.js');
var menuActions = require('./lib/ui/actionsmenu.js');

state.setScreen(screen);
state.keyboard = keyboards.keyboards['ergodox'];
state.firmware = require('./firmwares/tmk.js');

var ui = blessed.box({
  top: '50%',
  left: '10%',
  right: 0,
  //width: '90%',
  height: '50%',
  style: {
    fg: 'white',
    bg: 'blue',
    border: {
      fg: '#f0f0f0'
    }
  },
  keys: 'vi'
});
var keyboardBox = blessed.box({
  top: '0%',
  left: '0%',
  width: '100%',
  height: '50%'
});
var mainMenu = widgets.listmenu({
  width: '10%',
  left: 0,
  top: '50%',
  height: '50%',
  keys: true,
  mouse: true,
  keyListener: state.keyListener,
  vi: true,
  name: "Main menu",
  style: {
    fg: 'white',
    bg: 'blue',
    selected: {
      prefix: 'white',
      fg: 'blue',
      bg: 'white'
    },
    item: {
      prefix: 'white',
      fg: 'white',
      bg: 'blue'
    }
  }
});
function menuHome() {
  mainMenu.setItems({
    ' Assign': {
      callback: function() {
        menuAssign.show(ui, {
          assign: function(code) {
            state.keys[state.currentKey].setMapping(state.layer, code);
            state.keys.forEach(function(key) {
              if(key.isSelected()) {
                key.setMapping(state.layer, code);
                key.select(false);
              }
            });
          },
          cancel: function() {
            menuAssign.hide();
          }
        });
      }
    },
    ' Actions': {
      callback: function() {
        menuActions.show(ui, {
          cancel: function() {
            menuActions.hide();
          }
        });
      }
    },
    ' Build': {
      callback: function() {
        state.setHelp("Not implemented yet");
        redraw();
      }
    },
    ' Load': {  
      callback: function() {
        var fm = blessed.filemanager({
          keys: true,
          vi: true,
          style: {
            fg: 'white',
            bg: 'blue',
            selected: {
              prefix: 'white',
              fg: 'blue',
              bg: 'white'
            },
            item: {
              prefix: 'white',
              fg: 'white',
              bg: 'blue'
            }
          }
        });
        ui.append(fm);
        fm.focus();
        fm.pick('./', function(error, file) {
          if(error || file == "" || typeof(file) === 'undefined' || file == null) {
            ui.remove(fm);
            mainMenu.focus();
            redraw();
            return;
          }
          ui.remove(fm);
          load(file);
        });
      }
    }, 
    ' Save': {
      callback: function() {
        var saveName = widgets.filebox({
          bottom: 0,
          width: '100%',
          height: 1,
          value: process.cwd()+(process.platform === 'win32' ? '\\' : '/'),
          style: {
            bg: 'blue',
            fg: 'white'
          }
        });
        state.setHelp("Enter file name to write to");
        state.getStatusBar().bottom = 1;
        screen.append(saveName);
        //saveName.focus();
        saveName.on('completion', function(matches) {
          if(matches === null || matches.length == 1) {
            state.statusExtra = '';
            state.getStatusBar().height = 1;
            state.statusExtra = ''; //matches.join(' ');
          } else {
            state.getStatusBar().height = 2;
            state.statusExtra = matches.join(' ');
          }
          redraw();
        });
        saveName.readInput(function(err, path) {
          if(path !== null) {
            state.firmware.save(path, { fn_ids: state.fn_ids, action_fn: state.action_fn, actions: state.actions, keys: state.keys }, state.keyboard, function(err, msg) {
              if(err) state.setHelp(err);
              else state.setHelp("Saved to "+path);
              screen.remove(saveName);
              state.getStatusBar().bottom = 0;
              state.getStatusBar().height = 1;
            });
          }
          else {
            screen.remove(saveName);
            state.getStatusBar().bottom = 0;
            state.getStatusBar().height = 1;
            redraw();
          }
        });
      }
    },
    ' Exit': {
      callback: function() {
        process.exit(0);
      }
    }
  });
}
function load(file) {
  state.firmware.load(file, function(error, def) {
    var i,j;
    for(i = 0; i < def.maps.length; i++) {
      for(j = 0; j < state.keyboard.keys; j++) 
        state.keys[j].setMapping(i, def.maps[i][j]);
    }
    state.actions = def.actions;
    state.fn_ids = def.fn_ids;
    state.action_fn = def.action_fn;
    state.setHelp("Loaded "+def.maps.length+" layers, "+def.actions.length+" actions");
    redraw();
    mainMenu.focus();
  });
}
function eventListener(msg) {
  switch(msg) {
    case "redraw": screen.render(); break;
  }
}
// Append our box to the screen.
screen.append(keyboardBox);
screen.append(mainMenu);
screen.append(ui);
screen.append(state.getStatusBar());
screen.grabKeys = true;
state.on('keyboard', keyboard.eventListener);

menuHome();
state.pushFocus(mainMenu);

var i = 0;
var keyInstance;
for(i = 0; i < state.keyboard.keys; i++) {
  keyInstance = new key.Instance(i);
  state.keys.push(keyInstance);
}
keyboard.initLayout(keyboardBox, state.keyboard);
function redraw() {
  for(i = 0; i < state.keyboard.keys; i++) {
    state.keys[i].draw();
  }
  state.drawStatus();
}
state.on('redraw', redraw);
screen.on('keypress', state.keyListener);
redraw();
if(process.argv.length > 2) load(process.argv[2]);
