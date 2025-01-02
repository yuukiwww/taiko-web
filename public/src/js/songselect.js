class SongSelect{
	constructor(...args){
		this.init(...args)
	}
	init(fromTutorial, fadeIn, touchEnabled, songId, showWarning){
		this.touchEnabled = touchEnabled
		
		loader.changePage("songselect", false)
		this.canvas = document.getElementById("song-sel-canvas")
		this.ctx = this.canvas.getContext("2d")
		var resolution = settings.getItem("resolution")
		var noSmoothing = resolution === "low" || resolution === "lowest"
		if(noSmoothing){
			this.ctx.imageSmoothingEnabled = false
		}
		if(resolution === "lowest"){
			this.canvas.style.imageRendering = "pixelated"
		}

		let rand = () => {
			let color = Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
			return `#${color}`;
		}
	
		this.songSkin = {
			"selected": {
				background: "#ffdb2c",
				border: ["#fff4b5", "#ffa600"],
				outline: "#000"
			},
			"back": {
				background: "#efb058",
				border: ["#ffe7bd", "#c68229"],
				outline: "#ad7723"
			},
			"random": {
				sort: 0,
				background: "#fa91ff",
				border: ["#ffdfff", "#b068b2"],
				outline: "#b221bb"
			},
			"search": {
				sort: 0,
				background: "#FF5266",
				border: ["#FF9FB7", "#BE1432"],
				outline: "#A50B15"
			},
			"tutorial": {
				sort: 0,
				background: "#29e8aa",
				border: ["#86ffbd", "#009a8c"],
				outline: "#08a28c"
			},
			"about": {
				sort: 0,
				background: "#a2d0e7",
				border: ["#c6dfff", "#4485d9"],
				outline: "#2390d9"
			},
			"settings": {
				sort: 0,
				background: "#ce93fa",
				border: ["#dec4fd", "#a543ef"],
				outline: "#a741ef"
			},
			"customSongs": {
				sort: 0,
				background: "#fab5d3",
				border: ["#ffe7ef", "#d36aa2"],
				outline: "#d36aa2"
			},
			"plugins": {
				sort: 0,
				background: "#f6bba1",
				border: ["#fde9df", "#ce7553"],
				outline: "#ce7553"
			},
                        // カスタム曲スキン
                        "upload": {
                            sort: 0,
                            background: "#ffe57f",
                            border: ["#ffd54f", "#ff9800"],
                            outline: "#ffab40",
                        },
						"keijiban": {
                            sort: 0,
                            background: "#1c1c1c",
                            border: ["#000000", "#333333"],
                            outline: "#222222",
                        },
				"customSettings": {
    				sort: 0,
    				background: "#a5d6a7",  // 緑色の背景
    				border: ["#81c784", "#66bb6a"],  // 緑色の境界線
    				outline: "#388e3c"  // 緑色のアウトライン
				},
			"default": {
				sort: null,
				background: `${rand()}`,
				border: [`${rand()}`, `${rand()}`],
				outline: `#333333`,
				infoFill: `${rand()}`
			}
		}
		
		var songSkinLength = Object.keys(this.songSkin).length
		for(var i in assets.categories){
			var category = assets.categories[i]
			if(!this.songSkin[category.title] && category.songSkin){
				if(category.songSkin.sort === null){
					category.songSkin.sort = songSkinLength + 1
				}
				category.songSkin.id = category.id
				this.songSkin[category.title] = category.songSkin
			}
		}
		this.songSkin["default"].sort = songSkinLength + 1
		
		this.font = strings.font
		
		this.search = new Search(this)

		this.songs = []
		for(let song of assets.songs){
			var title = this.getLocalTitle(song.title, song.title_lang)
			song.titlePrepared = title ? fuzzysort.prepare(this.search.normalizeString(title)) : null
			var subtitle = this.getLocalTitle(title === song.title ? song.subtitle : "", song.subtitle_lang)
			song.subtitlePrepared = subtitle ? fuzzysort.prepare(this.search.normalizeString(subtitle)) : null
			this.songs.push(this.addSong(song))
		}
		this.songs.sort((a, b) => {
			var catA = a.originalCategory in this.songSkin ? this.songSkin[a.originalCategory] : this.songSkin.default
			var catB = b.originalCategory in this.songSkin ? this.songSkin[b.originalCategory] : this.songSkin.default
			if(catA.sort !== catB.sort){
				return catA.sort > catB.sort ? 1 : -1
			}else if(a.originalCategory !== b.originalCategory){
				return a.originalCategory > b.originalCategory ? 1 : -1
			}else if(a.order !== b.order){
				return a.order > b.order ? 1 : -1
			}else{
				return a.id > b.id ? 1 : -1
			}
		})
		if(assets.songs.length){
			this.songs.push({
				title: strings.back,
				skin: this.songSkin.back,
				action: "back"
			})
			this.songs.push({
				title: strings.randomSong,
				skin: this.songSkin.random,
				action: "random",
				category: strings.random,
				canJump: true,
				p2Enabled: true
			})
			this.songs.push({
				title: strings.search.search,
				skin: this.songSkin.search,
				action: "search",
				category: strings.random,
				p2Enabled: true
			})
		}
		if(touchEnabled){
			if(fromTutorial === "tutorial"){
				fromTutorial = false
			}
		}else{
			this.songs.push({
				title: strings.howToPlay,
				skin: this.songSkin.tutorial,
				action: "tutorial",
				category: strings.random
			})
		}
		this.showWarning = showWarning
		if(showWarning && showWarning.name === "scoreSaveFailed"){
			scoreStorage.scoreSaveFailed = true
		}
		this.songs.push({
			title: strings.aboutSimulator,
			skin: this.songSkin.about,
			action: "about",
			category: strings.random
		})
		this.songs.push({
			title: strings.gameSettings,
			skin: this.songSkin.settings,
			action: "settings",
			category: strings.random
		})
		
		var showCustom = false
		if(gameConfig.google_credentials.gdrive_enabled){
			showCustom = true
		}else if("webkitdirectory" in HTMLInputElement.prototype && !(/Android|iPhone|iPad/.test(navigator.userAgent))){
			showCustom = true
		}
		if(showCustom){
			this.songs.push({
				title: assets.customSongs ? strings.customSongs.default : strings.customSongs.title,
				skin: this.songSkin.customSongs,
				action: "customSongs",
				category: strings.random
			})
		}
		this.songs.push({
			title: strings.plugins.title,
			skin: this.songSkin.plugins,
			action: "plugins",
			category: strings.random
		})

                // カスタムメニュー
                // this.songs.push({
                //     title: "ソースコード",
                //     skin: this.songSkin.sourceCode,
                //     action: "sourceCode",
                // });
				// for (let i = 0; i < 10; i++) {
				    this.songs.push({
                        title: "曲を投稿！",
                        skin: this.songSkin.upload,
                        action: "upload",
                    });
                // }
				this.songs.push({
					title: "掲示板",
					skin: this.songSkin.keijiban,
					action: "keijiban",
				});

				this.songs.push({
					title: "曲選択速度",
					skin: this.songSkin.customSettings,
					action: "songSelectingSpeed",
				});
		
				this.songs.push({
					title: "ばいそく",
					skin: this.songSkin.customSettings,
					action: "baisoku",
				});

				this.songs.push({
					title: "ドロン",
					skin: this.songSkin.customSettings,
					action: "doron",
				});

				this.songs.push({
					title: "あべこべ",
					skin: this.songSkin.customSettings,
					action: "abekobe",
				});

				this.songs.push({
					title: "でたらめ",
					skin: this.songSkin.customSettings,
					action: "detarame",
				});

		this.songs.push({
			title: strings.back,
			skin: this.songSkin.back,
			action: "back"
		})
		
		this.songAsset = {
			marginTop: 104,
			marginLeft: 18,
			width: 82,
			selectedWidth: 382,
			fullWidth: 912,
			height: 452,
			fullHeight: 502,
			border: 6,
			innerBorder: 8,
			letterBorder: 12
		}
		
		this.diffOptions = [{
			text: strings.back,
			fill: "#efb058",
			iconName: "back",
			iconFill: "#f7d39c",
			letterSpacing: 4
		}, {
			text: strings.songOptions,
			fill: "#b2e442",
			iconName: "options",
			iconFill: "#d9f19f",
			letterSpacing: 0
		}, {
			text: "ダウンロード",
			fill: "#e7a9da",
			iconName: "download",
			iconFill: "#e7cbe1",
			letterSpacing: 4
		}, {
			text: "削除",
			fill: "silver",
			iconName: "trash",
			iconFill: "#111111",
			letterSpacing: 4
		}]
		this.optionsList = [strings.none, strings.auto, strings.netplay]
		
		this.draw = new CanvasDraw(noSmoothing)
		this.songTitleCache = new CanvasCache(noSmoothing)
		this.selectTextCache = new CanvasCache(noSmoothing)
		this.categoryCache = new CanvasCache(noSmoothing)
		this.difficultyCache = new CanvasCache(noSmoothing)
		this.sessionCache = new CanvasCache(noSmoothing)
		this.currentSongCache = new CanvasCache(noSmoothing)
		this.nameplateCache = new CanvasCache(noSmoothing)
		
		
		this.difficulty = [strings.easy, strings.normal, strings.hard, strings.oni]
		this.difficultyId = ["easy", "normal", "hard", "oni", "ura"]
		
		this.sessionText = {
			"sessionstart": strings.sessionStart,
			"sessionend": strings.sessionEnd
		}
		
		this.selectedSong = 0
		this.selectedDiff = 0
		this.lastCurrentSong = {}
		this.lastRandom = false
		assets.sounds["bgm_songsel"].playLoop(0.1, false, 0, 1.442, 3.506)
		
		if(!assets.customSongs && !fromTutorial && !("selectedSong" in localStorage) && !songId){
			fromTutorial = touchEnabled ? "about" : "tutorial"
		}
		if(p2.session || assets.customSongs && "customSelected" in localStorage){
			fromTutorial = false
		}
		
		this.drumSounds = settings.getItem("latency").drumSounds
		this.playedSounds = {}
		
		var songIdIndex = -1
		var newSelected = -1
		if(fromTutorial){
			newSelected = this.songs.findIndex(song => song.action === fromTutorial)
		}
		if(newSelected !== -1){
			this.setSelectedSong(newSelected, false)
			this.playBgm(true)
		}else{
			if(songId){
				songIdIndex = this.songs.findIndex(song => song.id === songId)
				if(songIdIndex === -1){
					this.clearHash()
				}
			}
			if(songIdIndex !== -1){
				this.setSelectedSong(songIdIndex, false)
			}else if(assets.customSongs){
				this.setSelectedSong(Math.min(Math.max(0, assets.customSelected), this.songs.length - 1), false)
			}else if((!p2.session || fadeIn) && "selectedSong" in localStorage){
				this.setSelectedSong(Math.min(Math.max(0, localStorage["selectedSong"] |0), this.songs.length - 1), false)
			}
			if(!this.showWarning){
				this.playSound(songIdIndex !== -1 ? "v_diffsel" : "v_songsel")
			}
			snd.musicGain.fadeOut()
			this.playBgm(false)
		}
		if("selectedDiff" in localStorage){
			this.selectedDiff = Math.min(Math.max(0, localStorage["selectedDiff"] |0), this.diffOptions.length + 3)
		}
		
		this.songSelect = document.getElementById("song-select")
		var cat = this.songs[this.selectedSong].originalCategory
		this.drawBackground(cat)
		
		this.previewId = 0
		this.previewList = Array(5)
		
		var skipStart = fromTutorial || p2.session
		this.state = {
			screen: songIdIndex !== -1 ? "difficulty" : (fadeIn ? "titleFadeIn" : (skipStart ? "song" : "title")),
			screenMS: this.getMS(),
			move: 0,
			moveMS: 0,
			mouseMoveMS: 0,
			ura: 0,
			moveHover: null,
			locked: true,
			hasPointer: false,
			options: 0,
			selLock: false,
			catJump: false,
			focused: true,
			waitPreview: 0
		}
		this.songSelecting = {
			speed: parseFloat(localStorage.getItem("sss") ?? "400", 10),
			resize: 0.3,
			scrollDelay: 0.1
		}
		this.wheelScrolls = 0
		this.wheelTimer = 0
		
		this.startPreview(true)
		
		this.pressedKeys = {}
		this.keyboard = new Keyboard({
			confirm: ["enter", "space", "don_l", "don_r"],
			back: ["escape"],
			left: ["left", "ka_l"],
			right: ["right", "ka_r"],
			up: ["up"],
			down: ["down"],
			session: ["backspace"],
			ctrl: ["ctrl"],
			shift: ["shift"],
			mute: ["q"],
			search: ["f"]
		}, this.keyPress.bind(this))
		this.gamepad = new Gamepad({
			confirm: ["b", "start", "ls", "rs"],
			back: ["a"],
			left: ["l", "lsl", "lt"],
			right: ["r", "lsr", "rt"],
			up: ["u", "lsu"],
			down: ["d", "lsd"],
			session: ["back"],
			ctrlGamepad: ["y"],
			shift: ["x"],
			jump_left: ["lb"],
			jump_right: ["rb"]
		}, this.keyPress.bind(this))
		
		if(!assets.customSongs){
			this.startP2()
		}
		
		pageEvents.add(loader.screen, "mousemove", this.mouseMove.bind(this))
		pageEvents.add(loader.screen, "mouseleave", () => {
			this.state.moveHover = null
		})
		pageEvents.add(loader.screen, ["mousedown", "touchstart"], this.mouseDown.bind(this))
		pageEvents.add(this.canvas, "touchend", this.touchEnd.bind(this))
		if(touchEnabled && fullScreenSupported){
			this.touchFullBtn = document.getElementById("touch-full-btn")
			this.touchFullBtn.style.display = "block"
			pageEvents.add(this.touchFullBtn, "touchend", toggleFullscreen)
		}

		pageEvents.add(this.canvas, "wheel", this.mouseWheel.bind(this))

		this.selectable = document.getElementById("song-sel-selectable")
		this.selectableText = ""
		
		this.redrawRunning = true
		this.redrawBind = this.redraw.bind(this)
		this.redraw()
		pageEvents.send("song-select")
		pageEvents.send("song-select-move", this.songs[this.selectedSong])
		if(songIdIndex !== -1){
			pageEvents.send("song-select-difficulty", this.songs[this.selectedSong])
		}
	}

	setAltText(element, text){
		element.innerText = text
		element.setAttribute("alt", text)
	}

	setSelectedSong(songIdx, drawBg=true){
		if (songIdx < 0) {
			return;
		}

		if(drawBg){
			var cat = this.songs[songIdx].originalCategory
			if(cat){
				this.drawBackground(cat)
			}else{
				this.drawBackground(false)
			}
		}

		this.selectedSong = songIdx
	}

	keyPress(pressed, name, event, repeat){
		if(pressed){
			if(!this.pressedKeys[name]){
				this.pressedKeys[name] = this.getMS() + (name === "left" || name === "right" ? 150 : 300)
			}
		}else{
			this.pressedKeys[name] = 0
			return
		}
		if(name === "ctrl" || name === "shift" || !this.redrawRunning){
			return
		}
		var ctrl = event ? event.ctrlKey : (this.pressedKeys["ctrl"] || this.pressedKeys["ctrlGamepad"])
		var shift = event ? event.shiftKey : this.pressedKeys["shift"]
		if(this.state.showWarning){
			if(name === "confirm"){
				this.playSound("se_don")
				this.state.showWarning = false
				this.showWarning = false
			}
		}else if(this.search.opened){
			this.search.keyPress(pressed, name, event, repeat, ctrl)
		}else if(this.state.screen === "song"){
			if(event && event.keyCode && event.keyCode === 70 && ctrl){
				this.search.display()
				if(event){
					event.preventDefault()
				}
			}else if(name === "confirm"){
				this.toSelectDifficulty()
			}else if(name === "back"){
				this.toTitleScreen()
			}else if(name === "session"){
				this.toSession()
			}else if(name === "left"){
				if(shift){
					if(!repeat){
						this.categoryJump(-1)
					}
				}else{
					this.moveToSong(-1)
				}
			}else if(name === "right"){
				if(shift){
					if(!repeat){
						this.categoryJump(1)
					}
				}else{
					this.moveToSong(1)
				}
			}else if(name === "jump_left" && !repeat){
				this.categoryJump(-1)
			}else if(name === "jump_right" && !repeat){
				this.categoryJump(1)
			}else if(name === "mute" || name === "ctrlGamepad"){
				this.endPreview(true)
				this.playBgm(false)
			}
		}else if(this.state.screen === "difficulty"){
			if(event && event.keyCode && event.keyCode === 70 && ctrl){
				this.search.display()
				if(event){
					event.preventDefault()
				}
			}else if(name === "confirm"){
				if(this.selectedDiff === 0){
					this.toSongSelect()
				}else if(this.selectedDiff === 2){
					this.toDownload()
				}else if(this.selectedDiff === 3){
					this.toDelete()
				}else if(this.selectedDiff === 1){
					this.toOptions(1)
				}else{
					this.toLoadSong(this.selectedDiff - this.diffOptions.length, shift, ctrl)
				}
			}else if(name === "back" || name === "session"){
				this.toSongSelect()
			}else if(name === "left"){
				this.moveToDiff(-1)
			}else if(name === "right"){
				this.moveToDiff(1)
			}else if(this.selectedDiff === 1 && (name === "up" || name === "down")){
				this.toOptions(name === "up" ? -1 : 1)
			}else if(name === "mute" || name === "ctrlGamepad"){
				this.endPreview(true)
				this.playBgm(false)
			}
		}else if(this.state.screen === "title" || this.state.screen === "titleFadeIn"){
			if(event && event.keyCode && event.keyCode === 70 && ctrl){
				this.search.display()
				if(event){
					event.preventDefault()
				}
			}
		}
	}
	
	mouseDown(event){
		if(event.target === this.selectable || event.target.parentNode === this.selectable){
			this.selectable.focus()
		}else if(event.target.tagName !== "INPUT"){
			getSelection().removeAllRanges()
			this.selectable.blur()
		}
		if(event.target !== this.canvas || !this.redrawRunning){
			return
		}
		if(event.type === "mousedown"){
			if(event.which !== 1){
				return
			}
			var mouse = this.mouseOffset(event.offsetX, event.offsetY)
			var shift = event.shiftKey
			var ctrl = event.ctrlKey
			var touch = false
		}else{
			event.preventDefault()
			var x = event.touches[0].pageX - this.canvas.offsetLeft
			var y = event.touches[0].pageY - this.canvas.offsetTop
			var mouse = this.mouseOffset(x, y)
			var shift = false
			var ctrl = false
			var touch = true
		}
		if(this.state.showWarning){
			if(408 < mouse.x && mouse.x < 872 && 470 < mouse.y && mouse.y < 550){
				this.playSound("se_don")
				this.state.showWarning = false
				this.showWarning = false
			}
		}else if(this.state.screen === "song"){
			if(20 < mouse.y && mouse.y < 90 && 410 < mouse.x && mouse.x < 880 && (mouse.x < 540 || mouse.x > 750)){
				this.categoryJump(mouse.x < 640 ? -1 : 1)
			}else if(!p2.session && 60 < mouse.x && mouse.x < 332 && 640 < mouse.y && mouse.y < 706 && gameConfig.accounts){
				this.toAccount()
			}else if(p2.session && 438 < mouse.x && mouse.x < 834 && mouse.y > 603){
				this.toSession()
			}else if(!p2.session && mouse.x > 641 && mouse.y > 603 && p2.socket && p2.socket.readyState === 1 && !assets.customSongs){
				this.toSession()
			}else{
				var moveBy = this.songSelMouse(mouse.x, mouse.y)
				if(moveBy === 0){
					this.toSelectDifficulty()
				}else if(moveBy !== null){
					this.moveToSong(moveBy)
				}
			}
		}else if(this.state.screen === "difficulty"){
			var moveBy = this.diffSelMouse(mouse.x, mouse.y)
			if(mouse.x < 183 || mouse.x > 1095 || mouse.y < 54 || mouse.y > 554){
				this.toSongSelect()
			}else if(moveBy === 0){
				this.selectedDiff = 0
				this.toSongSelect()
			}else if(moveBy === 2){
				this.toDownload()
			}else if(moveBy === 3){
				this.toDelete()
			}else if(moveBy === 1){
				this.toOptions(1)
			}else if(moveBy === "maker"){
				window.open(this.songs[this.selectedSong].maker.url)
			}else if(moveBy === this.diffOptions.length + 4){
				this.state.ura = !this.state.ura
				this.playSound("se_ka", 0, p2.session ? p2.player : false)
				if(this.selectedDiff === this.diffOptions.length + 4 && !this.state.ura){
					this.state.move = -1
				}
			}else if(moveBy !== null){
				this.toLoadSong(moveBy - this.diffOptions.length, shift, ctrl, touch)
			}
		}
	}
	touchEnd(event){
		event.preventDefault()
	}
	mouseWheel(event){
		if(this.state.screen === "song" && this.state.focused){
			this.wheelTimer = this.getMS()

			if(event.deltaY < 0) {
				this.wheelScrolls--
			}else if(event.deltaY > 0){
				this.wheelScrolls++
			}
		}
	}
	mouseMove(event){
		var mouse = this.mouseOffset(event.offsetX, event.offsetY)
		var moveTo = null
		if(this.state.showWarning){
			if(408 < mouse.x && mouse.x < 872 && 470 < mouse.y && mouse.y < 550){
				moveTo = "showWarning"
			}
		}else if(this.state.screen === "song" && !this.search.opened){
			if(20 < mouse.y && mouse.y < 90 && 410 < mouse.x && mouse.x < 880 && (mouse.x < 540 || mouse.x > 750)){
				moveTo = mouse.x < 640 ? "categoryPrev" : "categoryNext"
			}else if(!p2.session && 60 < mouse.x && mouse.x < 332 && 640 < mouse.y && mouse.y < 706 && gameConfig.accounts){
				moveTo = "account"
			}else if(p2.session && 438 < mouse.x && mouse.x < 834 && mouse.y > 603){
				moveTo = "session"
			}else if(!p2.session && mouse.x > 641 && mouse.y > 603 && p2.socket && p2.socket.readyState === 1 && !assets.customSongs){
				moveTo = "session"
			}else{
				var moveTo = this.songSelMouse(mouse.x, mouse.y)
				if(moveTo === null && this.state.moveHover === 0 && !this.songs[this.selectedSong].courses){
					this.state.mouseMoveMS = this.getMS() - this.songSelecting.speed
				}
			}
			this.state.moveHover = moveTo
		}else if(this.state.screen === "difficulty"){
			var moveTo = this.diffSelMouse(mouse.x, mouse.y)
			if(moveTo === null && this.state.moveHover === this.selectedDiff){
				this.state.mouseMoveMS = this.getMS() - 1000
			}
			this.state.moveHover = moveTo
		}
		this.pointer(moveTo !== null)
	}
	mouseOffset(offsetX, offsetY){
		return {
			x: (offsetX * this.pixelRatio - this.winW / 2) / this.ratio + 1280 / 2,
			y: (offsetY * this.pixelRatio - this.winH / 2) / this.ratio + 720 / 2
		}
	}
	pointer(enabled){
		if(!this.canvas){
			return
		}
		if(enabled && this.state.hasPointer === false){
			this.canvas.style.cursor = "pointer"
			this.state.hasPointer = true
		}else if(!enabled && this.state.hasPointer === true){
			this.canvas.style.cursor = ""
			this.state.hasPointer = false
		}
	}
	
	songSelMouse(x, y){
		if(this.state.locked === 0 && this.songAsset.marginTop <= y && y <= this.songAsset.marginTop + this.songAsset.height){
			x -= 1280 / 2
			var dir = x > 0 ? 1 : -1
			x = Math.abs(x)
			var selectedWidth = this.songAsset.selectedWidth
			if(!this.songs[this.selectedSong].courses){
				selectedWidth = this.songAsset.width
			}
			var moveBy = Math.ceil((x - selectedWidth / 2 - this.songAsset.marginLeft / 2) / (this.songAsset.width + this.songAsset.marginLeft)) * dir
			if(moveBy / dir > 0){
				return moveBy
			}else{
				return 0
			}
		}
		return null
	}
	diffSelMouse(x, y){
		if(this.state.locked === 0){
			if(223 < x && x < 223 + 72 * this.diffOptions.length && 132 < y && y < 436){
				return Math.floor((x - 223) / 72)
			}else if(this.songs[this.selectedSong].maker && this.songs[this.selectedSong].maker.id > 0 && this.songs[this.selectedSong].maker.url && x > 230 && x < 485 && y > 446 && y < 533) {
				return "maker"
			}else if(550 < x && x < 1050 && 109 < y && y < 538){
				var moveBy = Math.floor((x - 550) / ((1050 - 550) / 5)) + this.diffOptions.length
				var currentSong = this.songs[this.selectedSong]
				if(
					this.state.ura
					&& moveBy === this.diffOptions.length + 3
					|| currentSong.courses[
						this.difficultyId[moveBy - this.diffOptions.length]
					]
				){
					return moveBy
				}
			}
		}
		return null
	}
	
	moveToSong(moveBy, fromP2){
		var ms = this.getMS()
		if(p2.session && !fromP2){
			if(!this.state.selLock && ms > this.state.moveMS + 800){
				this.state.selLock = true
				p2.send("songsel", {
					song: this.mod(this.songs.length, this.selectedSong + moveBy)
				})
			}
		}else if(this.state.locked !== 1 || fromP2){
			if(this.songs[this.selectedSong].courses && !this.songs[this.selectedSong].unloaded && (this.state.locked === 0 || fromP2)){
				this.state.moveMS = ms
			}else{
				this.state.moveMS = ms - this.songSelecting.speed * this.songSelecting.resize
			}
			this.state.move = moveBy
			this.state.lastMove = moveBy
			this.state.locked = 1
			this.state.moveHover = null
			
			var lastMoveMul = Math.pow(Math.abs(moveBy), 1 / 4)
			var changeSpeed = this.songSelecting.speed * lastMoveMul
			var resize = changeSpeed * this.songSelecting.resize / lastMoveMul
			var scrollDelay = changeSpeed * this.songSelecting.scrollDelay
			var resize2 = changeSpeed - resize
			var scroll = resize2 - resize - scrollDelay * 2
			
			var soundsDelay = Math.abs((scroll + resize) / moveBy)
			this.lastMoveBy = fromP2 ? fromP2.player : false
			
			for(var i = 0; i < Math.abs(moveBy) - 1; i++){
				this.playSound("se_ka", (resize + i * soundsDelay) / 1000, fromP2 ? fromP2.player : false)
			}
			this.pointer(false)
		}
	}
	
	categoryJump(moveBy, fromP2){
		if(p2.session && !fromP2){
			var ms = this.getMS()
			if(!this.state.selLock && ms > this.state.moveMS + 800){
				this.state.selLock = true
				p2.send("catjump", {
					song: this.selectedSong,
					move: moveBy
				})
			}
		}else if(this.state.locked !== 1 || fromP2){
			this.state.catJump = true
			this.state.move = moveBy;
			this.state.locked = 1
			
			this.endPreview()
			this.playSound("se_jump", 0, fromP2 ? fromP2.player : false)
		}
	}

	moveToDiff(moveBy){
		if(this.state.locked !== 1){
			this.state.move = moveBy
			this.state.moveMS = this.getMS() - 500
			this.state.locked = 1
			this.playSound("se_ka", 0, p2.session ? p2.player : false)
		}
	}
	
	toSelectDifficulty(fromP2, playVoice=true){
		var currentSong = this.songs[this.selectedSong]
		if(p2.session && !fromP2 && (!currentSong.action || !currentSong.p2Enabled)){
			if(this.songs[this.selectedSong].courses){
				if(!this.state.selLock){
					this.state.selLock = true
					p2.send("songsel", {
						song: this.selectedSong,
						selected: true,
						fromRandom: this.lastRandom
					})
				}
			}
		}else if(this.state.locked === 0 || fromP2){
			this.search.remove()
			if(currentSong.courses){
				if(currentSong.unloaded){
					return
				}

				var prevScreen = this.state.screen
				this.state.screen = "difficulty"
				this.state.screenMS = this.getMS()
				this.state.locked = true
				this.state.moveHover = null
				this.state.ura = 0
				if(this.selectedDiff === this.diffOptions.length + 4){
					this.selectedDiff = this.diffOptions.length + 3
				}
				
				this.playSound("se_don", 0, fromP2 ? fromP2.player : false)
				assets.sounds["v_songsel"].stop()
				if(!this.showWarning && prevScreen !== "difficulty" && playVoice){
					this.playSound("v_diffsel", 0.3)
				}
				pageEvents.send("song-select-difficulty", currentSong)
			}else if(currentSong.action === "back"){
				this.toTitleScreen()
			}else if(currentSong.action === "random"){
				do{
					var i = Math.floor(Math.random() * this.songs.length)
				}while(!this.songs[i].courses)
				this.setSelectedSong(i)
				this.lastRandom = true
				this.playBgm(false)
				this.toSelectDifficulty(false, playVoice=false)
				pageEvents.send("song-select-random")
			}else if(currentSong.action === "search"){
				this.search.display(true)
			}else if(currentSong.action === "tutorial"){
				this.toTutorial()
			}else if(currentSong.action === "about"){
				this.toAbout()
			}else if(currentSong.action === "settings"){
				this.toSettings()
			}else if(currentSong.action === "customSongs"){
				this.toCustomSongs()
			}else if(currentSong.action === "plugins"){
				this.toPlugins()
			}
                        // カスタムメニューの実行処理
                        else if (currentSong.action === "sourceCode") {
                            this.playSound("se_don");
                            setTimeout(() => {
                                open("https://github.com/yuukialpha/taiko-web","_blank");
                            }, 500);
                        } else if (currentSong.action === "upload") {
                            this.playSound("se_don");
                            setTimeout(() => {
                                window.location.href = "/upload/";
                            }, 100);
                        } else if (currentSong.action === "keijiban") {
							this.playSound("se_don");
                            setTimeout(() => {
                                window.location.href = "https://litey.trade/";
                            }, 100);
						} else if (currentSong.action === "songSelectingSpeed") {
							this.playSound("se_don");
							setTimeout(() => {
								let songSelectingSpeed = localStorage.getItem("sss") ?? "400";
								const pro = prompt("曲選択速度を入力してね！", songSelectingSpeed);
								if (pro === null) {
									// キャンセル
								} else if (pro === "") {
									songSelectingSpeed = "400";
								} else {
									songSelectingSpeed = pro;
								}
								localStorage.setItem("sss", songSelectingSpeed.toString());
							}, 100);
						} else if (currentSong.action === "baisoku") {
							this.playSound("se_don");
							setTimeout(() => {
								let baisoku = localStorage.getItem("baisoku") ?? "1";
								const input = prompt("ばいそくの倍率を入力してね！", baisoku);
								if (input === null) {
									// キャンセル
								} else if (input === "") {
									baisoku = "1";
								} else {
									baisoku = input;
								}
								localStorage.setItem("baisoku", baisoku.toString());
							}, 100);
						} else if (currentSong.action === "doron") {
							this.playSound("se_don");
							setTimeout(() => {
								let doron = localStorage.getItem("doron") ?? "false";
								const input = prompt("ドロンを有効にするには\"true\"を入力してね！", doron);
								if (input === null) {
									// キャンセル
								} else if (input === "") {
									doron = "false";
								} else {
									doron = input;
								}
								localStorage.setItem("doron", doron);
							}, 100);
						} else if (currentSong.action === "abekobe") {
							this.playSound("se_don");
							setTimeout(() => {
								let abekobe = localStorage.getItem("abekobe") ?? "false";
								const input = prompt("あべこべを有効にするには\"true\"を入力してね！", abekobe);
								if (input === null) {
									// キャンセル
								} else if (input === "") {
									abekobe = "false";
								} else {
									abekobe = input;
								}
								localStorage.setItem("abekobe", abekobe);
							}, 100);
						} else if (currentSong.action === "detarame") {
							this.playSound("se_don");
							setTimeout(() => {
								let detarame = localStorage.getItem("detarame") ?? "0";
								const input = prompt("でたらめになる確率をパーセントで入力してね！", detarame);
								if (input === null) {
									// キャンセル
								} else if (input === "") {
									detarame = "0";
								} else {
									detarame = input;
								}
								localStorage.setItem("detarame", detarame);
							}, 100);
						}
		}
		this.pointer(false)
	}
	toSongSelect(fromP2){
		if(p2.session && !fromP2){
			if(!this.state.selLock){
				this.state.selLock = true
				p2.send("songsel", {
					song: this.lastRandom ? this.songs.findIndex(song => song.action === "random") : this.selectedSong
				})
			}
			
		}else if(fromP2 || this.state.locked !== 1){
			this.state.screen = "song"
			this.state.screenMS = this.getMS()
			this.state.locked = true
			this.state.moveHover = null

			if(this.lastRandom){
				this.endPreview(false)
				this.setSelectedSong(this.songs.findIndex(song => song.action === "random"))
				this.lastRandom = false
			}

			assets.sounds["v_diffsel"].stop()
			this.playSound("se_cancel", 0, fromP2 ? fromP2.player : false)
		}
		this.clearHash()
		pageEvents.send("song-select-back")
	}
	toLoadSong(difficulty, shift, ctrl, touch){
		this.clean()
		var selectedSong = this.songs[this.selectedSong]
		assets.sounds["v_diffsel"].stop()
		this.playSound("se_don", 0, p2.session ? p2.player : false)
		
		try{
			if(assets.customSongs){
				assets.customSelected = this.selectedSong
				localStorage["customSelected"] = this.selectedSong
			}else{
				localStorage["selectedSong"] = this.selectedSong
			}
			localStorage["selectedDiff"] = difficulty + this.diffOptions.length
		}catch(e){}
		
		if(difficulty === 3 && this.state.ura){
			difficulty = 4
		}
		var autoplay = false
		var multiplayer = false
		if(p2.session || this.state.options === 2){
			multiplayer = true
		}else if(this.state.options === 1){
			autoplay = true
		}else if(shift){
			autoplay = shift
		}else if(p2.socket && p2.socket.readyState === 1 && !assets.customSongs){
			multiplayer = ctrl
		}
		var diff = this.difficultyId[difficulty]
		
		new LoadSong({
			"title": selectedSong.title,
			"originalTitle": selectedSong.originalTitle,
			"folder": selectedSong.id,
			"difficulty": diff,
			"category": selectedSong.category,
			"category_id":selectedSong.category_id,
			"type": selectedSong.type,
			"offset": selectedSong.offset,
			"songSkin": selectedSong.songSkin,
			"stars": selectedSong.courses[diff].stars,
			"hash": selectedSong.hash,
			"lyrics": selectedSong.lyrics,
			"video": selectedSong.video,
		}, autoplay, multiplayer, touch)
	}
	toOptions(moveBy){
		if(!p2.session){
			this.playSound("se_ka", 0, p2.session ? p2.player : false)
			this.selectedDiff = 1
			do{
				this.state.options = this.mod(this.optionsList.length, this.state.options + moveBy)
			}while((!p2.socket || p2.socket.readyState !== 1 || assets.customSongs) && this.state.options === 2)
		}
	}
	toTitleScreen(){
		if(!p2.session){
			this.playSound("se_cancel")
			this.clean()
			setTimeout(() => {
				new Titlescreen()
			}, 500)
		}
	}
	toTutorial(){
		this.playSound("se_don")
		this.clean()
		setTimeout(() => {
			new Tutorial(true)
		}, 500)
	}
	toAbout(){
		this.playSound("se_don")
		this.clean()
		setTimeout(() => {
			new About(this.touchEnabled)
		}, 500)
	}
	toSettings(){
		this.playSound("se_don")
		this.clean()
		setTimeout(() => {
			new SettingsView(this.touchEnabled)
		}, 500)
	}
	toAccount(){
		this.playSound("se_don")
		this.clean()
		setTimeout(() => {
			new Account(this.touchEnabled)
		}, 500)
	}
	toSession(){
		if(p2.socket.readyState !== 1 || assets.customSongs){
			return
		}
		if(p2.session){
			this.playSound("se_don")
			p2.send("gameend")
			this.state.moveHover = null
		}else{
			localStorage["selectedSong"] = this.selectedSong
			
			this.playSound("se_don")
			this.clean()
			setTimeout(() => {
				new Session(this.touchEnabled)
			}, 500)
		}
	}
	toCustomSongs(){
		if(assets.customSongs){
			assets.customSongs = false
			assets.songs = assets.songsDefault
			delete assets.otherFiles
			this.playSound("se_don")
			this.clean()
			setTimeout(() => {
				new SongSelect("customSongs", false, this.touchEnabled)
			}, 500)
			localStorage.removeItem("customSelected")
			db.removeItem("customFolder")
			pageEvents.send("import-songs-default")
		}else{
			localStorage["selectedSong"] = this.selectedSong
			
			this.playSound("se_don")
			this.clean()
			setTimeout(() => {
				new CustomSongs(this.touchEnabled)
			}, 500)
		}
	}
	toPlugins(){
		this.playSound("se_don")
		this.clean()
		setTimeout(() => {
			new SettingsView(this.touchEnabled, false, undefined, undefined, plugins.getSettings())
		}, 500)
	}
	
	redraw(){
		if(!this.redrawRunning){
			return
		}
		requestAnimationFrame(this.redrawBind)
		var ms = this.getMS()
		
		for(var key in this.pressedKeys){
			if(this.pressedKeys[key]){
				if(ms >= this.pressedKeys[key] + (this.state.screen === "song" && (key === "right" || key === "left") ? 20 : 50)){
					this.keyPress(true, key, null, true)
					this.pressedKeys[key] = ms
				}
			}
		}
		
		if(!this.redrawRunning){
			return
		}
		
		var ctx = this.ctx
		var winW = innerWidth
		var winH = lastHeight
		if(winW / 32 > winH / 9){
			winW = winH / 9 * 32
		}
		this.pixelRatio = window.devicePixelRatio || 1
		var resolution = settings.getItem("resolution")
		if(resolution === "medium"){
			this.pixelRatio *= 0.75
		}else if(resolution === "low"){
			this.pixelRatio *= 0.5
		}else if(resolution === "lowest"){
			this.pixelRatio *= 0.25
		}
		winW *= this.pixelRatio
		winH *= this.pixelRatio
		var ratioX = winW / 1280
		var ratioY = winH / 720
		var ratio = (ratioX < ratioY ? ratioX : ratioY)
		if(this.winW !== winW || this.winH !== winH){
			this.canvas.width = Math.max(1, winW)
			this.canvas.height = Math.max(1, winH)
			ctx.scale(ratio, ratio)
			this.canvas.style.width = (winW / this.pixelRatio) + "px"
			this.canvas.style.height = (winH / this.pixelRatio) + "px"
			
			var borders = (this.songAsset.border + this.songAsset.innerBorder) * 2
			var songsLength = Math.ceil(winW / ratio / (this.songAsset.width + this.songAsset.marginLeft)) + 1
			
			this.songTitleCache.resize(
				(this.songAsset.width - borders + 1) * songsLength,
				this.songAsset.height - borders + 1,
				ratio + 0.2
			)
			
			this.currentSongCache.resize(
				(this.songAsset.width - borders + 1) * 2,
				this.songAsset.height - borders + 1,
				ratio + 0.2
			)
			
			var textW = strings.id === "en" ? 350 : 280
			this.selectTextCache.resize((textW + 53 + 60 + 1) * 2, this.songAsset.marginTop + 15, ratio + 0.5)
			
			this.nameplateCache.resize(274, 134, ratio + 0.2)
			
			var lastCategory
			this.songs.forEach(song => {
				var cat = (song.category || "") + song.skin.outline
				if(lastCategory !== cat){
					lastCategory = cat
				}
			})
			this.categoryCache.resize(280, this.songAsset.marginTop + 1 , ratio + 0.5)
			
			this.difficultyCache.resize((44 + 56 + 2) * 5, 135 + 10, ratio + 0.5)
			
			var w = winW / ratio / 2
			this.sessionCache.resize(w, 39 * 2, ratio + 0.5)
			for(var id in this.sessionText){
				this.sessionCache.set({
					w: w,
					h: 38,
					id: id
				}, ctx => {
					this.draw.layeredText({
						ctx: ctx,
						text: this.sessionText[id],
						fontSize: 28,
						fontFamily: this.font,
						x: w / 2,
						y: 38 / 2,
						width: id === "sessionend" ? 385 : w - 30,
						align: "center",
						baseline: "middle"
					}, [
						{outline: "#000", letterBorder: 8},
						{fill: "#fff"}
					])
				})
			}
			
			this.selectableText = ""
			
			if(this.search.opened && this.search.container){
				this.search.onInput(true)
			}
		}else if(!document.hasFocus() && !p2.session){
			if(this.state.focused){
				this.state.focused = false
				this.songSelect.classList.add("unfocused")
				this.pressedKeys = {}
			}
			return
		}else{
			ctx.clearRect(0, 0, winW / ratio, winH / ratio)
		}
		if(!this.state.focused){
			this.state.focused = true
			this.songSelect.classList.remove("unfocused")
		}
		this.winW = winW
		this.winH = winH
		this.ratio = ratio
		winW /= ratio
		winH /= ratio
		
		var frameTop = winH / 2 - 720 / 2
		var frameLeft = winW / 2 - 1280 / 2
		var songTop = frameTop + this.songAsset.marginTop
		var xOffset = 0
		var songSelMoving = false
		var screen = this.state.screen
		var selectedWidth = this.songAsset.width
		
		this.search.redraw()
		
		if(this.wheelScrolls !== 0 && !this.state.locked && ms >= this.wheelTimer + 20) {
			if(p2.session){
				this.moveToSong(this.wheelScrolls)
			}else{
				this.state.move = this.wheelScrolls
				this.state.waitPreview = ms + 400
				this.endPreview()
			}
			this.wheelScrolls = 0
		}
		
		if(screen === "title" || screen === "titleFadeIn"){
			if(ms > this.state.screenMS + 1000){
				this.state.screen = "song"
				this.state.screenMS = ms + (ms - this.state.screenMS - 1000)
				this.state.moveMS = ms - this.songSelecting.speed * this.songSelecting.resize + (ms - this.state.screenMS)
				this.state.locked = 3
				this.state.lastMove = 1
			}else{
				this.state.moveMS = ms - this.songSelecting.speed * this.songSelecting.resize + (ms - this.state.screenMS - 1000)
			}
			if(screen === "titleFadeIn" && ms > this.state.screenMS + 500){
				this.state.screen = "title"
				screen = "title"
			}
		}
		
		if((screen === "song" || screen === "difficulty") && (this.showWarning && !this.showWarning.shown || scoreStorage.scoreSaveFailed)){
			if(!this.showWarning){
				this.showWarning = {name: "scoreSaveFailed"}
			}
			if(this.bgmEnabled){
				this.playBgm(false)
			}
			if(this.showWarning.name === "scoreSaveFailed"){
				scoreStorage.scoreSaveFailed = false
			}
			this.showWarning.shown = true
			this.state.showWarning = true
			this.state.locked = true
			this.playSound("se_pause")
		}
		
		if(screen === "title" || screen === "titleFadeIn" || screen === "song"){
			var textW = strings.id === "en" ? 350 : 280
			this.selectTextCache.get({
				ctx: ctx,
				x: frameLeft,
				y: frameTop,
				w: textW + 53 + 60,
				h: this.songAsset.marginTop + 15,
				id: "song"
			}, ctx => {
				this.draw.layeredText({
					ctx: ctx,
					text: strings.selectSong,
					fontSize: 48,
					fontFamily: this.font,
					x: 53,
					y: 30,
					width: textW,
					letterSpacing: strings.id === "en" ? 0 : 2,
					forceShadow: true
				}, [
					{x: -2, y: -2, outline: "#000", letterBorder: 22},
					{},
					{x: 2, y: 2, shadow: [3, 3, 3]},
					{x: 2, y: 2, outline: "#ad1516", letterBorder: 10},
					{x: -2, y: -2, outline: "#ff797b"},
					{outline: "#f70808"},
					{fill: "#fff", shadow: [-1, 1, 3, 1.5]}
				])
			})
			
			var selectedSong = this.songs[this.selectedSong]
			var category = selectedSong.category
			this.draw.category({
				ctx: ctx,
				x: winW / 2 - 280 / 2 - 30,
				y: frameTop + 60,
				fill: selectedSong.skin.background,
				highlight: this.state.moveHover === "categoryPrev"
			})
			this.draw.category({
				ctx: ctx,
				x: winW / 2 + 280 / 2 + 30,
				y: frameTop + 60,
				right: true,
				fill: selectedSong.skin.background,
				highlight: this.state.moveHover === "categoryNext"
			})
			this.categoryCache.get({
				ctx: ctx,
				x: winW / 2 - 280 / 2,
				y: frameTop,
				w: 280,
				h: this.songAsset.marginTop,
				id: category + selectedSong.skin.outline
			}, ctx => {
				if(category){
					let cat = assets.categories.find(cat=>cat.title === category)
					if(cat){
						var categoryName = this.getLocalTitle(cat.title, cat.title_lang)
					}else{
						var categoryName = category
					}
					this.draw.layeredText({
						ctx: ctx,
						text: categoryName,
						fontSize: 40,
						fontFamily: this.font,
						x: 280 / 2,
						y: 38,
						width: 255,
						align: "center",
						forceShadow: true
					}, [
						{outline: selectedSong.skin.outline, letterBorder: 12, shadow: [3, 3, 3]},
						{fill: "#fff"}
					])
				}
			})
		}
		
		if(screen === "song"){
			if(this.songs[this.selectedSong].courses && !this.songs[this.selectedSong].unloaded){
				selectedWidth = this.songAsset.selectedWidth
			}
			
			var lastMoveMul = Math.pow(Math.abs(this.state.lastMove || 0), 1 / 4)
			var changeSpeed = this.songSelecting.speed * lastMoveMul
			var resize = changeSpeed * (lastMoveMul === 0 ? 0 : this.songSelecting.resize / lastMoveMul)
			var scrollDelay = changeSpeed * this.songSelecting.scrollDelay
			var resize2 = changeSpeed - resize
			var scroll = resize2 - resize - scrollDelay * 2
			var elapsed = ms - this.state.moveMS
			
			if(this.state.catJump || (this.state.move && ms > this.state.moveMS + resize2 - scrollDelay)){
				var isJump = this.state.catJump
				var previousSelectedSong = this.selectedSong
				
				if(!isJump){
					this.playSound("se_ka", 0, this.lastMoveBy)
					this.setSelectedSong(this.mod(this.songs.length, this.selectedSong + this.state.move))
				}else{
					var currentCat = this.songs[this.selectedSong].category
					var currentIdx = this.mod(this.songs.length, this.selectedSong)

					if(this.state.move > 0){
						var nextSong = this.songs.find(song => this.mod(this.songs.length, this.songs.indexOf(song)) > currentIdx && song.category !== currentCat && song.canJump)
						if(!nextSong){
							nextSong = this.songs[0]
						}
					}else{
						var isFirstInCat = this.songs.findIndex(song => song.category === currentCat) == this.selectedSong
						if(!isFirstInCat){
							var nextSong = this.songs.find(song => this.mod(this.songs.length, this.songs.indexOf(song)) < currentIdx && song.category === currentCat && song.canJump)
						}else{
							var idx = this.songs.length - 1
							var nextSong
							var lastCat
							for(;idx>=0;idx--){
								if(this.songs[idx].category !== lastCat && this.songs[idx].action !== "back"){
									lastCat = this.songs[idx].category
									if(nextSong){
										break
									}
								}
								if(lastCat !== currentCat && idx < currentIdx){
									nextSong = idx
								}
							}
							nextSong = this.songs[nextSong]
						}

						if(!nextSong){
							var rev = [...this.songs].reverse()
							nextSong = rev.find(song => song.canJump)
						}
					}

					this.setSelectedSong(this.songs.indexOf(nextSong))
					this.state.catJump = false
				}

				if(previousSelectedSong !== this.selectedSong){
					pageEvents.send("song-select-move", this.songs[this.selectedSong])
				}
				this.state.move = 0
				this.state.locked = 2
				if(assets.customSongs){
					assets.customSelected = this.selectedSong
					localStorage["customSelected"] = this.selectedSong
				}else if(!p2.session){
					try{
						localStorage["selectedSong"] = this.selectedSong
					}catch(e){}
				}
			}
			if(this.state.moveMS && ms < this.state.moveMS + changeSpeed){
				xOffset = Math.min(scroll, Math.max(0, elapsed - resize - scrollDelay)) / scroll * (this.songAsset.width + this.songAsset.marginLeft)
				xOffset *= -this.state.move
				if(elapsed < resize){
					selectedWidth = this.songAsset.width + (((resize - elapsed) / resize) * (selectedWidth - this.songAsset.width))
				}else if(elapsed > resize2){
					this.playBgm(!this.songs[this.selectedSong].courses)
					this.state.locked = 1
					selectedWidth = this.songAsset.width + ((elapsed - resize2) / resize * (selectedWidth - this.songAsset.width))
				}else{
					songSelMoving = true
					selectedWidth = this.songAsset.width
				}
			}else{
				if(this.previewing !== "muted"){
					this.playBgm(!this.songs[this.selectedSong].courses)
				}
				this.state.locked = 0
			}
		}else if(screen === "difficulty"){
			var currentSong = this.songs[this.selectedSong]
			if(this.state.locked){
				this.state.locked = 0
			}
			if(this.state.move){
				var hasUra = currentSong.courses.ura
				var previousSelection = this.selectedDiff
				do{
					if(hasUra && this.state.move > 0){
						this.selectedDiff += this.state.move
						if(this.selectedDiff > this.diffOptions.length + 4){
							this.state.ura = !this.state.ura
							if(this.state.ura){
								this.selectedDiff = previousSelection === this.diffOptions.length + 3 ? this.diffOptions.length + 4 : previousSelection
								break
							}else{
								this.state.move = -1
							}
						}
					}else{
						this.selectedDiff = this.mod(this.diffOptions.length + 5, this.selectedDiff + this.state.move)
					}
				}while(
					this.selectedDiff >= this.diffOptions.length && !currentSong.courses[this.difficultyId[this.selectedDiff - this.diffOptions.length]]
					|| this.selectedDiff === this.diffOptions.length + 3 && this.state.ura
					|| this.selectedDiff === this.diffOptions.length + 4 && !this.state.ura
				)
				this.state.move = 0
			}else if(this.selectedDiff < 0 || this.selectedDiff >= this.diffOptions.length && !currentSong.courses[this.difficultyId[this.selectedDiff - this.diffOptions.length]]){
				this.selectedDiff = 0
			}
		}
		
		if(songSelMoving){
			if(this.previewing !== null){
				this.endPreview()
			}
		}else if(screen !== "title" && screen !== "titleFadeIn" && ms > this.state.moveMS + 100){
			if(this.previewing !== "muted" && this.previewing !== this.selectedSong && "id" in this.songs[this.selectedSong]){
				this.startPreview()
			}
		}
		
		this.songFrameCache = {
			w: this.songAsset.width + this.songAsset.selectedWidth + this.songAsset.fullWidth + (15 + 1) * 3,
			h: this.songAsset.fullHeight + 16,
			ratio: ratio
		}
		
		if(screen === "title" || screen === "titleFadeIn" || screen === "song"){
			for(var i = this.selectedSong - 1; ; i--){
				var highlight = 0
				if(i - this.selectedSong === this.state.moveHover){
					highlight = 1
				}
				var index = this.mod(this.songs.length, i)
				var _x = winW / 2 - (this.selectedSong - i) * (this.songAsset.width + this.songAsset.marginLeft) - selectedWidth / 2 + xOffset
				if(_x + this.songAsset.width + this.songAsset.marginLeft < 0){
					break
				}
				this.drawClosedSong({
					ctx: ctx,
					x: _x,
					y: songTop,
					song: this.songs[index],
					highlight: highlight,
					disabled: p2.session && this.songs[index].action && !this.songs[index].p2Enabled
				})
			}
			var startFrom
			for(var i = this.selectedSong + 1; ; i++){
				var _x = winW / 2 + (i - this.selectedSong - 1) * (this.songAsset.width + this.songAsset.marginLeft) + this.songAsset.marginLeft + selectedWidth / 2 + xOffset
				if(_x > winW){
					startFrom = i - 1
					break
				}
			}
			for(var i = startFrom; i > this.selectedSong ; i--){
				var highlight = 0
				if(i - this.selectedSong === this.state.moveHover){
					highlight = 1
				}
				var index = this.mod(this.songs.length, i)
				var currentSong = this.songs[index]
				var _x = winW / 2 + (i - this.selectedSong - 1) * (this.songAsset.width + this.songAsset.marginLeft) + this.songAsset.marginLeft + selectedWidth / 2 + xOffset
				this.drawClosedSong({
					ctx: ctx,
					x: _x,
					y: songTop,
					song: this.songs[index],
					highlight: highlight,
					disabled: p2.session && this.songs[index].action && !this.songs[index].p2Enabled
				})
			}
		}
		
		var currentSong = this.songs[this.selectedSong]
		var highlight = 0
		if(!currentSong.courses){
			highlight = 2
		}
		if(this.state.moveHover === 0){
			highlight = 1
		}
		var selectedSkin = this.songSkin.selected
		if(screen === "title" || screen === "titleFadeIn" || this.state.locked === 3 || currentSong.unloaded){
			selectedSkin = currentSong.skin
			highlight = 2
		}else if(songSelMoving){
			selectedSkin = currentSong.skin
			highlight = 0
		}
		var selectedHeight = this.songAsset.height
		if(screen === "difficulty"){
			selectedWidth = this.songAsset.fullWidth
			selectedHeight = this.songAsset.fullHeight
			highlight = 0
		}
		
		if(this.lastCurrentSong.title !== currentSong.title || this.lastCurrentSong.subtitle !== currentSong.subtitle){
			this.lastCurrentSong.title = currentSong.title
			this.lastCurrentSong.subtitle = currentSong.subtitle
			this.currentSongCache.clear()
		}
		
		if(selectedWidth === this.songAsset.width){
			this.drawSongCrown({
				ctx: ctx,
				song: currentSong,
				x: winW / 2 - selectedWidth / 2 + xOffset,
				y: songTop + this.songAsset.height - selectedHeight
			})
		}
		
		this.draw.songFrame({
			ctx: ctx,
			x: winW / 2 - selectedWidth / 2 + xOffset,
			y: songTop + this.songAsset.height - selectedHeight,
			width: selectedWidth,
			height: selectedHeight,
			border: this.songAsset.border,
			innerBorder: this.songAsset.innerBorder,
			background: selectedSkin.background,
			borderStyle: selectedSkin.border,
			highlight: highlight,
			noCrop: screen === "difficulty",
			animateMS: Math.max(this.state.moveMS, this.state.mouseMoveMS),
			cached: selectedWidth === this.songAsset.fullWidth ? 3 : (selectedWidth === this.songAsset.selectedWidth ? 2 : (selectedWidth === this.songAsset.width ? 1 : 0)),
			frameCache: this.songFrameCache,
			disabled: p2.session && currentSong.action && !currentSong.p2Enabled,
			innerContent: (x, y, w, h) => {
				ctx.strokeStyle = "#000"
				if(screen === "title" || screen === "titleFadeIn" || screen === "song"){
					var opened = ((selectedWidth - this.songAsset.width) / (this.songAsset.selectedWidth - this.songAsset.width))
					var songSel = true
				}else{
					var textW = strings.id === "en" ? 350 : 280
					this.selectTextCache.get({
						ctx: ctx,
						x: frameLeft,
						y: frameTop,
						w: textW + 53 + 60,
						h: this.songAsset.marginTop + 15,
						id: "difficulty"
					}, ctx => {
						this.draw.layeredText({
							ctx: ctx,
							text: strings.selectDifficulty,
							fontSize: 46,
							fontFamily: this.font,
							x: 53,
							y: 30,
							width: textW,
							forceShadow: true
						}, [
							{x: -2, y: -2, outline: "#000", letterBorder: 23},
							{},
							{x: 2, y: 2, shadow: [3, 3, 3]},
							{x: 2, y: 2, outline: "#ad1516", letterBorder: 10},
							{x: -2, y: -2, outline: "#ff797b"},
							{outline: "#f70808"},
							{fill: "#fff", shadow: [-1, 1, 3, 1.5]}
						])
					})
					var opened = 1
					var songSel = false
					
					for(var i = 0; i < this.diffOptions.length; i++){
						var _x = x + 62 + i * 72
						var _y = y + 67
						ctx.fillStyle = this.diffOptions[i].fill
						ctx.lineWidth = 5
						this.draw.roundedRect({
							ctx: ctx,
							x: _x - 28,
							y: _y,
							w: 56,
							h: 298,
							radius: 24
						})
						ctx.fill()
						ctx.stroke()
						ctx.fillStyle = this.diffOptions[i].iconFill
						ctx.beginPath()
						ctx.arc(_x, _y + 28, 20, 0, Math.PI * 2)
						ctx.fill()
						this.draw.diffOptionsIcon({
							ctx: ctx,
							x: _x,
							y: _y + 28,
							iconName: this.diffOptions[i].iconName
						})
						
						var text = this.diffOptions[i].text
						if(this.diffOptions[i].iconName === "options" && (this.selectedDiff === i || this.state.options !== 0)){
							text = this.optionsList[this.state.options]
						}
						
						this.draw.verticalText({
							ctx: ctx,
							text: text,
							x: _x,
							y: _y + 57,
							width: 56,
							height: 220,
							fill: "#fff",
							outline: "#000",
							outlineSize: this.songAsset.letterBorder,
							letterBorder: 4,
							fontSize: 28,
							fontFamily: this.font,
							letterSpacing: this.diffOptions[i].letterSpacing
						})
						
						var highlight = 0
						if(this.state.moveHover === i){
							highlight = 2
						}else if(this.selectedDiff === i){
							highlight = 1
						}
						if(highlight){
							this.draw.highlight({
								ctx: ctx,
								x: _x - 32,
								y: _y - 3,
								w: 64,
								h: 304,
								animate: highlight === 1,
								animateMS: Math.max(this.state.moveMS, this.state.mouseMoveMS),
								opacity: highlight === 2 ? 0.8 : 1,
								radius: 24
							})
							if(this.selectedDiff === i && !this.touchEnabled){
								this.draw.diffCursor({
									ctx: ctx,
									font: this.font,
									x: _x,
									y: _y - 45,
									two: p2.session && p2.player === 2
								})
							}
						}
					}
				}
				var drawDifficulty = (ctx, i, currentUra) => {
					if(currentSong.courses[this.difficultyId[i]] || currentUra){
						var crownDiff = currentUra ? "ura" : this.difficultyId[i]
						var players = p2.session ? 2 : 1
						var score = [scoreStorage.get(currentSong.hash, false, true)]
						if(p2.session){
							score[p2.player === 1 ? "push" : "unshift"](scoreStorage.getP2(currentSong.hash, false, true))
						}
						var reversed = false
						for(var a = players; a--;){
							var crownType = ""
							var p = reversed ? -(a - 1) : a
							if(score[p] && score[p][crownDiff]){
								crownType = score[p][crownDiff].crown
							}
							if(!reversed && players === 2 && p === 1 && crownType){
								reversed = true
								a++
							}else{
								this.draw.crown({
									ctx: ctx,
									type: crownType,
									x: (songSel ? x + 33 + i * 60 : x + 402 + i * 100) + (players === 2 ? p === 0 ? -13 : 13 : 0),
									y: songSel ? y + 75 : y + 30,
									scale: 0.25,
									ratio: this.ratio / this.pixelRatio
								})
							}
						}
						if(songSel && !this.state.move){
							var _x = x + 33 + i * 60
							var _y = y + 120
							ctx.fillStyle = currentUra ? "#006279" : "#ff9f18"
							ctx.beginPath()
							ctx.arc(_x, _y + 22, 22, -Math.PI, 0)
							ctx.arc(_x, _y + 266, 22, 0, Math.PI)
							ctx.fill()
							this.draw.diffIcon({
								ctx: ctx,
								diff: currentUra ? 4 : i,
								x: _x,
								y: _y - 8,
								scale: 1,
								border: 6
							})
						}else{
							var _x = x + 402 + i * 100
							var _y = y + 87
							this.draw.diffIcon({
								ctx: ctx,
								diff: i,
								x: _x,
								y: _y - 12,
								scale: 1.4,
								border: 6.5,
								noFill: true
							})
							ctx.fillStyle = "#aa7023"
							ctx.lineWidth = 4.5
							ctx.fillRect(_x - 35.5, _y + 2, 71, 380)
							ctx.strokeRect(_x - 35.5, _y + 2, 71, 380)
							ctx.fillStyle = currentUra ? "#006279" : "#fff"
							ctx.lineWidth = 2.5
							ctx.fillRect(_x - 28, _y + 19, 56, 351)
							ctx.strokeRect(_x - 28, _y + 19, 56, 351)
							this.draw.diffIcon({
								ctx: ctx,
								diff: currentUra ? 4 : i,
								x: _x,
								y: _y - 12,
								scale: 1.4,
								border: 4.5
							})
						}
						var offset = (songSel ? 44 : 56) / 2
						this.difficultyCache.get({
							ctx: ctx,
							x: _x - offset,
							y: songSel ? _y + 10 : _y + 23,
							w: songSel ? 44 : 56,
							h: (songSel ? 88 : 135) + 10,
							id: this.difficulty[currentUra ? 4 : i] + (songSel ? "1" : "0")
						}, ctx => {
							var ja = strings.id === "ja"
							this.draw.verticalText({
								ctx: ctx,
								text: this.difficulty[i],
								x: offset,
								y: 0,
								width: songSel ? 44 : 56,
								height: songSel ? (i === 1 && ja ? 66 : 88) : (ja ? 130 : (i === 1 && ja ? 110 : 135)),
								fill: currentUra ? "#fff" : "#000",
								fontSize: songSel ? 25 : (i === 2 && ja ? 45 : 40),
								fontFamily: this.font,
								outline: currentUra ? "#003C52" : false,
								outlineSize: currentUra ? this.songAsset.letterBorder : 0
							})
						})
						var songStarsObj = (currentUra ? currentSong.courses.ura : currentSong.courses[this.difficultyId[i]])
						var songStars = songStarsObj.stars
						var songBranch = songStarsObj.branch
						var moveMS = Math.max(this.state.moveMS, this.state.mouseMoveMS)
						var elapsedMS = this.state.screenMS > moveMS || !songSel ? this.state.screenMS : moveMS
						var fade = ((ms - elapsedMS) % 2000) / 2000
						if(songBranch && fade > 0.25 && fade < 0.75){
							this.draw.verticalText({
								ctx: ctx,
								text: strings.songBranch,
								x: _x,
								y: _y + (songSel ? 110 : 185),
								width: songSel ? 44 : 56,
								height: songSel ? 160 : 170,
								fill: songSel && !currentUra ? "#c85200" : "#fff",
								fontSize: songSel ? 25 : 27,
								fontFamily: songSel ? "Meiryo, Microsoft YaHei, sans-serif" : this.font,
								outline: songSel ? false : "#f22666",
								outlineSize: songSel ? 0 : this.songAsset.letterBorder
							})
						}else{
							for(var j = 0; j < 10; j++){
								if(songSel){
									var yPos = _y + 113 + j * 17
								}else{
									var yPos = _y + 178 + j * 19.5
								}
								if(10 - j > songStars){
									ctx.fillStyle = currentUra ? "#187085" : (songSel ? "#e97526" : "#e7e7e7")
									ctx.beginPath()
									ctx.arc(_x, yPos, songSel ? 4.5 : 5, 0, Math.PI * 2)
									ctx.fill()
								}else{
									this.draw.diffStar({
										ctx: ctx,
										songSel: songSel,
										ura: currentUra,
										x: _x,
										y: yPos,
										ratio: ratio
									})
								}
							}
						}
						var currentDiff = this.selectedDiff - this.diffOptions.length
						if(this.selectedDiff === 4 + this.diffOptions.length){
							currentDiff = 3
						}
						if(!songSel){
							var highlight = 0
							if(this.state.moveHover - this.diffOptions.length === i){
								highlight = 2
							}else if(currentDiff === i){
								highlight = 1
							}
							if(currentDiff === i && !this.touchEnabled){
								this.draw.diffCursor({
									ctx: ctx,
									font: this.font,
									x: _x,
									y: _y - 65,
									side: currentSong.p2Cursor === currentDiff && p2.socket.readyState === 1,
									two: p2.session && p2.player === 2
								})
							}
							if(highlight){
								this.draw.highlight({
									ctx: ctx,
									x: _x - 32,
									y: _y + 14,
									w: 64,
									h: 362,
									animate: highlight === 1,
									animateMS: Math.max(this.state.moveMS, this.state.mouseMoveMS),
									opacity: highlight === 2 ? 0.8 : 1
								})
							}
						}
					}
				}
				for(var i = 0; currentSong.courses && i < 4; i++){
					var currentUra = i === 3 && (this.state.ura && !songSel || currentSong.courses.ura && songSel)
					if(songSel && currentUra){
						drawDifficulty(ctx, i, false)
						var elapsedMS = Math.max(this.state.screenMS, this.state.moveMS, this.state.mouseMoveMS)
						var fade = ((ms - elapsedMS) % 4000) / 4000
						var alphaFade = 0
						if(fade > 0.95){
							alphaFade = this.draw.easeOut(1 - (fade - 0.95) * 20)
						}else if(fade > 0.5){
							alphaFade = 1
						}else if(fade > 0.45){
							alphaFade = this.draw.easeIn((fade - 0.45) * 20)
						}
						this.draw.alpha(alphaFade, ctx, ctx => {
							ctx.fillStyle = this.songSkin.selected.background
							ctx.fillRect(x + 7 + i * 60, y + 60, 52, 352)
							drawDifficulty(ctx, i, true)
						}, winW, winH)
					}else{
						drawDifficulty(ctx, i, currentUra)
					}
				}
				for(var i = 0; currentSong.courses && i < 4; i++){
					if(!songSel && i === currentSong.p2Cursor && p2.socket.readyState === 1){
						var _x = x + 402 + i * 100
						var _y = y + 87
						var currentDiff = this.selectedDiff - this.diffOptions.length
						if(this.selectedDiff === 4 + this.diffOptions.length){
							currentDiff = 3
						}
						this.draw.diffCursor({
							ctx: ctx,
							font: this.font,
							x: _x,
							y: _y - 65,
							two: !p2.session || p2.player === 1,
							side: currentSong.p2Cursor === currentDiff,
							scale: 1
						})
					}
				}
				
				var borders = (this.songAsset.border + this.songAsset.innerBorder) * 2
				var textW = this.songAsset.width - borders
				var textH = this.songAsset.height - borders
				var textX = Math.max(w - 37 - textW / 2, w / 2 - textW / 2)
				var textY = opened * 12 + (1 - opened) * 7
				
				if(currentSong.subtitle){
					this.currentSongCache.get({
						ctx: ctx,
						x: x + textX - textW,
						y: y + textY,
						w: textW,
						h: textH,
						id: "subtitle",
					}, ctx => {
						this.draw.verticalText({
							ctx: ctx,
							text: currentSong.subtitle,
							x: textW / 2,
							y: 7,
							width: textW,
							height: textH - 35,
							fill: "#fff",
							outline: "#000",
							outlineSize: 14,
							fontSize: 28,
							fontFamily: this.font,
							align: "bottom"
						})
					})
				}
				
				var hasMaker = currentSong.maker || currentSong.maker === 0
				var hasVideo = currentSong.video || currentSong.video === 0
				if(hasMaker || currentSong.lyrics){
					if (songSel) {
						var _x = x + 38
						var _y = y + 10
						ctx.strokeStyle = "#000"
						ctx.lineWidth = 5
						
						if(hasMaker){
							var grd = ctx.createLinearGradient(_x, _y, _x, _y + 50)
							grd.addColorStop(0, "#fa251a")
							grd.addColorStop(1, "#ffdc33")
							ctx.fillStyle = grd
						}else{
							ctx.fillStyle = "#000"
						}
						this.draw.roundedRect({
							ctx: ctx,
							x: _x - 28,
							y: _y,
							w: 192,
							h: 50,
							radius: 24
						})
						ctx.fill()
						ctx.stroke()
						
						if(hasMaker){
							this.draw.layeredText({
								ctx: ctx,
								text: strings.creative.creative,
								fontSize: strings.id === "en" ? 28 : 34,
								fontFamily: this.font,
								align: "center",
								baseline: "middle",
								x: _x + 68,
								y: _y + (strings.id === "ja" || strings.id === "en" ? 25 : 28),
								width: 172
							}, [
								{outline: "#fff", letterBorder: 6},
								{fill: "#000"}
							])
						}else{
							this.draw.layeredText({
								ctx: ctx,
								text: strings.withLyrics,
								fontSize: strings.id === "en" ? 28 : 34,
								fontFamily: this.font,
								align: "center",
								baseline: "middle",
								x: _x + 68,
								y: _y + (strings.id === "ja" || strings.id === "en" ? 25 : 28),
								width: 172
							}, [
								{fill: currentSong.skin.border[0]}
							])
						}
					} else if(currentSong.maker && currentSong.maker.id > 0 && currentSong.maker.name){
						var _x = x + 62
						var _y = y + 380
						ctx.lineWidth = 5

						var grd = ctx.createLinearGradient(_x, _y, _x, _y+50);
						grd.addColorStop(0, '#fa251a');
						grd.addColorStop(1, '#ffdc33');

						ctx.fillStyle = '#75E2EE';
						this.draw.roundedRect({
							ctx: ctx,
							x: _x - 28,
							y: _y,
							w: 250,
							h: 80,
							radius: 15
						})
						ctx.fill()
						ctx.stroke()
						ctx.beginPath()
						ctx.arc(_x, _y + 28, 20, 0, Math.PI * 2)
						ctx.fill()

						this.draw.layeredText({
							ctx: ctx,
							text: strings.creative.maker,
							fontSize: 24,
							fontFamily: this.font,
							align: "left",
							baseline: "middle",
							x: _x - 15,
							y: _y + 23
						}, [
							{outline: "#000", letterBorder: 8},
							{fill: "#fff"}
						])

						this.draw.layeredText({
							ctx: ctx,
							text: currentSong.maker.name,
							fontSize: 28,
							fontFamily: this.font,
							align: "center",
							baseline: "middle",
							x: _x + 100,
							y: _y + 56,
							width: 210
						}, [
							{outline: "#fff", letterBorder: 8},
							{fill: "#000"}
						])

						if(this.state.moveHover === "maker"){
							this.draw.highlight({
								ctx: ctx,
								x: _x - 32,
								y: _y - 3,
								w: 250 + 7,
								h: 80 + 7,
								opacity: 0.8,
								radius: 15
							})
						}
					}
				}
				
				for(var i = 0; currentSong.courses && i < 4; i++){
					if(currentSong.courses[this.difficultyId[i]] || currentUra){
						if(songSel && i === currentSong.p2Cursor && p2.socket.readyState === 1){
							var _x = x + 33 + i * 60
							var _y = y + 120
							this.draw.diffCursor({
								ctx: ctx,
								font: this.font,
								x: _x,
								y: _y - 45,
								two: !p2.session || p2.player === 1,
								side: false,
								scale: 0.7
							})
						}
					}
				}
				
				if(!songSel && currentSong.courses.ura){
					var fade = ((ms - this.state.screenMS) % 1200) / 1200
					var _x = x + 402 + 4 * 100 + fade * 25
					var _y = y + 258
					ctx.fillStyle = "rgba(0, 0, 0, " + 0.2 * this.draw.easeInOut(1 - fade) + ")"
					ctx.beginPath()
					ctx.moveTo(_x - 35, _y - 25)
					ctx.lineTo(_x - 10, _y)
					ctx.lineTo(_x - 35, _y + 25)
					ctx.fill()
				}
				if (songSel && hasVideo) {
					var _x = x + 230;
					var _y = y - 13;

					// Icon dimensions and positions
					const rectX = _x - 10;
					const rectY = _y + 23;
					const rectWidth = 30;  // Adjust width
					const rectHeight = 30; // Adjust height
					const rectRadius = 5; // Rounded corners

					// Draw the outer rectangle (film strip body)
					ctx.beginPath();
					ctx.moveTo(rectX + rectRadius, rectY);
					ctx.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + rectHeight, rectRadius);
					ctx.arcTo(rectX + rectWidth, rectY + rectHeight, rectX, rectY + rectHeight, rectRadius);
					ctx.arcTo(rectX, rectY + rectHeight, rectX, rectY, rectRadius);
					ctx.arcTo(rectX, rectY, rectX + rectWidth, rectY, rectRadius);
					ctx.closePath();
					ctx.fillStyle = "#000"; // Black fill
					ctx.fill();
					ctx.strokeStyle = "#fff"; // White border
					ctx.lineWidth = 2;
					ctx.stroke();

					// Draw the "holes" for the film strip
					ctx.fillStyle = "#000"; // White for the holes
					const holeSize = 3;
					const holeSpacing = 5;
					for (let i = 0; i < 4; i++) {
						// Left side holes
						ctx.fillRect(rectX - holeSize - 2, rectY + 5 + i * holeSpacing, holeSize, holeSize);
						// Right side holes
						ctx.fillRect(rectX + rectWidth + 2, rectY + 5 + i * holeSpacing, holeSize, holeSize);
					}

					// Draw the play button (triangle)
					const centerX = rectX + rectWidth / 2;
					const centerY = rectY + rectHeight / 2;
					const triangleSize = 12;
					ctx.beginPath();
					ctx.moveTo(centerX - triangleSize / 2, centerY - triangleSize);
					ctx.lineTo(centerX + triangleSize, centerY);
					ctx.lineTo(centerX - triangleSize / 2, centerY + triangleSize);
					ctx.closePath();
					ctx.fillStyle = "#fff"; // White triangle
					ctx.fill();
				}
				ctx.globalAlpha = 1 - Math.max(0, opened - 0.5) * 2
				ctx.fillStyle = selectedSkin.background
				ctx.fillRect(x, y, w, h)
				ctx.globalAlpha = 1
				var verticalTitle = ctx => {
					this.draw.verticalText({
						ctx: ctx,
						text: currentSong.title,
						x: textW / 2,
						y: 7,
						width: textW,
						height: textH - 35,
						fill: "#fff",
						outline: selectedSkin.outline,
						outlineSize: this.songAsset.letterBorder,
						fontSize: 40,
						fontFamily: this.font
					})
				}
				if(selectedSkin.outline === "#000"){
					this.currentSongCache.get({
						ctx: ctx,
						x: x + textX,
						y: y + textY - 7,
						w: textW,
						h: textH,
						id: "title",
					}, verticalTitle)
				}else{
					this.songTitleCache.get({
						ctx: ctx,
						x: x + textX,
						y: y + textY - 7,
						w: textW,
						h: textH,
						id: currentSong.title + selectedSkin.outline,
					}, verticalTitle)
				}
				if(!songSel && this.selectableText !== currentSong.title){
					this.draw.verticalText({
						ctx: ctx,
						text: currentSong.title,
						x: x + textX + textW / 2,
						y: y + textY,
						width: textW,
						height: textH - 35,
						fontSize: 40,
						fontFamily: this.font,
						selectable: this.selectable,
						selectableScale: this.ratio / this.pixelRatio,
						selectableX: Math.max(0, innerWidth / 2 - lastHeight * 16 / 9)
					})
					this.selectable.style.display = ""
					this.selectableText = currentSong.title
				}
			}
		})
		
		if(screen !== "difficulty" && this.selectableText){
			this.selectableText = ""
			this.selectable.style.display = "none"
		}
		
		if(songSelMoving){
			this.draw.highlight({
				ctx: ctx,
				x: winW / 2 - selectedWidth / 2,
				y: songTop,
				w: selectedWidth,
				h: selectedHeight,
				opacity: 0.8
			})
		}
		
		ctx.fillStyle = "#000"
		ctx.fillRect(0, frameTop + 595, 1280 + frameLeft * 2, 125 + frameTop)
		var x = 0
		var y = frameTop + 603
		var w = p2.session ? frameLeft + 638 - 200 : frameLeft + 638
		var h = 117 + frameTop
		this.draw.pattern({
			ctx: ctx,
			img: assets.image["bg_score_p1"],
			x: x,
			y: y,
			w: w,
			h: h,
			dx: frameLeft + 10,
			dy: frameTop + 15,
			scale: 1.55
		})
		ctx.fillStyle = "rgba(249, 163, 149, 0.5)"
		ctx.beginPath()
		ctx.moveTo(x, y)
		ctx.lineTo(x + w, y)
		ctx.lineTo(x + w - 4, y + 4)
		ctx.lineTo(x, y + 4)
		ctx.fill()
		ctx.fillStyle = "rgba(0, 0, 0, 0.25)"
		ctx.beginPath()
		ctx.moveTo(x + w, y)
		ctx.lineTo(x + w, y + h)
		ctx.lineTo(x + w - 4, y + h)
		ctx.lineTo(x + w - 4, y + 4)
		ctx.fill()
		
		if(!p2.session || p2.player === 1){
			var name = account.loggedIn ? account.displayName : strings.defaultName
			var rank = account.loggedIn || !gameConfig.accounts || p2.session ? false : strings.notLoggedIn
		}else{
			var name = p2.name || strings.defaultName
			var rank = false
		}
		this.nameplateCache.get({
			ctx: ctx,
			x: frameLeft + 60,
			y: frameTop + 640,
			w: 273,
			h: 66,
			id: "1p" + name + "\n" + rank,
		}, ctx => {
			this.draw.nameplate({
				ctx: ctx,
				x: 3,
				y: 3,
				name: name,
				rank: rank,
				font: this.font
			})
		})
		if(this.state.moveHover === "account"){
			this.draw.highlight({
				ctx: ctx,
				x: frameLeft + 59.5,
				y: frameTop + 639.5,
				w: 271,
				h: 64,
				radius: 28.5,
				opacity: 0.8,
				size: 10
			})
		}
		
		if(p2.session){
			x = x + w + 4
			w = 396
			this.draw.pattern({
				ctx: ctx,
				img: assets.image["bg_settings"],
				x: x,
				y: y,
				w: w,
				h: h,
				dx: frameLeft + 11,
				dy: frameTop + 45,
				scale: 3.1
			})
			ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
			ctx.beginPath()
			ctx.moveTo(x, y + h)
			ctx.lineTo(x, y)
			ctx.lineTo(x + w, y)
			ctx.lineTo(x + w, y + 4)
			ctx.lineTo(x + 4, y + 4)
			ctx.lineTo(x + 4, y + h)
			ctx.fill()
			ctx.fillStyle = "rgba(0, 0, 0, 0.25)"
			ctx.beginPath()
			ctx.moveTo(x + w, y)
			ctx.lineTo(x + w, y + h)
			ctx.lineTo(x + w - 4, y + h)
			ctx.lineTo(x + w - 4, y + 4)
			ctx.fill()
			if(this.state.moveHover === "session"){
				this.draw.highlight({
					ctx: ctx,
					x: x,
					y: y,
					w: w,
					h: h,
					opacity: 0.8
				})
			}
		}
		
		x = p2.session ? frameLeft + 642 + 200 : frameLeft + 642
		w = p2.session ? frameLeft + 638 - 200 : frameLeft + 638
		if(p2.session){
			this.draw.pattern({
				ctx: ctx,
				img: assets.image["bg_score_p2"],
				x: x,
				y: y,
				w: w,
				h: h,
				dx: frameLeft + 15,
				dy: frameTop - 20,
				scale: 1.55
			})
			ctx.fillStyle = "rgba(138, 245, 247, 0.5)"
		}else{
			this.draw.pattern({
				ctx: ctx,
				img: assets.image["bg_settings"],
				x: x,
				y: y,
				w: w,
				h: h,
				dx: frameLeft + 11,
				dy: frameTop + 45,
				scale: 3.1
			})
			ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
		}
		ctx.beginPath()
		ctx.moveTo(x, y + h)
		ctx.lineTo(x, y)
		ctx.lineTo(x + w, y)
		ctx.lineTo(x + w, y + 4)
		ctx.lineTo(x + 4, y + 4)
		ctx.lineTo(x + 4, y + h)
		ctx.fill()
		if(screen !== "difficulty" && p2.socket && p2.socket.readyState === 1 && !assets.customSongs){
			var elapsed = (ms - this.state.screenMS) % 3100
			var fade = 1
			if(!p2.session && screen === "song"){
				if(elapsed > 2800){
					fade = (elapsed - 2800) / 300
				}else if(2000 < elapsed){
					if(elapsed < 2300){
						fade = 1 - (elapsed - 2000) / 300
					}else{
						fade = 0
					}
				}
			}
			if(fade > 0){
				if(fade < 1){
					ctx.globalAlpha = this.draw.easeIn(fade)
				}
				this.sessionCache.get({
					ctx: ctx,
					x: p2.session ? winW / 4 : winW / 2,
					y: y + (h - 32) / 2,
					w: winW / 2,
					h: 38,
					id: p2.session ? "sessionend" : "sessionstart"
				})
				ctx.globalAlpha = 1
			}
			if(!p2.session && this.state.moveHover === "session"){
				this.draw.highlight({
					ctx: ctx,
					x: x,
					y: y,
					w: w,
					h: h,
					opacity: 0.8
				})
			}
		}
		if(p2.session){
			if(p2.player === 1){
				var name = p2.name || strings.default2PName
			}else{
				var name = account.loggedIn ? account.displayName : strings.default2PName
			}
			this.nameplateCache.get({
				ctx: ctx,
				x: frameLeft + 949,
				y: frameTop + 640,
				w: 273,
				h: 66,
				id: "2p" + name,
			}, ctx => {
				this.draw.nameplate({
					ctx: ctx,
					x: 3,
					y: 3,
					name: name,
					font: this.font,
					blue: true
				})
			})
		}
		
		if(this.state.showWarning){
			if(this.preview){
				this.endPreview()
			}
			ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
			ctx.fillRect(0, 0, winW, winH)
			
			ctx.save()
			ctx.translate(frameLeft, frameTop)
			
			var pauseRect = (ctx, mul) => {
				this.draw.roundedRect({
					ctx: ctx,
					x: 269 * mul,
					y: 93 * mul,
					w: 742 * mul,
					h: 494 * mul,
					radius: 17 * mul
				})
			}
			pauseRect(ctx, 1)
			ctx.strokeStyle = "#fff"
			ctx.lineWidth = 24
			ctx.stroke()
			ctx.strokeStyle = "#000"
			ctx.lineWidth = 12
			ctx.stroke()
			this.draw.pattern({
				ctx: ctx,
				img: assets.image["bg_pause"],
				shape: pauseRect,
				dx: 68,
				dy: 11
			})
			if(this.showWarning.name === "scoreSaveFailed"){
				var text = strings.scoreSaveFailed
			}else if(this.showWarning.name === "loadSongError"){
				var text = []
				var textIndex = 0
				var subText = [this.showWarning.title, this.showWarning.id, this.showWarning.error]
				var textParts = strings.loadSongError.split("%s")
				textParts.forEach((textPart, i) => {
					if(i !== 0){
						text.push(subText[textIndex++])
					}
					text.push(textPart)
				})
				text = text.join("")
			}
			this.draw.wrappingText({
				ctx: ctx,
				text: text,
				fontSize: 30,
				fontFamily: this.font,
				x: 300,
				y: 130,
				width: 680,
				height: 300,
				lineHeight: 35,
				fill: "#000",
				verticalAlign: "middle",
				textAlign: "center"
			})
			
			var _x = 640
			var _y = 470
			var _w = 464
			var _h = 80
			ctx.fillStyle = "#ffb447"
			this.draw.roundedRect({
				ctx: ctx,
				x: _x - _w / 2,
				y: _y,
				w: _w,
				h: _h,
				radius: 30
			})
			ctx.fill()
			var layers = [
				{outline: "#000", letterBorder: 10},
				{fill: "#fff"}
			]
			this.draw.layeredText({
				ctx: ctx,
				text: strings.tutorial.ok,
				x: _x,
				y: _y + 18,
				width: _w,
				height: _h - 54,
				fontSize: 40,
				fontFamily: this.font,
				letterSpacing: -1,
				align: "center"
			}, layers)
			
			var highlight = 1
			if(this.state.moveHover === "showWarning"){
				highlight = 2
			}
			if(highlight){
				this.draw.highlight({
					ctx: ctx,
					x: _x - _w / 2 - 3.5,
					y: _y - 3.5,
					w: _w + 7,
					h: _h + 7,
					animate: highlight === 1,
					animateMS: Math.max(this.state.moveMS, this.state.mouseMoveMS),
					opacity: highlight === 2 ? 0.8 : 1,
					radius: 30
				})
			}
			
			ctx.restore()
		}
		
		if(screen === "titleFadeIn"){
			ctx.save()
			
			var elapsed = ms - this.state.screenMS
			ctx.globalAlpha = Math.max(0, 1 - elapsed / 500)
			ctx.fillStyle = "#000"
			ctx.fillRect(0, 0, winW, winH)
			
			ctx.restore()
		}
		
		if(p2.session && (!this.lastScoreMS || ms > this.lastScoreMS + 1000)){
			this.lastScoreMS = ms
			scoreStorage.eventLoop()
		}
	}

	drawBackground(cat){
		if(this.songSkin[cat] && this.songSkin[cat].bg_img){
			let filename = this.songSkin[cat].bg_img.slice(0, this.songSkin[cat].bg_img.lastIndexOf("."))
			this.songSelect.style.backgroundImage = "url('" + assets.image[filename].src + "')"
		}else{
			this.songSelect.style.backgroundImage = "url('" + assets.image["bg_genre_def"].src + "')"
		}
	}
	
	drawClosedSong(config){
		var ctx = config.ctx
		
		this.drawSongCrown(config)
		config.width = this.songAsset.width
		config.height = this.songAsset.height
		config.border = this.songAsset.border
		config.innerBorder = this.songAsset.innerBorder
		config.background = config.song.skin.background
		config.borderStyle = config.song.skin.border
		config.outline = config.song.skin.outline
		config.text = config.song.title
		config.animateMS = Math.max(this.state.moveMS, this.state.mouseMoveMS)
		config.cached = 1
		config.frameCache = this.songFrameCache
		config.innerContent = (x, y, w, h) => {
			this.songTitleCache.get({
				ctx: ctx,
				x: x,
				y: y,
				w: w,
				h: h,
				id: config.text + config.outline,
			}, ctx => {
				this.draw.verticalText({
					ctx: ctx,
					text: config.text,
					x: w / 2,
					y: 7,
					width: w,
					height: h - 35,
					fill: "#fff",
					outline: config.outline,
					outlineSize: this.songAsset.letterBorder,
					fontSize: 40,
					fontFamily: this.font
				})
			})
		}
		this.draw.songFrame(config)
		if("p2Cursor" in config.song && config.song.p2Cursor !== null && p2.socket.readyState === 1){
			this.draw.diffCursor({
				ctx: ctx,
				font: this.font,
				x: config.x + 48,
				y: config.y - 27,
				two: true,
				scale: 1,
				side: true
			})
		}
	}
	
	drawSongCrown(config){
		if(!config.song.action && config.song.hash){
			var ctx = config.ctx
			var players = p2.session ? 2 : 1
			var score = [scoreStorage.get(config.song.hash, false, true)]
			var scoreDrawn = []
			if(p2.session){
				score[p2.player === 1 ? "push" : "unshift"](scoreStorage.getP2(config.song.hash, false, true))
			}
			for(var i = this.difficultyId.length; i--;){
				var diff = this.difficultyId[i]
				for(var p = players; p--;){
					if(!score[p] || scoreDrawn[p]){
						continue
					}
					if(config.song.courses[this.difficultyId[i]] && score[p][diff] && score[p][diff].crown){
						this.draw.crown({
							ctx: ctx,
							type: score[p][diff].crown,
							x: (config.x + this.songAsset.width / 2) + (players === 2 ? p === 0 ? -13 : 13 : 0),
							y: config.y - 13,
							scale: 0.3,
							ratio: this.ratio / this.pixelRatio
						})
						this.draw.diffIcon({
							ctx: ctx,
							diff: i,
							x: (config.x + this.songAsset.width / 2 + 8) + (players === 2 ? p === 0 ? -13 : 13 : 0),
							y: config.y - 8,
							scale: diff === "hard" || diff === "normal" ? 0.45 : 0.5,
							border: 6.5,
							small: true
						})
						scoreDrawn[p] = true
					}
				}
			}
		}
	}
	
	startPreview(loadOnly){
		if(!loadOnly && this.state && this.state.showWarning || this.state.waitPreview > this.getMS()){
			return
		}
		var currentSong = this.songs[this.selectedSong]
		var id = currentSong.id
		var prvTime = currentSong.preview
		this.endPreview()
		
		if("id" in currentSong){
			var startLoad = this.getMS()
			if(loadOnly){
				var currentId = null
			}else{
				var currentId = this.previewId
				this.previewing = this.selectedSong
			}
			var songObj = this.previewList.find(song => song && song.id === id)
			
			if(songObj){
				if(!loadOnly){
					this.preview = songObj.preview_sound
					this.preview.gain = snd.previewGain
					this.previewLoaded(startLoad, songObj.preview_time, currentSong.volume)
				}
			}else{
				songObj = {id: id}
				if(currentSong.previewMusic){
					songObj.preview_time = 0
					var promise = snd.previewGain.load(currentSong.previewMusic).catch(() => {
						songObj.preview_time = prvTime
						return snd.previewGain.load(currentSong.music)
					})
				}else if(currentSong.unloaded){
					var promise = this.getUnloaded(this.selectedSong, songObj, currentId)
				}else if(currentSong.sound){
					songObj.preview_time = prvTime
					currentSong.sound.gain = snd.previewGain
					var promise = Promise.resolve(currentSong.sound)
				}else if(currentSong.music !== "muted"){
					songObj.preview_time = prvTime
					var promise = snd.previewGain.load(currentSong.music)
				}else{
					return
				}
				promise.then(sound => {
					if(currentId === this.previewId || loadOnly){
						songObj.preview_sound = sound
						if(!loadOnly){
							this.preview = sound
							this.previewLoaded(startLoad, songObj.preview_time, currentSong.volume)
						}
						var oldPreview = this.previewList.shift()
						if(oldPreview){
							oldPreview.preview_sound.clean()
						}
						this.previewList.push(songObj)
					}else{
						sound.clean()
					}
				}).catch(e => {
					if(e !== "cancel"){
						return Promise.reject(e)
					}
				})
			}
		}
	}
	previewLoaded(startLoad, prvTime, volume){
		var endLoad = this.getMS()
		var difference = endLoad - startLoad
		var minDelay = 300
		var delay = minDelay - Math.min(minDelay, difference)
		snd.previewGain.setVolumeMul(volume || 1)
		this.preview.playLoop(delay / 1000, false, prvTime)
	}
	endPreview(force){
		this.previewId++
		this.previewing = force ? "muted" : null
		if(this.preview){
			this.preview.stop()
		}
	}
	playBgm(enabled){
		if(enabled && this.state && this.state.showWarning){
			return
		}
		if(enabled && !this.bgmEnabled){
			this.bgmEnabled = true
			snd.musicGain.fadeIn(0.4)
		}else if(!enabled && this.bgmEnabled){
			this.bgmEnabled = false
			snd.musicGain.fadeOut(0.4)
		}
	}
	getUnloaded(selectedSong, songObj, currentId){
		var currentSong = this.songs[selectedSong]
		var file = currentSong.chart
		var importSongs = new ImportSongs(false, assets.otherFiles)
		return file.read(currentSong.type === "tja" ? "utf-8" : "").then(data => {
			currentSong.chart = new CachedFile(data, file)
			return importSongs[currentSong.type === "tja" ? "addTja" : "addOsu"]({
				file: currentSong.chart,
				index: currentSong.id
			})
		}).then(() => {
			var imported = importSongs.songs[currentSong.id]
			importSongs.clean()
			songObj.preview_time = imported.preview
			var index = assets.songs.findIndex(song => song.id === currentSong.id)
			if(index !== -1){
				assets.songs[index] = imported
			}
			this.songs[selectedSong] = this.addSong(imported)
			this.state.moveMS = this.getMS() - this.songSelecting.speed * this.songSelecting.resize
			if(imported.music && currentId === this.previewId){
				return snd.previewGain.load(imported.music).then(sound => {
					imported.sound = sound
					this.songs[selectedSong].sound = sound
					return sound.copy()
				})
			}else{
				return Promise.reject("cancel")
			}
		})
	}
	addSong(song){
		var title = this.getLocalTitle(song.title, song.title_lang)
		var subtitle = this.getLocalTitle(title === song.title ? song.subtitle : "", song.subtitle_lang)
		var skin = null
		var categoryName = ""
		var originalCategory = ""
		if(song.category_id !== null && song.category_id !== undefined){
			var category = assets.categories.find(cat => cat.id === song.category_id)
			var categoryName = this.getLocalTitle(category.title, category.title_lang)
			var originalCategory = category.title
			var skin = this.songSkin[category.title]
		}else if(song.category){
			var categoryName = song.category
			var originalCategory = song.category
		}
		var addedSong = {
			title: title,
			originalTitle: song.title,
			subtitle: subtitle,
			skin: skin || this.songSkin.default,
			originalCategory: originalCategory,
			category: categoryName,
			preview: song.preview || 0,
			songSkin: song.song_skin || {},
			canJump: true,
			hash: song.hash || song.title
		}
		for(var i in song){
			if(!(i in addedSong)){
				addedSong[i] = song[i]
			}
		}
		return addedSong
	}
	
	onusers(response){
		var p2InSong = false
		this.songs.forEach(song => {
			song.p2Cursor = null
		})
		if(response && response.value){
			response.value.forEach(idDiff => {
				var id = idDiff.id |0
				var diff = idDiff.diff
				var diffId = this.difficultyId.indexOf(diff)
				if(diffId > 3){
					diffId = 3
				}
				if(diffId >= 0){
					var index = 0
					var currentSong = this.songs.find((song, i) => {
						index = i
						return song.id === id
					})
					if(currentSong){
						currentSong.p2Cursor = diffId
						if(p2.session && currentSong.courses){
							this.setSelectedSong(index)
							this.state.move = 0
							if(this.state.screen !== "difficulty"){
								this.toSelectDifficulty({player: response.value.player})
							}
							this.search.enabled = false
							p2InSong = true
							this.search.remove()
						}
					}
				}
			})
		}

		if(!this.search.enabled && !p2InSong){
			this.search.enabled = true
		}
	}
	onsongsel(response){
		if(response && response.value){
			var selected = false
			if(response.type === "songsel" && "selected" in response.value){
				selected = response.value.selected
			}
			if("fromRandom" in response.value && response.value.fromRandom === true){
				this.lastRandom = true
			}
			if("song" in response.value){
				var song = +response.value.song
				if(song >= 0 && song < this.songs.length){
					if(response.type === "catjump"){
						var moveBy = response.value.move
						if(moveBy === -1 || moveBy === 1){
							this.setSelectedSong(song)
							this.categoryJump(moveBy, {player: response.value.player})
						}
					}else if(!selected){
						this.state.locked = true
						if(this.state.screen === "difficulty"){
							this.toSongSelect(true)
						}
						var moveBy = song - this.selectedSong
						if(moveBy){
							if(this.selectedSong < song){
								var altMoveBy = -this.mod(this.songs.length, this.selectedSong - song)
							}else{
								var altMoveBy = this.mod(this.songs.length, moveBy)
							}
							if(Math.abs(altMoveBy) < Math.abs(moveBy)){
								moveBy = altMoveBy
							}
							this.moveToSong(moveBy, {player: response.value.player})
						}
					}else if(this.songs[song].courses){
						this.setSelectedSong(song)
						this.state.move = 0
						if(this.state.screen !== "difficulty"){
							this.playBgm(false)
							this.toSelectDifficulty({player: response.value.player})
						}
					}
				}
			}
		}
	}
	oncatjump(response){
		if(response && response.value){
			if("song" in response.value){
				var song = +response.value.song
				if(song >= 0 && song < this.songs.length){
					this.state.locked = true
				}
			}
		}
	}
	startP2(){
		this.onusers(p2.getMessage("users"))
		if(p2.session){
			this.onsongsel(p2.getMessage("songsel"))
		}
		pageEvents.add(p2, "message", response => {
			if(response.type == "users"){
				this.onusers(response)
			}
			if(p2.session && (response.type == "songsel" || response.type == "catjump")){
				this.onsongsel(response)
				this.state.selLock = false
			}
		})
		if(p2.closed){
			p2.open()
		}
	}
	
	mod(length, index){
		return ((index % length) + length) % length
	}
	
	getLocalTitle(title, titleLang){
		if(titleLang){
			for(var id in titleLang){
				if(id === "en" && strings.preferEn && !(strings.id in titleLang) && titleLang.en || id === strings.id && titleLang[id]){
					return titleLang[id]
				}
			}
		}
		return title
	}
	
	clearHash(){
		if(location.hash.toLowerCase().startsWith("#song=")){
			p2.hash("")
		}
	}
	
	playSound(id, time, snd){
		if(!this.drumSounds && (id === "se_don" || id === "se_ka" || id === "se_cancel")){
			return
		}
		var ms = Date.now() + (time || 0) * 1000
		if(!(id in this.playedSounds) || ms > this.playedSounds[id] + 30){
			assets.sounds[id + (snd ? "_p" + snd : "")].play(time)
			this.playedSounds[id] = ms
		}
	}
	
	getMS(){
		return Date.now()
	}
	
	clean(){
		this.keyboard.clean()
		this.gamepad.clean()
		this.clearHash()
		this.draw.clean()
		this.songTitleCache.clean()
		this.selectTextCache.clean()
		this.categoryCache.clean()
		this.difficultyCache.clean()
		this.sessionCache.clean()
		this.currentSongCache.clean()
		this.nameplateCache.clean()
		this.search.clean()
		assets.sounds["bgm_songsel"].stop()
		if(!this.bgmEnabled){
			snd.musicGain.fadeIn()
			setTimeout(() => {
				snd.buffer.loadSettings()
			}, 500)
		}
		this.redrawRunning = false
		this.endPreview()
		this.previewList.forEach(song => {
			if(song){
				song.preview_sound.clean()
			}
		})
		pageEvents.remove(loader.screen, ["mousemove", "mouseleave", "mousedown", "touchstart"])
		pageEvents.remove(this.canvas, ["touchend", "wheel"])
		pageEvents.remove(p2, "message")
		if(this.touchEnabled && fullScreenSupported){
			pageEvents.remove(this.touchFullBtn, "click")
			delete this.touchFullBtn
		}
		delete this.selectable
		delete this.ctx
		delete this.canvas
	}

	toDownload(){
		var jsZip = new JSZip()
		var zip = new jsZip()
		var song = this.songs[this.selectedSong]
		var promises = []
		var chartParsed = false
		var musicFilename
		var chartBlob
		var musicBlob
		var lyricsBlob
		var blobs = []
		if(song.chart){
			var charts = []
			if(song.chart.separateDiff){
				for(var i in song.chart){
					if(song.chart[i] && i !== "separateDiff"){
						charts.push(song.chart[i])
					}
				}
			}else{
				charts.push(song.chart)
			}
			charts.forEach(chart => {
				promises.push(chart.blob().then(blob => {
					var promise
					if(!chartParsed){
						chartParsed = true
						if(song.type === "tja"){
							promise = readFile(blob, false, "utf-8").then(dataRaw => {
								var data = dataRaw ? dataRaw.replace(/\0/g, "").split("\n") : []
								var tja = new ParseTja(data, "oni", 0, 0, true)
								for(var diff in tja.metadata){
									var meta = tja.metadata[diff]
									if(meta.wave){
										musicFilename = meta.wave
									}
								}
							})
						}else if(song.type === "osu"){
							promise = readFile(blob).then(dataRaw => {
								var data = dataRaw ? dataRaw.replace(/\0/g, "").split("\n") : []
								var osu = new ParseOsu(data, "oni", 0, 0, true)
								if(osu.generalInfo.AudioFilename){
									musicFilename = osu.generalInfo.AudioFilename
								}
							})
						}
					}
					var outputBlob = {
						name: chart.name,
						data: blob
					}
					if(song.type === "tja" && !song.chart.separateDiff){
						chartBlob = outputBlob
					}
					blobs.push(outputBlob)
					return promise
				}))
			})
		}
		if(song.music){
			promises.push(song.music.blob().then(blob => {
				musicBlob = {
					name: song.music.name,
					data: blob
				}
				blobs.push(musicBlob)
			}))
		}
		// if(song.lyricsFile){
		// 	promises.push(song.lyricsFile.blob().then(blob => {
		// 		lyricsBlob = {
		// 			name: song.lyricsFile.name,
		// 			data: blob
		// 		}
		// 		blobs.push(lyricsBlob)
		// 	}))
		// }
		Promise.all(promises).then(() => {
			if(musicFilename){
				if(musicBlob){
					musicBlob.name = musicFilename
				}
				var filename = musicFilename
				var index = filename.lastIndexOf(".")
				if(index !== -1){
					filename = filename.slice(0, index)
				}
				if(chartBlob){
					chartBlob.name = filename + ".tja"
				}
				if(lyricsBlob){
					lyricsBlob.name = filename + ".vtt"
				}
			}
			blobs.forEach(blob => zip.file(blob.name, blob.data))
		}).then(() => zip.generateAsync({type: "blob"})).then(zip => {
			var url = URL.createObjectURL(zip)
			var link = document.createElement("a")
			link.href = url
			if("download" in HTMLAnchorElement.prototype){
				link.download = song.title + ".zip"
			}else{
				link.target = "_blank"
			}
			link.innerText = "."
			link.style.opacity = "0"
			document.body.appendChild(link)
			setTimeout(() => {
				link.click()
				document.body.removeChild(link)
				setTimeout(() => {
					URL.revokeObjectURL(url)
				}, 5000)
			})
		})
	}

	toDelete() {
		// ここに削除処理を書く
		if (!confirm("本当に削除しますか？\nこの曲に問題がある場合や\n公序良俗に反する場合にのみ実行したほうがいいと思います\n本当に曲が削除されます\n成功しても反映まで1分ほどかかる場合があります")) {
			return;
		}
		fetch("/api/delete", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id: this.songs[this.selectedSong].id,
			})
		})
			.then((res) => res.text())
			.then((text) => {
				alert(text);
			});
	}
}

/*!

JSZip v3.7.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/master/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/master/LICENSE
*/

function JSZip(){return function s(a,o,h){function u(r,t){if(!o[r]){if(!a[r]){var e="function"==typeof require&&require;if(!t&&e)return e(r,!0);if(l)return l(r,!0);var i=new Error("Cannot find module '"+r+"'");throw i.code="MODULE_NOT_FOUND",i;}var n=o[r]={exports:{}};a[r][0].call(n.exports,function(t){var e=a[r][1][t];return u(e||t)},n,n.exports,s,a,o,h)}return o[r].exports}for(var l="function"==typeof require&&require,t=0;t<h.length;t++)u(h[t]);return u}({1:[function(t,e,r){var c=t("./utils"),d=
t("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(t){for(var e,r,i,n,s,a,o,h=[],u=0,l=t.length,f=l,d="string"!==c.getTypeOf(t);u<t.length;)f=l-u,i=d?(e=t[u++],r=u<l?t[u++]:0,u<l?t[u++]:0):(e=t.charCodeAt(u++),r=u<l?t.charCodeAt(u++):0,u<l?t.charCodeAt(u++):0),n=e>>2,s=(3&e)<<4|r>>4,a=1<f?(15&r)<<2|i>>6:64,o=2<f?63&i:64,h.push(p.charAt(n)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(t){var e,r,i,n,s,a,o=0,h=0,u="data:";
if(t.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(t=t.replace(/[^A-Za-z0-9\+\/=]/g,"")).length/4;if(t.charAt(t.length-1)===p.charAt(64)&&f--,t.charAt(t.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=d.uint8array?new Uint8Array(0|f):new Array(0|f);o<t.length;)e=p.indexOf(t.charAt(o++))<<2|(n=p.indexOf(t.charAt(o++)))>>4,r=(15&n)<<4|(s=p.indexOf(t.charAt(o++)))>>2,i=(3&s)<<6|(a=p.indexOf(t.charAt(o++))),
l[h++]=e,64!==s&&(l[h++]=r),64!==a&&(l[h++]=i);return l}},{"./support":30,"./utils":32}],2:[function(t,e,r){var i=t("./external"),n=t("./stream/DataWorker"),s=t("./stream/Crc32Probe"),a=t("./stream/DataLengthProbe");function o(t,e,r,i,n){this.compressedSize=t,this.uncompressedSize=e,this.crc32=r,this.compression=i,this.compressedContent=n}o.prototype={getContentWorker:function(){var t=(new n(i.Promise.resolve(this.compressedContent))).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),
e=this;return t.on("end",function(){if(this.streamInfo.data_length!==e.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch");}),t},getCompressedWorker:function(){return(new n(i.Promise.resolve(this.compressedContent))).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(t,e,r){return t.pipe(new s).pipe(new a("uncompressedSize")).pipe(e.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",
e)},e.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(t,e,r){var i=t("./stream/GenericWorker");r.STORE={magic:"\x00\x00",compressWorker:function(t){return new i("STORE compression")},uncompressWorker:function(){return new i("STORE decompression")}},r.DEFLATE=t("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(t,e,r){var i=t("./utils");var o=function(){for(var t,e=[],r=0;r<256;r++){t=r;for(var i=0;i<8;i++)t=1&
t?3988292384^t>>>1:t>>>1;e[r]=t}return e}();e.exports=function(t,e){return void 0!==t&&t.length?"string"!==i.getTypeOf(t)?function(t,e,r,i){var n=o,s=i+r;t^=-1;for(var a=i;a<s;a++)t=t>>>8^n[255&(t^e[a])];return-1^t}(0|e,t,t.length,0):function(t,e,r,i){var n=o,s=i+r;t^=-1;for(var a=i;a<s;a++)t=t>>>8^n[255&(t^e.charCodeAt(a))];return-1^t}(0|e,t,t.length,0):0}},{"./utils":32}],5:[function(t,e,r){r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,
r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(t,e,r){var i=null;i="undefined"!=typeof Promise?Promise:t("lie"),e.exports={Promise:i}},{lie:37}],7:[function(t,e,r){var i="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,n=t("pako"),s=t("./utils"),a=t("./stream/GenericWorker"),o=i?"uint8array":"array";function h(t,e){a.call(this,"FlateWorker/"+t),this._pako=null,this._pakoAction=t,this._pakoOptions=e,this.meta={}}r.magic=
"\b\x00",s.inherits(h,a),h.prototype.processChunk=function(t){this.meta=t.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,t.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new n[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var e=this;this._pako.onData=
function(t){e.push({data:t,meta:e.meta})}},r.compressWorker=function(t){return new h("Deflate",t)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(t,e,r){function A(t,e){var r,i="";for(r=0;r<e;r++)i+=String.fromCharCode(255&t),t>>>=8;return i}function i(t,e,r,i,n,s){var a,o,h=t.file,u=t.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),d=I.transformTo("string",O.utf8encode(h.name)),c=h.comment,p=I.transformTo("string",
s(c)),m=I.transformTo("string",O.utf8encode(c)),_=d.length!==h.name.length,g=m.length!==c.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};e&&!r||(x.crc32=t.crc32,x.compressedSize=t.compressedSize,x.uncompressedSize=t.uncompressedSize);var S=0;e&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===n?(C=798,z|=function(t,e){var r=t;return t||(r=e?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(t){return 63&(t||0)}(h.dosPermissions)),
a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+d,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\x00",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+
A(p.length,2)+"\x00\x00\x00\x00"+A(z,4)+A(i,4)+f+b+p}}var I=t("../utils"),n=t("../stream/GenericWorker"),O=t("../utf8"),B=t("../crc32"),R=t("../signature");function s(t,e,r,i){n.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=e,this.zipPlatform=r,this.encodeFileName=i,this.streamFiles=t,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}I.inherits(s,n),s.prototype.push=function(t){var e=t.meta.percent||
0,r=this.entriesCount,i=this._sources.length;this.accumulate?this.contentBuffer.push(t):(this.bytesWritten+=t.data.length,n.prototype.push.call(this,{data:t.data,meta:{currentFile:this.currentFile,percent:r?(e+100*(r-i-1))/r:100}}))},s.prototype.openedSource=function(t){this.currentSourceOffset=this.bytesWritten,this.currentFile=t.file.name;var e=this.streamFiles&&!t.file.dir;if(e){var r=i(t,e,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=
!0},s.prototype.closedSource=function(t){this.accumulate=!1;var e=this.streamFiles&&!t.file.dir,r=i(t,e,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),e)this.push({data:function(t){return R.DATA_DESCRIPTOR+A(t.crc32,4)+A(t.compressedSize,4)+A(t.uncompressedSize,4)}(t),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},s.prototype.flush=
function(){for(var t=this.bytesWritten,e=0;e<this.dirRecords.length;e++)this.push({data:this.dirRecords[e],meta:{percent:100}});var r=this.bytesWritten-t,i=function(t,e,r,i,n){var s=I.transformTo("string",n(i));return R.CENTRAL_DIRECTORY_END+"\x00\x00\x00\x00"+A(t,2)+A(t,2)+A(e,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,t,this.zipComment,this.encodeFileName);this.push({data:i,meta:{percent:100}})},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),
this.isPaused?this.previous.pause():this.previous.resume()},s.prototype.registerPrevious=function(t){this._sources.push(t);var e=this;return t.on("data",function(t){e.processChunk(t)}),t.on("end",function(){e.closedSource(e.previous.streamInfo),e._sources.length?e.prepareNextSource():e.end()}),t.on("error",function(t){e.error(t)}),this},s.prototype.resume=function(){return!!n.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||
this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(t){var e=this._sources;if(!n.prototype.error.call(this,t))return!1;for(var r=0;r<e.length;r++)try{e[r].error(t)}catch(t$0){}return!0},s.prototype.lock=function(){n.prototype.lock.call(this);for(var t=this._sources,e=0;e<t.length;e++)t[e].lock()},e.exports=s},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(t,e,r){var u=t("../compressions"),i=t("./ZipFileWorker");r.generateWorker=
function(t,a,e){var o=new i(a.streamFiles,e,a.platform,a.encodeFileName),h=0;try{t.forEach(function(t,e){h++;var r=function(t,e){var r=t||e,i=u[r];if(!i)throw new Error(r+" is not a valid compression method !");return i}(e.options.compression,a.compression),i=e.options.compressionOptions||a.compressionOptions||{},n=e.dir,s=e.date;e._compressWorker(r,i).withStreamInfo("file",{name:t,dir:n,date:s,comment:e.comment||"",unixPermissions:e.unixPermissions,dosPermissions:e.dosPermissions}).pipe(o)}),o.entriesCount=
h}catch(t$1){o.error(t$1)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(t,e,r){function i(){if(!(this instanceof i))return new i;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var t=new i;for(var e in this)"function"!=typeof this[e]&&(t[e]=this[e]);return t}}(i.prototype=t("./object")).loadAsync=t("./load"),
i.support=t("./support"),i.defaults=t("./defaults"),i.version="3.7.1",i.loadAsync=function(t,e){return(new i).loadAsync(t,e)},i.external=t("./external"),e.exports=i},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(t,e,r){var i=t("./utils"),n=t("./external"),o=t("./utf8"),h=t("./zipEntries"),s=t("./stream/Crc32Probe"),u=t("./nodejsUtils");function l(i){return new n.Promise(function(t,e){var r=i.decompressed.getContentWorker().pipe(new s);r.on("error",function(t){e(t)}).on("end",
function(){r.streamInfo.crc32!==i.decompressed.crc32?e(new Error("Corrupted zip : CRC32 mismatch")):t()}).resume()})}e.exports=function(t,s){var a=this;return s=i.extend(s||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:o.utf8decode}),u.isNode&&u.isStream(t)?n.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):i.prepareContent("the loaded zip file",t,!0,s.optimizedBinaryString,s.base64).then(function(t){var e=new h(s);return e.load(t),
e}).then(function(t){var e=[n.Promise.resolve(t)],r=t.files;if(s.checkCRC32)for(var i=0;i<r.length;i++)e.push(l(r[i]));return n.Promise.all(e)}).then(function(t){for(var e=t.shift(),r=e.files,i=0;i<r.length;i++){var n=r[i];a.file(n.fileNameStr,n.decompressed,{binary:!0,optimizedBinaryString:!0,date:n.date,dir:n.dir,comment:n.fileCommentStr.length?n.fileCommentStr:null,unixPermissions:n.unixPermissions,dosPermissions:n.dosPermissions,createFolders:s.createFolders})}return e.zipComment.length&&(a.comment=
e.zipComment),a})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(t,e,r){var i=t("../utils"),n=t("../stream/GenericWorker");function s(t,e){n.call(this,"Nodejs stream input adapter for "+t),this._upstreamEnded=!1,this._bindStream(e)}i.inherits(s,n),s.prototype._bindStream=function(t){var e=this;(this._stream=t).pause(),t.on("data",function(t){e.push({data:t,meta:{percent:0}})}).on("error",function(t){e.isPaused?this.generatedError=
t:e.error(t)}).on("end",function(){e.isPaused?e._upstreamEnded=!0:e.end()})},s.prototype.pause=function(){return!!n.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!n.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},e.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(t,e,r){var n=t("readable-stream").Readable;function i(t,e,r){n.call(this,e),this._helper=t;var i=this;t.on("data",function(t,e){i.push(t)||
i._helper.pause(),r&&r(e)}).on("error",function(t){i.emit("error",t)}).on("end",function(){i.push(null)})}t("../utils").inherits(i,n),i.prototype._read=function(){this._helper.resume()},e.exports=i},{"../utils":32,"readable-stream":16}],14:[function(t,e,r){e.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(t,e){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(t,e);if("number"==typeof t)throw new Error('The "data" argument must not be a number');return new Buffer(t,
e)},allocBuffer:function(t){if(Buffer.alloc)return Buffer.alloc(t);var e=new Buffer(t);return e.fill(0),e},isBuffer:function(t){return Buffer.isBuffer(t)},isStream:function(t){return t&&"function"==typeof t.on&&"function"==typeof t.pause&&"function"==typeof t.resume}}},{}],15:[function(t,e,r){function s(t,e,r){var i,n=u.getTypeOf(e),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,
8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(t=g(t)),s.createFolders&&(i=_(t))&&b.call(this,i,!0);var a="string"===n&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(e instanceof d&&0===e.uncompressedSize||s.dir||!e||0===e.length)&&(s.base64=!1,s.binary=!0,e="",s.compression="STORE",n="string");var o=null;o=e instanceof d||e instanceof l?e:p.isNode&&p.isStream(e)?new m(t,e):u.prepareContent(t,e,s.binary,s.optimizedBinaryString,
s.base64);var h=new c(t,o,s);this.files[t]=h}var n=t("./utf8"),u=t("./utils"),l=t("./stream/GenericWorker"),a=t("./stream/StreamHelper"),f=t("./defaults"),d=t("./compressedObject"),c=t("./zipObject"),o=t("./generate"),p=t("./nodejsUtils"),m=t("./nodejs/NodejsStreamInputAdapter"),_=function(t){"/"===t.slice(-1)&&(t=t.substring(0,t.length-1));var e=t.lastIndexOf("/");return 0<e?t.substring(0,e):""},g=function(t){return"/"!==t.slice(-1)&&(t+="/"),t},b=function(t,e){return e=void 0!==e?e:f.createFolders,
t=g(t),this.files[t]||s.call(this,t,null,{dir:!0,createFolders:e}),this.files[t]};function h(t){return"[object RegExp]"===Object.prototype.toString.call(t)}var i={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");},forEach:function(t){var e,r,i;for(e in this.files)i=this.files[e],(r=e.slice(this.root.length,e.length))&&e.slice(0,this.root.length)===this.root&&t(r,i)},filter:function(r){var i=[];return this.forEach(function(t,e){r(t,e)&&i.push(e)}),
i},file:function(t,e,r){if(1!==arguments.length)return t=this.root+t,s.call(this,t,e,r),this;if(h(t)){var i=t;return this.filter(function(t,e){return!e.dir&&i.test(t)})}var n=this.files[this.root+t];return n&&!n.dir?n:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(t,e){return e.dir&&r.test(t)});var t=this.root+r,e=b.call(this,t),i=this.clone();return i.root=e.name,i},remove:function(r){r=this.root+r;var t=this.files[r];if(t||("/"!==r.slice(-1)&&(r+="/"),t=this.files[r]),
t&&!t.dir)delete this.files[r];else for(var e=this.filter(function(t,e){return e.name.slice(0,r.length)===r}),i=0;i<e.length;i++)delete this.files[e[i].name];return this},generate:function(t){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");},generateInternalStream:function(t){var e,r={};try{if((r=u.extend(t||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:n.utf8encode})).type=
r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var i=r.comment||this.comment||"";e=o.generateWorker(this,r,i)}catch(t$2){(e=new l("error")).error(t$2)}return new a(e,r.type||"string",r.mimeType)},generateAsync:function(t,
e){return this.generateInternalStream(t).accumulate(e)},generateNodeStream:function(t,e){return(t=t||{}).type||(t.type="nodebuffer"),this.generateInternalStream(t).toNodejsStream(e)}};e.exports=i},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(t,e,r){e.exports=t("stream")},{stream:void 0}],17:[function(t,e,r){var i=t("./DataReader");
function n(t){i.call(this,t);for(var e=0;e<this.data.length;e++)t[e]=255&t[e]}t("../utils").inherits(n,i),n.prototype.byteAt=function(t){return this.data[this.zero+t]},n.prototype.lastIndexOfSignature=function(t){for(var e=t.charCodeAt(0),r=t.charCodeAt(1),i=t.charCodeAt(2),n=t.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===e&&this.data[s+1]===r&&this.data[s+2]===i&&this.data[s+3]===n)return s-this.zero;return-1},n.prototype.readAndCheckSignature=function(t){var e=t.charCodeAt(0),r=t.charCodeAt(1),
i=t.charCodeAt(2),n=t.charCodeAt(3),s=this.readData(4);return e===s[0]&&r===s[1]&&i===s[2]&&n===s[3]},n.prototype.readData=function(t){if(this.checkOffset(t),0===t)return[];var e=this.data.slice(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n},{"../utils":32,"./DataReader":18}],18:[function(t,e,r){var i=t("../utils");function n(t){this.data=t,this.length=t.length,this.index=0,this.zero=0}n.prototype={checkOffset:function(t){this.checkIndex(this.index+t)},checkIndex:function(t){if(this.length<
this.zero+t||t<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+t+"). Corrupted zip ?");},setIndex:function(t){this.checkIndex(t),this.index=t},skip:function(t){this.setIndex(this.index+t)},byteAt:function(t){},readInt:function(t){var e,r=0;for(this.checkOffset(t),e=this.index+t-1;e>=this.index;e--)r=(r<<8)+this.byteAt(e);return this.index+=t,r},readString:function(t){return i.transformTo("string",this.readData(t))},readData:function(t){},lastIndexOfSignature:function(t){},
readAndCheckSignature:function(t){},readDate:function(){var t=this.readInt(4);return new Date(Date.UTC(1980+(t>>25&127),(t>>21&15)-1,t>>16&31,t>>11&31,t>>5&63,(31&t)<<1))}},e.exports=n},{"../utils":32}],19:[function(t,e,r){var i=t("./Uint8ArrayReader");function n(t){i.call(this,t)}t("../utils").inherits(n,i),n.prototype.readData=function(t){this.checkOffset(t);var e=this.data.slice(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n},{"../utils":32,"./Uint8ArrayReader":21}],
20:[function(t,e,r){var i=t("./DataReader");function n(t){i.call(this,t)}t("../utils").inherits(n,i),n.prototype.byteAt=function(t){return this.data.charCodeAt(this.zero+t)},n.prototype.lastIndexOfSignature=function(t){return this.data.lastIndexOf(t)-this.zero},n.prototype.readAndCheckSignature=function(t){return t===this.readData(4)},n.prototype.readData=function(t){this.checkOffset(t);var e=this.data.slice(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n},{"../utils":32,
"./DataReader":18}],21:[function(t,e,r){var i=t("./ArrayReader");function n(t){i.call(this,t)}t("../utils").inherits(n,i),n.prototype.readData=function(t){if(this.checkOffset(t),0===t)return new Uint8Array(0);var e=this.data.subarray(this.zero+this.index,this.zero+this.index+t);return this.index+=t,e},e.exports=n},{"../utils":32,"./ArrayReader":17}],22:[function(t,e,r){var i=t("../utils"),n=t("../support"),s=t("./ArrayReader"),a=t("./StringReader"),o=t("./NodeBufferReader"),h=t("./Uint8ArrayReader");
e.exports=function(t){var e=i.getTypeOf(t);return i.checkSupport(e),"string"!==e||n.uint8array?"nodebuffer"===e?new o(t):n.uint8array?new h(i.transformTo("uint8array",t)):new s(i.transformTo("array",t)):new a(t)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(t,e,r){r.LOCAL_FILE_HEADER="PK\u0003\u0004",r.CENTRAL_FILE_HEADER="PK\u0001\u0002",r.CENTRAL_DIRECTORY_END="PK\u0005\u0006",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR=
"PK\u0006\u0007",r.ZIP64_CENTRAL_DIRECTORY_END="PK\u0006\u0006",r.DATA_DESCRIPTOR="PK\u0007\b"},{}],24:[function(t,e,r){var i=t("./GenericWorker"),n=t("../utils");function s(t){i.call(this,"ConvertWorker to "+t),this.destType=t}n.inherits(s,i),s.prototype.processChunk=function(t){this.push({data:n.transformTo(this.destType,t.data),meta:t.meta})},e.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(t,e,r){var i=t("./GenericWorker"),n=t("../crc32");function s(){i.call(this,"Crc32Probe"),
this.withStreamInfo("crc32",0)}t("../utils").inherits(s,i),s.prototype.processChunk=function(t){this.streamInfo.crc32=n(t.data,this.streamInfo.crc32||0),this.push(t)},e.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(t,e,r){var i=t("../utils"),n=t("./GenericWorker");function s(t){n.call(this,"DataLengthProbe for "+t),this.propName=t,this.withStreamInfo(t,0)}i.inherits(s,n),s.prototype.processChunk=function(t){if(t){var e=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=
e+t.data.length}n.prototype.processChunk.call(this,t)},e.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(t,e,r){var i=t("../utils"),n=t("./GenericWorker");function s(t){n.call(this,"DataWorker");var e=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,t.then(function(t){e.dataIsReady=!0,e.data=t,e.max=t&&t.length||0,e.type=i.getTypeOf(t),e.isPaused||e._tickAndRepeat()},function(t){e.error(t)})}i.inherits(s,n),s.prototype.cleanUp=function(){n.prototype.cleanUp.call(this),
this.data=null},s.prototype.resume=function(){return!!n.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,i.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(i.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var t=null,e=Math.min(this.max,this.index+16384);
if(this.index>=this.max)return this.end();switch(this.type){case "string":t=this.data.substring(this.index,e);break;case "uint8array":t=this.data.subarray(this.index,e);break;case "array":case "nodebuffer":t=this.data.slice(this.index,e)}return this.index=e,this.push({data:t,meta:{percent:this.max?this.index/this.max*100:0}})},e.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(t,e,r){function i(t){this.name=t||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo=
{},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}i.prototype={push:function(t){this.emit("data",t)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(t$3){this.emit("error",t$3)}return!0},error:function(t){return!this.isFinished&&(this.isPaused?this.generatedError=t:(this.isFinished=!0,this.emit("error",t),this.previous&&this.previous.error(t),this.cleanUp()),!0)},
on:function(t,e){return this._listeners[t].push(e),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(t,e){if(this._listeners[t])for(var r=0;r<this._listeners[t].length;r++)this._listeners[t][r].call(this,e)},pipe:function(t){return t.registerPrevious(this)},registerPrevious:function(t){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=t.streamInfo,this.mergeStreamInfo(),this.previous=
t;var e=this;return t.on("data",function(t){e.processChunk(t)}),t.on("end",function(){e.end()}),t.on("error",function(t){e.error(t)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var t=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),t=!0),this.previous&&this.previous.resume(),!t},flush:function(){},processChunk:function(t){this.push(t)},
withStreamInfo:function(t,e){return this.extraStreamInfo[t]=e,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var t in this.extraStreamInfo)this.extraStreamInfo.hasOwnProperty(t)&&(this.streamInfo[t]=this.extraStreamInfo[t])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var t="Worker "+this.name;return this.previous?this.previous+" -> "+t:t}},e.exports=i},{}],29:[function(t,
e,r){var h=t("../utils"),n=t("./ConvertWorker"),s=t("./GenericWorker"),u=t("../base64"),i=t("../support"),a=t("../external"),o=null;if(i.nodestream)try{o=t("../nodejs/NodejsStreamOutputAdapter")}catch(t$4){}function l(t,o){return new a.Promise(function(e,r){var i=[],n=t._internalType,s=t._outputType,a=t._mimeType;t.on("data",function(t,e){i.push(t),o&&o(e)}).on("error",function(t){i=[],r(t)}).on("end",function(){try{var t=function(t,e,r){switch(t){case "blob":return h.newBlob(h.transformTo("arraybuffer",
e),r);case "base64":return u.encode(e);default:return h.transformTo(t,e)}}(s,function(t,e){var r,i=0,n=null,s=0;for(r=0;r<e.length;r++)s+=e[r].length;switch(t){case "string":return e.join("");case "array":return Array.prototype.concat.apply([],e);case "uint8array":for(n=new Uint8Array(s),r=0;r<e.length;r++)n.set(e[r],i),i+=e[r].length;return n;case "nodebuffer":return Buffer.concat(e);default:throw new Error("concat : unsupported type '"+t+"'");}}(n,i),a);e(t)}catch(t$5){r(t$5)}i=[]}).resume()})}
function f(t,e,r){var i=e;switch(e){case "blob":case "arraybuffer":i="uint8array";break;case "base64":i="string"}try{this._internalType=i,this._outputType=e,this._mimeType=r,h.checkSupport(i),this._worker=t.pipe(new n(i)),t.lock()}catch(t$6){this._worker=new s("error"),this._worker.error(t$6)}}f.prototype={accumulate:function(t){return l(this,t)},on:function(t,e){var r=this;return"data"===t?this._worker.on(t,function(t){e.call(r,t.data,t.meta)}):this._worker.on(t,function(){h.delay(e,arguments,r)}),
this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(t){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},t)}},e.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],
30:[function(t,e,r){if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var i=new ArrayBuffer(0);try{r.blob=0===(new Blob([i],{type:"application/zip"})).size}catch(t$8){try{var n=new (self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);n.append(i),r.blob=0===n.getBlob("application/zip").size}catch(t$7){r.blob=
!1}}}try{r.nodestream=!!t("readable-stream").Readable}catch(t$9){r.nodestream=!1}},{"readable-stream":16}],31:[function(t,e,s){for(var o=t("./utils"),h=t("./support"),r=t("./nodejsUtils"),i=t("./stream/GenericWorker"),u=new Array(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;u[254]=u[254]=1;function a(){i.call(this,"utf-8 decode"),this.leftOver=null}function l(){i.call(this,"utf-8 encode")}s.utf8encode=function(t){return h.nodebuffer?r.newBufferFrom(t,"utf-8"):function(t){var e,
r,i,n,s,a=t.length,o=0;for(n=0;n<a;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),o+=r<128?1:r<2048?2:r<65536?3:4;for(e=h.uint8array?new Uint8Array(o):new Array(o),n=s=0;s<o;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),r<128?e[s++]=r:(r<2048?e[s++]=192|r>>>6:(r<65536?e[s++]=224|r>>>12:(e[s++]=240|r>>>18,e[s++]=128|r>>>12&63),e[s++]=128|r>>>6&63),
e[s++]=128|63&r);return e}(t)},s.utf8decode=function(t){return h.nodebuffer?o.transformTo("nodebuffer",t).toString("utf-8"):function(t){var e,r,i,n,s=t.length,a=new Array(2*s);for(e=r=0;e<s;)if((i=t[e++])<128)a[r++]=i;else if(4<(n=u[i]))a[r++]=65533,e+=n-1;else{for(i&=2===n?31:3===n?15:7;1<n&&e<s;)i=i<<6|63&t[e++],n--;1<n?a[r++]=65533:i<65536?a[r++]=i:(i-=65536,a[r++]=55296|i>>10&1023,a[r++]=56320|1023&i)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(t=o.transformTo(h.uint8array?
"uint8array":"array",t))},o.inherits(a,i),a.prototype.processChunk=function(t){var e=o.transformTo(h.uint8array?"uint8array":"array",t.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=e;(e=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),e.set(r,this.leftOver.length)}else e=this.leftOver.concat(e);this.leftOver=null}var i=function(t,e){var r;for((e=e||t.length)>t.length&&(e=t.length),r=e-1;0<=r&&128==(192&t[r]);)r--;return r<0?e:0===r?e:r+u[t[r]]>e?r:e}(e),n=
e;i!==e.length&&(h.uint8array?(n=e.subarray(0,i),this.leftOver=e.subarray(i,e.length)):(n=e.slice(0,i),this.leftOver=e.slice(i,e.length))),this.push({data:s.utf8decode(n),meta:t.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(l,i),l.prototype.processChunk=function(t){this.push({data:s.utf8encode(t.data),meta:t.meta})},s.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,
"./support":30,"./utils":32}],32:[function(t,e,a){var o=t("./support"),h=t("./base64"),r=t("./nodejsUtils"),i=t("set-immediate-shim"),u=t("./external");function n(t){return t}function l(t,e){for(var r=0;r<t.length;++r)e[r]=255&t.charCodeAt(r);return e}a.newBlob=function(e,r){a.checkSupport("blob");try{return new Blob([e],{type:r})}catch(t$11){try{var i=new (self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return i.append(e),i.getBlob(r)}catch(t$10){throw new Error("Bug : can't construct the Blob.");
}}};var s={stringifyByChunk:function(t,e,r){var i=[],n=0,s=t.length;if(s<=r)return String.fromCharCode.apply(null,t);for(;n<s;)"array"===e||"nodebuffer"===e?i.push(String.fromCharCode.apply(null,t.slice(n,Math.min(n+r,s)))):i.push(String.fromCharCode.apply(null,t.subarray(n,Math.min(n+r,s)))),n+=r;return i.join("")},stringifyByChar:function(t){for(var e="",r=0;r<t.length;r++)e+=String.fromCharCode(t[r]);return e},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,
new Uint8Array(1)).length}catch(t$12){return!1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(t$13){return!1}}()}};function f(t){var e=65536,r=a.getTypeOf(t),i=!0;if("uint8array"===r?i=s.applyCanBeUsed.uint8array:"nodebuffer"===r&&(i=s.applyCanBeUsed.nodebuffer),i)for(;1<e;)try{return s.stringifyByChunk(t,r,e)}catch(t$14){e=Math.floor(e/2)}return s.stringifyByChar(t)}function d(t,e){for(var r=0;r<t.length;r++)e[r]=t[r];return e}
a.applyFromCharCode=f;var c={};c.string={string:n,array:function(t){return l(t,new Array(t.length))},arraybuffer:function(t){return c.string.uint8array(t).buffer},uint8array:function(t){return l(t,new Uint8Array(t.length))},nodebuffer:function(t){return l(t,r.allocBuffer(t.length))}},c.array={string:f,array:n,arraybuffer:function(t){return(new Uint8Array(t)).buffer},uint8array:function(t){return new Uint8Array(t)},nodebuffer:function(t){return r.newBufferFrom(t)}},c.arraybuffer={string:function(t){return f(new Uint8Array(t))},
array:function(t){return d(new Uint8Array(t),new Array(t.byteLength))},arraybuffer:n,uint8array:function(t){return new Uint8Array(t)},nodebuffer:function(t){return r.newBufferFrom(new Uint8Array(t))}},c.uint8array={string:f,array:function(t){return d(t,new Array(t.length))},arraybuffer:function(t){return t.buffer},uint8array:n,nodebuffer:function(t){return r.newBufferFrom(t)}},c.nodebuffer={string:f,array:function(t){return d(t,new Array(t.length))},arraybuffer:function(t){return c.nodebuffer.uint8array(t).buffer},
uint8array:function(t){return d(t,new Uint8Array(t.length))},nodebuffer:n},a.transformTo=function(t,e){if(e=e||"",!t)return e;a.checkSupport(t);var r=a.getTypeOf(e);return c[r][t](e)},a.getTypeOf=function(t){return"string"==typeof t?"string":"[object Array]"===Object.prototype.toString.call(t)?"array":o.nodebuffer&&r.isBuffer(t)?"nodebuffer":o.uint8array&&t instanceof Uint8Array?"uint8array":o.arraybuffer&&t instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(t){if(!o[t.toLowerCase()])throw new Error(t+
" is not supported by this platform");},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(t){var e,r,i="";for(r=0;r<(t||"").length;r++)i+="\\x"+((e=t.charCodeAt(r))<16?"0":"")+e.toString(16).toUpperCase();return i},a.delay=function(t,e,r){i(function(){t.apply(r||null,e||[])})},a.inherits=function(t,e){function r(){}r.prototype=e.prototype,t.prototype=new r},a.extend=function(){var t,e,r={};for(t=0;t<arguments.length;t++)for(e in arguments[t])arguments[t].hasOwnProperty(e)&&void 0===
r[e]&&(r[e]=arguments[t][e]);return r},a.prepareContent=function(r,t,i,n,s){return u.Promise.resolve(t).then(function(i){return o.blob&&(i instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(i)))&&"undefined"!=typeof FileReader?new u.Promise(function(e,r){var t=new FileReader;t.onload=function(t){e(t.target.result)},t.onerror=function(t){r(t.target.error)},t.readAsArrayBuffer(i)}):i}).then(function(t){var e=a.getTypeOf(t);return e?("arraybuffer"===e?t=a.transformTo("uint8array",
t):"string"===e&&(s?t=h.decode(t):i&&!0!==n&&(t=function(t){return l(t,o.uint8array?new Uint8Array(t.length):new Array(t.length))}(t))),t):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,"set-immediate-shim":54}],33:[function(t,e,r){var i=t("./reader/readerFor"),n=t("./utils"),s=t("./signature"),a=t("./zipEntry"),o=(t("./utf8"),t("./support"));function h(t){this.files=
[],this.loadOptions=t}h.prototype={checkSignature:function(t){if(!this.reader.readAndCheckSignature(t)){this.reader.index-=4;var e=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+n.pretty(e)+", expected "+n.pretty(t)+")");}},isSignature:function(t,e){var r=this.reader.index;this.reader.setIndex(t);var i=this.reader.readString(4)===e;return this.reader.setIndex(r),i},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=
this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var t=this.reader.readData(this.zipCommentLength),e=o.uint8array?"uint8array":"array",r=n.transformTo(e,t);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),
this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var t,e,r,i=this.zip64EndOfCentralSize-44;0<i;)t=this.reader.readInt(2),e=this.reader.readInt(4),r=this.reader.readData(e),this.zip64ExtensibleData[t]={id:t,length:e,value:r}},
readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported");},readLocalFiles:function(){var t,e;for(t=0;t<this.files.length;t++)e=this.files[t],this.reader.setIndex(e.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),e.readLocalPart(this.reader),e.handleUTF8(),e.processAttributes()},
readCentralDir:function(){var t;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(t=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(t);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length);},readEndOfCentral:function(){var t=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);
if(t<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(t);var e=t;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===n.MAX_VALUE_16BITS||this.diskWithCentralDirStart===n.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===n.MAX_VALUE_16BITS||
this.centralDirRecords===n.MAX_VALUE_16BITS||this.centralDirSize===n.MAX_VALUE_32BITS||this.centralDirOffset===n.MAX_VALUE_32BITS){if(this.zip64=!0,(t=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(t),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&
(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var i=e-r;if(0<i)this.isSignature(e,
s.CENTRAL_FILE_HEADER)||(this.reader.zero=i);else if(i<0)throw new Error("Corrupted zip: missing "+Math.abs(i)+" bytes.");},prepareReader:function(t){this.reader=i(t)},load:function(t){this.prepareReader(t),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},e.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utf8":31,"./utils":32,"./zipEntry":34}],34:[function(t,e,r){var i=t("./reader/readerFor"),s=t("./utils"),n=t("./compressedObject"),a=t("./crc32"),o=t("./utf8"),
h=t("./compressions"),u=t("./support");function l(t,e){this.options=t,this.loadOptions=e}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(t){var e,r;if(t.skip(22),this.fileNameLength=t.readInt(2),r=t.readInt(2),this.fileName=t.readData(this.fileNameLength),t.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
if(null===(e=function(t){for(var e in h)if(h.hasOwnProperty(e)&&h[e].magic===t)return h[e];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new n(this.compressedSize,this.uncompressedSize,this.crc32,e,t.readData(this.compressedSize))},readCentralPart:function(t){this.versionMadeBy=t.readInt(2),t.skip(2),this.bitFlag=t.readInt(2),this.compressionMethod=
t.readString(2),this.date=t.readDate(),this.crc32=t.readInt(4),this.compressedSize=t.readInt(4),this.uncompressedSize=t.readInt(4);var e=t.readInt(2);if(this.extraFieldsLength=t.readInt(2),this.fileCommentLength=t.readInt(2),this.diskNumberStart=t.readInt(2),this.internalFileAttributes=t.readInt(2),this.externalFileAttributes=t.readInt(4),this.localHeaderOffset=t.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");t.skip(e),this.readExtraFields(t),this.parseZIP64ExtraField(t),
this.fileComment=t.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var t=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==t&&(this.dosPermissions=63&this.externalFileAttributes),3==t&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(t){if(this.extraFields[1]){var e=i(this.extraFields[1].value);this.uncompressedSize===
s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(t){var e,r,i,n=t.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});t.index+4<n;)e=t.readInt(2),r=t.readInt(2),i=t.readData(r),this.extraFields[e]={id:e,length:r,
value:i};t.setIndex(n)},handleUTF8:function(){var t=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var e=this.findExtraFieldUnicodePath();if(null!==e)this.fileNameStr=e;else{var r=s.transformTo(t,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var i=this.findExtraFieldUnicodeComment();if(null!==i)this.fileCommentStr=i;else{var n=s.transformTo(t,this.fileComment);this.fileCommentStr=
this.loadOptions.decodeFileName(n)}}},findExtraFieldUnicodePath:function(){var t=this.extraFields[28789];if(t){var e=i(t.value);return 1!==e.readInt(1)?null:a(this.fileName)!==e.readInt(4)?null:o.utf8decode(e.readData(t.length-5))}return null},findExtraFieldUnicodeComment:function(){var t=this.extraFields[25461];if(t){var e=i(t.value);return 1!==e.readInt(1)?null:a(this.fileComment)!==e.readInt(4)?null:o.utf8decode(e.readData(t.length-5))}return null}},e.exports=l},{"./compressedObject":2,"./compressions":3,
"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(t,e,r){function i(t,e,r){this.name=t,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=e,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=t("./stream/StreamHelper"),n=t("./stream/DataWorker"),a=t("./utf8"),o=t("./compressedObject"),h=t("./stream/GenericWorker");
i.prototype={internalStream:function(t){var e=null,r="string";try{if(!t)throw new Error("No output type specified.");var i="string"===(r=t.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),e=this._decompressWorker();var n=!this._dataBinary;n&&!i&&(e=e.pipe(new a.Utf8EncodeWorker)),!n&&i&&(e=e.pipe(new a.Utf8DecodeWorker))}catch(t$15){(e=new h("error")).error(t$15)}return new s(e,r,"")},async:function(t,e){return this.internalStream(t).accumulate(e)},nodeStream:function(t,e){return this.internalStream(t||
"nodebuffer").toNodejsStream(e)},_compressWorker:function(t,e){if(this._data instanceof o&&this._data.compression.magic===t.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,t,e)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new n(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],
l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");},f=0;f<u.length;f++)i.prototype[u[f]]=l;e.exports=i},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(t,l,e){(function(e){var r,i,t=e.MutationObserver||e.WebKitMutationObserver;if(t){var n=0,s=new t(u),a=e.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=n=++n%2}}else if(e.setImmediate||
void 0===e.MessageChannel)r="document"in e&&"onreadystatechange"in e.document.createElement("script")?function(){var t=e.document.createElement("script");t.onreadystatechange=function(){u(),t.onreadystatechange=null,t.parentNode.removeChild(t),t=null},e.document.documentElement.appendChild(t)}:function(){setTimeout(u,0)};else{var o=new e.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0)}}var h=[];function u(){var t,e;i=!0;for(var r=h.length;r;){for(e=h,h=[],t=-1;++t<r;)e[t]();
r=h.length}i=!1}l.exports=function(t){1!==h.push(t)||i||r()}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(t,e,r){var n=t("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],i=["PENDING"];function o(t){if("function"!=typeof t)throw new TypeError("resolver must be a function");this.state=i,this.queue=[],this.outcome=void 0,t!==u&&c(this,t)}function h(t,e,r){this.promise=t,"function"==typeof e&&(this.onFulfilled=
e,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(e,r,i){n(function(){var t;try{t=r(i)}catch(t$16){return l.reject(e,t$16)}t===e?l.reject(e,new TypeError("Cannot resolve promise with itself")):l.resolve(e,t)})}function d(t){var e=t&&t.then;if(t&&("object"==typeof t||"function"==typeof t)&&"function"==typeof e)return function(){e.apply(t,arguments)}}function c(e,t){var r=!1;function i(t){r||(r=!0,l.reject(e,t))}
function n(t){r||(r=!0,l.resolve(e,t))}var s=p(function(){t(n,i)});"error"===s.status&&i(s.value)}function p(t,e){var r={};try{r.value=t(e),r.status="success"}catch(t$17){r.status="error",r.value=t$17}return r}(e.exports=o).prototype["finally"]=function(e){if("function"!=typeof e)return this;var r=this.constructor;return this.then(function(t){return r.resolve(e()).then(function(){return t})},function(t){return r.resolve(e()).then(function(){throw t;})})},o.prototype["catch"]=function(t){return this.then(null,
t)},o.prototype.then=function(t,e){if("function"!=typeof t&&this.state===a||"function"!=typeof e&&this.state===s)return this;var r=new this.constructor(u);this.state!==i?f(r,this.state===a?t:e,this.outcome):this.queue.push(new h(r,t,e));return r},h.prototype.callFulfilled=function(t){l.resolve(this.promise,t)},h.prototype.otherCallFulfilled=function(t){f(this.promise,this.onFulfilled,t)},h.prototype.callRejected=function(t){l.reject(this.promise,t)},h.prototype.otherCallRejected=function(t){f(this.promise,
this.onRejected,t)},l.resolve=function(t,e){var r=p(d,e);if("error"===r.status)return l.reject(t,r.value);var i=r.value;if(i)c(t,i);else{t.state=a,t.outcome=e;for(var n=-1,s=t.queue.length;++n<s;)t.queue[n].callFulfilled(e)}return t},l.reject=function(t,e){t.state=s,t.outcome=e;for(var r=-1,i=t.queue.length;++r<i;)t.queue[r].callRejected(e);return t},o.resolve=function(t){if(t instanceof this)return t;return l.resolve(new this(u),t)},o.reject=function(t){var e=new this(u);return l.reject(e,t)},o.all=
function(t){var r=this;if("[object Array]"!==Object.prototype.toString.call(t))return this.reject(new TypeError("must be an array"));var i=t.length,n=!1;if(!i)return this.resolve([]);var s=new Array(i),a=0,e=-1,o=new this(u);for(;++e<i;)h(t[e],e);return o;function h(t,e){r.resolve(t).then(function(t){s[e]=t,++a!==i||n||(n=!0,l.resolve(o,s))},function(t){n||(n=!0,l.reject(o,t))})}},o.race=function(t){var e=this;if("[object Array]"!==Object.prototype.toString.call(t))return this.reject(new TypeError("must be an array"));
var r=t.length,i=!1;if(!r)return this.resolve([]);var n=-1,s=new this(u);for(;++n<r;)a=t[n],e.resolve(a).then(function(t){i||(i=!0,l.resolve(s,t))},function(t){i||(i=!0,l.reject(s,t))});var a;return s}},{immediate:36}],38:[function(t,e,r){var i={};(0,t("./lib/utils/common").assign)(i,t("./lib/deflate"),t("./lib/inflate"),t("./lib/zlib/constants")),e.exports=i},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(t,e,r){var a=t("./zlib/deflate"),o=
t("./utils/common"),h=t("./utils/strings"),n=t("./zlib/messages"),s=t("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,d=0,c=8;function p(t){if(!(this instanceof p))return new p(t);this.options=o.assign({level:f,method:c,chunkSize:16384,windowBits:15,memLevel:8,strategy:d,to:""},t||{});var e=this.options;e.raw&&0<e.windowBits?e.windowBits=-e.windowBits:e.gzip&&0<e.windowBits&&e.windowBits<16&&(e.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=
0;var r=a.deflateInit2(this.strm,e.level,e.method,e.windowBits,e.memLevel,e.strategy);if(r!==l)throw new Error(n[r]);if(e.header&&a.deflateSetHeader(this.strm,e.header),e.dictionary){var i;if(i="string"==typeof e.dictionary?h.string2buf(e.dictionary):"[object ArrayBuffer]"===u.call(e.dictionary)?new Uint8Array(e.dictionary):e.dictionary,(r=a.deflateSetDictionary(this.strm,i))!==l)throw new Error(n[r]);this._dict_set=!0}}function i(t,e){var r=new p(e);if(r.push(t,!0),r.err)throw r.msg||n[r.err];return r.result}
p.prototype.push=function(t,e){var r,i,n=this.strm,s=this.options.chunkSize;if(this.ended)return!1;i=e===~~e?e:!0===e?4:0,"string"==typeof t?n.input=h.string2buf(t):"[object ArrayBuffer]"===u.call(t)?n.input=new Uint8Array(t):n.input=t,n.next_in=0,n.avail_in=n.input.length;do{if(0===n.avail_out&&(n.output=new o.Buf8(s),n.next_out=0,n.avail_out=s),1!==(r=a.deflate(n,i))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==n.avail_out&&(0!==n.avail_in||4!==i&&2!==i)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(n.output,
n.next_out))):this.onData(o.shrinkBuf(n.output,n.next_out)))}while((0<n.avail_in||0===n.avail_out)&&1!==r);return 4===i?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==i||(this.onEnd(l),!(n.avail_out=0))},p.prototype.onData=function(t){this.chunks.push(t)},p.prototype.onEnd=function(t){t===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg},r.Deflate=p,r.deflate=i,r.deflateRaw=
function(t,e){return(e=e||{}).raw=!0,i(t,e)},r.gzip=function(t,e){return(e=e||{}).gzip=!0,i(t,e)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(t,e,r){var d=t("./zlib/inflate"),c=t("./utils/common"),p=t("./utils/strings"),m=t("./zlib/constants"),i=t("./zlib/messages"),n=t("./zlib/zstream"),s=t("./zlib/gzheader"),_=Object.prototype.toString;function a(t){if(!(this instanceof a))return new a(t);this.options=c.assign({chunkSize:16384,
windowBits:0,to:""},t||{});var e=this.options;e.raw&&0<=e.windowBits&&e.windowBits<16&&(e.windowBits=-e.windowBits,0===e.windowBits&&(e.windowBits=-15)),!(0<=e.windowBits&&e.windowBits<16)||t&&t.windowBits||(e.windowBits+=32),15<e.windowBits&&e.windowBits<48&&0==(15&e.windowBits)&&(e.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new n,this.strm.avail_out=0;var r=d.inflateInit2(this.strm,e.windowBits);if(r!==m.Z_OK)throw new Error(i[r]);this.header=new s,d.inflateGetHeader(this.strm,
this.header)}function o(t,e){var r=new a(e);if(r.push(t,!0),r.err)throw r.msg||i[r.err];return r.result}a.prototype.push=function(t,e){var r,i,n,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return!1;i=e===~~e?e:!0===e?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof t?h.input=p.binstring2buf(t):"[object ArrayBuffer]"===_.call(t)?h.input=new Uint8Array(t):h.input=t,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new c.Buf8(u),h.next_out=0,h.avail_out=
u),(r=d.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=d.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||i!==m.Z_FINISH&&i!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(n=p.utf8border(h.output,h.next_out),s=h.next_out-n,a=p.buf2string(h.output,
n),h.next_out=s,h.avail_out=u-s,s&&c.arraySet(h.output,h.output,n,s,0),this.onData(a)):this.onData(c.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0)}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(i=m.Z_FINISH),i===m.Z_FINISH?(r=d.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):i!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(t){this.chunks.push(t)},a.prototype.onEnd=function(t){t===
m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=c.flattenChunks(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(t,e){return(e=e||{}).raw=!0,o(t,e)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(t,e,r){var i="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=
typeof Int32Array;r.assign=function(t){for(var e=Array.prototype.slice.call(arguments,1);e.length;){var r=e.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var i in r)r.hasOwnProperty(i)&&(t[i]=r[i])}}return t},r.shrinkBuf=function(t,e){return t.length===e?t:t.subarray?t.subarray(0,e):(t.length=e,t)};var n={arraySet:function(t,e,r,i,n){if(e.subarray&&t.subarray)t.set(e.subarray(r,r+i),n);else for(var s=0;s<i;s++)t[n+s]=e[r+s]},flattenChunks:function(t){var e,r,
i,n,s,a;for(e=i=0,r=t.length;e<r;e++)i+=t[e].length;for(a=new Uint8Array(i),e=n=0,r=t.length;e<r;e++)s=t[e],a.set(s,n),n+=s.length;return a}},s={arraySet:function(t,e,r,i,n){for(var s=0;s<i;s++)t[n+s]=e[r+s]},flattenChunks:function(t){return[].concat.apply([],t)}};r.setTyped=function(t){t?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,n)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(i)},{}],42:[function(t,e,r){var h=t("./common"),n=!0,s=!0;try{String.fromCharCode.apply(null,
[0])}catch(t$18){n=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(t$19){s=!1}for(var u=new h.Buf8(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;function l(t,e){if(e<65537&&(t.subarray&&s||!t.subarray&&n))return String.fromCharCode.apply(null,h.shrinkBuf(t,e));for(var r="",i=0;i<e;i++)r+=String.fromCharCode(t[i]);return r}u[254]=u[254]=1,r.string2buf=function(t){var e,r,i,n,s,a=t.length,o=0;for(n=0;n<a;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&
(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),o+=r<128?1:r<2048?2:r<65536?3:4;for(e=new h.Buf8(o),n=s=0;s<o;n++)55296==(64512&(r=t.charCodeAt(n)))&&n+1<a&&56320==(64512&(i=t.charCodeAt(n+1)))&&(r=65536+(r-55296<<10)+(i-56320),n++),r<128?e[s++]=r:(r<2048?e[s++]=192|r>>>6:(r<65536?e[s++]=224|r>>>12:(e[s++]=240|r>>>18,e[s++]=128|r>>>12&63),e[s++]=128|r>>>6&63),e[s++]=128|63&r);return e},r.buf2binstring=function(t){return l(t,t.length)},r.binstring2buf=function(t){for(var e=new h.Buf8(t.length),
r=0,i=e.length;r<i;r++)e[r]=t.charCodeAt(r);return e},r.buf2string=function(t,e){var r,i,n,s,a=e||t.length,o=new Array(2*a);for(r=i=0;r<a;)if((n=t[r++])<128)o[i++]=n;else if(4<(s=u[n]))o[i++]=65533,r+=s-1;else{for(n&=2===s?31:3===s?15:7;1<s&&r<a;)n=n<<6|63&t[r++],s--;1<s?o[i++]=65533:n<65536?o[i++]=n:(n-=65536,o[i++]=55296|n>>10&1023,o[i++]=56320|1023&n)}return l(o,i)},r.utf8border=function(t,e){var r;for((e=e||t.length)>t.length&&(e=t.length),r=e-1;0<=r&&128==(192&t[r]);)r--;return r<0?e:0===r?e:
r+u[t[r]]>e?r:e}},{"./common":41}],43:[function(t,e,r){e.exports=function(t,e,r,i){for(var n=65535&t|0,s=t>>>16&65535|0,a=0;0!==r;){for(r-=a=2E3<r?2E3:r;s=s+(n=n+e[i++]|0)|0,--a;);n%=65521,s%=65521}return n|s<<16|0}},{}],44:[function(t,e,r){e.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,
Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(t,e,r){var o=function(){for(var t,e=[],r=0;r<256;r++){t=r;for(var i=0;i<8;i++)t=1&t?3988292384^t>>>1:t>>>1;e[r]=t}return e}();e.exports=function(t,e,r,i){var n=o,s=i+r;t^=-1;for(var a=i;a<s;a++)t=t>>>8^n[255&(t^e[a])];return-1^t}},{}],46:[function(t,e,r){var h,d=t("../utils/common"),u=t("./trees"),c=t("./adler32"),p=t("./crc32"),i=t("./messages"),l=0,f=4,m=0,_=-2,g=
-1,b=4,n=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(t,e){return t.msg=i[e],e}function T(t){return(t<<1)-(4<t?9:0)}function D(t){for(var e=t.length;0<=--e;)t[e]=0}function F(t){var e=t.state,r=e.pending;r>t.avail_out&&(r=t.avail_out),0!==r&&(d.arraySet(t.output,e.pending_buf,e.pending_out,r,t.next_out),t.next_out+=r,e.pending_out+=r,t.total_out+=r,t.avail_out-=r,e.pending-=r,0===e.pending&&(e.pending_out=0))}function N(t,e){u._tr_flush_block(t,0<=
t.block_start?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,F(t.strm)}function U(t,e){t.pending_buf[t.pending++]=e}function P(t,e){t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e}function L(t,e){var r,i,n=t.max_chain_length,s=t.strstart,a=t.prev_length,o=t.nice_match,h=t.strstart>t.w_size-z?t.strstart-(t.w_size-z):0,u=t.window,l=t.w_mask,f=t.prev,d=t.strstart+S,c=u[s+a-1],p=u[s+a];t.prev_length>=t.good_match&&(n>>=2),o>t.lookahead&&(o=t.lookahead);do if(u[(r=
e)+a]===p&&u[r+a-1]===c&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do;while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<d);if(i=S-(d-s),s=d-S,a<i){if(t.match_start=e,o<=(a=i))break;c=u[s+a-1],p=u[s+a]}}while((e=f[e&l])>h&&0!=--n);return a<=t.lookahead?a:t.lookahead}function j(t){var e,r,i,n,s,a,o,h,u,l,f=t.w_size;do{if(n=t.window_size-t.lookahead-t.strstart,t.strstart>=f+(f-z)){for(d.arraySet(t.window,t.window,
f,f,0),t.match_start-=f,t.strstart-=f,t.block_start-=f,e=r=t.hash_size;i=t.head[--e],t.head[e]=f<=i?i-f:0,--r;);for(e=r=f;i=t.prev[--e],t.prev[e]=f<=i?i-f:0,--r;);n+=f}if(0===t.strm.avail_in)break;if(a=t.strm,o=t.window,h=t.strstart+t.lookahead,u=n,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,d.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=c(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),t.lookahead+=r,t.lookahead+t.insert>=x)for(s=
t.strstart-t.insert,t.ins_h=t.window[s],t.ins_h=(t.ins_h<<t.hash_shift^t.window[s+1])&t.hash_mask;t.insert&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[s+x-1])&t.hash_mask,t.prev[s&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=s,s++,t.insert--,!(t.lookahead+t.insert<x)););}while(t.lookahead<z&&0!==t.strm.avail_in)}function Z(t,e){for(var r,i;;){if(t.lookahead<z){if(j(t),t.lookahead<z&&e===l)return A;if(0===t.lookahead)break}if(r=0,t.lookahead>=x&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&
t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==r&&t.strstart-r<=t.w_size-z&&(t.match_length=L(t,r)),t.match_length>=x)if(i=u._tr_tally(t,t.strstart-t.match_start,t.match_length-x),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=x){for(t.match_length--;t.strstart++,t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart,0!=--t.match_length;);t.strstart++}else t.strstart+=
t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+1])&t.hash_mask;else i=u._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(i&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=t.strstart<x-1?t.strstart:x-1,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}function W(t,e){for(var r,i,n;;){if(t.lookahead<z){if(j(t),t.lookahead<z&&e===l)return A;if(0===t.lookahead)break}if(r=0,
t.lookahead>=x&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=x-1,0!==r&&t.prev_length<t.max_lazy_match&&t.strstart-r<=t.w_size-z&&(t.match_length=L(t,r),t.match_length<=5&&(1===t.strategy||t.match_length===x&&4096<t.strstart-t.match_start)&&(t.match_length=x-1)),t.prev_length>=x&&t.match_length<=t.prev_length){for(n=t.strstart+t.lookahead-
x,i=u._tr_tally(t,t.strstart-1-t.prev_match,t.prev_length-x),t.lookahead-=t.prev_length-1,t.prev_length-=2;++t.strstart<=n&&(t.ins_h=(t.ins_h<<t.hash_shift^t.window[t.strstart+x-1])&t.hash_mask,r=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!=--t.prev_length;);if(t.match_available=0,t.match_length=x-1,t.strstart++,i&&(N(t,!1),0===t.strm.avail_out))return A}else if(t.match_available){if((i=u._tr_tally(t,0,t.window[t.strstart-1]))&&N(t,!1),t.strstart++,t.lookahead--,0===
t.strm.avail_out)return A}else t.match_available=1,t.strstart++,t.lookahead--}return t.match_available&&(i=u._tr_tally(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<x-1?t.strstart:x-1,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}function M(t,e,r,i,n){this.good_length=t,this.max_lazy=e,this.nice_length=r,this.max_chain=i,this.func=n}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=
0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=
0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new d.Buf16(2*w),this.dyn_dtree=new d.Buf16(2*(2*a+1)),this.bl_tree=new d.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new d.Buf16(k+1),this.heap=new d.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new d.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=
0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function G(t){var e;return t&&t.state?(t.total_in=t.total_out=0,t.data_type=n,(e=t.state).pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=e.wrap?C:E,t.adler=2===e.wrap?0:1,e.last_flush=l,u._tr_init(e),m):R(t,_)}function K(t){var e=G(t);return e===m&&function(t){t.window_size=2*t.w_size,D(t.head),t.max_lazy_match=h[t.level].max_lazy,t.good_match=h[t.level].good_length,t.nice_match=h[t.level].nice_length,t.max_chain_length=h[t.level].max_chain,
t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=x-1,t.match_available=0,t.ins_h=0}(t.state),e}function Y(t,e,r,i,n,s){if(!t)return _;var a=1;if(e===g&&(e=6),i<0?(a=0,i=-i):15<i&&(a=2,i-=16),n<1||y<n||r!==v||i<8||15<i||e<0||9<e||s<0||b<s)return R(t,_);8===i&&(i=9);var o=new H;return(t.state=o).strm=t,o.wrap=a,o.gzhead=null,o.w_bits=i,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=n+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+
x-1)/x),o.window=new d.Buf8(2*o.w_size),o.head=new d.Buf16(o.hash_size),o.prev=new d.Buf16(o.w_size),o.lit_bufsize=1<<n+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new d.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=e,o.strategy=s,o.method=r,K(t)}h=[new M(0,0,0,0,function(t,e){var r=65535;for(r>t.pending_buf_size-5&&(r=t.pending_buf_size-5);;){if(t.lookahead<=1){if(j(t),0===t.lookahead&&e===l)return A;if(0===t.lookahead)break}t.strstart+=t.lookahead,t.lookahead=
0;var i=t.block_start+r;if((0===t.strstart||t.strstart>=i)&&(t.lookahead=t.strstart-i,t.strstart=i,N(t,!1),0===t.strm.avail_out))return A;if(t.strstart-t.block_start>=t.w_size-z&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=0,e===f?(N(t,!0),0===t.strm.avail_out?O:B):(t.strstart>t.block_start&&(N(t,!1),t.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,
258,258,4096,W)],r.deflateInit=function(t,e){return Y(t,e,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(t,e){return t&&t.state?2!==t.state.wrap?_:(t.state.gzhead=e,m):_},r.deflate=function(t,e){var r,i,n,s;if(!t||!t.state||5<e||e<0)return t?R(t,_):_;if(i=t.state,!t.output||!t.input&&0!==t.avail_in||666===i.status&&e!==f)return R(t,0===t.avail_out?-5:_);if(i.strm=t,r=i.last_flush,i.last_flush=e,i.status===C)if(2===i.wrap)t.adler=0,U(i,31),U(i,139),U(i,
8),i.gzhead?(U(i,(i.gzhead.text?1:0)+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),U(i,255&i.gzhead.time),U(i,i.gzhead.time>>8&255),U(i,i.gzhead.time>>16&255),U(i,i.gzhead.time>>24&255),U(i,9===i.level?2:2<=i.strategy||i.level<2?4:0),U(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(U(i,255&i.gzhead.extra.length),U(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(t.adler=p(t.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=69):(U(i,0),U(i,0),
U(i,0),U(i,0),U(i,0),U(i,9===i.level?2:2<=i.strategy||i.level<2?4:0),U(i,3),i.status=E);else{var a=v+(i.w_bits-8<<4)<<8;a|=(2<=i.strategy||i.level<2?0:i.level<6?1:6===i.level?2:3)<<6,0!==i.strstart&&(a|=32),a+=31-a%31,i.status=E,P(i,a),0!==i.strstart&&(P(i,t.adler>>>16),P(i,65535&t.adler)),t.adler=1}if(69===i.status)if(i.gzhead.extra){for(n=i.pending;i.gzindex<(65535&i.gzhead.extra.length)&&(i.pending!==i.pending_buf_size||(i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,
n)),F(t),n=i.pending,i.pending!==i.pending_buf_size));)U(i,255&i.gzhead.extra[i.gzindex]),i.gzindex++;i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),i.gzindex===i.gzhead.extra.length&&(i.gzindex=0,i.status=73)}else i.status=73;if(73===i.status)if(i.gzhead.name){n=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),F(t),n=i.pending,i.pending===i.pending_buf_size)){s=1;break}s=i.gzindex<i.gzhead.name.length?
255&i.gzhead.name.charCodeAt(i.gzindex++):0,U(i,s)}while(0!==s);i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),0===s&&(i.gzindex=0,i.status=91)}else i.status=91;if(91===i.status)if(i.gzhead.comment){n=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),F(t),n=i.pending,i.pending===i.pending_buf_size)){s=1;break}s=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,U(i,
s)}while(0!==s);i.gzhead.hcrc&&i.pending>n&&(t.adler=p(t.adler,i.pending_buf,i.pending-n,n)),0===s&&(i.status=103)}else i.status=103;if(103===i.status&&(i.gzhead.hcrc?(i.pending+2>i.pending_buf_size&&F(t),i.pending+2<=i.pending_buf_size&&(U(i,255&t.adler),U(i,t.adler>>8&255),t.adler=0,i.status=E)):i.status=E),0!==i.pending){if(F(t),0===t.avail_out)return i.last_flush=-1,m}else if(0===t.avail_in&&T(e)<=T(r)&&e!==f)return R(t,-5);if(666===i.status&&0!==t.avail_in)return R(t,-5);if(0!==t.avail_in||0!==
i.lookahead||e!==l&&666!==i.status){var o=2===i.strategy?function(t,e){for(var r;;){if(0===t.lookahead&&(j(t),0===t.lookahead)){if(e===l)return A;break}if(t.match_length=0,r=u._tr_tally(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,r&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=0,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}(i,e):3===i.strategy?function(t,e){for(var r,i,n,s,a=t.window;;){if(t.lookahead<=S){if(j(t),t.lookahead<=S&&e===l)return A;
if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=x&&0<t.strstart&&(i=a[n=t.strstart-1])===a[++n]&&i===a[++n]&&i===a[++n]){s=t.strstart+S;do;while(i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&i===a[++n]&&n<s);t.match_length=S-(s-n),t.match_length>t.lookahead&&(t.match_length=t.lookahead)}if(t.match_length>=x?(r=u._tr_tally(t,1,t.match_length-x),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(r=u._tr_tally(t,0,t.window[t.strstart]),
t.lookahead--,t.strstart++),r&&(N(t,!1),0===t.strm.avail_out))return A}return t.insert=0,e===f?(N(t,!0),0===t.strm.avail_out?O:B):t.last_lit&&(N(t,!1),0===t.strm.avail_out)?A:I}(i,e):h[i.level].func(i,e);if(o!==O&&o!==B||(i.status=666),o===A||o===O)return 0===t.avail_out&&(i.last_flush=-1),m;if(o===I&&(1===e?u._tr_align(i):5!==e&&(u._tr_stored_block(i,0,0,!1),3===e&&(D(i.head),0===i.lookahead&&(i.strstart=0,i.block_start=0,i.insert=0))),F(t),0===t.avail_out))return i.last_flush=-1,m}return e!==f?
m:i.wrap<=0?1:(2===i.wrap?(U(i,255&t.adler),U(i,t.adler>>8&255),U(i,t.adler>>16&255),U(i,t.adler>>24&255),U(i,255&t.total_in),U(i,t.total_in>>8&255),U(i,t.total_in>>16&255),U(i,t.total_in>>24&255)):(P(i,t.adler>>>16),P(i,65535&t.adler)),F(t),0<i.wrap&&(i.wrap=-i.wrap),0!==i.pending?m:1)},r.deflateEnd=function(t){var e;return t&&t.state?(e=t.state.status)!==C&&69!==e&&73!==e&&91!==e&&103!==e&&e!==E&&666!==e?R(t,_):(t.state=null,e===E?R(t,-3):m):_},r.deflateSetDictionary=function(t,e){var r,i,n,s,a,
o,h,u,l=e.length;if(!t||!t.state)return _;if(2===(s=(r=t.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(t.adler=c(t.adler,e,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new d.Buf8(r.w_size),d.arraySet(u,e,l-r.w_size,r.w_size,0),e=u,l=r.w_size),a=t.avail_in,o=t.next_in,h=t.input,t.avail_in=l,t.next_in=0,t.input=e,j(r);r.lookahead>=x;){for(i=r.strstart,n=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[i+x-1])&r.hash_mask,r.prev[i&
r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=i,i++,--n;);r.strstart=i,r.lookahead=x-1,j(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,t.next_in=o,t.input=h,t.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(t,e,r){e.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,
this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(t,e,r){e.exports=function(t,e){var r,i,n,s,a,o,h,u,l,f,d,c,p,m,_,g,b,v,y,w,k,x,S,z,C;r=t.state,i=t.next_in,z=t.input,n=i+(t.avail_in-5),s=t.next_out,C=t.output,a=s-(e-t.avail_out),o=s+(t.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,d=r.window,c=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;t:do{p<15&&(c+=z[i++]<<p,p+=8,c+=z[i++]<<p,p+=8),v=m[c&g];e:for(;;){if(c>>>=
y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else{if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(c&(1<<y)-1)];continue e}if(32&y){r.mode=12;break t}t.msg="invalid literal/length code",r.mode=30;break t}w=65535&v,(y&=15)&&(p<y&&(c+=z[i++]<<p,p+=8),w+=c&(1<<y)-1,c>>>=y,p-=y),p<15&&(c+=z[i++]<<p,p+=8,c+=z[i++]<<p,p+=8),v=_[c&b];r:for(;;){if(c>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(c&(1<<y)-1)];continue r}t.msg="invalid distance code",r.mode=30;break t}if(k=65535&v,p<(y&=15)&&
(c+=z[i++]<<p,(p+=8)<y&&(c+=z[i++]<<p,p+=8)),h<(k+=c&(1<<y)-1)){t.msg="invalid distance too far back",r.mode=30;break t}if(c>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){t.msg="invalid distance too far back",r.mode=30;break t}if(S=d,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=d[x++],--y;);x=s-k,S=C}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=d[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=d[x++],--y;);x=s-k,S=C}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=d[x++],--y;);x=s-k,S=C}for(;2<w;)C[s++]=S[x++],C[s++]=
S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]))}else{for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]))}break}}break}}while(i<n&&s<o);i-=w=p>>3,c&=(1<<(p-=w<<3))-1,t.next_in=i,t.next_out=s,t.avail_in=i<n?n-i+5:5-(i-n),t.avail_out=s<o?o-s+257:257-(s-o),r.hold=c,r.bits=p}},{}],49:[function(t,e,r){var I=t("../utils/common"),O=t("./adler32"),B=t("./crc32"),R=t("./inffast"),T=t("./inftrees"),D=1,F=2,N=0,U=-2,P=1,i=852,n=592;function L(t){return(t>>>
24&255)+(t>>>8&65280)+((65280&t)<<8)+((255&t)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),
this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(t){var e;return t&&t.state?(e=t.state,t.total_in=t.total_out=e.total=0,t.msg="",e.wrap&&(t.adler=1&e.wrap),e.mode=P,e.last=0,e.havedict=0,e.dmax=32768,e.head=null,e.hold=0,e.bits=0,e.lencode=e.lendyn=new I.Buf32(i),e.distcode=e.distdyn=new I.Buf32(n),e.sane=1,e.back=-1,N):U}function o(t){var e;return t&&t.state?((e=t.state).wsize=0,e.whave=0,e.wnext=0,a(t)):U}function h(t,e){var r,i;return t&&t.state?(i=t.state,e<0?(r=
0,e=-e):(r=1+(e>>4),e<48&&(e&=15)),e&&(e<8||15<e)?U:(null!==i.window&&i.wbits!==e&&(i.window=null),i.wrap=r,i.wbits=e,o(t))):U}function u(t,e){var r,i;return t?(i=new s,(t.state=i).window=null,(r=h(t,e))!==N&&(t.state=null),r):U}var l,f,d=!0;function j(t){if(d){var e;for(l=new I.Buf32(512),f=new I.Buf32(32),e=0;e<144;)t.lens[e++]=8;for(;e<256;)t.lens[e++]=9;for(;e<280;)t.lens[e++]=7;for(;e<288;)t.lens[e++]=8;for(T(D,t.lens,0,288,l,0,t.work,{bits:9}),e=0;e<32;)t.lens[e++]=5;T(F,t.lens,0,32,f,0,t.work,
{bits:5}),d=!1}t.lencode=l,t.lenbits=9,t.distcode=f,t.distbits=5}function Z(t,e,r,i){var n,s=t.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),i>=s.wsize?(I.arraySet(s.window,e,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(i<(n=s.wsize-s.wnext)&&(n=i),I.arraySet(s.window,e,r-i,n,s.wnext),(i-=n)?(I.arraySet(s.window,e,r-i,i,0),s.wnext=i,s.whave=s.wsize):(s.wnext+=n,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=n))),0}r.inflateReset=
o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(t){return u(t,15)},r.inflateInit2=u,r.inflate=function(t,e){var r,i,n,s,a,o,h,u,l,f,d,c,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!t||!t.state||!t.output||!t.input&&0!==t.avail_in)return U;12===(r=t.state).mode&&(r.mode=13),a=t.next_out,n=t.output,h=t.avail_out,s=t.next_in,i=t.input,o=t.avail_in,u=r.hold,l=r.bits,f=o,d=h,x=N;t:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;
break}for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){t.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){t.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){t.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,t.adler=r.check=1,r.mode=512&
u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(r.flags=u,8!=(255&r.flags)){t.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){t.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,
E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(c=r.length)&&(c=o),c&&(r.head&&(k=r.head.extra_len-
r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,i,s,c,k)),512&r.flags&&(r.check=B(r.check,i,c,s)),o-=c,s+=c,r.length-=c),r.length))break t;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break t;for(c=0;k=i[s+c++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&c<o;);if(512&r.flags&&(r.check=B(r.check,i,c,s)),o-=c,s+=c,k)break t}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break t;for(c=0;k=
i[s+c++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&c<o;);if(512&r.flags&&(r.check=B(r.check,i,c,s)),o-=c,s+=c,k)break t}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(u!==(65535&r.check)){t.msg="header crc mismatch",r.mode=30;break}l=u=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),t.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}t.adler=r.check=L(u),
l=u=0,r.mode=11;case 11:if(0===r.havedict)return t.next_out=a,t.avail_out=h,t.next_in=s,t.avail_in=o,r.hold=u,r.bits=l,2;t.adler=r.check=1,r.mode=12;case 12:if(5===e||6===e)break t;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==e)break;u>>>=2,l-=2;break t;case 2:r.mode=17;break;case 3:t.msg="invalid block type",r.mode=30}u>>>=2,l-=2;break;case 14:for(u>>>=7&
l,l-=7&l;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if((65535&u)!=(u>>>16^65535)){t.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===e)break t;case 15:r.mode=16;case 16:if(c=r.length){if(o<c&&(c=o),h<c&&(c=h),0===c)break t;I.arraySet(n,i,s,c,a),o-=c,s+=c,h-=c,a+=c,r.length-=c;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||
30<r.ndist){t.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){t.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>
16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else{if(16===b){for(z=_+2;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(u>>>=_,l-=_,0===r.have){t.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],c=3+(3&u),u>>>=2,l-=2}else if(17===b){for(z=_+3;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}l-=_,k=0,c=3+(7&(u>>>=_)),u>>>=3,l-=3}else{for(z=_+7;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}l-=_,k=0,c=11+(127&(u>>>=_)),
u>>>=7,l-=7}if(r.have+c>r.nlen+r.ndist){t.msg="invalid bit length repeat",r.mode=30;break}for(;c--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){t.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){t.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){t.msg=
"invalid distances set",r.mode=30;break}if(r.mode=20,6===e)break t;case 20:r.mode=21;case 21:if(6<=o&&258<=h){t.next_out=a,t.avail_out=h,t.next_in=s,t.avail_in=o,r.hold=u,r.bits=l,R(t,d),a=t.next_out,n=t.output,h=t.avail_out,s=t.next_in,i=t.input,o=t.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>
v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){t.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-
1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,64&g){t.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=
r.extra}if(r.offset>r.dmax){t.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break t;if(c=d-h,r.offset>c){if((c=r.offset-c)>r.whave&&r.sane){t.msg="invalid distance too far back",r.mode=30;break}p=c>r.wnext?(c-=r.wnext,r.wsize-c):r.wnext-c,c>r.length&&(c=r.length),m=r.window}else m=n,p=a-r.offset,c=r.length;for(h<c&&(c=h),h-=c,r.length-=c;n[a++]=m[p++],--c;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break t;n[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<
32;){if(0===o)break t;o--,u|=i[s++]<<l,l+=8}if(d-=h,t.total_out+=d,r.total+=d,d&&(t.adler=r.check=r.flags?B(r.check,n,d,a-d):O(r.check,n,d,a-d)),d=h,(r.flags?u:L(u))!==r.check){t.msg="incorrect data check",r.mode=30;break}l=u=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break t;o--,u+=i[s++]<<l,l+=8}if(u!==(4294967295&r.total)){t.msg="incorrect length check",r.mode=30;break}l=u=0}r.mode=29;case 29:x=1;break t;case 30:x=-3;break t;case 31:return-4;case 32:default:return U}return t.next_out=
a,t.avail_out=h,t.next_in=s,t.avail_in=o,r.hold=u,r.bits=l,(r.wsize||d!==t.avail_out&&r.mode<30&&(r.mode<27||4!==e))&&Z(t,t.output,t.next_out,d-t.avail_out)?(r.mode=31,-4):(f-=t.avail_in,d-=t.avail_out,t.total_in+=f,t.total_out+=d,r.total+=d,r.wrap&&d&&(t.adler=r.check=r.flags?B(r.check,n,d,t.next_out-d):O(r.check,n,d,t.next_out-d)),t.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===d||4===e)&&x===N&&(x=-5),x)},r.inflateEnd=function(t){if(!t||!t.state)return U;
var e=t.state;return e.window&&(e.window=null),t.state=null,N},r.inflateGetHeader=function(t,e){var r;return t&&t.state?0==(2&(r=t.state).wrap)?U:((r.head=e).done=!1,N):U},r.inflateSetDictionary=function(t,e){var r,i=e.length;return t&&t.state?0!==(r=t.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,e,i,0)!==r.check?-3:Z(t,e,i,i)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(t,
e,r){var D=t("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];e.exports=function(t,e,r,i,n,s,a,o){var h,u,l,f,d,c,p,m,_,
g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<i;v++)O[e[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return n[s++]=20971520,n[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return-1;if(0<z&&(0===t||1!==w))return-1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<i;v++)0!==e[r+v]&&(a[B[e[r+v]]++]=v);if(c=0===t?(A=R=a,19):1===t?(A=
F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,d=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===t&&852<C||2===t&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<c?(m=0,a[v]):a[v]>c?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;n[d+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=e[r+a[v]]}if(k<b&&(E&f)!==l){for(0===S&&(S=k),d+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===t&&852<C||2===t&&592<C)return 1;n[l=E&f]=k<<24|x<<16|
d-s|0}}return 0!==E&&(n[d+E]=b-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(t,e,r){e.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(t,e,r){var n=t("../utils/common"),o=0,h=1;function i(t){for(var e=t.length;0<=--e;)t[e]=0}var s=0,a=29,u=256,l=u+1+a,f=30,d=19,_=2*l+1,g=15,c=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,
2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));i(z);var C=new Array(2*f);i(C);var E=new Array(512);i(E);var A=new Array(256);i(A);var I=new Array(a);i(I);var O,B,R,T=new Array(f);function D(t,e,r,i,n){this.static_tree=t,this.extra_bits=e,this.extra_base=r,this.elems=i,this.max_length=n,this.has_stree=t&&t.length}function F(t,
e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e}function N(t){return t<256?E[t]:E[256+(t>>>7)]}function U(t,e){t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255}function P(t,e,r){t.bi_valid>c-r?(t.bi_buf|=e<<t.bi_valid&65535,U(t,t.bi_buf),t.bi_buf=e>>c-t.bi_valid,t.bi_valid+=r-c):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=r)}function L(t,e,r){P(t,r[2*e],r[2*e+1])}function j(t,e){for(var r=0;r|=1&t,t>>>=1,r<<=1,0<--e;);return r>>>1}function Z(t,e,r){var i,n,s=new Array(g+1),
a=0;for(i=1;i<=g;i++)s[i]=a=a+r[i-1]<<1;for(n=0;n<=e;n++){var o=t[2*n+1];0!==o&&(t[2*n]=j(s[o]++,o))}}function W(t){var e;for(e=0;e<l;e++)t.dyn_ltree[2*e]=0;for(e=0;e<f;e++)t.dyn_dtree[2*e]=0;for(e=0;e<d;e++)t.bl_tree[2*e]=0;t.dyn_ltree[2*m]=1,t.opt_len=t.static_len=0,t.last_lit=t.matches=0}function M(t){8<t.bi_valid?U(t,t.bi_buf):0<t.bi_valid&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0}function H(t,e,r,i){var n=2*e,s=2*r;return t[n]<t[s]||t[n]===t[s]&&i[e]<=i[r]}function G(t,e,
r){for(var i=t.heap[r],n=r<<1;n<=t.heap_len&&(n<t.heap_len&&H(e,t.heap[n+1],t.heap[n],t.depth)&&n++,!H(e,i,t.heap[n],t.depth));)t.heap[r]=t.heap[n],r=n,n<<=1;t.heap[r]=i}function K(t,e,r){var i,n,s,a,o=0;if(0!==t.last_lit)for(;i=t.pending_buf[t.d_buf+2*o]<<8|t.pending_buf[t.d_buf+2*o+1],n=t.pending_buf[t.l_buf+o],o++,0===i?L(t,n,e):(L(t,(s=A[n])+u+1,e),0!==(a=w[s])&&P(t,n-=I[s],a),L(t,s=N(--i),r),0!==(a=k[s])&&P(t,i-=T[s],a)),o<t.last_lit;);L(t,m,e)}function Y(t,e){var r,i,n,s=e.dyn_tree,a=e.stat_desc.static_tree,
o=e.stat_desc.has_stree,h=e.stat_desc.elems,u=-1;for(t.heap_len=0,t.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(t.heap[++t.heap_len]=u=r,t.depth[r]=0):s[2*r+1]=0;for(;t.heap_len<2;)s[2*(n=t.heap[++t.heap_len]=u<2?++u:0)]=1,t.depth[n]=0,t.opt_len--,o&&(t.static_len-=a[2*n+1]);for(e.max_code=u,r=t.heap_len>>1;1<=r;r--)G(t,s,r);for(n=h;r=t.heap[1],t.heap[1]=t.heap[t.heap_len--],G(t,s,1),i=t.heap[1],t.heap[--t.heap_max]=r,t.heap[--t.heap_max]=i,s[2*n]=s[2*r]+s[2*i],t.depth[n]=(t.depth[r]>=t.depth[i]?t.depth[r]:
t.depth[i])+1,s[2*r+1]=s[2*i+1]=n,t.heap[1]=n++,G(t,s,1),2<=t.heap_len;);t.heap[--t.heap_max]=t.heap[1],function(t,e){var r,i,n,s,a,o,h=e.dyn_tree,u=e.max_code,l=e.stat_desc.static_tree,f=e.stat_desc.has_stree,d=e.stat_desc.extra_bits,c=e.stat_desc.extra_base,p=e.stat_desc.max_length,m=0;for(s=0;s<=g;s++)t.bl_count[s]=0;for(h[2*t.heap[t.heap_max]+1]=0,r=t.heap_max+1;r<_;r++)p<(s=h[2*h[2*(i=t.heap[r])+1]+1]+1)&&(s=p,m++),h[2*i+1]=s,u<i||(t.bl_count[s]++,a=0,c<=i&&(a=d[i-c]),o=h[2*i],t.opt_len+=o*(s+
a),f&&(t.static_len+=o*(l[2*i+1]+a)));if(0!==m){do{for(s=p-1;0===t.bl_count[s];)s--;t.bl_count[s]--,t.bl_count[s+1]+=2,t.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(i=t.bl_count[s];0!==i;)u<(n=t.heap[--r])||(h[2*n+1]!==s&&(t.opt_len+=(s-h[2*n+1])*h[2*n],h[2*n+1]=s),i--)}}(t,e),Z(s,u,t.bl_count)}function X(t,e,r){var i,n,s=-1,a=e[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),e[2*(r+1)+1]=65535,i=0;i<=r;i++)n=a,a=e[2*(i+1)+1],++o<h&&n===a||(o<u?t.bl_tree[2*n]+=o:0!==n?(n!==s&&t.bl_tree[2*n]++,t.bl_tree[2*
b]++):o<=10?t.bl_tree[2*v]++:t.bl_tree[2*y]++,s=n,u=(o=0)===a?(h=138,3):n===a?(h=6,3):(h=7,4))}function V(t,e,r){var i,n,s=-1,a=e[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),i=0;i<=r;i++)if(n=a,a=e[2*(i+1)+1],!(++o<h&&n===a)){if(o<u)for(;L(t,n,t.bl_tree),0!=--o;);else 0!==n?(n!==s&&(L(t,n,t.bl_tree),o--),L(t,b,t.bl_tree),P(t,o-3,2)):o<=10?(L(t,v,t.bl_tree),P(t,o-3,3)):(L(t,y,t.bl_tree),P(t,o-11,7));s=n,u=(o=0)===a?(h=138,3):n===a?(h=6,3):(h=7,4)}}i(T);var q=!1;function J(t,e,r,i){P(t,(s<<1)+(i?1:0),3),
function(t,e,r,i){M(t),i&&(U(t,r),U(t,~r)),n.arraySet(t.pending_buf,t.window,e,r,t.pending),t.pending+=r}(t,e,r,!0)}r._tr_init=function(t){q||(function(){var t,e,r,i,n,s=new Array(g+1);for(i=r=0;i<a-1;i++)for(I[i]=r,t=0;t<1<<w[i];t++)A[r++]=i;for(A[r-1]=i,i=n=0;i<16;i++)for(T[i]=n,t=0;t<1<<k[i];t++)E[n++]=i;for(n>>=7;i<f;i++)for(T[i]=n<<7,t=0;t<1<<k[i]-7;t++)E[256+n++]=i;for(e=0;e<=g;e++)s[e]=0;for(t=0;t<=143;)z[2*t+1]=8,t++,s[8]++;for(;t<=255;)z[2*t+1]=9,t++,s[9]++;for(;t<=279;)z[2*t+1]=7,t++,s[7]++;
for(;t<=287;)z[2*t+1]=8,t++,s[8]++;for(Z(z,l+1,s),t=0;t<f;t++)C[2*t+1]=5,C[2*t]=j(t,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,d,p)}(),q=!0),t.l_desc=new F(t.dyn_ltree,O),t.d_desc=new F(t.dyn_dtree,B),t.bl_desc=new F(t.bl_tree,R),t.bi_buf=0,t.bi_valid=0,W(t)},r._tr_stored_block=J,r._tr_flush_block=function(t,e,r,i){var n,s,a=0;0<t.level?(2===t.strm.data_type&&(t.strm.data_type=function(t){var e,r=4093624447;for(e=0;e<=31;e++,r>>>=1)if(1&r&&0!==t.dyn_ltree[2*e])return o;if(0!==
t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return h;for(e=32;e<u;e++)if(0!==t.dyn_ltree[2*e])return h;return o}(t)),Y(t,t.l_desc),Y(t,t.d_desc),a=function(t){var e;for(X(t,t.dyn_ltree,t.l_desc.max_code),X(t,t.dyn_dtree,t.d_desc.max_code),Y(t,t.bl_desc),e=d-1;3<=e&&0===t.bl_tree[2*S[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e}(t),n=t.opt_len+3+7>>>3,(s=t.static_len+3+7>>>3)<=n&&(n=s)):n=s=r+5,r+4<=n&&-1!==e?J(t,e,r,i):4===t.strategy||s===n?(P(t,2+(i?1:0),3),K(t,z,C)):(P(t,4+(i?1:0),
3),function(t,e,r,i){var n;for(P(t,e-257,5),P(t,r-1,5),P(t,i-4,4),n=0;n<i;n++)P(t,t.bl_tree[2*S[n]+1],3);V(t,t.dyn_ltree,e-1),V(t,t.dyn_dtree,r-1)}(t,t.l_desc.max_code+1,t.d_desc.max_code+1,a+1),K(t,t.dyn_ltree,t.dyn_dtree)),W(t),i&&M(t)},r._tr_tally=function(t,e,r){return t.pending_buf[t.d_buf+2*t.last_lit]=e>>>8&255,t.pending_buf[t.d_buf+2*t.last_lit+1]=255&e,t.pending_buf[t.l_buf+t.last_lit]=255&r,t.last_lit++,0===e?t.dyn_ltree[2*r]++:(t.matches++,e--,t.dyn_ltree[2*(A[r]+u+1)]++,t.dyn_dtree[2*
N(e)]++),t.last_lit===t.lit_bufsize-1},r._tr_align=function(t){P(t,2,3),L(t,m,z),function(t){16===t.bi_valid?(U(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):8<=t.bi_valid&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)}(t)}},{"../utils/common":41}],53:[function(t,e,r){e.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(t,
e,r){e.exports="function"==typeof setImmediate?setImmediate:function(){var t=[].slice.apply(arguments);t.splice(1,0,0),setTimeout.apply(null,t)}},{}]},{},[10])(10)};
