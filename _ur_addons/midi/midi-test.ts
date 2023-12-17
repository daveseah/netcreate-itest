/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let AUDIO: AudioContext;
let KEYS: Map<number, HTMLElement>;
let BUTTON: HTMLButtonElement;

/// WINDOW EVENT HANDLERS /////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** create audio context on click */
window.onload = function () {
  AUDIO = new window.AudioContext();
  BUTTON = document.createElement('button');
  BUTTON.textContent = 'Click to Enable Audio';
  BUTTON.style.marginTop = '10px';
  BUTTON.addEventListener('click', function () {
    AUDIO.resume().then(() => {
      console.log('User Click: Audio Context is now enabled');
    });
  });
  document.body.appendChild(BUTTON);
};

/// UI GENERATOR HELPERS //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_MakeKeyDiv(mnote: number) {
  const noteName = getNameFromMidiNote(mnote);
  const color = noteName.includes('#') ? 'black' : 'white';
  const octave = getNoteOctave(mnote);
  const div = document.createElement('div');
  div.classList.add('key', color);
  div.innerHTML = `
      <div>${octave}</div>
      <div>${noteName}</div>
  `;
  return div;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_DrawKeyboard(start: string = 'C3', end: string = 'C5') {
  const n1 = getMidiNoteFromName(start);
  const n2 = getMidiNoteFromName(end);
  console.log(`keyboard[${n1},${n2}] created: keys ${start} through ${end}`);
  const keyboard = document.getElementById('keyboard');
  if (keyboard) {
    KEYS = new Map();
    while (keyboard.firstChild) keyboard.removeChild(keyboard.firstChild);
    for (let mnote = n1; mnote <= n2; mnote++) {
      const keyDiv = m_MakeKeyDiv(mnote);
      KEYS.set(mnote, keyDiv);
      keyboard.appendChild(keyDiv);
    }
  }
  console.log(`keyboard ui elements: ${KEYS.size} keys in map`);
}

/// MIDI NOTE UTILITIES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function getMidiNoteFromName(name: string) {
  let noteName = name[0];
  let octave = parseInt(name[name.length - 1]);
  let mnote = octave * 12 + 12;
  mnote += 'C D EF G A B'.indexOf(noteName);
  if (name[1] === '#') mnote++;
  else if (name[1] === 'b') mnote--;
  return mnote;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function getNameFromMidiNote(mnote: number) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = noteNames[mnote % 12];
  return noteName;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function getNoteOctave(mnote: number) {
  return Math.floor(mnote / 12);
}

/// MIDI HANDLERS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// MIDI connection successful
const onMIDISuccess = midiAccess => {
  const inputs = midiAccess.inputs.values();
  for (let input of inputs) {
    input.onmidimessage = getMIDIMessage;
  }
  // List connected MIDI devices
  const outputs = midiAccess.outputs.values();
  if (outputs.length === 0) console.log('No MIDI outputs connected.');
  for (let output of outputs) {
    console.log('Connected MIDI device:', output.name, output.manufacturer);
  }
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// MIDI connection failure
const onMIDIFailure = () => {
  console.log('Failed to access MIDI devices.');
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Handle incoming MIDI messages
const getMIDIMessage = message => {
  let command = message.data[0];
  let note = message.data[1];
  let velocity = message.data.length > 2 ? message.data[2] : 0;

  if (command === 144 && velocity > 0) {
    // Note on
    playSound(note, velocity);
  } else if (command === 128 || (command === 144 && velocity === 0)) {
    // Note off
    stopSound(note);
  }
};

/// SOUND GENERATOR ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Function to play a sound
const playSound = (note, velocity) => {
  // make sure audio is enabled
  if (!AUDIO || AUDIO.state === 'suspended') {
    // make BUTTON element flash transition
    BUTTON.style.backgroundColor = 'red';
    BUTTON.style.color = 'white';
    BUTTON.style.transition = 'background-color 0.5s ease-out';
    setTimeout(() => {
      BUTTON.style.backgroundColor = 'white';
      BUTTON.style.color = 'black';
    }, 500);
    return;
  }

  // Create an oscillator node
  let oscillator = AUDIO.createOscillator();
  oscillator.type = 'sine';

  // Calculate frequency based on MIDI note value
  let frequency = Math.pow(2, (note - 69) / 12) * 440;
  oscillator.frequency.setValueAtTime(frequency, AUDIO.currentTime);

  // Create a gain node to control volume
  let gainNode = AUDIO.createGain();
  gainNode.gain.value = velocity / 127;

  // Connect the oscillator to the gain node and the gain node to the output
  oscillator.connect(gainNode);
  gainNode.connect(AUDIO.destination);

  // Start the oscillator
  oscillator.start();
  console.log('playing note', note, 'at frequency', frequency);
  // Stop the oscillator after a duration
  oscillator.stop(AUDIO.currentTime + 1);
  // key highlighting interface
  const key = KEYS.get(note);
  key.classList.add('playing');
  oscillator.onended = () => key.classList.remove('playing');
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Function to stop a sound
const stopSound = note => {
  // Implement logic to stop the sound for the given note
  // This could involve keeping track of the oscillators and stopping the relevant one
};

/// MODULE INIT ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function InitMIDI() {
  // Check if the Web MIDI API is supported
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    m_DrawKeyboard();
  } else {
    console.log('Web MIDI API not supported!');
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { InitMIDI };
