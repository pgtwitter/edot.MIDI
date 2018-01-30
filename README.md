## Receive
edot.MIDI.Receiveはdat.gui.jsで作成されたUIをWebMIDIの受信によって操作できるようにするツールです．

1. 'edot.Midi.Receive.js'を読み込むように追加する．

  ```
  <script src="path/to/edot.MIDI.Receive.js"></script>
  ```

2. dat.gui.jsのGUIインスタンスにコントローラーを設定後，GUIインスタンスを引数にしてedotMIDIの関数を呼び出す．

  ```
  // var gui = new dat.GUI();
  // gui.add(...)
  // ...
  edot.MIDI.Receive(gui);
  ```

3. 複数のGUIインスタンスを登録する場合は，GUIインスタンスとそのラベルを引数にしてedot.MIDIのReceive関数を呼び出す．

  ```
   // var gui1 = new dat.GUI();
   // gui1.add(...)
   // ...
   edot.MIDI.Receive(gui1, 'first');

   // var gui2 = new dat.GUI();
   // gui2.add(...)
   // ...
   edot.MIDI.Receive(gui2, 'second');
  ```

## Send
edot.MIDI.Sendはdat.gui.jsを用いてWebMIDIの送信を行うツールです．

1. 'edot.Midi.Send.js'を読み込むように追加する．

  ```
  <script src="path/to/edot.MIDI.Send.js"></script>
  ```

2. edot.MIDIのSend関数を呼び出す．

  ```
  edot.MIDI.Send();
  ```

3. 既存のdat.gui.jsのGUIインスタンスに追加する形にするならGUIインスタンスを引数にする．

  ```
  // var gui = new dat.GUI();
  // gui.add(...)
  // ...
  edot.MIDI.Send(gui);
  ```

### WebMIDI対応ブラウザ
  https://caniuse.com/#feat=midi
