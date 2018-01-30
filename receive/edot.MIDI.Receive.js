// edot.MIDI
;
(function() {
	var Device = {
		devices: [],
		names: {},
		data: {
			save: saveAction,
			load: loadAction,
		},
	};
	var Ctrls = {
		OriginalGUI: {},
		Original: {},
		edot_MIDI: {},
	};
	var Setting = {
		gui: null,
		data: {},
		storageKey: 'edot.MIDI.SaveObject',
		loadBtn: null,
	};
	var Settings = {};

	function createChar(base) {
		return String.fromCharCode(base + Math.floor(Math.random() * 26))
	}

	function createUpperChar() {
		return createChar(65);
	}

	function createLowerChar() {
		return createChar(97);
	}

	function createGauss() {
		var s = 0.0;
		for (var i = 0; i < 6; i++) {
			s += Math.random();
		}
		return s / 6.0;
	}

	function createWord() {
		var n = createGauss();
		var str = '';
		for (var i = 0; i < n * 3 + 2; i++) {
			str += createLowerChar();
		}
		return str;
	}

	function createString(limit) {
		var str = createUpperChar() + createWord();
		while (str.length < limit) {
			str += ' ' + createWord();
		}
		if (str.length > limit) {
			str = str.substring(0, limit);
			if (str.charAt(str.length - 1) == ' ') {
				str = str.substring(0, str.length - 2) + '.';
			}
		}
		return str;
	}

	function noteOnString(ctrl, value) {
		if (ctrl.__select !== void 0) {
			var n = ctrl.__select.childNodes.length;
			var index = parseInt(Math.round((n - 1) * value / 127.0));
			var target = ctrl.__select.childNodes[index].getAttribute('value');
			ctrl.setValue(target);
		} else {
			if (value == 0) {
				ctrl.setValue('');
			}
			ctrl.setValue(createString(value));
		}
	}

	function noteOnFunction(ctrl, value) {
		if (value > 63) {
			if (ctrl.__edot_MIDI_fired === void 0) {
				ctrl.fire();
				ctrl.__edot_MIDI_fired = true;
			}
		} else {
			ctrl.__edot_MIDI_fired = void 0;
		}
	}

	function noteOnColor(ctrl, value) {
		if (ctrl.__color.s == 0.0) {
			ctrl.__color.v = value / 127.0;
		} else {
			ctrl.__color.h = parseInt(value / 127.0 * 360.0);
		}
		ctrl.setValue(ctrl.__color.toOriginal());
	}

	function noteOnBoolean(ctrl, value) {
		ctrl.setValue(value > 63);
	}

	function noteOnNumber(ctrl, value) {
		if (ctrl.__max !== void 0 && ctrl.__min !== void 0) {
			ctrl.setValue(((ctrl.__max - ctrl.__min) / 127.0) * value + ctrl.__min);
		} else {
			ctrl.setValue(value);
		}
	}

	function noteOn(channel, noteNumber, velocity) {
		if (!Settings) return;
		var ctrlInfo = Settings[noteNumber];
		if (!ctrlInfo) return;
		var ctrl = Ctrls.Original[ctrlInfo.label][ctrlInfo.key];
		if (!ctrl) return;
		if (ctrl.__li.classList.contains('number')) {
			noteOnNumber(ctrl, velocity);
		} else if (ctrl.__li.classList.contains('boolean')) {
			noteOnBoolean(ctrl, velocity);
		} else if (ctrl.__li.classList.contains('color')) {
			noteOnColor(ctrl, velocity);
		} else if (ctrl.__li.classList.contains('function')) {
			noteOnFunction(ctrl, velocity);
		} else if (ctrl.__li.classList.contains('string')) {
			noteOnString(ctrl, velocity);
		}
	}

	function noteOff(channel, noteNumber, velocity) {}

	function toHex(v) {
		return '0x' + (('0000' + v.toString(16).toUpperCase()).substr(-2));
	}

	function switchDevice(index) {
		Device.devices.forEach(function(element) {
			element.onmidimessage = null;
		});
		if (index === '')
			return;
		Device.devices[index].onmidimessage = function(event) {
			if (event.data.length < 3)
				return;
			var cmd = event.data[0] & 0xf0;
			var channel = event.data[0] & 0x0f;
			console.log(toHex(cmd), toHex(channel), event.data[1], event.data[2]);
			if (channel != Device.data.channel)
				return;
			var noteNumber = event.data[1];
			var velocity = event.data[2];
			switch (cmd) {
				case 0xb0:
				case 0x90:
					noteOn(channel, noteNumber, velocity);
					break;
				case 0x80:
					noteOff(channel, noteNumber, velocity);
					break;
				default:
					break;
			}
		};
	}

	function updateLoadBtnLabel(timestamp) {
		if (Setting.loadBtn && timestamp) {
			Setting.loadBtn.innerHTML = (new Date(timestamp)).toLocaleString();
		}
	}

	function InitMIDIDevicesSaveLoad(folder) {
		folder.add(Device.data, 'save');
		var l = folder.add(Device.data, 'load');
		Setting.loadBtn = (l.domElement.getElementsByClassName('button')[0]);
		if (('localStorage' in window) && (window.localStorage !== null)) {
			var json = localStorage.getItem(Setting.storageKey);
			if (json && typeof json === 'string') {
				var newData = JSON.parse(json);
				updateLoadBtnLabel(newData.date);
			}
		}
	}

	function initMidiDevices() {
		navigator.requestMIDIAccess({
			sysex: false
		}).then(function(midiAccess) {
			var DeviceIterator = midiAccess.inputs.values();
			for (var i = DeviceIterator.next(); !i.done; i = DeviceIterator.next()) {
				Device.devices.push(i.value);
				Device.names[i.value.name] = Device.devices.length - 1;
			}
			if (Device.devices.length > 0) {
				var folder = Setting.gui.addFolder('edot.MIDI Settings')
				Device.data.device = 0;
				folder.add(Device.data, 'device', Device.names)
					.onFinishChange(function(value) {
						switchDevice(value);
					});
				Device.data.channel = 0;
				var channels = {};
				for (var i = 0; i < 16; i++) channels['ch' + (i + 1)] = i;
				folder.add(Device.data, 'channel', channels);
				switchDevice(Device.data.device);
			}
			InitMIDIDevicesSaveLoad(folder);
		}, function(error) {
			console.dir(error);
		});
	}

	function updateSettings(currKey, l) {
		Settings = {};
		var currValue = void 0;
		if (l && currKey) {
			currValue = Setting.data[l][currKey];
			Settings[currValue] = {
				key: currKey,
				label: l,
			};
		}
		Object.keys(Setting.data).forEach(function(label) {
			Object.keys(Setting.data[label]).forEach(function(key) {
				var value = Setting.data[label][key];
				if (value > -1 && value != currValue) {
					Settings[value] = {
						key: key,
						label: label,
					};
				}
			});
		});
		Object.keys(Setting.data).forEach(function(label) {
			Object.keys(Setting.data[label]).forEach(function(key) {
				var value = Setting.data[label][key];
				if (Settings[value] !== void 0 && Settings[value].key != key) {
					Setting.data[label][key] = -1;
					Ctrls.edot_MIDI[label][key].updateDisplay();
				}
			});
		});
	}

	function wheelAction(e) {
		var label = this.getAttribute('data__edot_MIDI_label');
		var property = this.getAttribute('data__edot_MIDI_property');
		var ctrl = Ctrls.edot_MIDI[label][property];
		if (ctrl)
			ctrl.setValue(ctrl.getValue() + ctrl.__step * ((e.deltaY > 0) ? 1 : -1));
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	}

	function createSettingGUI(f, t, l) {
		f.__controllers.forEach(function(ctrl) {
			Ctrls.Original[l][ctrl.property] = ctrl;
			if (Setting.data[l][ctrl.property] === void 0)
				Setting.data[l][ctrl.property] = -1;
			var ctrl2 = t.add(Setting.data[l], ctrl.property, -1, 127, 1)
				.onFinishChange(function(value) {
					updateSettings(this.property, ctrl2.__edot_MIDI_label);
				});
			ctrl2.__edot_MIDI_label = l;
			Ctrls.edot_MIDI[l][ctrl.property] = ctrl2;
			var input = (ctrl2.domElement.getElementsByTagName('input')[0]);
			input.setAttribute('data__edot_MIDI_label', l);
			input.setAttribute('data__edot_MIDI_property', ctrl.property);
			input.addEventListener('wheel', wheelAction);
		});
		Object.keys(f.__folders).forEach(function(key) {
			var nf = t.addFolder(key);
			if (f.__folders[key].closed == false)
				nf.open();
			createSettingGUI(f.__folders[key], nf, l);
		});
	}

	function saveAction() {
		if (!('localStorage' in window) || (window.localStorage === null))
			return alert('This browser does not seem to be able to use localStorage.');
		var data = {
			date: Date.now(),
			deviceName: Device.devices[Device.data.device].name,
			Device: {
				device: Device.data.device,
				channel: Device.data.channel,
			}
		};
		data.Setting = Setting.data;
		localStorage.setItem(Setting.storageKey, JSON.stringify(data));
		updateLoadBtnLabel(data.date);
	}

	function messageDialog(newData) {
		if (!(newData.Device.device < Device.devices.length)) {
			var str0 = 'WARNING: The number of device is ' + Device.devices.length + ',';
			var str1 = ' so it is not able to set the saved device index(' + newData.Device.device + ').';
			var str2 = 'Set the first device (the index is 0).'
			newData.Device.device = 0;
			return alert(str0 + str1 + str2);
		}
		if (newData.deviceName == Device.devices[newData.Device.device].name)
			return;
		var str0 = 'WARNING: The device name("' + Device.devices[newData.Device.device].name + '")';
		var str1 = ' which is the loaded device index';
		var str2 = ' is different from the saved device name(' + newData.deviceName + ').';
		alert(str0 + str1 + str2);
	}

	function loadAction() {
		if (!('localStorage' in window) || (window.localStorage === null))
			return alert('This browser does not seem to be able to use localStorage.');
		var json = localStorage.getItem(Setting.storageKey);
		if (!json)
			return alert('This browser does not seem to be stored the data.');
		var newData = JSON.parse(json);
		messageDialog(newData);
		Object.keys(newData.Device).forEach(function(key) {
			Device.data[key] = parseInt(newData.Device[key]);
		});
		Object.keys(Setting.data).forEach(function(label) {
			Object.keys(newData.Setting[label]).forEach(function(key) {
				Setting.data[label][key] = newData.Setting[label][key];
			});
		});
		Setting.gui.updateDisplay();
		switchDevice(Device.data.device);
		updateSettings();
	}

	function createLeftTopGUI() {
		var gui = (new dat.GUI({
			autoPlace: false,
		}));
		var guiContainer = document.createElement('div');
		guiContainer.setAttribute('id', 'edotMIDIgui');
		guiContainer.style.position = 'absolute';
		guiContainer.style.left = '5px';
		guiContainer.style.top = '0px';
		guiContainer.style.zIndex = '10';
		(document.getElementsByTagName('body')[0]).appendChild(guiContainer);
		document.getElementById('edotMIDIgui').appendChild(gui.domElement);
		return gui;
	}

	function closeGUIAction() {
		var btn = Setting.gui.__closeButton;
		var label = btn.innerHTML;
		var prefix = '[edot.MIDI] ';
		btn.innerHTML = prefix + label;
		var closed = Setting.gui.__ul.classList.contains('closed');
		btn.style.opacity = (closed) ? 0.3 : 1.0;

		if (!closed && Setting.gui.domElement.offsetHeight > window.innerHeight) {
			Setting.gui.domElement.classList.add('taller-than-window');
			Setting.gui.__ul.style.height = (window.innerHeight - 20) + 'px';
			Setting.gui.__ul.style.overflowY = 'scroll';
		} else {
			Setting.gui.__ul.style.height = void 0;
			Setting.gui.__ul.style.overflowY = void 0;
			Setting.gui.domElement.classList.remove('taller-than-window');
		}
	}

	if (window.edot === void 0)
		window.edot = {};
	if (window.edot.MIDI === void 0)
		window.edot.MIDI = {};
	window.edot.MIDI.Receive = function(gui, label) {
		if (!navigator.requestMIDIAccess)
			return alert('This browser does not seem to support Web MIDI.');
		if (gui === void 0)
			return alert('This library requires an argument of the dat.gui.js instance.');
		Ctrls.OriginalGUI[label] = gui;
		Ctrls.Original[label] = {};
		Ctrls.edot_MIDI[label] = {};
		Setting.data[label] = {};
		if (!Setting.gui) {
			Setting.gui = createLeftTopGUI();
			Setting.gui.__closeButton.addEventListener('click', closeGUIAction);
			closeGUIAction();
			initMidiDevices();
		}
		var t = Setting.gui.addFolder(label);
		t.open();
		createSettingGUI(gui, t, label);
		updateSettings();
	};
})();
