/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  description

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

let AUDIO: AudioContext;

window.onload = function () {
  AUDIO = new window.AudioContext();
  const button = document.createElement('button');
  button.textContent = 'Click to Enable Audio';
  button.addEventListener('click', function () {
    AUDIO.resume().then(() => {
      console.log('User Click: Audio Context is now enabled');
    });
  });
  document.body.appendChild(button);
};

// MIDI connection successful
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

// MIDI connection failure
const onMIDIFailure = () => {
  console.log('Failed to access MIDI devices.');
};

// Function to play a sound
const playSound = (note, velocity) => {
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
};

// Function to stop a sound
const stopSound = note => {
  // Implement logic to stop the sound for the given note
  // This could involve keeping track of the oscillators and stopping the relevant one
};

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

function InitMIDI() {
  // Check if the Web MIDI API is supported
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  } else {
    console.log('Web MIDI API not supported!');
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { InitMIDI };
