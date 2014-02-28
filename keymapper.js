var blessed = require('blessed');
var widgets = require('./lib/ui/widgets.js');
var keyboard = require('./keyboards/ergodox');
var key = require('./lib/key');
var state = require('./lib/state')
var screen = state.screen;
var firmware = require('./firmwares/tmk.js');
var info = require('./lib/ui/info.js');
var menuAssign = require('./lib/ui/assignmenu.js');

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
var statusBar = blessed.box({
  bottom: 0,
  left: 0,
  right: 0,
  width: '100%',
  height: 1,
  tags: true,
  style: {
    bg: 'lightyellow',
    fg: 'white',
    border: {
      bg: 'lightyellow',
      fg: 'purple'
    }
  }
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
    ' Load': {  
      //prefix: '1',
      //keys: ['1'],
      callback: function() {
        var fm = blessed.filemanager({
          keys: true,
          vi: true,
          style: {
            fg: 'white',
            bg: 'red'
          }
        });
        ui.append(fm);
        fm.up();
        fm.pick('./', function(error, file) {
          firmware.load(file, function(error, def) {
            ui.remove(fm);
            var i,j;
            for(i = 0; i < def.maps.length; i++) {
              for(j = 0; j < keyboard.getNumberOfKeys(); j++) 
                keys[j].setMapping(i, def.maps[i][j]);
            }
            redraw();
            info.print("Loaded "+def.maps.length+" maps");
            mainMenu.focus();
          });

        });
      }
    },
    ' Select': {
      //prefix: '2',
      //keys: ['2'],
      callback: function() {
        requestKey();
      }
    },
    ' Assign': {
      //prefix: '3',
      //keys: ['3'],
      callback: function() {
        screen.grabKeys = true;
        menuAssign.show(ui, {
          assign: function(code) {
            keys.forEach(function(key) {
              if(key.isSelected()) {
                key.setMapping(state.layer, code);
                key.select(false);
              }
            });
            //screen.grabKeys = false;
            //screen.render();
            //mainMenu.focus();
          },
          cancel: function() {
            screen.grabKeys = false;
          }
        });
      }
    }
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
screen.append(statusBar);
info.initLayout(ui);
info.addListener(eventListener);
keyboard.initLayout(keyboardBox);
menuHome();
state.pushFocus(mainMenu);
//state.focus = mainMenu;

var i = 0;
var keys = [];
var keybox;
var pos;
var keyInstance;
var selectedLayer = 0;
var inputSelectKey = null;
for(i = 0; i < keyboard.getNumberOfKeys(); i++) {
  keyInstance = new key.Instance(i);
  keys.push(keyInstance);
  keyboard.addKey(keyInstance);
}


function requestKey() {
  if(inputSelectKey !== null) {
    ui.remove(inputSelectKey);
    isSelectingKey = false;
    state.selecting = false;
    inputSelectKey = null;
    redraw();
    return;
  }
  state.selecting = true;
  info.print("Select key: ");
  // Select key input
  inputSelectKey = blessed.textbox({
    label: "Input key number, or click a key: ",
    width: '40%',
    height: '20%',
    style: {
      fg: 'white',
      bg: 'magenta',
      border: {
        fg: '#f0f0f0'
      },
    },
    border: {
      style: 'line'
    },
    top: '50%',
    left: '50%'
  });
  ui.append(inputSelectKey);
  redraw();
  inputSelectKey.focus();
  inputSelectKey.readInput(function(ch,text) {
    info.print("Got "+text);
    var selectedKey = parseInt(text);
    if(selectedKey >= 0 && selectedKey < keyboard.getNumberOfKeys()) keys[selectedKey].select(true);
    requestKey();
  });
}

screen.key('-', function(ch, key) {
  if(state.layer > 0) state.layer--;
  info.print("Layer "+state.layer);
  redraw();
});
screen.key('+', function(ch, key) {
  if(state.layer < 72) state.layer++;
  info.print("Layer "+state.layer);
  redraw();
});
function redraw() {
  for(i = 0; i < 76; i++) {
    keys[i].draw();
  }
  statusBar.setContent(state.getStatusLine());
  screen.render();

}


// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

// Render the screen.
screen.render();

