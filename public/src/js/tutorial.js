class Tutorial{
	constructor(...args){
		this.init(...args)
	}
	init(fromSongSel, songId){
		this.fromSongSel = fromSongSel
		this.songId = songId
		loader.changePage("tutorial", true)
		assets.sounds["bgm_setsume"].playLoop(0.1, false, 0, 1.054, 16.054)
		this.endButton = this.getElement("view-end-button")
		
		this.tutorialTitle = this.getElement("view-title")
		this.tutorialDiv = document.createElement("div")
		this.getElement("view-content").appendChild(this.tutorialDiv)
		
		this.items = []
		this.items.push(this.endButton)
		this.selected = this.items.length - 1
		
		this.setStrings()
		
		pageEvents.add(this.endButton, ["mousedown", "touchstart"], this.onEnd.bind(this))
		this.keyboard = new Keyboard({
			confirm: ["enter", "space", "don_l", "don_r"],
			previous: ["left", "up", "ka_l"],
			next: ["right", "down", "ka_r"],
			back: ["escape"]
		}, this.keyPressed.bind(this))
		this.gamepad = new Gamepad({
			"confirm": ["b", "ls", "rs"],
			"previous": ["u", "l", "lb", "lt", "lsu", "lsl"],
			"next": ["d", "r", "rb", "rt", "lsd", "lsr"],
			"back": ["start", "a"]
		}, this.keyPressed.bind(this))
		
		pageEvents.send("tutorial")
	}
	getElement(name){
		return loader.screen.getElementsByClassName(name)[0]
	}
	keyPressed(pressed, name){
		if(!pressed){
			return
		}
		var selected = this.items[this.selected]
		if(name === "confirm"){
			if(selected === this.endButton){
				this.onEnd()
			}else{
				this.getLink(selected).click()
				assets.sounds["se_don"].play()
			}
		}else if(name === "previous" || name === "next"){
			if(this.items.length >= 2){
				selected.classList.remove("selected")
				this.selected = this.mod(this.items.length, this.selected + (name === "next" ? 1 : -1))
				this.items[this.selected].classList.add("selected")
				assets.sounds["se_ka"].play()
			}
		}else if(name === "back"){
			this.onEnd()
		}
	}
	mod(length, index){
		return ((index % length) + length) % length
	}
	onEnd(event){
		var touched = false
		if(event){
			if(event.type === "touchstart"){
				event.preventDefault()
				touched = true
			}else if(event.which !== 1){
				return
			}
		}
		this.clean()
		assets.sounds["se_don"].play()
		try{
			localStorage.setItem("tutorial", "true")
		}catch(e){}
		setTimeout(() => {
			new SongSelect(this.fromSongSel ? "tutorial" : false, false, touched, this.songId)
		}, 500)
	}
	getLink(target){
		return target.getElementsByTagName("a")[0]
	}
	linkButton(event){
		if(event.target === event.currentTarget && (event.type === "touchstart" || event.which === 1)){
			this.getLink(event.currentTarget).click()
			assets.sounds["se_don"].play()
		}
	}
	insertText(text, parent){
		parent.appendChild(document.createTextNode(text))
	}
	insertKey(key, parent){
		if(!Array.isArray(key)){
			key = [key]
		}
		var join = true
		for(var i = 0; i < key.length; i++){
			if(key[i] === false){
				join = false
				continue
			}
			if(i !== 0){
				if(join){
					var span = document.createElement("span")
					span.classList.add("key-join")
					span.innerText = strings.tutorial.key.join
					parent.appendChild(span)
				}else{
					parent.appendChild(document.createTextNode(strings.tutorial.key.or))
				}
			}
			var kbd = document.createElement("kbd")
			kbd.innerText = key[i]
			parent.appendChild(kbd)
		}
	}
	setStrings(){
		this.tutorialTitle.innerText = strings.howToPlay
		this.tutorialTitle.setAttribute("alt", strings.howToPlay)
		this.endButton.innerText = strings.tutorial.ok
		this.endButton.setAttribute("alt", strings.tutorial.ok)
		this.tutorialDiv.innerHTML = ""
		var kbdSettings = settings.getItem("keyboardSettings")
		var pauseKey = [strings.tutorial.key.esc]
		if(pageEvents.kbd.indexOf("q") === -1){
			pauseKey.push(false)
			pauseKey.push("Q")
		}
		var keys = [
			kbdSettings.don_l[0].toUpperCase(),
			kbdSettings.don_r[0].toUpperCase(),
			kbdSettings.ka_l[0].toUpperCase(),
			kbdSettings.ka_r[0].toUpperCase(),
			pauseKey,
			[strings.tutorial.key.shift, strings.tutorial.key.leftArrow],
			[strings.tutorial.key.shift, strings.tutorial.key.rightArrow],
			strings.tutorial.key.shift,
			strings.tutorial.key.ctrl
		]
		var keyIndex = 0
		strings.tutorial.basics.forEach(string => {
			var par = document.createElement("p")
			var stringKeys = string.split("%s")
			stringKeys.forEach((stringKey, i) => {
				if(i !== 0){
					this.insertKey(keys[keyIndex++], par)
				}
				this.insertText(stringKey, par)
			})
			this.tutorialDiv.appendChild(par)
		})
		var par = document.createElement("p")
		var span = document.createElement("span")
		span.style.fontWeight = "bold"
		span.innerText = strings.tutorial.otherControls
		par.appendChild(span)
		strings.tutorial.otherTutorial.forEach(string => {
			par.appendChild(document.createElement("br"))
			var stringKeys = string.split("%s")
			stringKeys.forEach((stringKey, i) => {
				if(i !== 0){
					this.insertKey(keys[keyIndex++], par)
				}
				this.insertText(stringKey, par)
			})
		})
		this.tutorialDiv.appendChild(par)
	}
	clean(){
		this.keyboard.clean()
		this.gamepad.clean()
		pageEvents.remove(this.endButton, ["mousedown", "touchstart"])
		assets.sounds["bgm_setsume"].stop()
		delete this.tutorialTitle
		delete this.endButton
		delete this.tutorialDiv
	}
}
