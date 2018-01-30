// edot.MIDI
;
(function() {
	var Device = {
		devices: [],
		names: {},
		data: {
			add: addAction,
			save: saveAction,
			load: loadAction,
		},
	};
	var Ctrls = {
		guis: {},
	};
	var Setting = {
		storageKey: 'edot.MIDI.Send.SaveObject',
		data: {},
	};

	function deleteCtrlIMP(name) {
		Ctrls.guis[name].remove();
		delete Ctrls.guis[name];
		delete Setting.data[name];
	}

	function deleteCtrl() {
		if (confirm('delete this control?')) {
			deleteCtrlIMP(this.getAttribute('data-name'));
		}
	}

	function isNumeric(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}

	function wheelAction(e) {
		var property = this.getAttribute('data__edot_MIDI_property');
		var ctrl = Ctrls.guis[property];
		if (ctrl)
			ctrl.setValue(ctrl.getValue() + ctrl.__step * ((e.deltaY > 0) ? 1 : -1));
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	}

	function addActionIMP(keyLabel) {
		if (Ctrls.guis[keyLabel]) return;
		if (Setting.data[keyLabel] === void 0)
			Setting.data[keyLabel] = 0;
		var c = Setting.gui.add(Setting.data, keyLabel, 0, 127, 1)
			.onChange(function(value) {
				var msg = ['0xB' + Device.data.channel,
					parseInt(this.property.substring(4)),
					parseInt(value)
				];
				Device.devices[Device.data.device].send(msg);
			});
		Ctrls.guis[keyLabel] = c;
		var input = (c.domElement.getElementsByTagName('input')[0]);
		input.setAttribute('data__edot_MIDI_property', c.property);
		input.addEventListener('wheel', wheelAction);
		c.domElement.parentElement.setAttribute('data-name', keyLabel);
		c.domElement.parentElement.addEventListener('dblclick', deleteCtrl);
		return c;
	}

	function addAction() {
		var msg = 'Note Number(0-127)?';
		var name = prompt(msg);
		if (!name || name.length == 0) return;
		while (!isNumeric(parseInt(name)) ||
			parseInt(name) < 0 ||
			127 < parseInt(name) ||
			Ctrls.guis['port' + name] != undefined) {
			name = prompt(msg);
			if (!name || name.length == 0) return;
		}
		addActionIMP('port' + name);
	};

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

	function InitMIDIDevices(gui) {
		navigator.requestMIDIAccess({
			sysex: false
		}).then(function(MIDIAccess) {
			var DeviceIterator = MIDIAccess.outputs.values();
			for (var i = DeviceIterator.next(); !i.done; i = DeviceIterator.next()) {
				Device.devices.push(i.value);
				Device.names[i.value.name] = Device.devices.length - 1;
			}
			var folder = Setting.gui.addFolder('edot.MIDI Settings')
			if (Device.devices.length > 0) {
				Device.data.device = 0;
				folder.add(Device.data, 'device', Device.names);
				Device.data.channel = 0;
				var channels = {};
				for (var i = 0; i < 16; i++) channels['ch' + (i + 1)] = i;
				folder.add(Device.data, 'channel', channels);
			}
			InitMIDIDevicesSaveLoad(folder);
			Setting.gui.add(Device.data, 'add');
		}, function(err) {
			console.dir(err);
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
		if (newData.deviceName == Device.devices[Device.data.device].name)
			return;
		var str0 = 'WARNING: The device name("' + Device.devices[Device.data.device].name + '")';
		var str1 = ' which is the loaded device index';
		var str2 = ' is different from the saved device name(' + newData.deviceName + ').';
		alert(str0 + str1 + str2);
	}

	function confirmDialog() {
		var str0 = 'CONFIRM: Would you send loaded values';
		var str1 = ' for initialize("OK" is YES/"Cancel" is NO)?';
		return confirm(str0 + str1);
	}

	function loadAction() {
		if (!('localStorage' in window) || (window.localStorage === null))
			return alert('This browser does not seem to be able to use localStorage.');
		var json = localStorage.getItem(Setting.storageKey);
		if (!json)
			return alert('This browser does not seem to be stored the data.');
		if (typeof json !== 'string')
			return alert('This stored data is not matched current edot.MIDI style.');
		var newData = JSON.parse(json);
		messageDialog(newData);
		var flag = confirmDeviceDialog(newData);
		Object.keys(newData.Device).forEach(function(key) {
			Device.data[key] = parseInt(newData.Device[key]);
		});
		Object.keys(Ctrls.guis).forEach(function(key) {
			deleteCtrlIMP(key);
		});
		Object.keys(newData.Setting).forEach(function(key) {
			Setting.data[key] = newData.Setting[key];
			var ctrl = addActionIMP(key);
			if (flag)
				ctrl.setValue(Setting.data[key]);
		});
		Setting.gui.updateDisplay();
	}

	function closeGUIAction() {
		var btn = Setting.gui.__closeButton;
		var label = btn.innerHTML;
		var prefix = '[edot.MIDI] ';
		btn.innerHTML = prefix + label;
		var closed = Setting.gui.__ul.classList.contains('closed');
		btn.style.opacity = (closed) ? 0.3 : 1.0;
	}

	if (window.edot === void 0)
		window.edot = {};
	if (window.edot.MIDI === void 0)
		window.edot.MIDI = {};
	window.edot.MIDI.Send = function(gui) {
		if (!navigator.requestMIDIAccess)
			return alert('This browser does not seem to support Web MIDI.');
		if (gui === void 0) {
			Setting.gui = new dat.GUI();
			Setting.gui.__closeButton.addEventListener('click', closeGUIAction);
			closeGUIAction();
		} else {
			Setting.gui = gui;
		}
		InitMIDIDevices(Setting.gui);
	};
}());
