/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  prototype code for implementing MIDI+WebAudio in a browser

  OCTAVE_OFFSET is used to shift the reference octave number
  midi note 60 is defined as middle C, but the octave number varies by software

  TODO: look at these for octave offset bugs
  .. getNoteOctave() 
  .. getMidiNoteFromName()
  .. getNameFromMidiNote()

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import * as Tone from 'tone';
import { ConsoleStyler } from '@ursys/core';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let AUDIO: AudioContext;
let KEYS: Map<number, HTMLElement>;
let BUTTON: HTMLButtonElement;
let RADIO: HTMLElement;
let SAMPLER: Tone.Sampler;
let OCTAVE_OFFSET = 0;
let FnOutput: Function;
const PR = ConsoleStyler('MIDI', 'TagPurple');

/// UI EFFECTS ////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function ui_WaitingForAudioContext() {
  if (!AUDIO || AUDIO.state === 'suspended') {
    // make BUTTON element flash transition
    BUTTON.style.backgroundColor = 'red';
    BUTTON.style.color = 'white';
    BUTTON.style.transition = 'background-color 0.5s ease-out';
    setTimeout(() => {
      BUTTON.style.backgroundColor = 'white';
      BUTTON.style.color = 'black';
    }, 500);
    // still waiting
    return true;
  }
  // not waiting
  return false;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function ui_MakeKeyDiv(mnote: number) {
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
function ui_KeyToggle(mnote: number) {
  // key highlighting interface
  const key = KEYS.get(mnote);
  if (key.classList.contains('playing')) key.classList.remove('playing');
  else key.classList.add('playing');
}

/// FEATURES //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** create audio context on click */
function m_EnableAudioContext() {
  AUDIO = new window.AudioContext();
  BUTTON = document.createElement('button');
  BUTTON.style.backgroundColor = 'white';
  BUTTON.style.color = 'black';
  BUTTON.textContent = 'Click to Enable Audio';
  BUTTON.style.marginTop = '2em';
  BUTTON.addEventListener('click', function () {
    AUDIO.resume().then(() => {
      console.log(...PR('User Click: Audio Context is now enabled'));
      BUTTON.style.display = 'none';
    });
  });
  document.body.appendChild(BUTTON);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_EnableOutputSelect() {
  RADIO = document.createElement('div');
  RADIO.classList.add('output-select');

  const radioItem1 = document.createElement('input');
  radioItem1.type = 'radio';
  radioItem1.name = 'radio-group';
  radioItem1.value = 'piano';
  radioItem1.checked = true;
  RADIO.appendChild(radioItem1);
  const radioLabel1 = document.createElement('label');
  radioLabel1.textContent = 'Piano';
  RADIO.appendChild(radioLabel1);
  //
  const radioItem2 = document.createElement('input');
  radioItem2.type = 'radio';
  radioItem2.name = 'radio-group';
  radioItem2.value = 'oscillator';
  RADIO.appendChild(radioItem2);
  const radioLabel2 = document.createElement('label');
  radioLabel2.textContent = 'Oscillator';
  RADIO.appendChild(radioLabel2);

  // add radio button handler
  RADIO.addEventListener('change', () => {
    const radio: HTMLInputElement = document.querySelector(
      'input[name="radio-group"]:checked'
    );
    if (radio.value === 'piano') FnOutput = playPianoNote;
    else FnOutput = playOscillatorNote;
  });
  // set default output function
  FnOutput = playPianoNote;
  // add to DOM
  document.body.appendChild(RADIO);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_EnableKeyboard(start: string = 'C3', end: string = 'C5') {
  const keyboard = document.createElement('div');
  keyboard.id = 'keyboard';
  const n1 = getMidiNoteFromName(start);
  const n2 = getMidiNoteFromName(end);
  console.log(...PR(`keyboard[${n1},${n2}] created: keys ${start} through ${end}`));
  if (keyboard) {
    KEYS = new Map();
    while (keyboard.firstChild) keyboard.removeChild(keyboard.firstChild);

    for (let mnote = n1; mnote <= n2; mnote++) {
      const keyDiv = ui_MakeKeyDiv(mnote);
      KEYS.set(mnote, keyDiv);
      keyboard.appendChild(keyDiv);
    }
  }
  console.log(...PR(`keyboard ui elements: ${KEYS.size} keys in map`));
  // add to DOM
  document.body.appendChild(keyboard);
}

/// MIDI NOTE UTILITIES ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function getMidiNoteFromName(name: string) {
  let noteName = name[0];
  let octave = parseInt(name[name.length - 1]);
  let mnote = (octave + OCTAVE_OFFSET) * 12 + 12;
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
  if (outputs.length === 0) console.log(...PR('No MIDI outputs connected.'));
  for (let output of outputs) {
    console.log(...PR('Connected MIDI device:', output.name, output.manufacturer));
  }
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// MIDI connection failure
const onMIDIFailure = () => {
  console.log(...PR('Failed to access MIDI devices.'));
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Handle incoming MIDI messages
const getMIDIMessage = message => {
  let command = message.data[0];
  let mnote = message.data[1];
  let velocity = message.data.length > 2 ? message.data[2] : 0;
  ui_KeyToggle(mnote);
  if (command === 144 && velocity > 0) {
    // Note on
    playMidiNote(mnote, velocity);
  } else if (command === 128 || (command === 144 && velocity === 0)) {
    // Note off
    stopMidiNote(mnote);
  }
};

/// SOUND GENERATOR HELPERS ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** pure oscillator through audio context */
function playOscillatorNote(mnote, mvel) {
  // Create an oscillator node
  let oscillator = AUDIO.createOscillator();
  oscillator.type = 'sine';

  // Calculate frequency based on MIDI note value
  let frequency = Math.pow(2, (mnote - 69) / 12) * 440;
  oscillator.frequency.setValueAtTime(frequency, AUDIO.currentTime);

  // Create a gain node to control volume
  let gainNode = AUDIO.createGain();
  gainNode.gain.value = mvel / 127;

  // Connect the oscillator to the gain node and the gain node to the output
  oscillator.connect(gainNode);
  gainNode.connect(AUDIO.destination);

  // Start the oscillator
  oscillator.start();
  console.log(...PR(`playing (K${mnote}V${mvel}) osc freq:${frequency}`));
  // Stop the oscillator after a duration
  oscillator.stop(AUDIO.currentTime + 1);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// /** piano sampler through tone.js */
function playPianoNote(mnote: number, mvel: number = 127) {
  const letter = getNameFromMidiNote(mnote);
  const octave = getNoteOctave(mnote);
  const note = `${letter}${octave}`;
  const velocity = mvel / 127;
  console.log(...PR(`playing ${note} (K${mnote}V${mvel}) piano sampler`));
  SAMPLER.triggerAttackRelease(note, '8n', undefined, velocity);
}

/// SOUND GENERATOR ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Function to play a sound
const playMidiNote = (mnote, velocity) => {
  // make sure audio is enabled
  if (ui_WaitingForAudioContext()) return;
  if (FnOutput) FnOutput(mnote, velocity);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Function to stop a sound
const stopMidiNote = note => {
  // Implement logic to stop the sound for the given note
  // This could involve keeping track of the oscillators and stopping the relevant one
};

/// MODULE INIT ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function InitApp() {
  m_EnableOutputSelect();
  m_EnableKeyboard();
  m_EnableAudioContext();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function InitMIDI() {
  // Check if the Web MIDI API is supported
  if (!navigator.requestMIDIAccess) {
    console.log(...PR('Web MIDI API not supported!'));
    return;
  }
  // Initialize!
  navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  // PIANO SAMPLER
  SAMPLER = new Tone.Sampler({
    urls: {
      A0: 'A0.mp3',
      C1: 'C1.mp3',
      'D#1': 'Ds1.mp3',
      'F#1': 'Fs1.mp3',
      A1: 'A1.mp3',
      C2: 'C2.mp3',
      'D#2': 'Ds2.mp3',
      'F#2': 'Fs2.mp3',
      A2: 'A2.mp3',
      C3: 'C3.mp3',
      'D#3': 'Ds3.mp3',
      'F#3': 'Fs3.mp3',
      A3: 'A3.mp3',
      C4: 'C4.mp3',
      'D#4': 'Ds4.mp3',
      'F#4': 'Fs4.mp3',
      A4: 'A4.mp3',
      C5: 'C5.mp3',
      'D#5': 'Ds5.mp3',
      'F#5': 'Fs5.mp3',
      A5: 'A5.mp3',
      C6: 'C6.mp3',
      'D#6': 'Ds6.mp3',
      'F#6': 'Fs6.mp3',
      A6: 'A6.mp3',
      C7: 'C7.mp3',
      'D#7': 'Ds7.mp3',
      'F#7': 'Fs7.mp3',
      A7: 'A7.mp3',
      C8: 'C8.mp3'
    },
    release: 10,
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    onload: () => {
      console.log(...PR('Piano Sampler loaded'));
      const reverb = new Tone.Reverb(10);
      SAMPLER.chain(reverb, Tone.Destination);
      InitApp();
    }
  }).toDestination();
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { InitMIDI };
