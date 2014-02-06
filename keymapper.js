var blessed = require('blessed');
var keyboard = require('./keyboards/ergodox');
var screen = blessed.screen();
var key = require('./lib/key');
var state = require('./lib/state')

var form = blessed.form({
  top: '72%',
  left: '0%',
  width: '80%',
  height: '20%',
  style: {
    fg: 'white',
    bg: 'blue',
    border: {
      fg: '#f0f0f0'
    }
  },
  keys: 'vi'
});
var infoBox = blessed.box({
  top: '72%',
  left: '80%',
  width: '20%',
  style: {
    fg: 'red',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
});

function info(msg) {
  //infoBox.shiftLine(1);
  infoBox.pushLine(msg);
  screen.render();
}

keyboard.initLayout(screen);


var i = 0;
var keys = [];
var keybox;
var pos;
var keyInstance;
var selectedLayer = 0;
var inputSelectKey = null;
var selectedKey = -1;
for(i = 0; i < keyboard.getNumberOfKeys(); i++) {
  keyInstance = new key.Instance(i);
  keys.push(keyInstance);
  keyboard.addKey(keyInstance);
}

function requestKey() {
  if(inputSelectKey !== null) {
    form.remove(inputSelectKey);
    isSelectingKey = false;
    state.selecting = false;
    inputSelectKey = null;
    redraw();
    return;
  }
  state.selecting = true;
  info("Select key: ");
  // Select key input
  inputSelectKey = blessed.textbox({
    content: "Input key number, or click a key: ",
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
  redraw();
  form.append(inputSelectKey);
  inputSelectKey.focus();
  inputSelectKey.readInput(function(ch,text) {
    info("Got "+text);
    var selectedKey = parseInt(text);
    if(selectedKey >= 0) keys[selectedKey].select(true);
    requestKey();
  });
}
// Append our box to the screen.
screen.append(form);
screen.append(infoBox);
form.focus();

// If box is focused, handle `enter`/`return` and give us some more content.
screen.key('k', function(ch, key) {
  requestKey();
});
function redraw() {
  for(i = 0; i < 76; i++) {
    keys[i].draw();
  }
  screen.render();
}


// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

// Render the screen.
screen.render();
